/**
 * Base Service - Core API Foundation
 * 
 * Generic CRUD operations factory for all resources
 * Eliminates code duplication across services
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { getApiConfig } from '../config/apiConfig.js';

/**
 * Get WordPress configuration with validation
 * @throws {Error} If configuration is missing
 */
const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found. Ensure qe_data is loaded.');
  }
  
  if (!config.endpoints) {
    throw new Error('API endpoints not configured in WordPress');
  }
  
  return config;
};

/**
 * Make HTTP request to WordPress REST API
 * @param {string} url - Full request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response with data and headers
 */
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
      const errorData = await response.text();
      throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorData}`);
    }

    const data = await response.json();
    
    return {
      data,
      headers: {
        'X-WP-Total': response.headers.get('X-WP-Total'),
        'X-WP-TotalPages': response.headers.get('X-WP-TotalPages')
      }
    };

  } catch (error) {
    console.error('💥 API Request Failed:', url, error);
    throw error;
  }
};

/**
 * Build query parameters for resource requests
 * @param {Object} options - Filter options
 * @returns {URLSearchParams} Query parameters
 */
const buildQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    status = 'publish,draft,private',
    search = '',
    orderBy = 'date',
    order = 'desc',
    embed = true
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    status: status,
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  return params;
};

/**
 * Create a resource service with CRUD operations
 * 
 * @param {string} resourceName - Resource name (e.g., 'course', 'lesson')
 * @param {string} endpointKey - Key in config.endpoints (e.g., 'courses', 'lessons')
 * @param {Object} customOptions - Custom options
 * @param {Function} customOptions.sanitizer - Custom data sanitizer function
 * @param {Function} customOptions.validator - Custom data validator function
 * @param {Function} customOptions.transformer - Custom data transformer for API
 * @param {Function} customOptions.buildParams - Custom query params builder
 * @returns {Object} Service methods
 */
export const createResourceService = (resourceName, endpointKey, customOptions = {}) => {
  const {
    sanitizer = (data) => data,
    validator = () => ({ isValid: true, errors: [] }),
    transformer = (data) => data,
    buildParams: customBuildParams = buildQueryParams
  } = customOptions;

  /**
   * Get endpoint URL from config
   * @returns {string} Endpoint URL
   */
  const getEndpoint = () => {
    const config = getWpConfig();
    if (!config.endpoints[endpointKey]) {
      throw new Error(`Endpoint '${endpointKey}' not configured`);
    }
    return config.endpoints[endpointKey];
  };

  return {
    /**
     * Get all resources with filtering
     * @param {Object} options - Filter options
     * @returns {Promise<Object>} Resources and pagination
     */
    getAll: async (options = {}) => {
      try {
        const endpoint = getEndpoint();
        const params = customBuildParams(options);
        const url = `${endpoint}?${params.toString()}`;
        
        console.log(`🎯 GET ${resourceName}s:`, url);
        
        const response = await makeApiRequest(url);
        
        const sanitizedData = Array.isArray(response.data)
          ? response.data.map(sanitizer)
          : [];
        
        return {
          data: sanitizedData,
          pagination: {
            currentPage: options.page || 1,
            totalPages: parseInt(response.headers['X-WP-TotalPages'] || '1'),
            total: parseInt(response.headers['X-WP-Total'] || '0'),
            perPage: options.perPage || 20
          }
        };
        
      } catch (error) {
        console.error(`❌ Error fetching ${resourceName}s:`, error);
        throw error;
      }
    },

    /**
     * Get single resource by ID
     * @param {number} id - Resource ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Resource data
     */
    getOne: async (id, options = {}) => {
      try {
        if (!id || !Number.isInteger(id) || id <= 0) {
          throw new Error(`Invalid ${resourceName} ID: ${id}`);
        }

        const endpoint = getEndpoint();
        const params = new URLSearchParams();
        
        if (options.embed !== false) {
          params.append('_embed', 'true');
        }

        const url = `${endpoint}/${id}?${params.toString()}`;
        console.log(`🎯 GET ${resourceName}:`, url);
        
        const response = await makeApiRequest(url);
        
        return sanitizer(response.data);
        
      } catch (error) {
        console.error(`❌ Error fetching ${resourceName} ${id}:`, error);
        
        // Return null for 404 errors
        if (error.message.includes('404')) {
          return null;
        }
        
        throw error;
      }
    },

    /**
     * Create new resource
     * @param {Object} data - Resource data
     * @returns {Promise<Object>} Created resource
     */
    create: async (data) => {
      try {
        // Validate data
        const validation = validator(data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const endpoint = getEndpoint();
        const transformedData = transformer(data);

        console.log(`📝 Creating ${resourceName}:`, transformedData);
        
        const response = await makeApiRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(transformedData)
        });
        
        console.log(`✅ ${resourceName} created:`, response.data.id);
        return sanitizer(response.data);
        
      } catch (error) {
        console.error(`❌ Error creating ${resourceName}:`, error);
        throw error;
      }
    },

    /**
     * Update existing resource
     * @param {number} id - Resource ID
     * @param {Object} data - Resource data
     * @returns {Promise<Object>} Updated resource
     */
    update: async (id, data) => {
      try {
        if (!id || !Number.isInteger(id) || id <= 0) {
          throw new Error(`Invalid ${resourceName} ID: ${id}`);
        }

        // Validate data
        const validation = validator(data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const endpoint = getEndpoint();
        const transformedData = transformer(data);

        console.log(`✏️ Updating ${resourceName} ${id}:`, transformedData);
        
        const url = `${endpoint}/${id}`;
        const response = await makeApiRequest(url, {
          method: 'POST', // WordPress REST API uses POST for updates
          body: JSON.stringify(transformedData)
        });
        
        console.log(`✅ ${resourceName} updated:`, id);
        return sanitizer(response.data);
        
      } catch (error) {
        console.error(`❌ Error updating ${resourceName} ${id}:`, error);
        throw error;
      }
    },

    /**
     * Delete resource
     * @param {number} id - Resource ID
     * @param {Object} options - Delete options
     * @returns {Promise<boolean>} Success status
     */
    delete: async (id, options = {}) => {
      try {
        if (!id || !Number.isInteger(id) || id <= 0) {
          throw new Error(`Invalid ${resourceName} ID: ${id}`);
        }

        const endpoint = getEndpoint();
        const params = new URLSearchParams();
        
        if (options.force) {
          params.append('force', 'true');
        }

        const url = `${endpoint}/${id}?${params.toString()}`;
        console.log(`🗑️ Deleting ${resourceName} ${id}`);
        
        await makeApiRequest(url, {
          method: 'DELETE'
        });
        
        console.log(`✅ ${resourceName} deleted:`, id);
        return true;
        
      } catch (error) {
        console.error(`❌ Error deleting ${resourceName} ${id}:`, error);
        throw error;
      }
    },

    /**
     * Get resource count
     * @param {Object} options - Filter options
     * @returns {Promise<number>} Total count
     */
    getCount: async (options = {}) => {
      try {
        const result = await service.getAll({ ...options, perPage: 1 });
        return result.pagination.total;
      } catch (error) {
        console.error(`❌ Error getting ${resourceName} count:`, error);
        return 0;
      }
    }
  };
};

/**
 * Export helper to make API requests directly
 * (for custom operations not covered by CRUD)
 */
export { makeApiRequest, buildQueryParams };