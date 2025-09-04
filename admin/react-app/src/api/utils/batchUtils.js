/**
 * Batch operations utility functions
 * Provides reusable patterns for batch processing with result tracking
 */

/**
 * Create a standardized batch results object
 * @param {number} total - Total number of items to process
 * @param {*} metadata - Additional metadata for the operation
 * @returns {Object} Batch results structure
 */
export const createBatchResults = (total, metadata = {}) => ({
  successful: [],
  failed: [],
  total,
  ...metadata
});

/**
 * Process a single item and handle success/failure tracking
 * @param {*} item - Item to process
 * @param {Function} processor - Async function to process the item
 * @param {Object} results - Results object to update
 * @param {string} operationType - Type of operation for logging
 * @returns {Promise<Object>} Processing result
 */
export const processSingleItem = async (item, processor, results, operationType) => {
  try {
    const result = await processor(item);
    results.successful.push(result);
    return { success: true, item, result };
  } catch (error) {
    console.error(`Failed to ${operationType} item ${item}:`, error);
    const failureRecord = { id: item, error: error.message };
    results.failed.push(failureRecord);
    return { success: false, item, error: error.message };
  }
};

/**
 * Log batch operation completion
 * @param {string} operationType - Type of operation
 * @param {Object} results - Batch results object
 */
export const logBatchCompletion = (operationType, results) => {
  const { successful, failed, total } = results;
  console.log(
    `✅ Batch ${operationType} completed: ${successful.length}/${total} successful, ${failed.length} failed`
  );
};

/**
 * Validate batch operation parameters
 * @param {Array} items - Items to process
 * @param {string} operationType - Type of operation
 * @throws {Error} If validation fails
 */
export const validateBatchParams = (items, operationType) => {
  if (!Array.isArray(items)) {
    throw new Error(`${operationType}: items must be an array`);
  }
  
  if (items.length === 0) {
    throw new Error(`${operationType}: no items provided`);
  }
  
  // Check for valid IDs
  const invalidIds = items.filter(id => !Number.isInteger(id) || id <= 0);
  if (invalidIds.length > 0) {
    throw new Error(`${operationType}: invalid IDs found: ${invalidIds.join(', ')}`);
  }
};

/**
 * Configuration constants for batch operations
 */
export const BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 5,
  MAX_BATCH_SIZE: 10,
  MIN_BATCH_SIZE: 1
};