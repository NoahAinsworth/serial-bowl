import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface EditDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dm: {
    id: string;
    text_content: string;
  };
  onSuccess: () => void;
}

export function EditDMDialog({ open, onOpenChange, dm, onSuccess }: EditDMDialogProps) {
  const [editedText, setEditedText] = useState(dm.text_content);
  const [saving, setSaving] = useState(false);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open) {
      setEditedText(dm.text_content);
      loadEditHistory();
    }
  }, [open, dm.text_content]);

  const loadEditHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('dm_edit_history')
      .select('*')
      .eq('dm_id', dm.id)
      .order('edited_at', { ascending: false });
    
    if (data) setEditHistory(data);
    setLoadingHistory(false);
  };

  const handleSave = async () => {
    if (!editedText.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    setSaving(true);
    try {
      // Save current version to history
      await supabase
        .from('dm_edit_history')
        .insert({
          dm_id: dm.id,
          previous_text_content: dm.text_content,
        });

      // Update DM
      const { error } = await supabase
        .from('dms')
        .update({
          text_content: editedText.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', dm.id);

      if (error) throw error;

      toast.success('Message updated');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update message');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>
        
        <Textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-[120px]"
          maxLength={500}
        />
        
        <div className="text-sm text-muted-foreground text-right">
          {editedText.length} / 500
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
                      <div className="whitespace-pre-wrap">{edit.previous_text_content}</div>
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
          <Button onClick={handleSave} disabled={saving || !editedText.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
