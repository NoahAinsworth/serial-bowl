import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FollowRequest {
  id: string;
  follower_id: string;
  profiles: {
    id: string;
    handle: string;
    avatar_url: string | null;
  };
}

export function FollowRequestsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('follows')
      .select('id, follower_id, profiles!follows_follower_id_fkey(id, handle, avatar_url)')
      .eq('following_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error loading requests:', error);
    } else {
      setRequests(data as unknown as FollowRequest[]);
    }
    setLoading(false);
  };

  const handleRequest = async (requestId: string, accept: boolean) => {
    setProcessing(requestId);
    try {
      if (accept) {
        const { error } = await supabase
          .from('follows')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: "Request accepted",
          description: "You have a new follower",
        });
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: "Request declined",
        });
      }

      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error handling request:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No pending follow requests
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer flex-1"
              onClick={() => navigate(`/profile/${request.follower_id}`)}
            >
              <Avatar>
                <AvatarImage src={request.profiles.avatar_url || undefined} />
                <AvatarFallback>
                  {request.profiles.handle[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{request.profiles.handle}</p>
                <p className="text-sm text-muted-foreground">wants to follow you</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleRequest(request.id, true)}
                disabled={processing === request.id}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRequest(request.id, false)}
                disabled={processing === request.id}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
