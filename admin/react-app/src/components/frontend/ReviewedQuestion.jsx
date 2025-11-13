import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Bookmark, MessageSquare, Circle } from 'lucide-react';
import { formatQuestionForDisplay } from '../../api/utils/questionDataUtils';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { toggleFavoriteQuestion } from '../../api/services/favoriteService';
import QuestionFeedbackModal from './QuestionFeedbackModal';

const ReviewedQuestion = ({ question, result, index, displayIndex }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feedback');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const { t } = useTranslation();
  const { getColor } = useTheme();

  const handleToggleFavorite = async () => {
    if (isTogglingFavorite) return;
    
    setIsTogglingFavorite(true);
    try {
      const response = await toggleFavoriteQuestion(question.id);
      setIsFavorite(response.is_favorited);
    } catch (error) {
      // Error silenciado - el usuario puede intentar de nuevo
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleOpenModal = (type) => {
    setFeedbackType(type);
    setIsFeedbackModalOpen(true);
  };

  const formattedQuestion = formatQuestionForDisplay(question);

  if (!formattedQuestion || !result) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg flex items-center">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
        <p className="text-sm text-red-700">{t('quizzes.reviewedQuestion.errorInvalidData')}</p>
      </div>
    );
  }

  const { title, meta, fullExplanation } = formattedQuestion;
  const options = meta?._question_options || [];
  const { answer_given, correct_answer, is_correct, is_risked, error_percentage, total_answers } = result;

  // Colores específicos para respuestas correctas e incorrectas
  const SUCCESS_COLOR = '#22c55e'; // green-500 más suave
  const ERROR_COLOR = '#ef4444';   // red-500
  const GRAY_COLOR = '#6b7280';    // gray-500

  // Sistema de colores basado en el estado de la respuesta
  const getQuestionColor = (opacity = '') => {
    if (answer_given === null || answer_given === undefined) return GRAY_COLOR + opacity; // Sin contestar
    if (is_correct) return SUCCESS_COLOR + opacity; // Correcto
    return ERROR_COLOR + opacity; // Incorrecto
  };

  const getQuestionState = () => {
    if (answer_given === null || answer_given === undefined) return 'unanswered';
    if (is_correct) return 'correct';
    return 'incorrect';
  };

  const questionState = getQuestionState();
  const borderColor = getQuestionColor();

  const getOptionStyle = (optionId) => {
    const isSelected = optionId == answer_given;
    const isCorrectOption = optionId == correct_answer;

    if (isCorrectOption) {
      // Respuesta correcta
      if (is_risked) {
        // Con riesgo: fondo sin color, borde verde claro
        return {
          backgroundColor: '#ffffff',
          borderColor: SUCCESS_COLOR,
          color: SUCCESS_COLOR
        };
      } else {
        // Normal: fondo verde transparente, borde verde
        return {
          backgroundColor: SUCCESS_COLOR + '15',
          borderColor: SUCCESS_COLOR,
          color: SUCCESS_COLOR
        };
      }
    }
    
    if (isSelected && !is_correct) {
      // Respuesta incorrecta seleccionada
      if (is_risked) {
        // Con riesgo: fondo sin color, borde rojo claro
        return {
          backgroundColor: '#ffffff',
          borderColor: ERROR_COLOR,
          color: ERROR_COLOR
        };
      } else {
        // Normal: fondo rojo transparente, borde rojo
        return {
          backgroundColor: ERROR_COLOR + '15',
          borderColor: ERROR_COLOR,
          color: ERROR_COLOR
        };
      }
    }
    
    // Opción no seleccionada
    return {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      color: GRAY_COLOR
    };
  };

  return (
    <>
      <div 
        id={`question-${displayIndex || question.id}`} 
        className="rounded-lg mb-6 shadow-sm scroll-mt-6 border transition-all duration-200"
        style={{
          backgroundColor: getColor('background', '#ffffff'),
          borderLeftWidth: '4px',
          borderLeftColor: borderColor,
          borderTopColor: borderColor + '20',
          borderRightColor: borderColor + '20',
          borderBottomColor: borderColor + '20'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: borderColor + '15' }}
        >
          <div className="flex items-center gap-3">
            {/* Número de pregunta */}
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: borderColor + '15',
                color: borderColor
              }}
            >
              {displayIndex || index + 1}
            </div>

            {/* Badge de estado */}
            <div className="flex items-center gap-2">
              {questionState === 'correct' && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: SUCCESS_COLOR + '15',
                    color: SUCCESS_COLOR
                  }}
                >
                  <CheckCircle size={14} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.correct')}
                </div>
              )}
              {questionState === 'incorrect' && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: ERROR_COLOR + '15',
                    color: ERROR_COLOR
                  }}
                >
                  <XCircle size={14} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.incorrect')}
                </div>
              )}
              {questionState === 'unanswered' && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: GRAY_COLOR + '15',
                    color: GRAY_COLOR
                  }}
                >
                  <Circle size={14} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.unanswered')}
                </div>
              )}
              {is_risked && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: getColor('accent', '#f59e0b') + '15',
                    color: getColor('accent', '#f59e0b')
                  }}
                >
                  <AlertTriangle size={14} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.withRisk')}
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50"
              style={{
                color: isFavorite ? getColor('accent', '#f59e0b') : '#6b7280',
                backgroundColor: isFavorite ? getColor('accent', '#f59e0b') + '10' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!isTogglingFavorite) {
                  e.currentTarget.style.backgroundColor = getColor('accent', '#f59e0b') + '15';
                }
              }}
              onMouseLeave={(e) => {
                if (!isTogglingFavorite) {
                  e.currentTarget.style.backgroundColor = isFavorite ? getColor('accent', '#f59e0b') + '10' : 'transparent';
                }
              }}
              title={t('quizzes.reviewedQuestion.markFavorite')}
            >
              <Bookmark size={18} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} />
            </button>
            
            <button
              onClick={() => handleOpenModal('feedback')}
              className="p-2 rounded-lg transition-all duration-200"
              style={{ 
                color: '#6b7280',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c') + '10';
                e.currentTarget.style.color = getColor('primary', '#1a202c');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              title={t('quizzes.reviewedQuestion.addComment')}
            >
              <MessageSquare size={18} strokeWidth={2} />
            </button>

            <button
              onClick={() => handleOpenModal('challenge')}
              className="p-2 rounded-lg transition-all duration-200"
              style={{ 
                color: '#6b7280',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getColor('error', '#ef4444') + '10';
                e.currentTarget.style.color = getColor('error', '#ef4444');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              title={t('quizzes.reviewedQuestion.challenge')}
            >
              <AlertTriangle size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Título de la pregunta */}
        <div className="p-6">
          <h3
            className="text-base font-medium mb-4 leading-relaxed"
            style={{ color: borderColor }}
            dangerouslySetInnerHTML={{ __html: title }}
          />

          {/* Opciones */}
          <div className="space-y-3">
            {options.map((option, optionIndex) => {
              const optionStyle = getOptionStyle(option.id);
              const isSelected = option.id == answer_given;
              const isCorrectOption = option.id == correct_answer;
              
              return (
                <div
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200"
                  style={{
                    backgroundColor: optionStyle.backgroundColor,
                    borderColor: optionStyle.borderColor
                  }}
                >
                  {/* Icono de selección/corrección */}
                  <div className="flex-shrink-0">
                    {isCorrectOption ? (
                      <CheckCircle 
                        size={20} 
                        strokeWidth={2.5}
                        style={{ color: optionStyle.color }}
                      />
                    ) : isSelected ? (
                      <XCircle 
                        size={20} 
                        strokeWidth={2.5}
                        style={{ color: optionStyle.color }}
                      />
                    ) : (
                      <Circle 
                        size={20} 
                        strokeWidth={2}
                        style={{ color: optionStyle.borderColor }}
                      />
                    )}
                  </div>

                  {/* Badge con letra */}
                  <div 
                    className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: optionStyle.color + '20',
                      color: optionStyle.color
                    }}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </div>

                  {/* Texto de la opción */}
                  <span 
                    className="text-sm font-medium flex-1"
                    style={{ color: optionStyle.color }}
                  >
                    {option.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estadísticas de la pregunta (one-liner) */}
        {total_answers > 0 && (
          <div 
            className="px-6 py-3 text-sm border-t"
            style={{ 
              borderColor: borderColor + '15',
              color: GRAY_COLOR 
            }}
          >
            {t('quizzes.reviewedQuestion.failedBy', { percentage: error_percentage, total: total_answers })}
          </div>
        )}

        {/* Sección expandible de explicación */}
        {fullExplanation && (
          <div 
            className="border-t"
            style={{ borderColor: borderColor + '15' }}
          >
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex justify-between items-center w-full px-6 py-4 text-left transition-all duration-200"
              style={{ 
                color: GRAY_COLOR,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = GRAY_COLOR + '05';
                e.currentTarget.style.color = GRAY_COLOR;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = GRAY_COLOR;
              }}
            >
              <span className="text-sm font-semibold">
                {t('quizzes.reviewedQuestion.answerExplanation')}
              </span>
              {isExpanded ? (
                <ChevronUp size={20} strokeWidth={2} />
              ) : (
                <ChevronDown size={20} strokeWidth={2} />
              )}
            </button>

            {isExpanded && (
              <div className="px-6 pb-4">
                <div 
                  className="rounded-lg p-4"
                  style={{ backgroundColor: GRAY_COLOR + '08' }}
                >
                  <div
                    className="text-sm leading-relaxed"
                    style={{ color: GRAY_COLOR }}
                    dangerouslySetInnerHTML={{ __html: fullExplanation }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Feedback */}
      {isFeedbackModalOpen && (
        <QuestionFeedbackModal
          question={question}
          initialFeedbackType={feedbackType}
          onClose={() => setIsFeedbackModalOpen(false)}
        />
      )}
    </>
  );
};

export default ReviewedQuestion;