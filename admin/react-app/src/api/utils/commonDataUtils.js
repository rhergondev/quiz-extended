/**
 * Common Data Utilities
 * Shared functions for data validation, transformation, and sanitization
 * Used by all resource-specific dataUtils
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 1.0.0
 */

// ============================================================
// CONSTANTS - COMMON WORDPRESS VALUES
// ============================================================

/**
 * Valid WordPress post statuses
 */
export const VALID_POST_STATUSES = ['publish', 'draft', 'private', 'pending', 'future', 'trash'];

/**
 * Default WordPress post statuses for queries
 */
export const DEFAULT_QUERY_STATUSES = ['publish', 'draft', 'private'];

/**
 * Valid boolean representations
 */
export const VALID_BOOLEAN_VALUES = {
  true: ['true', 'yes', '1', 1, true],
  false: ['false', 'no', '0', 0, false, '', null, undefined]
};

// ============================================================
// SANITIZATION - PRIMITIVE TYPES
// ============================================================

/**
 * Sanitize string field
 * @param {*} value - String value
 * @param {string} defaultValue - Default value if invalid (default: '')
 * @returns {string} Sanitized string
 */
export const sanitizeString = (value, defaultValue = '') => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value).trim();
};

/**
 * Sanitize integer field
 * @param {*} value - Integer value
 * @param {number} defaultValue - Default value if invalid (default: 0)
 * @param {number} min - Minimum value (default: 0)
 * @returns {number} Sanitized integer
 */
export const sanitizeInteger = (value, defaultValue = 0, min = 0) => {
  const int = parseInt(value);
  
  if (isNaN(int) || int < min) {
    return defaultValue;
  }
  
  return int;
};

/**
 * Sanitize optional integer field
 * Returns null for empty values
 * @param {*} value - Integer value
 * @param {number} min - Minimum value (default: 1)
 * @returns {number|null} Sanitized integer or null
 */
export const sanitizeOptionalInteger = (value, min = 1) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const int = parseInt(value);
  return (isNaN(int) || int < min) ? null : int;
};

/**
 * Sanitize float field
 * @param {*} value - Float value
 * @param {number} defaultValue - Default value if invalid (default: 0)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {number} min - Minimum value (default: 0)
 * @returns {number} Sanitized float
 */
export const sanitizeFloat = (value, defaultValue = 0, decimals = 2, min = 0) => {
  const float = parseFloat(value);
  
  if (isNaN(float) || float < min) {
    return defaultValue;
  }
  
  return Math.round(float * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Sanitize optional float field
 * Returns null for empty values
 * @param {*} value - Float value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {number} min - Minimum value (default: 0.01)
 * @returns {number|null} Sanitized float or null
 */
export const sanitizeOptionalFloat = (value, decimals = 2, min = 0.01) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const float = parseFloat(value);
  
  if (isNaN(float) || float < min) {
    return null;
  }
  
  return Math.round(float * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Sanitize boolean field
 * @param {*} value - Boolean value
 * @param {boolean} defaultValue - Default value if invalid (default: false)
 * @returns {boolean} Sanitized boolean
 */
export const sanitizeBoolean = (value, defaultValue = false) => {
  if (VALID_BOOLEAN_VALUES.true.includes(value)) {
    return true;
  }
  
  if (VALID_BOOLEAN_VALUES.false.includes(value)) {
    return false;
  }
  
  return defaultValue;
};

// ============================================================
// SANITIZATION - SPECIALIZED TYPES
// ============================================================

/**
 * Sanitize price field
 * @param {*} value - Price value
 * @returns {number} Sanitized price (0 if invalid)
 */
export const sanitizePrice = (value) => {
  return sanitizeFloat(value, 0, 2, 0);
};

/**
 * Sanitize optional price field
 * @param {*} value - Price value
 * @returns {number|null} Sanitized price or null
 */
export const sanitizeOptionalPrice = (value) => {
  return sanitizeOptionalFloat(value, 2, 0.01);
};

/**
 * Sanitize percentage field
 * @param {*} value - Percentage value
 * @param {number} min - Minimum percentage (default: 0)
 * @param {number} max - Maximum percentage (default: 100)
 * @returns {number} Sanitized percentage
 */
export const sanitizePercentage = (value, min = 0, max = 100) => {
  const percentage = sanitizeFloat(value, 0, 2, min);
  return Math.min(percentage, max);
};

/**
 * Sanitize URL field
 * @param {*} value - URL value
 * @returns {string} Sanitized URL or empty string
 */
export const sanitizeUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  
  // Basic URL validation
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    // If not a valid URL, return empty string
    return '';
  }
};

/**
 * Sanitize email field
 * @param {*} value - Email value
 * @returns {string} Sanitized email or empty string
 */
export const sanitizeEmail = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : '';
};

