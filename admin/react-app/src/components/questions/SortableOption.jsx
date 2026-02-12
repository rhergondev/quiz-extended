import React, { useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const SortableOption = ({ id, option, index, isReadOnly, isMultipleChoice, handleOptionChange, setCorrectAnswer, removeOption }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const { getColor, isDarkMode } = useTheme();
    const textareaRef = useRef(null);

    const autoResize = useCallback((el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }, []);

    useEffect(() => {
        autoResize(textareaRef.current);
    }, [option.text, autoResize]);

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
        <div ref={setNodeRef} style={style} className="flex items-start gap-2">
            {!isReadOnly && (
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    style={{
                        cursor: 'move',
                        padding: '2px',
                        marginTop: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: pageColors.textMuted,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
            )}
            <input
                type={isMultipleChoice ? 'checkbox' : 'radio'}
                name={`correct_answer_${id}`}
                checked={option.isCorrect || false}
                onChange={() => setCorrectAnswer(index)}
                disabled={isReadOnly}
                style={{
                    width: '14px',
                    height: '14px',
                    marginTop: '8px',
                    accentColor: isDarkMode ? '#f59e0b' : '#3b82f6'
                }}
            />
            <textarea
                ref={textareaRef}
                value={option.text || ''}
                onChange={(e) => { handleOptionChange(index, 'text', e.target.value); autoResize(e.target); }}
                placeholder={`Opción ${index + 1}`}
                disabled={isReadOnly}
                rows={1}
                style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: pageColors.inputBg,
                    border: `1px solid ${pageColors.border}`,
                    color: pageColors.text,
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    overflow: 'hidden',
                    lineHeight: '1.4',
                    fontFamily: 'inherit'
                }}
            />
            {!isReadOnly && (
                <button
                    type="button"
                    onClick={() => removeOption(index)}
                    style={{
                        padding: '4px',
                        marginTop: '4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};
