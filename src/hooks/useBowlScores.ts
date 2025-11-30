import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface BowlScores {
  globalScore: number | null;
  personalScore: number | null;
  loading: boolean;
  error: Error | null;
}

export function useBowlScores(showId: string | number): BowlScores {
  const { user } = useAuth();
  const [globalScore, setGlobalScore] = useState<number | null>(null);
  const [personalScore, setPersonalScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchScores() {
      if (!showId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const showIdStr = String(showId);

        // Fetch global bowl score
        const { data: globalData, error: globalError } = await supabase
          .from('show_bowl_scores')
          .select('bowl_score')
          .eq('show_id', showIdStr)
          .maybeSingle();

        if (globalError) throw globalError;
        setGlobalScore(globalData?.bowl_score ?? null);

        // Fetch personal bowl score if user is logged in
        if (user) {
          const { data: personalData, error: personalError } = await supabase
            .from('user_show_bowl_scores')
            .select('bowl_score')
            .eq('user_id', user.id)
            .eq('show_id', showIdStr)
            .maybeSingle();

          if (personalError) throw personalError;
          setPersonalScore(personalData?.bowl_score ?? null);
        } else {
          setPersonalScore(null);
        }
      } catch (err) {
        console.error('Error fetching bowl scores:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, [showId, user]);

  return { globalScore, personalScore, loading, error };
}
