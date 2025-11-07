/**
 * Lesson batch actions service
 * Provides batch operations for lesson management
 */

import { deleteLesson, updateLesson, duplicateLesson, getLesson } from './lessonService.js';
import {
  createBatchResults,
  processSingleItem,
  logBatchCompletion,
  validateBatchParams,
  BATCH_CONFIG
} from '../utils/batchUtils.js';

/**
 * Batch delete lessons
 * @param {Array<number>} lessonIds - Array of lesson IDs to delete
 * @param {Object} options - Deletion options
 * @param {boolean} options.force - Whether to permanently delete (bypass trash)
 * @returns {Promise<Object>} Batch operation results
 */
export const batchDeleteLessons = async (lessonIds, options = {}) => {
  try {
    validateBatchParams(lessonIds, 'Batch delete lessons');
    
    const results = createBatchResults(lessonIds.length, { 
      operation: 'delete',
      force: options.force || false 
    });

    console.log(`🔄 Starting batch deletion of ${lessonIds.length} lessons...`);

    for (const lessonId of lessonIds) {
      await processSingleItem(
        lessonId,
        (id) => deleteLesson(id, options),
        results,
        'delete'
      );
    }

    logBatchCompletion('delete', results);
    return results;

  } catch (error) {
    console.error('❌ Batch delete lessons failed:', error);
    throw error;
  }
};

/**
 * Batch update lesson status
 * @param {Array<number>} lessonIds - Array of lesson IDs to update
 * @param {string} newStatus - New status to apply
 * @returns {Promise<Object>} Batch operation results
 */
export const batchUpdateLessonStatus = async (lessonIds, newStatus) => {
  try {
    validateBatchParams(lessonIds, 'Batch update lesson status');
    
    if (!newStatus || typeof newStatus !== 'string') {
      throw new Error('Valid status is required for batch update');
    }

    const results = createBatchResults(lessonIds.length, { 
      operation: 'updateStatus',
      newStatus 
    });

    console.log(`🔄 Starting batch status update of ${lessonIds.length} lessons to "${newStatus}"...`);

    for (const lessonId of lessonIds) {
      await processSingleItem(
        lessonId,
        async (id) => {
          // Get current lesson data first
          const currentLesson = await getLesson(id);
          if (!currentLesson) {
            throw new Error(`Lesson ${id} not found`);
          }

          // Update with new status
          return updateLesson(id, {
            ...currentLesson,
            status: newStatus
          });
        },
        results,
        'update status'
      );
    }

    logBatchCompletion('update status', results);
    return results;

  } catch (error) {
    console.error('❌ Batch update lesson status failed:', error);
    throw error;
  }
};

/**
 * Batch move lessons to different course
 * @param {Array<number>} lessonIds - Array of lesson IDs to move
 * @param {number} newCourseId - Target course ID
 * @returns {Promise<Object>} Batch operation results
 */
export const batchMoveLessonsToCourse = async (lessonIds, newCourseId) => {
  try {
    validateBatchParams(lessonIds, 'Batch move lessons to course');
    
    if (!newCourseId || !Number.isInteger(newCourseId) || newCourseId <= 0) {
      throw new Error('Valid course ID is required for batch move');
    }

    const results = createBatchResults(lessonIds.length, { 
      operation: 'moveToCourse',
      newCourseId 
    });

    console.log(`🔄 Starting batch move of ${lessonIds.length} lessons to course ${newCourseId}...`);

    for (const lessonId of lessonIds) {
      await processSingleItem(
        lessonId,
        async (id) => {
          // Get current lesson data first
          const currentLesson = await getLesson(id);
          if (!currentLesson) {
            throw new Error(`Lesson ${id} not found`);
          }

          // Update with new course ID
          return updateLesson(id, {
            ...currentLesson,
            courseId: newCourseId,
            meta: {
              ...currentLesson.meta,
              _course_id: newCourseId.toString()
            }
          });
        },
        results,
        'move to course'
      );
    }

    logBatchCompletion('move to course', results);
    return results;

  } catch (error) {
    console.error('❌ Batch move lessons to course failed:', error);
    throw error;
  }
};

