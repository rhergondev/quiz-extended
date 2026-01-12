// src/components/questions/QuestionCard.jsx (Rediseñado con botones directos)

import React, { useMemo } from 'react';
import {
  Edit2, Trash2, Copy, HelpCircle, Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { getColor, isDarkMode } = useTheme();

  // Colores del tema
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    shadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
    shadowHover: isDarkMode ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
  }), [getColor, isDarkMode]);

  // --- Extracción de datos ---
  const questionData = useMemo(() => ({
    title: question.title?.rendered || question.title || t('questions.untitled'),
    questionType: question.meta?._question_type || question.question_type || 'multiple_choice',
    difficulty: question.meta?._difficulty_level || question.difficulty || 'medium',
  }), [question, t]);

  // --- Categoría ---
  const categoryName = useMemo(() => {
    const terms = question._embedded?.['wp:term'] || [];
    const categoryTerm = terms.flat().find(term => term.taxonomy === 'qe_category');
    return categoryTerm ? categoryTerm.name : null;
  }, [question._embedded]);

  // --- Configuración de tipos de pregunta ---
  const typeConfig = {
    multiple_choice: { label: 'Opción Múltiple', color: pageColors.primary },
    true_false: { label: 'V/F', color: '#8b5cf6' },
    fill_in_the_blanks: { label: 'Completar', color: '#10b981' },
    short_answer: { label: 'Respuesta Corta', color: '#ec4899' },
    essay: { label: 'Ensayo', color: '#6366f1' },
  };

  // --- Configuración de dificultades ---
  const difficultyConfig = {
    easy: { label: 'Fácil', bg: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', text: isDarkMode ? '#4ade80' : '#16a34a' },
    medium: { label: 'Media', bg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', text: isDarkMode ? '#fbbf24' : '#d97706' },
    hard: { label: 'Difícil', bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', text: isDarkMode ? '#f87171' : '#dc2626' }
  };

  const typeInfo = typeConfig[questionData.questionType] || typeConfig.multiple_choice;
  const difficultyInfo = difficultyConfig[questionData.difficulty] || difficultyConfig.medium;

  const handleAction = (action, e) => {
    e.stopPropagation();
    action(question);
  };

  return (
    <div
      onClick={() => onClick(question)}
      className="group relative rounded-xl cursor-pointer transition-all duration-200 flex flex-col"
      style={{
        backgroundColor: pageColors.bgCard,
        border: `1px solid ${pageColors.border}`,
        boxShadow: pageColors.shadow,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = pageColors.shadowHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = pageColors.shadow;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header con tipo */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span 
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ 
            backgroundColor: `${typeInfo.color}20`,
            color: typeInfo.color
          }}
        >
          {typeInfo.label}
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: difficultyInfo.bg,
            color: difficultyInfo.text,
          }}
        >
          {difficultyInfo.label}
        </span>
      </div>

      {/* Título de la pregunta */}
      <div className="px-4 pb-3 flex-1">
        <h3 
          className="font-medium text-sm line-clamp-2 leading-tight"
          style={{ color: pageColors.text }}
          title={questionData.title}
          dangerouslySetInnerHTML={{ __html: questionData.title }}
        />
        {categoryName && (
          <div 
            className="flex items-center gap-1 text-xs mt-2"
            style={{ color: pageColors.textMuted }}
          >
            <Tag size={10} />
            <span className="truncate">{categoryName}</span>
          </div>
        )}
      </div>

      {/* Footer con botones de acción */}
      <div 
        className="px-3 py-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ 
          borderTop: `1px solid ${pageColors.border}`,
        }}
      >
        <button
          type="button"
          onClick={(e) => handleAction(onEdit, e)}
          style={{ 
            padding: '6px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            color: pageColors.textMuted,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = pageColors.hoverBg;
            e.currentTarget.style.color = pageColors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = pageColors.textMuted;
          }}
          title={t('common.edit')}
        >
          <Edit2 size={15} />
        </button>
        <button
          type="button"
          onClick={(e) => handleAction(onDuplicate, e)}
          style={{ 
            padding: '6px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            color: pageColors.textMuted,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = pageColors.hoverBg;
            e.currentTarget.style.color = pageColors.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = pageColors.textMuted;
          }}
          title={t('common.duplicate')}
        >
          <Copy size={15} />
        </button>
        <button
          type="button"
          onClick={(e) => handleAction(onDelete, e)}
          style={{ 
            padding: '6px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            color: pageColors.textMuted,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = pageColors.textMuted;
          }}
          title={t('common.delete')}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};

export default QuestionCard;