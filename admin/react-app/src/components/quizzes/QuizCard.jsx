// admin/react-app/src/components/quizzes/QuizCard.jsx

import React from 'react';
import { 
  Eye, 
  Edit, 
  Copy, 
  Trash2,
  Clock,
  Target,
  HelpCircle,
  Award,
  BarChart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const QuizCard = ({ 
  quiz, 
  onView, 
  onEdit, 
  onDuplicate, 
  onDelete 
}) => {
  const { t } = useTranslation();

  // Extract quiz data with fallbacks
  const title = quiz.title?.rendered || quiz.title || t('quizzes.untitled');
  const instructions = quiz.instructions || '';
  const questionsCount = quiz.questions_count || 0;
  const totalPoints = quiz.total_points || 0;
  const passingScore = quiz.passing_score || 70;
  const timeLimit = quiz.time_limit || 0;
  const maxAttempts = quiz.max_attempts || 0;
  const quizType = quiz.quiz_type || 'standard';
  const difficulty = quiz.difficulty_level || 'intermediate';
  const status = quiz.status || 'draft';

  // Status badge colors
  const statusColors = {
    publish: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    private: 'bg-blue-100 text-blue-800'
  };

  // Difficulty badge colors
  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-orange-100 text-orange-700',
    expert: 'bg-red-100 text-red-700'
  };

  // Quiz type badge colors
  const typeColors = {
    standard: 'bg-blue-100 text-blue-700',
    graded: 'bg-purple-100 text-purple-700',
    practice: 'bg-green-100 text-green-700',
    survey: 'bg-cyan-100 text-cyan-700',
    assessment: 'bg-indigo-100 text-indigo-700',
    certification: 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 overflow-hidden">
      {/* Header with badges */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex-1 line-clamp-2">
            {title}
          </h3>
          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[status] || statusColors.draft}`}>
            {t(`common.status.${status}`)}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[quizType] || typeColors.standard}`}>
            {t(`quizzes.types.${quizType}`)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[difficulty] || difficultyColors.medium}`}>
            {t(`common.difficulty.${difficulty}`)}
          </span>
        </div>
      </div>

      {/* Instructions preview */}
      {instructions && (
        <div className="px-4 py-3 bg-gray-50">
          <p className="text-sm text-gray-600 line-clamp-2">
            {instructions}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Questions count */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{t('quizzes.stats.questions')}</p>
            <p className="text-sm font-semibold text-gray-900">{questionsCount}</p>
          </div>
        </div>

        {/* Total points */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{t('quizzes.stats.points')}</p>
            <p className="text-sm font-semibold text-gray-900">{totalPoints}</p>
          </div>
        </div>

        {/* Passing score */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{t('quizzes.stats.passingScore')}</p>
            <p className="text-sm font-semibold text-gray-900">{passingScore}%</p>
          </div>
        </div>

        {/* Time limit */}
        {timeLimit > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{t('quizzes.stats.timeLimit')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {timeLimit} {t('common.units.minutes')}
              </p>
            </div>
          </div>
        )}

        {/* Max attempts */}
        {maxAttempts > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <BarChart className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{t('quizzes.stats.maxAttempts')}</p>
              <p className="text-sm font-semibold text-gray-900">{maxAttempts}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
        <button
          onClick={() => onView(quiz)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
          title={t('common.actions.view')}
        >
          <Eye className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onEdit(quiz)}
          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          title={t('common.actions.edit')}
        >
          <Edit className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onDuplicate(quiz)}
          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
          title={t('common.actions.duplicate')}
        >
          <Copy className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onDelete(quiz)}
          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          title={t('common.actions.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default QuizCard;