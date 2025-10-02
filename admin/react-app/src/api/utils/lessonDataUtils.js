/**
 * Lesson Data Validation and Transformation Utilities
 * Complete refactor to match WordPress REST API requirements
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 3.0.0
 */

import {
  sanitizeString,
  sanitizeInteger,
  sanitizeOptionalInteger,
  sanitizeBoolean,
  sanitizePostStatus,
  sanitizeEnum,
  sanitizeRenderedContent,
  sanitizeIdArray,
  sanitizeUrl,
  validateRequired,
  validateRange,
  isValidUrl,
  capitalize,
  formatDate,
  formatDuration,
  truncateText,
  createValidationResult
} from './commonDataUtils.js';

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Default lesson meta fields structure
 * Matches WordPress meta registration
 */
const DEFAULT_LESSON_META = {
  _course_id: null,
  _lesson_order: 1,
  _duration_minutes: 0,
  _lesson_type: 'text',
  _video_url: '',
  _content_type: 'free',
  _prerequisite_lessons: [],
  _resources_urls: [],
  _completion_criteria: 'view',
  _is_required: false,
  _lesson_description: '',
  _lesson_steps: [],
  _has_quiz: false,
  _quiz_id: null
};

/**
 * Valid lesson statuses (WordPress post statuses)
 */
export const VALID_LESSON_STATUSES = ['publish', 'draft', 'private', 'pending'];

/**
 * Valid lesson types
 */
export const VALID_LESSON_TYPES = [
  'video',
  'text',
  'quiz',
  'assignment',
  'live',
  'mixed',
  'pdf',
  'audio'
];

/**
 * Valid content types
 */
export const VALID_CONTENT_TYPES = ['free', 'premium'];

/**
 * Valid completion criteria
 */
export const VALID_COMPLETION_CRITERIA = [
  'view',
  'quiz',
  'assignment',
  'time',
  'manual'
];

// ============================================================
// TRANSFORMATION FOR API REQUESTS
// ============================================================

