import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader, MessageSquare, CheckCircle, AlertTriangle, Video } from 'lucide-react';
import { messageService } from '../../api/services/messageService';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

const normalizeTitle = (title) => {
  if (!title) return null;
  if (typeof title === 'string') return title;
  if (typeof title === 'object' && title.rendered) return title.rendered;
  if (typeof title === 'object' && title.raw) return title.raw;
  return String(title);
};

const convertToEmbedUrl = (url) => {
  if (!url) return null;
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  return url;
};

const VideoFeedbackModal = ({
  step,
  lesson,
  courseId = null,
  courseName = null,
  onClose,
}) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  const primaryColor = getColor('primary', '#3b82f6');
  const accentColor = getColor('accent', '#f59e0b');
  const bgCard = isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff';
  const bgSubtle = isDarkMode ? 'rgba(255,255,255,0.05)' : `${primaryColor}05`;
  const borderSubtle = isDarkMode ? 'rgba(255,255,255,0.1)' : `${primaryColor}15`;
  const textPrimary = isDarkMode ? getColor('textPrimary', '#f9fafb') : primaryColor;
  const textSecondary = getColor('textSecondary', '#6b7280');

  const rawVideoUrl = step?.data?.video_url || step?.data?.url || null;
  const embedUrl = rawVideoUrl ? convertToEmbedUrl(rawVideoUrl) : null;
  const videoTitle = step?.title || '';
  const normalizedCourseName = normalizeTitle(courseName);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!message.trim()) {
      setError(t('quizzes.feedbackModal.errorEmptyMessage'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const coursePrefix = (normalizedCourseName || courseId) ? `(Curso: ${normalizedCourseName || `ID ${courseId}`}) ` : '';
      const videoPrefix = rawVideoUrl ? `(Video: ${rawVideoUrl}) ` : '';
      const fullMessage = coursePrefix + videoPrefix + message.trim();

      await messageService.submitVideoFeedback({
        video_url: rawVideoUrl,
        course_id: courseId,
        lesson_id: lesson?.id || null,
        video_title: videoTitle || null,
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

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-[10000] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-10 pointer-events-none">
        <div
          className="rounded-2xl shadow-2xl max-w-lg w-full max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-auto"
          style={{ backgroundColor: bgCard, border: `1px solid ${borderSubtle}` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
                style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}30` }}
              >
                <MessageSquare size={18} style={{ color: primaryColor }} />
              </div>
              <h3 className="text-base font-bold" style={{ color: textPrimary }}>
                {t('quizzes.feedbackModal.titleFeedback')}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all flex-shrink-0"
              style={{ color: textSecondary, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          {success ? (
            <div className="p-8 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
              >
                <CheckCircle size={40} style={{ color: '#ffffff' }} />
              </div>
              <h4 className="text-2xl font-bold mb-2" style={{ color: textPrimary }}>
                {t('quizzes.feedbackModal.successTitle')}
              </h4>
              <p className="text-sm mb-6" style={{ color: textSecondary }}>
                {t('quizzes.feedbackModal.successMessage')}
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl font-semibold transition-all shadow-md"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`, color: '#ffffff' }}
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
              <div className="p-6 space-y-4">
                {/* Video Preview */}
                {videoTitle && (
                  <div className="p-3 rounded-xl" style={{ backgroundColor: bgSubtle, border: `1px solid ${borderSubtle}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Video size={13} style={{ color: textSecondary }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>
                        Video
                      </p>
                    </div>
                    <p className="text-sm font-medium mb-3" style={{ color: textPrimary }}>{videoTitle}</p>
                    {embedUrl && (
                      <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
                        <iframe
                          src={embedUrl}
                          className="w-full h-full border-0"
                          title={videoTitle}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: textPrimary }}>
                    {t('quizzes.feedbackModal.yourMessage')}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none resize-none"
                    style={{ backgroundColor: bgSubtle, border: `2px solid ${borderSubtle}`, color: textPrimary }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = borderSubtle;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder={t('quizzes.feedbackModal.placeholderFeedback')}
                  />
                </div>

                {error && (
                  <div
                    className="flex items-center gap-3 p-4 rounded-xl text-sm"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                  >
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 px-6 py-4 border-t"
                style={{ borderColor: borderSubtle, backgroundColor: bgSubtle }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-semibold transition-all duration-200"
                  style={{ color: textSecondary, backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : `${primaryColor}10`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {t('quizzes.feedbackModal.cancel')}
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !message.trim()}
                  className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`, color: '#ffffff' }}
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
                    <><Loader className="animate-spin" size={18} />{t('quizzes.feedbackModal.sending')}</>
                  ) : (
                    <><Send size={18} />{t('quizzes.feedbackModal.send')}</>
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

export default VideoFeedbackModal;
