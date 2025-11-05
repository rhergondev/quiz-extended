import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  UserPlus,
  UserMinus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  AlertCircle,
  X
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import QEButton from '../common/QEButton';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Panel para gestionar las inscripciones de un usuario
 */
const UserEnrollmentPanel = ({
  userId,
  onCancel,
  availableCourses = [],
  onEnrollUser,
  onUnenrollUser,
  isCollapsed = false,
  className = ''
}) => {
  const { theme } = useTheme();

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [userEnrollments, setUserEnrollments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'enrolled', 'available'
  const [userData, setUserData] = useState(null);

  // --- EFFECTS ---
  useEffect(() => {
    if (userId) {
      loadUserEnrollments();
    }
  }, [userId]);

  // --- DATA LOADING ---
  const loadUserEnrollments = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Get API config for authentication
      const { getApiConfig } = await import('../../api/config/apiConfig.js');
      const config = getApiConfig();
      
      // Load user data (try context=edit first, fallback to public)
      let user = null;
      try {
        const userResponse = await fetch(`/wp-json/wp/v2/users/${userId}?context=edit`, {
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': config.nonce,
          },
          credentials: 'same-origin'
        });
        
        if (userResponse.ok) {
          user = await userResponse.json();
          console.log('✅ User loaded with context=edit');
        } else {
          console.warn(`⚠️ Failed to load user with context=edit (${userResponse.status}), trying public context...`);
          
          // Fallback to public context
          const fallbackResponse = await fetch(`/wp-json/wp/v2/users/${userId}`, {
            headers: {
              'Content-Type': 'application/json',
              'X-WP-Nonce': config.nonce,
            },
            credentials: 'same-origin'
          });
          
          if (fallbackResponse.ok) {
            user = await fallbackResponse.json();
            console.log('✅ User loaded with public context');
          }
        }
      } catch (userError) {
        console.warn('⚠️ Error loading user data:', userError);
      }
      
      // Load enrollments with authentication
      try {
        const enrollmentsResponse = await fetch(`/wp-json/qe/v1/users/${userId}/enrollments`, {
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': config.nonce,
          },
          credentials: 'same-origin'
        });
        
        if (enrollmentsResponse.ok) {
          const enrollments = await enrollmentsResponse.json();
          console.log('✅ Enrollments loaded:', enrollments);
          setUserEnrollments(Array.isArray(enrollments) ? enrollments : []);
        } else {
          console.error(`❌ Failed to load enrollments: ${enrollmentsResponse.status}`);
          setUserEnrollments([]);
        }
      } catch (enrollmentsError) {
        console.error('❌ Error loading enrollments:', enrollmentsError);
        setUserEnrollments([]);
      }

      setUserData(user);
    } catch (error) {
      console.error('❌ Error in loadUserEnrollments:', error);
      setUserEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  // --- EVENT HANDLERS ---
  const handleEnroll = async (courseId) => {
    try {
      setUpdating(true);
      await onEnrollUser?.(userId, courseId);
      await loadUserEnrollments(); // Refresh data
    } catch (error) {
      console.error('Error enrolling user:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUnenroll = async (courseId) => {
    if (!confirm('Are you sure you want to unenroll this user from the course?')) {
      return;
    }

    try {
      setUpdating(true);
      await onUnenrollUser?.(userId, courseId);
      await loadUserEnrollments(); // Refresh data
    } catch (error) {
      console.error('Error unenrolling user:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
  };

  // --- COMPUTED VALUES ---
  const displayName = userData?.name || `${userData?.first_name} ${userData?.last_name}`.trim() || userData?.username;
  const avatarUrl = userData?.avatar_urls?.[48] || userData?.avatar_urls?.[96];

  // Merge available courses with enrollment data
  const coursesWithEnrollmentStatus = useMemo(() => {
    if (!Array.isArray(availableCourses)) {
      console.warn('⚠️ availableCourses is not an array:', availableCourses);
      return [];
    }
    
    // Ensure userEnrollments is an array
    const enrollmentsArray = Array.isArray(userEnrollments) ? userEnrollments : [];
    
    console.log('🔍 DEBUG - Available Courses:', availableCourses);
    console.log('🔍 DEBUG - User Enrollments:', enrollmentsArray);
    
    return availableCourses.map(course => {
      // Parse both values as integers for comparison
      const courseId = parseInt(course.value);
      const enrollment = enrollmentsArray.find(e => {
        const enrollmentCourseId = parseInt(e.course_id);
        console.log(`🔍 Comparing course ${courseId} with enrollment ${enrollmentCourseId}:`, courseId === enrollmentCourseId);
        return enrollmentCourseId === courseId;
      });
      
      const isEnrolled = !!enrollment;
      console.log(`📊 Course "${course.label}" (ID: ${courseId}) - Enrolled: ${isEnrolled}`, enrollment);
      
      return {
        ...course,
        isEnrolled,
        enrollmentData: enrollment || null
      };
    });
  }, [availableCourses, userEnrollments]);

  // Filter courses based on search and status
  const filteredCourses = useMemo(() => {
    let filtered = coursesWithEnrollmentStatus;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus === 'enrolled') {
      filtered = filtered.filter(course => course.isEnrolled);
    } else if (filterStatus === 'available') {
      filtered = filtered.filter(course => !course.isEnrolled);
    }

    return filtered;
  }, [coursesWithEnrollmentStatus, searchTerm, filterStatus]);

  const enrollmentStats = useMemo(() => {
    const total = coursesWithEnrollmentStatus.length;
    const enrolled = coursesWithEnrollmentStatus.filter(c => c.isEnrolled).length;
    const available = total - enrolled;

    return { total, enrolled, available };
  }, [coursesWithEnrollmentStatus]);

  // --- RENDER ---
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className}`}>
        {/* Compact header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex flex-col items-center">
            <BookOpen className="h-6 w-6 text-gray-400 mb-1.5" />
            <p className="text-xs font-medium text-gray-900 text-center leading-tight">Enrollments</p>
          </div>
        </div>
        
        {/* Compact stats */}
        <div className="flex-1 p-2 space-y-2">
          <div className="bg-green-50 rounded px-2 py-1.5 text-center">
            <div className="text-lg font-bold text-green-600">{enrollmentStats.enrolled}</div>
            <div className="text-[10px] text-green-700 uppercase tracking-wide">Enrolled</div>
          </div>
          <div className="bg-gray-50 rounded px-2 py-1.5 text-center">
            <div className="text-lg font-bold text-gray-600">{enrollmentStats.available}</div>
            <div className="text-[10px] text-gray-700 uppercase tracking-wide">Available</div>
          </div>
          <div className="border-t border-gray-200 pt-2 text-center">
            <div className="text-xs text-gray-500">{enrollmentStats.total} total</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col max-w-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 truncate">Course Enrollments</h2>
              <p className="text-sm text-gray-500 truncate">{displayName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md flex-shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{enrollmentStats.total}</div>
            <div className="text-xs text-blue-800">Total Courses</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{enrollmentStats.enrolled}</div>
            <div className="text-xs text-green-800">Enrolled</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">{enrollmentStats.available}</div>
            <div className="text-xs text-gray-800">Available</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-w-0"
          />
        </div>

        {/* Status Filter */}
        <div className="flex space-x-2">
          {[
            { value: 'all', label: 'All Courses', count: enrollmentStats.total },
            { value: 'enrolled', label: 'Enrolled', count: enrollmentStats.enrolled },
            { value: 'available', label: 'Available', count: enrollmentStats.available }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange(filter.value)}
              className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterStatus === filter.value
                  ? 'qe-bg-primary qe-text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black bg-opacity-20 text-xs">
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No courses found</p>
              <p className="text-sm text-gray-400">
                {searchTerm ? 'Try adjusting your search terms' : 'No courses match the selected filter'}
              </p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div
                key={course.value}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{course.label}</h3>
                      {course.isEnrolled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Enrolled
                        </span>
                      )}
                    </div>

                    {course.isEnrolled && course.enrollmentData && (
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Enrolled {new Date(course.enrollmentData.enrollment_date).toLocaleDateString()}
                          </span>
                          {course.enrollmentData.last_activity && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Last activity {new Date(course.enrollmentData.last_activity).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {course.enrollmentData.progress !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Progress
                              </span>
                              <span className="font-medium">{course.enrollmentData.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="qe-bg-accent h-2 rounded-full transition-all duration-300"
                                style={{ width: `${course.enrollmentData.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {course.isEnrolled ? (
                      <QEButton
                        onClick={() => handleUnenroll(course.value)}
                        variant="ghost"
                        size="sm"
                        disabled={updating}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Unenroll
                      </QEButton>
                    ) : (
                      <QEButton
                        onClick={() => handleEnroll(course.value)}
                        variant="ghost"
                        size="sm"
                        disabled={updating}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Enroll
                      </QEButton>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      {updating && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            Updating enrollments...
          </div>
        </div>
      )}
    </div>
  );
};

export default UserEnrollmentPanel;