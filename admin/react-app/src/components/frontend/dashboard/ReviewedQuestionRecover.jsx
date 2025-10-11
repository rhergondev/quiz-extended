// src/components/quizzes/ReviewedQuestion.jsx

import React from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Muestra una única pregunta revisada, destacando la respuesta del usuario y la correcta.
 * @param {object} props
 * @param {object} props.question - El objeto de la pregunta (id, title, options).
 * @param {object} props.result - El resultado para esta pregunta específica (answer_given, correct_answer_id).
 */
const ReviewedQuestionRecover = ({ question, result }) => {
  const { t } = useTranslation();

  if (!question || !result) {
    return null; // No renderizar si faltan datos
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="font-semibold text-gray-800" dangerouslySetInnerHTML={{ __html: question.title }} />
      
      <div className="mt-3 space-y-2">
        {question.options.map((option, index) => {
          // 🔥 LÓGICA CLAVE: Comparamos los IDs para determinar el estado de cada opción
          const optionIdStr = option.id.toString();
          const userAnswerIdStr = result.answer_given != null ? result.answer_given.toString() : null;
          const correctAnswerIdStr = result.correct_answer_id != null ? result.correct_answer_id.toString() : null;

          const isUserAnswer = optionIdStr === userAnswerIdStr;
          const isCorrectAnswer = optionIdStr === correctAnswerIdStr;
          
          let optionClass = "flex items-center justify-between p-3 rounded-md border text-sm ";
          let icon = null;

          if (isCorrectAnswer) {
            // La opción es la correcta (siempre verde)
            optionClass += "bg-green-50 border-green-200 text-green-800 font-semibold";
            icon = <Check className="w-5 h-5 text-green-500" />;
          } else if (isUserAnswer && !isCorrectAnswer) {
            // El usuario la marcó y era incorrecta (roja)
            optionClass += "bg-red-50 border-red-200 text-red-800";
            icon = <X className="w-5 h-5 text-red-500" />;
          } else {
            // Opción normal, no seleccionada e incorrecta
            optionClass += "bg-gray-50 border-gray-200 text-gray-700";
          }

          return (
            <div key={option.id} className={optionClass}>
              <span dangerouslySetInnerHTML={{ __html: option.text }} />
              {icon}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewedQuestionRecover;