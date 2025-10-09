import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

/**
 * Hook for pull-to-refresh functionality on mobile
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 120,
  disabled = false,
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);
  const isValidPull = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start tracking if we're at the very top
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
        isValidPull.current = true;
      } else {
        isValidPull.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Ignore if not a valid pull or if already refreshing
      if (!isValidPull.current || isRefreshing) return;
      
      // If user scrolled away from top, cancel the pull
      if (window.scrollY > 5) {
        isValidPull.current = false;
        setIsPulling(false);
        pullDistance.current = 0;
        return;
      }

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      // Only consider downward pulls (positive distance)
      if (distance > 10) { // Require at least 10px movement to start
        pullDistance.current = distance;
        if (distance > threshold / 2) {
          setIsPulling(true);
        }
      } else {
        // Reset if movement is too small or upward
        pullDistance.current = 0;
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isValidPull.current) {
        setIsPulling(false);
        pullDistance.current = 0;
        return;
      }

      if (pullDistance.current > threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          pullDistance.current = 0;
          isValidPull.current = false;
        }
      } else {
        setIsPulling(false);
        pullDistance.current = 0;
        isValidPull.current = false;
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, threshold, onRefresh, isRefreshing]);

  return { isPulling, isRefreshing };
}
