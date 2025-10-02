import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiConfig } from '../../api/config/apiConfig.js';

/**
 * Custom hook for user management
 * ADMINISTRATIVE VERSION - For managing users, enrollments, and statistics
 */
export const useUsers = (options = {}) => {
  const { 
    role = null,
    courseId = null,
    enrollmentStatus = null,
    search = '',
    autoFetch = true,
    initialFilters = {},
    debounceMs = 500 // Debounce delay for search and filters
  } = options;

  // --- STATE ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
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
    role: role,
    courseId: courseId,
    enrollmentStatus: enrollmentStatus,
    orderBy: 'registered',
    order: 'desc',
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

  // --- FETCH USERS WITH DUPLICATE PREVENTION ---
  const fetchUsers = useCallback(async (fetchOptions = {}) => {
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
      
      // Build query params for WordPress Users API
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        orderby: currentFilters.orderBy || 'registered',
        order: currentFilters.order || 'desc',
        context: 'edit' // Get more user details
      });

      // Add search
      if (currentFilters.search) {
        queryParams.append('search', currentFilters.search);
      }

      // Add role filter
      if (currentFilters.role) {
        queryParams.append('roles', currentFilters.role);
      }

      // Add additional filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${config.endpoints.users}?${queryParams}`;
      
      // 🔥 PREVENT DUPLICATE REQUESTS
      const currentRequestParams = `${url}-${page}-${reset}`;
      if (currentRequestParams === lastFetchParamsRef.current) {
        console.log('🚫 Duplicate user request prevented:', url);
        return;
      }
      lastFetchParamsRef.current = currentRequestParams;

      console.log('🚀 Fetching users:', url);

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

      // Enrich user data with enrollment information if courseId filter is present
      let enrichedUsers = data;
      if (currentFilters.courseId) {
        enrichedUsers = await enrichUsersWithEnrollmentData(data, currentFilters.courseId);
      }

      if (reset || page === 1) {
        setUsers(enrichedUsers);
      } else {
        setUsers(prevUsers => {
          const existingIds = new Set(prevUsers.map(u => u.id));
          const newUsers = enrichedUsers.filter(u => !existingIds.has(u.id));
          return [...prevUsers, ...newUsers];
        });
      }

      console.log('✅ Users loaded:', enrichedUsers.length);
      
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch users');
        
        if (reset || page === 1) {
          setUsers([]);
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

  // --- ENRICH USERS WITH ENROLLMENT DATA ---
  const enrichUsersWithEnrollmentData = async (users, courseId) => {
    try {
      const config = getApiConfig();
      
      // Get enrollment data for all users in this course
      const enrollmentPromises = users.map(async (user) => {
        try {
          // Check if user is enrolled using meta query
          const metaResponse = await makeApiRequest(
            `${config.endpoints.users}/${user.id}?context=edit`
          );
          const userData = await metaResponse.json();
          
          const enrollmentKey = `_enrolled_course_${courseId}`;
          const isEnrolled = userData.meta && userData.meta[enrollmentKey];
          
          return {
            ...user,
            enrollmentData: {
              isEnrolled: !!isEnrolled,
              enrollmentDate: isEnrolled ? userData.meta[`${enrollmentKey}_date`] : null,
              progress: userData.meta[`_course_${courseId}_progress`] || 0,
              lastActivity: userData.meta[`_course_${courseId}_last_activity`] || null
            }
          };
        } catch (error) {
          console.warn(`Failed to get enrollment data for user ${user.id}:`, error);
          return {
            ...user,
            enrollmentData: {
              isEnrolled: false,
              enrollmentDate: null,
              progress: 0,
              lastActivity: null
            }
          };
        }
      });

      return await Promise.all(enrollmentPromises);
    } catch (error) {
      console.error('Error enriching users with enrollment data:', error);
      return users;
    }
  };

  // --- DEBOUNCED FETCH FUNCTION ---
  const debouncedFetch = useCallback((fetchOptions = {}) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        fetchUsers({ reset: true, ...fetchOptions });
      }
    }, debounceMs);
  }, [fetchUsers, debounceMs]);

  // --- INITIAL LOAD (NO DEBOUNCE) ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🎯 Initial user load');
      fetchUsers({ reset: true });
    }
  }, []); // Only run on mount

  // --- UPDATE FILTERS (NO FETCH YET) ---
  useEffect(() => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        search: search || '',
        role: role,
        courseId: courseId,
        enrollmentStatus: enrollmentStatus
      };
      
      // Only update if something actually changed
      if (JSON.stringify(newFilters) !== JSON.stringify(prev)) {
        return newFilters;
      }
      return prev;
    });
  }, [search, role, courseId, enrollmentStatus]);

  // --- DEBOUNCED REFETCH WHEN FILTERS CHANGE ---
  useEffect(() => {
    if (autoFetch) {
      console.log('🔄 User filters changed, debouncing fetch...');
      debouncedFetch();
    }
  }, [filters, debouncedFetch, autoFetch]);

  // --- ENROLL USER IN COURSE ---
  const enrollUserInCourse = useCallback(async (userId, courseId) => {
    try {
      setUpdating(true);
      setError(null);
      
      const config = getApiConfig();
      
      // Update user meta to enroll in course
      const metaData = {
        [`_enrolled_course_${courseId}`]: true,
        [`_enrolled_course_${courseId}_date`]: new Date().toISOString(),
        [`_course_${courseId}_progress`]: 0
      };

      console.log('📝 Enrolling user in course:', { userId, courseId });

      // Use WordPress REST API to update user meta
      const response = await makeApiRequest(`${config.endpoints.users}/${userId}`, {
        method: 'POST',
        body: JSON.stringify({
          meta: metaData
        })
      });

      const updatedUser = await response.json();
      
      // Update users list
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? {
              ...user,
              enrollmentData: {
                ...user.enrollmentData,
                isEnrolled: true,
                enrollmentDate: metaData[`_enrolled_course_${courseId}_date`],
                progress: 0
              }
            }
          : user
      ));

      console.log('✅ User enrolled successfully');
      return updatedUser;
      
    } catch (err) {
      console.error('❌ Error enrolling user:', err);
      setError(err.message || 'Failed to enroll user');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  // --- UNENROLL USER FROM COURSE ---
  const unenrollUserFromCourse = useCallback(async (userId, courseId) => {
    try {
      setUpdating(true);
      setError(null);
      
      const config = getApiConfig();
      
      console.log('❌ Unenrolling user from course:', { userId, courseId });

      // Remove enrollment meta
      const response = await makeApiRequest(`${config.endpoints.users}/${userId}`, {
        method: 'POST',
        body: JSON.stringify({
          meta: {
            [`_enrolled_course_${courseId}`]: null
          }
        })
      });

      const updatedUser = await response.json();
      
      // Update users list
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? {
              ...user,
              enrollmentData: {
                ...user.enrollmentData,
                isEnrolled: false,
                enrollmentDate: null,
                progress: 0
              }
            }
          : user
      ));

      console.log('✅ User unenrolled successfully');
      return updatedUser;
      
    } catch (err) {
      console.error('❌ Error unenrolling user:', err);
      setError(err.message || 'Failed to unenroll user');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  // --- UPDATE USER ROLE ---
  const updateUserRole = useCallback(async (userId, newRole) => {
    try {
      setUpdating(true);
      setError(null);
      
      const config = getApiConfig();
      
      console.log('👤 Updating user role:', { userId, newRole });

      const response = await makeApiRequest(`${config.endpoints.users}/${userId}`, {
        method: 'POST',
        body: JSON.stringify({
          roles: [newRole]
        })
      });

      const updatedUser = await response.json();
      
      // Update users list
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, roles: updatedUser.roles } : user
      ));

      console.log('✅ User role updated successfully');
      return updatedUser;
      
    } catch (err) {
      console.error('❌ Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  // --- PAGINATION ---
  const loadMoreUsers = useCallback(() => {
    if (hasMore && !loading) {
      fetchUsers({ 
        page: pagination.currentPage + 1,
        reset: false 
      });
    }
  }, [hasMore, loading, pagination.currentPage, fetchUsers]);

  const refreshUsers = useCallback(() => {
    lastFetchParamsRef.current = ''; // Reset duplicate prevention
    fetchUsers({ reset: true });
  }, [fetchUsers]);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => {
    return {
      totalUsers: users.length,
      usersByRole: users.reduce((acc, user) => {
        const role = user.roles?.[0] || 'subscriber';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {}),
      enrolledUsers: users.filter(user => user.enrollmentData?.isEnrolled).length,
      unenrolledUsers: users.filter(user => !user.enrollmentData?.isEnrolled).length,
      activeUsers: users.filter(user => {
        // Consider active if last activity is within 30 days
        if (!user.enrollmentData?.lastActivity) return false;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(user.enrollmentData.lastActivity) > thirtyDaysAgo;
      }).length,
      averageProgress: users.length > 0 ? 
        Math.round(users.reduce((sum, user) => {
          return sum + (user.enrollmentData?.progress || 0);
        }, 0) / users.length) : 0,
      recentRegistrations: users.filter(user => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(user.date_registered || user.registered) > sevenDaysAgo;
      }).length
    };
  }, [users]);

  return {
    // Data
    users,
    loading,
    updating,
    error,
    pagination,
    hasMore,
    filters,
    computed,

    // Methods
    enrollUserInCourse,
    unenrollUserFromCourse,
    updateUserRole,
    refreshUsers,
    loadMoreUsers,
    fetchUsers: debouncedFetch // Export debounced version
  };
};

export default useUsers;