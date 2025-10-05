import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ThoughtCardProps {
  thought: {
    id: string;
    user: {
      id: string;
      handle: string;
      avatar_url?: string;
    };
    content: string;
    show?: {
      title: string;
    };
    likes: number;
    dislikes: number;
    comments: number;
    rethinks: number;
    userReaction?: 'like' | 'dislike' | 'rethink';
  };
  onReactionChange?: () => void;
}

export function ThoughtCard({ thought, onReactionChange }: ThoughtCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [localReaction, setLocalReaction] = useState(thought.userReaction);
  const [localLikes, setLocalLikes] = useState(thought.likes);
  const [localDislikes, setLocalDislikes] = useState(thought.dislikes);
  const [localRethinks, setLocalRethinks] = useState(thought.rethinks);

  const handleReaction = async (type: 'like' | 'dislike' | 'rethink') => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to react to thoughts",
        variant: "destructive",
      });
      return;
    }

    try {
      // Remove existing reaction if same type
      if (localReaction === type) {
        await supabase
          .from('reactions')
          .delete()
          .eq('thought_id', thought.id)
          .eq('user_id', user.id)
          .eq('reaction_type', type);

        if (type === 'like') setLocalLikes(prev => prev - 1);
        if (type === 'dislike') setLocalDislikes(prev => prev - 1);
        if (type === 'rethink') setLocalRethinks(prev => prev - 1);
        setLocalReaction(undefined);
      } else {
        // Remove old reaction if exists
        if (localReaction) {
          await supabase
            .from('reactions')
            .delete()
            .eq('thought_id', thought.id)
            .eq('user_id', user.id)
            .eq('reaction_type', localReaction);

          if (localReaction === 'like') setLocalLikes(prev => prev - 1);
          if (localReaction === 'dislike') setLocalDislikes(prev => prev - 1);
          if (localReaction === 'rethink') setLocalRethinks(prev => prev - 1);
        }

        // Add new reaction
        await supabase
          .from('reactions')
          .insert({
            thought_id: thought.id,
            user_id: user.id,
            reaction_type: type,
          });

        if (type === 'like') setLocalLikes(prev => prev + 1);
        if (type === 'dislike') setLocalDislikes(prev => prev + 1);
        if (type === 'rethink') setLocalRethinks(prev => prev + 1);
        setLocalReaction(type);
      }

      onReactionChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 hover:border-primary/50 transition-colors">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
          {thought.user.handle[1]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-foreground truncate">
              {thought.user.handle}
            </span>
          </div>
          <p className="text-foreground mb-2 break-words">{thought.content}</p>
          {thought.show && (
            <div className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-sm mb-3">
              📺 {thought.show.title}
            </div>
          )}
          <div className="flex items-center gap-6 text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('like')}
              className={localReaction === 'like' ? 'text-primary' : ''}
            >
              <Heart className={`h-4 w-4 mr-1 ${localReaction === 'like' ? 'fill-primary' : ''}`} />
              <span className="text-sm">{localLikes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:text-accent transition-colors"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">{thought.comments}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction('rethink')}
              className={localReaction === 'rethink' ? 'text-secondary' : ''}
            >
              <Repeat2 className="h-4 w-4 mr-1" />
              <span className="text-sm">{localRethinks}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
