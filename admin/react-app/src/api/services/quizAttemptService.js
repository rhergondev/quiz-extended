// src/api/services/quizAttemptService.js
import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

/**
 * Inicia un nuevo intento de cuestionario.
 * @param {number} quizId - El ID del cuestionario a iniciar.
 * @param {number|null} lessonId - El ID de la lección (opcional).
 * @returns {Promise<Object>} El objeto del intento, incluyendo el attempt_id.
 */
export const startQuizAttempt = async (quizId, lessonId = null, courseId = null) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/quiz-attempts/start`;
    console.log(`🚀 Starting quiz attempt for quiz ID: ${quizId}, Lesson ID: ${lessonId}, Course ID: ${courseId}`);

    const body = { quiz_id: quizId };
    if (lessonId) {
      body.lesson_id = lessonId;
    }
    if (courseId) {
      body.course_id = parseInt(courseId, 10);
    }

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    console.log('✅ Attempt started:', response.data);
    
    // ANTERIOR: return response.data;
    // CORRECCIÓN: Devolver el objeto anidado que contiene los datos reales.
    return response.data.data;

  } catch (error) {
    console.error('❌ Error starting quiz attempt:', error);
    throw error;
  }
};

/**
 * Envía las respuestas de un intento de cuestionario.
 * @param {number} attemptId - El ID del intento.
 * @param {Array<Object>} answers - Las respuestas del usuario.
 * @returns {Promise<Object>} El resultado de la evaluación.
 */
export const submitQuizAttempt = async (attemptId, answers, questionOrder = null) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/quiz-attempts/submit`;
    console.log(`📤 Submitting answers for attempt ID: ${attemptId}`);

    const body = {
      attempt_id: attemptId,
      answers: answers,
    };
    if (questionOrder && questionOrder.length > 0) {
      body.question_order = questionOrder;
    }

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    console.log('✅ Attempt submitted successfully:', response.data);
    
    // ANTERIOR: return response.data;
    // CORRECCIÓN: Devolver el objeto anidado que contiene los datos reales.
    return response.data.data;

  } catch (error) {
    console.error('❌ Error submitting quiz attempt:', error);
    throw error;
  }
};

/**
 * 🔥 NUEVA FUNCIÓN: Calcula el resultado para un cuestionario personalizado sin guardarlo.
 * @param {Array<number>} questionIds - Array de IDs de las preguntas del cuestionario.
 * @param {Array<Object>} answers - Las respuestas del usuario.
 * @returns {Promise<Object>} El resultado de la evaluación.
 */
export const calculateCustomQuizResult = async (questionIds, answers) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/quiz-generator/calculate-results`;
    console.log(`🧮 Calculating custom quiz result...`);

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        question_ids: questionIds,
        answers: answers,
      }),
    });

    console.log('✅ Custom quiz result calculated:', response.data);
    return response.data.data;

  } catch (error) {
    console.error('❌ Error calculating custom quiz result:', error);
    throw error;
  }
};