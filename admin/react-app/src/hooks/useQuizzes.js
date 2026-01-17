/**
 * useQuizzes - Quiz Management Hook (Refactored)
 *
 * Uses useResource for base functionality
 * Extended with quiz-specific features
 *
 * @package QuizExtended
 * @subpackage Hooks
 * @version 2.0.0
 */

import { useMemo } from 'react';
import { useResource } from './useResource';
import * as quizService from '../api/services/quizService';

/**
 * Quiz management hook
 *
 * @param {Object} options - Configuration options
 * @param {string} options.search - Search term
 * @param {number} options.courseId - Course ID filter
 * @param {string} options.quizType - Quiz type filter
 * @param {string} options.difficulty - Difficulty filter
 * @param {string} options.category - Category filter
 * @param {string} options.status - Status filter
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {number} options.perPage - Items per page (default: 20)
 * @returns {Object} Quiz state and methods
 */
export const useQuizzes = (options = {}) => {
  const {
    search = '',
    courseId = null,
    quizType = null,
    difficulty = null,
    category = null,
    status = null,
    autoFetch = true,
    perPage = 20
  } = options;

  // ============================================================
  // DATA PROCESSOR
  // ============================================================

  /**
   * Process/enhance quiz data with computed values
   */
  const dataProcessor = useMemo(() => (quiz) => {
    return {
      ...quiz,
      // Enhanced computed values
      course_id: quiz.meta?._course_id || null,
      quiz_type: quiz.meta?._quiz_type || 'standard',
      difficulty: quiz.meta?._difficulty_level || 'intermediate',
      category: quiz.meta?._quiz_category || '',
      passing_score: parseInt(quiz.meta?._passing_score || '70'),
      time_limit: parseInt(quiz._time_limit || quiz.meta?._time_limit || '0'), // REST field computado
      max_attempts: parseInt(quiz.meta?._max_attempts || '0'),
      randomize_questions: quiz.meta?._randomize_questions === 'yes',
      show_results: quiz.meta?._show_results === 'yes',
      enable_negative_scoring: quiz.meta?._enable_negative_scoring === 'yes',
      question_ids: quiz.meta?._quiz_question_ids || [],
      question_count: Array.isArray(quiz.meta?._quiz_question_ids)
        ? quiz.meta._quiz_question_ids.length
        : 0,
      total_points: parseInt(quiz.meta?._total_points || '0'),
      instructions: quiz.meta?._quiz_instructions || '',
      // Computed flags
      has_time_limit: parseInt(quiz._time_limit || quiz.meta?._time_limit || '0') > 0,
      has_attempt_limit: parseInt(quiz.meta?._max_attempts || '0') > 0,
      has_questions: Array.isArray(quiz.meta?._quiz_question_ids) && quiz.meta._quiz_question_ids.length > 0,
      is_randomized: quiz.meta?._randomize_questions === 'yes'
    };
  }, []);

  // ============================================================
  // COMPUTED VALUES CALCULATOR
  // ============================================================

  /**
   * Calculate quiz-specific computed values
   */
  const computedValuesCalculator = useMemo(() => (quizzes) => {
    const total = quizzes.length;

    if (total === 0) {
      return {
        total: 0,
        published: 0,
        draft: 0,
        private: 0,
        totalQuestions: 0,
        averageQuestions: 0,
        totalPoints: 0,
        averagePoints: 0,
        byType: {},
        byDifficulty: {},
        withTimeLimit: 0,
        withAttemptLimit: 0,
        randomized: 0
      };
    }

    // Aggregate values
    let totalQuestions = 0;
    let totalPoints = 0;
    const byType = {};
    const byDifficulty = {};
    let withTimeLimit = 0;
    let withAttemptLimit = 0;
    let randomized = 0;

    quizzes.forEach(quiz => {
      // Questions and points
      totalQuestions += quiz.question_count || 0;
      totalPoints += quiz.total_points || 0;

      // Type counts
      const type = quiz.quiz_type || 'standard';
      byType[type] = (byType[type] || 0) + 1;

      // Difficulty counts
      const diff = quiz.difficulty || 'intermediate';
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;

      // Features
      if (quiz.has_time_limit) withTimeLimit++;
      if (quiz.has_attempt_limit) withAttemptLimit++;
      if (quiz.is_randomized) randomized++;
    });

    return {
      total,
      published: quizzes.filter(q => q.status === 'publish').length,
      draft: quizzes.filter(q => q.status === 'draft').length,
      private: quizzes.filter(q => q.status === 'private').length,
      totalQuestions,
      averageQuestions: total > 0 ? Math.round(totalQuestions / total) : 0,
      totalPoints,
      averagePoints: total > 0 ? Math.round(totalPoints / total) : 0,
      byType,
      byDifficulty,
      withTimeLimit,
      withAttemptLimit,
      randomized
    };
  }, []);

  // ============================================================
  // USE BASE RESOURCE HOOK
  // ============================================================

  const {
    items: quizzes,
    loading,
    creating,
    updating,
    deleting,
    error,
    pagination,
    computed,
    filters,
    updateFilter,
    resetFilters,
    setFilters,
    fetchItems: fetchQuizzes,
    loadMore: loadMoreQuizzes,
    createItem: createQuiz,
    updateItem: updateQuiz,
    deleteItem: deleteQuiz,
    duplicateItem: duplicateQuiz,
    refresh,
    hasMore
  } = useResource({
    service: quizService,
    resourceName: 'quiz',
    initialFilters: {
      search,
      courseId,
      quizType,
      difficulty,
      category,
      status: status || 'publish,draft,private'
    },
    debounceMs: 500,
    autoFetch,
    perPage,
    dataProcessor,
    computedValuesCalculator
  });

  // ============================================================
  // QUIZ-SPECIFIC METHODS
  // ============================================================

  /**
   * Publish quiz (set status to 'publish')
   */
  const publishQuiz = async (quizId) => {
    return updateQuiz(quizId, { status: 'publish' });
  };

  /**
   * Unpublish quiz (set status to 'draft')
   */
  const unpublishQuiz = async (quizId) => {
    return updateQuiz(quizId, { status: 'draft' });
  };

  /**
   * Add question to quiz
   */
  const addQuestionToQuiz = async (quizId, questionId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) throw new Error('Quiz not found');

    const currentQuestions = quiz.question_ids || [];
    if (currentQuestions.includes(questionId)) {
      console.log('⚠️ Question already in quiz');
      return quiz;
    }

    return updateQuiz(quizId, {
      questionIds: [...currentQuestions, questionId]
    });
  };

  /**
   * Remove question from quiz
   */
  const removeQuestionFromQuiz = async (quizId, questionId) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) throw new Error('Quiz not found');

    const currentQuestions = quiz.question_ids || [];
    return updateQuiz(quizId, {
      questionIds: currentQuestions.filter(id => id !== questionId)
    });
  };

  /**
   * Update quiz settings
   */
  const updateQuizSettings = async (quizId, settings) => {
    const allowedSettings = [
      'passingScore',
      'timeLimit',
      'maxAttempts',
      'randomizeQuestions',
      'showResults',
      'enableNegativeScoring'
    ];

    const filteredSettings = {};
    Object.keys(settings).forEach(key => {
      if (allowedSettings.includes(key)) {
        filteredSettings[key] = settings[key];
      }
    });

    return updateQuiz(quizId, filteredSettings);
  };

  /**
   * Reorder questions in quiz
   */
  const reorderQuestions = async (quizId, newOrderedIds) => {
    return updateQuiz(quizId, { questionIds: newOrderedIds });
  };

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Data
    quizzes,
    loading,
    creating,
    updating,
    deleting,
    error,
    pagination,
    computed,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    setFilters,

    // Actions
    fetchQuizzes,
    loadMoreQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    duplicateQuiz,
    refresh,

    // Quiz-specific actions
    publishQuiz,
    unpublishQuiz,
    addQuestionToQuiz,
    removeQuestionFromQuiz,
    updateQuizSettings,
    reorderQuestions,

    // Helpers
    hasMore
  };
};

export default useQuizzes;