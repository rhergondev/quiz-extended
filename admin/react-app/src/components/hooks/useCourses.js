import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCourses, createCourse, deleteCourse } from '../../api/index.js';

/**
 * Enhanced custom hook to manage courses state and logic with infinite scroll support
 * and improved filter management - UPDATED VERSION with filter support
 *
 * @param {Object} options - Configuration options
 * @param {string} options.search - Search term filter
 * @param {string} options.category - Category filter
 * @param {string} options.difficulty - Difficulty filter
 * @param {string} options.status - Status filter
 * @param {boolean} options.autoFetch - Auto fetch on mount
 * @returns {object} Object with courses state and functions to manipulate them.
 */
export const useCourses = (options = {}) => {
  const {
    search = '',
    category = null,
    difficulty = null,
    status = 'publish,draft',
    autoFetch = true,
    perPage = 20
  } = options;

  // --- STATE ---
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 0,
    perPage: perPage
  });
  
  // Filters state
  const [filters, setFilters] = useState({
    search: search || '',
    category: category,
    difficulty: difficulty,
    status: status
  });
  
  // Use refs to store current filters to avoid dependency issues
  const currentFiltersRef = useRef(filters);
  const isInitialLoadRef = useRef(true);

  // Update refs when filters change
  useEffect(() => {
    currentFiltersRef.current = filters;
  }, [filters]);

  // Update filters when options change
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: search || '',
      category: category,
      difficulty: difficulty,
      status: status
    }));
  }, [search, category, difficulty, status]);

  // --- FETCH COURSES FUNCTION ---
  const fetchCourses = useCallback(async (options = {}) => {
    const { 
      isLoadMore = false, 
      customFilters = currentFiltersRef.current 
    } = options;
    
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const page = isLoadMore ? pagination.currentPage + 1 : 1;
      
      // Build API parameters
      const apiParams = {
        page,
        perPage: perPage,
        status: customFilters.status || 'publish,draft'
      };

      // Add search if provided
      if (customFilters.search) {
        apiParams.search = customFilters.search;
      }

      // Add meta query filters for category and difficulty
      const metaQueries = [];
      
      if (customFilters.category) {
        metaQueries.push({
          key: '_course_category',
          value: customFilters.category,
          compare: '='
        });
      }

      if (customFilters.difficulty) {
        metaQueries.push({
          key: '_difficulty_level',
          value: customFilters.difficulty,
          compare: '='
        });
      }

      // Add meta queries to API params if we have any
      if (metaQueries.length > 0) {
        metaQueries.forEach((metaQuery, index) => {
          apiParams[`meta_query[${index}][key]`] = metaQuery.key;
          apiParams[`meta_query[${index}][value]`] = metaQuery.value;
          apiParams[`meta_query[${index}][compare]`] = metaQuery.compare;
        });

        if (metaQueries.length > 1) {
          apiParams['meta_query[relation]'] = 'AND';
        }
      }

      console.log('🚀 Fetching courses with params:', apiParams);
      
      const response = await getCourses(apiParams);
      
      if (isLoadMore) {
        // Only append if we actually got new data and haven't reached the end
        if (response.data.length > 0) {
          setCourses(prevCourses => {
            // Create a Set of existing course IDs to avoid duplicates
            const existingIds = new Set(prevCourses.map(course => course.id));
            const newCourses = response.data.filter(course => !existingIds.has(course.id));
            
            // Only add if there are actually new courses
            if (newCourses.length > 0) {
              return [...prevCourses, ...newCourses];
            }
            return prevCourses;
          });
        }
      } else {
        // Replace courses with new ones (fresh load or filter change)
        setCourses(response.data);
        currentFiltersRef.current = customFilters;
      }
      
      setPagination(response.pagination);
      
      // Set hasMore based on whether we actually have more pages AND got data
      const actuallyHasMore = response.pagination.hasMore && response.data.length > 0;
      setHasMore(actuallyHasMore);
      
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError(err);
      
      // If it's a filter change (not load more), still reset courses to empty
      if (!isLoadMore) {
        setCourses([]);
        setPagination({
          total: 0,
          totalPages: 0,
          currentPage: 0,
          perPage: perPage
        });
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [pagination.currentPage, perPage]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (autoFetch && isInitialLoadRef.current) {
      fetchCourses();
      isInitialLoadRef.current = false;
    }
  }, [fetchCourses, autoFetch]);

  // --- REFETCH WHEN FILTERS CHANGE ---
  useEffect(() => {
    if (autoFetch && !isInitialLoadRef.current) {
      // Reset pagination state before fetching
      setPagination(prev => ({
        ...prev,
        currentPage: 0
      }));
      
      fetchCourses({ 
        isLoadMore: false,
        customFilters: filters 
      });
    }
  }, [filters, fetchCourses, autoFetch]);

  // --- LOAD MORE COURSES ---
  const loadMoreCourses = useCallback(async () => {
    // Multiple safety checks to prevent unnecessary calls
    if (isLoadingMore || !hasMore || isLoading) {
      return;
    }
    
    // Check if we're already at the end
    if (pagination.currentPage >= pagination.totalPages) {
      setHasMore(false);
      return;
    }
    
    await fetchCourses({ 
      isLoadMore: true,
      customFilters: currentFiltersRef.current 
    });
  }, [fetchCourses, isLoadingMore, hasMore, isLoading, pagination.currentPage, pagination.totalPages]);

  // --- REFRESH WITH NEW FILTERS ---
  const refreshCourses = useCallback(async (newFilters = {}) => {
    const finalFilters = {
      ...currentFiltersRef.current,
      ...newFilters
    };
    
    // Update filters state
    setFilters(finalFilters);
    
    // Reset pagination state before fetching
    setPagination(prev => ({
      ...prev,
      currentPage: 0
    }));
    
    await fetchCourses({ 
      isLoadMore: false,
      customFilters: finalFilters 
    });
  }, [fetchCourses]);

  // --- CREATE COURSE ---
  const addCourse = useCallback(async (courseData) => {
    try {
      setCreating(true);
      setError(null);
      
      const newCourse = await createCourse(courseData);
      
      // Add new course to the beginning of the list
      setCourses(prevCourses => [newCourse, ...prevCourses]);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));
      
      console.log('✅ Course created:', newCourse);
      return newCourse;
      
    } catch (err) {
      console.error('❌ Error creating course:', err);
      setError(err);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // --- DELETE COURSE ---
  const removeCourse = useCallback(async (courseId) => {
    try {
      setError(null);
      
      await deleteCourse(courseId);
      
      // Remove course from list
      setCourses(prevCourses => prevCourses.filter(course => course.id !== courseId));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
      
      console.log('✅ Course deleted:', courseId);
      
    } catch (err) {
      console.error('❌ Error deleting course:', err);
      setError(err);
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
        meta: originalCourse.meta
      };

      console.log('📋 Duplicating course:', courseId);
      
      return await addCourse(duplicateData);
      
    } catch (err) {
      console.error('❌ Error duplicating course:', err);
      setError(err);
      throw err;
    }
  }, [courses, addCourse]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    return {
      totalCourses: courses.length,
      publishedCourses: courses.filter(c => c.status === 'publish').length,
      draftCourses: courses.filter(c => c.status === 'draft').length,
      privateCourses: courses.filter(c => c.status === 'private').length,
      coursesByCategory: courses.reduce((acc, course) => {
        const category = course.meta?._course_category || 'general';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
      coursesByDifficulty: courses.reduce((acc, course) => {
        const difficulty = course.meta?._difficulty_level || 'beginner';
        acc[difficulty] = (acc[difficulty] || 0) + 1;
        return acc;
      }, {}),
      averageDuration: courses.length > 0 ? 
        Math.round(courses.reduce((sum, course) => {
          return sum + parseInt(course.meta?._duration_weeks || '0');
        }, 0) / courses.length) : 0,
      totalRevenue: courses.reduce((sum, course) => {
        const price = parseFloat(course.meta?._price || '0');
        const salePrice = parseFloat(course.meta?._sale_price || '0');
        return sum + (salePrice > 0 && salePrice < price ? salePrice : price);
      }, 0),
      averagePrice: courses.length > 0 ? 
        Math.round(courses.reduce((sum, course) => {
          const price = parseFloat(course.meta?._price || '0');
          const salePrice = parseFloat(course.meta?._sale_price || '0');
          return sum + (salePrice > 0 && salePrice < price ? salePrice : price);
        }, 0) / courses.length) : 0,
      totalStudents: 0 // Este valor vendría de la API en una implementación real
    };
  }, [courses]);

  return {
    // Data
    courses,
    loading: isLoading,
    loadingMore: isLoadingMore,
    creating,
    error,
    hasMore,
    pagination,
    filters,
    computed,

    // Methods
    createCourse: addCourse,
    deleteCourse: removeCourse,
    duplicateCourse,
    loadMoreCourses,
    refreshCourses,
    fetchCourses
  };
};

export default useCourses;