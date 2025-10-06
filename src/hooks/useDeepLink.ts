import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to handle deep links from query parameters or native app
 */
export function useDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle web deep links from query params
    const params = new URLSearchParams(window.location.search);
    const deepPath = params.get('deep');
    
    if (deepPath) {
      navigate(deepPath);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle Capacitor deep links (when native)
    const handleDeepLink = (data: any) => {
      const url = data.url || data.path;
      if (url) {
        // Extract path from URL (e.g., serialbowl://post/123 -> /post/123)
        const match = url.match(/serialbowl:\/\/(.+)/);
        if (match) {
          navigate(`/${match[1]}`);
        }
      }
    };

    // Listen for Capacitor App plugin events
    if ((window as any).Capacitor) {
      const { App } = (window as any).Capacitor.Plugins || {};
      if (App) {
        App.addListener('appUrlOpen', handleDeepLink);
        
        return () => {
          App.removeAllListeners();
        };
      }
    }
  }, [navigate]);
}
