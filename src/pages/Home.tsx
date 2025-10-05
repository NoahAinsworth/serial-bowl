import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThoughtCard } from '@/components/ThoughtCard';

export default function Home() {
  const [feedMode, setFeedMode] = useState<'following' | 'for-you'>('for-you');

  const mockThoughts = [
    {
      id: 1,
      user: { handle: '@retrotvfan', avatar: null },
      content: 'Just finished the latest episode of Stranger Things. The 80s nostalgia is REAL! 📺',
      show: 'Stranger Things',
      likes: 42,
      comments: 8,
      rethinks: 3,
    },
    {
      id: 2,
      user: { handle: '@serialwatcher', avatar: null },
      content: 'Can we talk about how perfect this season has been? Every episode is a masterpiece.',
      show: null,
      likes: 156,
      comments: 23,
      rethinks: 12,
    },
  ];

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      {/* Feed Mode Toggle */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          variant={feedMode === 'following' ? 'default' : 'ghost'}
          onClick={() => setFeedMode('following')}
          className="btn-glow"
        >
          Following
        </Button>
        <Button
          variant={feedMode === 'for-you' ? 'default' : 'ghost'}
          onClick={() => setFeedMode('for-you')}
          className="btn-glow"
        >
          For You
        </Button>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {mockThoughts.map((thought) => (
          <ThoughtCard
            key={thought.id}
            thought={{
              id: thought.id.toString(),
              user: { id: '1', handle: thought.user.handle },
              content: thought.content,
              show: thought.show ? { title: thought.show } : undefined,
              likes: thought.likes,
              dislikes: 0,
              comments: thought.comments,
              rethinks: thought.rethinks,
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        TV data provided by TheTVDB
      </div>
    </div>
  );
}
