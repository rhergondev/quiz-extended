/**
 * Quiz Data Validation and Transformation Utilities
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
  extractFeaturedMediaUrl,
  createValidationResult
} from './commonDataUtils.js';

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Default quiz meta fields structure
 * Matches WordPress meta registration
 */
const DEFAULT_QUIZ_META = {
  _course_id: null,
  _quiz_type: 'standard',
  _difficulty_level: 'intermediate',
  _quiz_category: '',
  _passing_score: 70,
  _time_limit: 0,
  _max_attempts: 0,
  _randomize_questions: false,
  _show_results: true,
  _enable_negative_scoring: false,
  _quiz_question_ids: [],
  _lesson_ids: [],
  _total_points: 0,
  _quiz_instructions: ''
};

/**
 * Valid quiz types
 */
export const VALID_QUIZ_TYPES = [
  'standard',
  'graded',
  'practice',
  'survey',
  'assessment',
  'certification'
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
  'advanced',
  'expert'
];

/**
 * Valid quiz categories
 */
export const VALID_QUIZ_CATEGORIES = [
  'knowledge-check',
  'skills-assessment',
  'practice-test',
  'final-exam',
  'certification',
  'self-assessment',
  'feedback'
];

/**
 * Valid quiz statuses (WordPress post statuses)
 */
export const VALID_QUIZ_STATUSES = ['publish', 'draft', 'private', 'pending'];

// ============================================================
// TRANSFORMATION FOR API REQUESTS
// ============================================================

/**
 * Transform quiz data for WordPress REST API requests
 * 
 * WordPress REST API structure:
 * - Root level: title, content, status
 * - meta object: All custom fields with _ prefix
 * 
 * @param {Object} quizData - Raw quiz data from modal/form
 * @returns {Object} Formatted data for WordPress REST API
 */
