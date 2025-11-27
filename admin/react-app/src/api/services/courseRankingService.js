import { getApiConfig } from '../config/apiConfig.js';

const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found. Ensure qe_data is loaded.');
  }
  
  return config;
};

const makeApiRequest = async (url, options = {}) => {
  try {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { data, headers: response.headers };
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export const getCourseRanking = async (courseId, options = {}) => {
    const { page = 1, perPage = 10, withRisk = false } = options;
    
    const config = getApiConfig();
    const params = new URLSearchParams({
        course_id: courseId.toString(),
        page: page.toString(),
        per_page: perPage.toString(),
        with_risk: withRisk.toString()
    });
    
    const url = `${config.apiUrl}/qe/v1/course-ranking/ranking?${params.toString()}`;
    const { data } = await makeApiRequest(url);
    
    return data;
};

export const getMyRankingStatus = async (courseId) => {
    const config = getApiConfig();
    const params = new URLSearchParams({
        course_id: courseId.toString()
    });
    
    const url = `${config.apiUrl}/qe/v1/course-ranking/my-ranking-status?${params.toString()}`;
    const { data } = await makeApiRequest(url);
    
    return data;
};
