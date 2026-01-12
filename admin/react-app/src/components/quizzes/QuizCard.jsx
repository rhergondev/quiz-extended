import React, { useMemo } from 'react';
import { HelpCircle, Users, Clock, Calendar, Edit2, Trash2, Copy, Eye, BarChart2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Tarjeta de cuestionario para el grid
 */
const QuizCard = ({ quiz, onEdit, onDelete, onDuplicate, onView, onStats }) => {
  const { getColor, isDarkMode } = useTheme();

  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  }), [getColor, isDarkMode]);

  // Título del quiz
  const displayTitle = typeof quiz.title === 'string'
    ? quiz.title
    : (quiz.title?.rendered || 'Sin título');

  // Meta datos
  const questionCount = quiz.question_count || 0;
  const totalAttempts = quiz.total_attempts || 0;
  const timeLimit = quiz.meta?._time_limit || 0;
  const passingScore = quiz.meta?._passing_score || '7.0';
  const startDate = quiz.meta?._start_date;

  // Estado del quiz
  const getStatusInfo = () => {
    switch (quiz.status) {
      case 'publish':
        return { label: 'Publicado', color: pageColors.success };
      case 'draft':
        return { label: 'Borrador', color: pageColors.warning };
      case 'private':
        return { label: 'Privado', color: pageColors.textMuted };
      default:
        return { label: quiz.status, color: pageColors.textMuted };
    }
  };

  const statusInfo = getStatusInfo();

  // Dificultad
  const getDifficultyInfo = () => {
    const level = quiz.meta?._difficulty_level || 'medium';
    switch (level) {
      case 'easy':
        return { label: 'Fácil', color: '#10b981' };
      case 'medium':
        return { label: 'Media', color: '#f59e0b' };
      case 'hard':
        return { label: 'Difícil', color: '#ef4444' };
      default:
        return { label: level, color: pageColors.textMuted };
    }
  };

  const difficultyInfo = getDifficultyInfo();

  const handleCardClick = () => {
    onEdit(quiz);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        backgroundColor: pageColors.bgCard,
        border: `1px solid ${pageColors.border}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: pageColors.shadow,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isDarkMode 
          ? '0 8px 30px rgba(0,0,0,0.5)' 
          : '0 8px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = pageColors.shadow;
      }}
    >
      {/* Header: Estado y Dificultad */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: statusInfo.color,
          }}
        >
          {statusInfo.label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '500',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            color: difficultyInfo.color,
          }}
        >
          {difficultyInfo.label}
        </span>
      </div>

      {/* Título */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: pageColors.text,
          marginBottom: '12px',
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {displayTitle}
      </h3>

      {/* Estadísticas */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={14} style={{ color: pageColors.textMuted }} />
          <span style={{ fontSize: '13px', color: pageColors.textMuted }}>
            {questionCount} {questionCount === 1 ? 'pregunta' : 'preguntas'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} style={{ color: pageColors.textMuted }} />
          <span style={{ fontSize: '13px', color: pageColors.textMuted }}>
            {totalAttempts} {totalAttempts === 1 ? 'intento' : 'intentos'}
          </span>
        </div>
        {timeLimit > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} style={{ color: pageColors.textMuted }} />
            <span style={{ fontSize: '13px', color: pageColors.textMuted }}>
              {timeLimit} min
            </span>
          </div>
        )}
        {startDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: pageColors.textMuted }} />
            <span style={{ fontSize: '13px', color: pageColors.textMuted }}>
              {new Date(startDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Nota de aprobación */}
      <div 
        style={{ 
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#3b82f6' }}>
          Nota mínima: {passingScore}/10
        </span>
      </div>

      {/* Acciones */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          paddingTop: '12px',
          borderTop: `1px solid ${pageColors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onEdit(quiz)}
          title="Editar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
            e.currentTarget.style.color = '#3b82f6';
          }}
        >
          <Edit2 size={14} />
        </button>

        <button
          type="button"
          onClick={() => onStats && onStats(quiz)}
          title="Estadísticas"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)';
            e.currentTarget.style.color = '#10b981';
          }}
        >
          <BarChart2 size={14} />
        </button>

        <button
          type="button"
          onClick={() => onDuplicate && onDuplicate(quiz)}
          title="Duplicar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: pageColors.hoverBg,
            color: pageColors.textMuted,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = pageColors.accent;
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = pageColors.hoverBg;
            e.currentTarget.style.color = pageColors.textMuted;
          }}
        >
          <Copy size={14} />
        </button>

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => onDelete(quiz)}
          title="Eliminar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default QuizCard;
