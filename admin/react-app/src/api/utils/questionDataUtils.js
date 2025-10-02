/**
 * Question Data Validation and Transformation Utilities
 * Handles data formatting for WordPress REST API
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 1.0.0
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
  validateRequired,
  validateRange,
  capitalize,
  formatDate,
  createValidationResult
} from './commonDataUtils.js';

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Default question meta fields structure
 * Matches WordPress meta registration
 */
const DEFAULT_QUESTION_META = {
  _course_id: null,
  _question_lesson: null,
  _question_type: 'multiple_choice',
  _difficulty_level: 'medium',
  _points: 1,
  _points_incorrect: 0,
  _question_order: 0,
  _is_required: false,
  _quiz_ids: [],
  _question_options: [],
  _correct_answer: null,
  _explanation: '',
  _provider: 'custom'
};

/**
 * Valid question types
 */
export const VALID_QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'essay',
  'short_answer',
  'fill_blank',
  'matching',
  'ordering'
];

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
 * Valid question providers
 */
export const VALID_QUESTION_PROVIDERS = [
  'custom',
  'imported',
  'ai_generated',
  'template'
];

/**
 * Valid question statuses (WordPress post statuses)
 */
export const VALID_QUESTION_STATUSES = ['publish', 'draft', 'private', 'pending'];

// ============================================================
// TRANSFORMATION FOR API REQUESTS
// ============================================================

