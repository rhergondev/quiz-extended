// admin/react-app/src/api/services/taxonomyService.js

/**
 * Taxonomy Service
 * * Handles all taxonomy-related API calls using the same pattern as other services
 * Taxonomies: qe_category, qe_topic, qe_difficulty, qe_provider, qe_course_type
 * * @package QuizExtended
 * @subpackage Admin/ReactApp/API/Services
 * @version 1.0.0
 */

/**
 * Get WordPress configuration
 * @returns {Object} WordPress config from window.qe_data
 */
const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found. Ensure qe_data is loaded.');
  }
  
  if (!config.api_url) {
    throw new Error('API URL not configured in WordPress');
  }
  
  return config;
};

/**
 * Make API request with proper headers
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
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
    const errorData = await response.text();
    throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorData}`);
  }

  // MODIFICADO: Devolvemos el objeto response completo para poder acceder a los headers
  return response;
};

// ============================================================
// GET TAXONOMY TERMS
// ============================================================

/**
 * Get all terms for a specific taxonomy
 * * @param {string} taxonomy - Taxonomy slug (e.g., 'qe_category')
 * @param {Object} options - Query options
 * @param {number} options.perPage - Items per page (default: 100)
 * @param {string} options.search - Search term
 * @param {boolean} options.hideEmpty - Hide empty terms (default: false)
 * @returns {Promise<Array>} Array of taxonomy terms
 */
export const getTaxonomyTerms = async (taxonomy, options = {}) => {
  try {
    const config = getWpConfig();
    const {
      perPage = 100,
      search = '',
      hideEmpty = false
    } = options;

    const queryParams = new URLSearchParams({
      per_page: perPage.toString(),
      hide_empty: hideEmpty.toString(),
      _fields: 'id,name,slug,description,count,parent'
    });

    if (search) {
      queryParams.append('search', search);
    }

    const url = `${config.api_url}/wp/v2/${taxonomy}?${queryParams}`;
    
    console.log(`🔍 Fetching ${taxonomy} terms:`, url);

    const response = await makeApiRequest(url);
    // 🔥 CORRECCIÓN: El servicio base ya parsea a JSON. Accedemos directamente a la data.
    const terms = await response.json();

    console.log(`✅ Fetched ${terms.length} ${taxonomy} terms`);

    return terms;

  } catch (error) {
    console.error(`❌ Error fetching ${taxonomy} terms:`, error);
    throw error;
  }
};

// ============================================================
// GET SINGLE TERM
// ============================================================

/**
 * Get a single taxonomy term by ID
 * * @param {string} taxonomy - Taxonomy slug
 * @param {number} termId - Term ID
 * @returns {Promise<Object>} Taxonomy term object
 */
export const getTaxonomyTerm = async (taxonomy, termId) => {
  try {
    const config = getWpConfig();
    const url = `${config.api_url}/wp/v2/${taxonomy}/${termId}`;
    
    console.log(`🔍 Fetching ${taxonomy} term #${termId}`);

    const response = await makeApiRequest(url);
    const term = await response.json();

    console.log(`✅ Fetched ${taxonomy} term:`, term.name);

    return term;

  } catch (error) {
    console.error(`❌ Error fetching ${taxonomy} term #${termId}:`, error);
    throw error;
  }
};

// ============================================================
// CREATE TERM
// ============================================================

/**
 * Create a new taxonomy term
 * * @param {string} taxonomy - Taxonomy slug
 * @param {Object} termData - Term data
 * @param {string} termData.name - Term name (required)
 * @param {string} termData.slug - Term slug (optional)
 * @param {string} termData.description - Term description (optional)
 * @param {number} termData.parent - Parent term ID (optional, for hierarchical taxonomies)
 * @returns {Promise<Object>} Created term object
 */
export const createTaxonomyTerm = async (taxonomy, termData) => {
  try {
    const config = getWpConfig();
    const url = `${config.api_url}/wp/v2/${taxonomy}`;
    
    console.log(`➕ Creating ${taxonomy} term:`, termData.name);

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(termData)
    });

    const newTerm = await response.json();

    console.log(`✅ Created ${taxonomy} term:`, newTerm.name, `(ID: ${newTerm.id})`);

    return newTerm;

  } catch (error) {
    console.error(`❌ Error creating ${taxonomy} term:`, error);
    throw error;
  }
};

