import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WatchedButtonProps {
  contentId: string; // UUID from content table
  showTitle: string;
}

export function WatchedButton({ contentId, showTitle }: WatchedButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWatched();
  }, [contentId, user]);

  const checkWatched = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('watched')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .single();

    setIsWatched(!!data);
  };

  const toggleWatched = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track watched shows",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isWatched) {
      const { error } = await supabase
        .from('watched')
        .delete()
        .eq('user_id', user.id)
        .eq('content_id', contentId);

      if (!error) {
        setIsWatched(false);
        toast({
          title: "Removed from watched",
          description: `${showTitle} marked as unwatched`,
        });
      }
    } else {
      const { error } = await supabase
        .from('watched')
        .insert({
          user_id: user.id,
          content_id: contentId,
          watched_at: new Date().toISOString(),
        });

      if (!error) {
        setIsWatched(true);
        toast({
          title: "Marked as watched",
          description: `${showTitle} added to watched list`,
        });
      }
    }

    setLoading(false);
  };

  return (
    <Button
      variant={isWatched ? "default" : "outline"}
      onClick={toggleWatched}
      disabled={loading}
      size="sm"
      className="flex-1 text-[10px] xs:text-xs sm:text-sm px-2 xs:px-3"
    >
      {isWatched ? (
        <>
          <Eye className="h-3 w-3 xs:h-4 xs:w-4 mr-1" />
          <span>Watched</span>
        </>
      ) : (
        <>
          <EyeOff className="h-3 w-3 xs:h-4 xs:w-4 mr-1" />
          <span>Watched</span>
        </>
      )}
    </Button>
  );
}