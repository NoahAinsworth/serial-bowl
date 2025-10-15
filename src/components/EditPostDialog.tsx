import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    body: string | null;
    rating_percent: number | null;
  };
  onSuccess: () => void;
}

export function EditPostDialog({ open, onOpenChange, post, onSuccess }: EditPostDialogProps) {
  const [editedBody, setEditedBody] = useState(post.body || '');
  const [saving, setSaving] = useState(false);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open) {
      setEditedBody(post.body || '');
      loadEditHistory();
    }
  }, [open, post.body]);

  const loadEditHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('post_edit_history')
      .select('*')
      .eq('post_id', post.id)
      .order('edited_at', { ascending: false });
    
    if (data) setEditHistory(data);
    setLoadingHistory(false);
  };

  const handleSave = async () => {
    if (!editedBody.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    setSaving(true);
    try {
      // Save current version to history
      await supabase
        .from('post_edit_history')
        .insert({
          post_id: post.id,
          previous_body: post.body,
          previous_rating_percent: post.rating_percent,
        });

      // Update post
      const { error } = await supabase
        .from('posts')
        .update({
          body: editedBody.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        
        <Textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          className="min-h-[120px]"
          maxLength={500}
        />
        
        <div className="text-sm text-muted-foreground text-right">
          {editedBody.length} / 500
        </div>

        {editHistory.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="history">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  View Edit History ({editHistory.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {editHistory.map((edit) => (
                    <div key={edit.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(edit.edited_at).toLocaleString()}
                      </div>
                      <div className="whitespace-pre-wrap">{edit.previous_body}</div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !editedBody.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
