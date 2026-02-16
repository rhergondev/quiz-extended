/**
 * Course Service - Refactored
 * * Uses baseService for common CRUD operations
 * Extended with course-specific functionality
 * * @package QuizExtended
 * @subpackage API/Services
 * @version 2.0.0
 */

import { createResourceService, buildQueryParams } from './baseService.js';
import { 
  sanitizeCourseData, 
  validateCourseData, 
  transformCourseDataForApi 
} from '../utils/courseDataUtils.js';

// 🔥 AÑADIDO: Constructor de parámetros personalizado para cursos
const buildCourseQueryParams = (options = {}) => {
  // Forzar ordenación por menu_order para cursos (no puede ser sobrescrito)
  const courseOptions = {
    ...options,
    orderBy: 'menu_order',
    order: 'asc'
  };
  
  // Llama al constructor base para obtener los parámetros por defecto
  const params = buildQueryParams(courseOptions);

  // Añade el filtro específico de categoría si existe
  if (options.category) {
    // La API de WordPress espera el slug de la taxonomía como clave y el ID del término como valor
    params.append('qe_category', options.category.toString());
  }

  return params;
};


// Create base course service with custom handlers
const baseCourseService = createResourceService('course', 'courses', {
  sanitizer: sanitizeCourseData,
  validator: validateCourseData,
  transformer: transformCourseDataForApi,
  // 🔥 AÑADIDO: Pasa el constructor personalizado al servicio
  buildParams: buildCourseQueryParams
});

// ============================================================
// EXPORT COMPATIBLE WITH useResource (getAll, getOne, create, update, delete)
// ============================================================

/**
 * Get all courses with optional filters
 * Compatible with useResource hook
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Courses and pagination
 */
export const getAll = async (options = {}) => {
  return baseCourseService.getAll(options);
};

/**
 * Get single course by ID
 * Compatible with useResource hook
 * @param {number} courseId - Course ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Course data
 */
export const getOne = async (courseId, options = {}) => {
  return baseCourseService.getOne(courseId, options);
};

/**
 * Create new course
 * Compatible with useResource hook
 * @param {Object} courseData - Course data
 * @returns {Promise<Object>} Created course
 */
export const create = async (courseData) => {
  return baseCourseService.create(courseData);
};

/**
 * Update existing course
 * Compatible with useResource hook
 * @param {number} courseId - Course ID
 * @param {Object} courseData - Course data
 * @returns {Promise<Object>} Updated course
 */
export const update = async (courseId, courseData) => {
  return baseCourseService.update(courseId, courseData);
};

/**
 * Delete course
 * Compatible with useResource hook
 * @param {number} courseId - Course ID
 * @param {Object} options - Delete options
 * @returns {Promise<boolean>} Success status
 */
export const deleteFn = async (courseId, options = {}) => {
  return baseCourseService.delete(courseId, options);
};

// Export as 'delete' for useResource compatibility
export { deleteFn as delete };

/**
 * Duplicate existing course (shallow - metadata only)
 * Compatible with useResource hook
 * @param {number} courseId - Course ID to duplicate
 * @returns {Promise<Object>} Duplicated course
 */
