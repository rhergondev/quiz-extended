/**
 * useQuizQuestions Hook
 * 
 * Paginated hook for loading quiz questions
 * Uses standard WordPress REST pagination instead of include parameter
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to load quiz questions with pagination
 * 🔥 NEW: Uses proper REST API pagination (page 1, page 2, etc.)
 * Works reliably with WordPress pagination limits
 * 
 * @param {number[]} questionIds - Array of all question IDs in the quiz
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Enable auto-fetch (default: true)
 * @param {number} options.questionsPerPage - Questions per page (default: 50)
 * @param {number} options.prefetchThreshold - Load next page when this many questions remain (default: 5)
 * @param {boolean} options.randomize - Randomize question order (default: false)
 * @returns {Object} { questions, loading, error, progress, hasMore, loadMore }
 */
export const useQuizQuestions = (questionIds, options = {}) => {
  const {
    enabled = true,
    questionsPerPage = 50, // 🔥 50 questions per page
    prefetchThreshold = 5,
    randomize = false
  } = options;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  
  // Use ref to track loading state to prevent duplicate requests
  const isLoadingRef = useRef(false);

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
   * Load a page of questions using WordPress REST pagination
   */
  const loadPage = useCallback(async (pageNumber) => {
    if (isLoadingRef.current) {
      console.log('⏸️ Already loading, skipping duplicate request');
      return [];
    }

    const startIndex = (pageNumber - 1) * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, orderedIds.length);
    const idsToLoad = orderedIds.slice(startIndex, endIndex);
    
    if (idsToLoad.length === 0) {
      console.log('✅ No more questions to load');
      return [];
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log(`📥 Loading page ${pageNumber} (${idsToLoad.length} questions, IDs: ${startIndex + 1}-${endIndex})`);
      
      // Fetch questions using standard WordPress REST pagination
      const config = window.qe_data || {};
      if (!config.endpoints || !config.endpoints.questions) {
        throw new Error('Questions endpoint not configured');
      }

      const endpoint = config.endpoints.questions;
      
      // Only use context=edit for administrators, view for everyone else
      const isAdmin = window.qe_data?.user?.roles?.includes('administrator') || false;
      
      const params = new URLSearchParams({
        include: idsToLoad.join(','),
        per_page: questionsPerPage.toString(),
        page: '1', // We're already slicing by our own logic, so always page 1
        orderby: 'include', // Maintain order
        context: isAdmin ? 'edit' : 'view' // edit only for admins
      });

      const url = `${endpoint}?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      const loadedQuestions = await response.json();
      
      // Append to existing questions
      setQuestions(prev => [...prev, ...loadedQuestions]);
      setLoadedCount(prev => prev + loadedQuestions.length);
      setCurrentPage(pageNumber);
      
      console.log(`✅ Loaded page ${pageNumber}: ${loadedQuestions.length} questions. Total: ${loadedCount + loadedQuestions.length}/${orderedIds.length}`);
      
      return loadedQuestions;
    } catch (err) {
      console.error('❌ Error loading question page:', err);
      setError(err.message || 'Failed to load questions');
      return [];
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [orderedIds, questionsPerPage, loadedCount]);

  /**
   * Load initial page
   */
  const loadInitialPage = useCallback(async () => {
    if (!enabled || orderedIds.length === 0 || currentPage > 0) return;
    
    console.log(`🚀 Loading initial page (${questionsPerPage} questions)...`);
    await loadPage(1);
  }, [enabled, orderedIds.length, currentPage, questionsPerPage, loadPage]);

  /**
   * Load next page
   */
  const loadMore = useCallback(async () => {
    if (loadedCount >= orderedIds.length) {
      console.log('✅ All questions already loaded');
      return;
    }

    const nextPage = currentPage + 1;
    console.log(`📥 Loading page ${nextPage}... (${loadedCount}/${orderedIds.length} loaded)`);
    await loadPage(nextPage);
  }, [orderedIds.length, currentPage, loadedCount, loadPage]);

  /**
   * Auto-prefetch when approaching the end of loaded questions
   */
  const checkPrefetch = useCallback((currentIndex) => {
    const remaining = loadedCount - currentIndex;
    const hasMore = loadedCount < orderedIds.length;
    
    if (hasMore && remaining <= prefetchThreshold && !isLoadingRef.current) {
      console.log(`🔄 Auto-prefetching next page (${remaining} questions remaining)`);
      loadMore();
    }
  }, [loadedCount, orderedIds.length, prefetchThreshold, loadMore]);

  // Load initial page on mount
  useEffect(() => {
    if (enabled && orderedIds.length > 0 && currentPage === 0) {
      loadInitialPage();
    }
  }, [enabled, orderedIds.length, currentPage, loadInitialPage]);

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
    loadedCount,
    currentPage
  };
};

export default useQuizQuestions;
