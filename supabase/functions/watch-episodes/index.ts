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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...params } = await req.json();

    if (action === 'watch') {
      const { showId, seasonNumber, episodeNumber, tvdbId, runtimeMinutes } = params;
      
      const { error } = await supabase
        .from('watched_episodes')
        .upsert({
          user_id: user.id,
          show_id: showId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          tvdb_id: tvdbId,
          runtime_minutes: runtimeMinutes,
        }, {
          onConflict: 'user_id,show_id,season_number,episode_number'
        });

      if (error) throw error;

      // Update user stats
      await supabase.rpc('update_user_watch_stats', { p_user_id: user.id });

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
      
      const rows = episodes.map((ep: any) => ({
        user_id: user.id,
        show_id: showId,
        season_number: seasonNumber,
        episode_number: ep.number,
        tvdb_id: `${showId}:${seasonNumber}:${ep.number}`,
        runtime_minutes: ep.runtime || 45,
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
      
      const rows = seasons.flatMap((season: any) =>
        season.episodes.map((ep: any) => ({
          user_id: user.id,
          show_id: showId,
          season_number: season.number,
          episode_number: ep.number,
          tvdb_id: `${showId}:${season.number}:${ep.number}`,
          runtime_minutes: ep.runtime || 45,
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

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
