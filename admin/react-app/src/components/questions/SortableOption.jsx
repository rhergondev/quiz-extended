import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Check } from 'lucide-react';

// Este es el componente visual de una opción, ahora hecho arrastrable
export const SortableOption = ({
  id,
  option,
  index,
  isReadOnly,
  isMultipleChoice,
  handleOptionChange,
  setCorrectAnswer,
  removeOption,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 bg-gray-50 p-2 rounded-md"
    >
      {/* Handle para arrastrar */}
      {!isReadOnly && (
        <button type="button" {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {/* Botón de respuesta correcta */}
      <button
        type="button"
        onClick={() => setCorrectAnswer(index)}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          option.isCorrect
            ? 'bg-green-100 border-green-500'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        disabled={isReadOnly}
      >
        {option.isCorrect && <Check className="h-3 w-3 text-green-600" />}
      </button>

      {/* Input de texto de la opción */}
      <input
        type="text"
        value={option.text}
        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={`Option ${index + 1}`}
        disabled={isReadOnly || !isMultipleChoice}
      />

      {/* Botón de eliminar */}
      {isMultipleChoice && !isReadOnly && (
        <button
          type="button"
          onClick={() => removeOption(index)}
          className="flex-shrink-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};