/**
 * Batch update lesson type
 * @param {Array<number>} lessonIds - Array of lesson IDs to update
 * @param {string} newType - New lesson type
 * @returns {Promise<Object>} Batch operation results
 */
export const batchUpdateLessonType = async (lessonIds, newType) => {
  try {
    validateBatchParams(lessonIds, 'Batch update lesson type');
    
    if (!newType || typeof newType !== 'string') {
      throw new Error('Valid lesson type is required for batch update');
    }

    const validTypes = ['video', 'text', 'quiz', 'assignment', 'live'];
    if (!validTypes.includes(newType)) {
      throw new Error(`Invalid lesson type. Must be one of: ${validTypes.join(', ')}`);
    }

    const results = createBatchResults(lessonIds.length, { 
      operation: 'updateType',
      newType 
    });

    console.log(`🔄 Starting batch type update of ${lessonIds.length} lessons to "${newType}"...`);

    for (const lessonId of lessonIds) {
      await processSingleItem(
        lessonId,
        async (id) => {
          // Get current lesson data first
          const currentLesson = await getLesson(id);
          if (!currentLesson) {
            throw new Error(`Lesson ${id} not found`);
          }

          // Update with new type
          return updateLesson(id, {
            ...currentLesson,
            meta: {
              ...currentLesson.meta,
              _lesson_type: newType
            }
          });
        },
        results,
        'update type'
      );
    }

    logBatchCompletion('update type', results);
    return results;

  } catch (error) {
    console.error('❌ Batch update lesson type failed:', error);
    throw error;
  }
};

/**
 * Batch duplicate lessons
 * @param {Array<number>} lessonIds - Array of lesson IDs to duplicate
 * @param {Object} options - Duplication options
 * @param {string} options.titleSuffix - Suffix to add to duplicated lesson titles
 * @param {number} options.newCourseId - Move duplicates to a different course
 * @returns {Promise<Object>} Batch operation results
 */
export const batchDuplicateLessons = async (lessonIds, options = {}) => {
  try {
    validateBatchParams(lessonIds, 'Batch duplicate lessons');
    
    const results = createBatchResults(lessonIds.length, { 
      operation: 'duplicate',
      options 
    });

    console.log(`🔄 Starting batch duplication of ${lessonIds.length} lessons...`);

    for (const lessonId of lessonIds) {
      await processSingleItem(
        lessonId,
        (id) => duplicateLesson(id, options),
        results,
        'duplicate'
      );
    }

    logBatchCompletion('duplicate', results);
    return results;

  } catch (error) {
    console.error('❌ Batch duplicate lessons failed:', error);
    throw error;
  }
};

/**
 * Batch update lesson content type (free/premium)
 * @param {Array<number>} lessonIds - Array of lesson IDs to update
 * @param {string} newContentType - New content type ('free' or 'premium')
 * @returns {Promise<Object>} Batch operation results
 */
export const batchUpdateLessonContentType = async (lessonIds, newContentType) => {
  try {
    validateBatchParams(lessonIds, 'Batch update lesson content type');
    
    if (!newContentType || !['free', 'premium'].includes(newContentType)) {
      throw new Error('Content type must be either "free" or "premium"');
    }

    const results = createBatchResults(lessonIds.length, { 
      operation: 'updateContentType',
      newContentType 
    });

    console.log(`🔄 Starting batch content type update of ${lessonIds.length} lessons to "${newContentType}"...`);

    for (const lessonId of lessonIds) {
      await processSingleItem(
        lessonId,
        async (id) => {
          // Get current lesson data first
          const currentLesson = await getLesson(id);
          if (!currentLesson) {
            throw new Error(`Lesson ${id} not found`);
          }

          // Update with new content type
          return updateLesson(id, {
            ...currentLesson,
            meta: {
              ...currentLesson.meta,
              _content_type: newContentType
            }
          });
        },
        results,
        'update content type'
      );
    }

    logBatchCompletion('update content type', results);
    return results;

  } catch (error) {
    console.error('❌ Batch update lesson content type failed:', error);
    throw error;
  }
};

/**
 * Batch update lesson order
 * Updates the _lesson_order meta field for multiple lessons
 * @param {Array<{id: number, order: number}>} lessonOrders - Array of objects with lesson ID and new order
 * @returns {Promise<Object>} Batch operation results
 */
export const batchUpdateLessonOrder = async (lessonOrders) => {
  try {
    if (!Array.isArray(lessonOrders) || lessonOrders.length === 0) {
      throw new Error('Lesson orders array is required and cannot be empty');
    }

    // Validate each item has id and order
    for (const item of lessonOrders) {
      if (!item.id || !Number.isInteger(item.id) || item.id <= 0) {
        throw new Error(`Invalid lesson ID: ${item.id}`);
      }
      if (item.order === undefined || !Number.isInteger(item.order) || item.order < 1) {
        throw new Error(`Invalid order for lesson ${item.id}: ${item.order}. Order must be >= 1`);
      }
    }

    const results = createBatchResults(lessonOrders.length, { 
      operation: 'updateOrder',
      lessonOrders 
    });

    console.log(`🔄 Starting batch order update of ${lessonOrders.length} lessons...`);

    for (const { id, order } of lessonOrders) {
      await processSingleItem(
        id,
        async (lessonId) => {
          // Update both menu_order (native WP field) and _lesson_order (meta field)
          return updateLesson(lessonId, {
            menu_order: order, // WordPress native field for ordering
            meta: {
              _lesson_order: order.toString()
            }
          });
        },
        results,
        'update order'
      );
    }

    logBatchCompletion('update order', results);
    return results;

  } catch (error) {
    console.error('❌ Batch update lesson order failed:', error);
    throw error;
  }
};

/**
 * Execute multiple batch operations in sequence
 * @param {Array<Object>} operations - Array of batch operations to execute
 * @param {string} operations[].type - Operation type ('delete', 'updateStatus', etc.)
 * @param {Array<number>} operations[].lessonIds - Lesson IDs for the operation
 * @param {*} operations[].params - Additional parameters for the operation
 * @returns {Promise<Array<Object>>} Results from all batch operations
 */
export const executeBatchLessonOperations = async (operations) => {
  try {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error('Operations array is required and cannot be empty');
    }

    console.log(`🔄 Executing ${operations.length} batch lesson operations...`);

    const results = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      console.log(`⚙️ Executing operation ${i + 1}/${operations.length}: ${operation.type}`);

      let result;
      switch (operation.type) {
        case 'delete':
          result = await batchDeleteLessons(operation.lessonIds, operation.params);
          break;
        case 'updateStatus':
          result = await batchUpdateLessonStatus(operation.lessonIds, operation.params);
          break;
        case 'moveToCourse':
          result = await batchMoveLessonsToCourse(operation.lessonIds, operation.params);
          break;
        case 'updateType':
          result = await batchUpdateLessonType(operation.lessonIds, operation.params);
          break;
        case 'duplicate':
          result = await batchDuplicateLessons(operation.lessonIds, operation.params);
          break;
        case 'updateContentType':
          result = await batchUpdateLessonContentType(operation.lessonIds, operation.params);
          break;
        case 'updateOrder':
          result = await batchUpdateLessonOrder(operation.params);
          break;
        default:
          throw new Error(`Unsupported operation type: ${operation.type}`);
      }

      results.push({
        operation: operation.type,
        ...result
      });
    }

    console.log('✅ All batch lesson operations completed successfully');
    return results;

  } catch (error) {
    console.error('❌ Batch lesson operations failed:', error);
    throw error;
  }
};