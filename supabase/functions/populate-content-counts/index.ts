import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TVDB_BASE = 'https://api4.thetvdb.com/v4'

// TVDB token management
let cachedToken: { token: string; issuedAt: number } | null = null

async function getTVDBToken(): Promise<string> {
  const now = Date.now()
  
  // Return cached token if valid (< 27 days old)
  if (cachedToken && now - cachedToken.issuedAt < 27 * 24 * 60 * 60 * 1000) {
    return cachedToken.token
  }

  // Login to get new token
  const apiKey = Deno.env.get('TVDB_API_KEY')
  if (!apiKey) throw new Error('TVDB_API_KEY not configured')

  const res = await fetch(`${TVDB_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey })
  })

  if (!res.ok) throw new Error(`TVDB login failed: ${res.status}`)

  const data = await res.json()
  const token = data?.data?.token

  cachedToken = { token, issuedAt: now }
  return token
}

async function tvdbFetch(path: string) {
  const token = await getTVDBToken()
  const res = await fetch(`${TVDB_BASE}${path}`, {
    headers: { 
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  })

  if (!res.ok) throw new Error(`TVDB ${path} failed: ${res.status}`)
  
  const json = await res.json()
  return json?.data ?? json
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let external_id = ''
  let kind = ''

  try {
    const body = await req.json()
    external_id = body.external_id
    kind = body.kind

    if (!external_id || !kind) {
      return new Response(
        JSON.stringify({ error: 'external_id and kind are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Populating counts for ${kind}: ${external_id}`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (kind === 'show') {
      // Parse show ID from external_id (format: "tvdb:123456" or just "123456")
      const showId = external_id.includes(':') 
        ? parseInt(external_id.split(':')[1]) 
        : parseInt(external_id)
      
      // Fetch all seasons from TVDB
      const seasons = await tvdbFetch(`/series/${showId}/episodes/default?page=0`)
      
      // Count episodes per season and total
      const seasonEpisodeCounts = new Map<number, number>()
      let totalEpisodes = 0
      
      if (seasons?.episodes) {
        for (const ep of seasons.episodes) {
          if (ep.seasonNumber !== null && ep.seasonNumber !== undefined) {
            const count = seasonEpisodeCounts.get(ep.seasonNumber) || 0
            seasonEpisodeCounts.set(ep.seasonNumber, count + 1)
            totalEpisodes++
          }
        }
      }

      const seasonCount = seasonEpisodeCounts.size
      
      console.log(`Show ${showId}: ${seasonCount} seasons, ${totalEpisodes} episodes`)

      // Update show counts
      const { error: showError } = await supabase.rpc('update_show_counts', {
        p_show_external_id: external_id,
        p_season_count: seasonCount,
        p_total_episode_count: totalEpisodes
      })

      if (showError) throw showError

      // ALSO populate season_episode_counts for each season
      console.log(`Populating ${seasonCount} individual season counts for show ${showId}`)
      for (const [seasonNum, episodeCount] of seasonEpisodeCounts) {
        const seasonExternalId = `${external_id}:${seasonNum}`
        console.log(`  Season ${seasonNum}: ${episodeCount} episodes -> ${seasonExternalId}`)
        
        const { error: seasonError } = await supabase.rpc('update_season_episode_count', {
          p_season_external_id: seasonExternalId,
          p_episode_count: episodeCount
        })

        if (seasonError) {
          console.error(`Failed to update season ${seasonNum}:`, seasonError)
        }
      }

    } else if (kind === 'season') {
      // Parse season info from external_id (format: "tvdb:123456:1" or "123456:1")
      const parts = external_id.split(':')
      const showId = external_id.includes('tvdb:')
        ? parseInt(parts[1])
        : parseInt(parts[0])
      const seasonNum = external_id.includes('tvdb:')
        ? parseInt(parts[2])
        : parseInt(parts[1])
      
      // Fetch episodes for this season
      const data = await tvdbFetch(`/series/${showId}/episodes/default?page=0`)
      
      // Count episodes in this season
      let episodeCount = 0
      if (data?.episodes) {
        episodeCount = data.episodes.filter(
          (ep: any) => ep.seasonNumber === seasonNum
        ).length
      }

      console.log(`Season ${showId}:${seasonNum}: ${episodeCount} episodes`)

      // Update database
      const { error } = await supabase.rpc('update_season_episode_count', {
        p_season_external_id: external_id,
        p_episode_count: episodeCount
      })

      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true, external_id, kind }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error populating counts:', error)
    console.error('Error details:', { external_id, kind, error })
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage, external_id, kind }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
