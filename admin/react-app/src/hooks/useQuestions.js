/**
 * useQuestions - Question Management Hook (Refactored)
 * * Uses useResource for base functionality, following the same pattern as useCourses and useLessons.
 * * @package QuizExtended
 * @subpackage Hooks
 * @version 3.1.0
 */

import { useMemo } from 'react';
import { useResource } from './useResource';
import * as questionService from '../api/services/questionService';
import { formatQuestionForDisplay } from '../api/utils/questionDataUtils'; // Asegúrate que la importación sea correcta

/**
 * Question management hook
 * * @param {Object} options - Configuration options passed to useResource
 * @returns {Object} Question state and methods
 */
export const useQuestions = (options = {}) => {

  // Procesador de datos para enriquecer cada pregunta con datos formateados para la UI
  const dataProcessor = useMemo(() => (question) => {
    // Utiliza la función de formateo de las nuevas utilidades de datos
    return formatQuestionForDisplay(question);
  }, []);

  // Calculadora para obtener estadísticas agregadas de la lista de preguntas
  const computedValuesCalculator = useMemo(() => (questions) => {
    const total = questions.length;
    if (total === 0) {
      return {
        total: 0,
        totalPoints: 0,
        trueFalseQuestions: 0,
        essayQuestions: 0,
        byDifficulty: {}
      };
    }

    let totalPoints = 0;
    let trueFalseQuestions = 0;
    let essayQuestions = 0;
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };

    questions.forEach(q => {
      totalPoints += q.meta?._points || 0;
      const type = q.meta?._question_type;
      const difficulty = q.meta?._difficulty_level || 'medium';
      
      if (type === 'true_false') trueFalseQuestions++;
      if (type === 'essay') essayQuestions++;
      if (byDifficulty.hasOwnProperty(difficulty)) {
        byDifficulty[difficulty]++;
      }
    });

    return {
      total,
      totalPoints,
      trueFalseQuestions,
      essayQuestions,
      byDifficulty
    };
  }, []);

  // Usar el hook genérico 'useResource' con la configuración específica para "questions"
  const resource = useResource({
    service: questionService,
    resourceName: 'question',
    initialFilters: {
      search: options.search || '',
      quizId: options.quizId || null,
      type: options.type || null,
      difficulty: options.difficulty || null,
      category: options.category || null,
      status: options.status || 'publish,draft,private'
    },
    dataProcessor,
    computedValuesCalculator,
    ...options
  });
  
  // Renombrar propiedades para mayor claridad semántica en el contexto de este hook
  const {
      items: questions,
      fetchItems: fetchQuestions,
      loadMore: loadMoreQuestions,
      createItem: createQuestion,
      updateItem: updateQuestion,
      deleteItem: deleteQuestion,
      duplicateItem: duplicateQuestion,
      refresh: refreshQuestions
  } = resource;

  // Devolver todas las propiedades del hook base, junto con los nombres renombrados
  return {
    ...resource,
    questions,
    fetchQuestions,
    loadMoreQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    duplicateQuestion,
    refreshQuestions
  };
};

export default useQuestions;