/**
 * Question Data Validation and Transformation Utilities
 * Handles data formatting for WordPress REST API
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 2.2.0
 */

import {
  sanitizeString,
  sanitizeInteger,
  sanitizeBoolean,
  sanitizePostStatus,
  sanitizeEnum,
  sanitizeRenderedContent,
  sanitizeIdArray,
  validateRequired,
  createValidationResult,
  capitalize,
  formatDate,
  truncateText
} from './commonDataUtils.js';

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_QUESTION_META = {
  _course_id: 0,
  _question_lesson: 0,
  _question_type: 'multiple_choice',
  _difficulty_level: 'medium',
  _points: 1,
  _points_incorrect: 0,
  _question_order: 0,
  _is_required: false,
  _quiz_ids: [],
  _question_options: [],
  _explanation: '',
  _question_provider: 'human'
};

export const VALID_QUESTION_TYPES = ['multiple_choice', 'true_false', 'essay', 'short_answer', 'fill_blank'];
export const VALID_DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
export const VALID_QUESTION_PROVIDERS = ['human', 'ai_gpt4', 'ai_gemini', 'imported'];
export const VALID_QUESTION_STATUSES = ['publish', 'draft', 'private', 'pending'];

// ============================================================
// TRANSFORMATION FOR API REQUESTS
// ============================================================

export const transformQuestionDataForApi = (questionData) => {
  console.log('🔄 transformQuestionDataForApi - Input:', questionData);

  const transformed = {
    title: sanitizeString(questionData.title),
    content: sanitizeString(questionData.explanation || questionData.content || ''),
    status: sanitizePostStatus(questionData.status, 'publish'),
    // Las taxonomías se envían en el nivel raíz
    qe_category: sanitizeIdArray(questionData.qe_category),
    qe_provider: questionData.provider ? [sanitizeInteger(questionData.provider)] : [],
  };

  transformed.meta = {};
  
  // 🔥 CAMBIO: Solo incluir _course_id si tiene un valor válido (no "0", no 0, no "")
  if (questionData.courseId !== undefined && 
      questionData.courseId !== null && 
      questionData.courseId !== '' && 
      questionData.courseId !== '0' && 
      questionData.courseId !== 0) {
    const courseIdInt = sanitizeInteger(questionData.courseId, 0);
    if (courseIdInt > 0) {
      transformed.meta._course_id = courseIdInt;
    }
  }
  
  // 🔥 CAMBIO: Solo incluir _question_lesson si tiene un valor válido
  if (questionData.lessonId !== undefined && 
      questionData.lessonId !== null && 
      questionData.lessonId !== '' && 
      questionData.lessonId !== '0' && 
      questionData.lessonId !== 0) {
    const lessonIdInt = sanitizeInteger(questionData.lessonId, 0);
    if (lessonIdInt > 0) {
      transformed.meta._question_lesson = lessonIdInt;
    }
  }
  
  transformed.meta._quiz_ids = sanitizeIdArray(questionData.quizIds);
  transformed.meta._explanation = sanitizeString(questionData.explanation || questionData.content || '');
  transformed.meta._question_type = sanitizeEnum(questionData.type, VALID_QUESTION_TYPES, 'multiple_choice');
  transformed.meta._difficulty_level = sanitizeEnum(questionData.difficulty, VALID_DIFFICULTY_LEVELS, 'medium');
  transformed.meta._points = sanitizeInteger(questionData.points, 1, 0);
  transformed.meta._points_incorrect = sanitizeInteger(questionData.pointsIncorrect, 0, 0);

  if (Array.isArray(questionData.options)) {
    transformed.meta._question_options = questionData.options.map((opt, index) => ({
      id: index,
      text: sanitizeString(opt.text),
      isCorrect: sanitizeBoolean(opt.isCorrect)
    }));
  }

  console.log('🔄 transformQuestionDataForApi - Output:', transformed);
  console.log('📝 Content length:', transformed.content?.length || 0);
  console.log('📝 Explanation length:', transformed.meta._explanation?.length || 0);
  return transformed;
};


