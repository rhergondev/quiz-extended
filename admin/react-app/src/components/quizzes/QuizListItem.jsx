import React from 'react';
import { HelpCircle, CheckSquare, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

/**
 * Renderiza un único ítem en la lista de cuestionarios.
 * @param {object} props
 * @param {object} props.quiz - El objeto del cuestionario.
 * @param {boolean} props.isSelected - Si el ítem está seleccionado.
 * @param {Function} props.onClick - Callback al hacer clic.
 */
const QuizListItem = ({ quiz, isSelected, onClick }) => {
  const { t } = useTranslation();

  const itemClasses = clsx(
    'p-4 cursor-pointer border-l-4',
    {
      'bg-blue-50 border-blue-600': isSelected,
      'border-transparent hover:bg-gray-50': !isSelected,
    }
  );

  return (
    <li onClick={onClick} className={itemClasses}>
      <h3 className={clsx('font-semibold', { 'text-blue-800': isSelected, 'text-gray-900': !isSelected })}>
        {quiz.title?.rendered || quiz.title || t('common.untitled')}
      </h3>
      <div className={clsx('text-sm mt-1 flex items-center space-x-4', { 'text-blue-700': isSelected, 'text-gray-500': !isSelected })}>
        <span className="flex items-center" title={t('quizzes.card.questions', { count: quiz.question_count })}>
          <HelpCircle className="w-4 h-4 mr-1" />
          {quiz.question_count || 0}
        </span>
        <span className="flex items-center" title={t('quizzes.card.attempts', { count: quiz.total_attempts })}>
          <Users className="w-4 h-4 mr-1" />
          {quiz.total_attempts || 0}
        </span>
      </div>
    </li>
  );
};

export default QuizListItem;