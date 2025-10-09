import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const ReviewedQuestion = ({ question, result }) => {
  if (!question || !result) {
    return null;
  }

  const { title, meta } = question;
  const options = meta?._question_options || [];
  const { answer_given, correct_answer, is_correct, is_risked } = result;

  const getOptionStyle = (optionId) => {
    // Usamos '==' para manejar la posible diferencia de tipos (ej: número vs. string)
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
    </div>
  );
};

export default ReviewedQuestion;