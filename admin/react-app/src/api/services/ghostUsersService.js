/**
 * Ghost Users Service
 * 
 * API service for managing ghost users (baseline users for course rankings)
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { getApiConfig } from '../config/apiConfig.js';

/**
 * Get WordPress configuration
 */
const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found. Ensure qe_data is loaded.');
  }
  
  return config;
};

/**
 * Make API request
 */
const makeApiRequest = async (url, options = {}) => {
  const config = getWpConfig();
  
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': config.nonce,
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `HTTP ${response.status}`);
    error.response = { data: errorData, status: response.status };
    throw error;
  }

  return response.json();
};

/**
 * Get custom API URL
 */
const getCustomApiUrl = () => {
  const config = getWpConfig();
  return config.endpoints?.custom_api || `${config.api_url}/quiz-extended/v1`;
};

/**
 * Generate ghost users for a course
 * @param {number} courseId - Course ID
 * @param {number} count - Number of users to generate (default 20, max 50)
 * @returns {Promise<Object>} Result with created users
 */
export const generateGhostUsers = async (courseId, count = 20) => {
  const url = `${getCustomApiUrl()}/ghost-users/generate`;
  
  return makeApiRequest(url, {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId,
      count: Math.min(count, 50),
    }),
  });
};

/**
 * Get ghost users for a course
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} List of ghost users
 */
export const getGhostUsers = async (courseId) => {
  const url = `${getCustomApiUrl()}/ghost-users/${courseId}`;
  return makeApiRequest(url);
};

/**
 * Delete all ghost users for a course
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteGhostUsers = async (courseId) => {
  const url = `${getCustomApiUrl()}/ghost-users/${courseId}`;
  return makeApiRequest(url, { method: 'DELETE' });
};

export default {
  generateGhostUsers,
  getGhostUsers,
  deleteGhostUsers,
};