// ============================================================
// SANITIZATION FOR DISPLAY
// ============================================================

export const sanitizeQuestionData = (questionData) => {
    if (!questionData) return null;
    
    // 🔍 DEBUG: Ver datos crudos de la API
    console.log('🔍 sanitizeQuestionData - Raw data:', {
        id: questionData.id,
        hasContent: !!questionData.content,
        contentType: typeof questionData.content,
        contentRendered: questionData.content?.rendered,
        contentValue: questionData.content
    });
    
    return {
        id: questionData.id || 0,
        title: sanitizeRenderedContent(questionData.title),
        content: sanitizeRenderedContent(questionData.content), // Explanation
        status: sanitizePostStatus(questionData.status, 'draft'),
        date: questionData.date || '',
        modified: questionData.modified || '',
        is_favorite: sanitizeBoolean(questionData.is_favorite),
        
        // Taxonomies
        qe_category: sanitizeIdArray(questionData.qe_category),
        qe_provider: sanitizeIdArray(questionData.qe_provider),

        meta: {
            ...DEFAULT_QUESTION_META,
            ...(questionData.meta || {}),
            _quiz_ids: sanitizeIdArray(questionData.meta?._quiz_ids),
            _question_options: Array.isArray(questionData.meta?._question_options)
                ? questionData.meta._question_options.map(opt => ({
                    ...opt,
                    isCorrect: sanitizeBoolean(opt.isCorrect)
                }))
                : [],
        },
        _embedded: questionData._embedded || {},
    };
};

// ============================================================
// VALIDATION
// ============================================================

export const validateQuestionData = (questionData) => {
  const errors = [];
  const titleError = validateRequired(questionData.title, 'Question title');
  if (titleError) errors.push(titleError);

  const type = questionData.type || questionData.meta?._question_type;
  if (type === 'multiple_choice' || type === 'true_false') {
    if (!questionData.options || questionData.options.length < 1) {
      errors.push('At least one option is required.');
    } else if (!questionData.options.some(opt => opt.isCorrect)) {
      errors.push('At least one option must be marked as correct.');
    }
  }
  
  return createValidationResult(errors);
};

// ============================================================
// FORMATTING FOR DISPLAY (FUNCIÓN AÑADIDA)
// ============================================================

/**
 * Format question data for display in lists/cards
 * @param {Object} question - Question data
 * @returns {Object} Formatted question
 */
export const formatQuestionForDisplay = (question) => {
  const sanitized = sanitizeQuestionData(question);

  if (!sanitized) {
    return null;
  }

  // 🔥 CORRECCIÓN: Accedemos a content.rendered si es un objeto, o usamos el string directamente
  let contentText = '';
  if (sanitized.content) {
    if (typeof sanitized.content === 'object' && sanitized.content !== null) {
      // Si es objeto, intentamos obtener rendered, si no existe o está vacío, usamos raw
      contentText = sanitized.content.rendered || sanitized.content.raw || '';
    } else if (typeof sanitized.content === 'string') {
      contentText = sanitized.content;
    }
  }
  
  // Si no hay contenido, usamos el meta _explanation
  const explanationHTML = contentText || sanitized.meta?._explanation || '';
  
  // Para la versión corta (sin HTML), eliminamos las etiquetas
  const explanationPlainText = explanationHTML.replace(/<[^>]*>/g, '').trim();

  return {
    ...sanitized,
    // Formatted values for UI
    formattedType: capitalize(sanitized.meta._question_type.replace('_', ' ')),
    formattedDifficulty: capitalize(sanitized.meta._difficulty_level),
    formattedDate: formatDate(sanitized.date),
    shortExplanation: truncateText(explanationPlainText, 100), // Versión sin HTML para preview
    fullExplanation: explanationHTML, // HTML completo para el editor
    isPublished: sanitized.status === 'publish',
    isFavorite: sanitized.is_favorite || false,
  };
};