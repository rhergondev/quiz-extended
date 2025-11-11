import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Info, TrendingDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

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

  if (!question) {
    return null;
  }

  const { id, title, meta } = question;
  
  // Log para verificar isPracticeMode
  console.log(`📋 Question ${id} - Props:`, { 
    isPracticeMode, 
    hasExplanation: !!meta?._question_explanation,
    hasStats: meta?._question_fail_rate !== undefined,
    disabled,
    isSubmitted
  });
  
  // Manejar tanto title.rendered como title directo
  const questionTitle = typeof title === 'object' && title?.rendered ? title.rendered : title;
  const options = meta?._question_options || [];
  const displayIndex = questionNumber !== undefined ? questionNumber : index + 1;

  // Handler unificado para cambios de respuesta
  const handleAnswerSelect = (questionId, optionId) => {
    console.log('🔘 Question.jsx - Selección de respuesta:', { 
      questionId, 
      optionId, 
      tipoQuestionId: typeof questionId,
      tipoOptionId: typeof optionId,
      isPracticeMode,
      hasOnAnswerChange: !!onAnswerChange,
      hasOnSelectAnswer: !!onSelectAnswer
    });
    
    if (isPracticeMode && onAnswerChange) {
      onAnswerChange(optionId);
    } else if (onSelectAnswer) {
      onSelectAnswer(questionId, optionId);
    }
  };

  return (
    <div 
      id={`quiz-question-${displayIndex}`} 
      className="p-6 rounded-xl shadow-lg border-2 mb-6 scroll-mt-6"
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      <div>
        {/* Número de pregunta y título */}
        <div className="mb-6">
          <h3 
            className="text-base qe-text-primary font-medium"
            dangerouslySetInnerHTML={{ __html: `${displayIndex}. ${questionTitle || ''}` }}
          />
        </div>

          {/* Opciones de respuesta */}
          <div className="space-y-3">
            {options.map((option, optionIndex) => {
              const isSelected = selectedAnswer !== null && selectedAnswer !== undefined && option.id === selectedAnswer;
              
              console.log(`🎨 Renderizando opción ${option.id} de pregunta ${id}:`, {
                optionId: option.id,
                selectedAnswer,
                isSelected,
                tipoOptionId: typeof option.id,
                tipoSelectedAnswer: typeof selectedAnswer,
                comparacionEstricta: option.id === selectedAnswer,
                comparacionLaxa: option.id == selectedAnswer
              });
              
              const selectionStyle = isSelected 
                ? 'border-2'
                : 'border-2 border-gray-200 hover:bg-gray-50';
              
              const textStyle = isSelected
                ? 'font-semibold'
                : 'text-gray-700';

              return (
                <label 
                  key={option.id} 
                  className={`flex items-center cursor-pointer p-3 rounded-lg transition-colors ${selectionStyle}`}
                  style={isSelected ? {
                    borderColor: 'var(--qe-primary)',
                    backgroundColor: 'var(--qe-primary-light)'
                  } : {}}
                >
                  <input
                    type="radio"
                    name={`question-${id}`}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(id, option.id)}
                    disabled={isSubmitted || disabled}
                    className="h-4 w-4 border-gray-300"
                    style={{ accentColor: 'var(--qe-primary)' }}
                  />
                  <span 
                    className={`ml-3 text-sm transition-colors ${textStyle}`}
                    style={isSelected ? { color: 'var(--qe-primary)' } : {}}
                  >
                    {String.fromCharCode(65 + optionIndex)}) {option.text}
                  </span>
                </label>
              );
            })}
          </div>
          
          {/* Explanation Section - Solo en modo práctica o modo zen */}
          {isPracticeMode && (
            <div className="mt-4 border-t pt-4">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center justify-between w-full text-left p-3 qe-bg-primary-light qe-hover-light-primary rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Info className="w-5 h-5 qe-icon-primary" />
                  <span className="text-sm font-semibold qe-text-primary">
                    Explicación de la respuesta
                  </span>
                </div>
                {showExplanation ? (
                  <ChevronUp className="w-5 h-5 qe-icon-primary" />
                ) : (
                  <ChevronDown className="w-5 h-5 qe-icon-primary" />
                )}
              </button>
              
              {showExplanation && (
                <div className="mt-3 p-4 qe-bg-primary-light qe-border-primary rounded-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {meta?._question_explanation || 'No hay explicación disponible para esta pregunta aún.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Statistics Section - Solo en modo práctica o modo zen */}
          {isPracticeMode && (
            <div className="mt-4">
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center justify-between w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-900">
                    Estadísticas de la pregunta
                  </span>
                </div>
                {showStats ? (
                  <ChevronUp className="w-5 h-5 text-orange-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-orange-600" />
                )}
              </button>
              
              {showStats && (
                <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  {meta?._question_fail_rate !== undefined ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          Porcentaje de usuarios que fallan esta pregunta:
                        </span>
                        <span className="text-lg font-bold text-orange-700">
                          {meta._question_fail_rate}%
                        </span>
                      </div>
                      {meta._question_fail_rate > 50 && (
                        <p className="mt-2 text-xs text-orange-600">
                          ⚠️ Esta es una pregunta difícil - más de la mitad de los estudiantes la fallan
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      No hay suficientes datos estadísticos para esta pregunta aún.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Checkbox de Riesgo y Botón de Limpiar - CORREGIDO: usar showRiskSelector */}
          {selectedAnswer !== null && selectedAnswer !== undefined && !isSubmitted && showRiskSelector && onToggleRisk && onClearAnswer && (
            <div className="mt-6 border-t pt-4 flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={isRisked}
                        onChange={() => onToggleRisk(id)}
                        disabled={isSubmitted}
                        className="h-4 w-4 rounded border-gray-300 qe-checkbox-accent"
                        style={{ accentColor: 'var(--qe-accent)' }}
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-600 transition-colors" style={{ '--hover-color': 'var(--qe-accent)' }}>Marcar con riesgo</span>
                </label>

                <button
                  type="button"
                  onClick={() => onClearAnswer(id)}
                  title="Limpiar selección"
                  className="p-2 rounded-full transition-colors"
                  style={{ 
                    color: 'var(--qe-text-secondary, #6b7280)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--qe-text-secondary, #6b7280)';
                  }}
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default Question;