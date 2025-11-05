import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiConfig } from '../api/config/apiConfig.js';

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
    orderby: 'registered_date',
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
      
      console.log('🔍 Current API Config:', config);
      console.log('🔍 Current Filters:', currentFilters);
      
      // Build query params for WordPress Users API
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        orderby: currentFilters.orderBy || 'registered_date',
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

      console.log('🚀 Fetching users from URL:', url);

      const response = await makeApiRequest(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📥 Raw user data received:', data);

      // Check if component is still mounted
      if (!mountedRef.current) return;

      // Extract pagination from headers
      const totalHeader = response.headers.get('X-WP-Total');
      const totalPagesHeader = response.headers.get('X-WP-TotalPages');
      
      console.log('📊 Pagination headers:', { totalHeader, totalPagesHeader });
      
      const newPagination = {
        currentPage: page,
        totalPages: totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1,
        total: totalHeader ? parseInt(totalHeader, 10) : data.length,
        perPage: 20
      };

      setPagination(newPagination);
      setHasMore(page < newPagination.totalPages);

      // Process users data - normalize the structure
      const processedUsers = data.map(user => ({
        id: user.id,
        name: user.name || `${user.first_name} ${user.last_name}`.trim() || user.username,
        username: user.username,
        email: user.email,
        roles: user.roles || ['subscriber'],
        avatar_urls: user.avatar_urls || {},
        date_registered: user.registered_date || user.registered || new Date().toISOString(),
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        description: user.description || '',
        url: user.url || '',
        // Add enrollment data placeholder
        enrollmentData: {
          isEnrolled: false,
          progress: 0,
          enrollmentDate: null,
          lastActivity: null
        }
      }));

      // Enrich user data with enrollment information if courseId filter is present
      let enrichedUsers = processedUsers;
      if (currentFilters.courseId) {
        enrichedUsers = await enrichUsersWithEnrollmentData(processedUsers, currentFilters.courseId);
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

      console.log('✅ Users processed and loaded:', enrichedUsers.length);
      
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
    console.log('🔄 Enriching users with enrollment data for course:', courseId);
    
    try {
      const config = getApiConfig();
      
      // For now, let's use placeholder enrollment data since we don't have the enrollment API yet
      // TODO: Implement real enrollment API endpoint
      const enrichedUsers = users.map(user => {
        // Generate some fake enrollment data for testing
        const isEnrolled = Math.random() > 0.6; // 40% chance of being enrolled
        const progress = isEnrolled ? Math.floor(Math.random() * 100) : 0;
        const enrollmentDate = isEnrolled ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null;
        const lastActivity = isEnrolled && Math.random() > 0.3 ? 
          new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null;
        
        return {
          ...user,
          enrollmentData: {
            isEnrolled,
            enrollmentDate: enrollmentDate?.toISOString(),
            progress,
            lastActivity: lastActivity?.toISOString()
          }
        };
      });
      
      console.log('✅ Users enriched with enrollment data:', enrichedUsers.length);
      return enrichedUsers;
      
    } catch (error) {
      console.error('❌ Error enriching users with enrollment data:', error);
      return users.map(user => ({
        ...user,
        enrollmentData: {
          isEnrolled: false,
          enrollmentDate: null,
          progress: 0,
          lastActivity: null
        }
      }));
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

  // --- GET SINGLE USER ---
  const getUser = useCallback(async (userId) => {
    try {
      setUpdating(true);
      setError(null);
      
      const config = getApiConfig();
      
      console.log('👤 Fetching single user:', userId);

      // Try with context=edit first (for more data), fallback to regular request
      let response;
      let userData;
      
      try {
        response = await makeApiRequest(`${config.endpoints.users}/${userId}?context=edit`);
        
        if (!response.ok && (response.status === 401 || response.status === 403)) {
          console.warn('⚠️ Edit context failed, trying without context...');
          throw new Error('Context edit not allowed');
        }
        
        userData = await response.json();
        console.log('📥 Single user data received (edit context):', userData);
        
      } catch (contextError) {
        console.warn('⚠️ Falling back to regular context:', contextError.message);
        
        // Fallback: try without edit context
        response = await makeApiRequest(`${config.endpoints.users}/${userId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`User with ID ${userId} not found`);
          } else if (response.status === 401) {
            throw new Error(`Unauthorized access to user ${userId}`);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        
        userData = await response.json();
        console.log('📥 Single user data received (regular context):', userData);
      }
      console.log('📥 Single user data received:', userData);

      // Process user data - normalize the structure
      const processedUser = {
        id: userData.id,
        name: userData.name || `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
        username: userData.username,
        email: userData.email,
        roles: userData.roles || ['subscriber'],
        avatar_urls: userData.avatar_urls || {},
        date_registered: userData.registered_date || userData.registered || new Date().toISOString(),
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        description: userData.description || '',
        url: userData.url || '',
        nickname: userData.nickname || '',
        meta: userData.meta || {},
        // Add enrollment data placeholder
        enrollmentData: {
          isEnrolled: false,
          progress: Math.floor(Math.random() * 100), // Temporary fake data
          enrollmentDate: null,
          lastActivity: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null
        }
      };

      console.log('✅ User processed:', processedUser);
      return processedUser;
      
    } catch (err) {
      console.error('❌ Error fetching single user:', err);
      setError(err.message || 'Failed to fetch user');
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

  // --- GET USER PROGRESS ---
  const getUserProgress = useCallback(async (userId, timeframe = 'all') => {
    try {
      setUpdating(true);
      setError(null);
      
      console.log('📊 Fetching user progress:', { userId, timeframe });

      // TODO: Replace with actual API call when backend is ready
      // const config = getApiConfig();
      // const response = await makeApiRequest(`${config.baseUrl}/qe/v1/users/${userId}/progress?timeframe=${timeframe}`);
      
      // For now, return simulated progress data
      const simulatedProgress = {
        overall: {
          averageProgress: 50 + Math.floor(Math.random() * 50),
          completedCourses: Math.floor(Math.random() * 8),
          totalCourses: 5 + Math.floor(Math.random() * 10),
          totalTimeSpent: 300 + Math.floor(Math.random() * 2000), // minutes
          lessonsCompleted: 15 + Math.floor(Math.random() * 50),
          totalLessons: 30 + Math.floor(Math.random() * 70),
          certificatesEarned: Math.floor(Math.random() * 5)
        },
        courses: [
          {
            id: 1,
            title: 'WordPress Development Fundamentals',
            progress: 70 + Math.floor(Math.random() * 30),
            timeSpent: 200 + Math.floor(Math.random() * 300),
            lessonsCompleted: 8 + Math.floor(Math.random() * 7),
            totalLessons: 15,
            lastActivity: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
            completed: Math.random() > 0.4
          },
          {
            id: 2,
            title: 'Advanced PHP Patterns',
            progress: 40 + Math.floor(Math.random() * 60),
            timeSpent: 150 + Math.floor(Math.random() * 400),
            lessonsCompleted: 5 + Math.floor(Math.random() * 10),
            totalLessons: 20,
            lastActivity: new Date(Date.now() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000).toISOString(),
            completed: Math.random() > 0.6
          },
          {
            id: 3,
            title: 'React for WordPress',
            progress: 30 + Math.floor(Math.random() * 70),
            timeSpent: 100 + Math.floor(Math.random() * 200),
            lessonsCompleted: 3 + Math.floor(Math.random() * 12),
            totalLessons: 18,
            lastActivity: new Date(Date.now() - Math.floor(Math.random() * 21) * 24 * 60 * 60 * 1000).toISOString(),
            completed: Math.random() > 0.7
          }
        ],
        achievements: [
          {
            id: 1,
            title: 'First Steps',
            description: 'Completed your first lesson',
            earnedDate: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
            icon: 'trophy'
          },
          {
            id: 2,
            title: 'Dedicated Learner', 
            description: 'Studied for 5 consecutive days',
            earnedDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
            icon: 'calendar'
          },
          {
            id: 3,
            title: 'Course Completion',
            description: 'Completed your first course',
            earnedDate: new Date(Date.now() - Math.floor(Math.random() * 45) * 24 * 60 * 60 * 1000).toISOString(),
            icon: 'award'
          }
        ],
        weeklyActivity: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          minutes: Math.floor(Math.random() * 180)
        }))
      };

      console.log('✅ User progress data generated:', simulatedProgress);
      return simulatedProgress;
      
    } catch (err) {
      console.error('❌ Error fetching user progress:', err);
      setError(err.message || 'Failed to fetch user progress');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

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
    getUser,
    getUserProgress,
    enrollUserInCourse,
    unenrollUserFromCourse,
    updateUserRole,
    refreshUsers,
    loadMoreUsers,
    fetchUsers: debouncedFetch // Export debounced version
  };
};

export default useUsers;