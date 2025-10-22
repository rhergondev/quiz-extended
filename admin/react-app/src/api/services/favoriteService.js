import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

/**
 * Toggle favorite status for a question
 * @param {number} questionId - The ID of the question to toggle
 * @returns {Promise<Object>} Response with is_favorited status
 */
export const toggleFavoriteQuestion = async (questionId) => {
  try {
    const config = getApiConfig();
    const url = `${config.endpoints.custom_api}/favorite-questions/toggle`;
    
    console.log(`🔖 Toggling favorite for question ID: ${questionId}`);
    
    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId }),
    });
    
    console.log('✅ Favorite toggled:', response.data);
    return response.data.data;

  } catch (error) {
    console.error(`❌ Error toggling favorite for question ID ${questionId}:`, error);
    throw error;
  }
};

/**
 * Get favorite status for a question
 * @param {number} questionId - The ID of the question
 * @returns {Promise<boolean>} True if favorited, false otherwise
 */
export const getFavoriteStatus = async (questionId) => {
  try {
    // This would need to be implemented in the API if not already available
    // For now, we'll manage state locally
    return false;
  } catch (error) {
    console.error(`❌ Error getting favorite status for question ID ${questionId}:`, error);
    return false;
  }
};