/**
 * Transform lesson data for WordPress REST API requests
 * 
 * WordPress REST API structure:
 * - Root level: title, content, status, menu_order
 * - meta object: All custom fields with _ prefix
 * 
 * @param {Object} lessonData - Raw lesson data from modal/form
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformLessonDataForApi = (lessonData) => {
  console.log('🔄 transformLessonDataForApi - Input:', lessonData);

  // ============================================================
  // ROOT LEVEL FIELDS (WordPress standard)
  // ============================================================
  
  const transformed = {
    // Title - required
    title: sanitizeString(lessonData.title),
    
    // Content - lesson main content
    content: sanitizeString(lessonData.content || ''),
    
    // Excerpt - short description
    excerpt: sanitizeString(lessonData.excerpt || ''),
    
    // Status
    status: sanitizePostStatus(lessonData.status, 'draft'),
    
    // Menu Order (used for lesson ordering)
    menu_order: sanitizeInteger(lessonData.menu_order || lessonData.order || 1, 1, 0)
  };

  // ============================================================
  // META FIELDS (Custom fields with _ prefix)
  // ============================================================
  
  transformed.meta = {};

  // Course ID (relationship) - required
  if (lessonData._course_id !== undefined) {
    transformed.meta._course_id = sanitizeOptionalInteger(lessonData._course_id, 1);
  } else if (lessonData.courseId !== undefined) {
    transformed.meta._course_id = sanitizeOptionalInteger(lessonData.courseId, 1);
  } else if (lessonData.meta?._course_id !== undefined) {
    transformed.meta._course_id = sanitizeOptionalInteger(lessonData.meta._course_id, 1);
  }

  // Lesson Order (can also use menu_order)
  if (lessonData._lesson_order !== undefined) {
    transformed.meta._lesson_order = sanitizeInteger(lessonData._lesson_order, 1, 0);
  } else if (lessonData.lessonOrder !== undefined) {
    transformed.meta._lesson_order = sanitizeInteger(lessonData.lessonOrder, 1, 0);
  } else if (lessonData.meta?._lesson_order !== undefined) {
    transformed.meta._lesson_order = sanitizeInteger(lessonData.meta._lesson_order, 1, 0);
  }

  // Duration in minutes
  if (lessonData._duration_minutes !== undefined) {
    transformed.meta._duration_minutes = sanitizeInteger(lessonData._duration_minutes, 0, 0);
  } else if (lessonData.duration !== undefined) {
    transformed.meta._duration_minutes = sanitizeInteger(lessonData.duration, 0, 0);
  } else if (lessonData.meta?._duration_minutes !== undefined) {
    transformed.meta._duration_minutes = sanitizeInteger(lessonData.meta._duration_minutes, 0, 0);
  }

  // Lesson Type
  if (lessonData._lesson_type !== undefined) {
    transformed.meta._lesson_type = sanitizeEnum(
      lessonData._lesson_type,
      VALID_LESSON_TYPES,
      'text'
    );
  } else if (lessonData.type !== undefined) {
    transformed.meta._lesson_type = sanitizeEnum(
      lessonData.type,
      VALID_LESSON_TYPES,
      'text'
    );
  } else if (lessonData.meta?._lesson_type !== undefined) {
    transformed.meta._lesson_type = sanitizeEnum(
      lessonData.meta._lesson_type,
      VALID_LESSON_TYPES,
      'text'
    );
  }

  // Video URL (for video lessons)
  if (lessonData._video_url !== undefined) {
    transformed.meta._video_url = sanitizeUrl(lessonData._video_url);
  } else if (lessonData.videoUrl !== undefined) {
    transformed.meta._video_url = sanitizeUrl(lessonData.videoUrl);
  } else if (lessonData.meta?._video_url !== undefined) {
    transformed.meta._video_url = sanitizeUrl(lessonData.meta._video_url);
  }

  // Content Type (free/premium)
  if (lessonData._content_type !== undefined) {
    transformed.meta._content_type = sanitizeEnum(
      lessonData._content_type,
      VALID_CONTENT_TYPES,
      'free'
    );
  } else if (lessonData.contentType !== undefined) {
    transformed.meta._content_type = sanitizeEnum(
      lessonData.contentType,
      VALID_CONTENT_TYPES,
      'free'
    );
  } else if (lessonData.meta?._content_type !== undefined) {
    transformed.meta._content_type = sanitizeEnum(
      lessonData.meta._content_type,
      VALID_CONTENT_TYPES,
      'free'
    );
  }

  // Prerequisite Lessons (array of IDs)
  if (lessonData._prerequisite_lessons !== undefined) {
    transformed.meta._prerequisite_lessons = sanitizeIdArray(lessonData._prerequisite_lessons);
  } else if (lessonData.prerequisites !== undefined) {
    transformed.meta._prerequisite_lessons = sanitizeIdArray(lessonData.prerequisites);
  } else if (lessonData.meta?._prerequisite_lessons !== undefined) {
    transformed.meta._prerequisite_lessons = sanitizeIdArray(lessonData.meta._prerequisite_lessons);
  }

  // Resources URLs (array of URLs)
  if (lessonData._resources_urls !== undefined) {
    transformed.meta._resources_urls = Array.isArray(lessonData._resources_urls)
      ? lessonData._resources_urls.map(url => sanitizeUrl(url)).filter(url => url !== '')
      : [];
  } else if (lessonData.resources !== undefined) {
    transformed.meta._resources_urls = Array.isArray(lessonData.resources)
      ? lessonData.resources.map(url => sanitizeUrl(url)).filter(url => url !== '')
      : [];
  } else if (lessonData.meta?._resources_urls !== undefined) {
    transformed.meta._resources_urls = Array.isArray(lessonData.meta._resources_urls)
      ? lessonData.meta._resources_urls.map(url => sanitizeUrl(url)).filter(url => url !== '')
      : [];
  }

  // Completion Criteria
  if (lessonData._completion_criteria !== undefined) {
    transformed.meta._completion_criteria = sanitizeEnum(
      lessonData._completion_criteria,
      VALID_COMPLETION_CRITERIA,
      'view'
    );
  } else if (lessonData.completionCriteria !== undefined) {
    transformed.meta._completion_criteria = sanitizeEnum(
      lessonData.completionCriteria,
      VALID_COMPLETION_CRITERIA,
      'view'
    );
  } else if (lessonData.meta?._completion_criteria !== undefined) {
    transformed.meta._completion_criteria = sanitizeEnum(
      lessonData.meta._completion_criteria,
      VALID_COMPLETION_CRITERIA,
      'view'
    );
  }

  // Is Required
  if (lessonData._is_required !== undefined) {
    transformed.meta._is_required = sanitizeBoolean(lessonData._is_required);
  } else if (lessonData.isRequired !== undefined) {
    transformed.meta._is_required = sanitizeBoolean(lessonData.isRequired);
  } else if (lessonData.meta?._is_required !== undefined) {
    transformed.meta._is_required = sanitizeBoolean(lessonData.meta._is_required);
  }

  // Lesson Description
  if (lessonData._lesson_description !== undefined) {
    transformed.meta._lesson_description = sanitizeString(lessonData._lesson_description);
  } else if (lessonData.description !== undefined) {
    transformed.meta._lesson_description = sanitizeString(lessonData.description);
  } else if (lessonData.meta?._lesson_description !== undefined) {
    transformed.meta._lesson_description = sanitizeString(lessonData.meta._lesson_description);
  }

  // Lesson Steps (complex array)
  if (lessonData._lesson_steps !== undefined) {
    transformed.meta._lesson_steps = sanitizeLessonSteps(lessonData._lesson_steps);
  } else if (lessonData.steps !== undefined) {
    transformed.meta._lesson_steps = sanitizeLessonSteps(lessonData.steps);
  } else if (lessonData.meta?._lesson_steps !== undefined) {
    transformed.meta._lesson_steps = sanitizeLessonSteps(lessonData.meta._lesson_steps);
  }

  // Has Quiz
  if (lessonData._has_quiz !== undefined) {
    transformed.meta._has_quiz = sanitizeBoolean(lessonData._has_quiz);
  } else if (lessonData.hasQuiz !== undefined) {
    transformed.meta._has_quiz = sanitizeBoolean(lessonData.hasQuiz);
  } else if (lessonData.meta?._has_quiz !== undefined) {
    transformed.meta._has_quiz = sanitizeBoolean(lessonData.meta._has_quiz);
  }

  // Quiz ID (if has quiz)
  if (lessonData._quiz_id !== undefined) {
    transformed.meta._quiz_id = sanitizeOptionalInteger(lessonData._quiz_id, 1);
  } else if (lessonData.quizId !== undefined) {
    transformed.meta._quiz_id = sanitizeOptionalInteger(lessonData.quizId, 1);
  } else if (lessonData.meta?._quiz_id !== undefined) {
    transformed.meta._quiz_id = sanitizeOptionalInteger(lessonData.meta._quiz_id, 1);
  }

  // Apply defaults for missing fields
  transformed.meta = {
    ...DEFAULT_LESSON_META,
    ...transformed.meta
  };

  console.log('🔄 transformLessonDataForApi - Output:', transformed);
  return transformed;
};

/**
 * Sanitize lesson steps array
 * @param {Array} steps - Lesson steps
 * @returns {Array} Sanitized steps
 */
