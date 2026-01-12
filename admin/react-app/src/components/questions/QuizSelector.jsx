import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Check, X } from 'lucide-react';
import useQuizzes from '../../hooks/useQuizzes';
import { useDebounce } from '../../api/utils/debounceUtils';
import { useTheme } from '../../contexts/ThemeContext';

const QuizSelector = ({ availableQuizzes, selectedQuizIds, onChange, disabled }) => {
    const { t } = useTranslation();
    const { getColor, isDarkMode } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const pageColors = {
        text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
        textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
        accent: getColor('accent', '#f59e0b'),
        primary: getColor('primary', '#3b82f6'),
        inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
        bgSubtle: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        hoverBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    };

    const { quizzes, loading } = useQuizzes({ search: debouncedSearchTerm, autoFetch: true, perPage: 100 });

    const handleToggleQuiz = (quizId) => {
        if (disabled) return;
        const newSelection = selectedQuizIds.includes(quizId)
            ? selectedQuizIds.filter(id => id !== quizId)
            : [...selectedQuizIds, quizId];
        onChange(newSelection);
    };
    
    const quizzesToList = debouncedSearchTerm ? quizzes : availableQuizzes;

    return (
        <div>
            <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>{t('admin.questionModal.assignToTests')}</label>
            <div className="relative mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4" style={{ color: pageColors.textMuted }} />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('admin.questionModal.searchTests')}
                    className="w-full pl-10 pr-3 py-2 text-sm border rounded-md"
                    style={{
                        backgroundColor: pageColors.inputBg,
                        borderColor: pageColors.border,
                        color: pageColors.text
                    }}
                    disabled={disabled}
                />
            </div>
            <div 
                className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1"
                style={{
                    backgroundColor: pageColors.bgSubtle,
                    borderColor: pageColors.border
                }}
            >
                {loading && <p className="text-xs text-center py-2" style={{ color: pageColors.textMuted }}>{t('common.searching')}</p>}
                {!loading && (quizzesToList || []).map(quiz => {
                    const isSelected = selectedQuizIds.includes(quiz.id);
                    return (
                        <div
                            key={quiz.id}
                            onClick={() => handleToggleQuiz(quiz.id)}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                            style={{
                                backgroundColor: isSelected ? pageColors.hoverBg : 'transparent'
                            }}
                            onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = pageColors.hoverBg)}
                            onMouseLeave={(e) => !disabled && !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            <div 
                                className="w-5 h-5 border rounded flex items-center justify-center flex-shrink-0"
                                style={{
                                    backgroundColor: isSelected ? pageColors.primary : 'transparent',
                                    borderColor: isSelected ? pageColors.primary : pageColors.border
                                }}
                            >
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className="text-sm" style={{ color: pageColors.text }}>{quiz.title?.rendered || quiz.title}</span>
                        </div>
                    );
                })}
                 {!loading && (quizzesToList || []).length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: pageColors.textMuted }}>{t('admin.questionModal.noTestsFound')}</p>
                 )}
            </div>
        </div>
    );
};


export default QuizSelector;

