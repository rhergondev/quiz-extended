/**
 * Quiz Service - Quiz Management Service
 * Uses baseService for common CRUD operations
 * Extended with quiz-specific functionality
 *
 * @package QuizExtended
 * @subpackage API/Services
 * @version 2.0.0
 */

import { createResourceService } from './baseService.js';
import {
  sanitizeQuizData,
  validateQuizData,
  transformQuizDataForApi
} from '../utils/quizDataUtils.js';

/**
 * Custom query params builder for quizzes
 * Handles course filtering and quiz-specific filters
 * @param {Object} options - Filter options
 * @returns {URLSearchParams} Query parameters
 */
const buildQuizQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    search = '',
    courseId = null,
    quizType = null,
    difficulty = null,
    category = null,
    orderBy = 'date',
    order = 'desc',
    embed = true,
    include = null,
    status = null
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  // Include specific IDs (for fetching assigned quizzes)
  if (include) {
    params.append('include', include);
  }

  // Status filter
  if (status) {
    params.append('status', status);
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  // Filter by course
  if (courseId) {
    const numericCourseId = parseInt(courseId, 10);
    if (Number.isInteger(numericCourseId) && numericCourseId > 0) {
      params.append('course_id', numericCourseId.toString());
    }
  }

  // Filter by quiz type
  if (quizType) {
    params.append('meta_query[1][key]', '_quiz_type');
    params.append('meta_query[1][value]', quizType);
    params.append('meta_query[1][compare]', '=');
  }

  // Filter by difficulty
  if (difficulty) {
    params.append('meta_query[2][key]', '_difficulty_level');
    params.append('meta_query[2][value]', difficulty);
    params.append('meta_query[2][compare]', '=');
  }

  // Filter by category
  if (category) {
    params.append('qe_category', category.toString());
  }

  return params;
};

// Create base quiz service with custom handlers
const baseQuizService = createResourceService('quiz', 'quizzes', {
  sanitizer: sanitizeQuizData,
  validator: validateQuizData,
  transformer: transformQuizDataForApi,
  buildParams: buildQuizQueryParams
});

// ============================================================
// EXPORT COMPATIBLE WITH useResource
// ============================================================

/**
 * Get all quizzes with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Quizzes data with pagination
 */
export const getAll = (options = {}) => {
  return baseQuizService.getAll(options);
};

/**
 * Get a single quiz by ID
 * @param {number} quizId - Quiz ID
 * @returns {Promise<Object>} Quiz data
 */
export const getOne = (quizId) => {
  return baseQuizService.getOne(quizId);
};

/**
 * Create a new quiz
 * @param {Object} quizData - Quiz data
 * @returns {Promise<Object>} Created quiz
 */
export const create = (quizData) => {
  return baseQuizService.create(quizData);
};

/**
 * Update an existing quiz
 * @param {number} quizId - Quiz ID
 * @param {Object} quizData - Updated quiz data
 * @returns {Promise<Object>} Updated quiz
 */
export const update = (quizId, quizData) => {
  return baseQuizService.update(quizId, quizData);
};

/**
 * Delete a quiz
 * @param {number} quizId - Quiz ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteFn = (quizId) => {
  return baseQuizService.delete(quizId);
};
export { deleteFn as delete };

/**
 * Duplicate a quiz
 * @param {number} quizId - Quiz ID to duplicate
 * @returns {Promise<Object>} Duplicated quiz
 */
export const duplicate = (quizId) => {
  return baseQuizService.duplicate(quizId);
};

// ============================================================
// QUIZ-SPECIFIC METHODS (Keep these for direct use elsewhere)
// ============================================================

/**
 * Get quizzes by course ID
 * @param {number} courseId - Course ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Quizzes data
 */
export const getQuizzesByCourse = (courseId, options = {}) => {
  return getAll({ ...options, courseId });
};

/**
 * Get quiz statistics
 * @param {number} quizId - Quiz ID
 * @returns {Promise<Object>} Quiz statistics
 */
export const getQuizStatistics = async (quizId) => {
  try {
    const quiz = await getOne(quizId);

    return {
      totalQuestions: quiz.meta?._quiz_question_ids?.length || 0,
      totalPoints: quiz.meta?._total_points || 0,
      passingScore: quiz.meta?._passing_score || 70,
      timeLimit: quiz.meta?._time_limit || 0,
      maxAttempts: quiz.meta?._max_attempts || 0,
      totalAttempts: quiz.total_attempts || 0,
      averageScore: quiz.average_score || 0
    };
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    throw error;
  }
};

/**
 * Add question to quiz
 * @param {number} quizId - Quiz ID
 * @param {number} questionId - Question ID to add
 * @returns {Promise<Object>} Updated quiz
 */
export const addQuestionToQuiz = async (quizId, questionId) => {
  try {
    const quiz = await getOne(quizId);
    const currentQuestions = quiz.meta?._quiz_question_ids || [];

    if (currentQuestions.includes(questionId)) {
      console.warn('Question already exists in quiz');
      return quiz;
    }

    return update(quizId, {
      questionIds: [...currentQuestions, questionId]
    });
  } catch (error) {
    console.error('Error adding question to quiz:', error);
    throw error;
  }
};

/**
 * Remove question from quiz
 * @param {number} quizId - Quiz ID
 * @param {number} questionId - Question ID to remove
 * @returns {Promise<Object>} Updated quiz
 */
export const removeQuestionFromQuiz = async (quizId, questionId) => {
  try {
    const quiz = await getOne(quizId);
    const currentQuestions = quiz.meta?._quiz_question_ids || [];

    return update(quizId, {
      questionIds: currentQuestions.filter(id => id !== questionId)
    });
  } catch (error) {
    console.error('Error removing question from quiz:', error);
    throw error;
  }
};

/**
 * Update quiz question order
 * @param {number} quizId - Quiz ID
 * @param {number[]} questionIds - Ordered array of question IDs
 * @returns {Promise<Object>} Updated quiz
 */
export const updateQuizQuestionOrder = (quizId, questionIds) => {
  return update(quizId, { questionIds });
};


// Backward compatibility aliases
export const getQuizzes = getAll;
export const getQuiz = getOne;
export const createQuiz = create;
export const updateQuiz = update;
export const deleteQuiz = deleteFn;
export const duplicateQuiz = duplicate;