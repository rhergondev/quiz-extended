/**
 * Course data validation and transformation utilities
 * Handles data formatting for WordPress REST API
 */

/**
 * Default course meta fields structure
 */
const DEFAULT_COURSE_META = {
  _start_date: '',
  _end_date: '',
  _price: '',
  _sale_price: '',
  _course_category: '',
  _difficulty_level: '',
  _duration_weeks: '',
  _max_students: ''
};

/**
 * Valid course statuses
 */
export const VALID_COURSE_STATUSES = ['publish', 'draft', 'private', 'pending'];

/**
 * Valid difficulty levels
 */
export const VALID_DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

/**
 * Transform course data for API requests
 * @param {Object} courseData - Raw course data
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformCourseDataForApi = (courseData) => {
  return {
    title: courseData.title || '',
    content: courseData.content || '',
    status: courseData.status || 'draft',
    meta: {
      ...DEFAULT_COURSE_META,
      ...courseData.meta
    }
  };
};

/**
 * Sanitize course data for display
 * @param {Object} courseData - Raw course data from API
 * @returns {Object} Sanitized course data
 */
export const sanitizeCourseData = (courseData) => {
  if (!courseData) {
    return null;
  }

  return {
    ...courseData,
    title: courseData.title?.rendered || courseData.title || '',
    content: courseData.content?.rendered || courseData.content || '',
    excerpt: courseData.excerpt?.rendered || courseData.excerpt || '',
    meta: {
      ...DEFAULT_COURSE_META,
      ...courseData.meta
    },
    // Ensure we have consistent date formatting
    date: courseData.date || '',
    modified: courseData.modified || '',
    // Ensure status is always present
    status: courseData.status || 'draft'
  };
};

/**
 * Validate course data before API request
 * @param {Object} courseData - Course data to validate
 * @returns {Object} Validation result
 */
export const validateCourseData = (courseData) => {
  const errors = [];
  
  // Required fields validation
  if (!courseData.title || courseData.title.trim() === '') {
    errors.push('Course title is required');
  }
  
  // Status validation
  if (courseData.status && !VALID_COURSE_STATUSES.includes(courseData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_COURSE_STATUSES.join(', ')}`);
  }

  // Meta fields validation
  if (courseData.meta) {
    const { meta } = courseData;
    
    // Price validation
    if (meta._price && isNaN(parseFloat(meta._price))) {
      errors.push('Price must be a valid number');
    }
    
    if (meta._sale_price && isNaN(parseFloat(meta._sale_price))) {
      errors.push('Sale price must be a valid number');
    }
    
    // Students validation
    if (meta._max_students && isNaN(parseInt(meta._max_students))) {
      errors.push('Max students must be a valid number');
    }
    
    // Duration validation
    if (meta._duration_weeks && isNaN(parseInt(meta._duration_weeks))) {
      errors.push('Duration weeks must be a valid number');
    }
    
    // Difficulty level validation
    if (meta._difficulty_level && !VALID_DIFFICULTY_LEVELS.includes(meta._difficulty_level)) {
      errors.push(`Invalid difficulty level. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
    }
    
    // Date validation
    if (meta._start_date && !isValidDate(meta._start_date)) {
      errors.push('Start date must be a valid date');
    }
    
    if (meta._end_date && !isValidDate(meta._end_date)) {
      errors.push('End date must be a valid date');
    }
    
    // Date logic validation
    if (meta._start_date && meta._end_date) {
      const startDate = new Date(meta._start_date);
      const endDate = new Date(meta._end_date);
      
      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate if a string is a valid date
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Build query parameters for course requests
 * @param {Object} options - Query options
 * @returns {URLSearchParams} Formatted query parameters
 */
export const buildCourseQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    status = 'publish,draft',
    search = '',
    embed = true
  } = options;

  const params = new URLSearchParams({
    status: status,
    page: page.toString(),
    per_page: perPage.toString(),
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  if (search.trim()) {
    params.append('search', search.trim());
  }

  return params;
};

/**
 * Build query parameters for category-based course requests
 * @param {string} categoryName - Category name to filter by
 * @param {Object} options - Additional query options
 * @returns {URLSearchParams} Formatted query parameters
 */
export const buildCategoryCourseQueryParams = (categoryName, options = {}) => {
  const { page = 1, perPage = 20 } = options;

  return new URLSearchParams({
    _embed: 'true',
    page: page.toString(),
    per_page: perPage.toString(),
    meta_key: '_course_category',
    meta_value: categoryName,
    meta_compare: '='
  });
};

/**
 * Format course data for display in lists
 * @param {Object} course - Course data
 * @returns {Object} Formatted course for display
 */
export const formatCourseForDisplay = (course) => {
  const sanitized = sanitizeCourseData(course);
  
  if (!sanitized) {
    return null;
  }

  return {
    ...sanitized,
    // Format price for display
    formattedPrice: sanitized.meta._price 
      ? `$${parseFloat(sanitized.meta._price).toFixed(2)}`
      : 'Free',
    formattedSalePrice: sanitized.meta._sale_price 
      ? `$${parseFloat(sanitized.meta._sale_price).toFixed(2)}`
      : null,
    // Format dates for display
    formattedStartDate: sanitized.meta._start_date 
      ? new Date(sanitized.meta._start_date).toLocaleDateString()
      : '',
    formattedEndDate: sanitized.meta._end_date 
      ? new Date(sanitized.meta._end_date).toLocaleDateString()
      : '',
    // Format difficulty with proper capitalization
    formattedDifficulty: sanitized.meta._difficulty_level 
      ? sanitized.meta._difficulty_level.charAt(0).toUpperCase() + sanitized.meta._difficulty_level.slice(1)
      : '',
    // Category with fallback
    category: sanitized.meta._course_category || 'Uncategorized'
  };
};

/**
 * Extract course summary for quick views
 * @param {Object} course - Course data
 * @returns {Object} Course summary
 */
export const extractCourseSummary = (course) => {
  const sanitized = sanitizeCourseData(course);
  
  if (!sanitized) {
    return null;
  }

  return {
    id: sanitized.id,
    title: sanitized.title,
    status: sanitized.status,
    category: sanitized.meta._course_category || 'Uncategorized',
    price: sanitized.meta._price || '0',
    difficulty: sanitized.meta._difficulty_level || '',
    maxStudents: sanitized.meta._max_students || '',
    startDate: sanitized.meta._start_date || '',
    endDate: sanitized.meta._end_date || ''
  };
};