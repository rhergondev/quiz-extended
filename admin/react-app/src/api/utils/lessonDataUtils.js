/**
 * Lesson Data Validation and Transformation Utilities
 * Complete refactor to match WordPress REST API requirements
 * * @package QuizExtended
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
  _completion_criteria: 'view_all', // 🔥 CAMBIO: Valor por defecto actualizado
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
  'audio',
  'interactive' // Añadido para consistencia con el modal
];

/**
 * Valid content types
 */
export const VALID_CONTENT_TYPES = ['free', 'premium'];

/**
 * Valid completion criteria
 * 🔥 CAMBIO: Valores actualizados para coincidir con el modal
 */
export const VALID_COMPLETION_CRITERIA = [
  'view_all',
  'pass_quiz',
  'complete_steps',
  // Se mantienen los antiguos por si se usan en otro lugar
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
 * * WordPress REST API structure:
 * - Root level: title, content, status, menu_order
 * - meta object: All custom fields with _ prefix
 * * @param {Object} lessonData - Raw lesson data from modal/form
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformLessonDataForApi = (lessonData) => {
  console.log('🔄 transformLessonDataForApi - Input:', lessonData);

  const transformed = {
    title: sanitizeString(lessonData.title),
    content: sanitizeString(lessonData.content || ''),
    excerpt: sanitizeString(lessonData.description || ''),
    status: sanitizePostStatus(lessonData.status, 'publish'), // Siempre publicar
    menu_order: sanitizeInteger(lessonData.menu_order || lessonData.lessonOrder || 1, 1, 0)
  };

  transformed.meta = {};

  // 🔥 CAMBIO: Solo agregar _course_id si se proporciona explícitamente
  // Las lecciones pueden existir sin curso asignado (usadas en múltiples cursos)
  // Verifica tanto courseId como meta._course_id
  // "0" o 0 significa "sin curso" en los selects HTML
  const courseIdValue = lessonData.courseId || lessonData.meta?._course_id;
  if (courseIdValue !== undefined && 
      courseIdValue !== null && 
      courseIdValue !== '' && 
      courseIdValue !== '0' && 
      courseIdValue !== 0) {
    const courseIdInt = sanitizeOptionalInteger(courseIdValue, 1);
    if (courseIdInt && courseIdInt > 0) {
      transformed.meta._course_id = courseIdInt;
    }
  }
  
  if (lessonData.lessonOrder !== undefined) {
    transformed.meta._lesson_order = sanitizeInteger(lessonData.lessonOrder, 1, 0);
  }
  if (lessonData.completionCriteria !== undefined) {
    transformed.meta._completion_criteria = sanitizeEnum(
      lessonData.completionCriteria,
      VALID_COMPLETION_CRITERIA,
      'view_all'
    );
  }
  if (lessonData.description !== undefined) {
    transformed.meta._lesson_description = sanitizeString(lessonData.description);
  }
  
  // 🔥 CAMBIO: Soportar steps en múltiples ubicaciones
  const stepsValue = lessonData.steps || lessonData.meta?._lesson_steps;
  if (stepsValue !== undefined) {
    transformed.meta._lesson_steps = sanitizeLessonSteps(stepsValue);
    console.log('🔄 Steps being saved:', transformed.meta._lesson_steps);
  }

  // 🔥 CAMBIO: No incluir _course_id del DEFAULT si no se proporcionó uno válido
  // El orden es importante: defaults primero, luego valores proporcionados
  const { _course_id: defaultCourseId, ...defaultMetaWithoutCourseId } = DEFAULT_LESSON_META;
  
  // Primero defaults, luego sobrescribir con valores proporcionados
  const finalMeta = {
    ...defaultMetaWithoutCourseId,
    ...transformed.meta
  };
  
  // Si no hay steps proporcionados, usar array vacío del default
  if (!finalMeta._lesson_steps || !Array.isArray(finalMeta._lesson_steps)) {
    finalMeta._lesson_steps = [];
  }
  
  transformed.meta = finalMeta;

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
      order: sanitizeInteger(step.order, index + 1, 1),
      title: sanitizeString(step.title),
      data: step.data && typeof step.data === 'object' ? step.data : {} 
    };
  }).filter(step => step !== null);
};

// ============================================================
// SANITIZATION FOR DISPLAY
// ============================================================

/**
 * Sanitize lesson data from API for display in React components
 * Normalizes WordPress REST API response format
 * * @param {Object} lessonData - Raw lesson data from WordPress API
 * @returns {Object} Sanitized lesson data
 */
