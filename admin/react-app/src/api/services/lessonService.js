/**
 * Lesson Service - Refactored
 * * Uses baseService for common CRUD operations
 * Extended with lesson-specific functionality
 * * @package QuizExtended
 * @subpackage API/Services
 * @version 2.0.1
 */

import { createResourceService, buildQueryParams } from './baseService.js';
import { 
  sanitizeLessonData, 
  validateLessonData, 
  transformLessonDataForApi 
} from '../utils/lessonDataUtils.js';

/**
 * Custom query params builder for lessons
 * Handles course filtering with proper meta_query format
 * @param {Object} options - Filter options
 * @returns {URLSearchParams} Query parameters
 */
const buildLessonQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    search = '',
    courseId = null,
    lessonType = null,
    orderBy = 'menu_order',
    order = 'asc',
    embed = true
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  if (courseId) {
    const numericCourseId = parseInt(courseId, 10);
    if (Number.isInteger(numericCourseId) && numericCourseId > 0) {
      params.append('course_id', numericCourseId.toString());
    }
  }

  if (lessonType) {
    params.append('meta_query[1][key]', '_lesson_type');
    params.append('meta_query[1][value]', lessonType);
    params.append('meta_query[1][compare]', '=');
  }

  return params;
};

// Create base lesson service with custom handlers
const baseLessonService = createResourceService('lesson', 'lessons', {
  sanitizer: sanitizeLessonData,
  validator: validateLessonData,
  transformer: transformLessonDataForApi,
  buildParams: buildLessonQueryParams
});

/**
 * Get all lessons with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Lessons and pagination
 */
export const getAll = async (options = {}) => {
  return baseLessonService.getAll(options);
};

/**
 * Get lessons for a specific course
 * @param {number} courseId - Course ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Lessons and pagination
 */
export const getLessonsByCourse = async (courseId, options = {}) => {
  if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
    throw new Error('Invalid course ID provided');
  }

  console.log('🎓 Getting lessons for course:', courseId);
  
  return getAll({
    ...options,
    courseId
  });
};

/**
 * Get single lesson by ID
 * @param {number} lessonId - Lesson ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Lesson data
 */
export const getOne = async (lessonId, options = {}) => {
  return baseLessonService.getOne(lessonId, options);
};

/**
 * Create new lesson
 * @param {Object} lessonData - Lesson data
 * @returns {Promise<Object>} Created lesson
 */
export const create = async (lessonData) => {
  return baseLessonService.create(lessonData);
};

/**
 * Update existing lesson
 * @param {number} lessonId - Lesson ID
 * @param {Object} lessonData - Lesson data
 * @returns {Promise<Object>} Updated lesson
 */
export const update = async (lessonId, lessonData) => {
  return baseLessonService.update(lessonId, lessonData);
};

/**
 * Delete lesson
 * @param {number} lessonId - Lesson ID
 * @param {Object} options - Delete options
 * @returns {Promise<boolean>} Success status
 */
export const deleteFn = async (lessonId, options = {}) => {
  return baseLessonService.delete(lessonId, options);
};
export { deleteFn as delete };


/**
 * Duplicate existing lesson
 * @param {number} lessonId - Lesson ID to duplicate
 * @returns {Promise<Object>} Duplicated lesson
 */
