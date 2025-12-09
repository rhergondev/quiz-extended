import React from 'react';
import { AlertCircle, Clock, CheckCircle, RotateCcw, PlayCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

/**
 * Modal to prompt user to resume or restart a quiz with saved progress
 * 
 * @param {Object} props
 * @param {Object} props.autosaveData - Autosave data from backend
 * @param {Function} props.onResume - Callback when user clicks resume
 * @param {Function} props.onRestart - Callback when user clicks restart
 * @param {Function} props.onClose - Callback to close modal (optional)
 * @param {boolean} props.isOpen - Modal visibility state
 */
const QuizRecoveryModal = ({ autosaveData, onResume, onRestart, onClose, isOpen = true }) => {
  const { getColor, isDarkMode } = useTheme();
  const { t } = useTranslation();

  if (!isOpen || !autosaveData) {
    return null;
  }

  // Colores adaptativos
  const colors = {
    text: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? 'rgba(255,255,255,0.7)' : getColor('textMuted', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#1a202c'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    overlayBg: isDarkMode ? getColor('background', '#111827') : 'rgba(0,0,0,0.5)',
    infoBg: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  const {
    quiz_title,
    current_question_index,
    answers,
    time_remaining,
    updated_at,
    quiz_data,
  } = autosaveData;

  // Calculate progress - quiz_data contains the full quiz object
  const totalQuestions = quiz_data?.meta?._quiz_question_ids?.length || 0;
  const answeredQuestions = Object.keys(answers || {}).length;
  const progressPercent = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100) 
    : 0;

  // Format last saved time
  const getTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${t('common.ago')} ${diffDays} ${diffDays > 1 ? t('common.days') : t('common.day')}`;
    if (diffHours > 0) return `${t('common.ago')} ${diffHours} ${diffHours > 1 ? t('common.hours') : t('common.hour')}`;
    if (diffMins > 0) return `${t('common.ago')} ${diffMins} ${diffMins > 1 ? t('common.minutes') : t('common.minute')}`;
    return t('common.justNow');
  };

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="fixed inset-0 transition-opacity" 
          style={{ backgroundColor: colors.overlayBg }}
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Modal content */}
        <div 
          className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: colors.cardBg }}
        >
          {/* Header with accent color */}
          <div 
            className="px-5 py-4 flex items-center gap-3"
            style={{ backgroundColor: isDarkMode ? colors.accent : colors.primary }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                {t('quizzes.quiz.inProgress')}
              </h3>
              <p className="text-xs text-white/70 truncate">
                {t('quizzes.quiz.savedProgressFound')}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {t('quizzes.quiz.continueWhereYouLeft')}
            </p>

            {/* Quiz info card */}
            <div 
              className="rounded-lg p-4 space-y-3"
              style={{ 
                backgroundColor: colors.infoBg,
                border: `1px solid ${colors.border}`
              }}
            >
              {/* Quiz title */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
                  {t('common.quiz')}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: colors.text }}>
                  {quiz_title || t('common.untitled')}
                </span>
              </div>
              
              {/* Progress */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
                  {t('common.progress')}
                </span>
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {answeredQuestions}/{totalQuestions} ({progressPercent}%)
                </span>
              </div>

              {/* Current question */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: colors.textMuted }}>
                  {t('quizzes.quiz.currentQuestion')}
                </span>
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {(current_question_index || 0) + 1} {t('common.of')} {totalQuestions}
                </span>
              </div>

              {/* Time remaining */}
              {time_remaining && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide flex items-center gap-1.5" style={{ color: colors.textMuted }}>
                    <Clock className="w-3.5 h-3.5" />
                    {t('quizzes.quiz.timeRemaining')}
                  </span>
                  <span className="text-sm font-medium" style={{ color: colors.accent }}>
                    {formatTimeRemaining(time_remaining)}
                  </span>
                </div>
              )}

              {/* Progress bar */}
              <div className="pt-2">
                <div 
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                >
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${progressPercent}%`,
                      backgroundColor: colors.accent
                    }}
                  />
                </div>
              </div>

              {/* Last saved */}
              <div 
                className="flex items-center justify-between gap-2 pt-2 text-xs"
                style={{ 
                  borderTop: `1px solid ${colors.border}`,
                  color: colors.textMuted 
                }}
              >
                <span>{t('common.lastSaved')}</span>
                <span>{getTimeAgo(updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div 
            className="px-5 py-4 flex flex-col sm:flex-row gap-2"
            style={{ 
              backgroundColor: colors.infoBg,
              borderTop: `1px solid ${colors.border}`
            }}
          >
            <button
              type="button"
              onClick={onResume}
              className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all"
              style={{ backgroundColor: colors.accent }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <CheckCircle className="w-4 h-4" />
              {t('quizzes.quiz.continueQuiz')}
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
              style={{ 
                backgroundColor: 'transparent',
                color: colors.text,
                border: `2px solid ${colors.border}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <RotateCcw className="w-4 h-4" />
              {t('quizzes.quiz.startOver')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizRecoveryModal;
