import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { toast } from 'sonner';

interface DMReactionsProps {
  dmId: string;
  senderId: string;
  recipientId: string;
}

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

export const DMReactions = ({ dmId, senderId, recipientId }: DMReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`dm_reactions:${dmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_reactions',
          filter: `dm_id=eq.${dmId}`,
        },
        () => loadReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dmId]);

  const loadReactions = async () => {
    const { data, error } = await supabase
      .from('dm_reactions')
      .select('emoji, user_id')
      .eq('dm_id', dmId);

    if (error) {
      console.error('Error loading reactions:', error);
      return;
    }

    // Group reactions by emoji
    const grouped = data.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userReacted: false,
        };
      }
      acc[reaction.emoji].count++;
      if (reaction.user_id === user?.id) {
        acc[reaction.emoji].userReacted = true;
      }
      return acc;
    }, {} as Record<string, Reaction>);

    setReactions(Object.values(grouped));
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    setLoading(true);

    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.userReacted
    );

    try {
      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('dm_reactions')
          .delete()
          .eq('dm_id', dmId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('dm_reactions')
          .insert({
            dm_id: dmId,
            user_id: user.id,
            emoji,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to add reaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Show existing reactions */}
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs ${
            reaction.userReacted ? 'bg-primary/10' : ''
          }`}
          onClick={() => toggleReaction(reaction.emoji)}
          disabled={loading}
        >
          {reaction.emoji} {reaction.count > 1 && reaction.count}
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-muted"
                onClick={() => {
                  toggleReaction(emoji);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