/**
 * Transform question data for WordPress REST API requests
 * 
 * WordPress REST API structure:
 * - Root level: title, content, status
 * - meta object: All custom fields with _ prefix
 * 
 * @param {Object} questionData - Raw question data from modal/form
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformQuestionDataForApi = (questionData) => {
  console.log('🔄 transformQuestionDataForApi - Input:', questionData);

  // ============================================================
  // ROOT LEVEL FIELDS (WordPress standard)
  // ============================================================
  
  const transformed = {
    // Title - required (the question text)
    title: sanitizeString(questionData.title || questionData.text || questionData.question),
    
    // Content - additional question details
    content: sanitizeString(questionData.content || ''),
    
    // Status
    status: sanitizePostStatus(questionData.status, 'draft')
  };

  // ============================================================
  // META FIELDS (Custom fields with _ prefix)
  // ============================================================
  
  transformed.meta = {};

  // Course ID (relationship)
  if (questionData._course_id !== undefined) {
    transformed.meta._course_id = sanitizeOptionalInteger(questionData._course_id, 1);
  } else if (questionData.courseId !== undefined) {
    transformed.meta._course_id = sanitizeOptionalInteger(questionData.courseId, 1);
  } else if (questionData.meta?._course_id !== undefined) {
    transformed.meta._course_id = sanitizeOptionalInteger(questionData.meta._course_id, 1);
  }

  // Lesson ID (relationship)
  if (questionData._question_lesson !== undefined) {
    transformed.meta._question_lesson = sanitizeOptionalInteger(questionData._question_lesson, 1);
  } else if (questionData.lessonId !== undefined) {
    transformed.meta._question_lesson = sanitizeOptionalInteger(questionData.lessonId, 1);
  } else if (questionData.meta?._question_lesson !== undefined) {
    transformed.meta._question_lesson = sanitizeOptionalInteger(questionData.meta._question_lesson, 1);
  }

  // Question Type
  if (questionData._question_type !== undefined) {
    transformed.meta._question_type = sanitizeEnum(
      questionData._question_type,
      VALID_QUESTION_TYPES,
      'multiple_choice'
    );
  } else if (questionData.type !== undefined) {
    transformed.meta._question_type = sanitizeEnum(
      questionData.type,
      VALID_QUESTION_TYPES,
      'multiple_choice'
    );
  } else if (questionData.meta?._question_type !== undefined) {
    transformed.meta._question_type = sanitizeEnum(
      questionData.meta._question_type,
      VALID_QUESTION_TYPES,
      'multiple_choice'
    );
  }

  // Difficulty Level
  if (questionData._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      questionData._difficulty_level,
      VALID_DIFFICULTY_LEVELS,
      'medium'
    );
  } else if (questionData.difficulty !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      questionData.difficulty,
      VALID_DIFFICULTY_LEVELS,
      'medium'
    );
  } else if (questionData.meta?._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      questionData.meta._difficulty_level,
      VALID_DIFFICULTY_LEVELS,
      'medium'
    );
  }

  // Points (correct answer)
  if (questionData._points !== undefined) {
    transformed.meta._points = sanitizeInteger(questionData._points, 1, 0);
  } else if (questionData.points !== undefined) {
    transformed.meta._points = sanitizeInteger(questionData.points, 1, 0);
  } else if (questionData.meta?._points !== undefined) {
    transformed.meta._points = sanitizeInteger(questionData.meta._points, 1, 0);
  }

  // Points Incorrect (negative scoring)
  if (questionData._points_incorrect !== undefined) {
    transformed.meta._points_incorrect = sanitizeInteger(questionData._points_incorrect, 0, 0);
  } else if (questionData.pointsIncorrect !== undefined) {
    transformed.meta._points_incorrect = sanitizeInteger(questionData.pointsIncorrect, 0, 0);
  } else if (questionData.meta?._points_incorrect !== undefined) {
    transformed.meta._points_incorrect = sanitizeInteger(questionData.meta._points_incorrect, 0, 0);
  }

  // Question Order
  if (questionData._question_order !== undefined) {
    transformed.meta._question_order = sanitizeInteger(questionData._question_order, 0, 0);
  } else if (questionData.order !== undefined) {
    transformed.meta._question_order = sanitizeInteger(questionData.order, 0, 0);
  } else if (questionData.meta?._question_order !== undefined) {
    transformed.meta._question_order = sanitizeInteger(questionData.meta._question_order, 0, 0);
  }

  // Is Required
  if (questionData._is_required !== undefined) {
    transformed.meta._is_required = sanitizeBoolean(questionData._is_required);
  } else if (questionData.isRequired !== undefined) {
    transformed.meta._is_required = sanitizeBoolean(questionData.isRequired);
  } else if (questionData.meta?._is_required !== undefined) {
    transformed.meta._is_required = sanitizeBoolean(questionData.meta._is_required);
  }

  // Quiz IDs (relationships)
  if (questionData._quiz_ids !== undefined) {
    transformed.meta._quiz_ids = sanitizeIdArray(questionData._quiz_ids);
  } else if (questionData.quizIds !== undefined) {
    transformed.meta._quiz_ids = sanitizeIdArray(questionData.quizIds);
  } else if (questionData.meta?._quiz_ids !== undefined) {
    transformed.meta._quiz_ids = sanitizeIdArray(questionData.meta._quiz_ids);
  }

  // Question Options (complex array)
  if (questionData._question_options !== undefined) {
    transformed.meta._question_options = sanitizeQuestionOptions(questionData._question_options);
  } else if (questionData.options !== undefined) {
    transformed.meta._question_options = sanitizeQuestionOptions(questionData.options);
  } else if (questionData.meta?._question_options !== undefined) {
    transformed.meta._question_options = sanitizeQuestionOptions(questionData.meta._question_options);
  }

  // Correct Answer
  if (questionData._correct_answer !== undefined) {
    transformed.meta._correct_answer = questionData._correct_answer;
  } else if (questionData.correctAnswer !== undefined) {
    transformed.meta._correct_answer = questionData.correctAnswer;
  } else if (questionData.meta?._correct_answer !== undefined) {
    transformed.meta._correct_answer = questionData.meta._correct_answer;
  }

  // Explanation
  if (questionData._explanation !== undefined) {
    transformed.meta._explanation = sanitizeString(questionData._explanation);
  } else if (questionData.explanation !== undefined) {
    transformed.meta._explanation = sanitizeString(questionData.explanation);
  } else if (questionData.meta?._explanation !== undefined) {
    transformed.meta._explanation = sanitizeString(questionData.meta._explanation);
  }

  // Provider
  if (questionData._provider !== undefined) {
    transformed.meta._provider = sanitizeEnum(
      questionData._provider,
      VALID_QUESTION_PROVIDERS,
      'custom'
    );
  } else if (questionData.provider !== undefined) {
    transformed.meta._provider = sanitizeEnum(
      questionData.provider,
      VALID_QUESTION_PROVIDERS,
      'custom'
    );
  } else if (questionData.meta?._provider !== undefined) {
    transformed.meta._provider = sanitizeEnum(
      questionData.meta._provider,
      VALID_QUESTION_PROVIDERS,
      'custom'
    );
  }

  // Apply defaults for missing fields
  transformed.meta = {
    ...DEFAULT_QUESTION_META,
    ...transformed.meta
  };

  console.log('🔄 transformQuestionDataForApi - Output:', transformed);
  return transformed;
};

// ============================================================
// SANITIZATION FOR DISPLAY
// ============================================================

/**
 * Sanitize question options array
 * @param {Array} options - Question options
 * @returns {Array} Sanitized options
 */
const sanitizeQuestionOptions = (options) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option, index) => {
    if (!option || typeof option !== 'object') {
      return null;
    }

    return {
      id: sanitizeInteger(option.id, index, 0),
      text: sanitizeString(option.text),
      isCorrect: sanitizeBoolean(option.isCorrect || option.is_correct)
    };
  }).filter(option => option !== null && option.text !== '');
};

