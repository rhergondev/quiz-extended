/**
 * Course Lesson Service
 * 
 * Service for fetching lessons associated with a specific course
 * Uses the custom endpoint /qe/v1/courses/{course_id}/lessons
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { makeApiRequest } from './baseService.js';
import { getApiConfig } from '../config/apiConfig.js';
import { handleApiError } from '../utils/errorHandler.js';

/**
 * Get lessons for a specific course
 * 
 * @param {number} courseId - Course ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.perPage - Items per page (default: 100)
 * @param {string} options.status - Filter by status (default: 'publish,draft,private')
 * @returns {Promise<Object>} Response with lessons and pagination
 */
export const getCourseLessons = async (courseId, options = {}) => {
  if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
    throw new Error('Invalid course ID provided');
  }

  const {
    page = 1,
    perPage = 100,
    status = 'publish,draft,private'
  } = options;

  try {
    console.log(`📚 Getting lessons for course ${courseId}...`);

    const config = getApiConfig();
    console.log('🔧 API Config:', config);
    
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      status: status
    });

    const url = `${config.apiUrl}/qe/v1/courses/${courseId}/lessons?${params.toString()}`;
    console.log('🌐 Requesting URL:', url);

    const result = await makeApiRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce
      }
    });

    console.log('📦 Raw API Result:', result);
    console.log('📚 Lessons data:', result.data);
    console.log(`✅ Retrieved ${result.data.data?.length || 0} lessons for course ${courseId}`);
    
    return {
      data: result.data.data || [],
      pagination: result.data.pagination || {
        total: 0,
        total_pages: 0,
        current_page: 1,
        per_page: perPage,
        has_more: false
      }
    };

  } catch (error) {
    console.error(`❌ Error getting lessons for course ${courseId}:`, error);
    console.error('❌ Error details:', error.message, error.stack);
    throw handleApiError(error, 'Failed to get course lessons');
  }
};

/**
 * Get lessons count for a course
 * 
 * @param {number} courseId - Course ID
 * @returns {Promise<number>} Total lessons count
 */
export const getCourseLessonsCount = async (courseId) => {
  try {
    const result = await getCourseLessons(courseId, { page: 1, perPage: 1 });
    return result.pagination.total || 0;
  } catch (error) {
    console.error(`❌ Error getting lessons count for course ${courseId}:`, error);
    return 0;
  }
};

/**
 * Check if course has lessons
 * 
 * @param {number} courseId - Course ID
 * @returns {Promise<boolean>} True if course has lessons
 */
export const courseHasLessons = async (courseId) => {
  try {
    const count = await getCourseLessonsCount(courseId);
    return count > 0;
  } catch (error) {
    return false;
  }
};

export default {
  getCourseLessons,
  getCourseLessonsCount,
  courseHasLessons
};
