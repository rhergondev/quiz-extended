/**
 * Lesson data validation and transformation utilities
 * Handles data formatting for WordPress REST API
 * FIXED VERSION - Removed duplicate functions and improved validation
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
    // Format lesson type for display
    formattedType: sanitized.meta._lesson_type 
      ? sanitized.meta._lesson_type.charAt(0).toUpperCase() + sanitized.meta._lesson_type.slice(1)
      : 'Text',
    // Format content type for display
    formattedContentType: sanitized.meta._content_type === 'premium' ? 'Premium' : 'Free',
    // Create a short excerpt if needed
    shortExcerpt: sanitized.excerpt 
      ? sanitized.excerpt.length > 100 
        ? sanitized.excerpt.substring(0, 100) + '...'
        : sanitized.excerpt
      : 'No description available',
    // Format date for display
    formattedDate: sanitized.date 
      ? new Date(sanitized.date).toLocaleDateString()
      : 'No date',
    // Check if lesson is complete (based on some criteria)
    isComplete: false, // This would be determined by user progress data
    // Calculate estimated reading time for text lessons
    estimatedReadingTime: sanitized.meta._lesson_type === 'text' && sanitized.content
      ? Math.ceil(sanitized.content.split(' ').length / 200) // Assuming 200 words per minute
      : null
  };
};

/**
 * Sort lessons by menu_order and then by date
 * @param {Array} lessons - Array of lesson objects
 * @returns {Array} Sorted lessons
 */
export const sortLessonsByOrder = (lessons) => {
  return [...lessons].sort((a, b) => {
    const orderA = parseInt(a.menu_order) || 0;
    const orderB = parseInt(b.menu_order) || 0;
    
    if (orderA === orderB) {
      // If menu_order is the same, sort by date
      return new Date(a.date) - new Date(b.date);
    }
    
    return orderA - orderB;
  });
};

/**
 * Group lessons by their type
 * @param {Array} lessons - Array of lesson objects
 * @returns {Object} Lessons grouped by type
 */
export const groupLessonsByType = (lessons) => {
  return lessons.reduce((groups, lesson) => {
    const type = lesson.meta?._lesson_type || 'text';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(lesson);
    return groups;
  }, {});
};

/**
 * Filter lessons by course ID
 * @param {Array} lessons - Array of lesson objects
 * @param {number} courseId - Course ID to filter by
 * @returns {Array} Filtered lessons
 */
export const filterLessonsByCourse = (lessons, courseId) => {
  if (!courseId) return lessons;
  
  return lessons.filter(lesson => {
    const lessonCourseId = parseInt(lesson.meta?._course_id);
    return lessonCourseId === parseInt(courseId);
  });
};

/**
 * Calculate total duration of lessons
 * @param {Array} lessons - Array of lesson objects
 * @returns {number} Total duration in minutes
 */
export const calculateTotalDuration = (lessons) => {
  return lessons.reduce((total, lesson) => {
    const duration = parseInt(lesson.meta?._duration_minutes) || 0;
    return total + duration;
  }, 0);
};

/**
 * Get lesson completion percentage (mock implementation)
 * @param {Array} lessons - Array of lesson objects
 * @param {Array} completedLessons - Array of completed lesson IDs
 * @returns {number} Completion percentage (0-100)
 */
export const calculateCompletionPercentage = (lessons, completedLessons = []) => {
  if (lessons.length === 0) return 0;
  
  const completedCount = lessons.filter(lesson => 
    completedLessons.includes(lesson.id)
  ).length;
  
  return Math.round((completedCount / lessons.length) * 100);
};