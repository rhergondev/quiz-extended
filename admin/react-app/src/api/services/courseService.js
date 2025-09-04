/**
 * Course service - Main CRUD operations
 * Provides high-level course management functions with proper error handling
 */

import { getApiConfig, DEFAULT_PAGINATION } from '../config/apiConfig.js';
import { httpGet, httpPost, httpPut, httpDelete, extractPaginationFromHeaders } from '../utils/httpUtils.js';
import { 
  buildCourseQueryParams, 
  transformCourseDataForApi, 
  validateCourseData,
  sanitizeCourseData 
} from '../utils/courseDataUtils.js';

/**
 * Get a paginated list of all courses
 * @param {Object} options - Pagination and filter options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.perPage - Items per page (default: 20)
 * @param {string} options.status - Course status filter
 * @param {string} options.search - Search term
 * @returns {Promise<Object>} Promise that resolves with courses and pagination info
 */
export const getCourses = async (options = {}) => {
  try {
    const { 
      page = DEFAULT_PAGINATION.page, 
      perPage = DEFAULT_PAGINATION.perPage, 
      status = DEFAULT_PAGINATION.status,
      search = '' 
    } = options;

    const { endpoints } = getApiConfig();
    const queryParams = buildCourseQueryParams({
      page,
      perPage,
      status,
      search,
      embed: true
    });

    const response = await httpGet(`${endpoints.courses}?${queryParams}`);
    const courses = await response.json();
    
    // Extract pagination info from headers
    const pagination = extractPaginationFromHeaders(response, page, perPage);

    // Sanitize course data for consistent structure
    const sanitizedCourses = courses.map(sanitizeCourseData);

    return {
      data: sanitizedCourses,
      pagination: {
        ...pagination,
        hasMore: pagination.currentPage < pagination.totalPages && courses.length > 0
      }
    };

  } catch (error) {
    console.error('Error fetching courses:', error);
    return {
      data: [],
      pagination: {
        total: 0,
        totalPages: 0,
        currentPage: options.page || DEFAULT_PAGINATION.page,
        perPage: options.perPage || DEFAULT_PAGINATION.perPage,
        hasMore: false
      }
    };
  }
};

/**
 * Get a single course by ID
 * @param {number} courseId - Course ID
 * @param {Object} options - Additional options
 * @param {boolean} options.embed - Whether to embed related data
 * @returns {Promise<Object|null>} Course data or null if not found
 */
export const getCourse = async (courseId, options = {}) => {
  try {
    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Invalid course ID provided');
    }

    const { embed = true } = options;
    const { endpoints } = getApiConfig();
    
    const queryParams = new URLSearchParams();
    if (embed) {
      queryParams.append('_embed', 'true');
    }

    const response = await httpGet(`${endpoints.courses}/${courseId}?${queryParams}`);
    const course = await response.json();
    
    return sanitizeCourseData(course);

  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    
    // Return null for 404 errors (course not found)
    if (error.message.includes('404')) {
      return null;
    }
    
    throw error;
  }
};

/**
 * Create a new course
 * @param {Object} courseData - Course data to create
 * @returns {Promise<Object>} Created course data
 */
export const createCourse = async (courseData) => {
  try {
    // Validate course data before sending
    const validation = validateCourseData(courseData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformCourseDataForApi(courseData);
    const { endpoints } = getApiConfig();

    const createdCourse = await httpPost(endpoints.courses, transformedData);
    
    console.log('✅ Course created successfully:', createdCourse.id);
    return sanitizeCourseData(createdCourse);

  } catch (error) {
    console.error('❌ Error creating course:', error);
    throw error;
  }
};

/**
 * Update an existing course
 * @param {number} courseId - Course ID to update
 * @param {Object} courseData - Updated course data
 * @returns {Promise<Object>} Updated course data
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Invalid course ID provided');
    }

    // Validate course data before sending
    const validation = validateCourseData(courseData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformCourseDataForApi(courseData);
    const { endpoints } = getApiConfig();

    const updatedCourse = await httpPut(`${endpoints.courses}/${courseId}`, transformedData);
    
    console.log('✅ Course updated successfully:', courseId);
    return sanitizeCourseData(updatedCourse);

  } catch (error) {
    console.error(`❌ Error updating course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Delete a course
 * @param {number} courseId - Course ID to delete
 * @param {Object} options - Deletion options
 * @param {boolean} options.force - Whether to permanently delete (bypass trash)
 * @returns {Promise<boolean>} Success status
 */
export const deleteCourse = async (courseId, options = {}) => {
  try {
    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Invalid course ID provided');
    }

    const { force = false } = options;
    const { endpoints } = getApiConfig();
    
    const queryParams = new URLSearchParams();
    if (force) {
      queryParams.append('force', 'true');
    }

    const url = `${endpoints.courses}/${courseId}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const success = await httpDelete(url);
    
    if (success) {
      console.log(`✅ Course ${courseId} deleted successfully`);
    }
    
    return success;

  } catch (error) {
    console.error(`❌ Error deleting course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Duplicate a course
 * @param {number} courseId - Course ID to duplicate
 * @param {Object} overrides - Data to override in the duplicate
 * @returns {Promise<Object>} Duplicated course data
 */
export const duplicateCourse = async (courseId, overrides = {}) => {
  try {
    // Get the original course
    const originalCourse = await getCourse(courseId, { embed: false });
    
    if (!originalCourse) {
      throw new Error(`Course ${courseId} not found`);
    }

    // Prepare duplicate data
    const duplicateData = {
      title: overrides.title || `${originalCourse.title?.rendered || originalCourse.title} (Copy)`,
      content: originalCourse.content?.rendered || originalCourse.content || '',
      status: overrides.status || 'draft', // Always start as draft
      meta: {
        ...originalCourse.meta,
        ...overrides.meta
      }
    };

    // Create the duplicate
    const duplicatedCourse = await createCourse(duplicateData);
    
    console.log('✅ Course duplicated successfully:', duplicatedCourse.id);
    return duplicatedCourse;

  } catch (error) {
    console.error(`❌ Error duplicating course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Get courses count by status
 * @param {string} status - Status to count (optional, counts all if not provided)
 * @returns {Promise<number>} Number of courses
 */
export const getCoursesCount = async (status = null) => {
  try {
    const options = {
      page: 1,
      perPage: 1, // We only need the headers, not the data
    };
    
    if (status) {
      options.status = status;
    }

    const result = await getCourses(options);
    return result.pagination.total;

  } catch (error) {
    console.error('Error getting courses count:', error);
    return 0;
  }
};

/**
 * Check if a course exists
 * @param {number} courseId - Course ID to check
 * @returns {Promise<boolean>} True if course exists
 */
export const courseExists = async (courseId) => {
  try {
    const course = await getCourse(courseId);
    return course !== null;
  } catch (error) {
    return false;
  }
};