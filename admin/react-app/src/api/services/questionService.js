/**
 * Question Service
 * 
 * Uses baseService for common CRUD operations
 * Extended with question-specific functionality
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { createResourceService } from './baseService.js';

/**
 * Sanitize question data
 * @param {Object} question - Raw question data
 * @returns {Object} Sanitized question data
 */
const sanitizeQuestionData = (question) => {
  if (!question) return null;

  return {
    id: question.id,
    title: question.title?.rendered || question.title || '',
    content: question.content?.rendered || question.content || '',
    excerpt: question.excerpt?.rendered || question.excerpt || '',
    status: question.status || 'draft',
    date: question.date,
    modified: question.modified,
    author: question.author,
    meta: {
      _quiz_id: question.meta?._quiz_id,
      _question_type: question.meta?._question_type || 'multiple_choice',
      _difficulty_level: question.meta?._difficulty_level || 'intermediate',
      _question_category: question.meta?._question_category,
      _points: question.meta?._points || 1,
      _time_limit: question.meta?._time_limit || 0,
      _question_options: question.meta?._question_options || [],
      _correct_answer: question.meta?._correct_answer,
      _explanation: question.meta?._explanation || '',
      _question_order: question.meta?._question_order || 0,
      _provider: question.meta?._provider || 'custom'
    },
    // Computed values
    question_type: question.meta?._question_type || 'multiple_choice',
    difficulty: question.meta?._difficulty_level || 'intermediate',
    category: question.meta?._question_category || '',
    points: parseInt(question.meta?._points || '1'),
    options: question.meta?._question_options || [],
    correct_answer: question.meta?._correct_answer,
    explanation: question.meta?._explanation || ''
  };
};

/**
 * Validate question data
 * @param {Object} questionData - Question data to validate
 * @returns {Object} Validation result
 */
