/**
 * API Configuration and constants
 * Centralizes all API-related configuration
 */

/**
 * Get API configuration from global WordPress data
 * @returns {Object} API configuration object
 */
export const getApiConfig = () => {
  const { api_url, nonce } = window.qe_data || {};
  
  if (!api_url || !nonce) {
    throw new Error('WordPress API configuration not found. Ensure qe_data is properly localized.');
  }
  
  return {
    apiUrl: api_url,
    nonce: nonce,
    endpoints: {
      courses: `${api_url}/wp/v2/course`,
      lessons: `${api_url}/wp/v2/lesson`,
      quizzes: `${api_url}/wp/v2/quiz`,
      questions: `${api_url}/wp/v2/question`,
      books: `${api_url}/wp/v2/book`,
      categories: `${api_url}/wp/v2/qe_category`,
      topics: `${api_url}/wp/v2/qe_topic`,
      difficulties: `${api_url}/wp/v2/qe_difficulty`,
      courseTypes: `${api_url}/wp/v2/course_type`,
      media: `${api_url}/wp/v2/media`,
      users: `${api_url}/wp/v2/users`
    }
  };
};

/**
 * Default request headers for WordPress REST API
 * @returns {Object} Headers object
 */
export const getDefaultHeaders = () => {
  const { nonce } = getApiConfig();
  
  return {
    'Content-Type': 'application/json',
    'X-WP-Nonce': nonce,
  };
};

/**
 * Default fetch options
 * @returns {Object} Fetch options object
 */
export const getDefaultFetchOptions = () => ({
  credentials: 'same-origin',
});

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  perPage: 20,
  status: 'publish,draft'
};

/**
 * API request timeout configuration
 */
export const REQUEST_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000 // 1 second
};