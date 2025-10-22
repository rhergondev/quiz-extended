import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Check, X } from 'lucide-react';
import useQuizzes from '../../hooks/useQuizzes';
import { useDebounce } from '../../api/utils/debounceUtils'; // Asumiendo que tienes un hook de debounce

const QuizSelector = ({ availableQuizzes, selectedQuizIds, onChange, disabled }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const { quizzes, loading } = useQuizzes({ search: debouncedSearchTerm, autoFetch: true, perPage: 100 });

    const handleToggleQuiz = (quizId) => {
        if (disabled) return;
        const newSelection = selectedQuizIds.includes(quizId)
            ? selectedQuizIds.filter(id => id !== quizId)
            : [...selectedQuizIds, quizId];
        onChange(newSelection);
    };
    
    // Mostramos los resultados de la búsqueda si hay un término, si no, mostramos todos los disponibles.
    const quizzesToList = debouncedSearchTerm ? quizzes : availableQuizzes;

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Asignar a Cuestionarios</label>
            <div className="relative mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar cuestionarios..."
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md"
                    disabled={disabled}
                />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1 bg-gray-50">
                {loading && <p className="text-xs text-gray-500 text-center py-2">Buscando...</p>}
                {!loading && (quizzesToList || []).map(quiz => {
                    const isSelected = selectedQuizIds.includes(quiz.id);
                    return (
                        <div
                            key={quiz.id}
                            onClick={() => handleToggleQuiz(quiz.id)}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-100'}`}
                        >
                            <div className={`w-5 h-5 border rounded flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className="text-sm">{quiz.title?.rendered || quiz.title}</span>
                        </div>
                    );
                })}
                 {!loading && (quizzesToList || []).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">No se encontraron cuestionarios.</p>
                 )}
            </div>
        </div>
    );
};


export default QuizSelector;

