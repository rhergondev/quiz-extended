/**
 * Batch operations service for courses
 * Provides high-level batch operations with proper error handling and result tracking
 */

import { getApiConfig } from '../config/apiConfig.js';
import { httpDelete, httpPut, processBatch } from '../utils/httpUtils.js';
import { 
  createBatchResults, 
  processSingleItem, 
  logBatchCompletion, 
  validateBatchParams,
  BATCH_CONFIG 
} from '../utils/batchUtils.js';

/**
 * Delete multiple courses in batches
 * @param {Array<number>} courseIds - Array of course IDs to delete
 * @param {Object} options - Batch processing options
 * @param {number} options.batchSize - Number of items to process concurrently
 * @returns {Promise<Object>} Results object with success/failure counts
 */
export const batchDeleteCourses = async (courseIds, options = {}) => {
  const operationType = 'delete';
  
  try {
    validateBatchParams(courseIds, operationType);
    
    const { batchSize = BATCH_CONFIG.DEFAULT_BATCH_SIZE } = options;
    const { endpoints } = getApiConfig();
    const results = createBatchResults(courseIds.length);

    const processor = async (courseId) => {
      await httpDelete(`${endpoints.courses}/${courseId}`);
      return courseId;
    };

    await processBatch(
      courseIds,
      (courseId) => processSingleItem(courseId, processor, results, operationType),
      { batchSize }
    );

    logBatchCompletion(operationType, results);
    return results;

  } catch (error) {
    console.error(`❌ Batch ${operationType} operation failed:`, error);
    throw error;
  }
};

/**
 * Update status for multiple courses in batches
 * @param {Array<number>} courseIds - Array of course IDs to update
 * @param {string} newStatus - New status ('publish' or 'draft')
 * @param {Object} options - Batch processing options
 * @returns {Promise<Object>} Results object with success/failure counts
 */
export const batchUpdateStatus = async (courseIds, newStatus, options = {}) => {
  const operationType = 'status update';
  
  try {
    validateBatchParams(courseIds, operationType);
    
    if (!['publish', 'draft'].includes(newStatus)) {
      throw new Error('Invalid status. Must be "publish" or "draft"');
    }

    const { batchSize = BATCH_CONFIG.DEFAULT_BATCH_SIZE } = options;
    const { endpoints } = getApiConfig();
    const results = createBatchResults(courseIds.length, { newStatus });

    const processor = async (courseId) => {
      const updatedCourse = await httpPut(`${endpoints.courses}/${courseId}`, {
        status: newStatus
      });
      return { id: courseId, course: updatedCourse };
    };

    await processBatch(
      courseIds,
      (courseId) => processSingleItem(courseId, processor, results, operationType),
      { batchSize }
    );

    logBatchCompletion(operationType, results);
    return results;

  } catch (error) {
    console.error(`❌ Batch ${operationType} operation failed:`, error);
    throw error;
  }
};

/**
 * Update category for multiple courses in batches
 * @param {Array<number>} courseIds - Array of course IDs to update
 * @param {string} newCategory - New category name
 * @param {Object} options - Batch processing options
 * @returns {Promise<Object>} Results object with success/failure counts
 */
export const batchUpdateCategory = async (courseIds, newCategory, options = {}) => {
  const operationType = 'category update';
  
  try {
    validateBatchParams(courseIds, operationType);
    
    if (!newCategory || typeof newCategory !== 'string') {
      throw new Error('Invalid category. Must be a non-empty string');
    }

    const { batchSize = BATCH_CONFIG.DEFAULT_BATCH_SIZE } = options;
    const { endpoints } = getApiConfig();
    const results = createBatchResults(courseIds.length, { newCategory });

    const processor = async (courseId) => {
      const updatedCourse = await httpPut(`${endpoints.courses}/${courseId}`, {
        meta: {
          _course_category: newCategory
        }
      });
      return { id: courseId, course: updatedCourse };
    };

    await processBatch(
      courseIds,
      (courseId) => processSingleItem(courseId, processor, results, operationType),
      { batchSize }
    );

    logBatchCompletion(operationType, results);
    return results;

  } catch (error) {
    console.error(`❌ Batch ${operationType} operation failed:`, error);
    throw error;
  }
};

/**
 * Execute mixed batch operations
 * @param {Object} operations - Object containing different operation types
 * @param {Array<number>} operations.delete - Course IDs to delete
 * @param {Object} operations.updateStatus - {courseIds: Array, status: string}
 * @param {Object} operations.updateCategory - {courseIds: Array, category: string}
 * @param {Object} options - Global options for all operations
 * @returns {Promise<Object>} Combined results from all operations
 */
export const executeBatchOperations = async (operations, options = {}) => {
  const allResults = {
    delete: { successful: [], failed: [] },
    updateStatus: { successful: [], failed: [] },
    updateCategory: { successful: [], failed: [] },
    totalOperations: 0,
    totalSuccessful: 0,
    totalFailed: 0
  };

  try {
    const promises = [];

    // Handle deletions
    if (operations.delete?.length > 0) {
      promises.push(
        batchDeleteCourses(operations.delete, options).then(results => {
          allResults.delete = results;
          allResults.totalOperations += results.total;
          allResults.totalSuccessful += results.successful.length;
          allResults.totalFailed += results.failed.length;
        })
      );
    }

    // Handle status updates
    if (operations.updateStatus?.courseIds?.length > 0) {
      promises.push(
        batchUpdateStatus(
          operations.updateStatus.courseIds, 
          operations.updateStatus.status, 
          options
        ).then(results => {
          allResults.updateStatus = results;
          allResults.totalOperations += results.total;
          allResults.totalSuccessful += results.successful.length;
          allResults.totalFailed += results.failed.length;
        })
      );
    }

    // Handle category updates
    if (operations.updateCategory?.courseIds?.length > 0) {
      promises.push(
        batchUpdateCategory(
          operations.updateCategory.courseIds, 
          operations.updateCategory.category, 
          options
        ).then(results => {
          allResults.updateCategory = results;
          allResults.totalOperations += results.total;
          allResults.totalSuccessful += results.successful.length;
          allResults.totalFailed += results.failed.length;
        })
      );
    }

    // Execute all operations in parallel
    await Promise.all(promises);

    console.log(`✅ All batch operations completed: ${allResults.totalSuccessful}/${allResults.totalOperations} successful`);
    return allResults;

  } catch (error) {
    console.error('❌ Batch operations failed:', error);
    throw error;
  }
};