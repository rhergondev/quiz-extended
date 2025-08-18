import React from 'react';
import Button from './Button'; // Tu componente de botón reutilizable
import { Check, Trash } from '../shared/icons';

const MultipleChoiceEditor = ({ options, onOptionChange, onSetCorrect, onAddOption, onRemoveOption }) => {
  return (
    // Contenedor principal con un ancho máximo para controlar el ensanchamiento.
    <div className="w-full mx-auto my-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Opciones de Respuesta
      </label>

      {/* Contenedor para la lista de opciones con espaciado vertical */}
      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2">
            
            {/* Input para el texto de la opción. Crecerá para ocupar el espacio disponible. */}
            <input
              type="text"
              placeholder={`Opción ${index + 1}`}
              value={option.text}
              onChange={(e) => onOptionChange(option.id, e.target.value)}
              className="
                block w-full px-3 py-2 flex-grow
                border border-gray-300 rounded-md shadow-sm 
                placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 
                sm:text-sm
              "
            />

            {/* Contenedor para los botones de acción (tamaño fijo) */}
            <div className="flex-shrink-0 flex items-center">
              {/* Botón para marcar como correcta */}
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
              
              {/* Botón para eliminar */}
              <button
                type="button"
                onClick={() => onRemoveOption(option.id)}
                className="
                  bg-white text-gray-500 p-2 rounded-r-md border-t border-b border-r border-gray-300
                  hover:bg-red-500 hover:text-white transition-colors duration-150
                "
                title="Eliminar opción"
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botón para añadir más opciones, con un margen superior */}
      <div className="mt-4">
        <Button onClick={onAddOption} type="button" variant="secondary">
          + Añadir Opción
        </Button>
      </div>
    </div>
  );
};


export default MultipleChoiceEditor;