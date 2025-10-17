import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Episode {
  id: number;
  seasonNumber: number;
  number: number;
  runtime?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { showId } = await req.json();
    
    console.log(`[mark-show-watched] Marking show ${showId} as watched for user ${user.id}`);

    // Fetch all episodes for the show from TVDB
    const tvdbApiKey = Deno.env.get('TVDB_API_KEY');
    if (!tvdbApiKey) {
      throw new Error('TVDB API key not configured');
    }

    // Get TVDB token
    const tokenResponse = await fetch('https://api4.thetvdb.com/v4/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: tvdbApiKey }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to authenticate with TVDB');
    }

    const { data: tokenData } = await tokenResponse.json();
    const token = tokenData.token;

    // Fetch extended series info with episodes
    const seriesResponse = await fetch(
      `https://api4.thetvdb.com/v4/series/${showId}/episodes/default`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!seriesResponse.ok) {
      throw new Error('Failed to fetch series episodes from TVDB');
    }

    const { data: seriesData } = await seriesResponse.json();
    const episodes: Episode[] = seriesData.episodes || [];

    console.log(`[mark-show-watched] Found ${episodes.length} episodes`);

    // Get already watched episodes to avoid duplicates
    const { data: existingWatched } = await supabase
      .from('watched_episodes')
      .select('tvdb_id')
      .eq('user_id', user.id);

    const alreadyWatchedSet = new Set(
      (existingWatched || []).map((w) => w.tvdb_id)
    );

    // Prepare data for insertion
    const watchedEpisodes = [];
    const runtimeInserts = [];

    for (const episode of episodes) {
      const tvdbId = `${showId}:${episode.seasonNumber}:${episode.number}`;
      
      // Skip if already watched
      if (alreadyWatchedSet.has(tvdbId)) {
        continue;
      }

      // Add to watched episodes
      watchedEpisodes.push({
        user_id: user.id,
        tvdb_id: tvdbId,
      });

      // Add runtime if available (default to 45 minutes if not provided)
      const runtime = episode.runtime || 45;
      runtimeInserts.push({
        tvdb_id: tvdbId,
        runtime_minutes: runtime,
      });
    }

    console.log(`[mark-show-watched] Prepared ${watchedEpisodes.length} new episodes to mark as watched`);

    // Insert episode runtimes first
    if (runtimeInserts.length > 0) {
      const { error: runtimeError } = await supabase
        .from('episode_runtimes')
        .upsert(runtimeInserts, { onConflict: 'tvdb_id', ignoreDuplicates: false });

      if (runtimeError) {
        console.error('[mark-show-watched] Error inserting runtimes:', runtimeError);
      } else {
        console.log(`[mark-show-watched] Upserted ${runtimeInserts.length} episode runtimes`);
      }
    }

    // Insert only new watched episodes
    if (watchedEpisodes.length > 0) {
      const { error: watchedError } = await supabase
        .from('watched_episodes')
        .insert(watchedEpisodes);

      if (watchedError) {
        console.error('[mark-show-watched] Error marking episodes as watched:', watchedError);
        throw watchedError;
      }

      console.log(`[mark-show-watched] Marked ${watchedEpisodes.length} new episodes as watched`);
    } else {
      console.log(`[mark-show-watched] All episodes already marked as watched`);
    }

    // Update user watch stats
    const { error: statsError } = await supabase.rpc('update_user_watch_stats', {
      p_user_id: user.id,
    });

    if (statsError) {
      console.error('[mark-show-watched] Error updating watch stats:', statsError);
    }

    // Fetch updated stats
    const { data: profile } = await supabase
      .from('profiles')
      .select('minutes_watched, badge_tier')
      .eq('id', user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        episodesMarked: watchedEpisodes.length,
        totalEpisodes: episodes.length,
        alreadyWatched: episodes.length - watchedEpisodes.length,
        totalMinutes: profile?.minutes_watched || 0,
        badgeTier: profile?.badge_tier,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[mark-show-watched] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
