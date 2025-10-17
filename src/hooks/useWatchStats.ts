import { useState, useEffect } from 'react';
import { getUserWatchStats, WatchStats } from '@/lib/watchHours';
import { useAuth } from '@/contexts/AuthContext';

export function useWatchStats(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const [stats, setStats] = useState<WatchStats>({
    minutesWatched: 0,
    hoursWatched: 0,
    badgeTier: 'Casual Viewer',
    badgeEmoji: '🍿',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    getUserWatchStats(targetUserId)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [targetUserId]);

  const refresh = async () => {
    if (!targetUserId) return;
    const newStats = await getUserWatchStats(targetUserId);
    setStats(newStats);
    return newStats;
  };

  return { stats, loading, refresh };
}