// ============================================================
// UPDATE TERM
// ============================================================

/**
 * Update a taxonomy term
 * * @param {string} taxonomy - Taxonomy slug
 * @param {number} termId - Term ID
 * @param {Object} termData - Updated term data
 * @returns {Promise<Object>} Updated term object
 */
export const updateTaxonomyTerm = async (taxonomy, termId, termData) => {
  try {
    const config = getWpConfig();
    const url = `${config.api_url}/wp/v2/${taxonomy}/${termId}`;
    
    console.log(`✏️ Updating ${taxonomy} term #${termId}`);

    const response = await makeApiRequest(url, {
      method: 'POST', // WordPress REST API uses POST for updates
      body: JSON.stringify(termData)
    });

    const updatedTerm = await response.json();

    console.log(`✅ Updated ${taxonomy} term:`, updatedTerm.name);

    return updatedTerm;

  } catch (error) {
    console.error(`❌ Error updating ${taxonomy} term #${termId}:`, error);
    throw error;
  }
};

// ============================================================
// DELETE TERM
// ============================================================

/**
 * Delete a taxonomy term
 * * @param {string} taxonomy - Taxonomy slug
 * @param {number} termId - Term ID
 * @param {boolean} force - Force delete (default: false)
 * @returns {Promise<Object>} Deletion response
 */
export const deleteTaxonomyTerm = async (taxonomy, termId, force = false) => {
  try {
    const config = getWpConfig();
    const url = `${config.api_url}/wp/v2/${taxonomy}/${termId}?force=${force}`;
    
    console.log(`🗑️ Deleting ${taxonomy} term #${termId}`);

    const response = await makeApiRequest(url, {
      method: 'DELETE'
    });

    const result = await response.json();

    console.log(`✅ Deleted ${taxonomy} term`);

    return result;

  } catch (error) {
    console.error(`❌ Error deleting ${taxonomy} term #${termId}:`, error);
    throw error;
  }
};

// ============================================================
// HELPER FUNCTIONS (Shortcuts)
// ============================================================

/**
 * Get categories (shorthand for qe_category)
 */
export const getCategories = (options) => getTaxonomyTerms('qe_category', options);

/**
 * Get topics (shorthand for qe_topic)
 */
export const getTopics = (options) => getTaxonomyTerms('qe_topic', options);

/**
 * Get difficulties (shorthand for qe_difficulty)
 */
export const getDifficulties = (options) => getTaxonomyTerms('qe_difficulty', options);

/**
 * Get providers (shorthand for qe_provider)
 */
export const getProviders = (options) => getTaxonomyTerms('qe_provider', options);

/**
 * Get course types (shorthand for qe_course_type)
 */
export const getCourseTypes = (options) => getTaxonomyTerms('qe_course_type', options);

/**
 * Create a category (shorthand)
 */
export const createCategory = (data) => createTaxonomyTerm('qe_category', data);

/**
 * Create a topic (shorthand)
 */
export const createTopic = (data) => createTaxonomyTerm('qe_topic', data);

// ============================================================
// BATCH OPERATIONS
// ============================================================

/**
 * Get all taxonomy options for forms
 * Returns a structured object with all taxonomies
 * * @returns {Promise<Object>} Object with all taxonomy options
 */
export const getAllTaxonomyOptions = async () => {
  try {
    console.log('🔍 Fetching all taxonomy options...');

    const [categories, topics, difficulties, providers, courseTypes] = await Promise.all([
      getCategories({ perPage: 100 }),
      getTopics({ perPage: 100 }),
      getDifficulties({ perPage: 100 }),
      getProviders({ perPage: 100 }),
      getCourseTypes({ perPage: 100 })
    ]);

    const result = {
      categories: categories.map(t => ({ value: t.id, label: t.name })),
      topics: topics.map(t => ({ value: t.id, label: t.name })),
      difficulties: difficulties.map(t => ({ value: t.id, label: t.name })),
      providers: providers.map(t => ({ value: t.id, label: t.name })),
      courseTypes: courseTypes.map(t => ({ value: t.id, label: t.name }))
    };

    console.log('✅ All taxonomy options fetched successfully');

    return result;

  } catch (error) {
    console.error('❌ Error fetching all taxonomy options:', error);
    return {
      categories: [],
      topics: [],
      difficulties: [],
      providers: [],
      courseTypes: []
    };
  }
};