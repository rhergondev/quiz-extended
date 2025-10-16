import React, { useState } from 'react'; // Importamos useState
import { Bookmark, AlertCircle, Trash2 } from 'lucide-react';

// Importamos el modal que creamos en el paso anterior
import QuestionFeedbackModal from './QuestionFeedbackModal';

const Question = ({ 
  question, 
  index, 
  onSelectAnswer, 
  selectedAnswer,
  isRisked,
  onToggleRisk,
  onClearAnswer,
  isSubmitted 
}) => {
  // --- AÑADIDO: Estado para controlar la visibilidad del modal ---
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  if (!question) {
    return null;
  }

  // Desestructuramos title de 'question' para el modal
  const { id, title, meta } = question; 
  const options = meta?._question_options || [];

  return (
    <> {/* Usamos un fragmento para envolver el componente y el modal */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 flex shadow-sm">
        {/* Columna Izquierda */}
        <div className="w-24 flex-shrink-0 p-4 border-r border-gray-200 text-center space-y-3 bg-gray-50/70 rounded-l-lg">
          <p className="font-bold text-gray-700">Pregunta {index + 1}</p>
          <div className="flex flex-col items-center space-y-2">
              <button className="text-gray-400 hover:text-primary" title="Marcar pregunta">
                  <Bookmark className="w-5 h-5" />
              </button>
              
              {/* --- MODIFICADO: Este botón ahora abre el modal --- */}
              <button 
                onClick={() => setIsFeedbackModalOpen(true)}
                className="text-gray-400 hover:text-red-500" 
                title="Reportar incidencia"
                disabled={isSubmitted} // Deshabilitamos si el examen está enviado
              >
                  <AlertCircle className="w-5 h-5" />
              </button>
          </div>
        </div>

        {/* Columna Derecha (Sin cambios en su lógica interna) */}
        <div className="p-6 flex-1">
          <h3 
            className="text-base text-gray-800 mb-6"
            dangerouslySetInnerHTML={{ __html: title.rendered }} // Pasamos el title renderizado
          />

          {/* Opciones de respuesta */}
          <div className="space-y-3">
            {options.map((option, optionIndex) => {
              const isSelected = selectedAnswer !== null && selectedAnswer !== undefined && option.id === selectedAnswer;
              
              const selectionStyle = isSelected 
                ? 'border-primary bg-primary/10'
                : 'border-gray-200 hover:bg-gray-50';
              
              const textStyle = isSelected
                ? 'text-primary font-semibold'
                : 'text-gray-700';

              return (
                <label key={option.id} className={`flex items-center cursor-pointer p-3 border-2 rounded-lg transition-colors ${selectionStyle}`}>
                  <input
                    type="radio"
                    name={`question-${id}`}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => onSelectAnswer(id, option.id)}
                    disabled={isSubmitted}
                    className="h-4 w-4 text-primary border-gray-300 focus:ring-yellow-500"
                  />
                  <span className={`ml-3 text-sm transition-colors ${textStyle}`}>{String.fromCharCode(65 + optionIndex)}) {option.text}</span>
                </label>
              );
            })}
          </div>
          
          {/* Checkbox de Riesgo y Botón de Limpiar */}
          {selectedAnswer !== null && selectedAnswer !== undefined && !isSubmitted && (
            <div className="mt-6 border-t pt-4 flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={isRisked}
                        onChange={() => onToggleRisk(id)}
                        disabled={isSubmitted}
                        className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-600 group-hover:text-orange-600 transition-colors">Marcar con riesgo</span>
                </label>

                <button
                  type="button"
                  onClick={() => onClearAnswer(id)}
                  title="Limpiar selección"
                  className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
            </div>
          )}
        </div>
      </div>

      {/* --- AÑADIDO: Renderizado condicional del modal --- */}
      {isFeedbackModalOpen && (
        <QuestionFeedbackModal
          question={question} // Pasamos el objeto 'question' completo
          onClose={() => setIsFeedbackModalOpen(false)}
        />
      )}
    </>
  );
};

export default Question;