/**
 * Sanitize slug field
 * @param {*} value - Slug value
 * @returns {string} Sanitized slug
 */
export const sanitizeSlug = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// ============================================================
// SANITIZATION - DATE AND TIME
// ============================================================

/**
 * Sanitize date field (YYYY-MM-DD format)
 * @param {*} value - Date value
 * @returns {string} Sanitized date or empty string
 */
export const sanitizeDate = (value) => {
  if (!value || value === '') {
    return '';
  }

  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return value;
    }
  }

  // Try to parse and format
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return '';
};

/**
 * Sanitize datetime field (ISO 8601 format)
 * @param {*} value - Datetime value
 * @returns {string} Sanitized datetime or empty string
 */
export const sanitizeDateTime = (value) => {
  if (!value || value === '') {
    return '';
  }

  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  return '';
};

/**
 * Sanitize time field (HH:MM format)
 * @param {*} value - Time value
 * @returns {string} Sanitized time or empty string
 */
export const sanitizeTime = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  const trimmed = value.trim();
  
  if (timeRegex.test(trimmed)) {
    return trimmed;
  }

  return '';
};

// ============================================================
// SANITIZATION - ARRAYS
// ============================================================

/**
 * Sanitize array of IDs
 * @param {*} value - Array of IDs
 * @returns {number[]} Sanitized array of IDs
 */
export const sanitizeIdArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(id => parseInt(id))
    .filter(id => !isNaN(id) && id > 0);
};

/**
 * Sanitize array of strings
 * @param {*} value - Array of strings
 * @returns {string[]} Sanitized array of strings
 */
export const sanitizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(str => sanitizeString(str))
    .filter(str => str !== '');
};

/**
 * Sanitize taxonomy array (array of term IDs)
 * @param {*} value - Taxonomy value (can be array or single value)
 * @returns {number[]} Array of taxonomy term IDs
 */
export const sanitizeTaxonomyArray = (value) => {
  if (!value) {
    return [];
  }

  // If it's already an array
  if (Array.isArray(value)) {
    return sanitizeIdArray(value);
  }

  // If it's a single value
  const id = parseInt(value);
  return (!isNaN(id) && id > 0) ? [id] : [];
};

// ============================================================
// SANITIZATION - WORDPRESS SPECIFIC
// ============================================================

/**
 * Sanitize WordPress post status
 * @param {*} value - Status value
 * @param {string} defaultValue - Default status (default: 'draft')
 * @returns {string} Sanitized status
 */
export const sanitizePostStatus = (value, defaultValue = 'draft') => {
  const normalized = sanitizeString(value, defaultValue).toLowerCase();
  return VALID_POST_STATUSES.includes(normalized) ? normalized : defaultValue;
};

/**
 * Sanitize enum value (validates against allowed values)
 * @param {*} value - Enum value
 * @param {string[]} allowedValues - Array of allowed values
 * @param {string} defaultValue - Default value
 * @returns {string} Sanitized enum value
 */
export const sanitizeEnum = (value, allowedValues, defaultValue) => {
  const normalized = sanitizeString(value, defaultValue).toLowerCase();
  return allowedValues.includes(normalized) ? normalized : defaultValue;
};

/**
 * Sanitize WordPress rendered content
 * Handles both { rendered: 'content' } and direct string
 * @param {*} value - Content value
 * @returns {string} Sanitized content
 */
