import React from 'react';
import Button from './Button';

const MultipleChoiceEditor = ({ options, onOptionChange, onSetCorrect, onAddOption, onRemoveOption }) => {
  return (
    <div className="my-8">
      <label className="block text-gray-700 text-sm font-bold mb-2">
        Opciones de Respuesta:
      </label>

      {/* Mapeamos cada opción para renderizarla */}
      {options.map((option, index) => (
        <div key={option.id} className="flex items-center mb-3">
          {/* Input para el texto de la opción */}
          <input
            type="text"
            placeholder={`Opción ${index + 1}`}
            value={option.text}
            onChange={(e) => onOptionChange(option.id, e.target.value)}
            className="flex-grow p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {/* Botón para marcar como correcta */}
          <button
            type="button"
            onClick={() => onSetCorrect(option.id)}
            className={`p-2 border-t border-b transition-colors ${option.isCorrect ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Marcar como correcta"
          >
            ✓
          </button>
          {/* Botón para eliminar */}
          <button
            type="button"
            onClick={() => onRemoveOption(option.id)}
            className="bg-red-500 text-white p-2 rounded-r-md hover:bg-red-600 transition-colors"
            title="Eliminar opción"
          >
            X
          </button>
        </div>
      ))}

      {/* Botón para añadir más opciones */}
      <Button onClick={onAddOption} type="button">
        Añadir Opción
      </Button>
    </div>
  );
};

export default MultipleChoiceEditor;