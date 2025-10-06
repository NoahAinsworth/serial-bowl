import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, UserMinus, Clock } from 'lucide-react';

interface FollowRequestButtonProps {
  targetUserId: string;
  isPrivate: boolean;
  initialFollowStatus: 'none' | 'pending' | 'accepted';
  onStatusChange?: () => void;
}

export function FollowRequestButton({ 
  targetUserId, 
  isPrivate, 
  initialFollowStatus,
  onStatusChange 
}: FollowRequestButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState(initialFollowStatus);
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (status === 'none') {
        // Create follow request
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: isPrivate ? 'pending' : 'accepted'
        });

        if (error) throw error;

        setStatus(isPrivate ? 'pending' : 'accepted');
        toast({
          title: isPrivate ? "Request sent" : "Following",
          description: isPrivate ? "Waiting for approval" : "You are now following this user",
        });
      } else {
        // Unfollow or cancel request
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setStatus('none');
        toast({
          title: "Unfollowed",
          description: status === 'pending' ? "Request cancelled" : "You are no longer following this user",
        });
      }
      
      onStatusChange?.();
    } catch (error) {
      console.error('Follow action error:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id === targetUserId) return null;

  const getButtonContent = () => {
    switch (status) {
      case 'accepted':
        return { icon: UserMinus, text: 'Following', variant: 'outline' as const };
      case 'pending':
        return { icon: Clock, text: 'Requested', variant: 'outline' as const };
      default:
        return { 
          icon: UserPlus, 
          text: isPrivate ? 'Request to Follow' : 'Follow', 
          variant: 'default' as const 
        };
    }
  };

  const { icon: Icon, text, variant } = getButtonContent();

  return (
    <Button 
      onClick={handleAction}
      disabled={loading}
      variant={variant}
      size="sm"
    >
      <Icon className="h-4 w-4 mr-2" />
      {text}
    </Button>
  );
}
