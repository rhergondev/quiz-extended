/**
 * useQuizQuestions Hook
 * 
 * Optimized hook for loading quiz questions with lazy loading
 * Loads questions in batches as the user progresses through the quiz
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getQuestionsByIds } from '../api/services/questionService';

/**
 * Hook to load quiz questions with lazy loading optimization
 * 🔥 OPTIMIZED: Consistent 50-question batches for reliable loading
 * Supports quizzes up to 100 questions (2 batches)
 * 
 * @param {number[]} questionIds - Array of all question IDs in the quiz
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Enable auto-fetch (default: true)
 * @param {number} options.initialBatchSize - Number of questions to load initially (default: 50)
 * @param {number} options.prefetchThreshold - Load next batch when this many questions remain (default: 5)
 * @param {number} options.batchSize - Size of each additional batch (default: 50)
 * @param {boolean} options.randomize - Randomize question order (default: false)
 * @returns {Object} { questions, loading, error, progress, hasMore, loadMore }
 */
export const useQuizQuestions = (questionIds, options = {}) => {
  const {
    enabled = true,
    initialBatchSize = 50, // 🔥 OPTIMIZED: 50 questions per batch (consistent)
    prefetchThreshold = 5, // 🔥 OPTIMIZED: Prefetch when 5 questions remain
    batchSize = 50, // 🔥 OPTIMIZED: 50 questions per batch (consistent)
    randomize = false
  } = options;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadedCount, setLoadedCount] = useState(0);
  
  // Use ref to track loading state to prevent duplicate requests
  const isLoadingRef = useRef(false);
  const loadedIdsRef = useRef(new Set());

  // Randomize question IDs once if needed
  const [orderedIds, setOrderedIds] = useState([]);

  useEffect(() => {
    if (questionIds && questionIds.length > 0) {
      if (randomize) {
        const shuffled = [...questionIds].sort(() => Math.random() - 0.5);
        setOrderedIds(shuffled);
      } else {
        setOrderedIds(questionIds);
      }
    }
  }, [questionIds, randomize]);

  /**
   * Load a batch of questions
   */
  const loadBatch = useCallback(async (startIndex, count) => {
    if (isLoadingRef.current) {
      console.log('⏸️ Already loading, skipping duplicate request');
      return [];
    }

    const idsToLoad = orderedIds.slice(startIndex, startIndex + count);
    
    // Filter out already loaded IDs
    const newIds = idsToLoad.filter(id => !loadedIdsRef.current.has(id));
    
    if (newIds.length === 0) {
      console.log('✅ All requested questions already loaded');
      return [];
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log(`📥 Loading questions batch: ${startIndex}-${startIndex + newIds.length} (${newIds.length} questions)`);
      
      // 🔥 OPTIMIZED: Use consistent 50-question batches for API calls
      const loadedQuestions = await getQuestionsByIds(newIds, { batchSize: 50 });
      
      // Mark as loaded
      newIds.forEach(id => loadedIdsRef.current.add(id));
      
      // Append to existing questions
      setQuestions(prev => [...prev, ...loadedQuestions]);
      setLoadedCount(prev => prev + loadedQuestions.length);
      
      console.log(`✅ Loaded ${loadedQuestions.length} questions. Total: ${loadedIdsRef.current.size}/${orderedIds.length}`);
      
      return loadedQuestions;
    } catch (err) {
      console.error('❌ Error loading question batch:', err);
      setError(err.message || 'Failed to load questions');
      return [];
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [orderedIds]);

  /**
   * Load initial batch
   */
  const loadInitialBatch = useCallback(async () => {
    if (!enabled || orderedIds.length === 0) return;
    
    console.log(`🚀 Loading initial batch of ${initialBatchSize} questions...`);
    await loadBatch(0, initialBatchSize);
  }, [enabled, orderedIds, initialBatchSize, loadBatch]);

  /**
   * Load more questions (next batch)
   */
  const loadMore = useCallback(async () => {
    const currentCount = loadedIdsRef.current.size;
    if (currentCount >= orderedIds.length) {
      console.log('✅ All questions already loaded');
      return;
    }

    console.log(`📥 Loading more questions... (${currentCount}/${orderedIds.length} loaded)`);
    await loadBatch(currentCount, batchSize);
  }, [orderedIds, batchSize, loadBatch]);

  /**
   * Auto-prefetch when approaching the end of loaded questions
   */
  const checkPrefetch = useCallback((currentIndex) => {
    const remaining = loadedCount - currentIndex;
    const hasMore = loadedCount < orderedIds.length;
    
    if (hasMore && remaining <= prefetchThreshold && !isLoadingRef.current) {
      console.log(`🔄 Auto-prefetching next batch (${remaining} questions remaining)`);
      loadMore();
    }
  }, [loadedCount, orderedIds.length, prefetchThreshold, loadMore]);

  // Load initial batch on mount
  useEffect(() => {
    if (enabled && orderedIds.length > 0 && loadedIdsRef.current.size === 0) {
      loadInitialBatch();
    }
  }, [enabled, orderedIds.length, loadInitialBatch]);

  // Progress calculation
  const progress = orderedIds.length > 0 
    ? Math.round((loadedCount / orderedIds.length) * 100) 
    : 0;

  const hasMore = loadedCount < orderedIds.length;

  return {
    questions,
    loading,
    error,
    progress,
    hasMore,
    loadMore,
    checkPrefetch,
    totalCount: orderedIds.length,
    loadedCount
  };
};

export default useQuizQuestions;
