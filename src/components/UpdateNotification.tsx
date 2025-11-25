import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function UpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates every hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 mx-4 md:left-auto md:right-4 md:mx-0 md:max-w-md">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-sm">Update Available</p>
          <p className="text-xs opacity-90">A new version is ready. Reload to update.</p>
        </div>
        <Button
          onClick={handleUpdate}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2 shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
          Reload
        </Button>
      </div>
    </div>
  );
}
