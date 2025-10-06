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
  threshold = 80,
  disabled = false,
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY !== 0 || isRefreshing) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      if (distance > 0) {
        pullDistance.current = distance;
        if (distance > threshold / 2) {
          setIsPulling(true);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance.current > threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          pullDistance.current = 0;
        }
      } else {
        setIsPulling(false);
        pullDistance.current = 0;
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, threshold, onRefresh, isRefreshing]);

  return { isPulling, isRefreshing };
}
