/**
 * useQuestionsAdmin - Hook específico para el Admin QuestionsManager
 * 
 * Este hook usa getQuestionsForAdmin que soporta filtros extendidos
 * (course_id, lessons) sin afectar el funcionamiento del QuizGeneratorPage
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  getQuestionsForAdmin, 
  create, 
  update, 
  deleteFn,
  getOne
} from '../api/services/questionService';
import { formatQuestionForDisplay } from '../api/utils/questionDataUtils';

/**
 * Hook para gestión de preguntas en Admin con filtros extendidos
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.autoFetch - Fetch automático al montar (default: true)
 * @param {number} options.perPage - Items por página (default: 24)
 * @param {number} options.debounceMs - Debounce en ms para búsqueda (default: 300)
 * @returns {Object} Estado y métodos
 */
export const useQuestionsAdmin = (options = {}) => {
  const {
    autoFetch = true,
    perPage = 24,
    debounceMs = 300
  } = options;

  // State
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage,
    hasMore: false
  });
  
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    course_id: null,
    lessons: null,
    category: 'all',
    provider: 'all',
    topic: 'all',
    difficulty: 'all',
    status: 'publish,draft,private'
  });

  // Refs
  const mountedRef = useRef(true);
  const debounceRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Fetch questions
  const fetchQuestions = useCallback(async (reset = true) => {
    try {
      setLoading(true);
      setError(null);

      const page = reset ? 1 : pagination.currentPage;

      // 🔥 course_id NUNCA se envía al API - solo sirve para filtrar lecciones en el UI
      // El filtro real de preguntas se hace solo por lessons

      console.log('🔍 useQuestionsAdmin fetchQuestions:', { 
        page, 
        filters,
        note: 'course_id is UI-only (filters lessons dropdown), only lessons filter goes to API'
      });

      const result = await getQuestionsForAdmin({
        page,
        perPage: pagination.perPage,
        search: filters.search,
        // course_id: NO SE ENVÍA - es solo para filtrar lecciones en el UI
        lessons: filters.lessons,
        category: filters.category,
        provider: filters.provider,
        topic: filters.topic,
        difficulty: filters.difficulty,
        status: filters.status
      });

      if (!mountedRef.current) return;

      // Formatear preguntas para display
      const formattedQuestions = (result.data || []).map(formatQuestionForDisplay);

      if (reset) {
        setQuestions(formattedQuestions);
      } else {
        setQuestions(prev => [...prev, ...formattedQuestions]);
      }

      setPagination({
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        total: result.pagination.total,
        perPage: result.pagination.perPage,
        hasMore: result.pagination.currentPage < result.pagination.totalPages
      });

      console.log('✅ Questions loaded:', formattedQuestions.length);

    } catch (err) {
      if (!mountedRef.current) return;
      console.error('❌ Error fetching questions:', err);
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters, pagination.currentPage, pagination.perPage]);

  // Load more
  const loadMoreQuestions = useCallback(async () => {
    if (!pagination.hasMore || loading) return;

    const nextPage = pagination.currentPage + 1;

    // 🔥 course_id NUNCA se envía al API

    try {
      setLoading(true);

      const result = await getQuestionsForAdmin({
        page: nextPage,
        perPage: pagination.perPage,
        search: filters.search,
        // course_id: NO SE ENVÍA - es solo para filtrar lecciones en el UI
        lessons: filters.lessons,
        category: filters.category,
        provider: filters.provider,
        topic: filters.topic,
        difficulty: filters.difficulty,
        status: filters.status
      });

      if (!mountedRef.current) return;

      const formattedQuestions = (result.data || []).map(formatQuestionForDisplay);
      
      setQuestions(prev => [...prev, ...formattedQuestions]);
      
      setPagination(prev => ({
        ...prev,
        currentPage: nextPage,
        hasMore: nextPage < result.pagination.totalPages
      }));

      console.log('✅ Loaded more questions:', formattedQuestions.length);

    } catch (err) {
      if (!mountedRef.current) return;
      console.error('❌ Error loading more:', err);
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [pagination, loading, filters]);

  // Update filter
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Create question
  const createQuestion = useCallback(async (data) => {
    try {
      setCreating(true);
      const newQuestion = await create(data);
      
      // Obtener la pregunta completa
      const fullQuestion = await getOne(newQuestion.id);
      const formatted = formatQuestionForDisplay(fullQuestion);
      
      setQuestions(prev => [formatted, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      
      return formatted;
    } catch (err) {
      console.error('❌ Error creating question:', err);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // Update question
  const updateQuestion = useCallback(async (id, data) => {
    try {
      setUpdating(true);
      await update(id, data);
      
      // Obtener la pregunta actualizada
      const fullQuestion = await getOne(id);
      const formatted = formatQuestionForDisplay(fullQuestion);
      
      setQuestions(prev => prev.map(q => q.id === id ? formatted : q));
      
      return formatted;
    } catch (err) {
      console.error('❌ Error updating question:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  // Delete question
  const deleteQuestion = useCallback(async (id) => {
    try {
      await deleteFn(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      console.error('❌ Error deleting question:', err);
      throw err;
    }
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    fetchQuestions(true);
  }, [fetchQuestions]);

  // Auto-fetch con debounce cuando cambian los filtros
  useEffect(() => {
    if (!autoFetch && isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    isFirstRenderRef.current = false;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchQuestions(true);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filters, autoFetch, debounceMs]);

  // Computed values
  const computed = useMemo(() => ({
    total: questions.length,
    byDifficulty: {
      easy: questions.filter(q => q.meta?._difficulty_level === 'easy').length,
      medium: questions.filter(q => q.meta?._difficulty_level === 'medium').length,
      hard: questions.filter(q => q.meta?._difficulty_level === 'hard').length
    }
  }), [questions]);

  return {
    // Data
    questions,
    loading,
    creating,
    updating,
    error,
    pagination,
    computed,
    
    // Filters
    filters,
    updateFilter,
    setFilters,
    
    // Actions
    fetchQuestions,
    loadMoreQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    refresh,
    
    // Helpers
    hasMore: pagination.hasMore
  };
};

export default useQuestionsAdmin;
