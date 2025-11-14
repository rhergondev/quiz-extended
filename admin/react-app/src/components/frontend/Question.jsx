import React, { useState } from 'react';
import { Trash2, ChevronDown, Info, TrendingDown, Circle, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const Question = ({ 
  question, 
  index,
  questionNumber, // Para modo práctica, número personalizado
  onSelectAnswer, 
  selectedAnswer,
  onAnswerChange, // Para modo práctica
  isRisked,
  onToggleRisk,
  onClearAnswer,
  isSubmitted,
  disabled = false,
  showCorrectAnswer = false,
  isPracticeMode = false,
  showRiskSelector = false // Nueva prop para controlar el selector de riesgo
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const { getColor } = useTheme();
  const { t } = useTranslation();

  if (!question) {
    return null;
  }

  const { id, title, meta } = question;
  
  // Manejar tanto title.rendered como title directo
  const questionTitle = typeof title === 'object' && title?.rendered ? title.rendered : title;
  const options = meta?._question_options || [];
  const displayIndex = questionNumber !== undefined ? questionNumber : index + 1;

  // Determinar el estado de la pregunta para los colores
  const hasAnswer = selectedAnswer !== null && selectedAnswer !== undefined;
  const questionState = !hasAnswer ? 'unanswered' : (isRisked ? 'risked' : 'answered');
  
  // Función para obtener colores según el estado
  const getQuestionColor = (opacity = '') => {
    switch (questionState) {
      case 'unanswered':
        return `#6b7280${opacity}`; // Gris
      case 'risked':
        return `${getColor('accent', '#f59e0b')}${opacity}`; // Naranja
      case 'answered':
      default:
        return `${getColor('primary', '#1a202c')}${opacity}`; // Azul
    }
  };

  // Handler unificado para cambios de respuesta
  const handleAnswerSelect = (questionId, optionId) => {
    if (isPracticeMode && onAnswerChange) {
      onAnswerChange(optionId);
    } else if (onSelectAnswer) {
      onSelectAnswer(questionId, optionId);
    }
  };

  return (
    <div 
      id={`quiz-question-${displayIndex}`} 
      className="rounded-lg overflow-hidden shadow-sm mb-6 scroll-mt-6 transition-all duration-200"
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#ffffff'),
        borderTop: `2px solid ${getQuestionColor('40')}`,
        borderRight: `2px solid ${getQuestionColor('40')}`,
        borderBottom: `2px solid ${getQuestionColor('40')}`,
        borderLeft: `4px solid ${getQuestionColor()}`
      }}
    >
      <div>
        {/* Header: Número de pregunta */}
        <div 
          className="px-6 py-4 border-b"
          style={{ 
            backgroundColor: getQuestionColor('08'),
            borderColor: getQuestionColor('10')
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center justify-center rounded-full font-bold text-sm"
                style={{ 
                  width: '32px',
                  height: '32px',
                  backgroundColor: getQuestionColor(),
                  color: '#ffffff'
                }}
              >
                {displayIndex}
              </div>
              {questionState === 'unanswered' && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: `${getQuestionColor()}20`,
                    color: getQuestionColor()
                  }}
                >
                  <Circle size={14} />
                  <span>{t('quizzes.question.unanswered')}</span>
                </div>
              )}
              {questionState === 'risked' && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: getQuestionColor('20'),
                    color: getQuestionColor()
                  }}
                >
                  <TrendingDown size={14} />
                  <span>{t('quizzes.question.withRisk')}</span>
                </div>
              )}
              {questionState === 'answered' && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ 
                    backgroundColor: getQuestionColor('20'),
                    color: getQuestionColor()
                  }}
                >
                  <CheckCircle size={14} />
                  <span>{t('quizzes.question.answered')}</span>
                </div>
              )}
            </div>
            
            {selectedAnswer !== null && selectedAnswer !== undefined && !isSubmitted && (
              <button
                type="button"
                onClick={() => onClearAnswer(id)}
                title={t('quizzes.question.clearSelection')}
                className="p-2 rounded-lg transition-all duration-200"
                style={{ 
                  backgroundColor: 'transparent',
                  color: `${getColor('primary', '#1a202c')}60`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = `${getColor('primary', '#1a202c')}60`;
                }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Título de la pregunta */}
        <div className="px-6 py-5">
          <h3 
            className="text-base font-medium leading-relaxed"
            style={{ color: getColor('primary', '#1a202c') }}
            dangerouslySetInnerHTML={{ __html: questionTitle || '' }}
          />
        </div>

        {/* Opciones de respuesta */}
        <div className="px-6 pb-5 space-y-2">
          {options.map((option, optionIndex) => {
            const isSelected = selectedAnswer !== null && selectedAnswer !== undefined && option.id === selectedAnswer;

            return (
              <label 
                key={option.id} 
                className="flex items-start cursor-pointer p-4 rounded-lg transition-all duration-200 group"
                style={{
                  backgroundColor: isSelected 
                    ? getQuestionColor('10')
                    : 'transparent',
                  border: `2px solid ${isSelected 
                    ? getQuestionColor()
                    : `${getColor('primary', '#1a202c')}15`
                  }`
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`;
                    e.currentTarget.style.borderColor = `${getColor('primary', '#1a202c')}30`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = `${getColor('primary', '#1a202c')}15`;
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Radio button customizado */}
                  <div 
                    className="flex items-center justify-center rounded-full transition-all duration-200"
                    style={{
                      width: '20px',
                      height: '20px',
                      border: `2px solid ${isSelected 
                        ? getQuestionColor()
                        : `${getColor('primary', '#1a202c')}40`
                      }`,
                      backgroundColor: isSelected 
                        ? getQuestionColor()
                        : 'transparent'
                    }}
                  >
                    {isSelected && (
                      <div 
                        className="rounded-full"
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    )}
                  </div>
                  
                  <input
                    type="radio"
                    name={`question-${id}`}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(id, option.id)}
                    disabled={isSubmitted || disabled}
                    className="sr-only"
                  />
                  
                  {/* Letra de la opción */}
                  <div 
                    className="flex items-center justify-center rounded font-bold text-xs transition-all duration-200"
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: isSelected
                        ? getQuestionColor()
                        : `${getColor('primary', '#1a202c')}10`,
                      color: isSelected ? '#ffffff' : getColor('primary', '#1a202c')
                    }}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </div>
                  
                  {/* Texto de la opción */}
                  <span 
                    className="text-sm leading-relaxed transition-colors duration-200"
                    style={{ 
                      color: isSelected 
                        ? getColor('primary', '#1a202c')
                        : `${getColor('primary', '#1a202c')}90`,
                      fontWeight: isSelected ? '600' : '400'
                    }}
                  >
                    {option.text}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
          
        {/* Explanation Section - Solo en modo práctica */}
        {isPracticeMode && (
          <div 
            className="border-t"
            style={{ borderColor: `${getColor('primary', '#1a202c')}10` }}
          >
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center justify-between w-full text-left px-6 py-4 transition-colors duration-200"
              style={{ 
                backgroundColor: showExplanation 
                  ? `${getColor('primary', '#1a202c')}05`
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!showExplanation) {
                  e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}03`;
                }
              }}
              onMouseLeave={(e) => {
                if (!showExplanation) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center justify-center rounded-lg"
                  style={{ 
                    width: '36px',
                    height: '36px',
                    backgroundColor: `${getColor('primary', '#1a202c')}10`
                  }}
                >
                  <Info size={18} style={{ color: getColor('primary', '#1a202c') }} />
                </div>
                <span 
                  className="text-sm font-semibold"
                  style={{ color: getColor('primary', '#1a202c') }}
                >
                  {t('quizzes.question.answerExplanation')}
                </span>
              </div>
              <div 
                className="p-1 rounded transition-transform duration-200"
                style={{ 
                  transform: showExplanation ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              >
                <ChevronDown size={20} style={{ color: getColor('primary', '#1a202c') }} />
              </div>
            </button>
            
            {showExplanation && (
              <div 
                className="px-6 pb-5"
                style={{ 
                  backgroundColor: `${getColor('primary', '#1a202c')}03`
                }}
              >
                <div 
                  className="p-4 rounded-lg"
                  style={{ 
                    backgroundColor: getColor('background', '#ffffff'),
                    border: `1px solid ${getColor('primary', '#1a202c')}15`
                  }}
                >
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: `${getColor('primary', '#1a202c')}90` }}
                  >
                    {meta?._question_explanation || t('quizzes.question.noExplanationAvailable')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics Section - Solo en modo práctica */}
        {isPracticeMode && (
          <div 
            className="border-t"
            style={{ borderColor: `${getColor('primary', '#1a202c')}10` }}
          >
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-between w-full text-left px-6 py-4 transition-colors duration-200"
              style={{ 
                backgroundColor: showStats 
                  ? `${getColor('accent', '#f59e0b')}08`
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!showStats) {
                  e.currentTarget.style.backgroundColor = `${getColor('accent', '#f59e0b')}05`;
                }
              }}
              onMouseLeave={(e) => {
                if (!showStats) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center justify-center rounded-lg"
                  style={{ 
                    width: '36px',
                    height: '36px',
                    backgroundColor: `${getColor('accent', '#f59e0b')}15`
                  }}
                >
                  <TrendingDown size={18} style={{ color: getColor('accent', '#f59e0b') }} />
                </div>
                <span 
                  className="text-sm font-semibold"
                  style={{ color: getColor('accent', '#f59e0b') }}
                >
                  {t('quizzes.question.questionStatistics')}
                </span>
              </div>
              <div 
                className="p-1 rounded transition-transform duration-200"
                style={{ 
                  transform: showStats ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              >
                <ChevronDown size={20} style={{ color: getColor('accent', '#f59e0b') }} />
              </div>
            </button>
            
            {showStats && (
              <div 
                className="px-6 pb-5"
                style={{ 
                  backgroundColor: `${getColor('accent', '#f59e0b')}08`
                }}
              >
                <div 
                  className="p-4 rounded-lg"
                  style={{ 
                    backgroundColor: getColor('background', '#ffffff'),
                    border: `1px solid ${getColor('accent', '#f59e0b')}30`
                  }}
                >
                  {meta?._question_fail_rate !== undefined ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-sm"
                          style={{ color: `${getColor('primary', '#1a202c')}80` }}
                        >
                          {t('quizzes.question.failureRate')}:
                        </span>
                        <span 
                          className="text-2xl font-bold"
                          style={{ color: getColor('accent', '#f59e0b') }}
                        >
                          {meta._question_fail_rate}%
                        </span>
                      </div>
                      
                      {/* Barra de progreso */}
                      <div 
                        className="w-full rounded-full overflow-hidden"
                        style={{ 
                          height: '8px',
                          backgroundColor: `${getColor('accent', '#f59e0b')}15`
                        }}
                      >
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: `${meta._question_fail_rate}%`,
                            backgroundColor: getColor('accent', '#f59e0b')
                          }}
                        />
                      </div>
                      
                      {meta._question_fail_rate > 50 && (
                        <div 
                          className="flex items-start gap-2 p-3 rounded-lg text-xs"
                          style={{ 
                            backgroundColor: `${getColor('accent', '#f59e0b')}10`,
                            color: getColor('accent', '#f59e0b')
                          }}
                        >
                          <span className="font-bold">⚠️</span>
                          <span>{t('quizzes.question.difficultQuestion')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p 
                      className="text-sm"
                      style={{ color: `${getColor('primary', '#1a202c')}60` }}
                    >
                      {t('quizzes.question.noStatisticsAvailable')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
          
        {/* Checkbox de Riesgo - Solo si hay respuesta seleccionada y showRiskSelector */}
        {selectedAnswer !== null && selectedAnswer !== undefined && !isSubmitted && showRiskSelector && onToggleRisk && (
          <div 
            className="px-6 py-4 border-t"
            style={{ 
              backgroundColor: `${getColor('primary', '#1a202c')}03`,
              borderColor: getQuestionColor('10')
            }}
          >
            <label className="flex items-center cursor-pointer group">
              {/* Checkbox customizado */}
              <div 
                className="relative flex items-center justify-center rounded transition-all duration-200"
                style={{
                  width: '20px',
                  height: '20px',
                  border: `2px solid ${isRisked ? getColor('accent', '#f59e0b') : `${getColor('primary', '#1a202c')}40`}`,
                  backgroundColor: isRisked ? getColor('accent', '#f59e0b') : 'transparent'
                }}
              >
                {isRisked && (
                  <svg 
                    className="w-3 h-3" 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth="3" 
                    viewBox="0 0 24 24"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              
              <input
                type="checkbox"
                checked={isRisked}
                onChange={() => onToggleRisk(id)}
                disabled={isSubmitted}
                className="sr-only"
              />
              
              <span 
                className="ml-3 text-sm font-medium transition-colors duration-200"
                style={{ 
                  color: isRisked 
                    ? getColor('accent', '#f59e0b')
                    : `${getColor('primary', '#1a202c')}70`
                }}
              >
                {t('quizzes.question.markWithRisk')}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default Question;