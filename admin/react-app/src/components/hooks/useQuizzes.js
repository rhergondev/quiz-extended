import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiConfig } from '../../api/config/apiConfig.js';

/**
 * Custom hook for quiz management
 * FIXED VERSION - Added proper debouncing to prevent unlimited API calls
 */
export const useQuizzes = (options = {}) => {
  const { 
    courseId = null,
    difficulty = null,
    category = null,
    search = '',
    autoFetch = true,
    initialFilters = {},
    debounceMs = 500 // Debounce delay for search and filters
  } = options;

  // --- STATE ---
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 20
  });
  const [hasMore, setHasMore] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    search: search || '',
    courseId: courseId,
    difficulty: difficulty,
    category: category,
    status: 'publish,draft,private',
    ...initialFilters
  });

  // Refs para evitar re-renders innecesarios
  const currentFiltersRef = useRef(filters);
  const optionsRef = useRef(options);
  const debounceTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const lastFetchParamsRef = useRef('');

  // Update refs when values change
  useEffect(() => {
    currentFiltersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // --- API FUNCTIONS ---
  const makeApiRequest = async (url, requestOptions = {}) => {
    try {
      const config = getApiConfig();
      
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
        ...requestOptions
      };

      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorData}`);
      }

      return response;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  };

  // --- FETCH QUIZZES WITH DUPLICATE PREVENTION ---
  const fetchQuizzes = useCallback(async (fetchOptions = {}) => {
    const { 
      reset = false,
      page = 1,
      additionalFilters = {}
    } = fetchOptions;

    try {
      if (reset) {
        setLoading(true);
        setError(null);
      }

      const config = getApiConfig();
      const currentFilters = currentFiltersRef.current;
      
      // Build query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        status: currentFilters.status || 'publish,draft',
        _embed: 'true'
      });

      // Add search
      if (currentFilters.search) {
        queryParams.append('search', currentFilters.search);
      }

      // Add course filter
      if (currentFilters.courseId) {
        queryParams.append('meta_query[0][key]', '_course_id');
        queryParams.append('meta_query[0][value]', currentFilters.courseId.toString());
        queryParams.append('meta_query[0][compare]', '=');
      }

      // Add difficulty filter
      if (currentFilters.difficulty) {
        const diffIndex = currentFilters.courseId ? 1 : 0;
        queryParams.append(`meta_query[${diffIndex}][key]`, '_difficulty_level');
        queryParams.append(`meta_query[${diffIndex}][value]`, currentFilters.difficulty);
        queryParams.append(`meta_query[${diffIndex}][compare]`, '=');
      }

      // Add category filter
      if (currentFilters.category) {
        const catIndex = (currentFilters.courseId ? 1 : 0) + (currentFilters.difficulty ? 1 : 0);
        queryParams.append(`meta_query[${catIndex}][key]`, '_quiz_category');
        queryParams.append(`meta_query[${catIndex}][value]`, currentFilters.category);
        queryParams.append(`meta_query[${catIndex}][compare]`, '=');
      }

      // Set meta query relation if multiple filters
      const filterCount = [currentFilters.courseId, currentFilters.difficulty, currentFilters.category].filter(Boolean).length;
      if (filterCount > 1) {
        queryParams.append('meta_query[relation]', 'AND');
      }

      // Add additional filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${config.endpoints.quizzes}?${queryParams}`;
      
      // 🔥 PREVENT DUPLICATE REQUESTS
      const currentRequestParams = `${url}-${page}-${reset}`;
      if (currentRequestParams === lastFetchParamsRef.current) {
        console.log('🚫 Duplicate request prevented:', url);
        return;
      }
      lastFetchParamsRef.current = currentRequestParams;

      console.log('🚀 Fetching quizzes:', url);

      const response = await makeApiRequest(url);
      const data = await response.json();

      // Check if component is still mounted
      if (!mountedRef.current) return;

      // Extract pagination from headers
      const totalHeader = response.headers.get('X-WP-Total');
      const totalPagesHeader = response.headers.get('X-WP-TotalPages');
      
      const newPagination = {
        currentPage: page,
        totalPages: totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1,
        total: totalHeader ? parseInt(totalHeader, 10) : data.length,
        perPage: 20
      };

      setPagination(newPagination);
      setHasMore(page < newPagination.totalPages);

      if (reset || page === 1) {
        setQuizzes(data);
      } else {
        setQuizzes(prevQuizzes => {
          const existingIds = new Set(prevQuizzes.map(q => q.id));
          const newQuizzes = data.filter(q => !existingIds.has(q.id));
          return [...prevQuizzes, ...newQuizzes];
        });
      }

      console.log('✅ Quizzes loaded:', data.length);
      
    } catch (err) {
      console.error('❌ Error fetching quizzes:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch quizzes');
        
        if (reset || page === 1) {
          setQuizzes([]);
          setPagination({ currentPage: 1, totalPages: 1, total: 0, perPage: 20 });
          setHasMore(false);
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // --- DEBOUNCED FETCH FUNCTION ---
  const debouncedFetch = useCallback((fetchOptions = {}) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchQuizzes({ reset: true, ...fetchOptions });
      }
    }, debounceMs);
  }, [fetchQuizzes, debounceMs]);

  // --- INITIAL LOAD (NO DEBOUNCE) ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🎯 Initial quiz load');
      fetchQuizzes({ reset: true });
    }
  }, []); // Only run on mount

  // --- UPDATE FILTERS (NO FETCH YET) ---
  useEffect(() => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        search: search || '',
        courseId: courseId,
        difficulty: difficulty,
        category: category
      };
      
      // Only update if something actually changed
      if (JSON.stringify(newFilters) !== JSON.stringify(prev)) {
        return newFilters;
      }
      return prev;
    });
  }, [search, courseId, difficulty, category]);

  // --- DEBOUNCED REFETCH WHEN FILTERS CHANGE ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🔄 Filters changed, debouncing fetch...');
      debouncedFetch();
    }
  }, [filters, debouncedFetch, autoFetch]);

  // --- CREATE QUIZ ---
  const createQuiz = useCallback(async (quizData) => {
    try {
      setCreating(true);
      setError(null);
      
      const config = getApiConfig();
      
      // Transform data for API
      const apiData = {
        title: quizData.title || '',
        content: quizData.content || '',
        excerpt: quizData.excerpt || '',
        status: quizData.status || 'draft',
        meta: {
          _course_id: quizData.courseId || '',
          _difficulty_level: quizData.difficulty || 'medium',
          _quiz_category: quizData.category || '',
          _time_limit: quizData.timeLimit || '0',
          _max_attempts: quizData.maxAttempts || '0',
          _passing_score: quizData.passingScore || '70',
          _randomize_questions: quizData.randomizeQuestions ? 'yes' : 'no',
          _show_results: quizData.showResults ? 'yes' : 'no',
          _quiz_question_ids: quizData.questionIds || [],
          ...quizData.meta
        }
      };

      console.log('🚀 Creating quiz:', apiData);

      const response = await makeApiRequest(config.endpoints.quizzes, {
        method: 'POST',
        body: JSON.stringify(apiData)
      });

      const newQuiz = await response.json();
      
      // Add to quizzes list
      setQuizzes(prev => [newQuiz, ...prev]);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      console.log('✅ Quiz created:', newQuiz);
      return newQuiz;
      
    } catch (err) {
      console.error('❌ Error creating quiz:', err);
      setError(err.message || 'Failed to create quiz');
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // --- DELETE QUIZ ---
  const deleteQuiz = useCallback(async (quizId) => {
    try {
      setError(null);
      
      const config = getApiConfig();
      
      console.log('🗑️ Deleting quiz:', quizId);

      await makeApiRequest(`${config.endpoints.quizzes}/${quizId}`, {
        method: 'DELETE'
      });

      // Remove from quizzes list
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

      console.log('✅ Quiz deleted');
      
    } catch (err) {
      console.error('❌ Error deleting quiz:', err);
      setError(err.message || 'Failed to delete quiz');
      throw err;
    }
  }, []);

  // --- DUPLICATE QUIZ ---
  const duplicateQuiz = useCallback(async (quizId) => {
    try {
      setError(null);
      
      // Find the original quiz
      const originalQuiz = quizzes.find(q => q.id === quizId);
      if (!originalQuiz) {
        throw new Error('Quiz not found');
      }

      // Create duplicate data
      const duplicateData = {
        title: `${originalQuiz.title?.rendered || originalQuiz.title} (Copy)`,
        content: originalQuiz.content?.rendered || originalQuiz.content || '',
        excerpt: originalQuiz.excerpt?.rendered || originalQuiz.excerpt || '',
        status: 'draft',
        courseId: originalQuiz.meta?._course_id,
        difficulty: originalQuiz.meta?._difficulty_level,
        category: originalQuiz.meta?._quiz_category,
        timeLimit: originalQuiz.meta?._time_limit,
        maxAttempts: originalQuiz.meta?._max_attempts,
        passingScore: originalQuiz.meta?._passing_score,
        randomizeQuestions: originalQuiz.meta?._randomize_questions === 'yes',
        showResults: originalQuiz.meta?._show_results === 'yes',
        questionIds: originalQuiz.meta?._quiz_question_ids || [],
        meta: originalQuiz.meta
      };

      console.log('📋 Duplicating quiz:', quizId);
      
      return await createQuiz(duplicateData);
      
    } catch (err) {
      console.error('❌ Error duplicating quiz:', err);
      setError(err.message || 'Failed to duplicate quiz');
      throw err;
    }
  }, [quizzes, createQuiz]);

  // --- PAGINATION ---
  const loadMoreQuizzes = useCallback(() => {
    if (hasMore && !loading) {
      fetchQuizzes({ 
        page: pagination.currentPage + 1,
        reset: false 
      });
    }
  }, [hasMore, loading, pagination.currentPage, fetchQuizzes]);

  const refreshQuizzes = useCallback(() => {
    lastFetchParamsRef.current = ''; // Reset duplicate prevention
    fetchQuizzes({ reset: true });
  }, [fetchQuizzes]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    return {
      totalQuizzes: quizzes.length,
      publishedQuizzes: quizzes.filter(q => q.status === 'publish').length,
      draftQuizzes: quizzes.filter(q => q.status === 'draft').length,
      privateQuizzes: quizzes.filter(q => q.status === 'private').length,
      quizzesByDifficulty: quizzes.reduce((acc, quiz) => {
        const difficulty = quiz.meta?._difficulty_level || 'medium';
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
      }, {}),
      quizzesByCategory: quizzes.reduce((acc, quiz) => {
        const category = quiz.meta?._quiz_category || 'assessment';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
      averageTimeLimit: quizzes.length > 0 ? 
        Math.round(quizzes.reduce((sum, quiz) => {
          return sum + parseInt(quiz.meta?._time_limit || '0');
        }, 0) / quizzes.length) : 0,
      averagePassingScore: quizzes.length > 0 ? 
        Math.round(quizzes.reduce((sum, quiz) => {
          return sum + parseInt(quiz.meta?._passing_score || '70');
        }, 0) / quizzes.length) : 70,
      quizzesWithTimeLimit: quizzes.filter(quiz => 
        parseInt(quiz.meta?._time_limit || '0') > 0
      ).length,
      quizzesWithRandomization: quizzes.filter(quiz => 
        quiz.meta?._randomize_questions === 'yes'
      ).length,
      totalAttempts: 0, // Este valor vendría de la API en una implementación real
      performanceScore: 0 // Este valor vendría de la API en una implementación real
    };
  }, [quizzes]);

  return {
    // Data
    quizzes,
    loading,
    creating,
    error,
    pagination,
    hasMore,
    filters,
    computed,

    // Methods
    createQuiz,
    deleteQuiz,
    duplicateQuiz,
    refreshQuizzes,
    loadMoreQuizzes,
    fetchQuizzes: debouncedFetch // Export debounced version
  };
};

export default useQuizzes;