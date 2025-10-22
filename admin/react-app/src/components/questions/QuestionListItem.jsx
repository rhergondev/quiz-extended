import React from 'react';
import { HelpCircle, CheckSquare, Tag } from 'lucide-react';
import clsx from 'clsx';

const getQuestionTitle = (question) => question?.title?.rendered || question?.title || 'Pregunta sin título';

const QuestionListItem = ({ question, isSelected, onClick }) => {
  const itemClasses = clsx(
    'p-4 cursor-pointer border-l-4 transition-colors duration-150',
    {
      'bg-blue-50 border-blue-600': isSelected,
      'border-transparent hover:bg-gray-50': !isSelected,
    }
  );

  const typeLabels = {
    multiple_choice: 'Opción Múltiple',
    true_false: 'Verdadero/Falso',
    fill_in_the_blanks: 'Rellenar Huecos',
    // ... add other types as needed
  };

  const difficultyColors = {
      easy: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      hard: 'bg-red-100 text-red-700'
  }

  return (
    <div className={itemClasses} onClick={() => onClick(question)}>
      <h4 className="font-semibold text-sm text-gray-800 truncate">{getQuestionTitle(question)}</h4>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
           <span className="flex items-center gap-1">
             <CheckSquare className="w-3 h-3" />
             {typeLabels[question.meta?._question_type] || 'Tipo Desconocido'}
           </span>
            {question._embedded?.['wp:term']?.[0]?.[0]?.name && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {question._embedded['wp:term'][0][0].name}
              </span>
            )}
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${difficultyColors[question.meta?._difficulty_level] || 'bg-gray-100 text-gray-700'}`}>
            {question.meta?._difficulty_level || 'N/A'}
        </span>
      </div>
    </div>
  );
};

export default QuestionListItem;
