import { supabase } from '@/integrations/supabase/client';

export interface WatchStats {
  minutesWatched: number;
  hoursWatched: number;
  badgeTier: 'Casual Viewer' | 'Episodically Easy' | 'Season Smasher' | 'Binge Legend';
  badgeEmoji: string;
}

export const BADGE_CONFIG = {
  'Casual Viewer': { 
    emoji: '🍿', 
    color: 'text-muted-foreground', 
    gradient: 'from-gray-400 to-gray-600' 
  },
  'Episodically Easy': { 
    emoji: '📺', 
    color: 'text-purple-500', 
    gradient: 'from-purple-400 to-purple-600' 
  },
  'Season Smasher': { 
    emoji: '🎬', 
    color: 'text-orange-500', 
    gradient: 'from-orange-400 to-orange-600' 
  },
  'Binge Legend': { 
    emoji: '🌀', 
    color: 'text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text', 
    gradient: 'from-pink-500 via-purple-500 to-blue-500' 
  },
} as const;

// Get episode runtime with caching
export async function getEpisodeRuntime(
  showId: string, 
  seasonNumber: number, 
  episodeNumber: number,
  showAverageRuntime?: number
): Promise<number> {
  const externalId = `${showId}:${seasonNumber}:${episodeNumber}`;
  
  // Check cache first
  const { data: cached } = await (supabase as any)
    .from('episode_runtimes')
    .select('runtime_minutes')
    .eq('external_id', externalId)
    .maybeSingle();
    
  if (cached) return cached.runtime_minutes;
  
  // Use show average runtime or default
  const runtime = showAverageRuntime || 45;
  
  // Cache it
  await (supabase as any).from('episode_runtimes').insert({
    external_id: externalId,
    runtime_minutes: runtime,
    show_average_runtime: runtime,
    source: 'show_average',
  });
  
  return runtime;
}

// Mark episode watched
export async function markEpisodeWatched(
  userId: string,
  showId: string,
  seasonNumber: number,
  episodeNumber: number,
  runtime?: number
) {
  const externalId = `${showId}:${seasonNumber}:${episodeNumber}`;
  const runtimeMinutes = runtime || await getEpisodeRuntime(showId, seasonNumber, episodeNumber);
  
  const { error } = await (supabase as any).rpc('mark_episode_watched', {
    p_user_id: userId,
    p_external_id: externalId,
    p_runtime_minutes: runtimeMinutes,
    p_source: 'manual',
  });
  
  if (error) throw error;
  
  return await getUserWatchStats(userId);
}

// Unmark episode watched
export async function unmarkEpisodeWatched(
  userId: string,
  showId: string,
  seasonNumber: number,
  episodeNumber: number
) {
  const externalId = `${showId}:${seasonNumber}:${episodeNumber}`;
  
  const { error } = await (supabase as any).rpc('unmark_episode_watched', {
    p_user_id: userId,
    p_external_id: externalId,
  });
  
  if (error) throw error;
  
  return await getUserWatchStats(userId);
}

// Expand season to episodes
export async function markSeasonWatched(
  userId: string,
  showId: string,
  seasonNumber: number,
  episodeCount: number,
  avgRuntime: number
) {
  const { error } = await (supabase as any).rpc('expand_season_to_episodes', {
    p_user_id: userId,
    p_show_id: showId,
    p_season_number: seasonNumber,
    p_episode_count: episodeCount,
    p_runtime_per_episode: avgRuntime,
  });
  
  if (error) throw error;
  
  return await getUserWatchStats(userId);
}

// Get user watch stats
export async function getUserWatchStats(userId: string): Promise<WatchStats> {
  const { data } = await (supabase as any)
    .from('profiles')
    .select('minutes_watched, badge_tier')
    .eq('id', userId)
    .single();
    
  if (!data) {
    return {
      minutesWatched: 0,
      hoursWatched: 0,
      badgeTier: 'Casual Viewer',
      badgeEmoji: '🍿',
    };
  }
  
  const badgeTier = (data.badge_tier || 'Casual Viewer') as WatchStats['badgeTier'];
  
  return {
    minutesWatched: data.minutes_watched || 0,
    hoursWatched: Number(((data.minutes_watched || 0) / 60).toFixed(1)),
    badgeTier,
    badgeEmoji: BADGE_CONFIG[badgeTier].emoji,
  };
}

// Recalculate watch hours
export async function recalculateWatchHours(userId: string) {
  const { error } = await (supabase as any).rpc('update_user_watch_stats', {
    p_user_id: userId,
  });
  
  if (error) throw error;
  
  return await getUserWatchStats(userId);
}

// Check if episode is watched
export async function isEpisodeWatched(
  userId: string,
  showId: string,
  seasonNumber: number,
  episodeNumber: number
): Promise<boolean> {
  const externalId = `${showId}:${seasonNumber}:${episodeNumber}`;
  
  const { data } = await (supabase as any)
    .from('watched_episodes')
    .select('id')
    .eq('user_id', userId)
    .eq('external_id', externalId)
    .maybeSingle();
    
  return !!data;
}
