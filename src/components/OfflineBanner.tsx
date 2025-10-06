import { useOnline } from '@/hooks/useOnline';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnline();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2 z-50">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">You're offline</span>
    </div>
  );
}
