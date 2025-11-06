import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Plus } from 'lucide-react';
import useQuizzes from '../../hooks/useQuizzes';
import { getOne as getQuiz } from '../../api/services/quizService';

const QuizSingleSelector = ({ value, onChange, disabled = false, onCreateNew }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { quizzes: searchResults, loading, fetchQuizzes } = useQuizzes({ autoFetch: false });
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const containerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Cargar el quiz seleccionado por ID cuando cambia el value
  useEffect(() => {
    const loadSelectedQuiz = async () => {
      if (value) {
        setLoadingSelected(true);
        try {
          const quiz = await getQuiz(value);
          setSelectedQuiz(quiz);
        } catch (error) {
          console.error('Error loading selected quiz:', error);
          setSelectedQuiz(null);
        } finally {
          setLoadingSelected(false);
        }
      } else {
        setSelectedQuiz(null);
      }
    };

    loadSelectedQuiz();
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    
    if (searchQuery.trim()) {
      // Si hay búsqueda, buscar con ese término
      setIsDropdownOpen(true);
      debounceTimeoutRef.current = setTimeout(() => {
        fetchQuizzes(true, { search: searchQuery, perPage: 50 });
      }, 300);
    } else if (isDropdownOpen) {
      // Si el dropdown está abierto pero no hay búsqueda, cargar quizzes recientes
      debounceTimeoutRef.current = setTimeout(() => {
        fetchQuizzes(true, { perPage: 50 });
      }, 100);
    }
    
    return () => clearTimeout(debounceTimeoutRef.current);
  }, [searchQuery, isDropdownOpen, fetchQuizzes]);

  const handleSelectQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    onChange(quiz.id);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedQuiz(null);
    onChange(null);
  };
  
  const getQuizTitle = (quiz) => quiz?.title?.rendered || quiz?.title || 'Cuestionario sin título';

  if (loadingSelected) {
    return (
      <div className="flex items-center justify-center p-2 bg-gray-100 border rounded-md">
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (selectedQuiz) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-100 border rounded-md">
        <p className="text-sm font-medium text-gray-800">{getQuizTitle(selectedQuiz)}</p>
        {!disabled && (
          <button onClick={handleClear} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Buscar o crear cuestionario..."
            disabled={disabled}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md"
          />
        </div>
        {onCreateNew && (
            <button onClick={onCreateNew} disabled={disabled} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Crear Nuevo
            </button>
        )}
      </div>
      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading && <p className="p-2 text-sm text-gray-500">Buscando...</p>}
          {!loading && searchResults.length > 0 && searchResults.map(quiz => (
            <div
              key={quiz.id}
              onClick={() => handleSelectQuiz(quiz)}
              className="p-2 text-sm cursor-pointer hover:bg-gray-100"
            >
              {getQuizTitle(quiz)}
            </div>
          ))}
          {!loading && searchResults.length === 0 && (
            <p className="p-2 text-sm text-gray-500">
              {searchQuery ? 'No se encontraron resultados.' : 'No hay cuestionarios disponibles.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizSingleSelector;