/**
 * Sanitize question data from API for display in React components
 * Normalizes WordPress REST API response format
 * 
 * @param {Object} questionData - Raw question data from WordPress API
 * @returns {Object} Sanitized question data
 */
export const sanitizeQuestionData = (questionData) => {
  if (!questionData) {
    console.warn('⚠️ sanitizeQuestionData - No data provided');
    return null;
  }

  // Extract title, content, excerpt (handle both object and string)
  const title = sanitizeRenderedContent(questionData.title);
  const content = sanitizeRenderedContent(questionData.content);
  const excerpt = sanitizeRenderedContent(questionData.excerpt);

  const sanitized = {
    // Core WordPress fields
    id: questionData.id || 0,
    title,
    content,
    excerpt,
    status: sanitizePostStatus(questionData.status, 'draft'),
    date: questionData.date || '',
    modified: questionData.modified || '',
    slug: questionData.slug || '',
    author: questionData.author || 0,

    // Meta fields (with defaults)
    meta: {
      ...DEFAULT_QUESTION_META,
      ...questionData.meta,
      // Ensure boolean fields are actual booleans
      _is_required: sanitizeBoolean(questionData.meta?._is_required),
      // Ensure arrays
      _quiz_ids: sanitizeIdArray(questionData.meta?._quiz_ids),
      _question_options: sanitizeQuestionOptions(questionData.meta?._question_options)
    },

    // Embedded data
    _embedded: questionData._embedded || {},

    // Links
    _links: questionData._links || {}
  };

  return sanitized;
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate question data before API request
 * 
 * @param {Object} questionData - Question data to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateQuestionData = (questionData) => {
  const errors = [];

  // ============================================================
  // REQUIRED FIELDS
  // ============================================================
  
  const titleError = validateRequired(
    questionData.title || questionData.text || questionData.question, 
    'Question text'
  );
  if (titleError) errors.push(titleError);

  // ============================================================
  // STATUS VALIDATION
  // ============================================================
  
  if (questionData.status && !VALID_QUESTION_STATUSES.includes(questionData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_QUESTION_STATUSES.join(', ')}`);
  }

  // ============================================================
  // META FIELDS VALIDATION
  // ============================================================
  
  // Extract meta (handle both flat and nested structure)
  const meta = questionData.meta || questionData;

  // Question Type validation
  const questionType = meta._question_type || questionData.type;
  if (questionType && !VALID_QUESTION_TYPES.includes(questionType)) {
    errors.push(`Invalid question type. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}`);
  }

  // Difficulty Level validation
  const difficulty = meta._difficulty_level || questionData.difficulty;
  if (difficulty && !VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
    errors.push(`Invalid difficulty level. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
  }

  // Points validation (must be positive)
  const points = meta._points || questionData.points;
  if (points !== undefined) {
    const pointsInt = parseInt(points);
    if (isNaN(pointsInt) || pointsInt < 0) {
      errors.push('Points must be a positive number or 0');
    }
  }

  // Question Options validation
  const options = meta._question_options || questionData.options;
  const type = questionType || 'multiple_choice';
  
  if (type === 'multiple_choice' || type === 'true_false') {
    if (!options || !Array.isArray(options)) {
      errors.push('Question options must be an array');
    } else if (options.length === 0) {
      errors.push('Question must have at least one option');
    } else {
      // Validate each option
      options.forEach((option, index) => {
        if (!option || typeof option !== 'object') {
          errors.push(`Option ${index + 1} has invalid structure`);
        } else if (!option.text || option.text.trim() === '') {
          errors.push(`Option ${index + 1} must have text`);
        }
      });

      // Check for at least one correct answer
      const hasCorrectAnswer = options.some(opt => opt.isCorrect || opt.is_correct);
      if (!hasCorrectAnswer) {
        errors.push('Question must have at least one correct answer');
      }
    }
  }

  return createValidationResult(errors);
};

// ============================================================
// FORMATTING FOR DISPLAY
// ============================================================

/**
 * Format question data for display in lists/cards
 * @param {Object} question - Question data
 * @returns {Object} Formatted question
 */
