import { useState, useEffect } from 'react';

/**
 * Hook to detect if app is running in Capacitor native environment
 */
export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(!!(window as any).Capacitor);
  }, []);

  return isNative;
}
