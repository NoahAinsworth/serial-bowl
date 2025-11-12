import { AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SafetyOverlayProps {
  type: 'spoiler' | 'sexual' | 'both';
  onRevealSpoiler?: () => void;
  spoilerTitle?: string;
}

export function SafetyOverlay({ type, onRevealSpoiler, spoilerTitle }: SafetyOverlayProps) {
  const navigate = useNavigate();

  if (type === 'spoiler') {
    const spoilerText = spoilerTitle ? `Contains spoilers for ${spoilerTitle}` : 'Contains spoilers';
    
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none gap-2">
        <p className="text-sm text-muted-foreground pointer-events-auto">⚠️ {spoilerText}</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRevealSpoiler?.();
          }}
          className="pointer-events-auto bg-background/95 backdrop-blur-sm shadow-lg border-warning/50 hover:border-warning"
        >
          <AlertTriangle className="h-4 w-4 mr-2 text-warning" />
          Reveal Spoiler
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm z-10 rounded-lg">
      <div className="text-center space-y-4 p-6">
        {type === 'sexual' && (
          <>
            <div className="text-4xl">🔞</div>
            <p className="font-semibold">Contains mature content</p>
            <p className="text-sm text-muted-foreground">
              Turn OFF Strict Safety Mode to view.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/settings')}
              className="mt-2"
            >
              Open Safety Settings
            </Button>
          </>
        )}
        
        {type === 'both' && (
          <>
            <div className="flex items-center justify-center gap-3">
              <AlertTriangle className="h-10 w-10 text-warning" />
              <div className="text-3xl">🔞</div>
            </div>
            <p className="font-semibold">Spoiler + Mature Content</p>
            <p className="text-sm text-muted-foreground">
              Turn OFF Strict Safety to view mature content
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/settings')}
              className="mt-2"
            >
              Open Safety Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
