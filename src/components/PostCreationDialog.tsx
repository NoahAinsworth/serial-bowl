import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { detectMatureContent } from '@/utils/profanityFilter';

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
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [containsMature, setContainsMature] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-detect mature content when text changes
  const handleTextChange = (value: string) => {
    setText(value);
    const { isMature, reasons } = detectMatureContent(value);
    if (isMature && !containsMature) {
      setContainsMature(true);
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called', { user, text, rating, postType });
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to post",
        variant: "destructive",
      });
      return;
    }

    // Validate with Zod schema - only validate content if there is text
    if (text.trim()) {
      try {
        postSchema.parse({
          content: text,
          rating: rating > 0 ? rating : undefined,
          isSpoiler,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error);
          toast({
            title: "Validation Error",
            description: error.issues[0].message,
            variant: "destructive",
          });
          return;
        }
      }
    }

    if (!text.trim() && postType === 'thought') {
      console.log('No text for thought');
      toast({
        title: "Content required",
        description: "Please write something",
        variant: "destructive",
      });
      return;
    }

    if (!text.trim() && !rating && postType === 'review') {
      console.log('No text or rating for review');
      toast({
        title: "Content required",
        description: "Please add a rating or write a review",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    console.log('Starting submission...');

    try {
      if (postType === 'review') {
        // Detect mature content if there's text
        const { isMature, reasons } = text.trim() ? detectMatureContent(text) : { isMature: false, reasons: [] };
        
        // Create review record (with or without text, as long as rating or text exists)
        const { error: reviewError } = await supabase
          .from('reviews')
          .insert({
            user_id: user.id,
            content_id: contentId,
            review_text: text.trim() || null,
            rating: rating > 0 ? rating : null,
            is_spoiler: isSpoiler,
            contains_mature: containsMature || isMature,
            mature_reasons: containsMature || isMature ? reasons : [],
          });

        if (reviewError) throw reviewError;

        // Also save rating to ratings table if provided
        if (rating > 0) {
          console.log('💾 Saving rating:', { user_id: user.id, content_id: contentId, rating });
          const { error: ratingError, data: ratingData } = await supabase
            .from('ratings')
            .upsert({
              user_id: user.id,
              content_id: contentId,
              rating,
            }, {
              onConflict: 'user_id,content_id'
            })
            .select();

          if (ratingError) {
            console.error('❌ Rating error:', ratingError);
            throw ratingError;
          }

          console.log('✅ Rating saved successfully:', ratingData);

          // Log rating interaction for algorithm
          await supabase
            .from('interactions')
            .insert({
              user_id: user.id,
              post_id: contentId,
              post_type: 'rating',
              interaction_type: 'rate',
            });
        }
      } else {
        // Save thought
        const { isMature, reasons } = detectMatureContent(text);
        
        const { error: thoughtError } = await supabase
          .from('thoughts')
          .insert({
            user_id: user.id,
            content_id: contentId,
            text_content: text,
            is_spoiler: isSpoiler,
            contains_mature: containsMature || isMature,
            mature_reasons: containsMature || isMature ? reasons : [],
          });

        if (thoughtError) throw thoughtError;
      }

      // Different success messages based on what was saved
      const successMsg = postType === 'review' 
        ? (text.trim() ? 'Review posted!' : 'Rating saved!')
        : 'Thought posted!';

      console.log('Post successful!', successMsg);

      toast({
        title: "Success",
        description: successMsg,
      });

      setText('');
      setRating(0);
      setIsSpoiler(false);
      setContainsMature(false);
      onOpenChange(false);
      onSuccess?.();
      
      // Navigate to home after posting
      navigate('/');
    } catch (error: any) {
      console.error('Error posting:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      toast({
        title: "Error",
        description: error.message || "Failed to post. Please try again.",
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
              onChange={(e) => handleTextChange(e.target.value)}
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="mature"
              checked={containsMature}
              onCheckedChange={(checked) => setContainsMature(checked as boolean)}
            />
            <Label
              htmlFor="mature"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              🔞 This contains mature content
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
