// admin/react-app/src/components/questions/QuizSelector.jsx

import React from 'react';
import { X } from 'lucide-react';

const QuizSelector = ({ 
  availableQuizzes, 
  selectedQuizIds, 
  onChange, 
  disabled = false 
}) => {
  const handleToggleQuiz = (quizId) => {
    if (selectedQuizIds.includes(quizId)) {
      onChange(selectedQuizIds.filter(id => id !== quizId));
    } else {
      onChange([...selectedQuizIds, quizId]);
    }
  };

  const handleRemoveQuiz = (quizId) => {
    onChange(selectedQuizIds.filter(id => id !== quizId));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Assign to Quiz(zes)
      </label>
      
      {/* Selected Quizzes Pills */}
      {selectedQuizIds.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedQuizIds.map(quizId => {
            const quiz = availableQuizzes.find(q => q.value === quizId);
            return quiz ? (
              <span
                key={quizId}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
              >
                {quiz.label}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuiz(quizId)}
                    className="hover:text-indigo-900 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Quiz List with Checkboxes */}
      <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
        {/* Question Bank Option */}
        <div className="p-2 bg-gray-50 border-b border-gray-200">
          <label className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={selectedQuizIds.length === 0}
              onChange={() => onChange([])}
              disabled={disabled}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 font-medium">
              Question Bank Only (No Quiz)
            </span>
          </label>
        </div>
        
        {/* Available Quizzes */}
        <div className="p-2 space-y-1">
          {availableQuizzes.length === 0 ? (
            <p className="text-sm text-gray-500 italic p-2">No quizzes available</p>
          ) : (
            availableQuizzes.map(quiz => (
              <label
                key={quiz.value}
                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedQuizIds.includes(quiz.value)}
                  onChange={() => handleToggleQuiz(quiz.value)}
                  disabled={disabled}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {quiz.label}
                </span>
              </label>
            ))
          )}
        </div>
      </div>
      
      <p className="mt-2 text-xs text-gray-500">
        {selectedQuizIds.length === 0 
          ? 'This question will be available in the question bank only'
          : `Assigned to ${selectedQuizIds.length} quiz${selectedQuizIds.length > 1 ? 'zes' : ''}`
        }
      </p>
    </div>
  );
};

export default QuizSelector;