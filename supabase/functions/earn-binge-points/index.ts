import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  user_id: string;
  show_id: string;
  show_title: string;
  episode_ids: string[];
  earn_points: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the caller
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create a client with the user's token to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body: RequestBody = await req.json();
    const { user_id, show_id, show_title, episode_ids, earn_points } = body;

    // Verify the caller is the same as the user_id in the request
    if (user.id !== user_id) {
      console.error(`User mismatch: authenticated as ${user.id}, but requested action for ${user_id}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: user mismatch' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`Processing ${episode_ids.length} episodes for user ${user_id}, earn_points: ${earn_points}`);

    // Anti-cheat checks
    let antiCheatDenied = false;
    const DAILY_CAP = 200;
    const MAX_EPISODES_PER_BATCH = 15;

    if (earn_points) {
      // Check 1: Too many episodes at once
      if (episode_ids.length > MAX_EPISODES_PER_BATCH) {
        console.log(`Anti-cheat: ${episode_ids.length} episodes exceeds ${MAX_EPISODES_PER_BATCH} limit`);
        antiCheatDenied = true;
      }

      // Check 2: Episodes from multiple seasons
      if (!antiCheatDenied) {
        const seasons = new Set(episode_ids.map(id => {
          const parts = id.split(':');
          return parts[1]; // season number
        }));
        if (seasons.size > 1) {
          console.log(`Anti-cheat: Episodes from ${seasons.size} different seasons`);
          antiCheatDenied = true;
        }
      }

      // Check 3: Rapid bulk logging (check last hour)
      if (!antiCheatDenied) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: recentLogs } = await supabase
          .from('binge_point_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .gte('logged_at', oneHourAgo);
        
        if ((recentLogs || 0) >= 5) {
          console.log(`Anti-cheat: ${recentLogs} logs in last hour`);
          antiCheatDenied = true;
        }
      }
    }

    // Get user's current daily points
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_points_earned, daily_points_reset_at')
      .eq('id', user_id)
      .single();

    // Check if daily reset needed
    const resetAt = profile?.daily_points_reset_at ? new Date(profile.daily_points_reset_at) : new Date(0);
    const today = new Date();
    const isNewDay = resetAt.toDateString() !== today.toDateString();
    
    let currentDailyPoints = isNewDay ? 0 : (profile?.daily_points_earned || 0);

    // Mark episodes as watched and create content entries
    const showScoreAdded = episode_ids.length;
    
    for (const episodeId of episode_ids) {
      const [showIdPart, seasonNum, episodeNum] = episodeId.split(':');
      
      // Get or create content entry
      let { data: content } = await supabase
        .from('content')
        .select('id')
        .eq('external_id', episodeId)
        .eq('kind', 'episode')
        .maybeSingle();

      if (!content) {
        const { data: newContent } = await supabase
          .from('content')
          .insert({
            external_id: episodeId,
            external_src: 'thetvdb',
            kind: 'episode',
            title: `S${seasonNum}E${episodeNum}`
          })
          .select('id')
          .single();
        content = newContent;
      }

      if (content) {
        // Insert watched entry (ignore if already exists)
        // Note: show_score is now automatically recalculated by database trigger on watched table
        await supabase
          .from('watched')
          .upsert({
            user_id,
            content_id: content.id,
            watched_at: new Date().toISOString()
          }, { onConflict: 'user_id,content_id' });
      }
    }

    // Calculate points (if earning)
    let pointsEarned = 0;
    let seasonBonus = 0;
    let showBonus = 0;
    let dailyCapReached = false;

    if (earn_points && !antiCheatDenied) {
      // Base points: 10 per episode
      const basePoints = episode_ids.length * 10;
      
      // Check for season completion bonus
      const seasonId = episode_ids[0].split(':').slice(0, 2).join(':');
      const { data: seasonCount } = await supabase
        .from('season_episode_counts')
        .select('episode_count')
        .eq('external_id', seasonId)
        .maybeSingle();

      if (seasonCount) {
        // Count watched episodes for this season
        const { count: watchedCount } = await supabase
          .from('content')
          .select('id', { count: 'exact', head: true })
          .eq('kind', 'episode')
          .like('external_id', `${seasonId}:%`);
        
        // Get user's watched for these episodes
        const { data: contents } = await supabase
          .from('content')
          .select('id')
          .eq('kind', 'episode')
          .like('external_id', `${seasonId}:%`);
        
        if (contents) {
          const contentIds = contents.map(c => c.id);
          const { count: userWatchedCount } = await supabase
            .from('watched')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .in('content_id', contentIds);
          
          if (userWatchedCount === seasonCount.episode_count) {
            seasonBonus = 50;
            console.log(`Season ${seasonId} completed! +50 bonus`);
          }
        }
      }

      // Check for show completion bonus
      const { data: showCount } = await supabase
        .from('show_season_counts')
        .select('total_episode_count')
        .eq('external_id', show_id)
        .maybeSingle();

      if (showCount) {
        const { data: showContents } = await supabase
          .from('content')
          .select('id')
          .eq('kind', 'episode')
          .like('external_id', `${show_id}:%`);
        
        if (showContents) {
          const contentIds = showContents.map(c => c.id);
          const { count: userWatchedCount } = await supabase
            .from('watched')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .in('content_id', contentIds);
          
          if (userWatchedCount === showCount.total_episode_count) {
            showBonus = 200;
            console.log(`Show ${show_id} completed! +200 bonus`);
          }
        }
      }

      const totalPoints = basePoints + seasonBonus + showBonus;
      
      // Apply daily cap
      const remainingCap = DAILY_CAP - currentDailyPoints;
      pointsEarned = Math.min(totalPoints, remainingCap);
      dailyCapReached = (currentDailyPoints + pointsEarned) >= DAILY_CAP;

      // Update profile points
      if (pointsEarned > 0) {
        await supabase.rpc('add_binge_points', {
          p_user_id: user_id,
          p_points: pointsEarned,
          p_daily_cap: DAILY_CAP
        });
      }
    }

    // Log the action
    await supabase
      .from('binge_point_logs')
      .insert({
        user_id,
        show_id,
        show_title,
        episode_count: episode_ids.length,
        points_earned: pointsEarned,
        season_bonus: seasonBonus,
        show_bonus: showBonus,
        was_bulk: episode_ids.length > 5,
        anti_cheat_denied: antiCheatDenied || !earn_points
      });

    console.log(`Result: ${pointsEarned} points earned, ${showScoreAdded} show score, anti-cheat: ${antiCheatDenied}`);

    return new Response(
      JSON.stringify({
        points_earned: pointsEarned,
        show_score_added: showScoreAdded,
        season_bonus: seasonBonus,
        show_bonus: showBonus,
        daily_cap_reached: dailyCapReached,
        anti_cheat_denied: antiCheatDenied
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
