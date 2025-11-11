// v2.0 - Fixed itemId format
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PercentRating } from '@/components/PercentRating';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createThought } from '@/api/posts';
import { supabase } from '@/api/supabase';
import { replaceProfanity } from '@/utils/profanityFilter';

interface PostCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postType: 'review' | 'thought';
  itemType?: 'show' | 'season' | 'episode';
  itemId?: string;
  contentTitle: string;
  onSuccess?: () => void;
}

export function PostCreationDialog({
  open,
  onOpenChange,
  postType,
  itemType,
  itemId,
  contentTitle,
  onSuccess,
}: PostCreationDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(50);
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [hasMature, setHasMature] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }

    if (postType === 'thought' && !text.trim()) {
      toast.error('Please write something');
      return;
    }

    if (postType === 'review' && !text.trim() && !rating) {
      toast.error('Please add a rating or write a review');
      return;
    }

    setSubmitting(true);

    try {
      if (postType === 'review' && itemType && itemId) {
        // Replace profanity before sending to database
        const cleanedText = text.trim() ? replaceProfanity(text.trim()) : null;
        
        // Use the database function that handles both rating and review in one transaction
        const { data, error } = await supabase.rpc('api_rate_and_review', {
          p_item_type: itemType,
          p_item_id: itemId,
          p_score_any: String(rating),
          p_review: cleanedText,
          p_is_spoiler: hasSpoilers,
        });

        if (error) throw error;

        if (text.trim()) {
          toast.success('Review posted!');
        } else {
          toast.success('Rating saved!');
        }
      } else {
        await createThought({ 
          body: text.trim(), 
          hasSpoilers, 
          hasMature,
          itemType,
          itemId,
        });
        toast.success('Thought posted!');
      }

      setText('');
      setRating(50);
      setHasSpoilers(false);
      setHasMature(false);
      onOpenChange(false);
      onSuccess?.();
      
      // Navigate to home → New tab
      navigate('/home', { state: { scrollToTop: true } });
    } catch (error: any) {
      toast.error(error.message || 'Failed to post');
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
              <PercentRating initialRating={rating} onRate={setRating} compact />
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

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spoiler"
                checked={hasSpoilers}
                onCheckedChange={(checked) => setHasSpoilers(checked as boolean)}
              />
              <Label htmlFor="spoiler" className="text-sm">
                This contains spoilers
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mature"
                checked={hasMature}
                onCheckedChange={(checked) => setHasMature(checked as boolean)}
              />
              <Label htmlFor="mature" className="text-sm">
                🔞 This contains mature content
              </Label>
            </div>
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
