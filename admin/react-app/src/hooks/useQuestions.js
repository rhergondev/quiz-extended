/**
 * useQuestions - Question Management Hook (Refactored)
 * 
 * Uses useResource for base functionality
 * Extended with question-specific features
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 2.0.0
 */

import { useMemo } from 'react';
import { useResource } from './useResource';
import * as questionService from '../api/services/questionService';

/**
 * Question management hook
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.search - Search term
 * @param {number} options.quizId - Quiz ID filter
 * @param {string} options.type - Question type filter
 * @param {string} options.difficulty - Difficulty filter
 * @param {string} options.category - Category filter
 * @param {string} options.provider - Provider filter
 * @param {string} options.status - Status filter
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {number} options.perPage - Items per page (default: 20)
 * @returns {Object} Question state and methods
 */
export const useQuestions = (options = {}) => {
  const {
    search = '',
    quizId = null,
    type = null,
    difficulty = null,
    category = null,
    provider = null,
    status = null,
    autoFetch = true,
    perPage = 20
  } = options;

  // ============================================================
  // DATA PROCESSOR
  // ============================================================
  
  /**
   * Process/enhance question data with computed values
   */
  const dataProcessor = useMemo(() => (question) => {
    return {
      ...question,
      // Enhanced computed values
      quiz_id: question.meta?._quiz_id || null,
      question_type: question.meta?._question_type || 'multiple_choice',
      difficulty: question.meta?._difficulty_level || 'intermediate',
      category: question.meta?._question_category || '',
      points: parseInt(question.meta?._points || '1'),
      time_limit: parseInt(question.meta?._time_limit || '0'),
      options: question.meta?._question_options || [],
      correct_answer: question.meta?._correct_answer || '',
      explanation: question.meta?._explanation || '',
      question_order: parseInt(question.meta?._question_order || '0'),
      provider: question.meta?._provider || 'custom',
      // Computed flags
      has_options: Array.isArray(question.meta?._question_options) && 
                   question.meta._question_options.length > 0,
      has_explanation: Boolean(question.meta?._explanation),
      has_time_limit: parseInt(question.meta?._time_limit || '0') > 0,
      is_multiple_choice: question.meta?._question_type === 'multiple_choice',
      is_true_false: question.meta?._question_type === 'true_false',
      is_short_answer: question.meta?._question_type === 'short_answer',
      is_essay: question.meta?._question_type === 'essay',
      is_ai_generated: question.meta?._provider === 'ai',
      is_imported: question.meta?._provider === 'imported'
    };
  }, []);

  // ============================================================
  // COMPUTED VALUES CALCULATOR
  // ============================================================
  
  /**
   * Calculate question-specific computed values
   */
  const computedValuesCalculator = useMemo(() => (questions) => {
    const total = questions.length;
    
    if (total === 0) {
      return {
        total: 0,
        published: 0,
        draft: 0,
        private: 0,
        totalPoints: 0,
        averagePoints: 0,
        byType: {},
        byDifficulty: {},
        byProvider: {},
        withExplanation: 0,
        withTimeLimit: 0,
        multipleChoiceQuestions: 0,
        trueFalseQuestions: 0,
        shortAnswerQuestions: 0,
        essayQuestions: 0
      };
    }

    // Aggregate values
    let totalPoints = 0;
    const byType = {};
    const byDifficulty = {};
    const byProvider = {};
    let withExplanation = 0;
    let withTimeLimit = 0;
    let multipleChoiceQuestions = 0;
    let trueFalseQuestions = 0;
    let shortAnswerQuestions = 0;
    let essayQuestions = 0;

    questions.forEach(question => {
      // Points
      totalPoints += question.points || 0;
      
      // Type counts
      const type = question.question_type || 'multiple_choice';
      byType[type] = (byType[type] || 0) + 1;
      
      // Difficulty counts
      const diff = question.difficulty || 'intermediate';
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
      
      // Provider counts
      const prov = question.provider || 'custom';
      byProvider[prov] = (byProvider[prov] || 0) + 1;
      
      // Features
      if (question.has_explanation) withExplanation++;
      if (question.has_time_limit) withTimeLimit++;
      
      // Specific type counts
      if (question.is_multiple_choice) multipleChoiceQuestions++;
      if (question.is_true_false) trueFalseQuestions++;
      if (question.is_short_answer) shortAnswerQuestions++;
      if (question.is_essay) essayQuestions++;
    });

    return {
      total,
      published: questions.filter(q => q.status === 'publish').length,
      draft: questions.filter(q => q.status === 'draft').length,
      private: questions.filter(q => q.status === 'private').length,
      totalPoints,
      averagePoints: total > 0 ? Math.round((totalPoints / total) * 10) / 10 : 0,
      byType,
      byDifficulty,
      byProvider,
      withExplanation,
      withTimeLimit,
      multipleChoiceQuestions,
      trueFalseQuestions,
      shortAnswerQuestions,
      essayQuestions
    };
  }, []);

  // ============================================================
  // USE BASE RESOURCE HOOK
  // ============================================================
  
  const {
    items: questions,
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
    fetchItems: fetchQuestions,
    loadMore: loadMoreQuestions,
    createItem: createQuestion,
    updateItem: updateQuestion,
    deleteItem: deleteQuestion,
    duplicateItem: duplicateQuestion,
    refresh,
    hasMore
  } = useResource({
    service: questionService,
    resourceName: 'question',
    initialFilters: {
      search,
      quizId,
      type,
      difficulty,
      category,
      provider,
      status: status || 'publish,draft,private'
    },
    debounceMs: 500,
    autoFetch,
    perPage,
    dataProcessor,
    computedValuesCalculator
  });

  // ============================================================
  // QUESTION-SPECIFIC METHODS
  // ============================================================
  
  /**
   * Publish question (set status to 'publish')
   */
  const publishQuestion = async (questionId) => {
    return updateQuestion(questionId, { status: 'publish' });
  };

  /**
   * Unpublish question (set status to 'draft')
   */
  const unpublishQuestion = async (questionId) => {
    return updateQuestion(questionId, { status: 'draft' });
  };

  /**
   * Update question order
   */
  const updateQuestionOrder = async (questionId, newOrder) => {
    return updateQuestion(questionId, { questionOrder: newOrder });
  };

  /**
   * Update question type
   */
  const updateQuestionType = async (questionId, newType) => {
    return updateQuestion(questionId, { type: newType });
  };

  /**
   * Add option to question
   */
  const addOptionToQuestion = async (questionId, option) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) throw new Error('Question not found');
    
    const currentOptions = question.options || [];
    return updateQuestion(questionId, { 
      options: [...currentOptions, option] 
    });
  };

  /**
   * Remove option from question
   */
  const removeOptionFromQuestion = async (questionId, optionIndex) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) throw new Error('Question not found');
    
    const currentOptions = question.options || [];
    return updateQuestion(questionId, { 
      options: currentOptions.filter((_, index) => index !== optionIndex) 
    });
  };

  /**
   * Update correct answer
   */
  const updateCorrectAnswer = async (questionId, correctAnswer) => {
    return updateQuestion(questionId, { correctAnswer });
  };

  /**
   * Update explanation
   */
  const updateExplanation = async (questionId, explanation) => {
    return updateQuestion(questionId, { explanation });
  };

  /**
   * Bulk create questions
   */
  const bulkCreateQuestions = async (questionsData) => {
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
      
      // Refresh to update the list
      await refresh();
      
      return results;

    } catch (error) {
      console.error('❌ Error in bulk create questions:', error);
      throw error;
    }
  };

  // ============================================================
  // RETURN
  // ============================================================
  
  return {
    // Data
    questions,
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
    fetchQuestions,
    loadMoreQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    duplicateQuestion,
    refresh,

    // Question-specific actions
    publishQuestion,
    unpublishQuestion,
    updateQuestionOrder,
    updateQuestionType,
    addOptionToQuestion,
    removeOptionFromQuestion,
    updateCorrectAnswer,
    updateExplanation,
    bulkCreateQuestions,

    // Helpers
    hasMore
  };
};

export default useQuestions;