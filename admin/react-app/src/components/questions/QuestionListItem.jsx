import React from 'react';
import { HelpCircle, CheckSquare, Tag, Award, Square } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const getQuestionTitle = (question) => question?.title?.rendered || question?.title || 'Pregunta sin título';

const QuestionListItem = ({ 
  question, 
  isSelected, 
  onClick,
  isMultiSelectMode = false,
  isChecked = false,
  onToggleCheck
}) => {
  const { getColor, isDarkMode } = useTheme();
  
  // pageColors pattern - diseño unificado con frontend
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSelected: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.06)',
    borderSelected: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    border: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  };

  const typeLabels = {
    multiple_choice: 'Opción Múltiple',
    true_false: 'Verdadero/Falso',
    fill_in_the_blanks: 'Rellenar Huecos',
  };

  const difficultyColors = {
    easy: { bg: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', text: isDarkMode ? '#4ade80' : '#16a34a' },
    medium: { bg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', text: isDarkMode ? '#fbbf24' : '#d97706' },
    hard: { bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', text: isDarkMode ? '#f87171' : '#dc2626' }
  };

  const difficultyLabels = {
    easy: 'Fácil',
    medium: 'Media',
    hard: 'Difícil'
  };

  const difficulty = question.meta?._difficulty_level || 'medium';
  const difficultyColor = difficultyColors[difficulty] || difficultyColors.medium;

  const handleClick = (e) => {
    // Si hacen click en el checkbox, solo toggle el check
    if (e.target.closest('.question-checkbox')) {
      return;
    }
    // Si no, es un click normal en el item
    onClick(question);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    if (onToggleCheck) {
      onToggleCheck(question.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="p-4 cursor-pointer transition-all duration-200 border-l-[3px] rounded-xl mb-2 relative"
      style={{
        backgroundColor: isSelected ? pageColors.bgSelected : 'transparent',
        borderLeftColor: isSelected ? pageColors.borderSelected : 'transparent',
        borderTop: `1px solid ${pageColors.cardBorder}`,
        borderRight: `1px solid ${pageColors.cardBorder}`,
        borderBottom: `1px solid ${pageColors.cardBorder}`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = pageColors.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected 
          ? pageColors.bgSelected 
          : 'transparent';
      }}
    >
      {/* Checkbox para batch selection (solo visible cuando hay multiselect) */}
      {isMultiSelectMode && (
        <div 
          className="question-checkbox absolute top-2 right-2 cursor-pointer p-1"
          onClick={handleCheckboxClick}
        >
          {isChecked ? (
            <CheckSquare 
              className="w-5 h-5" 
              style={{ color: pageColors.accent }}
            />
          ) : (
            <Square 
              className="w-5 h-5" 
              style={{ color: pageColors.textMuted }}
            />
          )}
        </div>
      )}

      {/* Título */}
      <h4 
        className="font-semibold text-sm mb-2 truncate"
        style={{ color: pageColors.text }}
      >
        {getQuestionTitle(question)}
      </h4>

      {/* Metadata en grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        {/* Tipo */}
        <div className="flex items-center gap-1.5" style={{ color: pageColors.textMuted }}>
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="truncate">{typeLabels[question.meta?._question_type] || 'Desconocido'}</span>
        </div>

        {/* Dificultad badge */}
        <div className="flex justify-end">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: difficultyColor.bg,
              color: difficultyColor.text,
            }}
          >
            {difficultyLabels[difficulty] || 'N/A'}
          </span>
        </div>

        {/* Categoría */}
        {question._embedded?.['wp:term']?.[0]?.[0]?.name && (
          <div className="flex items-center gap-1.5" style={{ color: pageColors.textMuted }}>
            <Tag className="w-3.5 h-3.5" />
            <span className="truncate">{question._embedded['wp:term'][0][0].name}</span>
          </div>
        )}

        {/* Puntos */}
        <div className="flex items-center gap-1.5 justify-end" style={{ color: pageColors.textMuted }}>
          <Award className="w-3.5 h-3.5" />
          <span>{question.meta?._points || 1} pts</span>
        </div>
      </div>

      {/* Mini preview de opciones (solo si es multiple choice) */}
      {question.meta?._question_type === 'multiple_choice' && question.meta?._question_options && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: pageColors.border }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: pageColors.textMuted }}>
            <CheckSquare className="w-3.5 h-3.5" style={{ color: pageColors.accent }} />
            <span>
              {question.meta._question_options.filter(o => o.isCorrect).length}/
              {question.meta._question_options.length} correctas
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionListItem;
