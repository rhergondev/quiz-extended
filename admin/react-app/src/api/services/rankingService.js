import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

/**
 * Fetches the ranking for a specific quiz.
 * @param {number} quizId - The ID of the quiz.
 * @returns {Promise<Object>} The ranking data including top and relative rankings.
 */
export const getQuizRanking = async (quizId) => {
  try {
    const config = getApiConfig();
    const url = `${config.endpoints.custom_api}/rankings/quiz/${quizId}`;
    console.log(`🚀 Fetching ranking for quiz ID: ${quizId}`);
    
    const response = await makeApiRequest(url);
    
    console.log('✅ Quiz ranking fetched:', response.data);
    return response.data.data;

  } catch (error) {
    console.error(`❌ Error fetching quiz ranking for quiz ID ${quizId}:`, error);
    throw error;
  }
};
