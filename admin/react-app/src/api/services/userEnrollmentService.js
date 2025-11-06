/**
 * User Enrollment Service
 * Handles all user enrollment operations with courses
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { getApiConfig } from '../config/apiConfig.js';
import { makeApiRequest } from './baseService.js';
import { handleApiError, ErrorType } from '../utils/errorHandler.js';

// ============================================================
// GET USER ENROLLMENTS
// ============================================================

/**
 * Get all enrollments for a specific user
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of enrollment objects
 */
export const getUserEnrollments = async (userId) => {
  try {
    if (!userId || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    const config = getApiConfig();
    const url = `${config.apiUrl}/qe/v1/users/${userId}/enrollments`;

    console.log(`📚 Fetching enrollments for user ${userId}...`);

    // makeApiRequest from baseService returns { data, headers }, not Response
    const result = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin'
    });

    // Handle both direct array response and wrapped response
    const enrollments = result.data?.data || result.data;

    console.log(`✅ Fetched ${Array.isArray(enrollments) ? enrollments.length : 0} enrollments for user ${userId}`);

    return Array.isArray(enrollments) ? enrollments : [];

  } catch (error) {
    console.error(`❌ Error fetching user enrollments for user ${userId}:`, error);
    return handleApiError(error, ErrorType.FETCH, {
      resource: 'user-enrollments',
      userId,
      action: 'getUserEnrollments'
    });
  }
};

// ============================================================
// ENROLL USER IN COURSE
// ============================================================

/**
 * Enroll a user in a course
 * 
 * @param {number} userId - User ID
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} Enrollment data
 */
export const enrollUserInCourse = async (userId, courseId) => {
  try {
    if (!userId || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Valid course ID is required');
    }

    const config = getApiConfig();
    const url = `${config.apiUrl}/qe/v1/users/${userId}/enrollments`;

    console.log(`➕ Enrolling user ${userId} in course ${courseId}...`);

    // makeApiRequest from baseService returns { data, headers }, not Response
    const result = await makeApiRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        course_id: courseId
      })
    });

    console.log(`✅ User ${userId} successfully enrolled in course ${courseId}`);

    return result.data;

  } catch (error) {
    console.error(`❌ Error enrolling user ${userId} in course ${courseId}:`, error);
    return handleApiError(error, ErrorType.CREATE, {
      resource: 'user-enrollment',
      userId,
      courseId,
      action: 'enrollUserInCourse'
    });
  }
};

// ============================================================
// UNENROLL USER FROM COURSE
// ============================================================

/**
 * Unenroll a user from a course
 * 
 * @param {number} userId - User ID
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} Result of unenrollment
 */
export const unenrollUserFromCourse = async (userId, courseId) => {
  try {
    if (!userId || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Valid course ID is required');
    }

    const config = getApiConfig();
    const url = `${config.apiUrl}/qe/v1/users/${userId}/enrollments/${courseId}`;

    console.log(`➖ Unenrolling user ${userId} from course ${courseId}...`);

    // makeApiRequest from baseService returns { data, headers }, not Response
    const result = await makeApiRequest(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin'
    });

    console.log(`✅ User ${userId} successfully unenrolled from course ${courseId}`);

    return result.data;

  } catch (error) {
    console.error(`❌ Error unenrolling user ${userId} from course ${courseId}:`, error);
    return handleApiError(error, ErrorType.DELETE, {
      resource: 'user-enrollment',
      userId,
      courseId,
      action: 'unenrollUserFromCourse'
    });
  }
};

// ============================================================
// CHECK IF USER IS ENROLLED
// ============================================================

/**
 * Check if a user is enrolled in a specific course
 * 
 * @param {number} userId - User ID
 * @param {number} courseId - Course ID
 * @returns {Promise<boolean>} True if enrolled, false otherwise
 */
export const isUserEnrolled = async (userId, courseId) => {
  try {
    const enrollments = await getUserEnrollments(userId);
    
    if (!Array.isArray(enrollments)) {
      return false;
    }

    return enrollments.some(enrollment => 
      parseInt(enrollment.course_id) === parseInt(courseId)
    );

  } catch (error) {
    console.error(`❌ Error checking enrollment status:`, error);
    return false;
  }
};

// ============================================================
// BATCH ENROLLMENT OPERATIONS
// ============================================================

/**
 * Enroll multiple users in a course
 * 
 * @param {Array<number>} userIds - Array of user IDs
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} Results of batch enrollment
 */
export const batchEnrollUsers = async (userIds, courseId) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('User IDs array is required');
    }

    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Valid course ID is required');
    }

    console.log(`📦 Batch enrolling ${userIds.length} users in course ${courseId}...`);

    const results = {
      success: [],
      failed: [],
      total: userIds.length
    };

    // Process enrollments in parallel (with reasonable limit)
    const batchSize = 5;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(userId => enrollUserInCourse(userId, courseId))
      );

      batchResults.forEach((result, index) => {
        const userId = batch[index];
        
        if (result.status === 'fulfilled' && result.value?.success !== false) {
          results.success.push(userId);
        } else {
          results.failed.push({
            userId,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }

    console.log(`✅ Batch enrollment complete: ${results.success.length} success, ${results.failed.length} failed`);

    return results;

  } catch (error) {
    console.error(`❌ Error in batch enrollment:`, error);
    throw error;
  }
};

/**
 * Enroll a user in multiple courses
 * 
 * @param {number} userId - User ID
 * @param {Array<number>} courseIds - Array of course IDs
 * @returns {Promise<Object>} Results of batch enrollment
 */
export const enrollUserInMultipleCourses = async (userId, courseIds) => {
  try {
    if (!userId || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      throw new Error('Course IDs array is required');
    }

    console.log(`📦 Enrolling user ${userId} in ${courseIds.length} courses...`);

    const results = {
      success: [],
      failed: [],
      total: courseIds.length
    };

    // Process enrollments sequentially to avoid rate limiting
    for (const courseId of courseIds) {
      try {
        const result = await enrollUserInCourse(userId, courseId);
        
        if (result?.success !== false) {
          results.success.push(courseId);
        } else {
          results.failed.push({
            courseId,
            error: result?.error || 'Unknown error'
          });
        }
      } catch (error) {
        results.failed.push({
          courseId,
          error: error.message
        });
      }
    }

    console.log(`✅ Multi-course enrollment complete: ${results.success.length} success, ${results.failed.length} failed`);

    return results;

  } catch (error) {
    console.error(`❌ Error in multi-course enrollment:`, error);
    throw error;
  }
};

// ============================================================
// ENROLLMENT STATISTICS
// ============================================================

/**
 * Get enrollment statistics for a user
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Enrollment statistics
 */
export const getUserEnrollmentStats = async (userId) => {
  try {
    const enrollments = await getUserEnrollments(userId);

    if (!Array.isArray(enrollments)) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        inProgress: 0,
        averageProgress: 0
      };
    }

    const stats = {
      total: enrollments.length,
      active: enrollments.filter(e => e.status === 'active').length,
      completed: enrollments.filter(e => e.status === 'completed').length,
      inProgress: enrollments.filter(e => e.progress > 0 && e.progress < 100).length,
      averageProgress: enrollments.length > 0
        ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length)
        : 0
    };

    return stats;

  } catch (error) {
    console.error(`❌ Error fetching enrollment stats:`, error);
    return {
      total: 0,
      active: 0,
      completed: 0,
      inProgress: 0,
      averageProgress: 0
    };
  }
};
