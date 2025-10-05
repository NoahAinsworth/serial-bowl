import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

export default function PostPage() {
  const [content, setContent] = useState('');

  const handlePost = () => {
    console.log('Posting thought:', content);
    setContent('');
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Share Your Thoughts</h2>
        <Textarea
          placeholder="What's on your mind about TV?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[150px] mb-4 resize-none"
        />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {content.length} / 500
          </span>
          <Button
            onClick={handlePost}
            disabled={!content.trim()}
            className="btn-glow"
          >
            Post Thought
          </Button>
        </div>
      </Card>
    </div>
  );
}
