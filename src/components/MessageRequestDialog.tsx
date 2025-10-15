import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { sendMessageRequest } from '@/api/messages';
import { toast } from 'sonner';

interface MessageRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientHandle: string;
  recipientId: string;
}

export function MessageRequestDialog({
  open,
  onOpenChange,
  recipientHandle,
  recipientId,
}: MessageRequestDialogProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      await sendMessageRequest(recipientId, message.trim());
      toast.success('Message request sent');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message request:', error);
      toast.error('Failed to send message request');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message Request</DialogTitle>
          <DialogDescription>
            You and @{recipientHandle} don't follow each other. Send a message request to start a conversation.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="Write your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[100px]"
          maxLength={500}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
