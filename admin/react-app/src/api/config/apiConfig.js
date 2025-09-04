/**
 * API Configuration and constants - IMPROVED VERSION
 * Centralizes all API-related configuration with better error handling and fallbacks
 */

/**
 * Get API configuration from global WordPress data - IMPROVED WITH FALLBACKS
 * @returns {Object} API configuration object
 */
export const getApiConfig = () => {
  // 🔧 FIXED: Check both possible sources for WordPress data
  const wpData = window.qe_data || window.qeApiConfig || {};
  const { api_url, nonce, endpoints } = wpData;
  
  console.log('🔍 API Config Debug:', {
    hasQeData: !!window.qe_data,
    hasQeApiConfig: !!window.qeApiConfig,
    apiUrl: api_url,
    hasNonce: !!nonce,
    hasEndpoints: !!endpoints
  });
  
  if (!api_url || !nonce) {
    throw new Error(`WordPress API configuration not found. 
      Ensure qe_data is properly localized in WordPress. 
      Available data: ${JSON.stringify(wpData, null, 2)}`);
  }
  
  // 🔧 FIXED: Use predefined endpoints if available, otherwise construct them
  const finalEndpoints = endpoints || {
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
  };
  
  const config = {
    apiUrl: api_url,
    nonce: nonce,
    endpoints: finalEndpoints,
    // Add debug info
    debug: wpData.debug || false,
    user: wpData.user || null
  };
  
  console.log('✅ Final API Configuration:', config);
  
  return config;
};

/**
 * Test API configuration and return detailed results
 * @returns {Object} Test results with detailed information
 */
export const testApiConfig = () => {
  try {
    console.log('🧪 Testing API Configuration...');
    
    // Check global data availability
    const hasQeData = !!window.qe_data;
    const hasQeApiConfig = !!window.qeApiConfig;
    const wpData = window.qe_data || window.qeApiConfig || {};
    
    console.log('📋 Global Data Check:', {
      hasQeData,
      hasQeApiConfig,
      wpData: wpData
    });
    
    if (!hasQeData && !hasQeApiConfig) {
      return {
        success: false,
        error: 'No WordPress data found. Neither window.qe_data nor window.qeApiConfig exists.',
        recommendations: [
          'Check if qe_data is properly enqueued in WordPress',
          'Verify wp_localize_script is called correctly',
          'Ensure the script is loaded on the correct admin page'
        ]
      };
    }
    
    // Try to get configuration
    const config = getApiConfig();
    
    // Test endpoint accessibility (just URL format)
    const endpointTests = {};
    Object.keys(config.endpoints).forEach(key => {
      const endpoint = config.endpoints[key];
      endpointTests[key] = {
        url: endpoint,
        isValid: endpoint.startsWith('http') || endpoint.startsWith('/'),
        hasExpectedFormat: endpoint.includes('/wp-json/') || endpoint.includes('/wp/v2/')
      };
    });
    
    return {
      success: true,
      config: config,
      endpoints: config.endpoints,
      endpointTests: endpointTests,
      globalDataSources: {
        qe_data: hasQeData,
        qeApiConfig: hasQeApiConfig,
        dataUsed: hasQeData ? 'qe_data' : 'qeApiConfig'
      }
    };
    
  } catch (error) {
    console.error('❌ API Configuration Test Failed:', error);
    
    return {
      success: false,
      error: error.message,
      wpData: window.qe_data || window.qeApiConfig || null,
      recommendations: [
        'Verify WordPress admin page is loading correctly',
        'Check browser console for JavaScript errors',
        'Ensure WordPress REST API is enabled',
        'Verify user permissions for API access'
      ]
    };
  }
};

/**
 * Default request headers for WordPress REST API - IMPROVED
 * @returns {Object} Headers object with error handling
 */
export const getDefaultHeaders = () => {
  try {
    const { nonce } = getApiConfig();
    
    return {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
    };
  } catch (error) {
    console.error('❌ Error getting default headers:', error);
    
    // Return minimal headers as fallback
    return {
      'Content-Type': 'application/json'
    };
  }
};

/**
 * Default fetch options with improved error handling
 * @returns {Object} Fetch options object
 */
export const getDefaultFetchOptions = () => ({
  credentials: 'same-origin',
  // Add timeout handling
  signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
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

/**
 * Validate WordPress environment
 * @returns {Object} Environment validation results
 */
export const validateWordPressEnvironment = () => {
  const checks = {
    hasWordPress: typeof window.wp !== 'undefined',
    hasRestApi: typeof window.wp?.api !== 'undefined',
    hasNonce: !!(window.qe_data?.nonce || window.qeApiConfig?.nonce),
    hasApiUrl: !!(window.qe_data?.api_url || window.qeApiConfig?.api_url),
    hasEndpoints: !!(window.qe_data?.endpoints || window.qeApiConfig?.endpoints),
    isAdminPage: window.location.href.includes('/wp-admin/'),
    hasCurrentUser: !!(window.qe_data?.user || window.qeApiConfig?.user)
  };
  
  const allPassed = Object.values(checks).every(check => check === true);
  
  return {
    success: allPassed,
    checks: checks,
    issues: Object.keys(checks).filter(key => !checks[key])
  };
};

/**
 * Get a specific endpoint URL with validation
 * @param {string} endpointName - Name of the endpoint (e.g., 'lessons', 'courses')
 * @returns {string} Full endpoint URL
 */
export const getEndpoint = (endpointName) => {
  try {
    const { endpoints } = getApiConfig();
    
    if (!endpoints[endpointName]) {
      throw new Error(`Endpoint "${endpointName}" not found. Available: ${Object.keys(endpoints).join(', ')}`);
    }
    
    return endpoints[endpointName];
    
  } catch (error) {
    console.error(`❌ Error getting endpoint "${endpointName}":`, error);
    throw error;
  }
};

/**
 * Build URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {Object|URLSearchParams} params - Query parameters
 * @returns {string} Full URL with parameters
 */
export const buildUrl = (baseUrl, params) => {
  if (!params) return baseUrl;
  
  const urlParams = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  const queryString = urlParams.toString();
  
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Debug function to log current API configuration
 */
export const debugApiConfig = () => {
  console.group('🔍 API Configuration Debug');
  
  try {
    const config = getApiConfig();
    const envValidation = validateWordPressEnvironment();
    const configTest = testApiConfig();
    
    console.log('✅ Current Configuration:', config);
    console.log('🌍 Environment Validation:', envValidation);
    console.log('🧪 Configuration Test:', configTest);
    
  } catch (error) {
    console.error('❌ Debug Failed:', error);
  }
  
  console.groupEnd();
};