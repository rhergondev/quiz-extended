/**
 * User Data Validation and Transformation Utilities
 * Handles data formatting for WordPress REST API
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 1.0.0
 */

import {
  sanitizeString,
  sanitizeInteger,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeEnum,
  sanitizeIdArray,
  sanitizeBoolean,
  sanitizeDate,
  validateRequired,
  isValidEmail,
  formatDate,
  formatDateTime,
  capitalize,
  createValidationResult
} from './commonDataUtils.js';

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Valid WordPress user roles
 */
export const VALID_USER_ROLES = [
  'administrator',
  'editor',
  'author',
  'contributor',
  'subscriber'
];

/**
 * Default user meta fields for enrollment tracking
 */
const DEFAULT_ENROLLMENT_META = {
  isEnrolled: false,
  enrollmentDate: null,
  progress: 0,
  lastActivity: null,
  completedLessons: [],
  quizScores: {}
};

// ============================================================
// TRANSFORMATION FOR API REQUESTS
// ============================================================

/**
 * Transform user data for WordPress REST API requests
 * 
 * WordPress REST API structure for users:
 * - Root level: username, email, first_name, last_name, roles, password
 * - meta object: Custom user meta fields
 * 
 * @param {Object} userData - Raw user data from form
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformUserDataForApi = (userData) => {
  console.log('🔄 transformUserDataForApi - Input:', userData);

  const transformed = {};

  // ============================================================
  // ROOT LEVEL FIELDS (WordPress standard)
  // ============================================================
  
  // Username (only for new users)
  if (userData.username !== undefined) {
    transformed.username = sanitizeString(userData.username).toLowerCase();
  }

  // Email - required
  if (userData.email !== undefined) {
    transformed.email = sanitizeEmail(userData.email);
  }

  // Password (only when creating or updating password)
  if (userData.password !== undefined && userData.password !== '') {
    transformed.password = userData.password; // Don't sanitize passwords
  }

  // First Name
  if (userData.first_name !== undefined) {
    transformed.first_name = sanitizeString(userData.first_name);
  } else if (userData.firstName !== undefined) {
    transformed.first_name = sanitizeString(userData.firstName);
  }

  // Last Name
  if (userData.last_name !== undefined) {
    transformed.last_name = sanitizeString(userData.last_name);
  } else if (userData.lastName !== undefined) {
    transformed.last_name = sanitizeString(userData.lastName);
  }

  // Display Name
  if (userData.display_name !== undefined) {
    transformed.display_name = sanitizeString(userData.display_name);
  } else if (userData.displayName !== undefined) {
    transformed.display_name = sanitizeString(userData.displayName);
  }

  // Nickname
  if (userData.nickname !== undefined) {
    transformed.nickname = sanitizeString(userData.nickname);
  }

  // Description / Bio
  if (userData.description !== undefined) {
    transformed.description = sanitizeString(userData.description);
  } else if (userData.bio !== undefined) {
    transformed.description = sanitizeString(userData.bio);
  }

  // URL
  if (userData.url !== undefined) {
    transformed.url = sanitizeUrl(userData.url);
  }

  // Roles (array)
  if (userData.roles !== undefined) {
    transformed.roles = Array.isArray(userData.roles) 
      ? userData.roles.filter(role => VALID_USER_ROLES.includes(role))
      : [VALID_USER_ROLES[VALID_USER_ROLES.length - 1]]; // Default to subscriber
  }

  // ============================================================
  // META FIELDS (Custom user meta)
  // ============================================================
  
  if (userData.meta && typeof userData.meta === 'object') {
    transformed.meta = { ...userData.meta };
  }

  console.log('🔄 transformUserDataForApi - Output:', transformed);
  return transformed;
};

/**
 * Transform enrollment data for API request
 * @param {number} userId - User ID
 * @param {number} courseId - Course ID
 * @param {Object} enrollmentData - Enrollment data
 * @returns {Object} Formatted meta data for WordPress
 */
