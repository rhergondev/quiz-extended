/**
 * Base Service - Core API Foundation
 * * Generic CRUD operations factory for all resources
 * Eliminates code duplication across services
 * * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.1
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

// Shared promise so concurrent 403s only trigger one refresh call
let _nonceRefreshPromise = null;

/**
 * Silently fetch a fresh wp_rest nonce using session-cookie auth (no X-WP-Nonce sent).
 * Updates window.qe_data.nonce in place so subsequent makeApiRequest calls use it.
 * Throws if the user's login session has also expired.
 */
const refreshWpNonce = () => {
  if (!_nonceRefreshPromise) {
    const wpData = window.qe_data || window.qeApiConfig || {};
    const url = `${wpData.api_url}/quiz-extended/v1/refresh-nonce`;

    _nonceRefreshPromise = fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      // No X-WP-Nonce header — WP falls back to session-cookie auth
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then(data => {
        const newNonce = data?.data?.nonce;
        if (!newNonce) throw new Error('No nonce returned');
        if (window.qe_data) window.qe_data.nonce = newNonce;
        if (window.qeApiConfig) window.qeApiConfig.nonce = newNonce;
        return newNonce;
      })
      .finally(() => { _nonceRefreshPromise = null; });
  }
  return _nonceRefreshPromise;
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
    const { _isRetry, ...fetchOptions } = options;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
      ...fetchOptions
    };

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      // On 403 (expired nonce), try to silently refresh and retry once
      if (response.status === 403 && !_isRetry) {
        try {
          await refreshWpNonce();
          return await makeApiRequest(url, { ...options, _isRetry: true });
        } catch {
          // Nonce refresh failed — session is truly expired
          window.dispatchEvent(new CustomEvent('qe-session-expired'));
          throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
        }
      }
      const errorData = await response.text();
      const technicalError = new Error(`API Error ${response.status}: ${response.statusText} - ${errorData}`);
      technicalError.status = response.status;
      technicalError.userMessage = {
        400: 'La solicitud no fue válida. Por favor, inténtalo de nuevo.',
        401: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
        403: 'No tienes permiso para realizar esta acción.',
        404: 'El recurso solicitado no existe.',
        429: 'Demasiadas solicitudes. Por favor, espera un momento e inténtalo de nuevo.',
        500: 'Error en el servidor. Por favor, inténtalo más tarde.',
        502: 'Servidor no disponible temporalmente. Por favor, inténtalo más tarde.',
        503: 'Servicio no disponible. Por favor, inténtalo más tarde.',
      }[response.status] || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
      throw technicalError;
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
    perPage = 50, // 🔥 BALANCED: 50 items per page - good balance for lists
    search = '',
    orderBy = 'date',
    order = 'desc',
    embed = false, // 🎯 OPTIMIZED: Changed default to false to avoid unnecessary data
    fields = null, // 🔥 NEW: Allow specifying specific fields to return
    status,
    category,
    difficulty,
    courseId,
    quizId,
    enrolledOnly
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  // 🔥 NEW: Add _fields parameter to limit data transfer
  if (fields && Array.isArray(fields)) {
    params.append('_fields', fields.join(','));
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  // Add status filter if provided
  if (status) {
    params.append('status', status);
  }

  // Add category filter if provided
  if (category) {
    params.append('qe_category', category);
  }

  // Add difficulty filter if provided
  if (difficulty) {
    params.append('qe_difficulty', difficulty);
  }

  // Add course_id filter if provided (for lessons)
  if (courseId) {
    params.append('course_id', courseId.toString());
  }

  // Add quiz_id filter if provided (for questions)
  if (quizId) {
    params.append('quiz_id', quizId.toString());
  }

  // 🎯 NEW: Add enrolled_only filter if provided
  if (enrolledOnly === true || enrolledOnly === 'true') {
    params.append('enrolled_only', 'true');
  }

  return params;
};

/**
 * Create a resource service with CRUD operations
 * * @param {string} resourceName - Resource name (e.g., 'course', 'lesson')
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
        
        // 🔥 FIX: Solo usar context=edit si se especifica explícitamente
        // Por defecto usamos context=view que está disponible para todos los usuarios
        if (options.context === 'edit') {
          params.append('context', 'edit');
        } else {
          // context=view es el default y no hace falta especificarlo, pero lo hacemos explícito
          params.append('context', 'view');
        }
        
        if (options.embed !== false) {
          params.append('_embed', 'true');
        }

        const url = `${endpoint}/${id}?${params.toString()}`;
        console.log(`🎯 GET ${resourceName}:`, url);
        
        const response = await makeApiRequest(url);
        
        // 🔍 DEBUG: Ver datos ANTES del sanitizer
        console.log(`🔍 RAW API response for ${resourceName}:`, {
          id: response.data?.id,
          hasContent: !!response.data?.content,
          contentRendered: response.data?.content?.rendered,
          contentRaw: response.data?.content?.raw
        });
        
        return sanitizer(response.data);
        
      } catch (error) {
        console.error(`❌ Error fetching ${resourceName} ${id}:`, error);
        
        // 🔥 Si falla con 403 y estábamos usando context=edit, intentar con context=view
        if ((error.message.includes('403') || error.message.includes('401')) && options.context === 'edit') {
          console.warn(`⚠️ Access denied with context=edit, retrying with context=view for ${resourceName} ${id}`);
          
          try {
            const endpoint = getEndpoint();
            const params = new URLSearchParams();
            params.append('context', 'view');
            
            if (options.embed !== false) {
              params.append('_embed', 'true');
            }
            
            const retryUrl = `${endpoint}/${id}?${params.toString()}`;
            console.log(`🔄 Retry GET ${resourceName}:`, retryUrl);
            
            const retryResponse = await makeApiRequest(retryUrl);
            return sanitizer(retryResponse.data);
          } catch (retryError) {
            console.error(`❌ Retry also failed for ${resourceName} ${id}:`, retryError);
            throw retryError;
          }
        }
        
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
        const validation = validator(data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const endpoint = getEndpoint();
        const transformedData = transformer(data);
        
        const response = await makeApiRequest(endpoint, {
          method: 'POST',
          body: JSON.stringify(transformedData)
        });
        
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

        const validation = validator(data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const endpoint = getEndpoint();
        const transformedData = transformer(data);
        
        const url = `${endpoint}/${id}`;
        const response = await makeApiRequest(url, {
          method: 'POST', // WordPress REST API uses POST for updates
          body: JSON.stringify(transformedData)
        });
        
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

export { makeApiRequest, buildQueryParams };