import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';

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
          <Card key={thought.id} className="p-4 hover:border-primary/50 transition-colors">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                {thought.user.handle[1].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-foreground">
                    {thought.user.handle}
                  </span>
                </div>
                <p className="text-foreground mb-2">{thought.content}</p>
                {thought.show && (
                  <div className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-sm mb-3">
                    📺 {thought.show}
                  </div>
                )}
                <div className="flex items-center gap-6 text-muted-foreground">
                  <button className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{thought.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-accent transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{thought.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-secondary transition-colors">
                    <Repeat2 className="h-4 w-4" />
                    <span className="text-sm">{thought.rethinks}</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        TV data provided by TheTVDB
      </div>
    </div>
  );
}
