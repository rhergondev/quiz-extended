import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiConfig } from '../../api/config/apiConfig.js';

/**
 * Custom hook for question management
 * FIXED VERSION - Added proper debouncing to prevent unlimited API calls
 */
export const useQuestions = (options = {}) => {
  const { 
    quizId = null,
    type = null,
    difficulty = null,
    category = null,
    search = '',
    autoFetch = true,
    initialFilters = {},
    debounceMs = 500 // Debounce delay for search and filters
  } = options;

  // --- STATE ---
  const [questions, setQuestions] = useState([]);
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
    quizId: quizId,
    type: type,
    difficulty: difficulty,
    category: category,
    status: 'publish,draft,private',
    ...initialFilters
  });

  // Refs para evitar re-renders innecesarios y duplicados
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

  // --- FETCH QUESTIONS WITH DUPLICATE PREVENTION ---
  const fetchQuestions = useCallback(async (fetchOptions = {}) => {
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
        orderby: 'date',
        order: 'desc',
        _embed: 'true'
      });

      // Add search
      if (currentFilters.search) {
        queryParams.append('search', currentFilters.search);
      }

      // Add quiz filter
      if (currentFilters.quizId) {
        queryParams.append('meta_query[0][key]', '_quiz_id');
        queryParams.append('meta_query[0][value]', currentFilters.quizId.toString());
        queryParams.append('meta_query[0][compare]', '=');
        queryParams.append('meta_query[0][type]', 'NUMERIC');
      }

      // Add question type filter
      if (currentFilters.type) {
        const typeIndex = currentFilters.quizId ? 1 : 0;
        queryParams.append(`meta_query[${typeIndex}][key]`, '_question_type');
        queryParams.append(`meta_query[${typeIndex}][value]`, currentFilters.type);
        queryParams.append(`meta_query[${typeIndex}][compare]`, '=');
      }

      // Add difficulty filter
      if (currentFilters.difficulty) {
        const diffIndex = (currentFilters.quizId ? 1 : 0) + (currentFilters.type ? 1 : 0);
        queryParams.append(`meta_query[${diffIndex}][key]`, '_difficulty_level');
        queryParams.append(`meta_query[${diffIndex}][value]`, currentFilters.difficulty);
        queryParams.append(`meta_query[${diffIndex}][compare]`, '=');
      }

      // Add category filter
      if (currentFilters.category) {
        const catIndex = (currentFilters.quizId ? 1 : 0) + (currentFilters.type ? 1 : 0) + (currentFilters.difficulty ? 1 : 0);
        queryParams.append(`meta_query[${catIndex}][key]`, '_question_category');
        queryParams.append(`meta_query[${catIndex}][value]`, currentFilters.category);
        queryParams.append(`meta_query[${catIndex}][compare]`, '=');
      }

      // Set meta query relation if multiple filters
      const filterCount = [currentFilters.quizId, currentFilters.type, currentFilters.difficulty, currentFilters.category].filter(Boolean).length;
      if (filterCount > 1) {
        queryParams.append('meta_query[relation]', 'AND');
      }

      // Add additional filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${config.endpoints.questions}?${queryParams}`;
      
      // 🔥 PREVENT DUPLICATE REQUESTS
      const currentRequestParams = `${url}-${page}-${reset}`;
      if (currentRequestParams === lastFetchParamsRef.current) {
        console.log('🚫 Duplicate question request prevented:', url);
        return;
      }
      lastFetchParamsRef.current = currentRequestParams;

      console.log('🚀 Fetching questions:', url);

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
        setQuestions(data);
      } else {
        setQuestions(prevQuestions => {
          const existingIds = new Set(prevQuestions.map(q => q.id));
          const newQuestions = data.filter(q => !existingIds.has(q.id));
          return [...prevQuestions, ...newQuestions];
        });
      }

      console.log('✅ Questions loaded:', data.length);
      
    } catch (err) {
      console.error('❌ Error fetching questions:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch questions');
        
        if (reset || page === 1) {
          setQuestions([]);
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
        fetchQuestions({ reset: true, ...fetchOptions });
      }
    }, debounceMs);
  }, [fetchQuestions, debounceMs]);

  // --- INITIAL LOAD (NO DEBOUNCE) ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🎯 Initial question load');
      fetchQuestions({ reset: true });
    }
  }, []); // Only run on mount

  // --- UPDATE FILTERS (NO FETCH YET) ---
  useEffect(() => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        search: search || '',
        quizId: quizId,
        type: type,
        difficulty: difficulty,
        category: category
      };
      
      // Only update if something actually changed
      if (JSON.stringify(newFilters) !== JSON.stringify(prev)) {
        return newFilters;
      }
      return prev;
    });
  }, [search, quizId, type, difficulty, category]);

  // --- DEBOUNCED REFETCH WHEN FILTERS CHANGE ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🔄 Question filters changed, debouncing fetch...');
      debouncedFetch();
    }
  }, [filters, debouncedFetch, autoFetch]);

  // --- CREATE QUESTION ---
  const createQuestion = useCallback(async (questionData) => {
    try {
      setCreating(true);
      setError(null);
      
      const config = getApiConfig();
      
      // Transform data for API
      const apiData = {
        title: questionData.title || '',
        content: questionData.content || '',
        excerpt: questionData.excerpt || '',
        status: questionData.status || 'draft',
        meta: {
          _quiz_id: questionData.quizId || '',
          _question_type: questionData.type || 'multiple_choice',
          _difficulty_level: questionData.difficulty || 'medium',
          _question_category: questionData.category || '',
          _points: questionData.points || '1',
          _time_limit: questionData.timeLimit || '0',
          _question_options: questionData.options || [],
          _correct_answer: questionData.correctAnswer || '',
          _explanation: questionData.explanation || '',
          _question_order: questionData.questionOrder || '1',
          ...questionData.meta
        }
      };

      console.log('🚀 Creating question:', apiData);

      const response = await makeApiRequest(config.endpoints.questions, {
        method: 'POST',
        body: JSON.stringify(apiData)
      });

      const newQuestion = await response.json();
      
      // Add to questions list
      setQuestions(prev => [newQuestion, ...prev]);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      console.log('✅ Question created:', newQuestion);
      return newQuestion;
      
    } catch (err) {
      console.error('❌ Error creating question:', err);
      setError(err.message || 'Failed to create question');
      throw err;
    } finally {
      setCreating(false);
    }
  }, [makeApiRequest]);

  // --- DELETE QUESTION ---
  const deleteQuestion = useCallback(async (questionId) => {
    try {
      setError(null);
      
      const config = getApiConfig();
      
      console.log('🗑️ Deleting question:', questionId);

      await makeApiRequest(`${config.endpoints.questions}/${questionId}`, {
        method: 'DELETE'
      });

      // Remove from questions list
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

      console.log('✅ Question deleted');
      
    } catch (err) {
      console.error('❌ Error deleting question:', err);
      setError(err.message || 'Failed to delete question');
      throw err;
    }
  }, []);

  // --- DUPLICATE QUESTION ---
  const duplicateQuestion = useCallback(async (questionId) => {
    try {
      setError(null);
      
      // Find the original question
      const originalQuestion = questions.find(q => q.id === questionId);
      if (!originalQuestion) {
        throw new Error('Question not found');
      }

      // Create duplicate data
      const duplicateData = {
        title: `${originalQuestion.title?.rendered || originalQuestion.title} (Copy)`,
        content: originalQuestion.content?.rendered || originalQuestion.content || '',
        excerpt: originalQuestion.excerpt?.rendered || originalQuestion.excerpt || '',
        status: 'draft',
        quizId: originalQuestion.meta?._quiz_id,
        type: originalQuestion.meta?._question_type,
        difficulty: originalQuestion.meta?._difficulty_level,
        category: originalQuestion.meta?._question_category,
        points: originalQuestion.meta?._points,
        timeLimit: originalQuestion.meta?._time_limit,
        options: originalQuestion.meta?._question_options,
        correctAnswer: originalQuestion.meta?._correct_answer,
        explanation: originalQuestion.meta?._explanation,
        questionOrder: originalQuestion.meta?._question_order,
        meta: originalQuestion.meta
      };

      console.log('📋 Duplicating question:', questionId);
      
      return await createQuestion(duplicateData);
      
    } catch (err) {
      console.error('❌ Error duplicating question:', err);
      setError(err.message || 'Failed to duplicate question');
      throw err;
    }
  }, [questions, createQuestion]);

  // --- PAGINATION ---
  const loadMoreQuestions = useCallback(() => {
    if (hasMore && !loading) {
      fetchQuestions({ 
        page: pagination.currentPage + 1,
        reset: false 
      });
    }
  }, [hasMore, loading, pagination.currentPage, fetchQuestions]);

  const refreshQuestions = useCallback(() => {
    lastFetchParamsRef.current = ''; // Reset duplicate prevention
    fetchQuestions({ reset: true });
  }, [fetchQuestions]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    return {
      totalQuestions: questions.length,
      publishedQuestions: questions.filter(q => q.status === 'publish').length,
      draftQuestions: questions.filter(q => q.status === 'draft').length,
      privateQuestions: questions.filter(q => q.status === 'private').length,
      questionsByType: questions.reduce((acc, question) => {
        const type = question.meta?._question_type || 'multiple_choice';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      questionsByDifficulty: questions.reduce((acc, question) => {
        const difficulty = question.meta?._difficulty_level || 'medium';
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
      }, {}),
      questionsByCategory: questions.reduce((acc, question) => {
        const category = question.meta?._question_category || 'general';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
      averagePoints: questions.length > 0 ? 
        Math.round(questions.reduce((sum, question) => {
          return sum + parseInt(question.meta?._points || '1');
        }, 0) / questions.length) : 1,
      totalPoints: questions.reduce((sum, question) => {
        return sum + parseInt(question.meta?._points || '1');
      }, 0),
      questionsWithTimeLimit: questions.filter(question => 
        parseInt(question.meta?._time_limit || '0') > 0
      ).length,
      questionsWithExplanation: questions.filter(question => 
        question.meta?._explanation && question.meta._explanation.trim() !== ''
      ).length,
      multipleChoiceQuestions: questions.filter(question => 
        question.meta?._question_type === 'multiple_choice'
      ).length,
      trueFalseQuestions: questions.filter(question => 
        question.meta?._question_type === 'true_false'
      ).length,
      essayQuestions: questions.filter(question => 
        question.meta?._question_type === 'essay'
      ).length
    };
  }, [questions]);

  return {
    // Data
    questions,
    loading,
    creating,
    error,
    pagination,
    hasMore,
    filters,
    computed,

    // Methods
    createQuestion,
    deleteQuestion,
    duplicateQuestion,
    refreshQuestions,
    loadMoreQuestions,
    fetchQuestions: debouncedFetch // Export debounced version
  };
};

export default useQuestions;