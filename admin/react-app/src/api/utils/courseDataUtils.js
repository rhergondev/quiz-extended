/**
 * Course Data Validation and Transformation Utilities
 * Complete refactor to match WordPress REST API requirements
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 3.0.0
 */

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Default course meta fields structure
 * Matches WordPress meta registration
 */
const DEFAULT_COURSE_META = {
  _start_date: '',
  _end_date: '',
  _price: 0,
  _sale_price: null,
  _duration_weeks: null,
  _max_students: null,
  _difficulty_level: 'medium',
  _product_type: 'free',
  _woocommerce_product_id: 0,
  _lesson_ids: []
};

/**
 * Valid course statuses (WordPress post statuses)
 */
export const VALID_COURSE_STATUSES = ['publish', 'draft', 'private', 'pending'];

/**
 * Valid difficulty levels
 */
export const VALID_DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'];

/**
 * Valid product types
 */
export const VALID_PRODUCT_TYPES = ['free', 'paid'];

// ============================================================
// TRANSFORMATION FOR API REQUESTS
// ============================================================

/**
 * Transform course data for WordPress REST API requests
 * 
 * WordPress REST API structure:
 * - Root level: title, content, excerpt, status, featured_media
 * - Root level: Taxonomies (qe_category, qe_difficulty, qe_topic, course_type)
 * - meta object: All custom fields with _ prefix
 * 
 * @param {Object} courseData - Raw course data from modal
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformCourseDataForApi = (courseData) => {
  console.log('🔄 transformCourseDataForApi - Input:', courseData);

  // ============================================================
  // ROOT LEVEL FIELDS (WordPress standard)
  // ============================================================
  
  const transformed = {
    // Title - required
    title: courseData.title || '',
    
    // Content - main description
    content: courseData.content || '',
    
    // Excerpt - short description (auto-generated if not provided)
    excerpt: courseData.excerpt || '',
    
    // Status - publish by default, not draft
    status: courseData.status || 'publish',
  };

  // ============================================================
  // FEATURED MEDIA (WordPress standard, root level)
  // ============================================================
  
  if (courseData.featured_media !== undefined) {
    transformed.featured_media = typeof courseData.featured_media === 'number' 
      ? courseData.featured_media 
      : parseInt(courseData.featured_media) || 0;
  }

  // ============================================================
  // TAXONOMIES (WordPress standard, root level)
  // ============================================================
  
  // Category taxonomy
  if (courseData.qe_category !== undefined) {
    transformed.qe_category = sanitizeTaxonomyArray(courseData.qe_category);
  }

  // Difficulty taxonomy
  if (courseData.qe_difficulty !== undefined) {
    transformed.qe_difficulty = sanitizeTaxonomyArray(courseData.qe_difficulty);
  }

  // Topic taxonomy
  if (courseData.qe_topic !== undefined) {
    transformed.qe_topic = sanitizeTaxonomyArray(courseData.qe_topic);
  }

  // Course type taxonomy
  if (courseData.course_type !== undefined) {
    transformed.course_type = sanitizeTaxonomyArray(courseData.course_type);
  }

  // ============================================================
  // META FIELDS (Custom fields with _ prefix)
  // ============================================================
  
  transformed.meta = {};

  // Date fields
  if (courseData._start_date !== undefined) {
    transformed.meta._start_date = sanitizeDateField(courseData._start_date);
  } else if (courseData.meta?._start_date !== undefined) {
    transformed.meta._start_date = sanitizeDateField(courseData.meta._start_date);
  }

  if (courseData._end_date !== undefined) {
    transformed.meta._end_date = sanitizeDateField(courseData._end_date);
  } else if (courseData.meta?._end_date !== undefined) {
    transformed.meta._end_date = sanitizeDateField(courseData.meta._end_date);
  }

  // Price fields
  if (courseData._price !== undefined) {
    transformed.meta._price = sanitizePriceField(courseData._price);
  } else if (courseData.meta?._price !== undefined) {
    transformed.meta._price = sanitizePriceField(courseData.meta._price);
  }

  if (courseData._sale_price !== undefined) {
    transformed.meta._sale_price = sanitizeOptionalPrice(courseData._sale_price);
  } else if (courseData.meta?._sale_price !== undefined) {
    transformed.meta._sale_price = sanitizeOptionalPrice(courseData.meta._sale_price);
  }

  // Numeric fields
  if (courseData._duration_weeks !== undefined) {
    transformed.meta._duration_weeks = sanitizeOptionalInteger(courseData._duration_weeks);
  } else if (courseData.meta?._duration_weeks !== undefined) {
    transformed.meta._duration_weeks = sanitizeOptionalInteger(courseData.meta._duration_weeks);
  }

  if (courseData._max_students !== undefined) {
    transformed.meta._max_students = sanitizeOptionalInteger(courseData._max_students);
  } else if (courseData.meta?._max_students !== undefined) {
    transformed.meta._max_students = sanitizeOptionalInteger(courseData.meta._max_students);
  }

  // String fields
  if (courseData._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeDifficultyLevel(courseData._difficulty_level);
  } else if (courseData.meta?._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeDifficultyLevel(courseData.meta._difficulty_level);
  }

  if (courseData._product_type !== undefined) {
    transformed.meta._product_type = sanitizeProductType(courseData._product_type);
  } else if (courseData.meta?._product_type !== undefined) {
    transformed.meta._product_type = sanitizeProductType(courseData.meta._product_type);
  }

  // WooCommerce integration
  if (courseData._woocommerce_product_id !== undefined) {
    transformed.meta._woocommerce_product_id = sanitizeInteger(courseData._woocommerce_product_id);
  } else if (courseData.meta?._woocommerce_product_id !== undefined) {
    transformed.meta._woocommerce_product_id = sanitizeInteger(courseData.meta._woocommerce_product_id);
  }

  // Lesson IDs (relationships)
  if (courseData._lesson_ids !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(courseData._lesson_ids);
  } else if (courseData.meta?._lesson_ids !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(courseData.meta._lesson_ids);
  }

  // Apply defaults for missing fields
  transformed.meta = {
    ...DEFAULT_COURSE_META,
    ...transformed.meta
  };

  console.log('🔄 transformCourseDataForApi - Output:', transformed);
  console.log('   - Title:', transformed.title);
  console.log('   - Status:', transformed.status);
  console.log('   - Categories:', transformed.qe_category);
  console.log('   - Featured Media:', transformed.featured_media);
  console.log('   - Meta:', transformed.meta);

  return transformed;
};

// ============================================================
// SANITIZATION FOR DISPLAY
// ============================================================

/**
 * Sanitize course data from API for display in React components
 * Normalizes WordPress REST API response format
 * 
 * @param {Object} courseData - Raw course data from WordPress API
 * @returns {Object} Sanitized course data
 */