export const transformQuizDataForApi = (quizData) => {
  console.log('🔄 transformQuizDataForApi - Input:', quizData);

  // ============================================================
  // ROOT LEVEL FIELDS (WordPress standard)
  // ============================================================
  
  const transformed = {
    // Title - required
    title: sanitizeString(quizData.title),
    
    // Content - quiz instructions
    content: sanitizeString(quizData.content || quizData.instructions || ''),
    
    // Status
    status: sanitizePostStatus(quizData.status, 'draft')
  };

  // ============================================================
  // TAXONOMIES (Root level in WordPress REST API)
  // ============================================================
  
  // Category taxonomy (qe_category)
  if (quizData.qe_category !== undefined) {
    // WordPress expects taxonomy as array of term IDs
    if (Array.isArray(quizData.qe_category)) {
      transformed.qe_category = quizData.qe_category
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id) && id > 0);
    } else if (quizData.qe_category) {
      const categoryId = parseInt(quizData.qe_category, 10);
      if (!isNaN(categoryId) && categoryId > 0) {
        transformed.qe_category = [categoryId];
      }
    }
  }

  // ============================================================
  // META FIELDS (Custom fields with _ prefix)
  // ============================================================
  
  transformed.meta = {};

  // Course ID (relationship) - Solo incluir si NO es "0", 0, "", null o undefined
  const courseIdValue = quizData._course_id || quizData.courseId || quizData.meta?._course_id;
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

  // Quiz Type
  if (quizData._quiz_type !== undefined) {
    transformed.meta._quiz_type = sanitizeEnum(
      quizData._quiz_type,
      VALID_QUIZ_TYPES,
      'standard'
    );
  } else if (quizData.quizType !== undefined) {
    transformed.meta._quiz_type = sanitizeEnum(
      quizData.quizType,
      VALID_QUIZ_TYPES,
      'standard'
    );
  } else if (quizData.meta?._quiz_type !== undefined) {
    transformed.meta._quiz_type = sanitizeEnum(
      quizData.meta._quiz_type,
      VALID_QUIZ_TYPES,
      'standard'
    );
  }

  // Difficulty Level
  if (quizData._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      quizData._difficulty_level,
      VALID_DIFFICULTY_LEVELS,
      'intermediate'
    );
  } else if (quizData.difficulty !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      quizData.difficulty,
      VALID_DIFFICULTY_LEVELS,
      'intermediate'
    );
  } else if (quizData.meta?._difficulty_level !== undefined) {
    transformed.meta._difficulty_level = sanitizeEnum(
      quizData.meta._difficulty_level,
      VALID_DIFFICULTY_LEVELS,
      'intermediate'
    );
  }

  // Quiz Category
  if (quizData._quiz_category !== undefined) {
    transformed.meta._quiz_category = sanitizeString(quizData._quiz_category);
  } else if (quizData.category !== undefined) {
    transformed.meta._quiz_category = sanitizeString(quizData.category);
  } else if (quizData.meta?._quiz_category !== undefined) {
    transformed.meta._quiz_category = sanitizeString(quizData.meta._quiz_category);
  }

  // Passing Score (percentage 0-100)
  if (quizData._passing_score !== undefined) {
    transformed.meta._passing_score = sanitizeInteger(quizData._passing_score, 70, 0);
    transformed.meta._passing_score = Math.min(transformed.meta._passing_score, 100);
  } else if (quizData.passingScore !== undefined) {
    transformed.meta._passing_score = sanitizeInteger(quizData.passingScore, 70, 0);
    transformed.meta._passing_score = Math.min(transformed.meta._passing_score, 100);
  } else if (quizData.meta?._passing_score !== undefined) {
    transformed.meta._passing_score = sanitizeInteger(quizData.meta._passing_score, 70, 0);
    transformed.meta._passing_score = Math.min(transformed.meta._passing_score, 100);
  }

  // Time Limit (minutes, 0 = unlimited)
  if (quizData._time_limit !== undefined) {
    transformed.meta._time_limit = sanitizeInteger(quizData._time_limit, 0, 0);
  } else if (quizData.timeLimit !== undefined) {
    transformed.meta._time_limit = sanitizeInteger(quizData.timeLimit, 0, 0);
  } else if (quizData.meta?._time_limit !== undefined) {
    transformed.meta._time_limit = sanitizeInteger(quizData.meta._time_limit, 0, 0);
  }

  // Max Attempts (0 = unlimited)
  if (quizData._max_attempts !== undefined) {
    transformed.meta._max_attempts = sanitizeInteger(quizData._max_attempts, 0, 0);
  } else if (quizData.maxAttempts !== undefined) {
    transformed.meta._max_attempts = sanitizeInteger(quizData.maxAttempts, 0, 0);
  } else if (quizData.meta?._max_attempts !== undefined) {
    transformed.meta._max_attempts = sanitizeInteger(quizData.meta._max_attempts, 0, 0);
  }

  // Boolean fields
  if (quizData._randomize_questions !== undefined) {
    transformed.meta._randomize_questions = sanitizeBoolean(quizData._randomize_questions);
  } else if (quizData.randomizeQuestions !== undefined) {
    transformed.meta._randomize_questions = sanitizeBoolean(quizData.randomizeQuestions);
  } else if (quizData.meta?._randomize_questions !== undefined) {
    transformed.meta._randomize_questions = sanitizeBoolean(quizData.meta._randomize_questions);
  }

  if (quizData._show_results !== undefined) {
    transformed.meta._show_results = sanitizeBoolean(quizData._show_results, true);
  } else if (quizData.showResults !== undefined) {
    transformed.meta._show_results = sanitizeBoolean(quizData.showResults, true);
  } else if (quizData.meta?._show_results !== undefined) {
    transformed.meta._show_results = sanitizeBoolean(quizData.meta._show_results, true);
  }

  if (quizData._enable_negative_scoring !== undefined) {
    transformed.meta._enable_negative_scoring = sanitizeBoolean(quizData._enable_negative_scoring);
  } else if (quizData.enableNegativeScoring !== undefined) {
    transformed.meta._enable_negative_scoring = sanitizeBoolean(quizData.enableNegativeScoring);
  } else if (quizData.meta?._enable_negative_scoring !== undefined) {
    transformed.meta._enable_negative_scoring = sanitizeBoolean(quizData.meta._enable_negative_scoring);
  }

  // Question IDs (relationships)
  if (quizData._quiz_question_ids !== undefined) {
    transformed.meta._quiz_question_ids = sanitizeIdArray(quizData._quiz_question_ids);
  } else if (quizData.questionIds !== undefined) {
    transformed.meta._quiz_question_ids = sanitizeIdArray(quizData.questionIds);
  } else if (quizData.meta?._quiz_question_ids !== undefined) {
    transformed.meta._quiz_question_ids = sanitizeIdArray(quizData.meta._quiz_question_ids);
  }

  // Lesson IDs (relationships)
  if (quizData._lesson_ids !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(quizData._lesson_ids);
  } else if (quizData.lessonIds !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(quizData.lessonIds);
  } else if (quizData.meta?._lesson_ids !== undefined) {
    transformed.meta._lesson_ids = sanitizeIdArray(quizData.meta._lesson_ids);
  }

  // Total Points (computed, but can be set manually)
  if (quizData._total_points !== undefined) {
    transformed.meta._total_points = sanitizeInteger(quizData._total_points, 0, 0);
  } else if (quizData.totalPoints !== undefined) {
    transformed.meta._total_points = sanitizeInteger(quizData.totalPoints, 0, 0);
  } else if (quizData.meta?._total_points !== undefined) {
    transformed.meta._total_points = sanitizeInteger(quizData.meta._total_points, 0, 0);
  }

  // Quiz Instructions
  if (quizData._quiz_instructions !== undefined) {
    transformed.meta._quiz_instructions = sanitizeString(quizData._quiz_instructions);
  } else if (quizData.instructions !== undefined) {
    transformed.meta._quiz_instructions = sanitizeString(quizData.instructions);
  } else if (quizData.meta?._quiz_instructions !== undefined) {
    transformed.meta._quiz_instructions = sanitizeString(quizData.meta._quiz_instructions);
  }

  // Apply defaults for missing fields
  transformed.meta = {
    ...DEFAULT_QUIZ_META,
    ...transformed.meta
  };

  console.log('🔄 transformQuizDataForApi - Output:', transformed);
  console.log('📌 Category in transformed:', transformed.qe_category);
  return transformed;
};

