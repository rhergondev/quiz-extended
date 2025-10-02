/**
 * Quiz Service
 * 
 * Uses baseService for common CRUD operations
 * Extended with quiz-specific functionality
 * 
 * @package QuizExtended
 * @subpackage API/Services
 * @version 1.0.0
 */

import { createResourceService } from './baseService.js';

/**
 * Sanitize quiz data
 * @param {Object} quiz - Raw quiz data
 * @returns {Object} Sanitized quiz data
 */
const sanitizeQuizData = (quiz) => {
  if (!quiz) return null;

  return {
    id: quiz.id,
    title: quiz.title?.rendered || quiz.title || '',
    content: quiz.content?.rendered || quiz.content || '',
    excerpt: quiz.excerpt?.rendered || quiz.excerpt || '',
    status: quiz.status || 'draft',
    date: quiz.date,
    modified: quiz.modified,
    author: quiz.author,
    meta: {
      _course_id: quiz.meta?._course_id,
      _quiz_type: quiz.meta?._quiz_type || 'standard',
      _difficulty_level: quiz.meta?._difficulty_level || 'intermediate',
      _quiz_category: quiz.meta?._quiz_category,
      _passing_score: quiz.meta?._passing_score || 70,
      _time_limit: quiz.meta?._time_limit || 0,
      _max_attempts: quiz.meta?._max_attempts || 0,
      _randomize_questions: quiz.meta?._randomize_questions === 'yes',
      _show_results: quiz.meta?._show_results === 'yes',
      _enable_negative_scoring: quiz.meta?._enable_negative_scoring === 'yes',
      _question_ids: quiz.meta?._question_ids || [],
      _total_points: quiz.meta?._total_points || 0,
      _quiz_instructions: quiz.meta?._quiz_instructions || ''
    },
    // Computed values
    question_count: Array.isArray(quiz.meta?._question_ids) 
      ? quiz.meta._question_ids.length 
      : 0,
    total_points: quiz.meta?._total_points || 0
  };
};

/**
 * Validate quiz data
 * @param {Object} quizData - Quiz data to validate
 * @returns {Object} Validation result
 */
