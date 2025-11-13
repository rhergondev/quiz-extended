import React, { useState } from 'react';
import { X, Send, Loader, MessageSquareWarning, CheckCircle, AlertTriangle } from 'lucide-react';
import { messageService } from '../../api/services/messageService';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

const QuestionFeedbackModal = ({ question, initialFeedbackType = 'feedback', onClose }) => {
  const [feedbackType, setFeedbackType] = useState(initialFeedbackType);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation();
  const { getColor } = useTheme();

  // Manejar tanto title.rendered como title directo
  const questionTitle = typeof question.title === 'object' && question.title?.rendered 
    ? question.title.rendered 
    : question.title;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError(t('quizzes.feedbackModal.errorEmptyMessage'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await messageService.submitFeedback({
        question_id: question.id,
        feedback_type: feedbackType,
        message: message,
      });
      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.message || t('quizzes.feedbackModal.errorSending'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 z-50" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex justify-center items-center p-4 pointer-events-none">
        <div 
          className="rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto border"
          style={{
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: getColor('primary', '#1a202c') + '20'
          }}
        >
          {success ? (
            <div className="text-center p-8">
              <CheckCircle 
                className="mx-auto h-16 w-16 mb-4" 
                style={{ color: getColor('success', '#22c55e') }}
              />
              <h3 
                className="text-xl font-bold mb-2"
                style={{ color: getColor('primary', '#1a202c') }}
              >
                {t('quizzes.feedbackModal.successTitle')}
              </h3>
              <p 
                className="text-sm mb-6"
                style={{ color: getColor('text', '#6b7280') }}
              >
                {t('quizzes.feedbackModal.successMessage')}
              </p>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                style={{
                  backgroundColor: getColor('primary', '#1a202c'),
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {t('quizzes.feedbackModal.close')}
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div 
                className="p-6 border-b"
                style={{ 
                  backgroundColor: getColor('primary', '#1a202c') + '05',
                  borderColor: getColor('primary', '#1a202c') + '15'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {feedbackType === 'challenge' ? (
                      <AlertTriangle 
                        className="w-6 h-6" 
                        style={{ color: getColor('error', '#ef4444') }}
                      />
                    ) : (
                      <MessageSquareWarning 
                        className="w-6 h-6" 
                        style={{ color: getColor('primary', '#1a202c') }}
                      />
                    )}
                    <h2 
                      className="text-xl font-bold"
                      style={{ color: getColor('primary', '#1a202c') }}
                    >
                      {feedbackType === 'challenge' 
                        ? t('quizzes.feedbackModal.titleChallenge')
                        : t('quizzes.feedbackModal.titleFeedback')
                      }
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-all duration-200"
                    style={{ color: getColor('text', '#6b7280') }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c') + '10';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label={t('quizzes.feedbackModal.close')}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <p 
                  className="text-sm mb-6 p-3 rounded-lg"
                  style={{ 
                    color: getColor('text', '#6b7280'),
                    backgroundColor: getColor('primary', '#1a202c') + '05'
                  }}
                >
                  <span className="font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                    {t('quizzes.feedbackModal.question')}:
                  </span>{' '}
                  <span dangerouslySetInnerHTML={{ __html: questionTitle || '' }} />
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label 
                      htmlFor="feedbackType" 
                      className="block text-sm font-semibold mb-2"
                      style={{ color: getColor('primary', '#1a202c') }}
                    >
                      {t('quizzes.feedbackModal.messageType')}
                    </label>
                    <select
                      id="feedbackType"
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: getColor('background', '#ffffff'),
                        borderColor: getColor('primary', '#1a202c') + '30',
                        color: getColor('primary', '#1a202c')
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = getColor('primary', '#1a202c');
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = getColor('primary', '#1a202c') + '30';
                      }}
                    >
                      <option value="feedback">{t('quizzes.feedbackModal.optionFeedback')}</option>
                      <option value="challenge">{t('quizzes.feedbackModal.optionChallenge')}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label 
                      htmlFor="message" 
                      className="block text-sm font-semibold mb-2"
                      style={{ color: getColor('primary', '#1a202c') }}
                    >
                      {t('quizzes.feedbackModal.yourMessage')}
                    </label>
                    <textarea
                      id="message"
                      rows="5"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 resize-none"
                      style={{
                        backgroundColor: getColor('background', '#ffffff'),
                        borderColor: getColor('primary', '#1a202c') + '30',
                        color: getColor('primary', '#1a202c')
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = getColor('primary', '#1a202c');
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = getColor('primary', '#1a202c') + '30';
                      }}
                      placeholder={
                        feedbackType === 'challenge' 
                          ? t('quizzes.feedbackModal.placeholderChallenge')
                          : t('quizzes.feedbackModal.placeholderFeedback')
                      }
                    />
                  </div>
                  
                  {error && (
                    <div 
                      className="p-3 rounded-lg flex items-center gap-2"
                      style={{ 
                        backgroundColor: getColor('error', '#ef4444') + '10',
                        color: getColor('error', '#ef4444')
                      }}
                    >
                      <AlertTriangle size={16} />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div 
                className="p-4 border-t flex justify-end gap-3"
                style={{ borderColor: getColor('primary', '#1a202c') + '15' }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                  style={{
                    color: getColor('text', '#6b7280'),
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c') + '10';
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
                  disabled={loading}
                  className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: getColor('primary', '#1a202c'),
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      {t('quizzes.feedbackModal.sending')}
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      {t('quizzes.feedbackModal.send')}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default QuestionFeedbackModal;