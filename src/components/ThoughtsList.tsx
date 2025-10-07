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
    const { data } = await supabase
      .from('thoughts')
      .select(`
        *,
        profiles:user_id (
          id,
          handle,
          avatar_url
        ),
        content:content_id (
          id,
          title,
          kind
        )
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false });

    if (data) {
      setThoughts(data);
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
