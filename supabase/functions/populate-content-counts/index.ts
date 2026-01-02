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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Health check endpoint (unauthenticated)
  if (req.method === 'GET') {
    console.log('🏥 Health check requested');
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.0'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Require authentication for POST requests
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('❌ Missing Authorization header');
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify JWT token and get user
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    console.error('❌ Authentication failed:', authError?.message);
    return new Response(
      JSON.stringify({ error: 'Invalid authentication' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('✅ Authenticated user:', user.id);

  let external_id = ''
  let kind = ''

  try {
    const body = await req.json()
    external_id = body.external_id
    kind = body.kind

    console.log('📥 Received request:', { 
      method: req.method, 
      external_id, 
      kind,
      timestamp: new Date().toISOString()
    });

    if (!external_id || !kind) {
      console.error('❌ Missing required fields:', { external_id, kind });
      return new Response(
        JSON.stringify({ error: 'external_id and kind are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Populating counts for ${kind}: ${external_id}`)

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
          // Skip season 0 (specials) - only count season 1+
          if (ep.seasonNumber !== null && ep.seasonNumber !== undefined && ep.seasonNumber >= 1) {
            const count = seasonEpisodeCounts.get(ep.seasonNumber) || 0
            seasonEpisodeCounts.set(ep.seasonNumber, count + 1)
            totalEpisodes++
          }
        }
      }

      const seasonCount = seasonEpisodeCounts.size
      
      console.log(`✅ Show ${showId}: ${seasonCount} seasons, ${totalEpisodes} episodes`)

      // CRITICAL: Populate season_episode_counts for each season
      console.log(`🔄 Populating ${seasonCount} individual season counts for show ${showId}`)
      let successCount = 0
      let failCount = 0
      
      for (const [seasonNum, episodeCount] of seasonEpisodeCounts) {
        const seasonExternalId = `${external_id}:${seasonNum}`
        console.log(`  → Season ${seasonNum}: ${episodeCount} episodes (${seasonExternalId})`)
        
        const { error: seasonError } = await supabase.rpc('update_season_episode_count', {
          p_season_external_id: seasonExternalId,
          p_episode_count: episodeCount
        })

        if (seasonError) {
          console.error(`  ❌ Failed to update season ${seasonNum}:`, seasonError)
          failCount++
        } else {
          console.log(`  ✅ Season ${seasonNum} updated successfully`)
          successCount++
        }
      }
      
      console.log(`🏁 Season population complete: ${successCount} success, ${failCount} failed out of ${seasonCount} total`)
      
      if (failCount > 0) {
        throw new Error(`Failed to populate ${failCount} seasons`)
      }

      // Update show counts AFTER seasons are populated (so we have accurate total)
      const { error: showError } = await supabase.rpc('update_show_counts', {
        p_show_external_id: external_id,
        p_season_count: seasonCount,
        p_total_episode_count: totalEpisodes
      })

      if (showError) {
        console.error(`❌ Failed to update show counts:`, showError)
        throw showError
      }
      console.log(`✅ Show counts updated successfully`)

    } else if (kind === 'season') {
      // Parse season info from external_id (format: "tvdb:123456:1" or "123456:1")
      const parts = external_id.split(':')
      const showId = external_id.includes('tvdb:')
        ? parseInt(parts[1])
        : parseInt(parts[0])
      const seasonNum = external_id.includes('tvdb:')
        ? parseInt(parts[2])
        : parseInt(parts[1])
      
      // Skip season 0 (specials)
      if (seasonNum === 0) {
        console.log(`Skipping season 0 (specials) for show ${showId}`)
        return new Response(
          JSON.stringify({ success: true, external_id, kind, message: 'Season 0 skipped' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
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

    console.log('✅ Successfully populated counts:', { external_id, kind });
    return new Response(
      JSON.stringify({ 
        success: true, 
        external_id, 
        kind,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error populating counts:', error)
    console.error('📋 Error details:', { 
      external_id, 
      kind, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: errorMessage, 
        external_id, 
        kind,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
