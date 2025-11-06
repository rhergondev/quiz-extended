import React, { useEffect, useRef, useCallback } from 'react';
import { Loader } from 'lucide-react';

/**
 * InfiniteScrollList Component
 * 
 * Implements infinite scroll functionality for lists
 * Automatically loads more items when user scrolls near the bottom
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - List items to render
 * @param {boolean} props.loading - Whether data is currently loading
 * @param {boolean} props.hasMore - Whether there are more items to load
 * @param {Function} props.onLoadMore - Callback to load more items
 * @param {number} props.threshold - Distance from bottom to trigger load (default: 200px)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.loadingText - Text to show while loading (default: 'Loading more...')
 */
const InfiniteScrollList = ({
  children,
  loading = false,
  hasMore = false,
  onLoadMore,
  threshold = 200,
  className = '',
  loadingText = 'Loading more...'
}) => {
  const scrollContainerRef = useRef(null);
  const isLoadingRef = useRef(false);

  /**
   * Handle scroll event
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingRef.current || !hasMore || loading) {
      return;
    }

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Calculate distance from bottom
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    // Trigger load more if within threshold
    if (distanceFromBottom < threshold) {
      console.log('📜 Infinite scroll triggered, loading more...');
      isLoadingRef.current = true;
      onLoadMore?.();
      
      // Reset loading flag after a short delay
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 500);
    }
  }, [hasMore, loading, threshold, onLoadMore]);

  /**
   * Attach scroll listener
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  /**
   * Reset loading ref when loading state changes
   */
  useEffect(() => {
    if (!loading) {
      isLoadingRef.current = false;
    }
  }, [loading]);

  return (
    <div 
      ref={scrollContainerRef}
      className={`overflow-y-auto ${className}`}
      style={{ 
        maxHeight: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
      }}
    >
      {children}
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">{loadingText}</span>
        </div>
      )}
      
      {/* End of list indicator */}
      {!hasMore && !loading && (
        <div className="text-center py-4">
          <span className="text-xs text-gray-400">No more items to load</span>
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollList;
