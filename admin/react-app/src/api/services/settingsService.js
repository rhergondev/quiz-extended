/**
 * Settings Service
 * Handles plugin settings API calls
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
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': config.nonce,
    },
    credentials: 'same-origin',
    ...options
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`
    }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

/**
 * Settings Service
 */
const settingsService = {
  /**
   * Get all settings (admin only)
   */
  getSettings: async () => {
    const config = getWpConfig();
    const url = `${config.api_url}/quiz-extended/v1/settings`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'GET'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

  /**
   * Get score format setting (public)
   */
  getScoreFormat: async () => {
    const config = getWpConfig();
    const url = `${config.api_url}/quiz-extended/v1/settings/score-format`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'GET'
      });
      
      return response.data.score_format;
    } catch (error) {
      console.error('Error fetching score format:', error);
      // Return default on error
      return 'percentage';
    }
  },

  /**
   * Update settings (admin only)
   */
  updateSettings: async (settings) => {
    const config = getWpConfig();
    const url = `${config.api_url}/quiz-extended/v1/settings`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  /**
   * Update score format (admin only)
   */
  updateScoreFormat: async (format) => {
    return settingsService.updateSettings({ score_format: format });
  },

  /**
   * Get theme settings (public)
   */
  getTheme: async () => {
    const config = getWpConfig();
    const url = `${config.api_url}/quiz-extended/v1/settings/theme`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'GET'
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching theme:', error);
      // Return default theme on error
      return {
        success: true,
        data: {
          theme: {
            light: {
              primary: '#3b82f6',
              secondary: '#8b5cf6',
              accent: '#f59e0b',
              background: '#ffffff',
              text: '#111827'
            },
            dark: {
              primary: '#60a5fa',
              secondary: '#a78bfa',
              accent: '#fbbf24',
              background: '#1f2937',
              text: '#f9fafb'
            }
          },
          is_dark_mode: false
        }
      };
    }
  },

  /**
   * Update theme settings (admin only)
   */
  updateTheme: async (theme) => {
    return settingsService.updateSettings({ theme });
  },

  /**
   * Update campus logo URL (admin only)
   */
  updateCampusLogo: async (logoUrl) => {
    return settingsService.updateSettings({ campus_logo: logoUrl });
  },

  /**
   * Update campus logo URL for dark mode (admin only)
   */
  updateCampusLogoDark: async (logoUrl) => {
    return settingsService.updateSettings({ campus_logo_dark: logoUrl });
  },

  // ============================================================
  // EMAIL NOTIFICATION SETTINGS
  // ============================================================

  /**
   * Get email notification settings (admin only)
   */
  getEmailNotificationSettings: async () => {
    const config = getWpConfig();
    const url = `${config.api_url}/quiz-extended/v1/settings/email-notifications`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'GET'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching email notification settings:', error);
      throw error;
    }
  },

  /**
   * Update email notification settings (admin only)
   */
  updateEmailNotificationSettings: async (settings) => {
    const config = getWpConfig();
    const url = `${config.api_url}/quiz-extended/v1/settings/email-notifications`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating email notification settings:', error);
      throw error;
    }
  },

  /**
   * Send test email (admin only)
   */
  sendTestEmail: async () => {
    const config = getWpConfig();
    const url = `${config.api_url}/quiz-extended/v1/settings/email-notifications/test`;
    
    try {
      const response = await makeApiRequest(url, {
        method: 'POST'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }
};

export { settingsService };
export default settingsService;
