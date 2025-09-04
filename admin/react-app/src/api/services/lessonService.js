/**
 * Lesson service - Main CRUD operations for lessons
 * Provides high-level lesson management functions with proper error handling
 */

import { getApiConfig, DEFAULT_PAGINATION } from '../config/apiConfig.js';
import { httpGet, httpPost, httpPut, httpDelete, extractPaginationFromHeaders } from '../utils/httpUtils.js';
import { 
  buildLessonQueryParams,
  buildCourseLessonsQueryParams,
  transformLessonDataForApi, 
  validateLessonData,
  sanitizeLessonData 
} from '../utils/lessonDataUtils.js';

/**
 * Get a paginated list of lessons
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Promise that resolves with lessons and pagination info
 */
export const getLessons = async (options = {}) => {
  try {
    const { 
      page = DEFAULT_PAGINATION.page, 
      perPage = DEFAULT_PAGINATION.perPage,
      status = DEFAULT_PAGINATION.status,
      search = '',
      courseId = null,
      lessonType = '',
      contentType = '',
      orderBy = 'menu_order',
      order = 'asc'
    } = options;

    const { endpoints } = getApiConfig();
    const queryParams = buildLessonQueryParams({
      page,
      perPage,
      status,
      search,
      courseId,
      orderBy,
      order,
      embed: true
    });

    let url = `${endpoints.lessons}`;
    if (queryParams) {
      url += `?${queryParams}`;
    }

    const response = await httpGet(url);
    const lessons = await response.json();
    
    // Extract pagination info from headers
    const pagination = extractPaginationFromHeaders(response, page, perPage);

    // Sanitize lesson data for consistent structure
    let sanitizedLessons = lessons.map(sanitizeLessonData);

    // Apply additional client-side filters if needed
    if (lessonType) {
      sanitizedLessons = sanitizedLessons.filter(lesson => 
        lesson.meta?._lesson_type === lessonType
      );
    }

    if (contentType) {
      sanitizedLessons = sanitizedLessons.filter(lesson => 
        lesson.meta?._content_type === contentType
      );
    }

    return {
      data: sanitizedLessons,
      pagination: {
        ...pagination,
        hasMore: pagination.currentPage < pagination.totalPages && lessons.length > 0
      }
    };

  } catch (error) {
    console.error('Error fetching lessons:', error);
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
 * Get lessons for a specific course
 * @param {number} courseId - Course ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Promise that resolves with course lessons
 */
export const getLessonsByCourse = async (courseId, options = {}) => {
  try {
    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Valid course ID is required');
    }

    return await getLessons({
      ...options,
      courseId
    });

  } catch (error) {
    console.error(`Error fetching lessons for course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Get a single lesson by ID
 * @param {number} lessonId - Lesson ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object|null>} Lesson data or null if not found
 */
export const getLesson = async (lessonId, options = {}) => {
  try {
    if (!lessonId || !Number.isInteger(lessonId) || lessonId <= 0) {
      throw new Error('Invalid lesson ID provided');
    }

    const { embed = true } = options;
    const { endpoints } = getApiConfig();
    
    const queryParams = new URLSearchParams();
    if (embed) {
      queryParams.append('_embed', 'true');
    }

    const response = await httpGet(`${endpoints.lessons}/${lessonId}?${queryParams}`);
    const lesson = await response.json();
    
    return sanitizeLessonData(lesson);

  } catch (error) {
    console.error(`Error fetching lesson ${lessonId}:`, error);
    
    // Return null for 404 errors (lesson not found)
    if (error.message.includes('404')) {
      return null;
    }
    
    throw error;
  }
};

/**
 * Create a new lesson
 * @param {Object} lessonData - Lesson data to create
 * @returns {Promise<Object>} Created lesson data
 */
export const createLesson = async (lessonData) => {
  try {
    // Validate lesson data before sending
    const validation = validateLessonData(lessonData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformLessonDataForApi(lessonData);
    const { endpoints } = getApiConfig();

    const createdLesson = await httpPost(endpoints.lessons, transformedData);
    
    console.log('✅ Lesson created successfully:', createdLesson.id);
    return sanitizeLessonData(createdLesson);

  } catch (error) {
    console.error('❌ Error creating lesson:', error);
    throw error;
  }
};

/**
 * Update an existing lesson
 * @param {number} lessonId - Lesson ID to update
 * @param {Object} lessonData - Updated lesson data
 * @returns {Promise<Object>} Updated lesson data
 */
export const updateLesson = async (lessonId, lessonData) => {
  try {
    if (!lessonId || !Number.isInteger(lessonId) || lessonId <= 0) {
      throw new Error('Invalid lesson ID provided');
    }

    // Validate lesson data before sending
    const validation = validateLessonData(lessonData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformLessonDataForApi(lessonData);
    const { endpoints } = getApiConfig();

    const updatedLesson = await httpPut(`${endpoints.lessons}/${lessonId}`, transformedData);
    
    console.log('✅ Lesson updated successfully:', lessonId);
    return sanitizeLessonData(updatedLesson);

  } catch (error) {
    console.error(`❌ Error updating lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Delete a lesson
 * @param {number} lessonId - Lesson ID to delete
 * @param {Object} options - Deletion options
 * @returns {Promise<boolean>} Success status
 */
export const deleteLesson = async (lessonId, options = {}) => {
  try {
    if (!lessonId || !Number.isInteger(lessonId) || lessonId <= 0) {
      throw new Error('Invalid lesson ID provided');
    }

    const { force = false } = options;
    const { endpoints } = getApiConfig();
    
    const queryParams = new URLSearchParams();
    if (force) {
      queryParams.append('force', 'true');
    }

    const url = `${endpoints.lessons}/${lessonId}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const success = await httpDelete(url);
    
    if (success) {
      console.log(`✅ Lesson ${lessonId} deleted successfully`);
    }
    
    return success;

  } catch (error) {
    console.error(`❌ Error deleting lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Duplicate a lesson
 * @param {number} lessonId - Lesson ID to duplicate
 * @param {Object} overrides - Data to override in the duplicate
 * @returns {Promise<Object>} Duplicated lesson data
 */
export const duplicateLesson = async (lessonId, overrides = {}) => {
  try {
    // Get the original lesson
    const originalLesson = await getLesson(lessonId, { embed: false });
    
    if (!originalLesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }

    // Prepare duplicate data
    const duplicateData = {
      title: overrides.title || `${originalLesson.title} ${overrides.titleSuffix || '(Copy)'}`,
      content: originalLesson.content || '',
      status: overrides.status || 'draft', // Always start as draft
      courseId: overrides.newCourseId || originalLesson.courseId,
      menu_order: overrides.menu_order || (originalLesson.menu_order + 1),
      meta: {
        ...originalLesson.meta,
        ...overrides.meta,
        _course_id: (overrides.newCourseId || originalLesson.courseId)?.toString(),
        _lesson_order: overrides.lesson_order || ((parseInt(originalLesson.meta?._lesson_order || '1')) + 1).toString()
      }
    };

    // Create the duplicate
    const duplicatedLesson = await createLesson(duplicateData);
    
    console.log('✅ Lesson duplicated successfully:', duplicatedLesson.id);
    return duplicatedLesson;

  } catch (error) {
    console.error(`❌ Error duplicating lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Get lessons count
 * @param {Object} filters - Count filters
 * @returns {Promise<number>} Number of lessons
 */
export const getLessonsCount = async (filters = {}) => {
  try {
    const result = await getLessons({
      ...filters,
      page: 1,
      perPage: 1 // We only need the headers, not the data
    });

    return result.pagination.total;

  } catch (error) {
    console.error('Error getting lessons count:', error);
    return 0;
  }
};