// ============================================================
// SANITIZATION FOR DISPLAY
// ============================================================

/**
 * Sanitize quiz data from API for display in React components
 * Normalizes WordPress REST API response format
 * 
 * @param {Object} quizData - Raw quiz data from WordPress API
 * @returns {Object} Sanitized quiz data
 */
export const sanitizeQuizData = (quizData) => {
  if (!quizData) {
    console.warn('⚠️ sanitizeQuizData - No data provided');
    return null;
  }

  // Extract title, content, excerpt (handle both object and string)
  const title = sanitizeRenderedContent(quizData.title);
  const content = sanitizeRenderedContent(quizData.content);
  const excerpt = sanitizeRenderedContent(quizData.excerpt);

  const sanitized = {
    // Core WordPress fields
    id: quizData.id || 0,
    title,
    content,
    excerpt,
    status: sanitizePostStatus(quizData.status, 'draft'),
    date: quizData.date || '',
    modified: quizData.modified || '',
    slug: quizData.slug || '',
    author: quizData.author || 0,

    // Meta fields (with defaults)
    meta: {
      ...DEFAULT_QUIZ_META,
      ...quizData.meta,
      // Ensure boolean fields are actual booleans
      _randomize_questions: sanitizeBoolean(quizData.meta?._randomize_questions),
      _show_results: sanitizeBoolean(quizData.meta?._show_results, true),
      _enable_negative_scoring: sanitizeBoolean(quizData.meta?._enable_negative_scoring),
      // Ensure arrays
      _quiz_question_ids: sanitizeIdArray(quizData.meta?._quiz_question_ids),
      _lesson_ids: sanitizeIdArray(quizData.meta?._lesson_ids)
    },

    // Computed fields from WordPress
    questions_count: quizData.questions_count || 
                    (quizData.meta?._quiz_question_ids?.length || 0),
    total_attempts: quizData.total_attempts || 0,

    // Embedded data
    _embedded: quizData._embedded || {},

    // Links
    _links: quizData._links || {}
  };

  return sanitized;
};

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate quiz data before API request
 * 
 * @param {Object} quizData - Quiz data to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateQuizData = (quizData) => {
  const errors = [];

  // ============================================================
  // REQUIRED FIELDS
  // ============================================================
  
  const titleError = validateRequired(quizData.title, 'Quiz title');
  if (titleError) errors.push(titleError);

  // ============================================================
  // STATUS VALIDATION
  // ============================================================
  
  if (quizData.status && !VALID_QUIZ_STATUSES.includes(quizData.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_QUIZ_STATUSES.join(', ')}`);
  }

  // ============================================================
  // META FIELDS VALIDATION
  // ============================================================
  
  // Extract meta (handle both flat and nested structure)
  const meta = quizData.meta || quizData;

  // Quiz Type validation
  const quizType = meta._quiz_type || quizData.quizType;
  if (quizType && !VALID_QUIZ_TYPES.includes(quizType)) {
    errors.push(`Invalid quiz type. Must be one of: ${VALID_QUIZ_TYPES.join(', ')}`);
  }

  // Difficulty Level validation
  const difficulty = meta._difficulty_level || quizData.difficulty;
  if (difficulty && !VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
    errors.push(`Invalid difficulty level. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
  }

  // Passing Score validation (0-100)
  const passingScore = meta._passing_score || quizData.passingScore;
  if (passingScore !== undefined) {
    const scoreError = validateRange(passingScore, 0, 100, 'Passing score');
    if (scoreError) errors.push(scoreError);
  }

  // Time Limit validation (non-negative)
  const timeLimit = meta._time_limit || quizData.timeLimit;
  if (timeLimit !== undefined) {
    const timeLimitInt = parseInt(timeLimit);
    if (isNaN(timeLimitInt) || timeLimitInt < 0) {
      errors.push('Time limit must be a positive number or 0 (unlimited)');
    }
  }

  // Max Attempts validation (non-negative)
  const maxAttempts = meta._max_attempts || quizData.maxAttempts;
  if (maxAttempts !== undefined) {
    const attemptsInt = parseInt(maxAttempts);
    if (isNaN(attemptsInt) || attemptsInt < 0) {
      errors.push('Max attempts must be a positive number or 0 (unlimited)');
    }
  }

  // Question IDs validation
  const questionIds = meta._quiz_question_ids || quizData.questionIds;
  if (questionIds && !Array.isArray(questionIds)) {
    errors.push('Question IDs must be an array');
  }

  return createValidationResult(errors);
};

