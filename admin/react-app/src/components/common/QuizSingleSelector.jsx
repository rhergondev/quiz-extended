import React, { useState, useMemo, useEffect } from 'react';
import { Search, HelpCircle, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuizzes } from '../hooks/useQuizzes';

const QuizSingleSelector = ({
  value = '',
  onChange,
  courseId = null,
  placeholder = 'Select a quiz...',
  disabled = false,
  error = null,
  required = false,
  className = '',
  showSearch = true,
  showCourseFilter = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Agregar debug temporal
  console.log('🔍 QuizSingleSelector - Rendering with props:', { value, courseId, disabled });

  // Usar tu hook useQuizzes existente con debug
  const hookResult = useQuizzes(true);
  console.log('🔍 QuizSingleSelector - Hook result:', hookResult);

  const { 
    quizzes = [], 
    loading, 
    error: fetchError,
    filters = {}, 
    setFilters,
    fetchQuizzes
  } = hookResult || {};

  console.log('🔍 QuizSingleSelector - After destructuring:', { 
    quizzesType: typeof quizzes, 
    quizzesLength: Array.isArray(quizzes) ? quizzes.length : 'NOT_ARRAY',
    loading, 
    fetchError 
  });

  // Configurar filtros basados en las props - SIMPLIFICADO PARA DEBUG
  useEffect(() => {
    console.log('🔍 QuizSingleSelector - useEffect triggered');
    // Comentamos temporalmente para debug
    // if (!setFilters || !filters) return;
    // ... resto del código de filtros
  }, [courseId, searchTerm]);

  // Filtrar quizzes basado en término de búsqueda local
  const filteredQuizzes = useMemo(() => {
    console.log('🔍 QuizSingleSelector - filteredQuizzes memo, quizzes:', quizzes);
    
    if (!Array.isArray(quizzes)) {
      console.warn('❌ QuizSingleSelector - quizzes is not array:', typeof quizzes, quizzes);
      return [];
    }
    
    if (!searchTerm) return quizzes;
    
    return quizzes.filter(quiz => {
      const title = quiz?.title?.rendered || quiz?.title || '';
      return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             quiz?.id?.toString().includes(searchTerm);
    });
  }, [quizzes, searchTerm]);

  // Obtener detalles del quiz seleccionado
  const selectedQuiz = useMemo(() => {
    if (!Array.isArray(quizzes)) return null;
    return quizzes.find(quiz => quiz?.id?.toString() === value?.toString());
  }, [quizzes, value]);

  const handleSelect = (quiz) => {
    console.log('🔍 QuizSingleSelector - handleSelect:', quiz);
    if (quiz?.id && onChange) {
      onChange(quiz.id);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleToggle = () => {
    console.log('🔍 QuizSingleSelector - Toggle, current state:', isOpen);
    setIsOpen(!isOpen);
  };

  // Resto del código simplificado para debug inicial
  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        type="button"
        onClick={handleToggle}
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedQuiz.title?.rendered || selectedQuiz.title || 'Untitled Quiz'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">ID: {selectedQuiz.id}</span>
                  </div>
                </div>
              </>
            ) : (
              <span className="text-gray-500 text-sm">{placeholder}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* DEBUG Dropdown - SIMPLIFICADO */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          <div className="p-4">
            <h4 className="font-semibold text-sm mb-2">DEBUG INFO:</h4>
            <div className="text-xs space-y-1">
              <p>Quizzes type: {typeof quizzes}</p>
              <p>Is Array: {Array.isArray(quizzes) ? 'Yes' : 'No'}</p>
              <p>Length: {Array.isArray(quizzes) ? quizzes.length : 'N/A'}</p>
              <p>Loading: {loading ? 'Yes' : 'No'}</p>
              <p>Error: {fetchError || 'None'}</p>
              <p>Filtered Length: {Array.isArray(filteredQuizzes) ? filteredQuizzes.length : 'N/A'}</p>
            </div>
            
            {Array.isArray(filteredQuizzes) && filteredQuizzes.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto border-t pt-2">
                <p className="font-semibold text-xs mb-2">Available Quizzes:</p>
                {filteredQuizzes.slice(0, 5).map((quiz, index) => (
                  <button
                    key={quiz.id || index}
                    onClick={() => handleSelect(quiz)}
                    className="block w-full text-left p-2 text-xs hover:bg-gray-100 border-b"
                  >
                    {quiz?.title?.rendered || quiz?.title || 'Untitled'} (ID: {quiz?.id})
                  </button>
                ))}
                {filteredQuizzes.length > 5 && (
                  <p className="text-xs text-gray-500 p-2">...and {filteredQuizzes.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default QuizSingleSelector;