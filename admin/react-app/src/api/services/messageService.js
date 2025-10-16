import api from '../index';
import { errorHandler } from '../utils/errorHandler';

const ENDPOINTS = {
  submitFeedback: '/messages/feedback',
};

/**
 * Envía un comentario o impugnación sobre una pregunta.
 * @param {object} data - Los datos del feedback.
 * @param {number} data.question_id - El ID de la pregunta.
 * @param {string} data.feedback_type - 'feedback' o 'challenge'.
 * @param {string} data.message - El contenido del mensaje.
 * @returns {Promise<object>} La respuesta de la API.
 */
const submitFeedback = async (data) => {
  try {
    const response = await api.post(ENDPOINTS.submitFeedback, data);
    return response.data;
  } catch (error) {
    throw errorHandler(error, 'Error al enviar el mensaje de feedback.');
  }
};

export const messageService = {
  submitFeedback,
};