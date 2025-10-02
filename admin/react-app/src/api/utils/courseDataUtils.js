/**
 * Course Data Validation and Transformation Utilities
 * Complete refactor to match WordPress REST API requirements
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 4.0.0
 */

import {
  sanitizeString,
  sanitizeInteger,
  sanitizeOptionalInteger,
  sanitizePrice,
  sanitizeOptionalPrice,
  sanitizeDate,
  sanitizePostStatus,
  sanitizeEnum,
  sanitizeRenderedContent,
  sanitizeIdArray,
  sanitizeTaxonomyArray,
  validateRequired,
  validateDateRange,
  validateRange,
  formatPrice,
  formatDate,
  capitalize,
  truncateText,
  extractFeaturedMediaUrl,
  createValidationResult
} from './commonDataUtils.js';

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
  _lesson_ids: [],
  _lesson_count: 0,
  _student_count: 0,
  _instructor_id: null,
  _certificate_template: null,
  _course_requirements: '',
  _course_objectives: '',
  _target_audience: ''
};

/**
 * Valid course statuses (WordPress post statuses)
 */
export const VALID_COURSE_STATUSES = ['publish', 'draft', 'private', 'pending'];

/**
 * Valid difficulty levels
 */
export const VALID_DIFFICULTY_LEVELS = [
  'easy',
  'medium',
  'hard',
  'beginner',
  'intermediate',
  'advanced'
];

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
    title: sanitizeString(courseData.title),
    
    // Content - main description
    content: sanitizeString(courseData.content || ''),
    
    // Excerpt - short description
    excerpt: sanitizeString(courseData.excerpt || ''),
    
    // Status
    status: sanitizePostStatus(courseData.status, 'publish')
  };

  // ============================================================
  // FEATURED MEDIA (WordPress standard, root level)
  // ============================================================
  
  if (courseData.featured_media !== undefined) {
    transformed.featured_media = sanitizeOptionalInteger(courseData.featured_media, 1);
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
    transformed.meta._start_date = sanitizeDate(courseData._start_date);
  } else if (courseData.startDate !== undefined) {
    transformed.meta._start_date = sanitizeDate(courseData.startDate);
  } else if (courseData.meta?._start_date !== undefined) {
    transformed.meta._start_date = sanitizeDate(courseData.meta._start_date);
  }

  if (courseData._end_date !== undefined) {
    transformed.meta._end_date = sanitizeDate(courseData._end_date);
  } else if (courseData.endDate !== undefined) {
    transformed.meta._end_date = sanitizeDate(courseData.endDate);
  } else if (courseData.meta?._end_date !== undefined) {
    transformed.meta._end_date = sanitizeDate(courseData.meta._end_date);
  }

  // Price fields
  if (courseData._price !== undefined) {
    transformed.meta._price = sanitizePrice(courseData._price);
  } else if (courseData.price !== undefined) {
    transformed.meta._price = sanitizePrice(courseData.price);
  } else if (courseData.meta?._price !== undefined) {
    transformed.meta._price = sanitizePrice(courseData.meta._price);
  }

  if (courseData._sale_price !== undefined) {
    transformed.meta._sale_price = sanitizeOptionalPrice(courseData._sale_price);
  } else if (courseData.salePrice !== undefined) {
    transformed.meta._sale_price = sanitizeOptionalPrice(courseData.salePrice);
  } else if (courseData.meta?._sale_price !== undefined) {
    transformed.meta._sale_price = sanitizeOptionalPrice(courseData.meta._sale_price);
  }

  // Numeric fields
  if (courseData._duration_weeks !== undefined) {
    transformed.meta._duration_weeks = sanitizeOptionalInteger(courseData._duration_weeks, 1);
  } else if (courseData.durationWeeks !== undefined) {
    transformed.meta._duration_weeks = sanitizeOptionalInteger(courseData.durationWeeks, 1);
  } else if (courseData.meta?._duration_weeks !== undefined) {
    transformed.meta._duration_weeks = sanitizeOptionalInteger(courseData.meta._duration_weeks, 1);
  }

  if (courseData._max_students !== undefined) {
    transformed.meta._max_students = sanitizeOptionalInteger(courseData._max_students, 1);
  } else if (courseData.maxStudents !== undefined) {
    transformed.meta._max_students = sanitizeOptionalInteger(courseData.maxStudents, 1);
  } else if (courseData.meta?._max_students !== undefined) {
    transformed.meta._max_students = sanitizeOptionalInteger(courseData.meta._max_students, 1);
  }

  // Difficulty level
  if (courseData._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      courseData._difficulty_level,
      VALID_DIFFICULTY_LEVELS,
      'medium'
    );
  } else if (courseData.difficulty !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      courseData.difficulty,
      VALID_DIFFICULTY_LEVELS,
      'medium'
    );
  } else if (courseData.meta?._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      courseData.meta._difficulty_level,
      VALID_DIFFICULTY_LEVELS,
      'medium'
    );
  }

  // Product type
  if (courseData._product_type !== undefined) {
    transformed.meta._product_type = sanitizeEnum(
      courseData._product_type,
      VALID_PRODUCT_TYPES,
      'free'
    );
  } else if (courseData.productType !== undefined) {
    transformed.meta._product_type = sanitizeEnum(
      courseData.productType,
      VALID_PRODUCT_TYPES,
      'free'
    );
  } else if (courseData.meta?._product_type !== undefined) {
    transformed.meta._product_type = sanitizeEnum(
      courseData.meta._product_type,
      VALID_PRODUCT_TYPES,
      'free'
    );
  }

  // WooCommerce integration
  if (courseData._woocommerce_product_id !== undefined) {
    transformed.meta._woocommerce_product_id = sanitizeInteger(
      courseData._woocommerce_product_id,
      0,
      0
    );
  } else if (courseData.woocommerceProductId !== undefined) {
    transformed.meta._woocommerce_product_id = sanitizeInteger(
      courseData.woocommerceProductId,
      0,
      0
    );
  } else if (courseData.meta?._woocommerce_product_id !== undefined) {
    transformed.meta._woocommerce_product_id = sanitizeInteger(
      courseData.meta._woocommerce_product_id,
      0,
      0
    );
  }

  // Lesson IDs (relationships)
  if (courseData._lesson_ids !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(courseData._lesson_ids);
  } else if (courseData.lessonIds !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(courseData.lessonIds);
  } else if (courseData.meta?._lesson_ids !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(courseData.meta._lesson_ids);
  }

  // Instructor ID
  if (courseData._instructor_id !== undefined) {
    transformed.meta._instructor_id = sanitizeOptionalInteger(courseData._instructor_id, 1);
  } else if (courseData.instructorId !== undefined) {
    transformed.meta._instructor_id = sanitizeOptionalInteger(courseData.instructorId, 1);
  } else if (courseData.meta?._instructor_id !== undefined) {
    transformed.meta._instructor_id = sanitizeOptionalInteger(courseData.meta._instructor_id, 1);
  }

  // Text fields
  if (courseData._course_requirements !== undefined) {
    transformed.meta._course_requirements = sanitizeString(courseData._course_requirements);
  } else if (courseData.requirements !== undefined) {
    transformed.meta._course_requirements = sanitizeString(courseData.requirements);
  } else if (courseData.meta?._course_requirements !== undefined) {
    transformed.meta._course_requirements = sanitizeString(courseData.meta._course_requirements);
  }

  if (courseData._course_objectives !== undefined) {
    transformed.meta._course_objectives = sanitizeString(courseData._course_objectives);
  } else if (courseData.objectives !== undefined) {
    transformed.meta._course_objectives = sanitizeString(courseData.objectives);
  } else if (courseData.meta?._course_objectives !== undefined) {
    transformed.meta._course_objectives = sanitizeString(courseData.meta._course_objectives);
  }

  if (courseData._target_audience !== undefined) {
    transformed.meta._target_audience = sanitizeString(courseData._target_audience);
  } else if (courseData.targetAudience !== undefined) {
    transformed.meta._target_audience = sanitizeString(courseData.targetAudience);
  } else if (courseData.meta?._target_audience !== undefined) {
    transformed.meta._target_audience = sanitizeString(courseData.meta._target_audience);
  }

  // Apply defaults for missing fields
  transformed.meta = {
    ...DEFAULT_COURSE_META,
    ...transformed.meta
  };

  console.log('🔄 transformCourseDataForApi - Output:', transformed);
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

  // Extract title, content, excerpt (handle both object and string)
  const title = sanitizeRenderedContent(courseData.title);
  const content = sanitizeRenderedContent(courseData.content);
  const excerpt = sanitizeRenderedContent(courseData.excerpt);

  const sanitized = {
    // Core WordPress fields
    id: courseData.id || 0,
    title,
    content,
    excerpt,
    status: sanitizePostStatus(courseData.status, 'draft'),
    date: courseData.date || '',
    modified: courseData.modified || '',
    slug: courseData.slug || '',
    author: courseData.author || 0,

    // Featured media
    featured_media: courseData.featured_media || 0,
    featured_media_url: extractFeaturedMediaUrl(courseData),

    // Taxonomies (preserve as arrays)
    qe_category: sanitizeTaxonomyArray(courseData.qe_category),
    qe_difficulty: sanitizeTaxonomyArray(courseData.qe_difficulty),
    qe_topic: sanitizeTaxonomyArray(courseData.qe_topic),
    course_type: sanitizeTaxonomyArray(courseData.course_type),

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
  
  const titleError = validateRequired(courseData.title, 'Course title');
  if (titleError) errors.push(titleError);

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
      }
    }
  });

  // ============================================================
  // META FIELDS VALIDATION
  // ============================================================
  
  // Extract meta (handle both flat and nested structure)
  const meta = courseData.meta || courseData;

  // Price validation
  if (meta._price !== undefined && meta._price !== '' && isNaN(parseFloat(meta._price))) {
    errors.push('Price must be a valid number');
  }

  // Sale price validation
  if (meta._sale_price !== undefined && meta._sale_price !== '' && 
      meta._sale_price !== null && isNaN(parseFloat(meta._sale_price))) {
    errors.push('Sale price must be a valid number');
  }

  // Sale price logic validation
  if (meta._price && meta._sale_price && parseFloat(meta._sale_price) >= parseFloat(meta._price)) {
    errors.push('Sale price must be less than regular price');
  }

  // Duration validation
  if (meta._duration_weeks !== undefined && meta._duration_weeks !== '' && 
      meta._duration_weeks !== null) {
    const duration = parseInt(meta._duration_weeks);
    if (isNaN(duration) || duration <= 0) {
      errors.push('Duration must be a positive number');
    }
  }

  // Max students validation
  if (meta._max_students !== undefined && meta._max_students !== '' && 
      meta._max_students !== null) {
    const maxStudents = parseInt(meta._max_students);
    if (isNaN(maxStudents) || maxStudents <= 0) {
      errors.push('Max students must be a positive number');
    }
  }

  // Difficulty level validation
  if (meta._difficulty_level && !VALID_DIFFICULTY_LEVELS.includes(meta._difficulty_level)) {
    errors.push(`Invalid difficulty level. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
  }

  // Product type validation
  if (meta._product_type && !VALID_PRODUCT_TYPES.includes(meta._product_type)) {
    errors.push(`Invalid product type. Must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`);
  }

  // Date range validation
  if (meta._start_date && meta._end_date) {
    const dateError = validateDateRange(meta._start_date, meta._end_date);
    if (dateError) errors.push(dateError);
  }

  return createValidationResult(errors);
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

  // Calculate pricing info
  const hasDiscount = sanitized.meta._sale_price && 
                     sanitized.meta._sale_price < sanitized.meta._price;
  const discountPercentage = hasDiscount
    ? Math.round(((sanitized.meta._price - sanitized.meta._sale_price) / sanitized.meta._price) * 100)
    : 0;

  return {
    ...sanitized,
    // Formatted values for display
    formattedPrice: formatPrice(sanitized.meta._price),
    formattedSalePrice: sanitized.meta._sale_price 
      ? formatPrice(sanitized.meta._sale_price)
      : null,
    formattedStartDate: sanitized.meta._start_date
      ? formatDate(sanitized.meta._start_date)
      : null,
    formattedEndDate: sanitized.meta._end_date
      ? formatDate(sanitized.meta._end_date)
      : null,
    formattedDifficulty: capitalize(sanitized.meta._difficulty_level),
    formattedDate: formatDate(sanitized.date),
    formattedModified: formatDate(sanitized.modified),
    
    // Short excerpt
    shortExcerpt: sanitized.excerpt
      ? truncateText(sanitized.excerpt, 150)
      : 'No description available',
    
    // Pricing badges
    isFree: sanitized.meta._product_type === 'free' || sanitized.meta._price === 0,
    isPaid: sanitized.meta._product_type === 'paid' && sanitized.meta._price > 0,
    hasDiscount,
    discountPercentage,
    formattedDiscount: hasDiscount ? `-${discountPercentage}%` : null,
    
    // Status badges
    isPublished: sanitized.status === 'publish',
    isDraft: sanitized.status === 'draft',
    isPrivate: sanitized.status === 'private',
    
    // Counts
    lessonsCount: sanitized.meta._lesson_count || sanitized.meta._lesson_ids.length,
    studentsCount: sanitized.enrolled_users_count || sanitized.meta._student_count,
    
    // Duration
    hasDuration: sanitized.meta._duration_weeks > 0,
    formattedDuration: sanitized.meta._duration_weeks
      ? `${sanitized.meta._duration_weeks} week${sanitized.meta._duration_weeks > 1 ? 's' : ''}`
      : null,
    
    // Capacity
    hasMaxStudents: sanitized.meta._max_students > 0,
    spotsRemaining: sanitized.meta._max_students > 0
      ? Math.max(0, sanitized.meta._max_students - sanitized.studentsCount)
      : null,
    isFull: sanitized.meta._max_students > 0 && 
            sanitized.studentsCount >= sanitized.meta._max_students,
    
    // Dates
    hasStarted: sanitized.meta._start_date && 
                new Date(sanitized.meta._start_date) <= new Date(),
    hasEnded: sanitized.meta._end_date && 
              new Date(sanitized.meta._end_date) < new Date(),
    isUpcoming: sanitized.meta._start_date && 
                new Date(sanitized.meta._start_date) > new Date(),
    isActive: sanitized.meta._start_date && sanitized.meta._end_date &&
              new Date(sanitized.meta._start_date) <= new Date() &&
              new Date(sanitized.meta._end_date) >= new Date(),
    
    // Features
    hasImage: sanitized.featured_media > 0,
    hasRequirements: sanitized.meta._course_requirements.length > 0,
    hasObjectives: sanitized.meta._course_objectives.length > 0,
    hasTargetAudience: sanitized.meta._target_audience.length > 0,
    hasInstructor: sanitized.meta._instructor_id > 0,
    isWooCommerceLinked: sanitized.meta._woocommerce_product_id > 0
  };
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Sort courses by price
 * @param {Array} courses - Array of courses
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted courses
 */
export const sortCoursesByPrice = (courses, order = 'asc') => {
  return [...courses].sort((a, b) => {
    const priceA = a.meta?._sale_price || a.meta?._price || 0;
    const priceB = b.meta?._sale_price || b.meta?._price || 0;
    
    return order === 'asc' ? priceA - priceB : priceB - priceA;
  });
};

/**
 * Sort courses by popularity (student count)
 * @param {Array} courses - Array of courses
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted courses
 */
export const sortCoursesByPopularity = (courses, order = 'desc') => {
  return [...courses].sort((a, b) => {
    const countA = a.enrolled_users_count || a.meta?._student_count || 0;
    const countB = b.enrolled_users_count || b.meta?._student_count || 0;
    
    return order === 'asc' ? countA - countB : countB - countA;
  });
};

/**
 * Sort courses by date
 * @param {Array} courses - Array of courses
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted courses
 */
export const sortCoursesByDate = (courses, order = 'desc') => {
  return [...courses].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Filter courses by price range
 * @param {Array} courses - Array of courses
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @returns {Array} Filtered courses
 */
export const filterCoursesByPriceRange = (courses, minPrice = 0, maxPrice = Infinity) => {
  return courses.filter(course => {
    const price = course.meta?._sale_price || course.meta?._price || 0;
    return price >= minPrice && price <= maxPrice;
  });
};

/**
 * Filter courses by difficulty
 * @param {Array} courses - Array of courses
 * @param {string} difficulty - Difficulty level
 * @returns {Array} Filtered courses
 */
export const filterCoursesByDifficulty = (courses, difficulty) => {
  if (!difficulty || difficulty === 'all') return courses;
  
  return courses.filter(course => {
    return course.meta?._difficulty_level === difficulty;
  });
};

/**
 * Filter courses by type (free/paid)
 * @param {Array} courses - Array of courses
 * @param {string} type - Course type ('free' or 'paid')
 * @returns {Array} Filtered courses
 */
export const filterCoursesByType = (courses, type) => {
  if (!type || type === 'all') return courses;
  
  return courses.filter(course => {
    if (type === 'free') {
      return course.meta?._product_type === 'free' || course.meta?._price === 0;
    } else if (type === 'paid') {
      return course.meta?._product_type === 'paid' && course.meta?._price > 0;
    }
    return true;
  });
};

/**
 * Group courses by difficulty
 * @param {Array} courses - Array of courses
 * @returns {Object} Courses grouped by difficulty
 */
export const groupCoursesByDifficulty = (courses) => {
  return courses.reduce((groups, course) => {
    const difficulty = course.meta?._difficulty_level || 'medium';
    if (!groups[difficulty]) {
      groups[difficulty] = [];
    }
    groups[difficulty].push(course);
    return groups;
  }, {});
};

/**
 * Group courses by price range
 * @param {Array} courses - Array of courses
 * @returns {Object} Courses grouped by price ranges
 */
export const groupCoursesByPriceRange = (courses) => {
  const groups = {
    free: [],
    budget: [], // 1-50
    moderate: [], // 51-150
    premium: [] // 150+
  };

  courses.forEach(course => {
    const price = course.meta?._sale_price || course.meta?._price || 0;
    
    if (price === 0) {
      groups.free.push(course);
    } else if (price <= 50) {
      groups.budget.push(course);
    } else if (price <= 150) {
      groups.moderate.push(course);
    } else {
      groups.premium.push(course);
    }
  });

  return groups;
};

/**
 * Calculate course statistics
 * @param {Array} courses - Array of courses
 * @returns {Object} Course statistics
 */
export const calculateCourseStatistics = (courses) => {
  const stats = {
    total: courses.length,
    byDifficulty: {},
    byType: {
      free: 0,
      paid: 0
    },
    byStatus: {
      publish: 0,
      draft: 0,
      private: 0,
      pending: 0
    },
    pricing: {
      totalRevenue: 0,
      averagePrice: 0,
      lowestPrice: Infinity,
      highestPrice: 0,
      onSale: 0
    },
    enrollment: {
      totalStudents: 0,
      averageStudents: 0,
      mostPopular: null,
      leastPopular: null
    },
    lessons: {
      totalLessons: 0,
      averageLessons: 0
    },
    dates: {
      upcoming: 0,
      active: 0,
      ended: 0
    }
  };

  if (courses.length === 0) return stats;

  // Initialize difficulty counts
  VALID_DIFFICULTY_LEVELS.forEach(level => {
    stats.byDifficulty[level] = 0;
  });

  let totalPrice = 0;
  let priceCount = 0;
  let maxStudents = 0;
  let minStudents = Infinity;
  let totalStudents = 0;
  let totalLessons = 0;

  const now = new Date();

  courses.forEach(course => {
    // Difficulty
    const difficulty = course.meta?._difficulty_level || 'medium';
    if (stats.byDifficulty[difficulty] !== undefined) {
      stats.byDifficulty[difficulty]++;
    }

    // Type
    const isFree = course.meta?._product_type === 'free' || course.meta?._price === 0;
    if (isFree) {
      stats.byType.free++;
    } else {
      stats.byType.paid++;
    }

    // Status
    const status = course.status || 'draft';
    if (stats.byStatus[status] !== undefined) {
      stats.byStatus[status]++;
    }

    // Pricing
    const price = course.meta?._price || 0;
    const salePrice = course.meta?._sale_price;
    const effectivePrice = salePrice || price;

    if (price > 0) {
      totalPrice += price;
      priceCount++;
      
      stats.pricing.lowestPrice = Math.min(stats.pricing.lowestPrice, price);
      stats.pricing.highestPrice = Math.max(stats.pricing.highestPrice, price);
      
      if (salePrice && salePrice < price) {
        stats.pricing.onSale++;
      }
    }

    // Enrollment
    const studentCount = course.enrolled_users_count || course.meta?._student_count || 0;
    totalStudents += studentCount;
    stats.pricing.totalRevenue += effectivePrice * studentCount;

    if (studentCount > maxStudents) {
      maxStudents = studentCount;
      stats.enrollment.mostPopular = course;
    }
    if (studentCount < minStudents) {
      minStudents = studentCount;
      stats.enrollment.leastPopular = course;
    }

    // Lessons
    const lessonCount = course.lessons_count || course.meta?._lesson_count || 
                       course.meta?._lesson_ids?.length || 0;
    totalLessons += lessonCount;

    // Dates
    const startDate = course.meta?._start_date ? new Date(course.meta._start_date) : null;
    const endDate = course.meta?._end_date ? new Date(course.meta._end_date) : null;

    if (startDate && endDate) {
      if (now < startDate) {
        stats.dates.upcoming++;
      } else if (now >= startDate && now <= endDate) {
        stats.dates.active++;
      } else if (now > endDate) {
        stats.dates.ended++;
      }
    }
  });

  // Calculate averages
  if (priceCount > 0) {
    stats.pricing.averagePrice = Math.round((totalPrice / priceCount) * 100) / 100;
  }
  if (stats.pricing.lowestPrice === Infinity) {
    stats.pricing.lowestPrice = 0;
  }

  stats.enrollment.totalStudents = totalStudents;
  stats.enrollment.averageStudents = Math.round(totalStudents / courses.length);

  stats.lessons.totalLessons = totalLessons;
  stats.lessons.averageLessons = Math.round(totalLessons / courses.length);

  return stats;
};

/**
 * Search courses by query
 * @param {Array} courses - Array of courses
 * @param {string} query - Search query
 * @returns {Array} Filtered courses
 */
export const searchCourses = (courses, query) => {
  if (!query || query.trim() === '') return courses;
  
  const searchTerm = query.toLowerCase().trim();
  
  return courses.filter(course => {
    const searchableFields = [
      course.title,
      course.content,
      course.excerpt,
      course.meta?._course_requirements,
      course.meta?._course_objectives,
      course.meta?._target_audience
    ].filter(Boolean).map(field => field.toLowerCase());
    
    return searchableFields.some(field => field.includes(searchTerm));
  });
};

/**
 * Get featured courses
 * @param {Array} courses - Array of courses
 * @returns {Array} Featured courses
 */
export const getFeaturedCourses = (courses) => {
  return courses.filter(course => course.meta?._featured === true);
};

/**
 * Get courses on sale
 * @param {Array} courses - Array of courses
 * @returns {Array} Courses on sale
 */
export const getCoursesOnSale = (courses) => {
  return courses.filter(course => {
    const price = course.meta?._price || 0;
    const salePrice = course.meta?._sale_price;
    return salePrice && salePrice < price;
  });
};

/**
 * Get bestselling courses
 * @param {Array} courses - Array of courses
 * @param {number} limit - Number of courses to return
 * @returns {Array} Bestselling courses
 */
export const getBestsellingCourses = (courses, limit = 10) => {
  return sortCoursesByPopularity(courses, 'desc').slice(0, limit);
};

/**
 * Get newest courses
 * @param {Array} courses - Array of courses
 * @param {number} limit - Number of courses to return
 * @returns {Array} Newest courses
 */
export const getNewestCourses = (courses, limit = 10) => {
  return sortCoursesByDate(courses, 'desc').slice(0, limit);
};

/**
 * Check if course has available spots
 * @param {Object} course - Course data
 * @returns {boolean} True if has available spots
 */
export const hasAvailableSpots = (course) => {
  const maxStudents = course.meta?._max_students || 0;
  if (maxStudents === 0) return true; // No limit
  
  const enrolledCount = course.enrolled_users_count || course.meta?._student_count || 0;
  return enrolledCount < maxStudents;
};

/**
 * Calculate course progress for a user
 * @param {Object} course - Course data
 * @param {Array} completedLessons - Array of completed lesson IDs
 * @returns {number} Progress percentage (0-100)
 */
export const calculateCourseProgress = (course, completedLessons = []) => {
  const totalLessons = course.lessons_count || 
                      course.meta?._lesson_count || 
                      course.meta?._lesson_ids?.length || 0;
  
  if (totalLessons === 0) return 0;
  
  const lessonIds = course.meta?._lesson_ids || [];
  const completed = lessonIds.filter(id => completedLessons.includes(id)).length;
  
  return Math.round((completed / totalLessons) * 100);
};

/**
 * Get course duration in days
 * @param {Object} course - Course data
 * @returns {number|null} Duration in days or null
 */
export const getCourseDurationInDays = (course) => {
  const startDate = course.meta?._start_date;
  const endDate = course.meta?._end_date;
  
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if course is currently enrollable
 * @param {Object} course - Course data
 * @returns {boolean} True if can enroll
 */
export const isEnrollable = (course) => {
  // Must be published
  if (course.status !== 'publish') return false;
  
  // Check if has available spots
  if (!hasAvailableSpots(course)) return false;
  
  // Check if course has started (if start date is set)
  const startDate = course.meta?._start_date;
  if (startDate && new Date(startDate) > new Date()) return false;
  
  // Check if course has ended (if end date is set)
  const endDate = course.meta?._end_date;
  if (endDate && new Date(endDate) < new Date()) return false;
  
  return true;
};

/**
 * Get course enrollment period status
 * @param {Object} course - Course data
 * @returns {string} Status: 'upcoming', 'open', 'closed', 'ended'
 */
export const getEnrollmentStatus = (course) => {
  const now = new Date();
  const startDate = course.meta?._start_date ? new Date(course.meta._start_date) : null;
  const endDate = course.meta?._end_date ? new Date(course.meta._end_date) : null;
  
  if (endDate && now > endDate) return 'ended';
  if (startDate && now < startDate) return 'upcoming';
  if (!hasAvailableSpots(course)) return 'closed';
  
  return 'open';
};

/**
 * Format course for SEO/metadata
 * @param {Object} course - Course data
 * @returns {Object} SEO-formatted course data
 */
export const formatCourseForSEO = (course) => {
  const formatted = formatCourseForDisplay(course);
  
  return {
    title: formatted.title,
    description: formatted.shortExcerpt,
    image: formatted.featured_media_url,
    price: formatted.meta._price,
    salePrice: formatted.meta._sale_price,
    currency: 'USD',
    availability: isEnrollable(course) ? 'InStock' : 'OutOfStock',
    category: formatted.formattedDifficulty,
    lessons: formatted.lessonsCount,
    students: formatted.studentsCount,
    duration: formatted.formattedDuration,
    instructor: formatted.meta._instructor_id,
    startDate: formatted.meta._start_date,
    endDate: formatted.meta._end_date
  };
};