export const transformEnrollmentDataForApi = (userId, courseId, enrollmentData = {}) => {
  const metaData = {};

  // Enrollment flag
  metaData[`_enrolled_course_${courseId}`] = sanitizeBoolean(
    enrollmentData.enroll !== undefined ? enrollmentData.enroll : true
  );

  // Enrollment date
  if (enrollmentData.enrollmentDate) {
    metaData[`_enrolled_course_${courseId}_date`] = sanitizeDate(enrollmentData.enrollmentDate);
  } else {
    metaData[`_enrolled_course_${courseId}_date`] = new Date().toISOString();
  }

  // Order ID (if enrollment is from purchase)
  if (enrollmentData.orderId) {
    metaData[`_enrolled_course_${courseId}_order_id`] = sanitizeInteger(enrollmentData.orderId);
  }

  // Progress
  metaData[`_course_${courseId}_progress`] = sanitizeInteger(
    enrollmentData.progress || 0,
    0,
    0
  );

  // Last activity
  if (enrollmentData.lastActivity) {
    metaData[`_course_${courseId}_last_activity`] = sanitizeDate(enrollmentData.lastActivity);
  } else {
    metaData[`_course_${courseId}_last_activity`] = new Date().toISOString();
  }

  return metaData;
};

// ============================================================
// SANITIZATION FOR DISPLAY
// ============================================================

/**
 * Sanitize user data from API for display in React components
 * Normalizes WordPress REST API response format
 * 
 * @param {Object} userData - Raw user data from WordPress API
 * @returns {Object} Sanitized user data
 */
export const sanitizeUserData = (userData) => {
  if (!userData) {
    console.warn('⚠️ sanitizeUserData - No data provided');
    return null;
  }

  const sanitized = {
    // Core WordPress user fields
    id: userData.id || 0,
    username: sanitizeString(userData.username || userData.user_login),
    email: sanitizeEmail(userData.email || userData.user_email),
    firstName: sanitizeString(userData.first_name),
    lastName: sanitizeString(userData.last_name),
    displayName: sanitizeString(userData.display_name || userData.name),
    nickname: sanitizeString(userData.nickname),
    description: sanitizeString(userData.description),
    url: sanitizeUrl(userData.url),
    
    // User roles
    roles: Array.isArray(userData.roles) ? userData.roles : [],
    
    // Capabilities
    capabilities: userData.capabilities || {},
    
    // Dates
    registered: userData.registered_date || userData.date_registered || userData.registered || '',
    
    // Avatar URLs
    avatar_urls: userData.avatar_urls || {},
    
    // Meta data
    meta: userData.meta || {},
    
    // Links
    _links: userData._links || {}
  };

  return sanitized;
};

/**
 * Extract enrollment data from user meta
 * @param {Object} userMeta - User meta object
 * @param {number} courseId - Course ID to extract enrollment for
 * @returns {Object} Enrollment data
 */
export const extractEnrollmentData = (userMeta, courseId) => {
  if (!userMeta || !courseId) {
    return DEFAULT_ENROLLMENT_META;
  }

  const enrollmentKey = `_enrolled_course_${courseId}`;
  const enrollmentDateKey = `${enrollmentKey}_date`;
  const progressKey = `_course_${courseId}_progress`;
  const lastActivityKey = `_course_${courseId}_last_activity`;

  return {
    isEnrolled: sanitizeBoolean(userMeta[enrollmentKey]),
    enrollmentDate: userMeta[enrollmentDateKey] || null,
    progress: sanitizeInteger(userMeta[progressKey], 0, 0),
    lastActivity: userMeta[lastActivityKey] || null,
    completedLessons: sanitizeIdArray(userMeta[`_course_${courseId}_completed_lessons`]),
    quizScores: userMeta[`_course_${courseId}_quiz_scores`] || {}
  };
};

/**
 * Get all enrolled courses for a user
 * @param {Object} userMeta - User meta object
 * @returns {Array} Array of enrolled course IDs
 */