// ============================================================
// FORMATTING FOR DISPLAY
// ============================================================

/**
 * Format quiz data for display in lists/cards
 * @param {Object} quiz - Quiz data
 * @returns {Object} Formatted quiz
 */
export const formatQuizForDisplay = (quiz) => {
  const sanitized = sanitizeQuizData(quiz);

  if (!sanitized) {
    return null;
  }

  // Format time limit for display
  let formattedTimeLimit = 'No time limit';
  if (sanitized.meta._time_limit > 0) {
    const hours = Math.floor(sanitized.meta._time_limit / 60);
    const minutes = sanitized.meta._time_limit % 60;
    
    if (hours > 0 && minutes > 0) {
      formattedTimeLimit = `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      formattedTimeLimit = `${hours}h`;
    } else {
      formattedTimeLimit = `${minutes}m`;
    }
  }

  // Format max attempts for display
  const formattedMaxAttempts = sanitized.meta._max_attempts === 0
    ? 'Unlimited'
    : `${sanitized.meta._max_attempts} attempt${sanitized.meta._max_attempts > 1 ? 's' : ''}`;

  return {
    ...sanitized,
    // Formatted values for display
    formattedQuizType: capitalize(sanitized.meta._quiz_type),
    formattedDifficulty: capitalize(sanitized.meta._difficulty_level),
    formattedPassingScore: `${sanitized.meta._passing_score}%`,
    formattedTimeLimit,
    formattedMaxAttempts,
    formattedQuestionCount: `${sanitized.questions_count} question${sanitized.questions_count !== 1 ? 's' : ''}`,
    formattedTotalPoints: `${sanitized.meta._total_points} point${sanitized.meta._total_points !== 1 ? 's' : ''}`,
    formattedDate: formatDate(sanitized.date),
    formattedModified: formatDate(sanitized.modified),
    
    // Badges
    hasTimeLimit: sanitized.meta._time_limit > 0,
    hasAttemptLimit: sanitized.meta._max_attempts > 0,
    randomizedQuestions: sanitized.meta._randomize_questions,
    showsResults: sanitized.meta._show_results,
    hasNegativeScoring: sanitized.meta._enable_negative_scoring,
    
    // Status badges
    isPublished: sanitized.status === 'publish',
    isDraft: sanitized.status === 'draft',
    isPrivate: sanitized.status === 'private'
  };
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate quiz difficulty score (0-100)
 * Based on passing score, time limit, and question count
 * @param {Object} quiz - Quiz data
 * @returns {number} Difficulty score
 */
export const calculateQuizDifficulty = (quiz) => {
  const sanitized = sanitizeQuizData(quiz);
  if (!sanitized) return 50;

  let difficultyScore = 0;

  // Passing score impact (0-40 points)
  difficultyScore += (sanitized.meta._passing_score / 100) * 40;

  // Time limit impact (0-30 points)
  if (sanitized.meta._time_limit > 0) {
    const timePerQuestion = sanitized.meta._time_limit / (sanitized.questions_count || 1);
    if (timePerQuestion < 2) difficultyScore += 30;
    else if (timePerQuestion < 3) difficultyScore += 20;
    else if (timePerQuestion < 5) difficultyScore += 10;
  }

  // Question count impact (0-20 points)
  if (sanitized.questions_count > 50) difficultyScore += 20;
  else if (sanitized.questions_count > 30) difficultyScore += 15;
  else if (sanitized.questions_count > 20) difficultyScore += 10;
  else if (sanitized.questions_count > 10) difficultyScore += 5;

  // Negative scoring impact (0-10 points)
  if (sanitized.meta._enable_negative_scoring) difficultyScore += 10;

  return Math.min(Math.round(difficultyScore), 100);
};

/**
 * Check if quiz is timed
 * @param {Object} quiz - Quiz data
 * @returns {boolean} True if quiz has time limit
 */
export const isTimedQuiz = (quiz) => {
  const sanitized = sanitizeQuizData(quiz);
  return sanitized ? sanitized.meta._time_limit > 0 : false;
};

/**
 * Check if quiz has attempt limit
 * @param {Object} quiz - Quiz data
 * @returns {boolean} True if quiz has attempt limit
 */
export const hasAttemptLimit = (quiz) => {
  const sanitized = sanitizeQuizData(quiz);
  return sanitized ? sanitized.meta._max_attempts > 0 : false;
};

/**
 * Get quiz completion requirements as readable text
 * @param {Object} quiz - Quiz data
 * @returns {string} Completion requirements
 */
export const getQuizRequirements = (quiz) => {
  const sanitized = sanitizeQuizData(quiz);
  if (!sanitized) return '';

  const requirements = [];

  requirements.push(`Pass with ${sanitized.meta._passing_score}% or higher`);

  if (sanitized.meta._time_limit > 0) {
    requirements.push(`Complete within ${formatQuizForDisplay(quiz).formattedTimeLimit}`);
  }

  if (sanitized.meta._max_attempts > 0) {
    requirements.push(`Maximum ${sanitized.meta._max_attempts} attempt${sanitized.meta._max_attempts > 1 ? 's' : ''}`);
  }

  return requirements.join(' • ');
};