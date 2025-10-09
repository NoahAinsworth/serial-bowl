import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SafetyOverlayProps {
  type: 'spoiler' | 'sexual' | 'both';
}

export function SafetyOverlay({ type }: SafetyOverlayProps) {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm z-10 rounded-lg">
      <div className="text-center space-y-4 p-6">
        {type === 'spoiler' && (
          <>
            <AlertTriangle className="h-12 w-12 mx-auto text-warning" />
            <p className="font-semibold">⚠️ Spoiler hidden</p>
            <p className="text-sm text-muted-foreground">
              Turn off "Hide spoilers" in Settings to view.
            </p>
          </>
        )}
        
        {type === 'sexual' && (
          <>
            <div className="text-4xl">🔞</div>
            <p className="font-semibold">Contains mature content</p>
            <p className="text-sm text-muted-foreground">
              Turn OFF Strict Safety Mode to view.
            </p>
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
              Adjust your Safety Settings to view.
            </p>
          </>
        )}
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/settings')}
          className="mt-2"
        >
          Open Safety Settings
        </Button>
      </div>
    </div>
  );
}
