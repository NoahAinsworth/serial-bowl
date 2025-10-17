import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Unauthorized: No user found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    console.log('Request received:', JSON.stringify({ action: requestBody.action, params: Object.keys(requestBody) }));
    
    const { action, ...params } = requestBody;

    if (action === 'watch') {
      const { showId, seasonNumber, episodeNumber, tvdbId, runtimeMinutes } = params;
      console.log('Watch action:', { showId, seasonNumber, episodeNumber, tvdbId, runtimeMinutes });
      
      // Store runtime if provided
      if (runtimeMinutes) {
        console.log('Storing runtime:', { tvdbId, runtimeMinutes });
        const { error: runtimeError } = await supabase
          .from('episode_runtimes')
          .upsert({
            tvdb_id: tvdbId,
            runtime_minutes: runtimeMinutes,
          }, {
            onConflict: 'tvdb_id'
          });
        
        if (runtimeError) {
          console.error('Runtime upsert error:', runtimeError);
        } else {
          console.log('Runtime stored successfully');
        }
      }

      console.log('Inserting watched episode:', { user_id: user.id, show_id: showId, season_number: seasonNumber, episode_number: episodeNumber, tvdb_id: tvdbId });
      const { error } = await supabase
        .from('watched_episodes')
        .upsert({
          user_id: user.id,
          show_id: showId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          tvdb_id: tvdbId,
        }, {
          onConflict: 'user_id,show_id,season_number,episode_number'
        });

      if (error) {
        console.error('Watched episode upsert error:', error);
        throw error;
      }
      console.log('Watched episode stored successfully');

      // Update user stats
      console.log('Calling update_user_watch_stats for user:', user.id);
      const { error: statsError } = await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });
      if (statsError) {
        console.error('Stats update error:', statsError);
      } else {
        console.log('Stats updated successfully');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'unwatch') {
      const { showId, seasonNumber, episodeNumber } = params;
      
      const { error } = await supabase
        .from('watched_episodes')
        .delete()
        .eq('user_id', user.id)
        .eq('show_id', showId)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber);

      if (error) throw error;

      // Update user stats
      await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'watchSeason') {
      const { showId, seasonNumber, episodes } = params;
      
      // Store runtimes for all episodes
      const runtimeRows = episodes
        .filter((ep: any) => ep.runtime)
        .map((ep: any) => ({
          tvdb_id: `${showId}:${seasonNumber}:${ep.number}`,
          runtime_minutes: ep.runtime,
        }));

      if (runtimeRows.length > 0) {
        await supabase
          .from('episode_runtimes')
          .upsert(runtimeRows, { onConflict: 'tvdb_id' });
      }

      const rows = episodes.map((ep: any) => ({
        user_id: user.id,
        show_id: showId,
        season_number: seasonNumber,
        episode_number: ep.number,
        tvdb_id: `${showId}:${seasonNumber}:${ep.number}`,
      }));

      const { error } = await supabase
        .from('watched_episodes')
        .upsert(rows, { onConflict: 'user_id,show_id,season_number,episode_number' });

      if (error) throw error;

      // Update user stats
      await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'unwatchSeason') {
      const { showId, seasonNumber } = params;
      
      const { error } = await supabase
        .from('watched_episodes')
        .delete()
        .eq('user_id', user.id)
        .eq('show_id', showId)
        .eq('season_number', seasonNumber);

      if (error) throw error;

      // Update user stats
      await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'watchShow') {
      const { showId, seasons } = params;
      
      // Store runtimes for all episodes
      const runtimeRows = seasons.flatMap((season: any) =>
        season.episodes
          .filter((ep: any) => ep.runtime)
          .map((ep: any) => ({
            tvdb_id: `${showId}:${season.number}:${ep.number}`,
            runtime_minutes: ep.runtime,
          }))
      );

      if (runtimeRows.length > 0) {
        await supabase
          .from('episode_runtimes')
          .upsert(runtimeRows, { onConflict: 'tvdb_id' });
      }

      const rows = seasons.flatMap((season: any) =>
        season.episodes.map((ep: any) => ({
          user_id: user.id,
          show_id: showId,
          season_number: season.number,
          episode_number: ep.number,
          tvdb_id: `${showId}:${season.number}:${ep.number}`,
        }))
      );

      const { error } = await supabase
        .from('watched_episodes')
        .upsert(rows, { onConflict: 'user_id,show_id,season_number,episode_number' });

      if (error) throw error;

      // Update user stats
      await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'unwatchShow') {
      const { showId } = params;
      
      const { error } = await supabase
        .from('watched_episodes')
        .delete()
        .eq('user_id', user.id)
        .eq('show_id', showId);

      if (error) throw error;

      // Update user stats
      await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getWatched') {
      const { showId, seasonNumber } = params;
      
      const { data, error } = await supabase
        .from('watched_episodes')
        .select('episode_number')
        .eq('user_id', user.id)
        .eq('show_id', showId)
        .eq('season_number', seasonNumber);

      if (error) throw error;

      return new Response(JSON.stringify({ episodes: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recalculate stats action
    if (action === 'recalculateStats') {
      await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });

      const { data: profile } = await supabase
        .from('profiles')
        .select('minutes_watched, badge_tier')
        .eq('id', user.id)
        .single();

      return new Response(JSON.stringify({ 
        success: true,
        minutes_watched: profile?.minutes_watched || 0,
        badge_tier: profile?.badge_tier,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unhandled error in watch-episodes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
