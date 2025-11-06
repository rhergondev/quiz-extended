/**
 * Courses Bulk Service
 * 
 * Service for bulk operations on courses (optimized performance)
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { makeApiRequest } from './baseService.js';
import { getApiConfig } from '../config/apiConfig.js';
import { handleApiError } from '../utils/errorHandler.js';

/**
 * Get lessons for multiple courses in a single request
 * 
 * @param {number[]} courseIds - Array of course IDs
 * @param {Object} options - Query options
 * @param {boolean} options.includeContent - Include full lesson content (default: false)
 * @returns {Promise<Object>} Map of course_id => { lessons, count }
 */
export const getBulkCourseLessons = async (courseIds, options = {}) => {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return {};
  }

  const { includeContent = false } = options;

  try {
    console.log(`📚 Fetching lessons for ${courseIds.length} courses in bulk...`);

    const config = getApiConfig();
    
    const result = await makeApiRequest(
      `${config.apiUrl}/qe/v1/courses/bulk-lessons`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce
        },
        body: JSON.stringify({
          course_ids: courseIds,
          include_content: includeContent
        })
      }
    );

    console.log(`✅ Retrieved bulk lessons for ${courseIds.length} courses`);
    
    return result.data.data || {};

  } catch (error) {
    console.error(`❌ Error getting bulk course lessons:`, error);
    throw handleApiError(error, 'Failed to get bulk course lessons');
  }
};

/**
 * Get lesson counts for multiple courses
 * Optimized version that returns only counts
 * 
 * @param {number[]} courseIds - Array of course IDs
 * @returns {Promise<Object>} Map of course_id => count
 */
export const getBulkLessonCounts = async (courseIds) => {
  try {
    const bulkData = await getBulkCourseLessons(courseIds, { includeContent: false });
    
    const counts = {};
    Object.keys(bulkData).forEach(courseId => {
      counts[courseId] = bulkData[courseId].count || 0;
    });
    
    return counts;
  } catch (error) {
    console.error(`❌ Error getting bulk lesson counts:`, error);
    return {};
  }
};

export default {
  getBulkCourseLessons,
  getBulkLessonCounts
};
