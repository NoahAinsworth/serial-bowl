import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ContentBowlScore {
  globalScore: number | null;
  personalScore: number | null;
  loading: boolean;
}

/**
 * Unified hook for fetching bowl scores for shows, seasons, and episodes
 * - Shows: Use existing show_bowl_scores table
 * - Seasons/Episodes: Calculate AVG from user_ratings table
 */
export function useContentBowlScore(
  itemType: 'show' | 'season' | 'episode',
  itemId: string | null
): ContentBowlScore {
  const { user } = useAuth();
  const [globalScore, setGlobalScore] = useState<number | null>(null);
  const [personalScore, setPersonalScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      if (!itemId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (itemType === 'show') {
          // For shows, use the existing show_bowl_scores table
          const { data: globalData } = await supabase
            .from('show_bowl_scores')
            .select('bowl_score')
            .eq('show_id', itemId)
            .maybeSingle();

          setGlobalScore(globalData?.bowl_score ?? null);

          // Personal score from user_show_bowl_scores
          if (user) {
            const { data: personalData } = await supabase
              .from('user_show_bowl_scores')
              .select('bowl_score')
              .eq('user_id', user.id)
              .eq('show_id', itemId)
              .maybeSingle();

            setPersonalScore(personalData?.bowl_score ?? null);
          }
        } else {
          // For seasons and episodes, calculate AVG from user_ratings
          const { data: ratingsData } = await supabase
            .from('user_ratings')
            .select('score, user_id')
            .eq('item_type', itemType)
            .eq('item_id', itemId);

          if (ratingsData && ratingsData.length > 0) {
            // Calculate global average
            const sum = ratingsData.reduce((acc, r) => acc + r.score, 0);
            const avg = Math.round(sum / ratingsData.length);
            setGlobalScore(avg);

            // Find personal score if user is logged in
            if (user) {
              const userRating = ratingsData.find(r => r.user_id === user.id);
              setPersonalScore(userRating?.score ?? null);
            }
          } else {
            setGlobalScore(null);
            setPersonalScore(null);
          }
        }
      } catch (err) {
        console.error('Error fetching bowl scores:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, [itemType, itemId, user]);

  return { globalScore, personalScore, loading };
}
