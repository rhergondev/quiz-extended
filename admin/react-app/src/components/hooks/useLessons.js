import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  getLessons, 
  getLessonsByCourse, 
  createLesson as createLessonAPI, 
  deleteLesson as deleteLessonAPI,
  duplicateLesson as duplicateLessonAPI 
} from '../../api/services/lessonService.js';

/**
 * Custom hook for lesson management - FIXED VERSION
 * Provides lesson state and operations with filtering and pagination
 * Fixed course filtering issue
 */
export const useLessons = (options = {}) => {
  const { 
    courseId = null, 
    autoFetch = true,
    initialFilters = {}
  } = options;

  // --- STATE ---
  const [lessons, setLessons] = useState([]);
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
    search: '',
    status: 'publish,draft,private',
    lessonType: '',
    contentType: '',
    ...initialFilters
  });

  // Refs para evitar re-renders innecesarios
  const currentFiltersRef = useRef(filters);
  const isInitialLoadRef = useRef(true);

  // Update filters ref when filters change
  useEffect(() => {
    currentFiltersRef.current = filters;
  }, [filters]);

  // --- FETCH LESSONS - FIXED VERSION ---
  const fetchLessons = useCallback(async (options = {}) => {
    const { 
      reset = false,
      page = 1,
      additionalFilters = {}
    } = options;

    try {
      if (reset) {
        setLoading(true);
        setError(null);
      }

      console.log('Fetching lessons with courseId:', courseId);
      console.log('Current filters:', currentFiltersRef.current);

      // FIX: Mejorar la conversión y validación del courseId
      let validCourseId = null;
      if (courseId !== null && courseId !== undefined) {
        const numericCourseId = parseInt(courseId, 10);
        if (Number.isInteger(numericCourseId) && numericCourseId > 0) {
          validCourseId = numericCourseId;
        }
      }

      // Combine current filters with additional filters
      const requestFilters = {
        ...currentFiltersRef.current,
        ...additionalFilters,
        page,
        courseId: validCourseId // This will be null if no valid course ID
      };

      console.log('Final request filters:', requestFilters);

      let result;
      
      // FIX: Use the appropriate service method based on courseId
      if (validCourseId) {
        // Use the dedicated course-specific method
        console.log('Using getLessonsByCourse with courseId:', validCourseId);
        result = await getLessonsByCourse(validCourseId, {
          page: requestFilters.page,
          perPage: requestFilters.perPage || 20,
          status: requestFilters.status,
          search: requestFilters.search,
          orderBy: 'menu_order',
          order: 'asc'
        });
      } else {
        // Use general lessons method
        console.log('Using getLessons (all lessons)');
        result = await getLessons(requestFilters);
      }

      console.log('Fetched lessons result:', result);

      if (reset) {
        setLessons(result.data);
      } else {
        setLessons(prevLessons => [...prevLessons, ...result.data]);
      }

      setPagination(result.pagination);
      setHasMore(result.pagination.currentPage < result.pagination.totalPages);

    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError(err.message || 'Failed to fetch lessons');
      
      if (reset) {
        setLessons([]);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // --- INITIAL LOAD AND FILTER CHANGES ---
  useEffect(() => {
    if (autoFetch) {
      console.log('Auto-fetching lessons due to courseId or filters change');
      fetchLessons({ reset: true });
    }
  }, [courseId, filters, autoFetch, fetchLessons]);

  // --- LESSON OPERATIONS ---
  const createLesson = useCallback(async (lessonData) => {
    setCreating(true);
    try {
      console.log('Creating lesson:', lessonData);
      
      // FIX: Ensure course ID is properly set if we're in a course context
      const lessonDataWithCourse = {
        ...lessonData,
        meta: {
          ...lessonData.meta,
          _course_id: lessonData.meta?._course_id || courseId?.toString() || ''
        }
      };

      const result = await createLessonAPI(lessonDataWithCourse);
      console.log('Lesson created:', result);
      
      // Refresh lessons after creation
      await fetchLessons({ reset: true });
      return result;
    } catch (error) {
      console.error('Error creating lesson:', error);
      throw error;
    } finally {
      setCreating(false);
    }
  }, [fetchLessons, courseId]);

  const deleteLesson = useCallback(async (lessonId) => {
    try {
      await deleteLessonAPI(lessonId);
      // Refresh lessons after deletion
      await fetchLessons({ reset: true });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      throw error;
    }
  }, [fetchLessons]);

  const duplicateLesson = useCallback(async (lessonId) => {
    try {
      const result = await duplicateLessonAPI(lessonId);
      // Refresh lessons after duplication
      await fetchLessons({ reset: true });
      return result;
    } catch (error) {
      console.error('Error duplicating lesson:', error);
      throw error;
    }
  }, [fetchLessons]);

  // --- FILTER METHODS ---
  const setSearch = useCallback((search) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setStatusFilter = useCallback((status) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setLessonTypeFilter = useCallback((lessonType) => {
    setFilters(prev => ({ ...prev, lessonType }));
  }, []);

  const setContentTypeFilter = useCallback((contentType) => {
    setFilters(prev => ({ ...prev, contentType }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'publish,draft,private',
      lessonType: '',
      contentType: '',
      ...initialFilters
    });
  }, [initialFilters]);

  // --- PAGINATION ---
  const loadMoreLessons = useCallback(() => {
    if (hasMore && !loading) {
      fetchLessons({ 
        page: pagination.currentPage + 1,
        reset: false 
      });
    }
  }, [hasMore, loading, pagination.currentPage, fetchLessons]);

  const refreshLessons = useCallback(() => {
    fetchLessons({ reset: true });
  }, [fetchLessons]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    return {
      totalLessons: lessons.length,
      publishedLessons: lessons.filter(l => l.status === 'publish').length,
      draftLessons: lessons.filter(l => l.status === 'draft').length,
      privateLessons: lessons.filter(l => l.status === 'private').length,
      freeLessons: lessons.filter(l => l.meta?._content_type !== 'premium').length,
      premiumLessons: lessons.filter(l => l.meta?._content_type === 'premium').length,
      totalDuration: lessons.reduce((total, lesson) => {
        const duration = parseInt(lesson.meta?._duration_minutes || '0');
        return total + duration;
      }, 0),
      lessonsByType: lessons.reduce((acc, lesson) => {
        const type = lesson.meta?._lesson_type || 'text';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      // NEW: Add course-specific computations
      lessonsWithQuizzes: lessons.filter(lesson => 
        lesson.meta?._has_quiz === 'yes' || lesson.meta?._lesson_type === 'quiz'
      ).length,
      averageDuration: lessons.length > 0 ? 
        Math.round(lessons.reduce((total, lesson) => {
          const duration = parseInt(lesson.meta?._duration_minutes || '0');
          return total + duration;
        }, 0) / lessons.length) : 0
    };
  }, [lessons]);

  return {
    // Data
    lessons,
    loading,
    creating,
    error,
    pagination,
    hasMore,
    filters,
    computed,

    // Methods
    createLesson,
    deleteLesson,
    duplicateLesson,
    refreshLessons,
    loadMoreLessons,

    // Filter methods
    setSearch,
    setStatusFilter,
    setLessonTypeFilter,
    setContentTypeFilter,
    resetFilters
  };
};

export default useLessons;