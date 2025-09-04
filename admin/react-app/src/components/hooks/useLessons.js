/**
 * Custom hook for lesson management
 * Provides lesson state and operations with filtering and pagination
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  getLessons, 
  getLessonsByCourse,
  createLesson as createLessonApi, 
  deleteLesson as deleteLessonApi,
  duplicateLesson as duplicateLessonApi,
  getLessonsCount 
} from '../../api/services/lessonService.js';

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
  const [hasMore, setHasMore] = useState(true);
  
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 0,
    perPage: 20
  });

  const [filters, setFilters] = useState({
    search: '',
    status: 'publish,draft,private',
    lessonType: '',
    contentType: '',
    ...initialFilters
  });

  // Use refs to store current state to avoid dependency issues
  const currentFiltersRef = useRef(filters);
  const isInitialLoadRef = useRef(true);

  // Update ref when filters change
  useEffect(() => {
    currentFiltersRef.current = filters;
  }, [filters]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    const publishedLessons = lessons.filter(lesson => lesson.status === 'publish');
    const draftLessons = lessons.filter(lesson => lesson.status === 'draft');
    const privateLessons = lessons.filter(lesson => lesson.status === 'private');
    const premiumLessons = lessons.filter(lesson => lesson.meta?._content_type === 'premium');
    const freeLessons = lessons.filter(lesson => lesson.meta?._content_type === 'free');

    const totalDuration = lessons.reduce((total, lesson) => {
      const duration = parseInt(lesson.meta?._duration_minutes || '0');
      return total + (isNaN(duration) ? 0 : duration);
    }, 0);

    const lessonsByType = lessons.reduce((acc, lesson) => {
      const type = lesson.meta?._lesson_type || 'text';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalLessons: lessons.length,
      publishedLessons: publishedLessons.length,
      draftLessons: draftLessons.length,
      privateLessons: privateLessons.length,
      premiumLessons: premiumLessons.length,
      freeLessons: freeLessons.length,
      totalDuration,
      averageDuration: lessons.length > 0 ? Math.round(totalDuration / lessons.length) : 0,
      lessonsByType
    };
  }, [lessons]);

  // --- FETCH LESSONS FUNCTION ---
  const fetchLessons = useCallback(async (options = {}) => {
    const { 
      isLoadMore = false,
      filters: newFilters = currentFiltersRef.current 
    } = options;

    try {
      if (!isLoadMore) {
        setLoading(true);
        setError(null);
      }

      const requestOptions = {
        page: isLoadMore ? pagination.currentPage + 1 : 1,
        perPage: pagination.perPage,
        ...newFilters,
        courseId: courseId // Always use the courseId from hook options if provided
      };

      const result = courseId 
        ? await getLessonsByCourse(courseId, requestOptions)
        : await getLessons(requestOptions);

      if (isLoadMore) {
        setLessons(prev => [...prev, ...result.data]);
      } else {
        setLessons(result.data);
      }

      setPagination(result.pagination);
      setHasMore(result.pagination.hasMore);

    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError(error.message);
      
      if (!isLoadMore) {
        setLessons([]);
        setPagination({ total: 0, totalPages: 0, currentPage: 0, perPage: 20 });
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, pagination.currentPage, pagination.perPage]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (autoFetch && isInitialLoadRef.current) {
      fetchLessons();
      isInitialLoadRef.current = false;
    }
  }, [autoFetch, fetchLessons]);

  // --- LOAD MORE LESSONS ---
  const loadMoreLessons = useCallback(async () => {
    if (loading || !hasMore) return;
    
    await fetchLessons({ 
      isLoadMore: true,
      filters: currentFiltersRef.current 
    });
  }, [fetchLessons, loading, hasMore]);

  // --- REFRESH LESSONS ---
  const refreshLessons = useCallback(async (newFilters = {}) => {
    const updatedFilters = {
      ...currentFiltersRef.current,
      ...newFilters
    };
    
    setFilters(updatedFilters);
    await fetchLessons({ filters: updatedFilters });
  }, [fetchLessons]);

  // --- CREATE LESSON ---
  const createLesson = useCallback(async (lessonData) => {
    try {
      setCreating(true);
      setError(null);

      // If we have a courseId, ensure it's set in the lesson data
      const dataWithCourse = courseId 
        ? {
            ...lessonData,
            courseId,
            meta: {
              ...lessonData.meta,
              _course_id: courseId.toString()
            }
          }
        : lessonData;

      const newLesson = await createLessonApi(dataWithCourse);
      
      // Add to the beginning of the list
      setLessons(prev => [newLesson, ...prev]);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      return newLesson;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setCreating(false);
    }
  }, [courseId]);

  // --- DELETE LESSON ---
  const deleteLesson = useCallback(async (lessonId) => {
    try {
      setError(null);
      await deleteLessonApi(lessonId);
      
      // Remove from list
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  // --- DUPLICATE LESSON ---
  const duplicateLesson = useCallback(async (lessonId, overrides = {}) => {
    try {
      setError(null);
      const duplicatedLesson = await duplicateLessonApi(lessonId, overrides);
      
      // Add to the list
      setLessons(prev => [duplicatedLesson, ...prev]);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      return duplicatedLesson;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  // --- FILTER FUNCTIONS ---
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
    const defaultFilters = {
      search: '',
      status: 'publish,draft,private',
      lessonType: '',
      contentType: ''
    };
    setFilters(defaultFilters);
    fetchLessons({ filters: defaultFilters });
  }, [fetchLessons]);

  // --- APPLY FILTERS (with debounce) ---
  useEffect(() => {
    if (isInitialLoadRef.current) return;

    const timer = setTimeout(() => {
      fetchLessons({ filters });
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, fetchLessons]);

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

    // Actions
    createLesson,
    deleteLesson,
    duplicateLesson,
    refreshLessons,
    loadMoreLessons,

    // Filter actions
    setSearch,
    setStatusFilter,
    setLessonTypeFilter,
    setContentTypeFilter,
    resetFilters
  };
};

export default useLessons;