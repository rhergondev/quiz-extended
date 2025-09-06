import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiConfig } from '../../api/config/apiConfig.js';

/**
 * Custom hook for lesson management
 * FIXED VERSION - Added proper debouncing to prevent unlimited API calls
 */
export const useLessons = (options = {}) => {
  const { 
    courseId = null,
    type = null,
    contentType = null,
    search = '',
    autoFetch = true,
    initialFilters = {},
    debounceMs = 500 // Debounce delay for search and filters
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
    search: search || '',
    courseId: courseId,
    type: type,
    contentType: contentType,
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

  // --- FETCH LESSONS WITH DUPLICATE PREVENTION ---
  const fetchLessons = useCallback(async (fetchOptions = {}) => {
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
        orderby: 'menu_order',
        order: 'asc',
        _embed: 'true'
      });

      // Add search
      if (currentFilters.search) {
        queryParams.append('search', currentFilters.search);
      }

      // Add course filter - CRITICAL FIX for meta_query
      if (currentFilters.courseId) {
        queryParams.append('meta_query[0][key]', '_course_id');
        queryParams.append('meta_query[0][value]', currentFilters.courseId.toString());
        queryParams.append('meta_query[0][compare]', '=');
        queryParams.append('meta_query[0][type]', 'NUMERIC');
      }

      // Add lesson type filter
      if (currentFilters.type) {
        const typeIndex = currentFilters.courseId ? 1 : 0;
        queryParams.append(`meta_query[${typeIndex}][key]`, '_lesson_type');
        queryParams.append(`meta_query[${typeIndex}][value]`, currentFilters.type);
        queryParams.append(`meta_query[${typeIndex}][compare]`, '=');
      }

      // Add content type filter
      if (currentFilters.contentType) {
        const contentIndex = (currentFilters.courseId ? 1 : 0) + (currentFilters.type ? 1 : 0);
        queryParams.append(`meta_query[${contentIndex}][key]`, '_content_type');
        queryParams.append(`meta_query[${contentIndex}][value]`, currentFilters.contentType);
        queryParams.append(`meta_query[${contentIndex}][compare]`, '=');
      }

      // Set meta query relation if multiple filters
      const filterCount = [currentFilters.courseId, currentFilters.type, currentFilters.contentType].filter(Boolean).length;
      if (filterCount > 1) {
        queryParams.append('meta_query[relation]', 'AND');
      }

      // Add additional filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${config.endpoints.lessons}?${queryParams}`;
      
      // 🔥 PREVENT DUPLICATE REQUESTS
      const currentRequestParams = `${url}-${page}-${reset}`;
      if (currentRequestParams === lastFetchParamsRef.current) {
        console.log('🚫 Duplicate lesson request prevented:', url);
        return;
      }
      lastFetchParamsRef.current = currentRequestParams;

      console.log('🚀 Fetching lessons:', url);

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
        setLessons(data);
      } else {
        setLessons(prevLessons => {
          const existingIds = new Set(prevLessons.map(l => l.id));
          const newLessons = data.filter(l => !existingIds.has(l.id));
          return [...prevLessons, ...newLessons];
        });
      }

      console.log('✅ Lessons loaded:', data.length);
      
    } catch (err) {
      console.error('❌ Error fetching lessons:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch lessons');
        
        if (reset || page === 1) {
          setLessons([]);
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
        fetchLessons({ reset: true, ...fetchOptions });
      }
    }, debounceMs);
  }, [fetchLessons, debounceMs]);

  // --- INITIAL LOAD (NO DEBOUNCE) ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🎯 Initial lesson load');
      fetchLessons({ reset: true });
    }
  }, []); // Only run on mount

  // --- UPDATE FILTERS (NO FETCH YET) ---
  useEffect(() => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        search: search || '',
        courseId: courseId,
        type: type,
        contentType: contentType
      };
      
      // Only update if something actually changed
      if (JSON.stringify(newFilters) !== JSON.stringify(prev)) {
        return newFilters;
      }
      return prev;
    });
  }, [search, courseId, type, contentType]);

  // --- DEBOUNCED REFETCH WHEN FILTERS CHANGE ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🔄 Lesson filters changed, debouncing fetch...');
      debouncedFetch();
    }
  }, [filters, debouncedFetch, autoFetch]);

  // --- CREATE LESSON ---
  const createLesson = useCallback(async (lessonData) => {
    try {
      setCreating(true);
      setError(null);
      
      const config = getApiConfig();
      
      // Transform data for API
      const apiData = {
        title: lessonData.title || '',
        content: lessonData.content || '',
        excerpt: lessonData.excerpt || '',
        status: lessonData.status || 'draft',
        menu_order: lessonData.menuOrder || 1,
        meta: {
          _course_id: lessonData.courseId || '',
          _lesson_order: lessonData.lessonOrder || '1',
          _duration_minutes: lessonData.durationMinutes || '',
          _lesson_type: lessonData.type || 'video',
          _video_url: lessonData.videoUrl || '',
          _content_type: lessonData.contentType || 'free',
          _prerequisite_lessons: lessonData.prerequisiteLessons || '',
          _resources_urls: lessonData.resourcesUrls || '',
          _completion_criteria: lessonData.completionCriteria || 'view',
          ...lessonData.meta
        }
      };

      console.log('🚀 Creating lesson:', apiData);

      const response = await makeApiRequest(config.endpoints.lessons, {
        method: 'POST',
        body: JSON.stringify(apiData)
      });

      const newLesson = await response.json();
      
      // Add to lessons list
      setLessons(prev => [newLesson, ...prev]);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      console.log('✅ Lesson created:', newLesson);
      return newLesson;
      
    } catch (err) {
      console.error('❌ Error creating lesson:', err);
      setError(err.message || 'Failed to create lesson');
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // --- DELETE LESSON ---
  const deleteLesson = useCallback(async (lessonId) => {
    try {
      setError(null);
      
      const config = getApiConfig();
      
      console.log('🗑️ Deleting lesson:', lessonId);

      await makeApiRequest(`${config.endpoints.lessons}/${lessonId}`, {
        method: 'DELETE'
      });

      // Remove from lessons list
      setLessons(prev => prev.filter(l => l.id !== lessonId));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

      console.log('✅ Lesson deleted');
      
    } catch (err) {
      console.error('❌ Error deleting lesson:', err);
      setError(err.message || 'Failed to delete lesson');
      throw err;
    }
  }, []);

  // --- DUPLICATE LESSON ---
  const duplicateLesson = useCallback(async (lessonId) => {
    try {
      setError(null);
      
      // Find the original lesson
      const originalLesson = lessons.find(l => l.id === lessonId);
      if (!originalLesson) {
        throw new Error('Lesson not found');
      }

      // Create duplicate data
      const duplicateData = {
        title: `${originalLesson.title?.rendered || originalLesson.title} (Copy)`,
        content: originalLesson.content?.rendered || originalLesson.content || '',
        excerpt: originalLesson.excerpt?.rendered || originalLesson.excerpt || '',
        status: 'draft',
        courseId: originalLesson.meta?._course_id,
        type: originalLesson.meta?._lesson_type,
        contentType: originalLesson.meta?._content_type,
        durationMinutes: originalLesson.meta?._duration_minutes,
        videoUrl: originalLesson.meta?._video_url,
        prerequisiteLessons: originalLesson.meta?._prerequisite_lessons,
        resourcesUrls: originalLesson.meta?._resources_urls,
        completionCriteria: originalLesson.meta?._completion_criteria,
        meta: originalLesson.meta
      };

      console.log('📋 Duplicating lesson:', lessonId);
      
      return await createLesson(duplicateData);
      
    } catch (err) {
      console.error('❌ Error duplicating lesson:', err);
      setError(err.message || 'Failed to duplicate lesson');
      throw err;
    }
  }, [lessons, createLesson]);

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
    lastFetchParamsRef.current = ''; // Reset duplicate prevention
    fetchLessons({ reset: true });
  }, [fetchLessons]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    return {
      totalLessons: lessons.length,
      publishedLessons: lessons.filter(l => l.status === 'publish').length,
      draftLessons: lessons.filter(l => l.status === 'draft').length,
      privateLessons: lessons.filter(l => l.status === 'private').length,
      lessonsByType: lessons.reduce((acc, lesson) => {
        const type = lesson.meta?._lesson_type || 'video';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      lessonsByContentType: lessons.reduce((acc, lesson) => {
        const contentType = lesson.meta?._content_type || 'free';
        acc[contentType] = (acc[contentType] || 0) + 1;
        return acc;
      }, {}),
      averageDuration: lessons.length > 0 ? 
        Math.round(lessons.reduce((sum, lesson) => {
          return sum + parseInt(lesson.meta?._duration_minutes || '0');
        }, 0) / lessons.length) : 0,
      totalDuration: lessons.reduce((sum, lesson) => {
        return sum + parseInt(lesson.meta?._duration_minutes || '0');
      }, 0),
      lessonsWithVideo: lessons.filter(lesson => 
        lesson.meta?._video_url && lesson.meta._video_url.trim() !== ''
      ).length,
      lessonsWithPrerequisites: lessons.filter(lesson => 
        lesson.meta?._prerequisite_lessons && lesson.meta._prerequisite_lessons.trim() !== ''
      ).length,
      freeLessons: lessons.filter(lesson => 
        lesson.meta?._content_type === 'free'
      ).length,
      premiumLessons: lessons.filter(lesson => 
        lesson.meta?._content_type === 'premium'
      ).length
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
    fetchLessons: debouncedFetch // Export debounced version
  };
};

export default useLessons;