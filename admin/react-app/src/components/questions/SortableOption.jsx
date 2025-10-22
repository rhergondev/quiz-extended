import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

export const SortableOption = ({ id, option, index, isReadOnly, isMultipleChoice, handleOptionChange, setCorrectAnswer, removeOption }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2">
            {!isReadOnly && (
                <button type="button" {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600 p-1">
                    <GripVertical className="h-5 w-5" />
                </button>
            )}
            <input
                type={isMultipleChoice ? 'checkbox' : 'radio'}
                name={`correct_answer_${id}`}
                checked={option.isCorrect || false}
                onChange={() => setCorrectAnswer(index)}
                disabled={isReadOnly}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <input
                type="text"
                value={option.text || ''}
                onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                placeholder={`Opción ${index + 1}`}
                disabled={isReadOnly}
                className="flex-1 input border-gray-300 rounded-md"
            />
            {!isReadOnly && (
                <button type="button" onClick={() => removeOption(index)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};
