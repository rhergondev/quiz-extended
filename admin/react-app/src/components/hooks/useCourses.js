import { useState, useEffect, useCallback, useRef } from 'react';
import { getCourses, createCourse, deleteCourse } from '../../api/coursesApi';

/**
 * Enhanced custom hook to manage courses state and logic with infinite scroll support
 * and improved filter management.
 *
 * @returns {object} Object with courses state and functions to manipulate them.
 */
export const useCourses = () => {
  // --- STATE ---
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 0,
    perPage: 20
  });
  
  // Use refs to store current filters to avoid dependency issues
  const currentFiltersRef = useRef({
    status: 'publish,draft',
    search: ''
  });
  
  const isInitialLoadRef = useRef(true);

  // --- FETCH COURSES FUNCTION ---
  const fetchCourses = useCallback(async (options = {}) => {
    const { 
      isLoadMore = false, 
      filters = currentFiltersRef.current 
    } = options;
    
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const page = isLoadMore ? pagination.currentPage + 1 : 1;
      
      const response = await getCourses({
        page,
        perPage: 20,
        ...filters
      });
      
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
        currentFiltersRef.current = filters;
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
          perPage: 20
        });
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [pagination.currentPage]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (isInitialLoadRef.current) {
      fetchCourses();
      isInitialLoadRef.current = false;
    }
  }, [fetchCourses]);

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
      filters: currentFiltersRef.current 
    });
  }, [fetchCourses, isLoadingMore, hasMore, isLoading, pagination.currentPage, pagination.totalPages]);

  // --- REFRESH WITH NEW FILTERS ---
  const refreshCourses = useCallback(async (newFilters = {}) => {
    const filters = {
      status: newFilters.status || 'publish,draft',
      search: newFilters.search || ''
    };
    
    // Reset pagination state before fetching
    setPagination(prev => ({
      ...prev,
      currentPage: 0
    }));
    
    await fetchCourses({ 
      isLoadMore: false,
      filters 
    });
  }, [fetchCourses]);

  // --- CREATE COURSE ---
  const addCourse = useCallback(async (courseData) => {
    try {
      const newCourse = await createCourse(courseData);
      
      // Add new course to the beginning of the list
      setCourses((prevCourses) => [newCourse, ...prevCourses]);
      
      // Update pagination total count
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1
      }));
      
      return newCourse;
    } catch (err) {
      console.error('Failed to create course:', err);
      setError(err);
      throw err;
    }
  }, []);

  // --- DELETE COURSE ---
  const removeCourse = useCallback(async (courseId) => {
    try {
      await deleteCourse(courseId);
      
      // Remove course from local state
      setCourses((prevCourses) =>
        prevCourses.filter((course) => course.id !== courseId)
      );
      
      // Update pagination total count
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1)
      }));
      
      return true;
    } catch (err) {
      console.error(`Failed to delete course ${courseId}:`, err);
      setError(err);
      throw err;
    }
  }, []);

  // --- UTILITY FUNCTIONS ---
  
  /**
   * Clear all courses and reset state
   */
  const clearCourses = useCallback(() => {
    setCourses([]);
    setPagination({
      total: 0,
      totalPages: 0,
      currentPage: 0,
      perPage: 20
    });
    setHasMore(false);
    setError(null);
  }, []);

  /**
   * Get current filter state
   */
  const getCurrentFilters = useCallback(() => {
    return { ...currentFiltersRef.current };
  }, []);

  /**
   * Check if we have any active filters
   */
  const hasActiveFilters = useCallback(() => {
    const filters = currentFiltersRef.current;
    return !!(filters.search || (filters.status && filters.status !== 'publish,draft'));
  }, []);

  // --- RETURN VALUE ---
  return {
    // Data
    courses,
    pagination,
    
    // Loading states
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    
    // Actions
    loadMoreCourses,
    refreshCourses,
    addCourse,
    removeCourse,
    
    // Utilities
    clearCourses,
    getCurrentFilters,
    hasActiveFilters,
  };
};