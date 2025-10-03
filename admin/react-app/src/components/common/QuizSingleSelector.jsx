import React, { useState, useMemo, useEffect } from 'react';
import { Search, HelpCircle, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import useQuizzes from '../../hooks/useQuizzes';

const QuizSingleSelector = ({
  value = '',
  onChange,
  courseId = null,
  placeholder = 'Select a quiz...',
  disabled = false,
  error = null,
  required = false,
  className = '',
  showSearch = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ CORRECCIÓN: Se llama al hook con un objeto de opciones válido.
  const { 
    quizzes = [], 
    loading, 
    error: fetchError,
    fetchQuizzes,
    hasMore,
    loadMoreQuizzes
  } = useQuizzes({
    search: searchTerm,
    courseId: courseId,
    autoFetch: true, // Carga inicial
    perPage: 50 // Cargar un número razonable para el selector
  });

  // Manejador para el cambio en la búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchQuizzes(true); // `true` para resetear y aplicar nuevo término de búsqueda
    }, 500); // Debounce de 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, courseId, fetchQuizzes]);

  // Obtener detalles del quiz seleccionado
  const selectedQuiz = useMemo(() => {
    if (!Array.isArray(quizzes) || !value) return null;
    return quizzes.find(quiz => quiz?.id?.toString() === value?.toString());
  }, [quizzes, value]);

  const handleSelect = (quiz) => {
    if (quiz?.id && onChange) {
      onChange(quiz.id);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Botón del selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`relative w-full px-3 py-2 text-left border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {selectedQuiz ? (
              <>
                <HelpCircle className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedQuiz.title?.rendered || selectedQuiz.title || 'Untitled Quiz'}
                </p>
              </>
            ) : (
              <span className="text-gray-500 text-sm">{placeholder}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Mensaje de Error */}
      {(error || fetchError) && (
        <p className="mt-1 text-sm text-red-600">{error || fetchError}</p>
      )}

      {/* Menú desplegable */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {showSearch && (
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          
          {loading && quizzes.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>
          ) : (
            <ul>
              {quizzes.length > 0 ? quizzes.map(quiz => (
                <li
                  key={quiz.id}
                  onClick={() => handleSelect(quiz)}
                  className="px-4 py-2 text-sm text-gray-800 hover:bg-blue-50 cursor-pointer"
                >
                  {quiz.title?.rendered || quiz.title}
                </li>
              )) : (
                <li className="px-4 py-2 text-sm text-gray-500">No quizzes found.</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
};

export default QuizSingleSelector;