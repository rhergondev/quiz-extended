/**
 * Question Service - Refactored
 * * Uses baseService for common CRUD operations
 * Extended with question-specific functionality
 * NOW USES questionDataUtils.js
 * * @package QuizExtended
 * @subpackage API/Services
 * @version 2.0.0
 */

import { createResourceService } from './baseService.js';
import { 
  sanitizeQuestionData,           // ← IMPORTADO desde questionDataUtils
  validateQuestionData,           // ← IMPORTADO desde questionDataUtils
  transformQuestionDataForApi     // ← IMPORTADO desde questionDataUtils
} from '../utils/questionDataUtils.js';

// Create base question service with custom handlers
const baseQuestionService = createResourceService('question', 'questions', {
  sanitizer: sanitizeQuestionData,       // ← Usa questionDataUtils
  validator: validateQuestionData,       // ← Usa questionDataUtils
  transformer: transformQuestionDataForApi // ← Usa questionDataUtils
});

// ============================================================
// EXPORT COMPATIBLE WITH useResource
// ============================================================

/**
 * Get all questions with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getAll = async (options = {}) => {
  return baseQuestionService.getAll(options);
};

/**
 * Get single question by ID
 * @param {number} questionId - Question ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Question data
 */
export const getOne = async (questionId, options = {}) => {
  return baseQuestionService.getOne(questionId, options);
};

/**
 * Create new question
 * @param {Object} questionData - Question data
 * @returns {Promise<Object>} Created question
 */
export const create = async (questionData) => {
  return baseQuestionService.create(questionData);
};

/**
 * Update existing question
 * @param {number} questionId - Question ID
 * @param {Object} questionData - Updated question data
 * @returns {Promise<Object>} Updated question
 */
export const update = async (questionId, questionData) => {
  return baseQuestionService.update(questionId, questionData);
};

/**
 * Delete question
 * @param {number} questionId - Question ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteFn = async (questionId) => {
  return baseQuestionService.delete(questionId);
};
export { deleteFn as delete };


// ============================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================

export const getQuestions = getAll;
export const getQuestion = getOne;
export const createQuestion = create;
export const updateQuestion = update;
export const deleteQuestion = deleteFn;


// ============================================================
// QUESTION-SPECIFIC METHODS
// ============================================================

/**
 * Get questions for a specific quiz
 * @param {number} quizId - Quiz ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getQuestionsByQuiz = async (quizId, options = {}) => {
  if (!quizId || !Number.isInteger(quizId) || quizId <= 0) {
    throw new Error('Invalid quiz ID provided');
  }

  console.log('📝 Getting questions for quiz:', quizId);
  
  return getQuestions({
    ...options,
    quizId
  });
};

/**
 * Duplicate question
 * @param {number} questionId - Question ID to duplicate
 * @returns {Promise<Object>} Duplicated question
 */
export const duplicateQuestion = async (questionId) => {
  return baseQuestionService.duplicate(questionId);
};

/**
 * Get questions count with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<number>} Total count
 */
export const getQuestionsCount = async (options = {}) => {
  return baseQuestionService.getCount(options);
};

/**
 * Check if question exists
 * @param {number} questionId - Question ID
 * @returns {Promise<boolean>} Exists status
 */
export const questionExists = async (questionId) => {
  try {
    const question = await getQuestion(questionId);
    return !!question;
  } catch (error) {
    return false;
  }
};

/**
 * Update question status
 * @param {number} questionId - Question ID
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} Updated question
 */
export const updateQuestionStatus = async (questionId, newStatus) => {
  return update(questionId, { status: newStatus });
};

/**
 * Update question order
 * @param {number} questionId - Question ID
 * @param {number} newOrder - New order
 * @returns {Promise<Object>} Updated question
 */
export const updateQuestionOrder = async (questionId, newOrder) => {
  return update(questionId, {
    meta: {
      _question_order: newOrder
    }
  });
};

/**
 * Get questions by type
 * @param {string} type - Question type
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getQuestionsByType = async (type, options = {}) => {
  return getQuestions({
    ...options,
    questionType: type
  });
};

/**
 * Get questions by difficulty
 * @param {string} difficulty - Difficulty level
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getQuestionsByDifficulty = async (difficulty, options = {}) => {
  return getQuestions({
    ...options,
    difficulty
  });
};

/**
 * Get questions by category
 * @param {string} category - Category
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getQuestionsByCategory = async (category, options = {}) => {
  return getQuestions({
    ...options,
    category
  });
};

/**
 * Get questions by provider
 * @param {string} provider - Provider (custom, imported, ai_generated, template)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getQuestionsByProvider = async (provider, options = {}) => {
  return getQuestions({
    ...options,
    provider
  });
};

/**
 * Get published questions
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getPublishedQuestions = async (options = {}) => {
  return getQuestions({
    ...options,
    status: 'publish'
  });
};

/**
 * Get question statistics
 * @param {number} questionId - Question ID
 * @returns {Promise<Object>} Question statistics
 */
export const getQuestionStatistics = async (questionId) => {
  try {
    const question = await getQuestion(questionId);
    
    return {
      id: question.id,
      type: question.meta?._question_type || 'multiple_choice',
      difficulty: question.meta?._difficulty_level || 'medium',
      points: question.meta?._points || 1,
      optionsCount: question.meta?._question_options?.length || 0,
      correctAnswersCount: question.meta?._question_options?.filter(opt => opt.isCorrect)?.length || 0,
      isRequired: question.meta?._is_required || false,
      provider: question.meta?._provider || 'custom'
    };
    
  } catch (error) {
    console.error(`❌ Error getting question statistics:`, error);
    throw error;
  }
};

/**
 * Bulk create questions
 * @param {Array} questionsData - Array of question data objects
 * @returns {Promise<Array>} Array of created questions
 */
export const bulkCreateQuestions = async (questionsData) => {
  try {
    console.log(`📝 Bulk creating ${questionsData.length} questions...`);
    
    const createPromises = questionsData.map(questionData => 
      create(questionData)
    );
    
    const createdQuestions = await Promise.all(createPromises);
    
    console.log(`✅ Successfully created ${createdQuestions.length} questions`);
    return createdQuestions;
    
  } catch (error) {
    console.error('❌ Error in bulk question creation:', error);
    throw error;
  }
};