export const formatQuestionForDisplay = (question) => {
  const sanitized = sanitizeQuestionData(question);

  if (!sanitized) {
    return null;
  }

  // Count correct answers
  const correctAnswersCount = sanitized.meta._question_options.filter(
    opt => opt.isCorrect
  ).length;

  return {
    ...sanitized,
    // Formatted values for display
    formattedQuestionType: capitalize(sanitized.meta._question_type.replace('_', ' ')),
    formattedDifficulty: capitalize(sanitized.meta._difficulty_level),
    formattedPoints: `${sanitized.meta._points} point${sanitized.meta._points !== 1 ? 's' : ''}`,
    formattedDate: formatDate(sanitized.date),
    formattedModified: formatDate(sanitized.modified),
    
    // Badges
    isRequired: sanitized.meta._is_required,
    hasExplanation: sanitized.meta._explanation.length > 0,
    hasNegativeScoring: sanitized.meta._points_incorrect > 0,
    
    // Options metadata
    optionsCount: sanitized.meta._question_options.length,
    correctAnswersCount,
    isMultipleCorrect: correctAnswersCount > 1,
    
    // Status badges
    isPublished: sanitized.status === 'publish',
    isDraft: sanitized.status === 'draft',
    isPrivate: sanitized.status === 'private',
    
    // Provider info
    isCustomQuestion: sanitized.meta._provider === 'custom',
    isImported: sanitized.meta._provider === 'imported',
    isAIGenerated: sanitized.meta._provider === 'ai_generated'
  };
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get correct answer(s) from question
 * @param {Object} question - Question data
 * @returns {Array} Array of correct option IDs or texts
 */
export const getCorrectAnswers = (question) => {
  const sanitized = sanitizeQuestionData(question);
  if (!sanitized) return [];

  return sanitized.meta._question_options
    .filter(opt => opt.isCorrect)
    .map(opt => opt.id);
};

/**
 * Check if answer is correct
 * @param {Object} question - Question data
 * @param {*} userAnswer - User's answer (ID or array of IDs)
 * @returns {boolean} True if correct
 */
export const isAnswerCorrect = (question, userAnswer) => {
  const correctAnswers = getCorrectAnswers(question);
  
  if (Array.isArray(userAnswer)) {
    // Multiple selection - all must match
    return userAnswer.length === correctAnswers.length &&
           userAnswer.every(ans => correctAnswers.includes(ans));
  }
  
  // Single selection
  return correctAnswers.includes(userAnswer);
};

/**
 * Calculate score for question based on answer
 * @param {Object} question - Question data
 * @param {*} userAnswer - User's answer
 * @returns {number} Score (can be negative if negative scoring enabled)
 */
export const calculateQuestionScore = (question, userAnswer) => {
  const sanitized = sanitizeQuestionData(question);
  if (!sanitized) return 0;

  const correct = isAnswerCorrect(question, userAnswer);
  
  if (correct) {
    return sanitized.meta._points;
  } else {
    return sanitized.meta._points_incorrect > 0 
      ? -sanitized.meta._points_incorrect 
      : 0;
  }
};

/**
 * Sort questions by order
 * @param {Array} questions - Array of questions
 * @returns {Array} Sorted questions
 */
export const sortQuestionsByOrder = (questions) => {
  return [...questions].sort((a, b) => {
    const orderA = a.meta?._question_order || 0;
    const orderB = b.meta?._question_order || 0;
    return orderA - orderB;
  });
};

/**
 * Group questions by type
 * @param {Array} questions - Array of questions
 * @returns {Object} Questions grouped by type
 */
export const groupQuestionsByType = (questions) => {
  return questions.reduce((groups, question) => {
    const type = question.meta?._question_type || 'multiple_choice';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(question);
    return groups;
  }, {});
};

/**
 * Group questions by difficulty
 * @param {Array} questions - Array of questions
 * @returns {Object} Questions grouped by difficulty
 */
export const groupQuestionsByDifficulty = (questions) => {
  return questions.reduce((groups, question) => {
    const difficulty = question.meta?._difficulty_level || 'medium';
    if (!groups[difficulty]) {
      groups[difficulty] = [];
    }
    groups[difficulty].push(question);
    return groups;
  }, {});
};

/**
 * Calculate total points for questions
 * @param {Array} questions - Array of questions
 * @returns {number} Total points
 */
export const calculateTotalPoints = (questions) => {
  return questions.reduce((total, question) => {
    return total + (question.meta?._points || 0);
  }, 0);
};

/**
 * Randomize question options (for display)
 * @param {Object} question - Question data
 * @param {number} seed - Optional seed for deterministic randomization
 * @returns {Object} Question with randomized options
 */
export const randomizeQuestionOptions = (question, seed = null) => {
  const sanitized = sanitizeQuestionData(question);
  if (!sanitized) return null;

  const options = [...sanitized.meta._question_options];
  
  // Simple Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    ...sanitized,
    meta: {
      ...sanitized.meta,
      _question_options: options
    }
  };
};