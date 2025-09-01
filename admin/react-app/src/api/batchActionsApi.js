// admin/react-app/src/api/batchActionsApi.js

/**
 * API service for batch operations on courses
 */

const { api_url, nonce } = window.qe_data || {};

const COURSES_ENDPOINT = `${api_url}/wp/v2/course`;

/**
 * Delete multiple courses
 * @param {Array<number>} courseIds - Array of course IDs to delete
 * @returns {Promise<Object>} Results object with success/failure counts
 */
export const batchDeleteCourses = async (courseIds) => {
  const results = {
    successful: [],
    failed: [],
    total: courseIds.length
  };

  try {
    // Process deletions in parallel with limited concurrency
    const BATCH_SIZE = 5; // Limit concurrent requests
    const batches = [];
    
    for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
      const batch = courseIds.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }

    for (const batch of batches) {
      const promises = batch.map(async (courseId) => {
        try {
          const response = await fetch(`${COURSES_ENDPOINT}/${courseId}`, {
            method: 'DELETE',
            headers: {
              'X-WP-Nonce': nonce,
            },
            credentials: 'same-origin',
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          results.successful.push(courseId);
          return { success: true, id: courseId };
        } catch (error) {
          console.error(`Failed to delete course ${courseId}:`, error);
          results.failed.push({ id: courseId, error: error.message });
          return { success: false, id: courseId, error: error.message };
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(promises);
    }

    console.log(`✅ Batch delete completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;

  } catch (error) {
    console.error('❌ Batch delete operation failed:', error);
    throw error;
  }
};

/**
 * Update status for multiple courses
 * @param {Array<number>} courseIds - Array of course IDs to update
 * @param {string} newStatus - New status ('publish' or 'draft')
 * @returns {Promise<Object>} Results object with success/failure counts
 */
export const batchUpdateStatus = async (courseIds, newStatus) => {
  const results = {
    successful: [],
    failed: [],
    total: courseIds.length,
    newStatus
  };

  try {
    const BATCH_SIZE = 5;
    const batches = [];
    
    for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
      const batch = courseIds.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }

    for (const batch of batches) {
      const promises = batch.map(async (courseId) => {
        try {
          const response = await fetch(`${COURSES_ENDPOINT}/${courseId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-WP-Nonce': nonce,
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              status: newStatus
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          }

          const updatedCourse = await response.json();
          results.successful.push({ id: courseId, course: updatedCourse });
          return { success: true, id: courseId, course: updatedCourse };
        } catch (error) {
          console.error(`Failed to update status for course ${courseId}:`, error);
          results.failed.push({ id: courseId, error: error.message });
          return { success: false, id: courseId, error: error.message };
        }
      });

      await Promise.all(promises);
    }

    console.log(`✅ Batch status update completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;

  } catch (error) {
    console.error('❌ Batch status update operation failed:', error);
    throw error;
  }
};

/**
 * Update category for multiple courses
 * @param {Array<number>} courseIds - Array of course IDs to update
 * @param {string} newCategory - New category name
 * @returns {Promise<Object>} Results object with success/failure counts
 */
export const batchUpdateCategory = async (courseIds, newCategory) => {
  const results = {
    successful: [],
    failed: [],
    total: courseIds.length,
    newCategory
  };

  try {
    const BATCH_SIZE = 5;
    const batches = [];
    
    for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
      const batch = courseIds.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }

    for (const batch of batches) {
      const promises = batch.map(async (courseId) => {
        try {
          const response = await fetch(`${COURSES_ENDPOINT}/${courseId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-WP-Nonce': nonce,
            },
            credentials: 'same-origin',
            body: JSON.stringify({
              meta: {
                _course_category: newCategory
              }
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          }

          const updatedCourse = await response.json();
          results.successful.push({ id: courseId, course: updatedCourse });
          return { success: true, id: courseId, course: updatedCourse };
        } catch (error) {
          console.error(`Failed to update category for course ${courseId}:`, error);
          results.failed.push({ id: courseId, error: error.message });
          return { success: false, id: courseId, error: error.message };
        }
      });

      await Promise.all(promises);
    }

    console.log(`✅ Batch category update completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;

  } catch (error) {
    console.error('❌ Batch category update operation failed:', error);
    throw error;
  }
};

/**
 * Execute mixed batch operations
 * @param {Object} operations - Object containing different operation types
 * @param {Array<number>} operations.delete - Course IDs to delete
 * @param {Object} operations.updateStatus - {courseIds: Array, status: string}
 * @param {Object} operations.updateCategory - {courseIds: Array, category: string}
 * @returns {Promise<Object>} Combined results from all operations
 */
export const executeBatchOperations = async (operations) => {
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
    if (operations.delete && operations.delete.length > 0) {
      promises.push(
        batchDeleteCourses(operations.delete).then(results => {
          allResults.delete = results;
          allResults.totalOperations += results.total;
          allResults.totalSuccessful += results.successful.length;
          allResults.totalFailed += results.failed.length;
        })
      );
    }

    // Handle status updates
    if (operations.updateStatus && operations.updateStatus.courseIds.length > 0) {
      promises.push(
        batchUpdateStatus(operations.updateStatus.courseIds, operations.updateStatus.status).then(results => {
          allResults.updateStatus = results;
          allResults.totalOperations += results.total;
          allResults.totalSuccessful += results.successful.length;
          allResults.totalFailed += results.failed.length;
        })
      );
    }

    // Handle category updates
    if (operations.updateCategory && operations.updateCategory.courseIds.length > 0) {
      promises.push(
        batchUpdateCategory(operations.updateCategory.courseIds, operations.updateCategory.category).then(results => {
          allResults.updateCategory = results;
          allResults.totalOperations += results.total;
          allResults.totalSuccessful += results.successful.length;
          allResults.totalFailed += results.failed.length;
        })
      );
    }

    // Execute all operations
    await Promise.all(promises);

    console.log(`✅ All batch operations completed: ${allResults.totalSuccessful}/${allResults.totalOperations} successful`);
    return allResults;

  } catch (error) {
    console.error('❌ Batch operations failed:', error);
    throw error;
  }
};