/**
 * Course Service - Refactored
 * 
 * Uses baseService for common CRUD operations
 * Extended with course-specific functionality
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 2.0.0
 */

import { createResourceService } from './baseService.js';
import { 
  sanitizeCourseData, 
  validateCourseData, 
  transformCourseDataForApi 
} from '../utils/courseDataUtils.js';

// Create base course service with custom handlers
const baseCourseService = createResourceService('course', 'courses', {
  sanitizer: sanitizeCourseData,
  validator: validateCourseData,
  transformer: transformCourseDataForApi
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
 * Duplicate existing course
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

    console.log('📋 Duplicating course:', courseId);
    const duplicated = await create(duplicateData);
    console.log('✅ Course duplicated:', duplicated.id);
    
    return duplicated;

  } catch (error) {
    console.error(`❌ Error duplicating course ${courseId}:`, error);
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