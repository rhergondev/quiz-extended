import { useState, useCallback, useEffect, useMemo } from 'react';
import { getApiConfig, getDefaultHeaders, buildUrl } from '../../api/config/apiConfig.js';

export const useLessons = (options = {}) => {
  const {
    search = '',
    courseId = null,
    lessonType = null,
    autoFetch = true
  } = options;

  const [lessons, setLessons] = useState([]);
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
    search: search || '',
    courseId: courseId || 'all',
    lessonType: lessonType || 'all'
  });

  // Fetch lessons
  const fetchLessons = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const config = getApiConfig();
      const params = new URLSearchParams({
        per_page: pagination.perPage,
        page: reset ? 1 : pagination.currentPage + 1,
        status: 'publish,draft'
      });

      // Agregar filtros
      if (filters.search) params.append('search', filters.search);
      
      // Meta queries para filtros específicos
      const metaQuery = [];
      if (filters.courseId && filters.courseId !== 'all') {
        metaQuery.push({
          key: '_course_id',
          value: filters.courseId,
          compare: '='
        });
      }
      if (filters.lessonType && filters.lessonType !== 'all') {
        metaQuery.push({
          key: '_lesson_type',
          value: filters.lessonType,
          compare: '='
        });
      }

      if (metaQuery.length > 0) {
        params.append('meta_query', JSON.stringify(metaQuery));
      }

      const url = buildUrl(config.endpoints.lessons, params);
      console.log('🔍 Fetching lessons from:', url);

      const response = await fetch(url, {
        headers: getDefaultHeaders(),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const total = parseInt(response.headers.get('X-WP-Total') || '0');
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');

      if (reset) {
        setLessons(data);
        setPagination(prev => ({
          ...prev,
          currentPage: 1,
          total,
          totalPages,
          hasMore: totalPages > 1
        }));
      } else {
        setLessons(prev => [...prev, ...data]);
        setPagination(prev => ({
          ...prev,
          currentPage: prev.currentPage + 1,
          total,
          totalPages,
          hasMore: prev.currentPage + 1 < totalPages
        }));
      }

    } catch (err) {
      console.error('❌ Error fetching lessons:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.perPage, filters]);

  // Create lesson
  const createLesson = useCallback(async (lessonData) => {
    try {
      setCreating(true);
      setError(null);

      const config = getApiConfig();
      
      // Preparar datos para WordPress REST API
      const wpLessonData = {
        title: lessonData.title,
        content: lessonData.content,
        status: lessonData.status || 'draft',
        meta: {
          _course_id: lessonData.courseId,
          _lesson_order: lessonData.lessonOrder,
          _lesson_type: lessonData.lessonType || 'mixed',
          _lesson_description: lessonData.description,
          _prerequisite_lessons: lessonData.prerequisiteLessons,
          _completion_criteria: lessonData.completionCriteria,
          _is_required: lessonData.isRequired ? 'yes' : 'no',
          _lesson_steps: lessonData.steps || []
        }
      };

      console.log('📝 Creating lesson:', wpLessonData);

      const response = await fetch(config.endpoints.lessons, {
        method: 'POST',
        headers: getDefaultHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify(wpLessonData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Refrescar la lista
      await fetchLessons(true);
      
      return data;

    } catch (err) {
      console.error('❌ Error creating lesson:', err);
      setError(err.message);
      throw err;
    } finally {
      setCreating(false);
    }
  }, [fetchLessons]);

  // Update lesson
  const updateLesson = useCallback(async (lessonId, lessonData) => {
    try {
      setUpdating(true);
      setError(null);

      const config = getApiConfig();
      
      const wpLessonData = {
        title: lessonData.title,
        content: lessonData.content,
        status: lessonData.status,
        meta: {
          _course_id: lessonData.courseId,
          _lesson_order: lessonData.lessonOrder,
          _lesson_type: lessonData.lessonType || 'mixed',
          _lesson_description: lessonData.description,
          _prerequisite_lessons: lessonData.prerequisiteLessons,
          _completion_criteria: lessonData.completionCriteria,
          _is_required: lessonData.isRequired ? 'yes' : 'no',
          _lesson_steps: lessonData.steps || []
        }
      };

      const response = await fetch(`${config.endpoints.lessons}/${lessonId}`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify(wpLessonData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Actualizar la lesson en la lista local
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId ? { ...lesson, ...data } : lesson
      ));
      
      return data;

    } catch (err) {
      console.error('❌ Error updating lesson:', err);
      setError(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  // Delete lesson
  const deleteLesson = useCallback(async (lessonId) => {
    try {
      setDeleting(true);
      setError(null);

      const config = getApiConfig();
      const response = await fetch(`${config.endpoints.lessons}/${lessonId}`, {
        method: 'DELETE',
        headers: getDefaultHeaders(),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Remover de la lista local
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      
      return true;

    } catch (err) {
      console.error('❌ Error deleting lesson:', err);
      setError(err.message);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, []);

  // Duplicate lesson
  const duplicateLesson = useCallback(async (lessonId) => {
    try {
      const lessonToDuplicate = lessons.find(l => l.id === lessonId);
      if (!lessonToDuplicate) {
        throw new Error('Lesson not found');
      }

      const duplicatedData = {
        title: `${lessonToDuplicate.title?.rendered || lessonToDuplicate.title} (Copy)`,
        content: lessonToDuplicate.content?.rendered || lessonToDuplicate.content || '',
        courseId: lessonToDuplicate.meta?._course_id,
        lessonType: lessonToDuplicate.meta?._lesson_type,
        description: lessonToDuplicate.meta?._lesson_description,
        steps: lessonToDuplicate.meta?._lesson_steps || [],
        isRequired: lessonToDuplicate.meta?._is_required === 'yes',
        status: 'draft'
      };

      return await createLesson(duplicatedData);

    } catch (err) {
      console.error('❌ Error duplicating lesson:', err);
      throw err;
    }
  }, [lessons, createLesson]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && lessons.length === 0) {
      fetchLessons(true);
    }
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchLessons(true);
    }
  }, [filters]);

  // Computed values
  const computed = useMemo(() => {
    return {
      totalLessons: lessons.length,
      draftLessons: lessons.filter(l => l.status === 'draft').length,
      publishedLessons: lessons.filter(l => l.status === 'publish').length,
      totalSteps: lessons.reduce((sum, lesson) => {
        return sum + (lesson.steps_count || 0);
      }, 0),
      averageStepsPerLesson: lessons.length > 0 
        ? Math.round(lessons.reduce((sum, lesson) => sum + (lesson.steps_count || 0), 0) / lessons.length)
        : 0,
      lessonsByCourse: lessons.reduce((acc, lesson) => {
        const courseId = lesson.meta?._course_id || 'uncategorized';
        acc[courseId] = (acc[courseId] || 0) + 1;
        return acc;
      }, {}),
      lessonsByType: lessons.reduce((acc, lesson) => {
        const type = lesson.meta?._lesson_type || 'mixed';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
  }, [lessons]);

  return {
    lessons,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    fetchLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    duplicateLesson,
    creating,
    updating,
    deleting,
    computed
  };
};