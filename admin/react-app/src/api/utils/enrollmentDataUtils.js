/**
 * Enrollment Data Validation and Transformation Utilities
 * Handles enrollment relationships between users and courses
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 1.0.0
 */

import {
  sanitizeInteger,
  sanitizeBoolean,
  sanitizeDate,
  sanitizeDateTime,
  sanitizeIdArray,
  validateRequired,
  formatDate,
  formatDateTime,
  createValidationResult
} from './commonDataUtils.js';

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Default enrollment data structure
 */
const DEFAULT_ENROLLMENT_DATA = {
  userId: null,
  courseId: null,
  isEnrolled: false,
  enrollmentDate: null,
  completionDate: null,
  progress: 0,
  lastActivity: null,
  status: 'active',
  orderId: null,
  completedLessons: [],
  quizAttempts: [],
  totalTimeSpent: 0
};

/**
 * Valid enrollment statuses
 */
export const VALID_ENROLLMENT_STATUSES = [
  'active',
  'completed',
  'expired',
  'suspended',
  'cancelled'
];

/**
 * Enrollment meta key patterns
 */
export const ENROLLMENT_META_KEYS = {
  enrolled: (courseId) => `_enrolled_course_${courseId}`,
  enrollmentDate: (courseId) => `_enrolled_course_${courseId}_date`,
  orderId: (courseId) => `_enrolled_course_${courseId}_order_id`,
  progress: (courseId) => `_course_${courseId}_progress`,
  lastActivity: (courseId) => `_course_${courseId}_last_activity`,
  completedLessons: (courseId) => `_course_${courseId}_completed_lessons`,
  completionDate: (courseId) => `_course_${courseId}_completion_date`,
  timeSpent: (courseId) => `_course_${courseId}_time_spent`,
  quizScores: (courseId) => `_course_${courseId}_quiz_scores`
};

// ============================================================
// TRANSFORMATION FOR API REQUESTS
// ============================================================

/**
 * Transform enrollment data to WordPress user meta format
 * @param {number} userId - User ID
 * @param {number} courseId - Course ID
 * @param {Object} enrollmentData - Enrollment data
 * @returns {Object} User meta object for WordPress API
 */
export const transformEnrollmentDataForApi = (userId, courseId, enrollmentData = {}) => {
  console.log('🔄 transformEnrollmentDataForApi - Input:', { userId, courseId, enrollmentData });

  const meta = {};

  // Enrollment flag
  const isEnrolled = sanitizeBoolean(
    enrollmentData.isEnrolled !== undefined ? enrollmentData.isEnrolled : true
  );
  meta[ENROLLMENT_META_KEYS.enrolled(courseId)] = isEnrolled;

  // Enrollment date
  if (enrollmentData.enrollmentDate) {
    meta[ENROLLMENT_META_KEYS.enrollmentDate(courseId)] = sanitizeDateTime(
      enrollmentData.enrollmentDate
    );
  } else if (isEnrolled) {
    meta[ENROLLMENT_META_KEYS.enrollmentDate(courseId)] = new Date().toISOString();
  }

  // Order ID (for purchases)
  if (enrollmentData.orderId) {
    meta[ENROLLMENT_META_KEYS.orderId(courseId)] = sanitizeInteger(
      enrollmentData.orderId,
      0,
      0
    );
  }

  // Progress (0-100)
  meta[ENROLLMENT_META_KEYS.progress(courseId)] = sanitizeInteger(
    enrollmentData.progress || 0,
    0,
    0
  );

  // Last activity
  if (enrollmentData.lastActivity) {
    meta[ENROLLMENT_META_KEYS.lastActivity(courseId)] = sanitizeDateTime(
      enrollmentData.lastActivity
    );
  } else if (isEnrolled) {
    meta[ENROLLMENT_META_KEYS.lastActivity(courseId)] = new Date().toISOString();
  }

  // Completed lessons
  if (enrollmentData.completedLessons) {
    meta[ENROLLMENT_META_KEYS.completedLessons(courseId)] = sanitizeIdArray(
      enrollmentData.completedLessons
    );
  }

  // Completion date (if completed)
  if (enrollmentData.completionDate) {
    meta[ENROLLMENT_META_KEYS.completionDate(courseId)] = sanitizeDateTime(
      enrollmentData.completionDate
    );
  } else if (enrollmentData.progress >= 100) {
    meta[ENROLLMENT_META_KEYS.completionDate(courseId)] = new Date().toISOString();
  }

  // Time spent (in minutes)
  if (enrollmentData.timeSpent !== undefined) {
    meta[ENROLLMENT_META_KEYS.timeSpent(courseId)] = sanitizeInteger(
      enrollmentData.timeSpent,
      0,
      0
    );
  }

  // Quiz scores
  if (enrollmentData.quizScores) {
    meta[ENROLLMENT_META_KEYS.quizScores(courseId)] = enrollmentData.quizScores;
  }

  console.log('🔄 transformEnrollmentDataForApi - Output:', meta);
  return meta;
};

