import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { PercentRating } from './PercentRating';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickRatingProps {
  itemId: string;
  itemType: 'show' | 'season' | 'episode';
  compact?: boolean;
}

export function QuickRating({ itemId, itemType, compact = true }: QuickRatingProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<number | null>(null);
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    loadRating();
  }, [itemId, user]);

  const loadRating = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_ratings')
      .select('score')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle();

    if (data) {
      setRating(data.score);
    }
  };

  const handleRatingChange = async (newRating: number) => {
    if (!user) {
      toast.error('Please sign in to rate');
      return;
    }

    try {
      const { error } = await supabase.rpc('api_rate_and_review', {
        p_item_type: itemType,
        p_item_id: itemId,
        p_score_any: String(newRating),
        p_review: null,
        p_is_spoiler: false,
      });

      if (error) throw error;

      setRating(newRating);
      toast.success('✅ Rating saved! +25 Binge Points');
      setShowSlider(false);
    } catch (error) {
      toast.error('Failed to save rating');
    }
  };

  if (!user) return null;

  if (rating && !showSlider) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1 text-sm font-semibold cursor-pointer",
          "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-full px-3 py-1",
          compact ? "text-xs" : "text-sm"
        )}
        onClick={() => setShowSlider(true)}
      >
        <Star className="h-3 w-3 fill-current" />
        <span>{rating}%</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-[44px]" style={{ touchAction: 'manipulation' }}>
      <PercentRating
        initialRating={rating || 0}
        onRate={handleRatingChange}
        compact={compact}
        showSaveButton={false}
      />
    </div>
  );
}
