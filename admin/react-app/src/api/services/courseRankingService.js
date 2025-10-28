import { getApiConfig } from '../config/apiConfig';

const courseRankingService = {
  /**
   * Get ranking for a specific course
   * @param {number} courseId - Course ID
   * @returns {Promise} Ranking data
   */
  async getCourseRanking(courseId) {
    try {
      const config = getApiConfig();
      const response = await fetch(`${config.baseUrl}/courses/${courseId}/ranking`, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch course ranking');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching course ranking:', error);
      throw error;
    }
  },

  /**
   * Get current user's ranking status for a course
   * @param {number} courseId - Course ID
   * @returns {Promise} User's ranking status
   */
  async getMyRankingStatus(courseId) {
    try {
      const config = getApiConfig();
      const response = await fetch(`${config.baseUrl}/courses/${courseId}/my-ranking-status`, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch ranking status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching ranking status:', error);
      throw error;
    }
  }
};

export default courseRankingService;
