import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpoilerTextProps {
  content: string;
  isSpoiler?: boolean;
  spoilerTitle?: string;
}

export function SpoilerText({ content, isSpoiler = false, spoilerTitle }: SpoilerTextProps) {
  const [revealed, setRevealed] = useState(!isSpoiler);

  if (!isSpoiler) {
    return <p className="text-foreground">{content}</p>;
  }

  const warningText = spoilerTitle 
    ? `This contains spoilers for ${spoilerTitle}` 
    : 'This contains spoilers';

  return (
    <div className="relative">
      <p className={`text-foreground transition-all ${revealed ? '' : 'blur-lg select-none'}`}>
        {content}
      </p>
      {!revealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm p-4">
          <p className="text-sm text-muted-foreground text-center">⚠️ {warningText}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRevealed(true)}
          >
            Reveal
          </Button>
        </div>
      )}
    </div>
  );
}