export const duplicate = async (courseId) => {
  try {
    const originalCourse = await getOne(courseId);

    if (!originalCourse) {
      throw new Error('Course not found');
    }

    const duplicateData = {
      title: `${originalCourse.title?.rendered || originalCourse.title || 'Untitled'} (Copy)`,
      description: originalCourse.content?.rendered || originalCourse.content || '',
      excerpt: originalCourse.excerpt?.rendered || originalCourse.excerpt || '',
      status: 'draft',
      price: originalCourse.meta?._course_price || '0',
      salePrice: originalCourse.meta?._sale_price || '',
      difficulty: originalCourse.meta?._course_difficulty || 'intermediate',
      category: originalCourse.meta?._course_category || 'general',
      duration: originalCourse.meta?._course_duration || 0,
      maxStudents: originalCourse.meta?._max_students || 0,
      featured: false,
      startDate: '',
      endDate: ''
    };

    console.log('📋 Duplicating course (shallow):', courseId);
    const duplicated = await create(duplicateData);
    console.log('✅ Course duplicated:', duplicated.id);

    return duplicated;

  } catch (error) {
    console.error(`❌ Error duplicating course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Deep duplicate course with all content (lessons, quizzes, questions, PDFs)
 * Excludes: enrollments, user progress, attempts, rankings
 * @param {number} courseId - Course ID to duplicate
 * @param {string} customTitle - Optional custom title for the duplicated course
 * @returns {Promise<Object>} Duplicated course with statistics
 */
export const duplicateDeep = async (courseId, customTitle = null) => {
  try {
    const config = window.qe_data || {};

    if (!config.nonce) {
      throw new Error('WordPress configuration not found');
    }

    // Use our custom QE API endpoint, not the WordPress REST API
    const baseUrl = config.api_url || `${window.location.origin}/wp-json`;
    const url = `${baseUrl}/qe/v1/courses/${courseId}/duplicate`;

    const requestBody = {};
    if (customTitle) {
      requestBody.title = customTitle;
    }

    console.log('📋 Deep duplicating course:', courseId, 'URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API Error ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();

    console.log('✅ Course deep duplicated successfully:', {
      original: courseId,
      duplicated: result.data.course_id,
      lessons: result.data.lessons_count,
      quizzes: result.data.quizzes_count
    });

    return result.data;

  } catch (error) {
    console.error(`❌ Error deep duplicating course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Update course order (menu_order field)
 * Lightweight update that only changes the order - bypasses full validation
 * @param {number} courseId - Course ID
 * @param {number} menuOrder - New order position
 * @returns {Promise<Object>} Updated course
 */
export const updateOrder = async (courseId, menuOrder) => {
  try {
    const config = window.qe_data || {};
    
    if (!config.nonce || !config.endpoints?.courses) {
      throw new Error('WordPress configuration not found');
    }

    const url = `${config.endpoints.courses}/${courseId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify({ menu_order: menuOrder })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error updating course order ${courseId}:`, error);
    throw error;
  }
};

/**
 * Batch update course orders
 * @param {Array<{id: number, menu_order: number}>} orders - Array of course IDs and their new orders
 * @returns {Promise<Array>} Array of updated courses
 */
export const batchUpdateOrders = async (orders) => {
  try {
    const updatePromises = orders.map(({ id, menu_order }) => 
      updateOrder(id, menu_order)
    );
    return await Promise.all(updatePromises);
  } catch (error) {
    console.error('❌ Error batch updating course orders:', error);
    throw error;
  }
};

/**
 * Update lesson order map for a course
 * Lightweight update that only changes the _lesson_order_map meta field
 * @param {number} courseId - Course ID
 * @param {Object} lessonOrderMap - Object with lessonId as key and position as value { "123": 1, "456": 2 }
 * @returns {Promise<Object>} Updated course
 */
export const updateLessonOrderMap = async (courseId, lessonOrderMap) => {
  try {
    const config = window.qe_data || {};
    
    if (!config.nonce || !config.endpoints?.courses) {
      throw new Error('WordPress configuration not found');
    }

    const url = `${config.endpoints.courses}/${courseId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify({ 
        meta: {
          _lesson_order_map: lessonOrderMap
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorData}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error updating lesson order map for course ${courseId}:`, error);
    throw error;
  }
};

// ============================================================
// LEGACY API (for backward compatibility)
// ============================================================

/**
 * @deprecated Use getAll() instead
 */
export const getCourses = getAll;

/**
 * @deprecated Use getOne() instead
 */
export const getCourse = getOne;

/**
 * @deprecated Use create() instead
 */
export const createCourse = create;

/**
 * @deprecated Use update() instead
 */
export const updateCourse = update;

/**
 * @deprecated Use delete() instead
 */
export const deleteCourse = deleteFn;

/**
 * @deprecated Use duplicate() instead
 */
export const duplicateCourse = duplicate;

// ============================================================
// ADDITIONAL HELPER METHODS
// ============================================================

/**
 * Get courses count with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<number>} Total count
 */
export const getCount = async (options = {}) => {
  return baseCourseService.getCount(options);
};

/**
 * Check if course exists
 * @param {number} courseId - Course ID
 * @returns {Promise<boolean>} Exists status
 */
export const courseExists = async (courseId) => {
  try {
    const course = await getOne(courseId);
    return !!course;
  } catch (error) {
    return false;
  }
};

/**
 * Get enrolled users count for a course
 * @param {number} courseId - Course ID
 * @returns {Promise<number>} Enrolled users count
 */
export const getEnrolledUsersCount = async (courseId) => {
  try {
    const course = await getOne(courseId);
    return parseInt(course.meta?.enrolled_users_count || '0');
  } catch (error) {
    console.error(`❌ Error getting enrolled users for course ${courseId}:`, error);
    return 0;
  }
};

/**
 * Update course status
 * @param {number} courseId - Course ID
 * @param {string} newStatus - New status ('publish', 'draft', 'private')
 * @returns {Promise<Object>} Updated course
 */
export const updateCourseStatus = async (courseId, newStatus) => {
  if (!['publish', 'draft', 'private'].includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  return update(courseId, { status: newStatus });
};

/**
 * Publish course (set status to 'publish')
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} Updated course
 */
export const publishCourse = async (courseId) => {
  return updateCourseStatus(courseId, 'publish');
};

/**
 * Unpublish course (set status to 'draft')
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} Updated course
 */
export const unpublishCourse = async (courseId) => {
  return updateCourseStatus(courseId, 'draft');
};

/**
 * Feature/Unfeature course
 * @param {number} courseId - Course ID
 * @param {boolean} featured - Featured status
 * @returns {Promise<Object>} Updated course
 */
export const toggleCourseFeatured = async (courseId, featured) => {
  return update(courseId, { featured });
};

/**
 * Search courses by title
 * @param {string} searchTerm - Search term
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
export const searchCoursesByTitle = async (searchTerm, options = {}) => {
  return getAll({
    ...options,
    search: searchTerm
  });
};

/**
 * Get courses by category
 * @param {string} category - Category name
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered courses
 */
export const getCoursesByCategory = async (category, options = {}) => {
  return getAll({
    ...options,
    category
  });
};

/**
 * Get courses by difficulty
 * @param {string} difficulty - Difficulty level
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered courses
 */
export const getCoursesByDifficulty = async (difficulty, options = {}) => {
  return getAll({
    ...options,
    difficulty
  });
};

/**
 * Get featured courses
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Featured courses
 */
export const getFeaturedCourses = async (options = {}) => {
  return getAll({
    ...options,
    featured: true
  });
};

/**
 * Get published courses only
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Published courses
 */
export const getPublishedCourses = async (options = {}) => {
  return getAll({
    ...options,
    status: 'publish'
  });
};

/**
 * Reset a course - delete all user data (enrollments, attempts, rankings, stats)
 * Preserves: lessons, quizzes, questions, and all content associations
 * @param {number} courseId - Course ID to reset
 * @returns {Promise<Object>} Reset statistics
 */
export const resetCourse = async (courseId) => {
  const apiFetch = (await import('@wordpress/api-fetch')).default;
  
  const response = await apiFetch({
    path: `/quiz-extended/v1/courses/${courseId}/reset`,
    method: 'POST',
    data: { confirm: true }
  });
  
  return response;
};