const validateQuestionData = (questionData) => {
  const errors = [];

  if (!questionData.title || questionData.title.trim() === '') {
    errors.push('Title is required');
  }

  if (!questionData.type) {
    errors.push('Question type is required');
  }

  const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'];
  if (questionData.type && !validTypes.includes(questionData.type)) {
    errors.push(`Invalid question type. Must be one of: ${validTypes.join(', ')}`);
  }

  if (questionData.points !== undefined) {
    const points = parseInt(questionData.points);
    if (isNaN(points) || points < 0) {
      errors.push('Points must be a positive number');
    }
  }

  // Validate options for multiple choice questions
  if (questionData.type === 'multiple_choice') {
    if (!Array.isArray(questionData.options) || questionData.options.length < 2) {
      errors.push('Multiple choice questions must have at least 2 options');
    }
    if (!questionData.correctAnswer) {
      errors.push('Correct answer is required for multiple choice questions');
    }
  }

  // Validate true/false questions
  if (questionData.type === 'true_false') {
    if (questionData.correctAnswer !== 'true' && questionData.correctAnswer !== 'false') {
      errors.push('True/false questions must have "true" or "false" as correct answer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Transform question data for API
 * @param {Object} questionData - Question data
 * @returns {Object} Transformed data
 */
const transformQuestionDataForApi = (questionData) => {
  return {
    title: questionData.title,
    content: questionData.content || '',
    excerpt: questionData.excerpt || '',
    status: questionData.status || 'draft',
    meta: {
      _quiz_id: questionData.quizId || '',
      _question_type: questionData.type || 'multiple_choice',
      _difficulty_level: questionData.difficulty || 'intermediate',
      _question_category: questionData.category || '',
      _points: questionData.points || 1,
      _time_limit: questionData.timeLimit || 0,
      _question_options: questionData.options || [],
      _correct_answer: questionData.correctAnswer || '',
      _explanation: questionData.explanation || '',
      _question_order: questionData.questionOrder || 0,
      _provider: questionData.provider || 'custom'
    }
  };
};

/**
 * Custom query params builder for questions
 * @param {Object} options - Filter options
 * @returns {URLSearchParams} Query parameters
 */
const buildQuestionQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    status = 'publish,draft,private',
    search = '',
    quizId = null,
    type = null,
    difficulty = null,
    category = null,
    provider = null,
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

  // Quiz filtering
  if (quizId) {
    const numericQuizId = parseInt(quizId, 10);
    if (Number.isInteger(numericQuizId) && numericQuizId > 0) {
      params.append(`meta_query[${metaQueryIndex}][key]`, '_quiz_id');
      params.append(`meta_query[${metaQueryIndex}][value]`, numericQuizId.toString());
      params.append(`meta_query[${metaQueryIndex}][compare]`, '=');
      params.append(`meta_query[${metaQueryIndex}][type]`, 'NUMERIC');
      metaQueryIndex++;
    }
  }

  // Question type filtering
  if (type) {
    params.append(`meta_query[${metaQueryIndex}][key]`, '_question_type');
    params.append(`meta_query[${metaQueryIndex}][value]`, type);
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
    params.append(`meta_query[${metaQueryIndex}][key]`, '_question_category');
    params.append(`meta_query[${metaQueryIndex}][value]`, category);
    params.append(`meta_query[${metaQueryIndex}][compare]`, '=');
    metaQueryIndex++;
  }

  // Provider filtering
  if (provider) {
    params.append(`meta_query[${metaQueryIndex}][key]`, '_provider');
    params.append(`meta_query[${metaQueryIndex}][value]`, provider);
    params.append(`meta_query[${metaQueryIndex}][compare]`, '=');
    metaQueryIndex++;
  }

  return params;
};

// Create base question service with custom handlers
const baseQuestionService = createResourceService('question', 'questions', {
  sanitizer: sanitizeQuestionData,
  validator: validateQuestionData,
  transformer: transformQuestionDataForApi,
  buildParams: buildQuestionQueryParams
});

/**
 * Get all questions with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Questions and pagination
 */
export const getQuestions = async (options = {}) => {
  return baseQuestionService.getAll(options);
};

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
 * Get single question by ID
 * @param {number} questionId - Question ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Question data
 */
export const getQuestion = async (questionId, options = {}) => {
  return baseQuestionService.getOne(questionId, options);
};

/**
 * Create new question
 * @param {Object} questionData - Question data
 * @returns {Promise<Object>} Created question
 */
export const createQuestion = async (questionData) => {
  return baseQuestionService.create(questionData);
};

/**
 * Update existing question
 * @param {number} questionId - Question ID
 * @param {Object} questionData - Question data
 * @returns {Promise<Object>} Updated question
 */
export const updateQuestion = async (questionId, questionData) => {
  return baseQuestionService.update(questionId, questionData);
};

/**
 * Delete question
 * @param {number} questionId - Question ID
 * @param {Object} options - Delete options
 * @returns {Promise<boolean>} Success status
 */
export const deleteQuestion = async (questionId, options = {}) => {
  return baseQuestionService.delete(questionId, options);
};

/**
 * Duplicate existing question
 * @param {number} questionId - Question ID to duplicate
 * @returns {Promise<Object>} Duplicated question
 */
export const duplicateQuestion = async (questionId) => {
  try {
    const originalQuestion = await getQuestion(questionId);
    
    if (!originalQuestion) {
      throw new Error('Question not found');
    }

    const duplicateData = {
      title: `${originalQuestion.title || 'Untitled'} (Copy)`,
      content: originalQuestion.content || '',
      excerpt: originalQuestion.excerpt || '',
      status: 'draft',
      quizId: originalQuestion.meta?._quiz_id,
      type: originalQuestion.meta?._question_type || 'multiple_choice',
      difficulty: originalQuestion.meta?._difficulty_level || 'intermediate',
      category: originalQuestion.meta?._question_category || '',
      points: originalQuestion.meta?._points || 1,
      timeLimit: originalQuestion.meta?._time_limit || 0,
      options: originalQuestion.meta?._question_options || [],
      correctAnswer: originalQuestion.meta?._correct_answer || '',
      explanation: originalQuestion.meta?._explanation || '',
      questionOrder: (parseInt(originalQuestion.meta?._question_order || '0') + 1),
      provider: originalQuestion.meta?._provider || 'custom'
    };

    console.log('📋 Duplicating question:', questionId);
    const duplicated = await createQuestion(duplicateData);
    console.log('✅ Question duplicated:', duplicated.id);
    
    return duplicated;

  } catch (error) {
    console.error(`❌ Error duplicating question ${questionId}:`, error);
    throw error;
  }
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
  if (!['publish', 'draft', 'private'].includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  return updateQuestion(questionId, { status: newStatus });
};

/**
 * Update question order
 * @param {number} questionId - Question ID
 * @param {number} newOrder - New order
 * @returns {Promise<Object>} Updated question
 */
export const updateQuestionOrder = async (questionId, newOrder) => {
  return updateQuestion(questionId, { questionOrder: newOrder });
};

/**
 * Get questions by type
 * @param {string} questionType - Question type
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered questions
 */
export const getQuestionsByType = async (questionType, options = {}) => {
  return getQuestions({
    ...options,
    type: questionType
  });
};

/**
 * Get questions by difficulty
 * @param {string} difficulty - Difficulty level
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered questions
 */
export const getQuestionsByDifficulty = async (difficulty, options = {}) => {
  return getQuestions({
    ...options,
    difficulty
  });
};

/**
 * Get questions by category
 * @param {string} category - Category name
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered questions
 */
export const getQuestionsByCategory = async (category, options = {}) => {
  return getQuestions({
    ...options,
    category
  });
};

/**
 * Get questions by provider
 * @param {string} provider - Provider name (custom, ai, imported)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Filtered questions
 */
export const getQuestionsByProvider = async (provider, options = {}) => {
  return getQuestions({
    ...options,
    provider
  });
};

/**
 * Get published questions only
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Published questions
 */
export const getPublishedQuestions = async (options = {}) => {
  return getQuestions({
    ...options,
    status: 'publish'
  });
};

/**
 * Get question statistics
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Statistics
 */
export const getQuestionStatistics = async (options = {}) => {
  try {
    const result = await getQuestions({ ...options, perPage: 100 });
    
    const stats = {
      total: result.pagination.total,
      published: 0,
      draft: 0,
      byType: {},
      byDifficulty: {},
      byProvider: {},
      totalPoints: 0,
      averagePoints: 0
    };

    result.data.forEach(question => {
      // Count by status
      if (question.status === 'publish') stats.published++;
      if (question.status === 'draft') stats.draft++;

      // Count by type
      const type = question.meta?._question_type || 'multiple_choice';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by difficulty
      const difficulty = question.meta?._difficulty_level || 'intermediate';
      stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;

      // Count by provider
      const provider = question.meta?._provider || 'custom';
      stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

      // Calculate points
      const points = parseInt(question.meta?._points || '1');
      stats.totalPoints += points;
    });

    stats.averagePoints = result.data.length > 0 
      ? Math.round((stats.totalPoints / result.data.length) * 10) / 10
      : 0;

    console.log('📊 Question statistics:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error getting question statistics:', error);
    throw error;
  }
};

/**
 * Bulk create questions
 * @param {Array<Object>} questionsData - Array of question data
 * @returns {Promise<Object>} Results with success/failure counts
 */
export const bulkCreateQuestions = async (questionsData) => {
  try {
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error('Invalid questions data array');
    }

    console.log(`📝 Bulk creating ${questionsData.length} questions...`);
    
    const results = {
      successful: [],
      failed: []
    };

    for (const questionData of questionsData) {
      try {
        const created = await createQuestion(questionData);
        results.successful.push(created);
      } catch (error) {
        results.failed.push({
          data: questionData,
          error: error.message
        });
      }
    }

    console.log(`✅ Bulk create completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;

  } catch (error) {
    console.error('❌ Error in bulk create questions:', error);
    throw error;
  }
};