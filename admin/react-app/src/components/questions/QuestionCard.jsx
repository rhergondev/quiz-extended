// src/components/questions/QuestionCard.jsx (Refactorizado y Finalizado)

import React, { useState, useMemo } from 'react';
import {
  Edit, Trash2, Copy, ChevronDown, ChevronUp, HelpCircle,
  Star, CheckCircle, Type, BarChart, FileText // 🔥 Iconos actualizados
} from 'lucide-react';
import BaseCard from '../common/BaseCard';
import { useTranslation } from 'react-i18next';

const QuestionCard = ({
  question,
  quizzes = [],
  viewMode,
  onClick,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Extracción de datos ---
  const questionData = useMemo(() => ({
    // El título ahora viene correctamente desde el `sanitize`
    title: question.title || t('questions.untitled'),
    questionType: question.question_type || 'multiple_choice',
    points: question.points || 0,
    difficulty: question.difficulty || 'medium',
  }), [question, t]);

  // --- Lógica para extraer datos embebidos (como el Proveedor) ---
  const questionProvider = useMemo(() => {
    const terms = question._embedded?.['wp:term'] || [];
    const providerTerm = terms.flat().find(term => term.taxonomy === 'qe_provider');
    return providerTerm ? providerTerm.name : t('questions.card.manualProvider', 'Manual');
  }, [question._embedded, t]);

  const associatedQuizzes = useMemo(() => {
    if (!question.quiz_ids || quizzes.length === 0) return [];
    return question.quiz_ids.map(id => 
      quizzes.find(q => q.id === id)
    ).filter(Boolean);
  }, [question.quiz_ids, quizzes]);

  // --- Función para colores de badges ---
  const getBadgeColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      hard: 'bg-red-100 text-red-700'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700';
  };

  // --- Definición de los "Slots" para BaseCard ---

  const headerContent = (
    <>
      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-10 mb-3" dangerouslySetInnerHTML={{ __html: questionData.title }}></h3>
      <div className="flex flex-wrap gap-2">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getBadgeColor(questionData.difficulty)} capitalize flex items-center gap-2`}>
          <BarChart className="h-4 w-4" />
          {t(`questions.card.difficulties.${questionData.difficulty}`, questionData.difficulty)}
        </span>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {questionProvider}
        </span>
      </div>
    </>
  );

  const statsContent = (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
      <div className="flex items-center gap-2 text-gray-600" title={t('questions.card.points', { count: questionData.points })}>
        <Star className="w-4 h-4" />
        <span>{t('questions.card.points', { count: questionData.points })}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600" title={t('questions.card.type')}>
        <Type className="w-4 h-4" />
        <span>{t(`questions.card.types.${questionData.questionType}`, questionData.questionType)}</span>
      </div>
    </div>
  );

  const footerContent = (
    associatedQuizzes.length > 0 && (
      <div className="border-t border-gray-100">
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-indigo-600 p-4 transition-colors"
        >
          <span className="font-medium">{t('questions.card.viewQuizzes', { count: associatedQuizzes.length })}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
            {associatedQuizzes.map((q) => (
              <div key={q.id} className="flex items-center gap-3 text-sm p-2 bg-white rounded">
                <div className="flex-shrink-0 text-gray-400">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 truncate" title={q.title?.rendered || q.title}>{q.title?.rendered || q.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  );
  
  const listContent = (
     <div className="flex items-center w-full gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <HelpCircle className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate" dangerouslySetInnerHTML={{ __html: questionData.title }}></p>
        <p className="text-sm text-gray-500 truncate mt-1">
          {t(`questions.card.types.${questionData.questionType}`, questionData.questionType)} • {t('questions.card.points', { count: questionData.points })}
        </p>
      </div>
      <div className="hidden md:flex items-center gap-3 text-sm flex-shrink-0">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(questionData.difficulty)} capitalize`}>
          {t(`questions.card.difficulties.${questionData.difficulty}`, questionData.difficulty)}
        </span>
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {questionProvider}
        </span>
      </div>
    </div>
  );
  
  // 🔥 CORRECCIÓN: Se definen las acciones para el menú de 3 puntos
  const cardActions = [
    { label: t('common.edit'), icon: Edit, onClick: () => onEdit(question) },
    { label: t('common.duplicate'), icon: Copy, onClick: () => onDuplicate(question) },
    { label: t('common.delete'), icon: Trash2, onClick: () => onDelete(question), color: 'text-red-500' },
  ];

  return (
    <BaseCard
      viewMode={viewMode}
      actions={cardActions} // Se pasan las acciones al BaseCard
      onClick={() => onClick(question)}
      header={headerContent}
      stats={statsContent}
      footer={footerContent}
      listContent={listContent}
    >
    </BaseCard>
  );
};

export default QuestionCard;