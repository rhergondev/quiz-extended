// src/api/services/quizAttemptService.js
import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

/**
 * Inicia un nuevo intento de cuestionario.
 * @param {number} quizId - El ID del cuestionario a iniciar.
 * @returns {Promise<Object>} El objeto del intento, incluyendo el attempt_id.
 */
export const startQuizAttempt = async (quizId) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/quiz-attempts/start`;
    console.log(`🚀 Starting quiz attempt for quiz ID: ${quizId}`);
    
    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId }),
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
export const submitQuizAttempt = async (attemptId, answers) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/quiz-attempts/submit`;
    console.log(`📤 Submitting answers for attempt ID: ${attemptId}`);

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        attempt_id: attemptId,
        answers: answers,
      }),
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