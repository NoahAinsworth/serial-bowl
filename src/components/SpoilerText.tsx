import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpoilerTextProps {
  content: string;
  isSpoiler?: boolean;
}

export function SpoilerText({ content, isSpoiler = false }: SpoilerTextProps) {
  const [revealed, setRevealed] = useState(!isSpoiler);

  if (!isSpoiler) {
    return <p className="text-foreground">{content}</p>;
  }

  return (
    <div className="relative">
      <p className={`text-foreground transition-all ${revealed ? '' : 'blur-lg select-none'}`}>
        {content}
      </p>
      {!revealed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRevealed(true)}
            className="bg-background/80 backdrop-blur-sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reveal Spoiler
          </Button>
        </div>
      )}
    </div>
  );
}