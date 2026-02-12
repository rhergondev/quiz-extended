import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, HelpCircle, Target, Award, Tag, CheckCircle2, Circle, BookOpen, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import QEButton from '../common/QEButton';
import QuestionEditorPanel from './QuestionEditorPanel';

const getQuestionTitle = (question) => question?.title?.rendered || question?.title || 'Pregunta sin título';

// Componente auxiliar para las cards de info - Estilo frontend unificado
const InfoCard = ({ icon: Icon, label, value, badge, badgeColor, colors }) => (
  <div 
    className="p-4 rounded-xl transition-all duration-200"
    style={{
      backgroundColor: colors.bgCard,
      border: `1px solid ${colors.cardBorder || colors.border}`,
      boxShadow: colors.shadowSm || '0 2px 8px rgba(0,0,0,0.05)',
    }}
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" style={{ color: colors.accent }} />
      <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
        {label}
      </span>
    </div>
    {badge && badgeColor ? (
      <span
        className="inline-block px-3 py-1 rounded-lg text-sm font-semibold"
        style={{
          backgroundColor: badgeColor.bg,
          color: badgeColor.text,
        }}
      >
        {value}
      </span>
    ) : (
      <p className="text-sm font-semibold" style={{ color: colors.text }}>
        {value}
      </p>
    )}
  </div>
);