export const sanitizeCourseData = (courseData) => {
  if (!courseData) {
    console.warn('⚠️ sanitizeCourseData - No data provided');
    return null;
  }

  // Extract title (handle both object and string)
  const title = courseData.title?.rendered || courseData.title || '';
  
  // Extract content (handle both object and string)
  const content = courseData.content?.rendered || courseData.content || '';
  
  // Extract excerpt (handle both object and string)
  const excerpt = courseData.excerpt?.rendered || courseData.excerpt || '';

  const sanitized = {
    // Core WordPress fields
    id: courseData.id || 0,
    title,
    content,
    excerpt,
    status: courseData.status || 'draft',
    date: courseData.date || '',
    modified: courseData.modified || '',
    slug: courseData.slug || '',
    author: courseData.author || 0,

    // Featured media
    featured_media: courseData.featured_media || 0,
    featured_media_url: extractFeaturedMediaUrl(courseData),

    // Taxonomies (preserve as arrays)
    qe_category: Array.isArray(courseData.qe_category) ? courseData.qe_category : [],
    qe_difficulty: Array.isArray(courseData.qe_difficulty) ? courseData.qe_difficulty : [],
    qe_topic: Array.isArray(courseData.qe_topic) ? courseData.qe_topic : [],
    course_type: Array.isArray(courseData.course_type) ? courseData.course_type : [],

    // Meta fields (with defaults)
    meta: {
      ...DEFAULT_COURSE_META,
      ...courseData.meta
    },

    // Computed fields from WordPress
    enrolled_users_count: courseData.enrolled_users_count || 0,
    lessons_count: courseData.lessons_count || 0,
    is_free: courseData.is_free !== undefined ? courseData.is_free : true,

    // Embedded data
    _embedded: courseData._embedded || {},

    // Links
    _links: courseData._links || {}
  };

  return sanitized;
};

