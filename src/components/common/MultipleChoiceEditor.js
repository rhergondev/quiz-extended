import React, { useState } from 'react';
import Button from './Button';
import { Check, Trash } from '../shared/icons';

const MultipleChoiceEditor = ({ options, onOptionChange, onSetCorrect, onAddOption, onRemoveOption, onReorder }) => {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const hasCorrectAnswer = options.some(opt => opt.isCorrect);

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggingIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (index !== draggingIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, destIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    const srcIndexStr = e.dataTransfer.getData('text/plain');
    if (srcIndexStr === '') {
      setDraggingIndex(null);
      return;
    }
    
    const srcIndex = Number(srcIndexStr);
    if (Number.isNaN(srcIndex) || srcIndex === destIndex) {
      setDraggingIndex(null);
      return;
    }

    const newOptions = [...options];
    const [moved] = newOptions.splice(srcIndex, 1);
    newOptions.splice(destIndex, 0, moved);

    if (onReorder) {
      onReorder(newOptions);
    }
    setDraggingIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-full mx-auto my-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Opciones de Respuesta
      </label>

      {/* Alerta si no hay respuesta correcta */}
      {!hasCorrectAnswer && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-700">
            ⚠️ Debes marcar al menos una opción como correcta
          </p>
        </div>
      )}

      <div className="space-y-3">
        {options.map((option, index) => (
          <div
            key={option.id}
            className={`
              flex items-center gap-2 p-2 rounded-md transition-all duration-200
              ${draggingIndex === index ? 'opacity-50 scale-105 rotate-1 z-10 bg-blue-50' : ''}
              ${dragOverIndex === index ? 'border-2 border-blue-400 border-dashed bg-blue-50' : 'border border-transparent'}
              ${draggingIndex !== null && draggingIndex !== index ? 'opacity-75' : ''}
            `}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{ 
              cursor: draggingIndex === index ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            {/* Icono de drag handle */}
            <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
              </svg>
            </div>
            
            {/* Input para el texto de la opción */}
            <input
              type="text"
              placeholder={`Opción ${String.fromCharCode(65 + index)}: ${index === 0 ? 'ej. Madrid' : index === 1 ? 'ej. Barcelona' : 'Escribe aquí...'}`}
              value={option.text}
              onChange={(e) => onOptionChange(option.id, e.target.value)}
              className="
                block w-full px-3 py-2 flex-grow
                border border-gray-300 rounded-md shadow-sm 
                placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                sm:text-sm
              "
              onDragStart={(e) => e.preventDefault()} // Prevenir drag del input
            />

            {/* Contenedor para los botones de acción */}
            <div className="flex-shrink-0 flex items-center">
              <button
                type="button"
                onClick={() => onSetCorrect(option.id)}
                className={`
                  p-2 border rounded-l-md transition-colors duration-150
                  ${option.isCorrect 
                    ? 'bg-green-500 text-white hover:bg-green-600 border-green-500' 
                    : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-500'
                  }
                `}
                title="Marcar como correcta"
              >
                <Check className="h-5 w-5" />
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (options.length > 2) onRemoveOption(option.id);
                }}
                disabled={options.length <= 2}
                className={`
                  p-2 rounded-r-md border-t border-b border-r transition-colors duration-150
                  ${options.length <= 2
                    ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-500 hover:bg-red-500 hover:text-white border-gray-300'
                  }
                `}
                title={options.length <= 2 ? 'Se requieren al menos 2 opciones' : 'Eliminar opción'}
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botón para añadir opción con límite */}
      <div className="mt-4">
        <Button 
          onClick={onAddOption} 
          type="button" 
          variant="secondary"
          disabled={options.length >= 6}
        >
          {options.length >= 6 ? 'Máximo 6 opciones' : '+ Añadir Opción'}
        </Button>
      </div>
    </div>
  );
};

export default MultipleChoiceEditor;