/**
 * Transform unenrollment data (sets enrollment to false)
 * @param {number} courseId - Course ID
 * @returns {Object} User meta object for WordPress API
 */
export const transformUnenrollmentDataForApi = (courseId) => {
  const meta = {};
  
  // Set all enrollment-related fields to null/false
  meta[ENROLLMENT_META_KEYS.enrolled(courseId)] = false;
  
  // Optionally, you can delete these by setting to null
  // or keep the historical data and just mark as not enrolled
  
  return meta;
};

// ============================================================
// EXTRACTION FROM USER META
// ============================================================

/**
 * Extract enrollment data from WordPress user meta
 * @param {Object} userMeta - User meta object from WordPress
 * @param {number} courseId - Course ID
 * @returns {Object} Normalized enrollment data
 */
export const extractEnrollmentData = (userMeta, courseId) => {
  if (!userMeta || !courseId) {
    return { ...DEFAULT_ENROLLMENT_DATA, courseId };
  }

  const enrolledKey = ENROLLMENT_META_KEYS.enrolled(courseId);
  const isEnrolled = sanitizeBoolean(userMeta[enrolledKey]);

  if (!isEnrolled) {
    return { ...DEFAULT_ENROLLMENT_DATA, courseId, isEnrolled: false };
  }

  const enrollment = {
    courseId: sanitizeInteger(courseId),
    isEnrolled: true,
    enrollmentDate: userMeta[ENROLLMENT_META_KEYS.enrollmentDate(courseId)] || null,
    orderId: sanitizeInteger(userMeta[ENROLLMENT_META_KEYS.orderId(courseId)], null),
    progress: sanitizeInteger(userMeta[ENROLLMENT_META_KEYS.progress(courseId)], 0, 0),
    lastActivity: userMeta[ENROLLMENT_META_KEYS.lastActivity(courseId)] || null,
    completedLessons: sanitizeIdArray(
      userMeta[ENROLLMENT_META_KEYS.completedLessons(courseId)]
    ),
    completionDate: userMeta[ENROLLMENT_META_KEYS.completionDate(courseId)] || null,
    totalTimeSpent: sanitizeInteger(userMeta[ENROLLMENT_META_KEYS.timeSpent(courseId)], 0, 0),
    quizScores: userMeta[ENROLLMENT_META_KEYS.quizScores(courseId)] || {}
  };

  // Determine status
  enrollment.status = determineEnrollmentStatus(enrollment);

  return enrollment;
};

/**
 * Extract all enrollments for a user
 * @param {Object} userMeta - User meta object from WordPress
 * @returns {Array} Array of enrollment data objects
 */
