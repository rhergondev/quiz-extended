// src/components/quizzes/ReviewedQuestion.jsx

import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Bookmark, MessageSquare, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toggleFavoriteQuestion } from '../../../api/services/favoriteService';
import QuestionFeedbackModal from '../QuestionFeedbackModal';

/**
 * Muestra una única pregunta revisada, destacando la respuesta del usuario y la correcta.
 * @param {object} props
 * @param {object} props.question - El objeto de la pregunta (id, title, options).
 * @param {object} props.result - El resultado para esta pregunta específica (answer_given, correct_answer_id).
 */
const ReviewedQuestionRecover = ({ question, result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feedback');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const { t } = useTranslation();

  const handleToggleFavorite = async () => {
    if (isTogglingFavorite) return;
    
    setIsTogglingFavorite(true);
    try {
      const response = await toggleFavoriteQuestion(question.id);
      setIsFavorite(response.is_favorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleOpenModal = (type) => {
    setFeedbackType(type);
    setIsFeedbackModalOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  if (!question || !result) {
    return null; // No renderizar si faltan datos
  }

  const { error_percentage, total_answers, is_correct, is_risked } = result;
  const fullExplanation = question.meta?._question_explanation || question.explanation;

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="flex-1 font-semibold text-gray-800" dangerouslySetInnerHTML={{ __html: question.title }} />
            <div className="flex items-center space-x-2 ml-4">
              {/* Botón de Favorito */}
              <button 
                onClick={handleToggleFavorite}
                disabled={isTogglingFavorite}
                className={`transition-colors ${
                  isFavorite 
                    ? 'text-yellow-500 hover:text-yellow-600' 
                    : 'text-gray-400 hover:text-yellow-500'
                } ${isTogglingFavorite ? 'opacity-50 cursor-wait' : ''}`}
                title="Marcar como favorita"
              >
                <Bookmark className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              
              {/* Botón de Comentario */}
              <button 
                onClick={() => handleOpenModal('feedback')}
                className="text-gray-400 hover:text-blue-500" 
                title="Comentario o sugerencia"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* Botón de Impugnación */}
              <button 
                onClick={() => handleOpenModal('challenge')}
                className="text-gray-400 hover:text-red-500" 
                title="Impugnar pregunta"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>

              {/* Indicador de riesgo y corrección */}
              {is_risked && (
                <span className="flex items-center text-xs text-orange-600 font-semibold px-2 py-1 bg-orange-50 rounded" title="Marcada con riesgo">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Riesgo
                </span>
              )}
              {is_correct ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : result.answer_given === null ? (
                <XCircle className="w-6 h-6 text-gray-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
            </div>
          </div>
      
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
                // La opción es la correcta
                if (is_risked) {
                  // Con riesgo: solo borde verde
                  optionClass += "border-2 border-green-500 bg-white text-green-700 font-semibold";
                } else {
                  // Sin riesgo: relleno verde
                  optionClass += "border-2 border-green-500 bg-green-50 text-green-800 font-semibold";
                }
                icon = <Check className="w-5 h-5 text-green-500" />;
              } else if (isUserAnswer && !isCorrectAnswer) {
                // El usuario la marcó y era incorrecta
                if (is_risked) {
                  // Con riesgo: solo borde rojo
                  optionClass += "border-2 border-red-500 bg-white text-red-700 font-semibold";
                } else {
                  // Sin riesgo: relleno rojo
                  optionClass += "border-2 border-red-500 bg-red-50 text-red-800 font-semibold";
                }
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

          {/* Indicador de pregunta sin contestar */}
          {result.answer_given === null && (
            <div className="mt-4 p-3 bg-gray-100 border-l-4 border-gray-400 rounded">
              <p className="text-sm text-gray-700 font-semibold">
                ⚠️ Esta pregunta no fue contestada
              </p>
            </div>
          )}
        </div>

        {/* Estadísticas de error de la pregunta */}
        {total_answers > 0 && (
          <div className="mx-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Información de la pregunta:</span>
              <br />
              Esta pregunta ha sido fallada por el <span className="font-bold">{error_percentage}%</span> del alumnado.
            </p>
          </div>
        )}

        {/* Sección de explicación */}
        {fullExplanation && (
          <div className="border-t border-gray-200">
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              onKeyDown={handleKeyDown}
              role="button"
              tabIndex="0"
              aria-expanded={isExpanded}
              className="flex justify-between items-center w-full px-5 pt-4 pb-2 text-left cursor-pointer"
            >
              <p className="font-semibold text-gray-700">{t('questions.fields.explanation')}</p>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>

            {isExpanded && (
              <div className="px-6 pb-4">
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

export default ReviewedQuestionRecover;