export const duplicateLesson = async (lessonId) => {
  try {
    const originalLesson = await getOne(lessonId);
    
    if (!originalLesson) {
      throw new Error('Lesson not found');
    }

    const duplicateData = {
      title: `${originalLesson.title?.rendered || originalLesson.title || 'Untitled'} (Copy)`,
      content: originalLesson.content?.rendered || originalLesson.content || '',
      excerpt: originalLesson.excerpt?.rendered || originalLesson.excerpt || '',
      status: 'draft',
      courseId: originalLesson.meta?._course_id,
      lessonOrder: (parseInt(originalLesson.meta?._lesson_order || '0') + 1),
      lessonType: originalLesson.meta?._lesson_type || 'mixed',
      description: originalLesson.meta?._lesson_description || '',
      steps: originalLesson.meta?._lesson_steps || [],
      prerequisiteLessons: originalLesson.meta?._prerequisite_lessons || [],
      completionCriteria: originalLesson.meta?._completion_criteria || 'view',
      isRequired: originalLesson.meta?._is_required === 'yes',
      duration: originalLesson.meta?._duration_minutes || 0,
      videoUrl: originalLesson.meta?._video_url || '',
      hasQuiz: originalLesson.meta?._has_quiz === 'yes'
    };

    console.log('📋 Duplicating lesson:', lessonId);
    const duplicated = await create(duplicateData);
    console.log('✅ Lesson duplicated:', duplicated.id);
    
    return duplicated;

  } catch (error) {
    console.error(`❌ Error duplicating lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Get lessons count with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<number>} Total count
 */
export const getLessonsCount = async (options = {}) => {
  return baseLessonService.getCount(options);
};

/**
 * Check if lesson exists
 * @param {number} lessonId - Lesson ID
 * @returns {Promise<boolean>} Exists status
 */
export const lessonExists = async (lessonId) => {
  try {
    const lesson = await getOne(lessonId);
    return !!lesson;
  } catch (error) {
    return false;
  }
};

/**
 * Update lesson status
 * @param {number} lessonId - Lesson ID
 * @param {string} newStatus - New status ('publish', 'draft', 'private')
 * @returns {Promise<Object>} Updated lesson
 */
export const updateLessonStatus = async (lessonId, newStatus) => {
  if (!['publish', 'draft', 'private'].includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  return update(lessonId, { status: newStatus });
};

/**
 * Publish lesson (set status to 'publish')
 * @param {number} lessonId - Lesson ID
 * @returns {Promise<Object>} Updated lesson
 */
export const publishLesson = async (lessonId) => {
  return updateLessonStatus(lessonId, 'publish');
};

/**
 * Unpublish lesson (set status to 'draft')
 * @param {number} lessonId - Lesson ID
 * @returns {Promise<Object>} Updated lesson
 */
export const unpublishLesson = async (lessonId) => {
  return updateLessonStatus(lessonId, 'draft');
};

/**
 * Update lesson order
 * @param {number} lessonId - Lesson ID
 * @param {number} newOrder - New order
 * @returns {Promise<Object>} Updated lesson
 */
export const updateLessonOrder = async (lessonId, newOrder) => {
  return update(lessonId, { lessonOrder: newOrder });
};

/**
 * Move lesson to different course
 * @param {number} lessonId - Lesson ID
 * @param {number} newCourseId - New course ID
 * @returns {Promise<Object>} Updated lesson
 */
export const moveLessonToCourse = async (lessonId, newCourseId) => {
  return update(lessonId, { courseId: newCourseId });
};

/**
 * Get lessons by type
 * @param {string} lessonType - Lesson type (video, text, quiz, etc.)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered lessons
 */
export const getLessonsByType = async (lessonType, options = {}) => {
  return getAll({
    ...options,
    lessonType
  });
};

/**
 * Get published lessons only
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Published lessons
 */
export const getPublishedLessons = async (options = {}) => {
  return getAll({
    ...options,
    status: 'publish'
  });
};

/**
 * Get lesson statistics
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Statistics
 */
export const getLessonStatistics = async (options = {}) => {
  try {
    const result = await getAll({ ...options, perPage: 100 });
    
    const stats = {
      total: result.pagination.total,
      published: 0,
      draft: 0,
      byType: {},
      withQuizzes: 0,
      totalDuration: 0,
      averageDuration: 0
    };

    result.data.forEach(lesson => {
      // Count by status
      if (lesson.status === 'publish') stats.published++;
      if (lesson.status === 'draft') stats.draft++;

      // Count by type
      const type = lesson.meta?._lesson_type || 'mixed';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count lessons with quizzes
      if (lesson.meta?._has_quiz === 'yes') stats.withQuizzes++;

      // Calculate duration
      const duration = parseInt(lesson.meta?._duration_minutes || '0');
      stats.totalDuration += duration;
    });

    stats.averageDuration = result.data.length > 0 
      ? Math.round(stats.totalDuration / result.data.length) 
      : 0;

    console.log('📊 Lesson statistics:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error getting lesson statistics:', error);
    throw error;
  }
};
// Backward compatibility aliases
export const getLessons = getAll;
export const getLesson = getOne;
export const createLesson = create;
export const updateLesson = update;
export const deleteLesson = deleteFn;