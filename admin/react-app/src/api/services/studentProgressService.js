// src/api/services/studentProgressService.js
import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

/**
 * Mark content as complete
 * @param {number} contentId - ID del contenido (lesson, quiz, etc.)
 * @param {string} contentType - Tipo de contenido ('lesson', 'quiz', 'video', 'document', 'text', 'image', 'step')
 * @param {number} courseId - ID del curso
 * @param {number} [parentLessonId] - ID de la lección padre (para steps)
 * @param {number} [stepIndex] - Índice del step dentro de la lección (para steps)
 * @returns {Promise<Object>} Response con el progreso actualizado
 */
export const markContentComplete = async (contentId, contentType, courseId, parentLessonId = null, stepIndex = null) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/student-progress/mark-complete`;
    
    console.log(`✅ Marking content as complete:`, { contentId, contentType, courseId, parentLessonId, stepIndex });

    const body = {
      content_id: contentId,
      content_type: contentType,
      course_id: courseId,
    };

    if (parentLessonId !== null) {
      body.parent_lesson_id = parentLessonId;
    }

    if (stepIndex !== null) {
      body.step_index = stepIndex;
    }

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    console.log('✅ Content marked as complete:', response.data);
    return response.data.data;

  } catch (error) {
    console.error('❌ Error marking content as complete:', error);
    throw error;
  }
};

/**
 * Unmark content (remove completion)
 * @param {number} contentId - ID del contenido (lesson, quiz, etc.)
 * @param {string} contentType - Tipo de contenido ('lesson', 'quiz', 'video', 'document', 'text', 'image', 'step')
 * @param {number} courseId - ID del curso
 * @param {number} [parentLessonId] - ID de la lección padre (para steps)
 * @param {number} [stepIndex] - Índice del step dentro de la lección (para steps)
 * @returns {Promise<Object>} Response con el progreso actualizado
 */
export const unmarkContentComplete = async (contentId, contentType, courseId, parentLessonId = null, stepIndex = null) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/student-progress/unmark-complete`;
    
    console.log(`❌ Unmarking content:`, { contentId, contentType, courseId, parentLessonId, stepIndex });

    const body = {
      content_id: contentId,
      content_type: contentType,
      course_id: courseId,
    };

    if (parentLessonId !== null) {
      body.parent_lesson_id = parentLessonId;
    }

    if (stepIndex !== null) {
      body.step_index = stepIndex;
    }

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    console.log('✅ Content unmarked:', response.data);
    return response.data.data;

  } catch (error) {
    console.error('❌ Error unmarking content:', error);
    throw error;
  }
};

/**
 * Get course progress for current user
 * @param {number} courseId - ID del curso
 * @returns {Promise<Object>} Progreso del curso
 */
export const getCourseProgress = async (courseId) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/student-progress/course/${courseId}`;
    
    console.log(`📊 Fetching course progress for course ${courseId}`);

    const response = await makeApiRequest(url, {
      method: 'GET',
    });

    console.log('✅ Course progress fetched:', response.data);
    return response.data.data;

  } catch (error) {
    console.error('❌ Error fetching course progress:', error);
    throw error;
  }
};

/**
 * Get all completed content for a course
 * @param {number} courseId - ID del curso
 * @returns {Promise<Array>} Lista de contenidos completados
 */
export const getCompletedContent = async (courseId) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/student-progress/completed/${courseId}`;
    
    console.log(`📋 Fetching completed content for course ${courseId}`);

    const response = await makeApiRequest(url, {
      method: 'GET',
    });

    console.log('✅ Completed content fetched:', response.data);
    return response.data.data;

  } catch (error) {
    console.error('❌ Error fetching completed content:', error);
    throw error;
  }
};

/**
 * Toggle favorite question
 * @param {number} questionId - ID de la pregunta
 * @returns {Promise<Object>} Estado actualizado
 */
export const toggleFavoriteQuestion = async (questionId) => {
  try {
    const { endpoints } = getApiConfig();
    const url = `${endpoints.custom_api}/favorite-questions/toggle`;
    
    console.log(`⭐ Toggling favorite for question ${questionId}`);

    const response = await makeApiRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        question_id: questionId,
      }),
    });

    console.log('✅ Favorite toggled:', response.data);
    return response.data.data;

  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    throw error;
  }
};