export const getEnrolledCourses = (userMeta) => {
  if (!userMeta) return [];

  const enrolledCourses = [];

  Object.keys(userMeta).forEach(key => {
    if (key.startsWith('_enrolled_course_') && 
        !key.includes('_date') && 
        !key.includes('_order_id') &&
        userMeta[key]) {
      const courseId = key.replace('_enrolled_course_', '');
      if (!isNaN(courseId)) {
        enrolledCourses.push(parseInt(courseId));
      }
    }
  });

  return enrolledCourses;
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate user data before API request
 * 
 * @param {Object} userData - User data to validate
 * @param {boolean} isUpdate - Whether this is an update (vs create)
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateUserData = (userData, isUpdate = false) => {
  const errors = [];

  // ============================================================
  // REQUIRED FIELDS (for creation)
  // ============================================================
  
  if (!isUpdate) {
    // Username required for new users
    const usernameError = validateRequired(userData.username, 'Username');
    if (usernameError) errors.push(usernameError);

    // Username format validation
    if (userData.username) {
      const usernameRegex = /^[a-z0-9_-]{3,20}$/;
      if (!usernameRegex.test(userData.username)) {
        errors.push('Username must be 3-20 characters, lowercase letters, numbers, hyphens and underscores only');
      }
    }

    // Password required for new users
    const passwordError = validateRequired(userData.password, 'Password');
    if (passwordError) errors.push(passwordError);

    // Password strength validation
    if (userData.password && userData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
  }

  // Email required (always)
  const emailError = validateRequired(userData.email, 'Email');
  if (emailError) {
    errors.push(emailError);
  } else if (!isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  }

  // ============================================================
  // ROLE VALIDATION
  // ============================================================
  
  if (userData.roles) {
    if (!Array.isArray(userData.roles)) {
      errors.push('Roles must be an array');
    } else if (userData.roles.length > 0) {
      const invalidRoles = userData.roles.filter(role => !VALID_USER_ROLES.includes(role));
      if (invalidRoles.length > 0) {
        errors.push(`Invalid roles: ${invalidRoles.join(', ')}. Must be one of: ${VALID_USER_ROLES.join(', ')}`);
      }
    }
  }

  // ============================================================
  // URL VALIDATION
  // ============================================================
  
  if (userData.url && userData.url !== '') {
    try {
      new URL(userData.url);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  return createValidationResult(errors);
};

/**
 * Validate enrollment data
 * @param {number} userId - User ID
 * @param {number} courseId - Course ID
 * @returns {Object} Validation result
 */
export const validateEnrollmentData = (userId, courseId) => {
  const errors = [];

  if (!userId || userId <= 0) {
    errors.push('Valid user ID is required');
  }

  if (!courseId || courseId <= 0) {
    errors.push('Valid course ID is required');
  }

  return createValidationResult(errors);
};

// ============================================================
// FORMATTING FOR DISPLAY
// ============================================================

/**
 * Format user data for display in lists/cards
 * @param {Object} user - User data
 * @returns {Object} Formatted user
 */
export const formatUserForDisplay = (user) => {
  const sanitized = sanitizeUserData(user);

  if (!sanitized) {
    return null;
  }

  // Get full name
  const fullName = [sanitized.firstName, sanitized.lastName]
    .filter(Boolean)
    .join(' ') || sanitized.displayName || sanitized.username;

  // Get initials for avatar
  const initials = fullName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  // Get primary role
  const primaryRole = sanitized.roles[0] || 'subscriber';

  return {
    ...sanitized,
    // Formatted values for display
    fullName,
    initials,
    primaryRole,
    formattedRole: capitalize(primaryRole),
    formattedRegistered: formatDate(sanitized.registered),
    formattedRegisteredDateTime: formatDateTime(sanitized.registered),
    
    // Avatar
    avatarUrl: sanitized.avatar_urls?.['96'] || sanitized.avatar_urls?.['48'] || null,
    
    // Role badges
    isAdministrator: primaryRole === 'administrator',
    isEditor: primaryRole === 'editor',
    isAuthor: primaryRole === 'author',
    isContributor: primaryRole === 'contributor',
    isSubscriber: primaryRole === 'subscriber',
    
    // Has info
    hasDescription: sanitized.description.length > 0,
    hasUrl: sanitized.url.length > 0
  };
};

/**
 * Format enrollment data for display
 * @param {Object} enrollmentData - Enrollment data
 * @returns {Object} Formatted enrollment data
 */
export const formatEnrollmentForDisplay = (enrollmentData) => {
  if (!enrollmentData) {
    return DEFAULT_ENROLLMENT_META;
  }

  return {
    ...enrollmentData,
    formattedEnrollmentDate: enrollmentData.enrollmentDate 
      ? formatDate(enrollmentData.enrollmentDate)
      : 'Not enrolled',
    formattedLastActivity: enrollmentData.lastActivity
      ? formatDate(enrollmentData.lastActivity)
      : 'No activity',
    formattedProgress: `${enrollmentData.progress}%`,
    progressDecimal: enrollmentData.progress / 100,
    
    // Status
    isActive: enrollmentData.lastActivity && 
              (new Date() - new Date(enrollmentData.lastActivity)) < (30 * 24 * 60 * 60 * 1000), // Active in last 30 days
    isCompleted: enrollmentData.progress >= 100,
    inProgress: enrollmentData.progress > 0 && enrollmentData.progress < 100,
    notStarted: enrollmentData.progress === 0
  };
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if user has specific role
 * @param {Object} user - User data
 * @param {string} role - Role to check
 * @returns {boolean} True if user has role
 */
export const userHasRole = (user, role) => {
  const sanitized = sanitizeUserData(user);
  return sanitized ? sanitized.roles.includes(role) : false;
};

/**
 * Check if user is enrolled in course
 * @param {Object} user - User data
 * @param {number} courseId - Course ID
 * @returns {boolean} True if enrolled
 */
export const isUserEnrolledInCourse = (user, courseId) => {
  if (!user || !user.meta || !courseId) return false;
  
  const enrollmentData = extractEnrollmentData(user.meta, courseId);
  return enrollmentData.isEnrolled;
};

/**
 * Get user's progress in course
 * @param {Object} user - User data
 * @param {number} courseId - Course ID
 * @returns {number} Progress percentage (0-100)
 */
export const getUserCourseProgress = (user, courseId) => {
  if (!user || !user.meta || !courseId) return 0;
  
  const enrollmentData = extractEnrollmentData(user.meta, courseId);
  return enrollmentData.progress;
};

/**
 * Sort users by name
 * @param {Array} users - Array of users
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted users
 */
export const sortUsersByName = (users, order = 'asc') => {
  return [...users].sort((a, b) => {
    const nameA = (a.display_name || a.displayName || a.username || '').toLowerCase();
    const nameB = (b.display_name || b.displayName || b.username || '').toLowerCase();
    
    if (order === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });
};

/**
 * Sort users by registration date
 * @param {Array} users - Array of users
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted users
 */
export const sortUsersByRegistrationDate = (users, order = 'desc') => {
  return [...users].sort((a, b) => {
    const dateA = new Date(a.registered || a.date_registered || 0);
    const dateB = new Date(b.registered || b.date_registered || 0);
    
    if (order === 'asc') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });
};

/**
 * Filter users by role
 * @param {Array} users - Array of users
 * @param {string} role - Role to filter by
 * @returns {Array} Filtered users
 */
export const filterUsersByRole = (users, role) => {
  if (!role || role === 'all') return users;
  
  return users.filter(user => {
    const userRoles = user.roles || [];
    return userRoles.includes(role);
  });
};

/**
 * Filter users by enrollment status
 * @param {Array} users - Array of users
 * @param {number} courseId - Course ID
 * @param {string} status - 'enrolled' or 'not_enrolled'
 * @returns {Array} Filtered users
 */
export const filterUsersByEnrollmentStatus = (users, courseId, status) => {
  if (!status || status === 'all') return users;
  
  return users.filter(user => {
    const isEnrolled = isUserEnrolledInCourse(user, courseId);
    return status === 'enrolled' ? isEnrolled : !isEnrolled;
  });
};

/**
 * Group users by role
 * @param {Array} users - Array of users
 * @returns {Object} Users grouped by role
 */
export const groupUsersByRole = (users) => {
  return users.reduce((groups, user) => {
    const role = user.roles?.[0] || 'subscriber';
    if (!groups[role]) {
      groups[role] = [];
    }
    groups[role].push(user);
    return groups;
  }, {});
};

/**
 * Calculate user statistics
 * @param {Array} users - Array of users
 * @param {number} courseId - Optional course ID for enrollment stats
 * @returns {Object} User statistics
 */
export const calculateUserStatistics = (users, courseId = null) => {
  const stats = {
    total: users.length,
    byRole: {},
    registered: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0
    }
  };

  // Role statistics
  VALID_USER_ROLES.forEach(role => {
    stats.byRole[role] = users.filter(user => 
      user.roles?.includes(role)
    ).length;
  });

  // Registration statistics
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  users.forEach(user => {
    const registrationDate = new Date(user.registered || user.date_registered);
    
    if (registrationDate >= todayStart) {
      stats.registered.today++;
    }
    if (registrationDate >= weekStart) {
      stats.registered.thisWeek++;
    }
    if (registrationDate >= monthStart) {
      stats.registered.thisMonth++;
    }
  });

  // Enrollment statistics (if course ID provided)
  if (courseId) {
    stats.enrollment = {
      enrolled: 0,
      notEnrolled: 0,
      averageProgress: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0
    };

    let totalProgress = 0;

    users.forEach(user => {
      const isEnrolled = isUserEnrolledInCourse(user, courseId);
      
      if (isEnrolled) {
        stats.enrollment.enrolled++;
        const progress = getUserCourseProgress(user, courseId);
        totalProgress += progress;

        if (progress >= 100) {
          stats.enrollment.completed++;
        } else if (progress > 0) {
          stats.enrollment.inProgress++;
        } else {
          stats.enrollment.notStarted++;
        }
      } else {
        stats.enrollment.notEnrolled++;
      }
    });

    if (stats.enrollment.enrolled > 0) {
      stats.enrollment.averageProgress = Math.round(
        totalProgress / stats.enrollment.enrolled
      );
    }
  }

  return stats;
};

/**
 * Search users by query
 * @param {Array} users - Array of users
 * @param {string} query - Search query
 * @returns {Array} Filtered users
 */
export const searchUsers = (users, query) => {
  if (!query || query.trim() === '') return users;
  
  const searchTerm = query.toLowerCase().trim();
  
  return users.filter(user => {
    const searchableFields = [
      user.username,
      user.email,
      user.display_name || user.displayName,
      user.first_name || user.firstName,
      user.last_name || user.lastName,
      user.nickname
    ].filter(Boolean).map(field => field.toLowerCase());
    
    return searchableFields.some(field => field.includes(searchTerm));
  });
};

/**
 * Get user display name (prioritizes display_name, falls back to username)
 * @param {Object} user - User data
 * @returns {string} Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return '';
  
  return user.display_name || 
         user.displayName || 
         [user.first_name || user.firstName, user.last_name || user.lastName]
           .filter(Boolean).join(' ') ||
         user.username ||
         user.email ||
         'Unknown User';
};

/**
 * Generate avatar initials
 * @param {Object} user - User data
 * @returns {string} Initials (2 characters)
 */
export const getUserInitials = (user) => {
  const displayName = getUserDisplayName(user);
  
  return displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};