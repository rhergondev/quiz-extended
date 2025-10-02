/**
 * Quiz Service - Refactored
 * 
 * Uses baseService for common CRUD operations
 * Extended with quiz-specific functionality
 * NOW USES quizDataUtils.js
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 2.0.0
 */

import { createResourceService } from './baseService.js';
import { 
  sanitizeQuizData,           // ← IMPORTADO desde quizDataUtils
  validateQuizData,           // ← IMPORTADO desde quizDataUtils
  transformQuizDataForApi     // ← IMPORTADO desde quizDataUtils
} from '../utils/quizDataUtils.js';

/**
 * Custom query params builder for quizzes
 * Handles filtering by course, difficulty, category, and type
 * @param {Object} options - Filter options
 * @returns {URLSearchParams} Query parameters
 */
const buildQuizQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    status = 'publish,draft,private',
    search = '',
    courseId = null,
    quizType = null,
    difficulty = null,
    category = null,
    orderBy = 'date',
    order = 'desc',
    embed = true
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    status: status,
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  let metaQueryIndex = 0;

  // Course filtering with meta_query
  if (courseId) {
    const numericCourseId = parseInt(courseId, 10);
    if (Number.isInteger(numericCourseId) && numericCourseId > 0) {
      params.append(`meta_query[${metaQueryIndex}][key]`, '_course_id');
      params.append(`meta_query[${metaQueryIndex}][value]`, numericCourseId.toString());
      params.append(`meta_query[${metaQueryIndex}][compare]`, '=');
      params.append(`meta_query[${metaQueryIndex}][type]`, 'NUMERIC');
      metaQueryIndex++;
    }
  }

  // Quiz type filtering
  if (quizType) {
    params.append(`meta_query[${metaQueryIndex}][key]`, '_quiz_type');
    params.append(`meta_query[${metaQueryIndex}][value]`, quizType);
    params.append(`meta_query[${metaQueryIndex}][compare]`, '=');
    metaQueryIndex++;
  }

  // Difficulty filtering
  if (difficulty) {
    params.append(`meta_query[${metaQueryIndex}][key]`, '_difficulty_level');
    params.append(`meta_query[${metaQueryIndex}][value]`, difficulty);
    params.append(`meta_query[${metaQueryIndex}][compare]`, '=');
    metaQueryIndex++;
  }

  // Category filtering
  if (category) {
    params.append(`meta_query[${metaQueryIndex}][key]`, '_quiz_category');
    params.append(`meta_query[${metaQueryIndex}][value]`, category);
    params.append(`meta_query[${metaQueryIndex}][compare]`, '=');
    metaQueryIndex++;
  }

  return params;
};

// Create base quiz service with custom handlers
const baseQuizService = createResourceService('quiz', 'quizzes', {
  sanitizer: sanitizeQuizData,       // ← Usa quizDataUtils
  validator: validateQuizData,       // ← Usa quizDataUtils
  transformer: transformQuizDataForApi, // ← Usa quizDataUtils
  buildParams: buildQuizQueryParams
});

// ============================================================
// EXPORT COMPATIBLE WITH useResource
// ============================================================

/**
 * Get all quizzes with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Quizzes and pagination
 */
export const getAll = async (options = {}) => {
  return baseQuizService.getAll(options);
};

/**
 * Get single quiz by ID
 * @param {number} quizId - Quiz ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Quiz data
 */
export const getOne = async (quizId, options = {}) => {
  return baseQuizService.getOne(quizId, options);
};

/**
 * Create new quiz
 * @param {Object} quizData - Quiz data
 * @returns {Promise<Object>} Created quiz
 */
export const create = async (quizData) => {
  return baseQuizService.create(quizData);
};

/**
 * Update existing quiz
 * @param {number} quizId - Quiz ID
 * @param {Object} quizData - Updated quiz data
 * @returns {Promise<Object>} Updated quiz
 */
export const update = async (quizId, quizData) => {
  return baseQuizService.update(quizId, quizData);
};

/**
 * Delete quiz
 * @param {number} quizId - Quiz ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteQuiz = async (quizId) => {
  return baseQuizService.delete(quizId);
};

// ============================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================

export const getQuizzes = getAll;
export const getQuiz = getOne;
export const createQuiz = create;
export const updateQuiz = update;

// ============================================================
// QUIZ-SPECIFIC METHODS
// ============================================================

/**
 * Get quizzes for a specific course
 * @param {number} courseId - Course ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Quizzes and pagination
 */
export const getQuizzesByCourse = async (courseId, options = {}) => {
  if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
    throw new Error('Invalid course ID provided');
  }

  console.log('🎓 Getting quizzes for course:', courseId);
  
  return getQuizzes({
    ...options,
    courseId
  });
};

/**
 * Duplicate quiz
 * @param {number} quizId - Quiz ID to duplicate
 * @returns {Promise<Object>} Duplicated quiz
 */
export const duplicateQuiz = async (quizId) => {
  return baseQuizService.duplicate(quizId);
};

/**
 * Get quizzes count with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<number>} Total count
 */
export const getQuizzesCount = async (options = {}) => {
  return baseQuizService.getCount(options);
};

/**
 * Add question to quiz
 * @param {number} quizId - Quiz ID
 * @param {number} questionId - Question ID to add
 * @returns {Promise<Object>} Updated quiz
 */
export const addQuestionToQuiz = async (quizId, questionId) => {
  try {
    console.log(`➕ Adding question ${questionId} to quiz ${quizId}`);
    
    const quiz = await getQuiz(quizId);
    const currentQuestions = quiz.meta?._quiz_question_ids || [];
    
    // Avoid duplicates
    if (!currentQuestions.includes(questionId)) {
      const updatedQuestions = [...currentQuestions, questionId];
      
      return await updateQuiz(quizId, {
        meta: {
          _quiz_question_ids: updatedQuestions
        }
      });
    }
    
    console.log('⚠️ Question already in quiz');
    return quiz;
    
  } catch (error) {
    console.error(`❌ Error adding question to quiz:`, error);
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
    console.log(`➖ Removing question ${questionId} from quiz ${quizId}`);
    
    const quiz = await getQuiz(quizId);
    const currentQuestions = quiz.meta?._quiz_question_ids || [];
    const updatedQuestions = currentQuestions.filter(id => id !== questionId);
    
    return await updateQuiz(quizId, {
      meta: {
        _quiz_question_ids: updatedQuestions
      }
    });
    
  } catch (error) {
    console.error(`❌ Error removing question from quiz:`, error);
    throw error;
  }
};

/**
 * Update quiz status
 * @param {number} quizId - Quiz ID
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} Updated quiz
 */
export const updateQuizStatus = async (quizId, newStatus) => {
  return updateQuiz(quizId, { status: newStatus });
};

/**
 * Get quiz statistics
 * @param {number} quizId - Quiz ID
 * @returns {Promise<Object>} Quiz statistics
 */
export const getQuizStatistics = async (quizId) => {
  try {
    const quiz = await getQuiz(quizId);
    
    return {
      id: quiz.id,
      questionCount: quiz.meta?._quiz_question_ids?.length || 0,
      totalPoints: quiz.meta?._total_points || 0,
      passingScore: quiz.meta?._passing_score || 70,
      timeLimit: quiz.meta?._time_limit || 0,
      maxAttempts: quiz.meta?._max_attempts || 0,
      difficulty: quiz.meta?._difficulty_level || 'intermediate',
      type: quiz.meta?._quiz_type || 'standard'
    };
    
  } catch (error) {
    console.error(`❌ Error getting quiz statistics:`, error);
    throw error;
  }
};