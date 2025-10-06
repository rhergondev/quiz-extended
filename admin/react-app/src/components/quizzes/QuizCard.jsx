// src/components/quizzes/QuizCard.jsx (Refactorizado)

import React, { useState, useMemo } from 'react';
import {
  Edit, Trash2, Copy, ChevronDown, ChevronUp, HelpCircle,
  Award, BarChart, CheckCircle, Users, BookOpen, Star, Tag
} from 'lucide-react';
import BaseCard from '../common/BaseCard';
import { useTranslation } from 'react-i18next';

const QuizCard = ({
  quiz,
  questions = [],
  availableCourses = [],
  availableCategories = [],
  viewMode,
  onClick,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Extracción de datos y valores computados ---
  const quizData = useMemo(() => ({
    title: quiz.title?.rendered || quiz.title || t('quizzes.untitled'),
    courseId: quiz.meta?._course_id || null,
    status: quiz.status || 'draft',
    type: quiz.quiz_type || 'standard',
    difficulty: quiz.difficulty || 'medium',
    questionCount: quiz.question_count || 0,
    totalPoints: quiz.total_points || 0,
    passingScore: quiz.passing_score || 70,
    totalAttempts: quiz.total_attempts || 0,
    averageScore: quiz.average_score || 0,
  }), [quiz, t]);
  
  const associatedQuestions = useMemo(() => {
    if (!quiz.question_ids || questions.length === 0) return [];
    return quiz.question_ids.map(id => 
      questions.find(q => q.id === id)
    ).filter(Boolean);
  }, [quiz.question_ids, questions]);

  const associatedCategory = useMemo(() => {

    const terms = quiz._embedded?.['wp:term'] || [];
    const categoryTerm = terms.flat().find(term => term.taxonomy === 'qe_category');
    
    if (categoryTerm) {
      return categoryTerm.name;
    }
    
    return null;
  }, [quiz, availableCategories]);

  const associatedCourse = useMemo(() => {
    if (!quizData.courseId || availableCourses.length === 0) return null;
    return availableCourses.find(c => c.id === quizData.courseId);
  }, [quizData.courseId, availableCourses]);

  const getBadgeColor = (key, value) => {
    const colors = {
      status: { publish: 'bg-green-100 text-green-700', draft: 'bg-yellow-100 text-yellow-700' },
      difficulty: { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' },
      type: { assessment: 'bg-indigo-100 text-indigo-700', practice: 'bg-blue-100 text-blue-700', exam: 'bg-red-100 text-red-700' }
    };
    return colors[key]?.[value] || 'bg-gray-100 text-gray-700';
  };

  const headerContent = (
    <>
      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-10 mb-3">
        {quizData.title}
      </h3>
        <div className="flex flex-wrap gap-2">
        {associatedCourse && (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {associatedCourse.title?.rendered || associatedCourse.title}
          </span>
        )}
        {associatedCategory && (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-700 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {associatedCategory}
          </span>
        )}
        </div>
    </>
  );

  const statsContent = (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      <div className="flex items-center gap-2 text-gray-600" title={t('quizzes.card.questions', { count: quizData.questionCount })}>
        <HelpCircle className="w-4 h-4" />
        <span>{t('quizzes.card.questions', { count: quizData.questionCount })}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600" title={t('quizzes.card.points', { count: quizData.totalPoints })}>
        <Star className="w-4 h-4" />
        <span>{t('quizzes.card.points', { count: quizData.totalPoints })}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600" title={t('quizzes.card.attempts', { count: quizData.totalAttempts })}>
        <Users className="w-4 h-4" />
        <span>{t('quizzes.card.attempts', { count: quizData.totalAttempts })}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600" title={t('quizzes.card.avgScore', { count: quizData.averageScore })}>
        <BarChart className="w-4 h-4" />
        <span>{t('quizzes.card.avgScore', { count: quizData.averageScore })}</span>
      </div>
    </div>
  );

  const footerContent = (
    associatedQuestions.length > 0 && (
      <div className="border-t border-gray-100">
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-indigo-600 p-4 transition-colors"
        >
          <span className="font-medium">{t('quizzes.card.viewQuestions', { count: associatedQuestions.length })}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
            {associatedQuestions.map((q) => (
              <div key={q.id} className="flex items-center gap-3 text-sm p-2 bg-white rounded">
                <div className="flex-shrink-0 text-gray-400">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 truncate" title={q.title}>{q.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  );
  
  const listContent = (
    <div className="flex items-center w-full gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
        <HelpCircle className="w-5 h-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate" title={quizData.title}>
          {quizData.title}
        </p>
        <p className="text-sm text-gray-500 truncate mt-1">
          {associatedCourse ? (associatedCourse.title?.rendered || associatedCourse.title) : t('quizzes.card.noCourse')}
        </p>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm flex-shrink-0">
         <div className="flex items-center gap-2 text-gray-600" title={t('quizzes.card.questions', { count: quizData.questionCount })}>
            <HelpCircle className="w-4 h-4" />
            <span>{quizData.questionCount}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600" title={t('quizzes.card.attempts', { count: quizData.totalAttempts })}>
            <Users className="w-4 h-4" />
            <span>{quizData.totalAttempts}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600" title={t('quizzes.card.avgScore', { count: quizData.averageScore })}>
            <BarChart className="w-4 h-4" />
            <span>{quizData.averageScore}%</span>
        </div>
      </div>
    </div>
  );

  const cardActions = [
    { label: t('common.edit'), icon: Edit, onClick: () => onEdit(quiz) },
    { label: t('common.duplicate'), icon: Copy, onClick: () => onDuplicate(quiz) },
    { label: t('common.delete'), icon: Trash2, onClick: () => onDelete(quiz), color: 'text-red-500' },
  ];

  return (
    <BaseCard
      viewMode={viewMode}
      actions={cardActions}
      onClick={() => onClick(quiz)}
      header={headerContent}
      stats={statsContent}
      footer={footerContent}
      listContent={listContent}
    >
    </BaseCard>
  );
};

export default QuizCard;