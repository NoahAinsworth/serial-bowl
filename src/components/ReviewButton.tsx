import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PercentRating } from '@/components/PercentRating';

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
  const [rating, setRating] = useState(existingRating || 50);
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

    if (!review.trim() && (!rating || rating < 1)) {
      toast({
        title: "Review required",
        description: "Please write a review or add a rating",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upsert the review (trigger will auto-sync rating to ratings table)
      const { error: reviewError } = await supabase
        .from('reviews')
        .upsert({
          user_id: user.id,
          content_id: contentId,
          review_text: review.trim(),
          rating: rating > 0 ? rating : null,
        }, {
          onConflict: 'user_id,content_id'
        });

      if (reviewError) throw reviewError;

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
        <Button variant="outline">
          {existingReview ? 'Edit Review' : 'Write Review'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review: {showTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Percentage Rating */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Rating</label>
            <PercentRating
              initialRating={rating}
              onRate={setRating}
              disabled={submitting}
            />
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
            className="w-full"
          >
            {submitting ? 'Saving...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}