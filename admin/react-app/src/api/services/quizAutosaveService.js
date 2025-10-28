import { getApiConfig } from '../config/apiConfig';

const quizAutosaveService = {
  /**
   * Get base URL for quiz autosave endpoints
   * @returns {string} Base URL
   */
  getBaseUrl() {
    const config = getApiConfig();
    // Use the custom namespace for quiz-extended API
    return `${config.apiUrl}/quiz-extended/v1`;
  },

  /**
   * Save quiz progress
   * @param {Object} data - Quiz state data
   * @param {number} data.quiz_id - Quiz ID
   * @param {number} [data.attempt_id] - Attempt ID (if already started)
   * @param {Object} data.quiz_data - Complete quiz data
   * @param {number} data.current_question_index - Current question index
   * @param {Object} data.answers - User answers object
   * @param {number} [data.time_remaining] - Time remaining in seconds
   * @returns {Promise} Save result
   */
  async saveProgress(data) {
    try {
      const config = getApiConfig();
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/quiz-autosave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save quiz progress');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving quiz progress:', error);
      throw error;
    }
  },

  /**
   * Get latest autosaved quiz for current user
   * @returns {Promise} Autosave data or null
   */
  async getLatestAutosave() {
    try {
      const config = getApiConfig();
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/quiz-autosave/latest`, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });

      // 404 means no autosave exists - this is not an error
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch latest autosave');
      }

      const result = await response.json();
      return result.data; // Can be null if no autosave exists
    } catch (error) {
      console.error('Error fetching latest autosave:', error);
      // Return null instead of throwing to allow graceful handling
      return null;
    }
  },

  /**
   * Get autosave for specific quiz
   * @param {number} quizId - Quiz ID
   * @returns {Promise} Autosave data or null
   */
  async getQuizAutosave(quizId) {
    try {
      const config = getApiConfig();
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/quiz-autosave/${quizId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });

      // 404 means no autosave exists - this is not an error
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch quiz autosave');
      }

      const result = await response.json();
      return result.data; // Can be null if no autosave exists
    } catch (error) {
      console.error('Error fetching quiz autosave:', error);
      // Return null instead of throwing to allow graceful handling
      return null;
    }
  },

  /**
   * Delete autosave for specific quiz
   * @param {number} quizId - Quiz ID
   * @returns {Promise} Delete result
   */
  async deleteAutosave(quizId) {
    try {
      const config = getApiConfig();
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/quiz-autosave/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });

      // 404 means autosave doesn't exist - already deleted, not an error
      if (response.status === 404) {
        return { success: true, message: 'Autosave already deleted' };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete autosave');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting autosave:', error);
      throw error;
    }
  },

  /**
   * Clear all autosaves for current user
   * @returns {Promise} Clear result
   */
  async clearAllAutosaves() {
    try {
      const config = getApiConfig();
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/quiz-autosave/clear-all`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to clear all autosaves');
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing all autosaves:', error);
      throw error;
    }
  },

  /**
   * Check if there's a pending quiz for recovery
   * @returns {Promise<boolean>} True if pending quiz exists
   */
  async hasPendingQuiz() {
    try {
      const autosave = await this.getLatestAutosave();
      return autosave !== null;
    } catch (error) {
      console.error('Error checking pending quiz:', error);
      return false;
    }
  }
};

export default quizAutosaveService;
