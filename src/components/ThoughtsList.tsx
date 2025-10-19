import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThoughtCard } from './ThoughtCard';
import { Card } from './ui/card';

interface ThoughtsListProps {
  contentId: string;
}

export function ThoughtsList({ contentId }: ThoughtsListProps) {
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThoughts();
  }, [contentId]);

  const loadThoughts = async () => {
    setLoading(true);
    
    // Get the content to find item_id for posts
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('external_id, kind')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      console.error('ThoughtsList - Error loading content:', contentError);
      setLoading(false);
      return;
    }

    const { data: thoughtPosts } = await supabase
      .from('posts')
      .select(`
        id,
        body,
        created_at,
        is_spoiler,
        author_id,
        profiles:author_id (
          id,
          handle,
          avatar_url
        )
      `)
      .eq('kind', 'thought')
      .eq('item_type', content.kind)
      .eq('item_id', content.external_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (thoughtPosts) {
      // Map to match ThoughtCard expected format
      const formattedThoughts = thoughtPosts.map(post => ({
        id: post.id,
        content: post.body,
        is_spoiler: post.is_spoiler,
        user: {
          id: post.author_id,
          handle: post.profiles?.handle || 'unknown',
          avatar_url: post.profiles?.avatar_url,
        },
        likes: 0,
        dislikes: 0,
        comments: 0,
      }));
      setThoughts(formattedThoughts);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading thoughts...</p>
      </Card>
    );
  }

  if (thoughts.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No thoughts yet. Be the first to share!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {thoughts.map((thought) => (
        <ThoughtCard key={thought.id} thought={thought} />
      ))}
    </div>
  );
}
