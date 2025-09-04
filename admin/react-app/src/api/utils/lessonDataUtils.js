/**
 * Lesson data validation and transformation utilities
 * Handles data formatting for WordPress REST API
 */

/**
 * Default lesson meta fields structure
 */
const DEFAULT_LESSON_META = {
  _course_id: '',
  _lesson_order: '1',
  _duration_minutes: '',
  _lesson_type: 'video',
  _video_url: '',
  _content_type: 'free',
  _prerequisite_lessons: '',
  _resources_urls: '',
  _completion_criteria: 'view'
};

/**
 * Valid lesson statuses
 */
export const VALID_LESSON_STATUSES = ['publish', 'draft', 'private', 'pending'];

/**
 * Valid lesson types
 */
export const VALID_LESSON_TYPES = ['video', 'text', 'quiz', 'assignment', 'live'];

/**
 * Valid content types
 */
export const VALID_CONTENT_TYPES = ['free', 'premium'];

/**
 * Valid completion criteria
 */
export const VALID_COMPLETION_CRITERIA = ['view', 'quiz', 'assignment', 'time'];

/**
 * Transform lesson data for API requests
 * @param {Object} lessonData - Raw lesson data
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformLessonDataForApi = (lessonData) => {
  return {
    title: lessonData.title || '',
    content: lessonData.content || '',
    status: lessonData.status || 'draft',
    menu_order: lessonData.menu_order || 1,
    meta: {
      ...DEFAULT_LESSON_META,
      ...lessonData.meta
    }
  };
};

/**
 * Sanitize lesson data for display
 * @param {Object} lessonData - Raw lesson data from API
 * @returns {Object} Sanitized lesson data
 */
export const sanitizeLessonData = (lessonData) => {
  if (!lessonData) {
    return null;
  }

  return {
    ...lessonData,
    title: lessonData.title?.rendered || lessonData.title || '',
    content: lessonData.content?.rendered || lessonData.content || '',
    excerpt: lessonData.excerpt?.rendered || lessonData.excerpt || '',
    meta: {
      ...DEFAULT_LESSON_META,
      ...lessonData.meta
    },
    // Ensure we have consistent date formatting
    date: lessonData.date || '',
    modified: lessonData.modified || '',
    // Ensure status is always present
    status: lessonData.status || 'draft',
    // Ensure menu_order is present
    menu_order: lessonData.menu_order || 1
  };
};

/**
 * Validate lesson data before API request
 * @param {Object} lessonData - Lesson data to validate
 * @returns {Object} Validation result
 */
