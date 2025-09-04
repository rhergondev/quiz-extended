/**
 * HTTP utility functions for API requests
 * Provides reusable HTTP methods with error handling and batch processing
 */

import { getDefaultHeaders, getDefaultFetchOptions } from '../config/apiConfig.js';

/**
 * Enhanced error handling for API responses
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed error data
 */
const handleApiError = async (response) => {
  let errorData = {};
  
  try {
    errorData = await response.json();
  } catch (parseError) {
    console.warn('Could not parse error response as JSON:', parseError);
  }
  
  const errorMessage = errorData.message || 
    `API request failed: ${response.status} ${response.statusText}`;
    
  throw new Error(errorMessage);
};

/**
 * Generic GET request handler
 * @param {string} url - Request URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const httpGet = async (url, options = {}) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...getDefaultHeaders(),
      ...options.headers
    },
    ...getDefaultFetchOptions(),
    ...options
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response;
};

/**
 * Generic POST request handler
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const httpPost = async (url, data, options = {}) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getDefaultHeaders(),
      ...options.headers
    },
    body: JSON.stringify(data),
    ...getDefaultFetchOptions(),
    ...options
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Generic PUT request handler
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export const httpPut = async (url, data, options = {}) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...getDefaultHeaders(),
      ...options.headers
    },
    body: JSON.stringify(data),
    ...getDefaultFetchOptions(),
    ...options
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Generic DELETE request handler
 * @param {string} url - Request URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<boolean>} Success status
 */
export const httpDelete = async (url, options = {}) => {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-WP-Nonce': getDefaultHeaders()['X-WP-Nonce'],
      ...options.headers
    },
    ...getDefaultFetchOptions(),
    ...options
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.ok;
};

/**
 * Process items in batches with controlled concurrency
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {Object} options - Batch processing options
 * @param {number} options.batchSize - Number of items to process concurrently
 * @param {Function} options.onBatchComplete - Callback after each batch completes
 * @returns {Promise<Array>} Array of processing results
 */
export const processBatch = async (items, processor, options = {}) => {
  const { batchSize = 5, onBatchComplete } = options;
  const results = [];
  
  // Split items into batches
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process each batch sequentially
  for (const batch of batches) {
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    if (onBatchComplete) {
      onBatchComplete(batchResults);
    }
  }

  return results;
};

/**
 * Extract pagination information from response headers
 * @param {Response} response - Fetch response object
 * @param {number} requestedPage - Originally requested page number
 * @param {number} perPage - Items per page
 * @returns {Object} Pagination information
 */
export const extractPaginationFromHeaders = (response, requestedPage, perPage) => {
  const total = parseInt(response.headers.get('X-WP-Total') || '0');
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
  const currentPage = parseInt(response.headers.get('X-WP-Page') || requestedPage.toString());

  return {
    total,
    totalPages,
    currentPage,
    perPage,
    hasMore: currentPage < totalPages
  };
};