const sanitizeLessonSteps = (steps) => {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map((step, index) => {
    if (!step || typeof step !== 'object') {
      return null;
    }

    return {
      type: sanitizeEnum(
        step.type,
        ['video', 'text', 'pdf', 'quiz', 'image', 'audio'],
        'text'
      ),
      order: sanitizeInteger(step.order, index, 0),
      title: sanitizeString(step.title),
      data: step.data || {}
    };
  }).filter(step => step !== null);
};

// ============================================================
// SANITIZATION FOR DISPLAY
// ============================================================

/**
 * Sanitize lesson data from API for display in React components
 * Normalizes WordPress REST API response format
 * 
 * @param {Object} lessonData - Raw lesson data from WordPress API
 * @returns {Object} Sanitized lesson data
 */
export const sanitizeLessonData = (lessonData) => {
  if (!lessonData) {
    console.warn('⚠️ sanitizeLessonData - No data provided');
    return null;
  }

  // Extract title, content, excerpt (handle both object and string)
  const title = sanitizeRenderedContent(lessonData.title);
  const content = sanitizeRenderedContent(lessonData.content);
  const excerpt = sanitizeRenderedContent(lessonData.excerpt);

  const sanitized = {
    // Core WordPress fields
    id: lessonData.id || 0,
    title,
    content,
    excerpt,
    status: sanitizePostStatus(lessonData.status, 'draft'),
    date: lessonData.date || '',
    modified: lessonData.modified || '',
    slug: lessonData.slug || '',
    author: lessonData.author || 0,
    menu_order: sanitizeInteger(lessonData.menu_order, 1, 0),

    // Meta fields (with defaults)
    meta: {
      ...DEFAULT_LESSON_META,
      ...lessonData.meta,
      // Ensure boolean fields are actual booleans
      _is_required: sanitizeBoolean(lessonData.meta?._is_required),
      _has_quiz: sanitizeBoolean(lessonData.meta?._has_quiz),
      // Ensure arrays
      _prerequisite_lessons: sanitizeIdArray(lessonData.meta?._prerequisite_lessons),
      _lesson_steps: sanitizeLessonSteps(lessonData.meta?._lesson_steps),
      _resources_urls: Array.isArray(lessonData.meta?._resources_urls)
        ? lessonData.meta._resources_urls
        : []
    },

    // Embedded data
    _embedded: lessonData._embedded || {},

    // Links
    _links: lessonData._links || {}
  };

  return sanitized;
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate lesson data before API request
 * 
 * @param {Object} lessonData - Lesson data to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateLessonData = (lessonData) => {
  const errors = [];

  // ============================================================
  // REQUIRED FIELDS
  // ============================================================
  
  const titleError = validateRequired(lessonData.title, 'Lesson title');
  if (titleError) errors.push(titleError);

  // ============================================================
  // STATUS VALIDATION
  // ============================================================
  
  if (lessonData.status && !VALID_LESSON_STATUSES.includes(lessonData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_LESSON_STATUSES.join(', ')}`);
  }

  // ============================================================
  // META FIELDS VALIDATION
  // ============================================================
  
  // Extract meta (handle both flat and nested structure)
  const meta = lessonData.meta || lessonData;

  // Course ID validation (required for lessons)
  const courseId = meta._course_id || lessonData.courseId;
  if (!courseId) {
    errors.push('Course ID is required');
  } else if (parseInt(courseId) <= 0) {
    errors.push('Course ID must be a positive number');
  }

  // Lesson Order validation
  const lessonOrder = meta._lesson_order || lessonData.lessonOrder || lessonData.order;
  if (lessonOrder !== undefined) {
    const orderInt = parseInt(lessonOrder);
    if (isNaN(orderInt) || orderInt < 0) {
      errors.push('Lesson order must be a non-negative number');
    }
  }

  // Duration validation
  const duration = meta._duration_minutes || lessonData.duration;
  if (duration !== undefined) {
    const durationInt = parseInt(duration);
    if (isNaN(durationInt) || durationInt < 0) {
      errors.push('Duration must be a non-negative number');
    }
  }

  // Lesson Type validation
  const lessonType = meta._lesson_type || lessonData.type;
  if (lessonType && !VALID_LESSON_TYPES.includes(lessonType)) {
    errors.push(`Invalid lesson type. Must be one of: ${VALID_LESSON_TYPES.join(', ')}`);
  }

  // Content Type validation
  const contentType = meta._content_type || lessonData.contentType;
  if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) {
    errors.push(`Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
  }

  // Completion Criteria validation
  const completionCriteria = meta._completion_criteria || lessonData.completionCriteria;
  if (completionCriteria && !VALID_COMPLETION_CRITERIA.includes(completionCriteria)) {
    errors.push(`Invalid completion criteria. Must be one of: ${VALID_COMPLETION_CRITERIA.join(', ')}`);
  }

  // Video URL validation (for video lessons)
  const videoUrl = meta._video_url || lessonData.videoUrl;
  if (lessonType === 'video' && videoUrl && !isValidUrl(videoUrl)) {
    errors.push('Video URL must be a valid URL');
  }

  return createValidationResult(errors);
};

// ============================================================
// FORMATTING FOR DISPLAY
// ============================================================

/**
 * Format lesson data for display in lists/cards
 * @param {Object} lesson - Lesson data
 * @returns {Object} Formatted lesson
 */
export const formatLessonForDisplay = (lesson) => {
  const sanitized = sanitizeLessonData(lesson);

  if (!sanitized) {
    return null;
  }

  // Calculate estimated reading time for text lessons
  let estimatedReadingTime = null;
  if (sanitized.meta._lesson_type === 'text' && sanitized.content) {
    const wordCount = sanitized.content.split(/\s+/).length;
    estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute
  }

  return {
    ...sanitized,
    // Formatted values for display
    formattedType: capitalize(sanitized.meta._lesson_type),
    formattedContentType: sanitized.meta._content_type === 'premium' ? 'Premium' : 'Free',
    formattedDuration: formatDuration(sanitized.meta._duration_minutes),
    formattedDate: formatDate(sanitized.date),
    formattedModified: formatDate(sanitized.modified),
    
    // Short excerpt
    shortExcerpt: sanitized.excerpt
      ? truncateText(sanitized.excerpt, 100)
      : 'No description available',
    
    // Badges
    isRequired: sanitized.meta._is_required,
    hasQuiz: sanitized.meta._has_quiz,
    hasVideo: sanitized.meta._lesson_type === 'video' && sanitized.meta._video_url !== '',
    hasPrerequisites: sanitized.meta._prerequisite_lessons.length > 0,
    hasResources: sanitized.meta._resources_urls.length > 0,
    hasSteps: sanitized.meta._lesson_steps.length > 0,
    
    // Counts
    prerequisitesCount: sanitized.meta._prerequisite_lessons.length,
    resourcesCount: sanitized.meta._resources_urls.length,
    stepsCount: sanitized.meta._lesson_steps.length,
    
    // Time estimates
    estimatedReadingTime,
    formattedEstimatedTime: estimatedReadingTime 
      ? `~${estimatedReadingTime} min read`
      : null,
    
    // Status badges
    isPublished: sanitized.status === 'publish',
    isDraft: sanitized.status === 'draft',
    isPrivate: sanitized.status === 'private',
    
    // Type checks
    isVideoLesson: sanitized.meta._lesson_type === 'video',
    isTextLesson: sanitized.meta._lesson_type === 'text',
    isQuizLesson: sanitized.meta._lesson_type === 'quiz',
    isPremium: sanitized.meta._content_type === 'premium'
  };
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Sort lessons by order (menu_order or lesson_order)
 * @param {Array} lessons - Array of lessons
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted lessons
 */
export const sortLessonsByOrder = (lessons, order = 'asc') => {
  return [...lessons].sort((a, b) => {
    const orderA = a.menu_order || a.meta?._lesson_order || 0;
    const orderB = b.menu_order || b.meta?._lesson_order || 0;
    
    if (orderA === orderB) {
      // If order is the same, sort by date
      return new Date(a.date) - new Date(b.date);
    }
    
    return order === 'asc' ? orderA - orderB : orderB - orderA;
  });
};

/**
 * Group lessons by type
 * @param {Array} lessons - Array of lessons
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
 * Group lessons by content type (free/premium)
 * @param {Array} lessons - Array of lessons
 * @returns {Object} Lessons grouped by content type
 */
export const groupLessonsByContentType = (lessons) => {
  return lessons.reduce((groups, lesson) => {
    const contentType = lesson.meta?._content_type || 'free';
    if (!groups[contentType]) {
      groups[contentType] = [];
    }
    groups[contentType].push(lesson);
    return groups;
  }, {});
};

/**
 * Filter lessons by course ID
 * @param {Array} lessons - Array of lessons
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
 * Filter lessons by type
 * @param {Array} lessons - Array of lessons
 * @param {string} type - Lesson type to filter by
 * @returns {Array} Filtered lessons
 */
export const filterLessonsByType = (lessons, type) => {
  if (!type || type === 'all') return lessons;
  
  return lessons.filter(lesson => {
    return lesson.meta?._lesson_type === type;
  });
};

/**
 * Calculate total duration of lessons
 * @param {Array} lessons - Array of lessons
 * @returns {number} Total duration in minutes
 */
export const calculateTotalDuration = (lessons) => {
  return lessons.reduce((total, lesson) => {
    const duration = parseInt(lesson.meta?._duration_minutes) || 0;
    return total + duration;
  }, 0);
};

/**
 * Calculate average duration of lessons
 * @param {Array} lessons - Array of lessons
 * @returns {number} Average duration in minutes
 */
export const calculateAverageDuration = (lessons) => {
  if (lessons.length === 0) return 0;
  
  const total = calculateTotalDuration(lessons);
  return Math.round(total / lessons.length);
};

/**
 * Get lesson completion percentage
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

/**
 * Check if lesson has prerequisites
 * @param {Object} lesson - Lesson data
 * @returns {boolean} True if has prerequisites
 */
export const hasPrerequisites = (lesson) => {
  return lesson && 
         Array.isArray(lesson.meta?._prerequisite_lessons) && 
         lesson.meta._prerequisite_lessons.length > 0;
};

/**
 * Check if user can access lesson (prerequisites met)
 * @param {Object} lesson - Lesson data
 * @param {Array} completedLessons - Array of completed lesson IDs
 * @returns {boolean} True if can access
 */
export const canAccessLesson = (lesson, completedLessons = []) => {
  if (!hasPrerequisites(lesson)) return true;
  
  const prerequisites = lesson.meta._prerequisite_lessons;
  return prerequisites.every(prereqId => completedLessons.includes(prereqId));
};

/**
 * Get next lesson in sequence
 * @param {Array} lessons - Array of sorted lessons
 * @param {number} currentLessonId - Current lesson ID
 * @returns {Object|null} Next lesson or null
 */
export const getNextLesson = (lessons, currentLessonId) => {
  const sortedLessons = sortLessonsByOrder(lessons);
  const currentIndex = sortedLessons.findIndex(l => l.id === currentLessonId);
  
  if (currentIndex === -1 || currentIndex === sortedLessons.length - 1) {
    return null;
  }
  
  return sortedLessons[currentIndex + 1];
};

/**
 * Get previous lesson in sequence
 * @param {Array} lessons - Array of sorted lessons
 * @param {number} currentLessonId - Current lesson ID
 * @returns {Object|null} Previous lesson or null
 */
export const getPreviousLesson = (lessons, currentLessonId) => {
  const sortedLessons = sortLessonsByOrder(lessons);
  const currentIndex = sortedLessons.findIndex(l => l.id === currentLessonId);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return sortedLessons[currentIndex - 1];
};

/**
 * Calculate lesson statistics
 * @param {Array} lessons - Array of lessons
 * @returns {Object} Lesson statistics
 */
export const calculateLessonStatistics = (lessons) => {
  const stats = {
    total: lessons.length,
    byType: {},
    byContentType: {},
    totalDuration: 0,
    averageDuration: 0,
    withQuiz: 0,
    withVideo: 0,
    withPrerequisites: 0,
    required: 0,
    premium: 0,
    published: 0,
    draft: 0
  };

  if (lessons.length === 0) return stats;

  // Initialize type counts
  VALID_LESSON_TYPES.forEach(type => {
    stats.byType[type] = 0;
  });

  VALID_CONTENT_TYPES.forEach(type => {
    stats.byContentType[type] = 0;
  });

  lessons.forEach(lesson => {
    const type = lesson.meta?._lesson_type || 'text';
    const contentType = lesson.meta?._content_type || 'free';
    
    if (stats.byType[type] !== undefined) {
      stats.byType[type]++;
    }
    
    if (stats.byContentType[contentType] !== undefined) {
      stats.byContentType[contentType]++;
    }

    stats.totalDuration += parseInt(lesson.meta?._duration_minutes) || 0;

    if (lesson.meta?._has_quiz) stats.withQuiz++;
    if (lesson.meta?._lesson_type === 'video' && lesson.meta?._video_url) stats.withVideo++;
    if (hasPrerequisites(lesson)) stats.withPrerequisites++;
    if (lesson.meta?._is_required) stats.required++;
    if (contentType === 'premium') stats.premium++;
    
    if (lesson.status === 'publish') stats.published++;
    if (lesson.status === 'draft') stats.draft++;
  });

  stats.averageDuration = calculateAverageDuration(lessons);

  return stats;
};

/**
 * Search lessons by query
 * @param {Array} lessons - Array of lessons
 * @param {string} query - Search query
 * @returns {Array} Filtered lessons
 */
export const searchLessons = (lessons, query) => {
  if (!query || query.trim() === '') return lessons;
  
  const searchTerm = query.toLowerCase().trim();
  
  return lessons.filter(lesson => {
    const searchableFields = [
      lesson.title,
      lesson.content,
      lesson.excerpt,
      lesson.meta?._lesson_description
    ].filter(Boolean).map(field => field.toLowerCase());
    
    return searchableFields.some(field => field.includes(searchTerm));
  });
};

/**
 * Reorder lessons (update menu_order)
 * @param {Array} lessons - Array of lessons to reorder
 * @param {number} fromIndex - Current index
 * @param {number} toIndex - Target index
 * @returns {Array} Reordered lessons with updated menu_order
 */
export const reorderLessons = (lessons, fromIndex, toIndex) => {
  const reordered = [...lessons];
  const [movedLesson] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedLesson);
  
  // Update menu_order for all lessons
  return reordered.map((lesson, index) => ({
    ...lesson,
    menu_order: index + 1,
    meta: {
      ...lesson.meta,
      _lesson_order: index + 1
    }
  }));
};

/**
 * Get lessons that are locked (prerequisites not met)
 * @param {Array} lessons - Array of lessons
 * @param {Array} completedLessons - Array of completed lesson IDs
 * @returns {Array} Locked lessons
 */
export const getLockedLessons = (lessons, completedLessons = []) => {
  return lessons.filter(lesson => !canAccessLesson(lesson, completedLessons));
};

/**
 * Get lessons that are available (prerequisites met)
 * @param {Array} lessons - Array of lessons
 * @param {Array} completedLessons - Array of completed lesson IDs
 * @returns {Array} Available lessons
 */
export const getAvailableLessons = (lessons, completedLessons = []) => {
  return lessons.filter(lesson => canAccessLesson(lesson, completedLessons));
};

/**
 * Get next available lesson (not completed, prerequisites met)
 * @param {Array} lessons - Array of lessons
 * @param {Array} completedLessons - Array of completed lesson IDs
 * @returns {Object|null} Next available lesson or null
 */
export const getNextAvailableLesson = (lessons, completedLessons = []) => {
  const sortedLessons = sortLessonsByOrder(lessons);
  
  return sortedLessons.find(lesson => 
    !completedLessons.includes(lesson.id) && 
    canAccessLesson(lesson, completedLessons)
  ) || null;
};

/**
 * Validate lesson steps structure
 * @param {Array} steps - Lesson steps
 * @returns {Object} Validation result
 */
export const validateLessonSteps = (steps) => {
  const errors = [];
  
  if (!Array.isArray(steps)) {
    errors.push('Lesson steps must be an array');
    return createValidationResult(errors);
  }

  steps.forEach((step, index) => {
    if (!step || typeof step !== 'object') {
      errors.push(`Step ${index + 1} has invalid structure`);
      return;
    }

    if (!step.type) {
      errors.push(`Step ${index + 1} is missing required field: type`);
    }

    if (!step.title || step.title.trim() === '') {
      errors.push(`Step ${index + 1} is missing required field: title`);
    }

    const validStepTypes = ['video', 'text', 'pdf', 'quiz', 'image', 'audio'];
    if (step.type && !validStepTypes.includes(step.type)) {
      errors.push(`Step ${index + 1} has invalid type: ${step.type}`);
    }
  });

  return createValidationResult(errors);
};