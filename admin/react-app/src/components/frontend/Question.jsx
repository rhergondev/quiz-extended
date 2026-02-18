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
  showRiskSelector = false, // Nueva prop para controlar el selector de riesgo
  className = '' // Añadido para clases adicionales
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const { getColor, isDarkMode } = useTheme();
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
  
  // Dark mode aware colors
  const textPrimary = isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c');
  const textSecondary = isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280';
  const bgCard = isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('secondaryBackground', '#ffffff');
  const bgSubtle = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderSubtle = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  const accentColor = getColor('accent', '#f59e0b');

  // Structural color: risked is treated same as answered — only the badge + checkbox use yellow
  const getQuestionColor = (opacity = '') => {
    const effectiveState = questionState === 'risked' ? 'answered' : questionState;
    switch (effectiveState) {
      case 'unanswered':
        return isDarkMode ? `#ffffff${opacity}` : `#6b7280${opacity}`;
      case 'answered':
      default:
        if (isDarkMode) {
          const primaryColor = getColor('primary', '#3b82f6');
          return opacity ? `${primaryColor}${opacity}` : primaryColor;
        }
        return `${getColor('primary', '#3b82f6')}${opacity}`;
    }
  };

  const getBorderColor = () => {
    const effectiveState = questionState === 'risked' ? 'answered' : questionState;
    switch (effectiveState) {
      case 'unanswered':
        return isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(107,114,128,0.4)';
      case 'answered':
      default:
        return isDarkMode ? '#4a8ae8' : getColor('primary', '#3b82f6');
    }
  };

  const getSecondaryBorderColor = () => {
    const effectiveState = questionState === 'risked' ? 'answered' : questionState;
    switch (effectiveState) {
      case 'unanswered':
        return isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(107,114,128,0.25)';
      case 'answered':
      default:
        return isDarkMode ? `${getColor('primary', '#3b82f6')}80` : `${getColor('primary', '#3b82f6')}40`;
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
      id={`quiz-question-${id}`}
      data-question-index={index}
      data-question-number={displayIndex}
      className={`rounded-lg overflow-hidden shadow-sm mb-4 scroll-mt-6 transition-all duration-200 ${className}`}
      style={{ 
        backgroundColor: bgCard,
        borderTop: `2px solid ${getSecondaryBorderColor()}`,
        borderRight: `2px solid ${getSecondaryBorderColor()}`,
        borderBottom: `2px solid ${getSecondaryBorderColor()}`,
        borderLeft: `4px solid ${getBorderColor()}`
      }}
    >
      <div>
        {/* Header: Número de pregunta */}
        <div 
          className="px-4 py-3 border-b"
          style={{ 
            backgroundColor: isDarkMode 
              ? (questionState === 'unanswered' ? 'rgba(255,255,255,0.03)' : getQuestionColor('10'))
              : getQuestionColor('08'),
            borderColor: isDarkMode 
              ? (questionState === 'unanswered' ? 'rgba(255,255,255,0.1)' : getQuestionColor('20'))
              : getQuestionColor('10')
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center justify-center rounded-full font-bold text-xs"
                style={{ 
                  width: '28px',
                  height: '28px',
                  backgroundColor: getBorderColor(),
                  color: questionState === 'unanswered' && isDarkMode 
                    ? getColor('secondaryBackground', '#1f2937') 
                    : '#ffffff'
                }}
              >
                {displayIndex}
              </div>
              {questionState === 'unanswered' && (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : `${getQuestionColor()}20`,
                    color: isDarkMode ? '#ffffff' : getQuestionColor()
                  }}
                >
                  <Circle size={12} />
                  <span>{t('quizzes.question.unanswered')}</span>
                </div>
              )}
              {questionState === 'risked' && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    color: accentColor
                  }}
                >
                  <TrendingDown size={12} />
                  <span>{t('quizzes.question.withRisk')}</span>
                </div>
              )}
              {questionState === 'answered' && (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ 
                    backgroundColor: isDarkMode ? `${getColor('primary', '#3b82f6')}30` : getQuestionColor('20'),
                    color: isDarkMode ? '#93c5fd' : getQuestionColor() // Azul más claro en dark mode
                  }}
                >
                  <CheckCircle size={12} />
                  <span>{t('quizzes.question.answered')}</span>
                </div>
              )}
            </div>
            
            {selectedAnswer !== null && selectedAnswer !== undefined && !isSubmitted && (
              <button
                type="button"
                onClick={() => onClearAnswer(id)}
                title={t('quizzes.question.clearSelection')}
                className="p-1.5 rounded-lg transition-all duration-200"
                style={{ 
                  backgroundColor: 'transparent',
                  color: textSecondary
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(239,68,68,0.2)' : '#fee2e2';
                  e.currentTarget.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = textSecondary;
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Título de la pregunta */}
        <div className="px-4 py-3">
          <h3 
            className="text-sm font-medium leading-relaxed"
            style={{ color: textPrimary }}
            dangerouslySetInnerHTML={{ __html: questionTitle || '' }}
          />
        </div>

        {/* Opciones de respuesta */}
        <div className="px-4 pb-3 space-y-2">
          {options.map((option, optionIndex) => {
            const isSelected = selectedAnswer !== null && selectedAnswer !== undefined && option.id === selectedAnswer;

            return (
              <label 
                key={option.id} 
                className="flex items-start cursor-pointer p-3 rounded-lg transition-all duration-200 group"
                style={{
                  backgroundColor: isSelected 
                    ? getQuestionColor('15')
                    : 'transparent',
                  border: `2px solid ${isSelected 
                    ? getQuestionColor()
                    : isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                  }`
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1">
                  {/* Radio button customizado */}
                  <div
                    className="flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
                    style={{
                      width: '18px',
                      height: '18px',
                      border: `2px solid ${isSelected 
                        ? getQuestionColor()
                        : isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)'
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
                          width: '6px',
                          height: '6px',
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
                    className="flex items-center justify-center rounded font-bold text-[10px] transition-all duration-200 flex-shrink-0"
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: isSelected
                        ? getQuestionColor()
                        : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      color: isSelected ? '#ffffff' : textPrimary
                    }}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </div>
                  
                  {/* Texto de la opción */}
                  <span 
                    className="text-base leading-relaxed transition-colors duration-200"
                    style={{ 
                      color: isSelected 
                        ? textPrimary
                        : textPrimary,
                      fontWeight: isSelected ? '600' : '500'
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
            style={{ borderColor: borderSubtle }}
          >
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center justify-between w-full text-left px-6 py-4 transition-colors duration-200"
              style={{ 
                backgroundColor: showExplanation 
                  ? bgSubtle
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!showExplanation) {
                  e.currentTarget.style.backgroundColor = bgSubtle;
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
                    backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)'
                  }}
                >
                  <Info size={18} style={{ color: getColor('primary', '#3b82f6') }} />
                </div>
                <span 
                  className="text-sm font-semibold"
                  style={{ color: textPrimary }}
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
                <ChevronDown size={20} style={{ color: textPrimary }} />
              </div>
            </button>
            
            {showExplanation && (
              <div 
                className="px-6 pb-5"
                style={{ 
                  backgroundColor: bgSubtle
                }}
              >
                <div 
                  className="p-4 rounded-lg"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : getColor('background', '#ffffff'),
                    border: `1px solid ${borderSubtle}`
                  }}
                >
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ color: textSecondary }}
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
            style={{ borderColor: borderSubtle }}
          >
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-between w-full text-left px-6 py-4 transition-colors duration-200"
              style={{ 
                backgroundColor: showStats 
                  ? `${getColor('accent', '#f59e0b')}15`
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!showStats) {
                  e.currentTarget.style.backgroundColor = `${getColor('accent', '#f59e0b')}08`;
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
                    backgroundColor: `${getColor('accent', '#f59e0b')}20`
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
                  backgroundColor: `${getColor('accent', '#f59e0b')}10`
                }}
              >
                <div 
                  className="p-4 rounded-lg"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : getColor('background', '#ffffff'),
                    border: `1px solid ${getColor('accent', '#f59e0b')}30`
                  }}
                >
                  {meta?._question_fail_rate !== undefined ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-sm"
                          style={{ color: textSecondary }}
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
                          backgroundColor: `${getColor('accent', '#f59e0b')}20`
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
                            backgroundColor: `${getColor('accent', '#f59e0b')}15`,
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
                      style={{ color: textSecondary }}
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
            className="px-4 py-3 border-t"
            style={{ 
              backgroundColor: bgSubtle,
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
                  border: `2px solid ${isRisked ? getColor('accent', '#f59e0b') : isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)'}`,
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
                    : textSecondary
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

// 🔥 FIX: Memoize Question component to prevent unnecessary re-renders
export default React.memo(Question);