import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Copy, Eye, Clock, Target, BookOpen, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const QuizCard = ({ quiz, onEdit, onDelete, onDuplicate, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const title = quiz.title?.rendered || quiz.title || 'Untitled Quiz';
  const difficulty = quiz.meta?._difficulty_level || 'medium';
  const category = quiz.meta?._quiz_category || 'Uncategorized';
  const questionCount = quiz.meta?._quiz_question_ids?.length || 0;
  const timeLimit = quiz.meta?._time_limit || 'No limit';
  const passingScore = quiz.meta?._passing_score || '50';
  const quizType = quiz.meta?._quiz_type || 'assessment';

  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800'
  };

  const typeColors = {
    assessment: 'bg-blue-100 text-blue-800',
    practice: 'bg-purple-100 text-purple-800',
    exam: 'bg-red-100 text-red-800',
    survey: 'bg-gray-100 text-gray-800'
  };

  // Cargar preguntas cuando se expande por primera vez
  const loadQuestions = async () => {
    if (questions.length > 0) return; // Ya están cargadas
    
    const questionIds = quiz.meta?._quiz_question_ids || [];
    if (questionIds.length === 0) return;

    setLoadingQuestions(true);
    try {
      // Simular carga de preguntas - aquí harías la llamada real a la API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
      
      // Mock data - reemplaza con llamada real a la API
      const mockQuestions = questionIds.map((id, index) => ({
        id: id,
        title: `Question ${index + 1}`,
        content: `This is the content of question ${index + 1}...`,
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]
      }));
      
      setQuestions(mockQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleToggleExpand = async (e) => {
    e.stopPropagation();
    
    if (!isExpanded) {
      await loadQuestions();
    }
    
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={onClick}>
            <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2">
              {title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyColors[difficulty]}`}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[quizType]}`}>
                {quizType.charAt(0).toUpperCase() + quizType.slice(1)}
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                {category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{questionCount} questions</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{timeLimit === '' ? 'No limit' : `${timeLimit} min`}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{passingScore}% to pass</span>
          </div>
        </div>

        {/* Questions Preview Toggle */}
        {questionCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={handleToggleExpand}
              className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                <span>Preview Questions</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Expandable Questions Section */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Questions ({questionCount})
            </h4>
            
            {loadingQuestions ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                <span className="ml-2 text-sm text-gray-500">Loading questions...</span>
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-3 bg-gray-50 rounded-md border border-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-800">
                          {index + 1}. {question.title}
                        </h5>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {question.content?.replace(/<[^>]*>/g, '') || 'No content'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ml-2 ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No questions available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          title="View"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default QuizCard;