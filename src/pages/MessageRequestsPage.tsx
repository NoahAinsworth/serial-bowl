import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { acceptMessageRequest, rejectMessageRequest } from '@/api/messages';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface MessageRequest {
  id: string;
  message: string;
  created_at: string;
  sender: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
}

export default function MessageRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('message_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('message_requests')
        .select(`
          id,
          message,
          created_at,
          sender:profiles!message_requests_sender_id_fkey (
            id,
            handle,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data as any || []);
    } catch (error) {
      console.error('Error loading message requests:', error);
      toast.error('Failed to load message requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const conversationId = await acceptMessageRequest(requestId);
      toast.success('Message request accepted');
      
      // Remove from list
      setRequests(requests.filter(r => r.id !== requestId));
      
      // Navigate to the conversation
      navigate(`/messages`);
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept message request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await rejectMessageRequest(requestId);
      toast.success('Message request rejected');
      
      // Remove from list
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject message request');
    } finally {
      setProcessingId(null);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <p className="text-center text-muted-foreground">Please sign in to view message requests</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <p className="text-center text-muted-foreground">No pending message requests</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex items-start gap-4">
            <Avatar
              className="h-12 w-12 cursor-pointer"
              onClick={() => navigate(`/profile/${request.sender.handle}`)}
            >
              <AvatarImage src={request.sender.avatar_url || undefined} />
              <AvatarFallback>{request.sender.handle[0].toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-semibold cursor-pointer hover:underline"
                  onClick={() => navigate(`/profile/${request.sender.handle}`)}
                >
                  {request.sender.handle.startsWith('@') ? request.sender.handle : `@${request.sender.handle}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {request.message}
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAccept(request.id)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Accept'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
