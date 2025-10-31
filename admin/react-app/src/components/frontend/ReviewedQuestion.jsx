import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Bookmark, MessageSquare } from 'lucide-react';
import { formatQuestionForDisplay } from '../../api/utils/questionDataUtils';
import { useTranslation } from 'react-i18next';
import { toggleFavoriteQuestion } from '../../api/services/favoriteService';
import QuestionFeedbackModal from './QuestionFeedbackModal';
import QEButton from '../common/QEButton';

const ReviewedQuestion = ({ question, result, index, displayIndex }) => {
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
  const { answer_given, correct_answer, is_correct, is_risked, error_percentage, total_answers } = result;

  const getOptionStyle = (optionId) => {
    const isSelected = optionId == answer_given;
    const isCorrectOption = optionId == correct_answer;

    if (isCorrectOption) {
      // Respuesta correcta
      if (is_risked) {
        // Con riesgo: solo borde verde
        return 'border-2 border-green-500 bg-white text-green-700 font-semibold';
      } else {
        // Sin riesgo: relleno verde
        return 'border-2 border-green-500 bg-green-50 text-green-800 font-semibold';
      }
    }
    
    if (isSelected && !is_correct) {
      // Respuesta incorrecta seleccionada
      if (is_risked) {
        // Con riesgo: solo borde rojo
        return 'border-2 border-red-500 bg-white text-red-700 font-semibold';
      } else {
        // Sin riesgo: relleno rojo
        return 'border-2 border-red-500 bg-red-50 text-red-800 font-semibold';
      }
    }
    
    return 'border-2 border-gray-200 bg-white';
  };

  // Función para manejar el toggle con teclado para accesibilidad
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      <div id={`question-${displayIndex || question.id}`} className="qe-bg-background border qe-border-primary rounded-lg mb-6 shadow-sm scroll-mt-6">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3
                className="text-base qe-text-primary font-medium"
                dangerouslySetInnerHTML={{ __html: title }}
              />
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {/* Botón de Favorito */}
              <QEButton 
                variant="ghost"
                onClick={handleToggleFavorite}
                disabled={isTogglingFavorite}
                className={`transition-colors p-1 ${
                  isFavorite 
                    ? 'qe-text-accent hover:qe-text-accent' 
                    : 'hover:qe-text-accent'
                } ${isTogglingFavorite ? 'opacity-50 cursor-wait' : ''}`}
                title="Marcar como favorita"
              >
                <Bookmark className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </QEButton>
              
              {/* Botón de Comentario */}
              <QEButton 
                variant="ghost"
                onClick={() => handleOpenModal('feedback')}
                className="qe-hover-primary p-1" 
                title="Comentario o sugerencia"
              >
                <MessageSquare className="w-5 h-5" />
              </QEButton>

              {/* Botón de Impugnación */}
              <QEButton 
                variant="ghost"
                onClick={() => handleOpenModal('challenge')}
                className="hover:qe-text-secondary p-1" 
                title="Impugnar pregunta"
              >
                <AlertTriangle className="w-5 h-5" />
              </QEButton>

              {/* Indicador de riesgo y corrección */}
              {is_risked && (
                <span className="flex items-center text-xs qe-text-accent font-semibold px-2 py-1 qe-bg-accent-light rounded" title="Marcada con riesgo">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Riesgo
                </span>
              )}
              {is_correct ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : answer_given === null ? (
                <XCircle className="w-6 h-6 text-gray-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
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

          {/* Indicador de pregunta sin contestar */}
          {answer_given === null && (
            <div className="mt-4 p-3 bg-gray-100 border-l-4 border-gray-400 rounded">
              <p className="text-sm text-gray-700 font-semibold">
                ⚠️ Esta pregunta no fue contestada
              </p>
            </div>
          )}
        </div>

        {/* Estadísticas de error de la pregunta - Siempre visible */}
        <div className="mx-6 mb-4 p-3 qe-bg-primary-light qe-border-primary rounded-lg">
          <p className="text-sm qe-text-primary">
            <span className="font-semibold">Estadística de la pregunta:</span>
            <br />
            {total_answers > 0 ? (
              <>
                Esta pregunta ha sido fallada por el <span className="font-bold">{error_percentage}%</span> del alumnado ({total_answers} respuestas totales).
              </>
            ) : (
              <span className="text-gray-600">No hay suficientes datos estadísticos disponibles.</span>
            )}
          </p>
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