export const validateLessonData = (lessonData) => {
  const errors = [];
  
  // Required fields validation
  if (!lessonData.title || lessonData.title.trim() === '') {
    errors.push('Lesson title is required');
  }
  
  // Status validation
  if (lessonData.status && !VALID_LESSON_STATUSES.includes(lessonData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_LESSON_STATUSES.join(', ')}`);
  }

  // Meta fields validation
  if (lessonData.meta) {
    const { meta } = lessonData;
    
    // Course ID validation
    if (!meta._course_id || meta._course_id.trim() === '') {
      errors.push('Course ID is required');
    }
    
    // Lesson order validation
    if (meta._lesson_order && isNaN(parseInt(meta._lesson_order))) {
      errors.push('Lesson order must be a valid number');
    }
    
    // Duration validation
    if (meta._duration_minutes && (isNaN(parseInt(meta._duration_minutes)) || parseInt(meta._duration_minutes) < 0)) {
      errors.push('Duration must be a positive number');
    }
    
    // Lesson type validation
    if (meta._lesson_type && !VALID_LESSON_TYPES.includes(meta._lesson_type)) {
      errors.push(`Invalid lesson type. Must be one of: ${VALID_LESSON_TYPES.join(', ')}`);
    }
    
    // Content type validation
    if (meta._content_type && !VALID_CONTENT_TYPES.includes(meta._content_type)) {
      errors.push(`Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
    }
    
    // Completion criteria validation
    if (meta._completion_criteria && !VALID_COMPLETION_CRITERIA.includes(meta._completion_criteria)) {
      errors.push(`Invalid completion criteria. Must be one of: ${VALID_COMPLETION_CRITERIA.join(', ')}`);
    }
    
    // Video URL validation for video lessons
    if (meta._lesson_type === 'video' && meta._video_url) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(meta._video_url)) {
        errors.push('Video URL must be a valid URL');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Build query parameters for lesson requests - FIXED VERSION
 * @param {Object} options - Query options
 * @returns {URLSearchParams} Formatted query parameters
 */
export const buildLessonQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    status = 'publish,draft',
    search = '',
    courseId = null,
    orderBy = 'menu_order',
    order = 'asc',
    embed = true
  } = options;

  const params = new URLSearchParams({
    status: status,
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  // FIX: Mejorar el filtrado por curso
  if (courseId) {
    const numericCourseId = parseInt(courseId, 10);
    if (Number.isInteger(numericCourseId) && numericCourseId > 0) {
      // Usar meta_query para filtrar por curso
      params.append('meta_key', '_course_id');
      params.append('meta_value', numericCourseId.toString());
      params.append('meta_compare', '=');
    }
  }

  console.log('Built query params:', params.toString());
  return params;
};

/**
 * Build query parameters for course-specific lesson requests
 * @param {number} courseId - Course ID
 * @param {Object} options - Additional query options
 * @returns {URLSearchParams} Formatted query parameters
 */
export const buildCourseLessonsQueryParams = (courseId, options = {}) => {
  const { 
    page = 1, 
    perPage = 20, 
    orderBy = 'menu_order', 
    order = 'asc',
    status = 'publish,draft,private',
    search = ''
  } = options;

  const params = new URLSearchParams({
    _embed: 'true',
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: orderBy,
    order: order,
    status: status,
    meta_key: '_course_id',
    meta_value: courseId.toString(),
    meta_compare: '='
  });

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  console.log('Built course lessons query params:', params.toString());
  return params;
};

/**
 * Format lesson data for display in lists
 * @param {Object} lesson - Lesson data
 * @returns {Object} Formatted lesson for display
 */
export const formatLessonForDisplay = (lesson) => {
  const sanitized = sanitizeLessonData(lesson);
  
  if (!sanitized) {
    return null;
  }

  return {
    ...sanitized,
    // Format duration for display
    formattedDuration: sanitized.meta._duration_minutes 
      ? `${sanitized.meta._duration_minutes} min`
      : 'No duration set',
    // Format lesson type with proper capitalization
    formattedType: sanitized.meta._lesson_type 
      ? sanitized.meta._lesson_type.charAt(0).toUpperCase() + sanitized.meta._lesson_type.slice(1)
      : 'Text',
    // Format content type
    formattedContentType: sanitized.meta._content_type === 'premium' ? 'Premium' : 'Free',
    // Format completion criteria
    formattedCompletionCriteria: sanitized.meta._completion_criteria 
      ? sanitized.meta._completion_criteria.charAt(0).toUpperCase() + sanitized.meta._completion_criteria.slice(1)
      : 'View'
  };
};

/**
 * Extract lesson summary for quick views
 * @param {Object} lesson - Lesson data
 * @returns {Object} Lesson summary
 */
export const extractLessonSummary = (lesson) => {
  const sanitized = sanitizeLessonData(lesson);
  
  if (!sanitized) {
    return null;
  }

  return {
    id: sanitized.id,
    title: sanitized.title,
    status: sanitized.status,
    courseId: sanitized.meta._course_id,
    lessonType: sanitized.meta._lesson_type || 'text',
    contentType: sanitized.meta._content_type || 'free',
    duration: sanitized.meta._duration_minutes || '0',
    order: sanitized.meta._lesson_order || '1',
    completionCriteria: sanitized.meta._completion_criteria || 'view'
  };
};