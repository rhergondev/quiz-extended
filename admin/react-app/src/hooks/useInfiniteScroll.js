import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for implementing infinite scroll within a specific container.
 * 
 * @param {Function} loadMore - Function to call when more data needs to be loaded
 * @param {boolean} hasMore - Whether there are more items to load
 * @param {boolean} isLoading - Whether a load operation is currently in progress
 * @param {number} threshold - Distance from bottom (in pixels) to trigger load (default: 100)
 * @returns {Object} Object with ref to attach to scrollable container
 */
export const useInfiniteScroll = (loadMore, hasMore, isLoading, threshold = 100) => {
  const containerRef = useRef(null);
  const isLoadingRef = useRef(isLoading);
  const hasMoreRef = useRef(hasMore);

  // Update refs when props change
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Don't load if already loading or no more data
    if (isLoadingRef.current || !hasMoreRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // More conservative trigger: only when very close to bottom
    // and ensure we're actually scrolling down (not just resizing)
    if (distanceFromBottom < threshold && scrollTop > 0) {
      loadMore();
    }
  }, [loadMore, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    
    // Cleanup
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return { containerRef };
};