export const extractAllEnrollments = (userMeta) => {
  if (!userMeta) return [];

  const enrollments = [];
  const enrollmentKeys = Object.keys(userMeta).filter(key => 
    key.startsWith('_enrolled_course_') &&
    !key.includes('_date') &&
    !key.includes('_order_id')
  );

  enrollmentKeys.forEach(key => {
    const courseId = parseInt(key.replace('_enrolled_course_', ''));
    if (!isNaN(courseId) && userMeta[key]) {
      enrollments.push(extractEnrollmentData(userMeta, courseId));
    }
  });

  return enrollments;
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate enrollment data
 * @param {Object} enrollmentData - Enrollment data to validate
 * @returns {Object} Validation result
 */
export const validateEnrollmentData = (enrollmentData) => {
  const errors = [];

  // User ID validation
  const userIdError = validateRequired(enrollmentData.userId, 'User ID');
  if (userIdError) {
    errors.push(userIdError);
  } else if (enrollmentData.userId <= 0) {
    errors.push('User ID must be a positive number');
  }

  // Course ID validation
  const courseIdError = validateRequired(enrollmentData.courseId, 'Course ID');
  if (courseIdError) {
    errors.push(courseIdError);
  } else if (enrollmentData.courseId <= 0) {
    errors.push('Course ID must be a positive number');
  }

  // Progress validation (0-100)
  if (enrollmentData.progress !== undefined) {
    const progress = parseInt(enrollmentData.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      errors.push('Progress must be between 0 and 100');
    }
  }

  // Status validation
  if (enrollmentData.status && !VALID_ENROLLMENT_STATUSES.includes(enrollmentData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_ENROLLMENT_STATUSES.join(', ')}`);
  }

  // Time spent validation
  if (enrollmentData.totalTimeSpent !== undefined) {
    const timeSpent = parseInt(enrollmentData.totalTimeSpent);
    if (isNaN(timeSpent) || timeSpent < 0) {
      errors.push('Time spent must be a positive number');
    }
  }

  return createValidationResult(errors);
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Determine enrollment status based on enrollment data
 * @param {Object} enrollment - Enrollment data
 * @returns {string} Enrollment status
 */
const determineEnrollmentStatus = (enrollment) => {
  if (!enrollment.isEnrolled) {
    return 'cancelled';
  }

  if (enrollment.progress >= 100 && enrollment.completionDate) {
    return 'completed';
  }

  // Check for inactivity (no activity in last 60 days = suspended)
  if (enrollment.lastActivity) {
    const lastActivity = new Date(enrollment.lastActivity);
    const daysSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60 * 24);
    
    if (daysSinceActivity > 60) {
      return 'suspended';
    }
  }

  return 'active';
};

/**
 * Check if enrollment is active
 * @param {Object} enrollment - Enrollment data
 * @returns {boolean} True if active
 */
export const isEnrollmentActive = (enrollment) => {
  return enrollment && enrollment.isEnrolled && enrollment.status === 'active';
};

/**
 * Check if enrollment is completed
 * @param {Object} enrollment - Enrollment data
 * @returns {boolean} True if completed
 */
export const isEnrollmentCompleted = (enrollment) => {
  return enrollment && enrollment.progress >= 100 && enrollment.completionDate;
};

/**
 * Calculate days since enrollment
 * @param {Object} enrollment - Enrollment data
 * @returns {number} Days since enrollment
 */
export const getDaysSinceEnrollment = (enrollment) => {
  if (!enrollment || !enrollment.enrollmentDate) return 0;
  
  const enrollmentDate = new Date(enrollment.enrollmentDate);
  const now = new Date();
  const diffTime = Math.abs(now - enrollmentDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate days since last activity
 * @param {Object} enrollment - Enrollment data
 * @returns {number} Days since last activity
 */
export const getDaysSinceLastActivity = (enrollment) => {
  if (!enrollment || !enrollment.lastActivity) return null;
  
  const lastActivity = new Date(enrollment.lastActivity);
  const now = new Date();
  const diffTime = Math.abs(now - lastActivity);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format enrollment for display
 * @param {Object} enrollment - Enrollment data
 * @returns {Object} Formatted enrollment data
 */
export const formatEnrollmentForDisplay = (enrollment) => {
  if (!enrollment) {
    return {
      ...DEFAULT_ENROLLMENT_DATA,
      formattedStatus: 'Not Enrolled',
      formattedProgress: '0%',
      isActive: false,
      isCompleted: false
    };
  }

  const daysSinceEnrollment = getDaysSinceEnrollment(enrollment);
  const daysSinceActivity = getDaysSinceLastActivity(enrollment);

  return {
    ...enrollment,
    // Formatted dates
    formattedEnrollmentDate: enrollment.enrollmentDate 
      ? formatDate(enrollment.enrollmentDate)
      : 'N/A',
    formattedCompletionDate: enrollment.completionDate
      ? formatDate(enrollment.completionDate)
      : null,
    formattedLastActivity: enrollment.lastActivity
      ? formatDate(enrollment.lastActivity)
      : 'No activity',
    
    // Formatted progress
    formattedProgress: `${enrollment.progress}%`,
    progressDecimal: enrollment.progress / 100,
    
    // Formatted status
    formattedStatus: enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1),
    
    // Time metrics
    formattedTimeSpent: formatTimeSpent(enrollment.totalTimeSpent),
    daysSinceEnrollment,
    daysSinceActivity,
    
    // Status booleans
    isActive: enrollment.status === 'active',
    isCompleted: enrollment.status === 'completed',
    isExpired: enrollment.status === 'expired',
    isSuspended: enrollment.status === 'suspended',
    isCancelled: enrollment.status === 'cancelled',
    
    // Progress booleans
    notStarted: enrollment.progress === 0,
    inProgress: enrollment.progress > 0 && enrollment.progress < 100,
    completed: enrollment.progress >= 100,
    
    // Activity booleans
    recentlyActive: daysSinceActivity !== null && daysSinceActivity <= 7,
    inactiveWarning: daysSinceActivity !== null && daysSinceActivity > 30,
    
    // Completion metrics
    completedLessonsCount: enrollment.completedLessons.length
  };
};

/**
 * Format time spent in human-readable format
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time
 */
const formatTimeSpent = (minutes) => {
  if (!minutes || minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

/**
 * Calculate completion percentage based on completed lessons
 * @param {Array} completedLessons - Array of completed lesson IDs
 * @param {number} totalLessons - Total number of lessons in course
 * @returns {number} Completion percentage (0-100)
 */
export const calculateProgressFromLessons = (completedLessons, totalLessons) => {
  if (!totalLessons || totalLessons === 0) return 0;
  
  const completed = Array.isArray(completedLessons) ? completedLessons.length : 0;
  return Math.min(Math.round((completed / totalLessons) * 100), 100);
};

/**
 * Sort enrollments by enrollment date
 * @param {Array} enrollments - Array of enrollments
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted enrollments
 */
export const sortEnrollmentsByDate = (enrollments, order = 'desc') => {
  return [...enrollments].sort((a, b) => {
    const dateA = new Date(a.enrollmentDate || 0);
    const dateB = new Date(b.enrollmentDate || 0);
    
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Sort enrollments by progress
 * @param {Array} enrollments - Array of enrollments
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted enrollments
 */
export const sortEnrollmentsByProgress = (enrollments, order = 'desc') => {
  return [...enrollments].sort((a, b) => {
    const progressA = a.progress || 0;
    const progressB = b.progress || 0;
    
    return order === 'asc' ? progressA - progressB : progressB - progressA;
  });
};

/**
 * Sort enrollments by last activity
 * @param {Array} enrollments - Array of enrollments
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted enrollments
 */
export const sortEnrollmentsByActivity = (enrollments, order = 'desc') => {
  return [...enrollments].sort((a, b) => {
    const dateA = new Date(a.lastActivity || 0);
    const dateB = new Date(b.lastActivity || 0);
    
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Filter enrollments by status
 * @param {Array} enrollments - Array of enrollments
 * @param {string} status - Status to filter by
 * @returns {Array} Filtered enrollments
 */
export const filterEnrollmentsByStatus = (enrollments, status) => {
  if (!status || status === 'all') return enrollments;
  
  return enrollments.filter(enrollment => enrollment.status === status);
};

/**
 * Filter enrollments by progress range
 * @param {Array} enrollments - Array of enrollments
 * @param {number} minProgress - Minimum progress (0-100)
 * @param {number} maxProgress - Maximum progress (0-100)
 * @returns {Array} Filtered enrollments
 */
export const filterEnrollmentsByProgress = (enrollments, minProgress = 0, maxProgress = 100) => {
  return enrollments.filter(enrollment => {
    const progress = enrollment.progress || 0;
    return progress >= minProgress && progress <= maxProgress;
  });
};

/**
 * Group enrollments by status
 * @param {Array} enrollments - Array of enrollments
 * @returns {Object} Enrollments grouped by status
 */
export const groupEnrollmentsByStatus = (enrollments) => {
  return enrollments.reduce((groups, enrollment) => {
    const status = enrollment.status || 'active';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(enrollment);
    return groups;
  }, {});
};

/**
 * Calculate enrollment statistics
 * @param {Array} enrollments - Array of enrollments
 * @returns {Object} Enrollment statistics
 */
export const calculateEnrollmentStatistics = (enrollments) => {
  const stats = {
    total: enrollments.length,
    byStatus: {},
    averageProgress: 0,
    averageTimeSpent: 0,
    totalTimeSpent: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    recentlyActive: 0,
    inactive: 0
  };

  if (enrollments.length === 0) return stats;

  let totalProgress = 0;
  let totalTimeSpent = 0;

  // Calculate status distribution
  VALID_ENROLLMENT_STATUSES.forEach(status => {
    stats.byStatus[status] = 0;
  });

  const now = new Date();

  enrollments.forEach(enrollment => {
    // Status counts
    const status = enrollment.status || 'active';
    if (stats.byStatus[status] !== undefined) {
      stats.byStatus[status]++;
    }

    // Progress
    const progress = enrollment.progress || 0;
    totalProgress += progress;

    if (progress >= 100) {
      stats.completed++;
    } else if (progress > 0) {
      stats.inProgress++;
    } else {
      stats.notStarted++;
    }

    // Time spent
    totalTimeSpent += enrollment.totalTimeSpent || 0;

    // Activity
    if (enrollment.lastActivity) {
      const lastActivity = new Date(enrollment.lastActivity);
      const daysSince = (now - lastActivity) / (1000 * 60 * 60 * 24);
      
      if (daysSince <= 7) {
        stats.recentlyActive++;
      } else if (daysSince > 30) {
        stats.inactive++;
      }
    }
  });

  stats.averageProgress = Math.round(totalProgress / enrollments.length);
  stats.totalTimeSpent = totalTimeSpent;
  stats.averageTimeSpent = Math.round(totalTimeSpent / enrollments.length);

  return stats;
};

/**
 * Get enrollments needing attention (low progress, inactive)
 * @param {Array} enrollments - Array of enrollments
 * @returns {Array} Enrollments needing attention
 */
export const getEnrollmentsNeedingAttention = (enrollments) => {
  const now = new Date();
  
  return enrollments.filter(enrollment => {
    // Skip completed enrollments
    if (enrollment.status === 'completed') return false;

    // Check for low progress (< 20% after 7 days)
    const daysSinceEnrollment = getDaysSinceEnrollment(enrollment);
    if (daysSinceEnrollment > 7 && enrollment.progress < 20) {
      return true;
    }

    // Check for inactivity (no activity in 14+ days)
    if (enrollment.lastActivity) {
      const lastActivity = new Date(enrollment.lastActivity);
      const daysSince = (now - lastActivity) / (1000 * 60 * 60 * 24);
      if (daysSince > 14) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Get recently completed enrollments
 * @param {Array} enrollments - Array of enrollments
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Array} Recently completed enrollments
 */
export const getRecentlyCompleted = (enrollments, days = 7) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return enrollments.filter(enrollment => {
    if (!enrollment.completionDate) return false;
    
    const completionDate = new Date(enrollment.completionDate);
    return completionDate >= cutoffDate;
  });
};

/**
 * Get top performers (highest progress or fastest completion)
 * @param {Array} enrollments - Array of enrollments
 * @param {number} limit - Number of top performers to return
 * @returns {Array} Top performing enrollments
 */
export const getTopPerformers = (enrollments, limit = 10) => {
  return [...enrollments]
    .sort((a, b) => {
      // Prioritize completed
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (b.status === 'completed' && a.status !== 'completed') return 1;

      // Then by progress
      const progressDiff = (b.progress || 0) - (a.progress || 0);
      if (progressDiff !== 0) return progressDiff;

      // Then by days since enrollment (faster = better)
      const daysA = getDaysSinceEnrollment(a);
      const daysB = getDaysSinceEnrollment(b);
      return daysA - daysB;
    })
    .slice(0, limit);
};

/**
 * Check if lesson is completed in enrollment
 * @param {Object} enrollment - Enrollment data
 * @param {number} lessonId - Lesson ID
 * @returns {boolean} True if lesson is completed
 */
export const isLessonCompleted = (enrollment, lessonId) => {
  if (!enrollment || !enrollment.completedLessons) return false;
  return enrollment.completedLessons.includes(lessonId);
};

/**
 * Mark lesson as completed
 * @param {Object} enrollment - Current enrollment data
 * @param {number} lessonId - Lesson ID to mark as completed
 * @param {number} totalLessons - Total number of lessons in course
 * @returns {Object} Updated enrollment data
 */
export const markLessonCompleted = (enrollment, lessonId, totalLessons) => {
  const completedLessons = [...(enrollment.completedLessons || [])];
  
  // Add lesson if not already completed
  if (!completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
  }

  // Calculate new progress
  const newProgress = calculateProgressFromLessons(completedLessons, totalLessons);

  return {
    ...enrollment,
    completedLessons,
    progress: newProgress,
    lastActivity: new Date().toISOString(),
    // If progress is 100%, set completion date
    ...(newProgress >= 100 && !enrollment.completionDate && {
      completionDate: new Date().toISOString(),
      status: 'completed'
    })
  };
};

/**
 * Mark lesson as incomplete
 * @param {Object} enrollment - Current enrollment data
 * @param {number} lessonId - Lesson ID to mark as incomplete
 * @param {number} totalLessons - Total number of lessons in course
 * @returns {Object} Updated enrollment data
 */
export const markLessonIncomplete = (enrollment, lessonId, totalLessons) => {
  const completedLessons = (enrollment.completedLessons || [])
    .filter(id => id !== lessonId);

  // Calculate new progress
  const newProgress = calculateProgressFromLessons(completedLessons, totalLessons);

  return {
    ...enrollment,
    completedLessons,
    progress: newProgress,
    lastActivity: new Date().toISOString(),
    // Remove completion date if progress is no longer 100%
    ...(newProgress < 100 && {
      completionDate: null,
      status: 'active'
    })
  };
};

/**
 * Update time spent in course
 * @param {Object} enrollment - Current enrollment data
 * @param {number} minutesToAdd - Minutes to add to total time spent
 * @returns {Object} Updated enrollment data
 */
export const updateTimeSpent = (enrollment, minutesToAdd) => {
  return {
    ...enrollment,
    totalTimeSpent: (enrollment.totalTimeSpent || 0) + minutesToAdd,
    lastActivity: new Date().toISOString()
  };
};

/**
 * Record quiz attempt score
 * @param {Object} enrollment - Current enrollment data
 * @param {number} quizId - Quiz ID
 * @param {number} score - Score achieved (0-100)
 * @returns {Object} Updated enrollment data
 */
export const recordQuizScore = (enrollment, quizId, score) => {
  const quizScores = { ...(enrollment.quizScores || {}) };
  
  // Store score (keep best score if multiple attempts)
  if (!quizScores[quizId] || score > quizScores[quizId]) {
    quizScores[quizId] = score;
  }

  return {
    ...enrollment,
    quizScores,
    lastActivity: new Date().toISOString()
  };
};

/**
 * Get average quiz score for enrollment
 * @param {Object} enrollment - Enrollment data
 * @returns {number} Average quiz score (0-100)
 */
export const getAverageQuizScore = (enrollment) => {
  if (!enrollment || !enrollment.quizScores) return 0;

  const scores = Object.values(enrollment.quizScores);
  if (scores.length === 0) return 0;

  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
};

/**
 * Generate enrollment summary for display
 * @param {Object} enrollment - Enrollment data
 * @returns {Object} Enrollment summary
 */
export const generateEnrollmentSummary = (enrollment) => {
  const formatted = formatEnrollmentForDisplay(enrollment);
  const daysSinceEnrollment = getDaysSinceEnrollment(enrollment);
  const daysSinceActivity = getDaysSinceLastActivity(enrollment);
  const averageQuizScore = getAverageQuizScore(enrollment);

  return {
    ...formatted,
    summary: {
      enrolled: formatted.formattedEnrollmentDate,
      duration: `${daysSinceEnrollment} days`,
      progress: formatted.formattedProgress,
      timeSpent: formatted.formattedTimeSpent,
      lessonsCompleted: `${enrollment.completedLessons.length} lessons`,
      averageQuizScore: averageQuizScore > 0 ? `${averageQuizScore}%` : 'N/A',
      lastActive: formatted.formattedLastActivity,
      status: formatted.formattedStatus
    },
    alerts: {
      inactive: daysSinceActivity !== null && daysSinceActivity > 14,
      lowProgress: daysSinceEnrollment > 7 && enrollment.progress < 20,
      needsAttention: (daysSinceActivity !== null && daysSinceActivity > 14) || 
                      (daysSinceEnrollment > 7 && enrollment.progress < 20)
    }
  };
};