const QuestionDetailsPanel = ({ 
  question, 
  mode, // 'view' | 'edit'
  onEdit,
  onSave,
  onCancel,
  onDelete,
  categoryOptions,
  providerOptions,
  onCategoryCreated,
  onProviderCreated,
  availableQuizzes,
  availableLessons,
  availableCourses
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // pageColors pattern - diseño unificado con frontend
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSubtle: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  };

  const typeLabels = {
    multiple_choice: t('questions.card.types.multiple_choice'),
    true_false: t('questions.card.types.true_false'),
    fill_in_the_blanks: t('questions.card.types.fill_in_the_blanks'),
  };

  const difficultyColors = {
    easy: { bg: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', text: isDarkMode ? '#4ade80' : '#16a34a' },
    medium: { bg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', text: isDarkMode ? '#fbbf24' : '#d97706' },
    hard: { bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', text: isDarkMode ? '#f87171' : '#dc2626' }
  };

  const difficultyLabels = {
    easy: t('questions.card.difficulties.easy'),
    medium: t('questions.card.difficulties.medium'),
    hard: t('questions.card.difficulties.hard')
  };

  // MODO EDIT: Renderiza el QuestionEditorPanel existente
  if (mode === 'edit') {
    return (
      <QuestionEditorPanel
        questionId={question.id}
        mode="edit"
        onSave={onSave}
        onCancel={onCancel}
        categoryOptions={categoryOptions}
        providerOptions={providerOptions}
        onCategoryCreated={onCategoryCreated}
        onProviderCreated={onProviderCreated}
        availableQuizzes={availableQuizzes}
        availableLessons={availableLessons}
        availableCourses={availableCourses}
      />
    );
  }

  // MODO VIEW: Vista previa de la pregunta
  const difficulty = question.meta?._difficulty_level || 'medium';
  const difficultyColor = difficultyColors[difficulty];

  return (
    <div 
      className="h-full overflow-y-auto p-6 rounded-2xl"
      style={{
        backgroundColor: pageColors.bgCard,
        border: `1px solid ${pageColors.cardBorder}`,
        boxShadow: pageColors.shadow,
      }}
    >
      {/* Header con acciones */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: pageColors.text }}>
          {t('questions.details.viewTitle')}
        </h2>
        <div className="flex gap-2">
          <QEButton
            variant="primary"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            {t('common.edit')}
          </QEButton>
          {onDelete && (
            <QEButton
              variant="secondary"
              size="sm"
              onClick={onDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </QEButton>
          )}
        </div>
      </div>

      {/* Info Cards en Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Tipo */}
        <InfoCard 
          icon={HelpCircle}
          label={t('questions.details.questionType')}
          value={typeLabels[question.meta?._question_type] || 'Desconocido'}
          colors={pageColors}
        />

        {/* Dificultad */}
        <InfoCard 
          icon={Target}
          label={t('questions.details.difficulty')}
          value={difficultyLabels[difficulty]}
          badge
          badgeColor={difficultyColor}
          colors={pageColors}
        />

        {/* Proveedor */}
        <InfoCard 
          icon={Tag}
          label={t('questions.details.provider')}
          value={question._embedded?.['wp:term']?.[1]?.[0]?.name || question.meta?._provider || 'Sin proveedor'}
          colors={pageColors}
        />

        {/* Cuestionarios asignados */}
        <InfoCard 
          icon={FileText}
          label="Cuestionarios"
          value={(() => {
            const quizIds = question.meta?._quiz_ids || [];
            if (quizIds.length === 0) return 'No asignado';
            if (quizIds.length === 1) {
              const quiz = availableQuizzes?.find(q => q.id === quizIds[0]);
              return quiz?.title?.rendered || quiz?.title || `Quiz #${quizIds[0]}`;
            }
            return `${quizIds.length} cuestionarios`;
          })()}
          colors={pageColors}
        />
      </div>

      {/* Título de la Pregunta */}
      <div className="mb-6">
        <h3 
          className="text-sm font-semibold mb-2"
          style={{ color: pageColors.textMuted }}
        >
          {t('questions.details.question')}
        </h3>
        <p 
          className="text-lg font-medium"
          style={{ color: pageColors.text }}
        >
          {getQuestionTitle(question)}
        </p>
      </div>

      {/* Preview de Opciones */}
      {question.meta?._question_options && question.meta._question_options.length > 0 && (
        <div className="mb-6">
          <h3 
            className="text-sm font-semibold mb-3"
            style={{ color: pageColors.textMuted }}
          >
            {t('questions.details.answerOptions')}
          </h3>
          <div className="space-y-2">
            {question.meta._question_options.map((option, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-200"
                style={{
                  backgroundColor: option.isCorrect 
                    ? isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'
                    : pageColors.bgCard,
                  borderColor: option.isCorrect 
                    ? '#10b981' 
                    : pageColors.border,
                  borderWidth: option.isCorrect ? '2px' : '1px',
                }}
              >
                {option.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 flex-shrink-0" style={{ color: pageColors.textMuted }} />
                )}
                <span style={{ color: pageColors.text, whiteSpace: 'pre-wrap' }}>
                  {option.text || t('questions.details.optionLabel', { number: index + 1 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explicación (si existe) */}
      {question.content?.rendered && (
        <div>
          <h3 
            className="text-sm font-semibold mb-2"
            style={{ color: pageColors.textMuted }}
          >
            {t('questions.details.explanation')}
          </h3>
          <div 
            className="prose max-w-none p-4 rounded-lg"
            style={{
              backgroundColor: pageColors.bgSubtle,
              color: pageColors.text,
            }}
            dangerouslySetInnerHTML={{ __html: question.content.rendered }}
          />
        </div>
      )}

      {/* Metadatos adicionales (si existen) - Solo mostramos si hay info real */}
      {(() => {
        const hasLesson = question.meta?._question_lesson && 
                         question.meta._question_lesson !== '0' && 
                         question.meta._question_lesson !== 0;
        const hasCourse = question.meta?._course_id && 
                         question.meta._course_id !== '0' && 
                         question.meta._course_id !== 0;
        const hasProvider = question.meta?._provider && 
                           question.meta._provider !== '0' && 
                           question.meta._provider !== 0;
        
        if (!hasLesson && !hasCourse && !hasProvider) return null;

        return (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: pageColors.border }}>
            <h3 
              className="text-sm font-semibold mb-3"
              style={{ color: pageColors.textMuted }}
            >
              {t('questions.details.additionalInfo')}
            </h3>
            <div className="space-y-2 text-sm" style={{ color: pageColors.text }}>
              {hasLesson ? (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: pageColors.accent }} />
                  <span>{t('questions.details.lessonId')}: {question.meta._question_lesson}</span>
                </div>
              ) : null}
              {hasCourse ? (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: pageColors.accent }} />
                  <span>{t('questions.details.courseId')}: {question.meta._course_id}</span>
                </div>
              ) : null}
              {hasProvider ? (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" style={{ color: pageColors.accent }} />
                  <span>{t('questions.details.provider')}: {
                    question._embedded?.['wp:term']?.[1]?.[0]?.name || question.meta._provider
                  }</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default QuestionDetailsPanel;
