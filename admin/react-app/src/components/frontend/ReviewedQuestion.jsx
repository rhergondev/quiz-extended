import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatQuestionForDisplay } from '../../api/utils/questionDataUtils';
import { useTranslation } from 'react-i18next';

const ReviewedQuestion = ({ question, result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  const formattedQuestion = formatQuestionForDisplay(question);

  if (!formattedQuestion || !result) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg flex items-center">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
        <p className="text-sm text-red-700">Error: Invalid question data or result provided.</p>
      </div>
    );
  }

  const { title, meta, fullExplanation } = formattedQuestion;
  const options = meta?._question_options || [];
  const { answer_given, correct_answer, is_correct, is_risked } = result;

  const getOptionStyle = (optionId) => {
    const isSelected = optionId == answer_given;
    const isCorrect = optionId == correct_answer;

    if (isCorrect) {
      return 'border-green-500 bg-green-50 text-green-800 font-semibold';
    }
    if (isSelected && !is_correct) {
      return 'border-red-500 bg-red-50 text-red-800 font-semibold';
    }
    return 'border-gray-200 bg-white';
  };

  // Función para manejar el toggle con teclado para accesibilidad
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3
            className="text-base text-gray-800"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <div className="flex items-center space-x-2">
            {is_risked && (
              <span className="flex items-center text-xs text-yellow-600 font-semibold" title="Marcada con riesgo">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Riesgo
              </span>
            )}
            {is_correct ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          {options.map((option, index) => (
            <div
              key={option.id}
              className={`flex items-center p-3 border-2 rounded-lg transition-colors ${getOptionStyle(option.id)}`}
            >
              <span className="text-sm">
                {String.fromCharCode(65 + index)}) {option.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🔥 CAMBIO: Se usa un DIV en lugar de un BUTTON */}
      {fullExplanation && (
        <div className="border-t border-gray-200">
          {/* Botón para expandir/contraer ahora es un div */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={handleKeyDown}
            role="button" // Atributo de accesibilidad
            tabIndex="0"   // Hace que el div sea enfocable
            aria-expanded={isExpanded}
            className="flex justify-between items-center w-full px-7 pt-4 pb-2 text-left cursor-pointer"
          >
            <p className="font-semibold text-gray-700">{t('questions.fields.explanation')}</p>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>

          {/* Contenido de la explicación (condicional) */}
          {isExpanded && (
            <div className="px-8 pb-4">
              <div className="bg-gray-50 rounded-md p-4">
                <p
                  className="text-sm text-gray-600"
                  dangerouslySetInnerHTML={{ __html: fullExplanation }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewedQuestion;