/**
 * User Books Service
 * 
 * Handles fetching books purchased by the current user
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

/**
 * Get WordPress configuration with validation
 */
const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found');
  }
  
  return config;
};

/**
 * Make HTTP request to WordPress REST API
 */
const makeApiRequest = async (url, options = {}) => {
  const config = getWpConfig();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': config.nonce,
    },
    credentials: 'same-origin',
    ...options
  };

  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
};

/**
 * Get user's purchased books
 * 
 * @returns {Promise<Array>} Array of book objects
 */
export const getUserBooks = async () => {
  const config = getWpConfig();
  const apiUrl = config.api_url || '';
  
  // Use the custom API endpoint
  const url = `${apiUrl}/quiz-extended/v1/books/my-books`;
  
  console.log('📚 Fetching user books:', url);
  
  const result = await makeApiRequest(url);
  
  // Handle response structure: { success: true, data: { data: [...] } }
  if (result.success && result.data) {
    return result.data.data || result.data;
  }
  
  return result.data || result || [];
};

export default {
  getUserBooks,
};