export const sanitizeRenderedContent = (value) => {
  if (!value) {
    return '';
  }

  // Handle WordPress REST API rendered format
  if (typeof value === 'object' && value.rendered) {
    return sanitizeString(value.rendered);
  }

  return sanitizeString(value);
};

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Check if date string is valid
 * @param {string} dateString - Date string
 * @returns {boolean} True if valid
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Check if URL is valid
 * @param {string} url - URL string
 * @returns {boolean} True if valid
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if email is valid
 * @param {string} email - Email string
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate required field
 * @param {*} value - Field value
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateRequired = (value, fieldName) => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validate date range (start date must be before end date)
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {string|null} Error message or null if valid
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return null; // Only validate if both dates exist
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date format';
  }

  if (start >= end) {
    return 'End date must be after start date';
  }

  return null;
};

/**
 * Validate numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateRange = (value, min, max, fieldName) => {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (num < min || num > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  
  return null;
};

// ============================================================
// FORMATTING HELPERS
// ============================================================

/**
 * Format price for display
 * @param {number} price - Price value
 * @param {string} currency - Currency symbol (default: '$')
 * @param {boolean} showFree - Show 'Free' for 0 price (default: true)
 * @returns {string} Formatted price
 */
export const formatPrice = (price, currency = '$', showFree = true) => {
  const sanitizedPrice = sanitizePrice(price);
  
  if (sanitizedPrice === 0 && showFree) {
    return 'Free';
  }
  
  return `${currency}${sanitizedPrice.toFixed(2)}`;
};

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date or empty string
 */
export const formatDate = (dateString, locale = 'en-US') => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(locale);
};

/**
 * Format datetime for display
 * @param {string} dateString - Datetime string
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted datetime or empty string
 */
export const formatDateTime = (dateString, locale = 'en-US') => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(locale);
};

/**
 * Format duration in minutes to human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30m" or "45m")
 */
export const formatDuration = (minutes) => {
  const sanitizedMinutes = sanitizeInteger(minutes, 0);
  
  if (sanitizedMinutes === 0) {
    return 'No duration';
  }
  
  if (sanitizedMinutes < 60) {
    return `${sanitizedMinutes}m`;
  }
  
  const hours = Math.floor(sanitizedMinutes / 60);
  const mins = sanitizedMinutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
};

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  const sanitized = sanitizeString(str);
  if (!sanitized) return '';
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  const sanitized = sanitizeString(text);
  
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  
  return sanitized.substring(0, maxLength) + suffix;
};

// ============================================================
// OBJECT MANIPULATION
// ============================================================

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove null and undefined values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
export const removeNullValues = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Remove empty values from object (null, undefined, empty string)
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
export const removeEmptyValues = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// ============================================================
// WORDPRESS REST API HELPERS
// ============================================================

/**
 * Extract featured media URL from WordPress _embedded data
 * @param {Object} itemData - Item data with _embedded
 * @returns {string} Featured media URL or empty string
 */
export const extractFeaturedMediaUrl = (itemData) => {
  const featuredMedia = itemData._embedded?.['wp:featuredmedia']?.[0];
  
  if (!featuredMedia) {
    return '';
  }

  // Try different size options
  return featuredMedia.source_url || 
         featuredMedia.media_details?.sizes?.medium?.source_url ||
         featuredMedia.media_details?.sizes?.thumbnail?.source_url ||
         '';
};

/**
 * Build WordPress meta object for API request
 * @param {Object} data - Raw data
 * @param {string[]} metaFields - Array of field names that should go in meta
 * @returns {Object} Object with root-level fields and meta object
 */
export const buildMetaObject = (data, metaFields) => {
  const result = {
    meta: {}
  };

  Object.entries(data).forEach(([key, value]) => {
    if (metaFields.includes(key)) {
      result.meta[key] = value;
    } else {
      result[key] = value;
    }
  });

  return result;
};

/**
 * Create validation result object
 * @param {string[]} errors - Array of error messages
 * @returns {Object} Validation result { isValid: boolean, errors: string[] }
 */
export const createValidationResult = (errors = []) => {
  return {
    isValid: errors.length === 0,
    errors
  };
};