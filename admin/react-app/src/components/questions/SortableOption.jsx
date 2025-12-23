import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const SortableOption = ({ id, option, index, isReadOnly, isMultipleChoice, handleOptionChange, setCorrectAnswer, removeOption }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const { getColor, isDarkMode } = useTheme();
    
    const pageColors = {
        text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
        textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
        inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
        border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    };
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2">
            {!isReadOnly && (
                <button type="button" {...attributes} {...listeners} className="cursor-move p-1" style={{ color: pageColors.textMuted }}>
                    <GripVertical className="h-5 w-5" />
                </button>
            )}
            <input
                type={isMultipleChoice ? 'checkbox' : 'radio'}
                name={`correct_answer_${id}`}
                checked={option.isCorrect || false}
                onChange={() => setCorrectAnswer(index)}
                disabled={isReadOnly}
                className="h-4 w-4 rounded"
            />
            <input
                type="text"
                value={option.text || ''}
                onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                placeholder={`Opción ${index + 1}`}
                disabled={isReadOnly}
                className="flex-1 input rounded-md"
                style={{
                    backgroundColor: pageColors.inputBg,
                    borderColor: pageColors.border,
                    border: `1px solid ${pageColors.border}`,
                    color: pageColors.text
                }}
            />
            {!isReadOnly && (
                <button type="button" onClick={() => removeOption(index)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};
