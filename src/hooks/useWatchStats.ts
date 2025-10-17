import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface WatchStats {
  minutesWatched: number;
  badgeTier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  hoursWatched: number;
}

export function useWatchStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WatchStats>({
    minutesWatched: 0,
    badgeTier: null,
    hoursWatched: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('minutes_watched, badge_tier')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      const tier = data.badge_tier;
      const validTier = tier === 'bronze' || tier === 'silver' || tier === 'gold' || tier === 'platinum' ? tier : null;
      
      setStats({
        minutesWatched: data.minutes_watched || 0,
        badgeTier: validTier,
        hoursWatched: Math.floor((data.minutes_watched || 0) / 60),
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  return { stats, loading, refetch: loadStats, refresh: loadStats };
}
