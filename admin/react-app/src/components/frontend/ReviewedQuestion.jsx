import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Bookmark, MessageSquare, Circle } from 'lucide-react';
import { formatQuestionForDisplay } from '../../api/utils/questionDataUtils';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { toggleFavoriteQuestion } from '../../api/services/favoriteService';
import QuestionFeedbackModal from './QuestionFeedbackModal';

const ReviewedQuestion = ({ 
  question, 
  result, 
  index, 
  displayIndex,
  // Context props for feedback modal
  courseId = null,
  courseName = null,
  lessonId = null,
  lessonTitle = null
}) => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feedback');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  const formattedQuestion = React.useMemo(() => formatQuestionForDisplay(question), [question]);

  useEffect(() => {
    if (formattedQuestion) {
      setIsFavorite(formattedQuestion.isFavorite);
    }
  }, [formattedQuestion]);

  // Dark mode aware colors
  const bgCard = isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff';
  const bgSubtle = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderSubtle = isDarkMode ? 'rgba(255,255,255,0.2)' : '#e5e7eb';
  // Texto principal - blanco en dark mode para legibilidad
  const textPrimary = isDarkMode ? '#f9fafb' : '#1a202c';
  // Texto secundario/muted
  const textMuted = isDarkMode ? '#9ca3af' : '#6b7280';

  if (!formattedQuestion || !result) {
    return (
      <div 
        className="p-4 border rounded-lg flex items-center"
        style={{
          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
          borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'
        }}
      >
        <AlertTriangle className="h-5 w-5 mr-3" style={{ color: '#ef4444' }} />
        <p className="text-sm" style={{ color: isDarkMode ? '#fca5a5' : '#b91c1c' }}>
          {t('quizzes.reviewedQuestion.errorInvalidData')}
        </p>
      </div>
    );
  }

  const { title, meta, fullExplanation } = formattedQuestion;
  const options = meta?._question_options || [];
  const { answer_given, correct_answer, is_correct, is_risked, error_percentage, total_answers } = result;

  // Colores específicos para respuestas correctas e incorrectas
  const SUCCESS_COLOR = '#22c55e'; // green-500 más suave
  const ERROR_COLOR = '#ef4444';   // red-500
  const GRAY_COLOR = '#6b7280';    // gray-500 para indicadores visuales

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
          backgroundColor: bgCard,
          borderColor: SUCCESS_COLOR,
          indicatorColor: SUCCESS_COLOR,
          textColor: textPrimary
        };
      } else {
        // Normal: fondo verde transparente, borde verde
        return {
          backgroundColor: SUCCESS_COLOR + '15',
          borderColor: SUCCESS_COLOR,
          indicatorColor: SUCCESS_COLOR,
          textColor: textPrimary
        };
      }
    }
    
    if (isSelected && !is_correct) {
      // Respuesta incorrecta seleccionada
      if (is_risked) {
        // Con riesgo: fondo sin color, borde rojo claro
        return {
          backgroundColor: bgCard,
          borderColor: ERROR_COLOR,
          indicatorColor: ERROR_COLOR,
          textColor: textPrimary
        };
      } else {
        // Normal: fondo rojo transparente, borde rojo
        return {
          backgroundColor: ERROR_COLOR + '15',
          borderColor: ERROR_COLOR,
          indicatorColor: ERROR_COLOR,
          textColor: textPrimary
        };
      }
    }
    
    // Opción no seleccionada
    return {
      backgroundColor: bgCard,
      borderColor: borderSubtle,
      indicatorColor: textMuted,
      textColor: textPrimary
    };
  };

  const handleToggleFavorite = async () => {
    if (isTogglingFavorite) return;
    
    console.log(`🎯 BEFORE Toggle - Question ${question.id}:`, {
      currentState: isFavorite,
      questionDataIsFavorite: question.is_favorite,
      formattedQuestionIsFavorite: formattedQuestion.isFavorite
    });
    
    setIsTogglingFavorite(true);
    try {
      const response = await toggleFavoriteQuestion(question.id);
      console.log(`🎯 AFTER Toggle - Question ${question.id}:`, {
        response,
        apiReturned_is_favorited: response.is_favorited,
        previousLocalState: isFavorite,
        newLocalState: response.is_favorited,
        shouldBeOppositeOf: isFavorite,
        expectedNewState: !isFavorite
      });
      setIsFavorite(response.is_favorited);
    } catch (error) {
      console.error(`❌ Error toggling favorite for question ${question.id}:`, error);
      // Error silenciado - el usuario puede intentar de nuevo
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleOpenModal = (type) => {
    setFeedbackType(type);
    setIsFeedbackModalOpen(true);
  };

  return (
    <>
      <div 
        id={`question-${displayIndex || question.id}`} 
        className="rounded-lg mb-4 shadow-sm scroll-mt-6 transition-all duration-200"
        style={{
          backgroundColor: getColor('secondaryBackground', '#ffffff'),
          borderTop: `2px solid ${borderColor}40`,
          borderRight: `2px solid ${borderColor}40`,
          borderBottom: `2px solid ${borderColor}40`,
          borderLeft: `4px solid ${borderColor}`
        }}
      >
        {/* Header */}
        <div 
          className="p-3 border-b flex items-center justify-between"
          style={{ borderColor: borderColor + '15' }}
        >
          <div className="flex items-center gap-3">
            {/* Número de pregunta */}
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
              style={{
                backgroundColor: borderColor + '15',
                color: textPrimary
              }}
            >
              {displayIndex || index + 1}
            </div>

            {/* Badge de estado */}
            <div className="flex items-center gap-2">
              {questionState === 'correct' && (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: SUCCESS_COLOR + '15',
                    color: SUCCESS_COLOR
                  }}
                >
                  <CheckCircle size={12} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.correct')}
                </div>
              )}
              {questionState === 'incorrect' && (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: ERROR_COLOR + '15',
                    color: ERROR_COLOR
                  }}
                >
                  <XCircle size={12} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.incorrect')}
                </div>
              )}
              {questionState === 'unanswered' && (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: GRAY_COLOR + '15',
                    color: GRAY_COLOR
                  }}
                >
                  <Circle size={12} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.unanswered')}
                </div>
              )}
              {is_risked && (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: getColor('accent', '#f59e0b') + '15',
                    color: getColor('accent', '#f59e0b')
                  }}
                >
                  <AlertTriangle size={12} strokeWidth={2.5} />
                  {t('quizzes.reviewedQuestion.withRisk')}
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-50"
              style={{
                color: isFavorite ? getColor('accent', '#f59e0b') : textMuted,
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
              <Bookmark size={16} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} />
            </button>
            
            <button
              onClick={() => handleOpenModal('feedback')}
              className="p-1.5 rounded-lg transition-all duration-200"
              style={{ 
                color: textMuted,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('primary', '#1a202c') + '10';
                e.currentTarget.style.color = isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = textMuted;
              }}
              title={t('quizzes.reviewedQuestion.addComment')}
            >
              <MessageSquare size={16} strokeWidth={2} />
            </button>

            <button
              onClick={() => handleOpenModal('challenge')}
              className="p-1.5 rounded-lg transition-all duration-200"
              style={{ 
                color: textMuted,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getColor('error', '#ef4444') + '10';
                e.currentTarget.style.color = getColor('error', '#ef4444');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = textMuted;
              }}
              title={t('quizzes.reviewedQuestion.challenge')}
            >
              <AlertTriangle size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Título de la pregunta */}
        <div className="p-4">
          <h3
            className="text-sm font-medium mb-3 leading-relaxed"
            style={{ color: textPrimary }}
            dangerouslySetInnerHTML={{ __html: title }}
          />

          {/* Opciones */}
          <div className="space-y-2">
            {options.map((option, optionIndex) => {
              const optionStyle = getOptionStyle(option.id);
              const isSelected = option.id == answer_given;
              const isCorrectOption = option.id == correct_answer;
              
              return (
                <div
                  key={option.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all duration-200"
                  style={{
                    backgroundColor: optionStyle.backgroundColor,
                    borderColor: optionStyle.borderColor
                  }}
                >
                  {/* Icono de selección/corrección */}
                  <div className="flex-shrink-0">
                    {isCorrectOption ? (
                      <CheckCircle 
                        size={18} 
                        strokeWidth={2.5}
                        style={{ color: optionStyle.indicatorColor }}
                      />
                    ) : isSelected ? (
                      <XCircle 
                        size={18} 
                        strokeWidth={2.5}
                        style={{ color: optionStyle.indicatorColor }}
                      />
                    ) : (
                      <Circle 
                        size={18} 
                        strokeWidth={2}
                        style={{ color: optionStyle.borderColor }}
                      />
                    )}
                  </div>

                  {/* Badge con letra */}
                  <div 
                    className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: optionStyle.indicatorColor + '20',
                      color: optionStyle.indicatorColor
                    }}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </div>

                  {/* Texto de la opción */}
                  <span 
                    className="text-sm font-medium flex-1"
                    style={{ color: optionStyle.textColor }}
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
            className="px-4 py-2.5 text-xs border-t"
            style={{ 
              borderColor: borderColor + '15',
              color: textMuted 
            }}
          >
            {t('quizzes.reviewedQuestion.failedBy', { percentage: error_percentage, total: total_answers })}
          </div>
        )}

        {/* Sección de explicación - siempre visible */}
        {fullExplanation && (
          <div 
            className="border-t"
            style={{ borderColor: borderColor + '15' }}
          >
            <div className="px-4 py-3">
              <span 
                className="text-xs font-semibold block mb-2"
                style={{ color: textMuted }}
              >
                {t('quizzes.reviewedQuestion.answerExplanation')}
              </span>
              <div 
                className="rounded-lg p-3"
                style={{ backgroundColor: bgSubtle }}
              >
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: textMuted }}
                  dangerouslySetInnerHTML={{ __html: fullExplanation }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Feedback */}
      {isFeedbackModalOpen && (
        <QuestionFeedbackModal
          question={question}
          initialFeedbackType={feedbackType}
          onClose={() => setIsFeedbackModalOpen(false)}
          courseId={courseId}
          courseName={courseName}
          lessonId={lessonId}
          lessonTitle={lessonTitle}
        />
      )}
    </>
  );
};

export default ReviewedQuestion;