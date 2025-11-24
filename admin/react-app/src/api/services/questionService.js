/**
 * Question Service - Refactored
 * * Uses baseService for common CRUD operations
 * Extended with question-specific functionality
 * NOW USES questionDataUtils.js
 * * @package QuizExtended
 * @subpackage API/Services
 * @version 2.0.0
 */

import { createResourceService, buildQueryParams } from './baseService.js';
import { 
  sanitizeQuestionData,           // ← IMPORTADO desde questionDataUtils
  validateQuestionData,           // ← IMPORTADO desde questionDataUtils
  transformQuestionDataForApi     // ← IMPORTADO desde questionDataUtils
} from '../utils/questionDataUtils.js';

// 🔥 AÑADIDO: Constructor de parámetros personalizado para preguntas
const buildQuestionQueryParams = (options = {}) => {
  // 🐛 FIX: Extraemos 'difficulty' para evitar que baseService añada 'qe_difficulty' automáticamente.
  // Esto previene el error 400 de validación de taxonomía y nos permite controlar el parámetro manualmente.
  const { difficulty, ...baseOptions } = options;
  
  const params = buildQueryParams(baseOptions); // Llama al constructor base sin difficulty

  // Añade el filtro específico de quiz si existe
  if (options.quizId) {
    params.append('quiz_id', options.quizId.toString());
  }

  // Añade filtros de taxonomía si existen y no son 'all'
  if (options.category && options.category !== 'all') {
    // Si es un array, únelo por comas (o usa el formato que prefiera tu backend)
    const categoryValue = Array.isArray(options.category) 
      ? options.category.join(',') 
      : options.category;
    params.append('qe_category', categoryValue);
  }

  if (options.provider && options.provider !== 'all') {
    params.append('qe_provider', options.provider);
  }

  // Añade otros filtros personalizados
  if (options.type && options.type !== 'all') {
    params.append('type', options.type);
  }

  // 🔥 AÑADIDO: Añadimos 'difficulty' explícitamente como parámetro de texto
  if (difficulty && difficulty !== 'all') {
    params.append('difficulty', difficulty);
  }

  // Filtros de estado (favoritas, fallidas, etc.)
  if (options.status_filters && Array.isArray(options.status_filters) && options.status_filters.length > 0) {
    params.append('status_filters', options.status_filters.join(','));
  }

  return params;
};

// Create base question service with custom handlers
const baseQuestionService = createResourceService('question', 'questions', {
  sanitizer: sanitizeQuestionData,       // ← Usa questionDataUtils
  validator: validateQuestionData,       // ← Usa questionDataUtils
  transformer: transformQuestionDataForApi, // ← Usa questionDataUtils
  buildParams: buildQuestionQueryParams // 🔥 AÑADIDO: Pasa el constructor personalizado
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
  const result = await baseQuestionService.getAll(options);
  
  // 🔍 DEBUG: Log is_favorite status for each question
  if (result.data && Array.isArray(result.data)) {
    console.log('🔍 Questions received from API:', result.data.map(q => ({
      id: q.id,
      title: q.title?.rendered || q.title,
      is_favorite: q.is_favorite
    })));
  }
  
  return result;
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

/**
 * Get multiple questions by their IDs
 * 🔥 OPTIMIZED: Uses WordPress 'include' parameter for efficient batch loading
 * Fetches questions in batches using a single API call per batch
 * @param {Array<number>} questionIds - Array of question IDs
 * @param {Object} options - Additional options
 * @param {number} options.batchSize - Number of questions to fetch per batch (default: 100)
 * @returns {Promise<Array>} Array of questions (maintains order of input IDs)
 */
export const getQuestionsByIds = async (questionIds, options = {}) => {
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return [];
  }

  const batchSize = options.batchSize || 100; // 🔥 Increased default batch size
  const validIds = questionIds.filter(id => Number.isInteger(id) && id > 0);
  
  if (validIds.length === 0) {
    return [];
  }

  console.log(`📝 Fetching ${validIds.length} questions by IDs (batch size: ${batchSize})...`);

  try {
    const config = window.qe_data || {};
    if (!config.endpoints || !config.endpoints.questions) {
      throw new Error('Questions endpoint not configured');
    }

    const endpoint = config.endpoints.questions;
    const allQuestions = [];

    // 🔥 OPTIMIZATION: Divide IDs into batches and use 'include' parameter
    for (let i = 0; i < validIds.length; i += batchSize) {
      const batchIds = validIds.slice(i, i + batchSize);
      
      // Only use context=edit for administrators, view for everyone else
      const isAdmin = window.qe_data?.user?.roles?.includes('administrator') || false;
      
      // Build URL with include parameter - WordPress REST API supports this
      const params = new URLSearchParams({
        include: batchIds.join(','),
        per_page: batchSize.toString(),
        context: isAdmin ? 'edit' : 'view', // edit only for admins
        orderby: 'include', // Maintain order of IDs
      });

      const url = `${endpoint}?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': config.nonce,
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      const batchQuestions = await response.json();
      allQuestions.push(...batchQuestions);
      
      console.log(`✅ Loaded batch ${Math.floor(i / batchSize) + 1}: ${batchQuestions.length} questions`);
    }

    // Sanitize all questions
    const sanitizedQuestions = allQuestions.map(sanitizeQuestionData);

    // Create map for quick access and maintain original order
    const questionsMap = new Map(sanitizedQuestions.map(q => [q.id, q]));
    const orderedQuestions = validIds
      .map(id => questionsMap.get(id))
      .filter(Boolean);

    console.log(`✅ Successfully fetched ${orderedQuestions.length}/${validIds.length} questions`);
    
    if (orderedQuestions.length < validIds.length) {
      const missingIds = validIds.filter(id => !questionsMap.has(id));
      console.warn(`⚠️ Could not fetch ${missingIds.length} questions:`, missingIds);
    }

    return orderedQuestions;

  } catch (error) {
    console.error('❌ Error fetching questions by IDs:', error);
    throw error;
  }
};