const validateQuizData = (quizData) => {
  const errors = [];

  if (!quizData.title || quizData.title.trim() === '') {
    errors.push('Title is required');
  }

  if (quizData.passingScore !== undefined) {
    const score = parseInt(quizData.passingScore);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push('Passing score must be between 0 and 100');
    }
  }

  if (quizData.timeLimit !== undefined) {
    const time = parseInt(quizData.timeLimit);
    if (isNaN(time) || time < 0) {
      errors.push('Time limit must be a positive number');
    }
  }

  if (quizData.maxAttempts !== undefined) {
    const attempts = parseInt(quizData.maxAttempts);
    if (isNaN(attempts) || attempts < 0) {
      errors.push('Max attempts must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Transform quiz data for API
 * @param {Object} quizData - Quiz data
 * @returns {Object} Transformed data
 */
const transformQuizDataForApi = (quizData) => {
  return {
    title: quizData.title,
    content: quizData.instructions || quizData.content || '',
    status: quizData.status || 'draft',
    meta: {
      _course_id: quizData.courseId || '',
      _quiz_type: quizData.quizType || 'standard',
      _difficulty_level: quizData.difficulty || 'intermediate',
      _quiz_category: quizData.category || '',
      _passing_score: quizData.passingScore || 70,
      _time_limit: quizData.timeLimit || 0,
      _max_attempts: quizData.maxAttempts || 0,
      _randomize_questions: quizData.randomizeQuestions ? 'yes' : 'no',
      _show_results: quizData.showResults ? 'yes' : 'no',
      _enable_negative_scoring: quizData.enableNegativeScoring ? 'yes' : 'no',
      _question_ids: quizData.questionIds || [],
      _quiz_instructions: quizData.instructions || ''
    }
  };
};

/**
 * Custom query params builder for quizzes
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

  // Course filtering
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
  sanitizer: sanitizeQuizData,
  validator: validateQuizData,
  transformer: transformQuizDataForApi,
  buildParams: buildQuizQueryParams
});

/**
 * Get all quizzes with optional filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Quizzes and pagination
 */
export const getQuizzes = async (options = {}) => {
  return baseQuizService.getAll(options);
};

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
 * Get single quiz by ID
 * @param {number} quizId - Quiz ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Quiz data
 */
export const getQuiz = async (quizId, options = {}) => {
  return baseQuizService.getOne(quizId, options);
};

/**
 * Create new quiz
 * @param {Object} quizData - Quiz data
 * @returns {Promise<Object>} Created quiz
 */
export const createQuiz = async (quizData) => {
  return baseQuizService.create(quizData);
};

/**
 * Update existing quiz
 * @param {number} quizId - Quiz ID
 * @param {Object} quizData - Quiz data
 * @returns {Promise<Object>} Updated quiz
 */
export const updateQuiz = async (quizId, quizData) => {
  return baseQuizService.update(quizId, quizData);
};

/**
 * Delete quiz
 * @param {number} quizId - Quiz ID
 * @param {Object} options - Delete options
 * @returns {Promise<boolean>} Success status
 */
export const deleteQuiz = async (quizId, options = {}) => {
  return baseQuizService.delete(quizId, options);
};

/**
 * Duplicate existing quiz
 * @param {number} quizId - Quiz ID to duplicate
 * @returns {Promise<Object>} Duplicated quiz
 */
export const duplicateQuiz = async (quizId) => {
  try {
    const originalQuiz = await getQuiz(quizId);
    
    if (!originalQuiz) {
      throw new Error('Quiz not found');
    }

    const duplicateData = {
      title: `${originalQuiz.title || 'Untitled'} (Copy)`,
      instructions: originalQuiz.meta?._quiz_instructions || '',
      status: 'draft',
      courseId: originalQuiz.meta?._course_id,
      quizType: originalQuiz.meta?._quiz_type || 'standard',
      difficulty: originalQuiz.meta?._difficulty_level || 'intermediate',
      category: originalQuiz.meta?._quiz_category || '',
      passingScore: originalQuiz.meta?._passing_score || 70,
      timeLimit: originalQuiz.meta?._time_limit || 0,
      maxAttempts: originalQuiz.meta?._max_attempts || 0,
      randomizeQuestions: originalQuiz.meta?._randomize_questions,
      showResults: originalQuiz.meta?._show_results,
      enableNegativeScoring: originalQuiz.meta?._enable_negative_scoring,
      questionIds: originalQuiz.meta?._question_ids || []
    };

    console.log('📋 Duplicating quiz:', quizId);
    const duplicated = await createQuiz(duplicateData);
    console.log('✅ Quiz duplicated:', duplicated.id);
    
    return duplicated;

  } catch (error) {
    console.error(`❌ Error duplicating quiz ${quizId}:`, error);
    throw error;
  }
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
    const quiz = await getQuiz(quizId);
    const currentQuestions = quiz.meta?._question_ids || [];
    
    if (currentQuestions.includes(questionId)) {
      console.log('⚠️ Question already in quiz');
      return quiz;
    }

    return updateQuiz(quizId, {
      questionIds: [...currentQuestions, questionId]
    });

  } catch (error) {
    console.error('❌ Error adding question to quiz:', error);
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
    const quiz = await getQuiz(quizId);
    const currentQuestions = quiz.meta?._question_ids || [];
    
    return updateQuiz(quizId, {
      questionIds: currentQuestions.filter(id => id !== questionId)
    });

  } catch (error) {
    console.error('❌ Error removing question from quiz:', error);
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
  if (!['publish', 'draft', 'private'].includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  return updateQuiz(quizId, { status: newStatus });
};

/**
 * Get quiz statistics
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Statistics
 */
export const getQuizStatistics = async (options = {}) => {
  try {
    const result = await getQuizzes({ ...options, perPage: 100 });
    
    const stats = {
      total: result.pagination.total,
      published: 0,
      draft: 0,
      byType: {},
      byDifficulty: {},
      totalQuestions: 0,
      averageQuestions: 0
    };

    result.data.forEach(quiz => {
      // Count by status
      if (quiz.status === 'publish') stats.published++;
      if (quiz.status === 'draft') stats.draft++;

      // Count by type
      const type = quiz.meta?._quiz_type || 'standard';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by difficulty
      const difficulty = quiz.meta?._difficulty_level || 'intermediate';
      stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;

      // Count questions
      stats.totalQuestions += quiz.question_count || 0;
    });

    stats.averageQuestions = result.data.length > 0 
      ? Math.round(stats.totalQuestions / result.data.length) 
      : 0;

    console.log('📊 Quiz statistics:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error getting quiz statistics:', error);
    throw error;
  }
};