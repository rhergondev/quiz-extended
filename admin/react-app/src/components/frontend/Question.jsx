import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

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
  isPracticeMode = false
}) => {

  if (!question) {
    return null;
  }

  const { id, title, meta } = question;
  
  // Manejar tanto title.rendered como title directo
  const questionTitle = typeof title === 'object' && title?.rendered ? title.rendered : title;
  const options = meta?._question_options || [];
  const displayIndex = questionNumber !== undefined ? questionNumber : index + 1;

  // Handler unificado para cambios de respuesta
  const handleAnswerSelect = (questionId, optionId) => {
    if (isPracticeMode && onAnswerChange) {
      onAnswerChange(optionId);
    } else if (onSelectAnswer) {
      onSelectAnswer(questionId, optionId);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
      <div className="p-6">
        {/* Número de pregunta y título */}
        <div className="mb-6">
          <h3 
            className="text-base text-gray-800 font-medium"
            dangerouslySetInnerHTML={{ __html: `${displayIndex}. ${questionTitle || ''}` }}
          />
        </div>

          {/* Opciones de respuesta */}
          <div className="space-y-3">
            {options.map((option, optionIndex) => {
              const isSelected = selectedAnswer !== null && selectedAnswer !== undefined && option.id === selectedAnswer;
              
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
          
          {/* Checkbox de Riesgo y Botón de Limpiar */}
          {selectedAnswer !== null && selectedAnswer !== undefined && !isSubmitted && !isPracticeMode && onToggleRisk && onClearAnswer && (
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