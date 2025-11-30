import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TVPersonaProps {
  persona: string;
  description: string;
  onRegenerate?: () => void;
  loading?: boolean;
}

export function TVPersona({ persona, description, onRegenerate, loading }: TVPersonaProps) {
  return (
    <div className="p-6 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 rounded-xl border border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Your TV Persona</h3>
        </div>
        {onRegenerate && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRegenerate}
            disabled={loading}
          >
            <Sparkles className="mr-2 h-3 w-3" />
            {loading ? 'Generating...' : 'Regenerate'}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-2xl font-bold text-primary">{persona}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
