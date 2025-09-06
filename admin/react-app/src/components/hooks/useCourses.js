import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiConfig } from '../../api/config/apiConfig.js';

/**
 * Custom hook for course management
 * FIXED VERSION - Added proper debouncing to prevent unlimited API calls
 */
export const useCourses = (options = {}) => {
  const { 
    type = null,
    category = null,
    status = null,
    search = '',
    autoFetch = true,
    initialFilters = {},
    debounceMs = 500 // Debounce delay for search and filters
  } = options;

  // --- STATE ---
  const [courses, setCourses] = useState([]);
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
    type: type,
    category: category,
    status: status || 'publish,draft,private',
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

  // --- FETCH COURSES WITH DUPLICATE PREVENTION ---
  const fetchCourses = useCallback(async (fetchOptions = {}) => {
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

      // Add course type filter via taxonomy
      if (currentFilters.type) {
        queryParams.append('course_type', currentFilters.type);
      }

      // Add category filter via taxonomy
      if (currentFilters.category) {
        queryParams.append('categories', currentFilters.category);
      }

      // Add additional filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${config.endpoints.courses}?${queryParams}`;
      
      // 🔥 PREVENT DUPLICATE REQUESTS
      const currentRequestParams = `${url}-${page}-${reset}`;
      if (currentRequestParams === lastFetchParamsRef.current) {
        console.log('🚫 Duplicate course request prevented:', url);
        return;
      }
      lastFetchParamsRef.current = currentRequestParams;

      console.log('🚀 Fetching courses:', url);

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
        setCourses(data);
      } else {
        setCourses(prevCourses => {
          const existingIds = new Set(prevCourses.map(c => c.id));
          const newCourses = data.filter(c => !existingIds.has(c.id));
          return [...prevCourses, ...newCourses];
        });
      }

      console.log('✅ Courses loaded:', data.length);
      
    } catch (err) {
      console.error('❌ Error fetching courses:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch courses');
        
        if (reset || page === 1) {
          setCourses([]);
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
        fetchCourses({ reset: true, ...fetchOptions });
      }
    }, debounceMs);
  }, [fetchCourses, debounceMs]);

  // --- INITIAL LOAD (NO DEBOUNCE) ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🎯 Initial course load');
      fetchCourses({ reset: true });
    }
  }, []); // Only run on mount

  // --- UPDATE FILTERS (NO FETCH YET) ---
  useEffect(() => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        search: search || '',
        type: type,
        category: category,
        status: status || prev.status
      };
      
      // Only update if something actually changed
      if (JSON.stringify(newFilters) !== JSON.stringify(prev)) {
        return newFilters;
      }
      return prev;
    });
  }, [search, type, category, status]);

  // --- DEBOUNCED REFETCH WHEN FILTERS CHANGE ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🔄 Course filters changed, debouncing fetch...');
      debouncedFetch();
    }
  }, [filters, debouncedFetch, autoFetch]);

  // --- CREATE COURSE ---
  const createCourse = useCallback(async (courseData) => {
    try {
      setCreating(true);
      setError(null);
      
      const config = getApiConfig();
      
      // Transform data for API
      const apiData = {
        title: courseData.title || '',
        content: courseData.content || '',
        excerpt: courseData.excerpt || '',
        status: courseData.status || 'draft',
        meta: {
          _course_price: courseData.price || '0',
          _course_duration: courseData.duration || '',
          _course_difficulty: courseData.difficulty || 'beginner',
          _course_instructor: courseData.instructor || '',
          _course_max_students: courseData.maxStudents || '0',
          _course_requirements: courseData.requirements || '',
          _course_outcomes: courseData.outcomes || '',
          _course_featured: courseData.featured ? 'yes' : 'no',
          ...courseData.meta
        },
        // Handle taxonomies
        course_type: courseData.typeId ? [courseData.typeId] : [],
        categories: courseData.categoryIds || [],
        featured_media: courseData.featuredImageId || 0
      };

      console.log('🚀 Creating course:', apiData);

      const response = await makeApiRequest(config.endpoints.courses, {
        method: 'POST',
        body: JSON.stringify(apiData)
      });

      const newCourse = await response.json();
      
      // Add to courses list
      setCourses(prev => [newCourse, ...prev]);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));

      console.log('✅ Course created:', newCourse);
      return newCourse;
      
    } catch (err) {
      console.error('❌ Error creating course:', err);
      setError(err.message || 'Failed to create course');
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // --- DELETE COURSE ---
  const deleteCourse = useCallback(async (courseId) => {
    try {
      setError(null);
      
      const config = getApiConfig();
      
      console.log('🗑️ Deleting course:', courseId);

      await makeApiRequest(`${config.endpoints.courses}/${courseId}`, {
        method: 'DELETE'
      });

      // Remove from courses list
      setCourses(prev => prev.filter(c => c.id !== courseId));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));

      console.log('✅ Course deleted');
      
    } catch (err) {
      console.error('❌ Error deleting course:', err);
      setError(err.message || 'Failed to delete course');
      throw err;
    }
  }, []);

  // --- DUPLICATE COURSE ---
  const duplicateCourse = useCallback(async (courseId) => {
    try {
      setError(null);
      
      // Find the original course
      const originalCourse = courses.find(c => c.id === courseId);
      if (!originalCourse) {
        throw new Error('Course not found');
      }

      // Create duplicate data
      const duplicateData = {
        title: `${originalCourse.title?.rendered || originalCourse.title} (Copy)`,
        content: originalCourse.content?.rendered || originalCourse.content || '',
        excerpt: originalCourse.excerpt?.rendered || originalCourse.excerpt || '',
        status: 'draft',
        price: originalCourse.meta?._course_price,
        duration: originalCourse.meta?._course_duration,
        difficulty: originalCourse.meta?._course_difficulty,
        instructor: originalCourse.meta?._course_instructor,
        maxStudents: originalCourse.meta?._course_max_students,
        requirements: originalCourse.meta?._course_requirements,
        outcomes: originalCourse.meta?._course_outcomes,
        featured: originalCourse.meta?._course_featured === 'yes',
        typeId: originalCourse.course_type?.[0],
        categoryIds: originalCourse.categories || [],
        meta: originalCourse.meta
      };

      console.log('📋 Duplicating course:', courseId);
      
      return await createCourse(duplicateData);
      
    } catch (err) {
      console.error('❌ Error duplicating course:', err);
      setError(err.message || 'Failed to duplicate course');
      throw err;
    }
  }, [courses, createCourse]);

  // --- PAGINATION ---
  const loadMoreCourses = useCallback(() => {
    if (hasMore && !loading) {
      fetchCourses({ 
        page: pagination.currentPage + 1,
        reset: false 
      });
    }
  }, [hasMore, loading, pagination.currentPage, fetchCourses]);

  const refreshCourses = useCallback(() => {
    lastFetchParamsRef.current = ''; // Reset duplicate prevention
    fetchCourses({ reset: true });
  }, [fetchCourses]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    return {
      totalCourses: courses.length,
      publishedCourses: courses.filter(c => c.status === 'publish').length,
      draftCourses: courses.filter(c => c.status === 'draft').length,
      privateCourses: courses.filter(c => c.status === 'private').length,
      coursesByType: courses.reduce((acc, course) => {
        const types = course.course_type || [];
        types.forEach(typeId => {
          acc[typeId] = (acc[typeId] || 0) + 1;
        });
        return acc;
      }, {}),
      coursesByDifficulty: courses.reduce((acc, course) => {
        const difficulty = course.meta?._course_difficulty || 'beginner';
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
      }, {}),
      averagePrice: courses.length > 0 ? 
        Math.round(courses.reduce((sum, course) => {
          return sum + parseFloat(course.meta?._course_price || '0');
        }, 0) / courses.length) : 0,
      totalRevenue: courses.reduce((sum, course) => {
        return sum + parseFloat(course.meta?._course_price || '0');
      }, 0),
      freeCourses: courses.filter(course => 
        parseFloat(course.meta?._course_price || '0') === 0
      ).length,
      paidCourses: courses.filter(course => 
        parseFloat(course.meta?._course_price || '0') > 0
      ).length,
      featuredCourses: courses.filter(course => 
        course.meta?._course_featured === 'yes'
      ).length,
      coursesWithInstructor: courses.filter(course => 
        course.meta?._course_instructor && course.meta._course_instructor.trim() !== ''
      ).length,
      averageDuration: courses.length > 0 ? 
        Math.round(courses.reduce((sum, course) => {
          const duration = course.meta?._course_duration || '';
          const hours = parseFloat(duration) || 0;
          return sum + hours;
        }, 0) / courses.length) : 0,
      totalStudents: courses.reduce((sum, course) => {
        return sum + parseInt(course.meta?._course_max_students || '0');
      }, 0)
    };
  }, [courses]);

  return {
    // Data
    courses,
    loading,
    creating,
    error,
    pagination,
    hasMore,
    filters,
    computed,

    // Methods
    createCourse,
    deleteCourse,
    duplicateCourse,
    refreshCourses,
    loadMoreCourses,
    fetchCourses: debouncedFetch // Export debounced version
  };
};

export default useCourses;