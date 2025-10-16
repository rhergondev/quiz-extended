import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

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
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/feedback/question`;
    
    console.log('📤 Enviando feedback de pregunta:', data);
    
    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    console.log('✅ Feedback enviado exitosamente:', response.data);
    
    // Retornar los datos anidados
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Error al enviar el mensaje de feedback:', error);
    throw error;
  }
};

export const messageService = {
  submitFeedback,
};