export const sanitizeLessonData = (lessonData) => {
  if (!lessonData) {
    console.warn('⚠️ sanitizeLessonData - No data provided');
    return null;
  }

  const title = sanitizeRenderedContent(lessonData.title);
  const content = sanitizeRenderedContent(lessonData.content);
  const excerpt = sanitizeRenderedContent(lessonData.excerpt);

  const sanitized = {
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

    meta: {
      ...DEFAULT_LESSON_META,
      ...lessonData.meta,
      _is_required: sanitizeBoolean(lessonData.meta?._is_required),
      _has_quiz: sanitizeBoolean(lessonData.meta?._has_quiz),
      _prerequisite_lessons: sanitizeIdArray(lessonData.meta?._prerequisite_lessons),
      _lesson_steps: sanitizeLessonSteps(lessonData.meta?._lesson_steps),
      _resources_urls: Array.isArray(lessonData.meta?._resources_urls) ? lessonData.meta._resources_urls : []
    },

    _embedded: lessonData._embedded || {},
    _links: lessonData._links || {}
  };

  return sanitized;
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate lesson data before API request
 * * @param {Object} lessonData - Lesson data to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateLessonData = (lessonData) => {
  const errors = [];

  const titleError = validateRequired(lessonData.title, 'Lesson title');
  if (titleError) errors.push(titleError);

  if (lessonData.status && !VALID_LESSON_STATUSES.includes(lessonData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_LESSON_STATUSES.join(', ')}`);
  }
  
  // 🔥 CAMBIO: course_id es OPCIONAL (lecciones pueden estar en múltiples cursos)
  // La relación curso-lección se gestiona desde el curso con _lesson_ids
  const meta = lessonData.meta || lessonData;
  const courseId = meta._course_id || lessonData.courseId;
  
  // 🔍 DEBUG: Ver qué valor tiene courseId
  console.log('🔍 validateLessonData - courseId:', courseId, 'type:', typeof courseId);
  
  // Solo validar si courseId existe, no es vacío/null/undefined Y NO ES "0"
  // "0" significa "sin curso seleccionado" en los selects HTML
  if (courseId !== null && courseId !== undefined && courseId !== '' && courseId !== '0' && courseId !== 0) {
    const courseIdNum = parseInt(courseId, 10);
    console.log('🔍 validateLessonData - courseIdNum:', courseIdNum, 'isNaN:', isNaN(courseIdNum));
    if (isNaN(courseIdNum) || courseIdNum <= 0) {
      errors.push('Course ID must be a positive number if provided');
    }
  }

  const completionCriteria = meta._completion_criteria || lessonData.completionCriteria;
  if (completionCriteria && !VALID_COMPLETION_CRITERIA.includes(completionCriteria)) {
    errors.push(`Invalid completion criteria. Must be one of: ${VALID_COMPLETION_CRITERIA.join(', ')}`);
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

  let estimatedReadingTime = null;
  if (sanitized.meta._lesson_type === 'text' && sanitized.content) {
    const wordCount = sanitized.content.split(/\s+/).length;
    estimatedReadingTime = Math.ceil(wordCount / 200);
  }

  return {
    ...sanitized,
    formattedType: capitalize(sanitized.meta._lesson_type),
    formattedContentType: sanitized.meta._content_type === 'premium' ? 'Premium' : 'Free',
    formattedDuration: formatDuration(sanitized.meta._duration_minutes),
    formattedDate: formatDate(sanitized.date),
    formattedModified: formatDate(sanitized.modified),
    
    shortExcerpt: sanitized.excerpt
      ? truncateText(sanitized.excerpt, 100)
      : 'No description available',
    
    isRequired: sanitized.meta._is_required,
    hasQuiz: sanitized.meta._has_quiz,
    hasVideo: sanitized.meta._lesson_type === 'video' && sanitized.meta._video_url !== '',
    hasPrerequisites: sanitized.meta._prerequisite_lessons.length > 0,
    hasResources: sanitized.meta._resources_urls.length > 0,
    hasSteps: sanitized.meta._lesson_steps.length > 0,
    
    prerequisitesCount: sanitized.meta._prerequisite_lessons.length,
    resourcesCount: sanitized.meta._resources_urls.length,
    stepsCount: sanitized.meta._lesson_steps.length,
    
    estimatedReadingTime,
    formattedEstimatedTime: estimatedReadingTime 
      ? `~${estimatedReadingTime} min read`
      : null,
    
    isPublished: sanitized.status === 'publish',
    isDraft: sanitized.status === 'draft',
    isPrivate: sanitized.status === 'private',
    
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