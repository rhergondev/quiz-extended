import { makeApiRequest, buildQueryParams } from './baseService';
import { getApiConfig } from '../config/apiConfig';

/**
 * Dashboard Service
 * Provides statistics and overview data for the admin dashboard
 */
const dashboardService = {
  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard stats
   */
  async getStats() {
    try {
      const config = getApiConfig();
      const response = await makeApiRequest(`${config.restUrl}qe/v1/dashboard/stats`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return fallback data if endpoint doesn't exist
      return {
        courses: 0,
        lessons: 0,
        quizzes: 0,
        questions: 0,
        students: 0,
        messages: 0
      };
    }
  }
};

export default dashboardService;
