import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ReviewButtonProps {
  contentId: string;
  showTitle: string;
  existingReview?: string;
  existingRating?: number;
  onReviewSubmit?: () => void;
}

export function ReviewButton({ 
  contentId, 
  showTitle, 
  existingReview, 
  existingRating,
  onReviewSubmit 
}: ReviewButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(existingReview || '');
  const [rating, setRating] = useState(existingRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const submitReview = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to write reviews",
        variant: "destructive",
      });
      return;
    }

    if (!review.trim() && rating === 0) {
      toast({
        title: "Review required",
        description: "Please write a review or add a rating",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upsert the review
      const { error: reviewError } = await supabase
        .from('reviews')
        .upsert({
          user_id: user.id,
          content_id: contentId,
          review_text: review.trim(),
          rating: rating,
        });

      if (reviewError) throw reviewError;

      // Also update the rating table if a rating was provided
      if (rating > 0) {
        const { error: ratingError } = await supabase
          .from('ratings')
          .upsert({
            user_id: user.id,
            content_id: contentId,
            rating: rating,
          });

        if (ratingError) throw ratingError;
      }

      toast({
        title: "Success",
        description: "Your review has been saved!",
      });

      setOpen(false);
      onReviewSubmit?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save review",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="btn-glow">
          {existingReview ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Review
            </>
          ) : (
            <>
              <Star className="h-4 w-4 mr-2" />
              Write Review
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review: {showTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Star Rating */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-all active:scale-95"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Review</label>
            <Textarea
              placeholder="What did you think about this show? (Optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <Button 
            onClick={submitReview} 
            disabled={submitting}
            className="w-full btn-glow"
          >
            {submitting ? 'Saving...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}