/**
 * Extract featured media URL from _embedded data
 * @param {Object} courseData - Course data with _embedded
 * @returns {string} Featured media URL or empty string
 */
const extractFeaturedMediaUrl = (courseData) => {
  const featuredMedia = courseData._embedded?.['wp:featuredmedia']?.[0];
  
  if (!featuredMedia) {
    return '';
  }

  // Try different size options
  return featuredMedia.source_url || 
         featuredMedia.media_details?.sizes?.medium?.source_url ||
         featuredMedia.media_details?.sizes?.thumbnail?.source_url ||
         '';
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate course data before API request
 * 
 * @param {Object} courseData - Course data to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateCourseData = (courseData) => {
  const errors = [];

  // ============================================================
  // REQUIRED FIELDS
  // ============================================================
  
  if (!courseData.title || courseData.title.trim() === '') {
    errors.push('Course title is required');
  }

  // ============================================================
  // STATUS VALIDATION
  // ============================================================
  
  if (courseData.status && !VALID_COURSE_STATUSES.includes(courseData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_COURSE_STATUSES.join(', ')}`);
  }

  // ============================================================
  // TAXONOMY VALIDATION
  // ============================================================
  
  ['qe_category', 'qe_difficulty', 'qe_topic', 'course_type'].forEach(taxonomy => {
    if (courseData[taxonomy] !== undefined) {
      if (!Array.isArray(courseData[taxonomy])) {
        errors.push(`${taxonomy} must be an array`);
      } else if (courseData[taxonomy].length > 0) {
        const hasInvalidIds = courseData[taxonomy].some(id => 
          !Number.isInteger(Number(id))
        );
        if (hasInvalidIds) {
          errors.push(`${taxonomy} IDs must be valid numbers`);
        }
      }
    }
  });

  // ============================================================
  // FEATURED MEDIA VALIDATION
  // ============================================================
  
  if (courseData.featured_media !== undefined && 
      typeof courseData.featured_media !== 'number' &&
      isNaN(Number(courseData.featured_media))) {
    errors.push('Featured media must be a valid number');
  }

  // ============================================================
  // META FIELDS VALIDATION
  // ============================================================
  
  // Extract meta (handle both flat and nested structure)
  const meta = courseData.meta || courseData;

  // Price validation
  if (meta._price !== undefined && meta._price !== '' && isNaN(parseFloat(meta._price))) {
    errors.push('Price must be a valid number');
  }

  if (meta._sale_price !== undefined && meta._sale_price !== '' && 
      meta._sale_price !== null && isNaN(parseFloat(meta._sale_price))) {
    errors.push('Sale price must be a valid number');
  }

  // Numeric fields validation
  if (meta._max_students !== undefined && meta._max_students !== '' && 
      meta._max_students !== null && isNaN(parseInt(meta._max_students))) {
    errors.push('Max students must be a valid number');
  }

  if (meta._duration_weeks !== undefined && meta._duration_weeks !== '' && 
      meta._duration_weeks !== null && isNaN(parseInt(meta._duration_weeks))) {
    errors.push('Duration weeks must be a valid number');
  }

  // Difficulty level validation
  if (meta._difficulty_level && !VALID_DIFFICULTY_LEVELS.includes(meta._difficulty_level)) {
    errors.push(`Invalid difficulty level. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
  }

  // Product type validation
  if (meta._product_type && !VALID_PRODUCT_TYPES.includes(meta._product_type)) {
    errors.push(`Invalid product type. Must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`);
  }

  // Date validation
  if (meta._start_date && !isValidDate(meta._start_date)) {
    errors.push('Start date must be a valid date (YYYY-MM-DD)');
  }

  if (meta._end_date && !isValidDate(meta._end_date)) {
    errors.push('End date must be a valid date (YYYY-MM-DD)');
  }

  // Date logic validation
  if (meta._start_date && meta._end_date) {
    const startDate = new Date(meta._start_date);
    const endDate = new Date(meta._end_date);

    if (startDate >= endDate) {
      errors.push('End date must be after start date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================
// SANITIZATION HELPER FUNCTIONS
// ============================================================

/**
 * Sanitize taxonomy array
 * @param {*} value - Taxonomy value
 * @returns {number[]} Array of taxonomy term IDs
 */
const sanitizeTaxonomyArray = (value) => {
  if (!value) {
    return [];
  }

  // If it's already an array
  if (Array.isArray(value)) {
    return value
      .map(id => parseInt(id))
      .filter(id => !isNaN(id) && id > 0);
  }

  // If it's a single value
  const id = parseInt(value);
  return !isNaN(id) && id > 0 ? [id] : [];
};

/**
 * Sanitize date field (YYYY-MM-DD format)
 * @param {*} value - Date value
 * @returns {string} Sanitized date or empty string
 */
const sanitizeDateField = (value) => {
  if (!value || value === '') {
    return '';
  }

  // If it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Try to parse and format
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return '';
};

/**
 * Sanitize price field
 * @param {*} value - Price value
 * @returns {number} Sanitized price
 */
const sanitizePriceField = (value) => {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const price = parseFloat(value);
  return isNaN(price) || price < 0 ? 0 : Math.round(price * 100) / 100;
};

/**
 * Sanitize optional price field
 * @param {*} value - Price value
 * @returns {number|null} Sanitized price or null
 */
const sanitizeOptionalPrice = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const price = parseFloat(value);
  if (isNaN(price) || price <= 0) {
    return null;
  }

  return Math.round(price * 100) / 100;
};

/**
 * Sanitize integer field
 * @param {*} value - Integer value
 * @returns {number} Sanitized integer
 */
const sanitizeInteger = (value) => {
  const int = parseInt(value);
  return isNaN(int) || int < 0 ? 0 : int;
};

/**
 * Sanitize optional integer field
 * @param {*} value - Integer value
 * @returns {number|null} Sanitized integer or null
 */
const sanitizeOptionalInteger = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const int = parseInt(value);
  return isNaN(int) || int <= 0 ? null : int;
};

/**
 * Sanitize difficulty level
 * @param {string} value - Difficulty level
 * @returns {string} Sanitized difficulty level
 */
const sanitizeDifficultyLevel = (value) => {
  const normalized = String(value).toLowerCase().trim();
  return VALID_DIFFICULTY_LEVELS.includes(normalized) ? normalized : 'medium';
};

/**
 * Sanitize product type
 * @param {string} value - Product type
 * @returns {string} Sanitized product type
 */
const sanitizeProductType = (value) => {
  const normalized = String(value).toLowerCase().trim();
  return VALID_PRODUCT_TYPES.includes(normalized) ? normalized : 'free';
};

/**
 * Sanitize array of IDs
 * @param {*} value - Array of IDs
 * @returns {number[]} Sanitized array of IDs
 */
const sanitizeIdArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(id => parseInt(id))
    .filter(id => !isNaN(id) && id > 0);
};

/**
 * Check if date string is valid
 * @param {string} dateString - Date string
 * @returns {boolean} True if valid
 */
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

// ============================================================
// FORMATTING FOR DISPLAY
// ============================================================

/**
 * Format course data for display in lists/cards
 * @param {Object} course - Course data
 * @returns {Object} Formatted course
 */
export const formatCourseForDisplay = (course) => {
  const sanitized = sanitizeCourseData(course);

  if (!sanitized) {
    return null;
  }

  return {
    ...sanitized,
    // Format price for display
    formattedPrice: sanitized.meta._price > 0
      ? `$${sanitized.meta._price.toFixed(2)}`
      : 'Free',
    formattedSalePrice: sanitized.meta._sale_price
      ? `$${sanitized.meta._sale_price.toFixed(2)}`
      : null,
    // Format dates for display
    formattedStartDate: sanitized.meta._start_date
      ? new Date(sanitized.meta._start_date).toLocaleDateString()
      : '',
    formattedEndDate: sanitized.meta._end_date
      ? new Date(sanitized.meta._end_date).toLocaleDateString()
      : '',
    // Capitalize difficulty
    formattedDifficulty: sanitized.meta._difficulty_level
      ? sanitized.meta._difficulty_level.charAt(0).toUpperCase() + 
        sanitized.meta._difficulty_level.slice(1)
      : 'Medium'
  };
};