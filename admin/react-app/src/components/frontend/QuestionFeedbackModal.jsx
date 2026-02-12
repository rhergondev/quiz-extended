import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader, MessageSquareWarning, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { messageService } from '../../api/services/messageService';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

// Helper function to normalize title (handle both string and {rendered, raw} object)
const normalizeTitle = (title) => {
  if (!title) return null;
  if (typeof title === 'string') return title;
  if (typeof title === 'object' && title.rendered) return title.rendered;
  if (typeof title === 'object' && title.raw) return title.raw;
  return String(title);
};

const QuestionFeedbackModal = ({
  question,
  initialFeedbackType = 'feedback',
  onClose,
  // Context for course-based message filtering
  courseId = null,
  courseName = null,
}) => {
  const [feedbackType, setFeedbackType] = useState(initialFeedbackType);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // Theme-aware colors
  const primaryColor = getColor('primary', '#3b82f6');
  const accentColor = getColor('accent', '#f59e0b');
  const bgCard = isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff';
  const bgSubtle = isDarkMode ? 'rgba(255,255,255,0.05)' : `${primaryColor}05`;
  const borderSubtle = isDarkMode ? 'rgba(255,255,255,0.1)' : `${primaryColor}15`;
  const textPrimary = isDarkMode ? getColor('textPrimary', '#f9fafb') : primaryColor;
  const textSecondary = getColor('textSecondary', '#6b7280');

  const questionTitle = normalizeTitle(question?.title);
  const normalizedCourseName = normalizeTitle(courseName);

  // Build context prefix — course name for admin filtering, followed by user message for subject display
  const buildContextPrefix = () => {
    if (normalizedCourseName || courseId) {
      return `(Curso: ${normalizedCourseName || `ID ${courseId}`}) `;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!message.trim()) {
      setError(t('quizzes.feedbackModal.errorEmptyMessage'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Context prefix goes first so the backend subject (first 200 chars) includes course info for filtering
      const contextPrefix = buildContextPrefix();
      const fullMessage = contextPrefix + message.trim();

      await messageService.submitFeedback({
        question_id: question.id,
        feedback_type: feedbackType,
        message: fullMessage,
      });
      setSuccess(true);
      setMessage('');
    } catch (err) {
      setError(err.message || t('quizzes.feedbackModal.errorSending'));
    } finally {
      setLoading(false);
    }
  };

  // Get icon and colors based on feedback type
  const getTypeStyles = () => {
    switch (feedbackType) {
      case 'challenge':
        return {
          icon: AlertTriangle,
          iconColor: accentColor,
          bgColor: `${accentColor}15`,
          label: t('quizzes.feedbackModal.optionChallenge')
        };
      case 'correction':
        return {
          icon: FileText,
          iconColor: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          label: t('quizzes.feedbackModal.optionCorrection') || 'Corrección'
        };
      default:
        return {
          icon: MessageSquareWarning,
          iconColor: primaryColor,
          bgColor: `${primaryColor}15`,
          label: t('quizzes.feedbackModal.optionFeedback')
        };
    }
  };

  const typeStyles = getTypeStyles();
  const TypeIcon = typeStyles.icon;

  return createPortal(
    <>
      {/* Overlay with blur - z-[10000] to sit above TopBar (z-9999), portaled to body */}
      <div
        className="fixed inset-0 bg-black/60 z-[10000] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-10 pointer-events-none">
        <div
          className="rounded-2xl shadow-2xl max-w-lg w-full max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-auto"
          style={{ 
            backgroundColor: bgCard,
            border: `1px solid ${borderSubtle}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              background: isDarkMode
                ? `linear-gradient(135deg, ${primaryColor}20 0%, ${accentColor}10 100%)`
                : `linear-gradient(135deg, ${primaryColor}10 0%, ${accentColor}08 100%)`
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: typeStyles.bgColor,
                  border: `1px solid ${typeStyles.iconColor}30`
                }}
              >
                <TypeIcon size={18} style={{ color: typeStyles.iconColor }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: textPrimary }}
              >
                {feedbackType === 'challenge'
                  ? t('quizzes.feedbackModal.titleChallenge')
                  : t('quizzes.feedbackModal.titleFeedback')
                }
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all flex-shrink-0"
              style={{
                color: textSecondary,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
              }}
              aria-label={t('quizzes.feedbackModal.close')}
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content */}
          {success ? (
            <div className="p-8 text-center">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                }}
              >
                <CheckCircle size={40} style={{ color: '#ffffff' }} />
              </div>
              <h4 
                className="text-2xl font-bold mb-2"
                style={{ color: textPrimary }}
              >
                {t('quizzes.feedbackModal.successTitle')}
              </h4>
              <p 
                className="text-sm mb-6"
                style={{ color: textSecondary }}
              >
                {t('quizzes.feedbackModal.successMessage')}
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl font-semibold transition-all shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                }}
              >
                {t('quizzes.feedbackModal.close')}
              </button>
            </div>
          ) : (
            <>
              {/* Form */}
              <div className="p-6 space-y-5">
                {/* Question Preview */}
                {questionTitle && (
                  <div 
                    className="p-4 rounded-xl"
                    style={{ 
                      backgroundColor: bgSubtle,
                      border: `1px solid ${borderSubtle}`
                    }}
                  >
                    <p 
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: textSecondary }}
                    >
                      {t('quizzes.feedbackModal.question')}
                    </p>
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: textPrimary }}
                      dangerouslySetInnerHTML={{ __html: questionTitle }}
                    />
                  </div>
                )}

                {/* Feedback Type Selector */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-2"
                    style={{ color: textPrimary }}
                  >
                    {t('quizzes.feedbackModal.messageType')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['feedback', 'challenge'].map((type) => {
                      const isSelected = feedbackType === type;
                      const styles = type === 'challenge' 
                        ? { color: accentColor, bg: `${accentColor}15` }
                        : { color: primaryColor, bg: `${primaryColor}15` };
                      
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFeedbackType(type)}
                          className="px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                          style={{
                            backgroundColor: isSelected ? styles.bg : bgSubtle,
                            color: isSelected ? styles.color : textSecondary,
                            border: `2px solid ${isSelected ? styles.color : 'transparent'}`,
                          }}
                        >
                          {type === 'challenge' && <AlertTriangle size={16} />}
                          {type === 'feedback' && <MessageSquareWarning size={16} />}
                          {type === 'feedback' && t('quizzes.feedbackModal.optionFeedback')}
                          {type === 'challenge' && t('quizzes.feedbackModal.optionChallenge')}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Message */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-2"
                    style={{ color: textPrimary }}
                  >
                    {t('quizzes.feedbackModal.yourMessage')}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none resize-none"
                    style={{
                      backgroundColor: bgSubtle,
                      border: `2px solid ${borderSubtle}`,
                      color: textPrimary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = borderSubtle;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder={
                      feedbackType === 'challenge' 
                        ? t('quizzes.feedbackModal.placeholderChallenge')
                        : t('quizzes.feedbackModal.placeholderFeedback')
                    }
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div 
                    className="flex items-center gap-3 p-4 rounded-xl text-sm"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444'
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div 
                className="flex items-center justify-end gap-3 px-6 py-4 border-t"
                style={{ 
                  borderColor: borderSubtle,
                  backgroundColor: bgSubtle
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-semibold transition-all duration-200"
                  style={{
                    color: textSecondary,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${primaryColor}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {t('quizzes.feedbackModal.cancel')}
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !message.trim()}
                  className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && message.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      {t('quizzes.feedbackModal.sending')}
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      {t('quizzes.feedbackModal.send')}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.querySelector('.qe-lms-app') || document.body
  );
};

export default QuestionFeedbackModal;
