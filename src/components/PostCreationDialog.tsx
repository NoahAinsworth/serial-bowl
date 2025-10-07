import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PercentRating } from '@/components/PercentRating';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { postSchema } from '@/lib/validation';
import { z } from 'zod';

interface PostCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postType: 'review' | 'thought';
  contentId: string;
  contentTitle: string;
  onSuccess?: () => void;
}

export function PostCreationDialog({
  open,
  onOpenChange,
  postType,
  contentId,
  contentTitle,
  onSuccess,
}: PostCreationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to post",
        variant: "destructive",
      });
      return;
    }

    // Validate with Zod schema
    try {
      postSchema.parse({
        content: text,
        rating: rating > 0 ? rating : undefined,
        isSpoiler,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!text.trim() && postType === 'thought') {
      toast({
        title: "Content required",
        description: "Please write something",
        variant: "destructive",
      });
      return;
    }

    if (!text.trim() && !rating && postType === 'review') {
      toast({
        title: "Content required",
        description: "Please add a rating or write a review",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (postType === 'review') {
        // ALWAYS save rating if provided
        if (rating > 0) {
          const { error: ratingError } = await supabase
            .from('ratings')
            .upsert({
              user_id: user.id,
              content_id: contentId,
              rating,
            }, {
              onConflict: 'user_id,content_id'
            });

          if (ratingError) throw ratingError;

          // Log rating interaction for algorithm
          await supabase
            .from('interactions')
            .insert({
              user_id: user.id,
              post_id: contentId,
              post_type: 'rating',
              interaction_type: 'rate',
            })
            .select()
            .single();
        }

        // Only create a review POST if text is provided
        // Rating alone does NOT create a post
        if (text.trim()) {
          const { error: reviewError } = await supabase
            .from('reviews')
            .insert({
              user_id: user.id,
              content_id: contentId,
              review_text: text,
              is_spoiler: isSpoiler,
            });

          if (reviewError) throw reviewError;
        }
      } else {
        // Save thought
        const { error: thoughtError } = await supabase
          .from('thoughts')
          .insert({
            user_id: user.id,
            content_id: contentId,
            text_content: text,
            is_spoiler: isSpoiler,
          });

        if (thoughtError) throw thoughtError;
      }

      // Different success messages based on what was saved
      const successMsg = postType === 'review' 
        ? (text.trim() ? 'Review posted!' : 'Rating saved!')
        : 'Thought posted!';

      toast({
        title: "Success",
        description: successMsg,
      });

      setText('');
      setRating(0);
      setIsSpoiler(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error posting:', error);
      toast({
        title: "Error",
        description: "Failed to post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {postType === 'review' ? 'Write a Review' : 'Share a Thought'}
          </DialogTitle>
          <DialogDescription>{contentTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {postType === 'review' && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Rating</p>
              <PercentRating initialRating={rating || 50} onRate={setRating} compact />
            </div>
          )}

          <div>
            <Textarea
              placeholder={postType === 'review' ? 'Write your review...' : 'Share your thoughts...'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="spoiler"
              checked={isSpoiler}
              onCheckedChange={(checked) => setIsSpoiler(checked as boolean)}
            />
            <Label
              htmlFor="spoiler"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              This contains spoilers
            </Label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post {postType === 'review' ? 'Review' : 'Thought'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
