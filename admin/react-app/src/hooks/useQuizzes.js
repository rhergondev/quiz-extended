// admin/react-app/src/components/hooks/useQuizzes.js

import { useState, useCallback, useEffect, useMemo } from 'react';
import { getApiConfig, getDefaultHeaders, buildUrl } from '../../api/config/apiConfig';

export const useQuizzes = (autoFetch = true) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 20,
    hasMore: false
  });

  const [filters, setFilters] = useState({
    search: '',
    courseId: 'all',
    difficulty: 'all',
    category: 'all',
    quizType: 'all'
  });

  // Fetch quizzes
  const fetchQuizzes = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const config = getApiConfig();
      const page = reset ? 1 : pagination.currentPage + 1;

      // Build query parameters
      const params = {
        per_page: pagination.perPage,
        page: page,
        _embed: true // Para obtener datos relacionados si es necesario
      };

      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.courseId && filters.courseId !== 'all') {
        params.course_id = filters.courseId;
      }
      if (filters.difficulty && filters.difficulty !== 'all') {
        params.difficulty = filters.difficulty;
      }
      if (filters.category && filters.category !== 'all') {
        params.category = filters.category;
      }
      if (filters.quizType && filters.quizType !== 'all') {
        params.quiz_type = filters.quizType;
      }

      const url = buildUrl(config.endpoints.quizzes, params);

      console.log('🔍 Fetching quizzes from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: getDefaultHeaders(),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      const total = parseInt(response.headers.get('X-WP-Total') || '0');

      setQuizzes(prev => reset ? data : [...prev, ...data]);
      setPagination({
        currentPage: page,
        totalPages,
        total,
        perPage: pagination.perPage,
        hasMore: page < totalPages
      });

      console.log(`✅ Loaded ${data.length} quizzes (page ${page}/${totalPages})`);

    } catch (err) {
      console.error('❌ Error fetching quizzes:', err);
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.perPage, filters]);

  // Create quiz
  const createQuiz = useCallback(async (quizData) => {
    try {
      setCreating(true);
      setError(null);

      const config = getApiConfig();

      const apiData = {
        title: quizData.title || '',
        content: quizData.instructions || '',
        status: quizData.status || 'publish',
        meta: {
          _course_id: quizData.courseId || '',
          _difficulty_level: quizData.difficulty || 'medium',
          _quiz_category: quizData.category || '',
          _time_limit: quizData.timeLimit || '',
          _max_attempts: quizData.maxAttempts || '',
          _passing_score: quizData.passingScore || '50',
          _randomize_questions: quizData.randomizeQuestions ? 'yes' : 'no',
          _show_results: quizData.showResults ? 'yes' : 'no',
          _quiz_question_ids: quizData.questionIds || [],
          _quiz_instructions: quizData.instructions || '',
          _quiz_type: quizData.quizType || 'assessment',
          _enable_negative_scoring: quizData.enableNegativeScoring || false,
        }
      };

      console.log('🚀 Creating quiz with payload:', apiData);

      const response = await fetch(config.endpoints.quizzes, {
        method: 'POST',
        headers: getDefaultHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const newQuiz = await response.json();

      setQuizzes(prev => [newQuiz, ...prev]);

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

  // Update quiz
  const updateQuiz = useCallback(async (quizId, quizData) => {
    try {
      setUpdating(true);
      setError(null);

      const config = getApiConfig();

      const apiData = {
        title: quizData.title || '',
        content: quizData.instructions || '',
        status: quizData.status || 'publish',
        meta: {
          _course_id: quizData.courseId || '',
          _difficulty_level: quizData.difficulty || 'medium',
          _quiz_category: quizData.category || '',
          _time_limit: quizData.timeLimit || '',
          _max_attempts: quizData.maxAttempts || '',
          _passing_score: quizData.passingScore || '50',
          _randomize_questions: quizData.randomizeQuestions ? 'yes' : 'no',
          _show_results: quizData.showResults ? 'yes' : 'no',
          _quiz_question_ids: quizData.questionIds || [],
          _quiz_instructions: quizData.instructions || '',
          _quiz_type: quizData.quizType || 'assessment',
          _enable_negative_scoring: quizData.enableNegativeScoring || false,
        }
      };

      console.log(`🚀 Updating quiz ${quizId} with payload:`, apiData);

      const response = await fetch(`${config.endpoints.quizzes}/${quizId}`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const updatedQuiz = await response.json();

      setQuizzes(prev =>
        prev.map(q => (q.id === quizId ? updatedQuiz : q))
      );

      console.log('✅ Quiz updated:', updatedQuiz);
      return updatedQuiz;

    } catch (err) {
      console.error('❌ Error updating quiz:', err);
      setError(err.message || 'Failed to update quiz');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  // Delete quiz
  const deleteQuiz = useCallback(async (quizId) => {
    try {
      setDeleting(true);
      setError(null);

      const config = getApiConfig();

      console.log(`🗑️ Deleting quiz ${quizId}`);

      const response = await fetch(`${config.endpoints.quizzes}/${quizId}`, {
        method: 'DELETE',
        headers: getDefaultHeaders(),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setQuizzes(prev => prev.filter(q => q.id !== quizId));

      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));

      console.log('✅ Quiz deleted');

    } catch (err) {
      console.error('❌ Error deleting quiz:', err);
      setError(err.message || 'Failed to delete quiz');
      throw err;
    } finally {
      setDeleting(false);
    }
  }, []);

  // Duplicate quiz
  const duplicateQuiz = useCallback(async (quizId) => {
    try {
      setCreating(true);
      setError(null);

      const quizToDuplicate = quizzes.find(q => q.id === quizId);
      if (!quizToDuplicate) {
        throw new Error('Quiz not found');
      }

      const duplicatedData = {
        title: `${quizToDuplicate.title?.rendered || quizToDuplicate.title} (Copy)`,
        instructions: quizToDuplicate.content?.rendered || quizToDuplicate.content || '',
        courseId: quizToDuplicate.meta?._course_id || '',
        difficulty: quizToDuplicate.meta?._difficulty_level || 'medium',
        category: quizToDuplicate.meta?._quiz_category || '',
        timeLimit: quizToDuplicate.meta?._time_limit || '',
        maxAttempts: quizToDuplicate.meta?._max_attempts || '',
        passingScore: quizToDuplicate.meta?._passing_score || '50',
        randomizeQuestions: quizToDuplicate.meta?._randomize_questions === 'yes',
        showResults: quizToDuplicate.meta?._show_results === 'yes',
        questionIds: quizToDuplicate.meta?._quiz_question_ids || [],
        quizType: quizToDuplicate.meta?._quiz_type || 'assessment',
        enableNegativeScoring: quizToDuplicate.meta?._enable_negative_scoring || false,
      };

      const newQuiz = await createQuiz(duplicatedData);
      console.log('✅ Quiz duplicated');
      return newQuiz;

    } catch (err) {
      console.error('❌ Error duplicating quiz:', err);
      setError(err.message || 'Failed to duplicate quiz');
      throw err;
    }
  }, [quizzes, createQuiz]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && quizzes.length === 0) {
      fetchQuizzes(true);
    }
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (autoFetch) {
      const timeoutId = setTimeout(() => {
        fetchQuizzes(true);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [filters]);

  const computed = useMemo(() => {
    return {
      totalQuizzes: quizzes.length,
      publishedQuizzes: quizzes.filter(q => q.status === 'publish').length,
      draftQuizzes: quizzes.filter(q => q.status === 'draft').length,
      privateQuizzes: quizzes.filter(q => q.status === 'private').length,
      totalAttempts: quizzes.reduce((sum, quiz) => sum + (quiz.total_attempts || 0), 0),
      totalQuestions: quizzes.reduce((sum, quiz) => {
        const questionCount = quiz.questions_count || quiz.meta?._quiz_question_ids?.length || 0;
        return sum + questionCount;
      }, 0),
      quizzesByDifficulty: quizzes.reduce((acc, quiz) => {
        const difficulty = quiz.meta?._difficulty_level || 'medium';
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
      }, {}),
      quizzesByCategory: quizzes.reduce((acc, quiz) => {
        const category = quiz.meta?._quiz_category || 'uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
      quizzesByType: quizzes.reduce((acc, quiz) => {
        const type = quiz.meta?._quiz_type || 'assessment';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
  }, [quizzes]);

  return {
    quizzes,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    fetchQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    duplicateQuiz,
    creating,
    updating,
    deleting,
    computed
  };
};