/**
 * HTTP utility functions for API requests
 * Handles all HTTP operations with WordPress REST API
 */

import { getDefaultHeaders, getDefaultFetchOptions } from '../config/apiConfig.js';

/**
 * Generic HTTP request handler
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
const httpRequest = async (url, options = {}) => {
  try {
    const defaultOptions = getDefaultFetchOptions();
    const headers = getDefaultHeaders();

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    };

    console.log('🌐 HTTP Request:', {
      method: finalOptions.method || 'GET',
      url,
      headers: finalOptions.headers
    });

    const response = await fetch(url, finalOptions);

    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || 
        `HTTP Error: ${response.status} ${response.statusText}`
      );
    }

    return response;

  } catch (error) {
    console.error('❌ HTTP Request failed:', error);
    throw error;
  }
};

/**
 * HTTP GET request
 * @param {string} url - Request URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const httpGet = async (url, options = {}) => {
  return httpRequest(url, {
    ...options,
    method: 'GET'
  });
};

/**
 * HTTP POST request
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const httpPost = async (url, data = {}, options = {}) => {
  return httpRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * HTTP PUT request
 * @param {string} url - Request URL
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const httpPut = async (url, data = {}, options = {}) => {
  return httpRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

/**
 * HTTP DELETE request
 * @param {string} url - Request URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const httpDelete = async (url, options = {}) => {
  return httpRequest(url, {
    ...options,
    method: 'DELETE'
  });
};

/**
 * Extract pagination info from WordPress REST API response headers
 * @param {Response} response - Fetch response object
 * @param {number} currentPage - Current page number
 * @param {number} perPage - Items per page
 * @returns {Object} Pagination information
 */
export const extractPaginationFromHeaders = (response, currentPage = 1, perPage = 20) => {
  const total = parseInt(response.headers.get('X-WP-Total') || '0');
  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');

  return {
    currentPage,
    perPage,
    total,
    totalPages,
    hasMore: currentPage < totalPages
  };
};