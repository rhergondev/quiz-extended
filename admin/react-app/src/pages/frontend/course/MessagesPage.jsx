import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, Mail, MailOpen, Trash2, ChevronLeft, 
  Inbox, AlertCircle, Clock, Check, RefreshCw, User, Eye,
  FileQuestion, ChevronDown, ChevronUp, CheckCircle, XCircle, Send
} from 'lucide-react';

// Hooks & Context
import { useMessagesContext } from '../../../contexts/MessagesContext';
import useCourse from '../../../hooks/useCourse';
import { useTheme } from '../../../contexts/ThemeContext';
import { getApiConfig } from '../../../api/config/apiConfig';
import { makeApiRequest } from '../../../api/services/baseService';

// Components
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import MessagesManager from '../../../components/messages/MessagesManager';

// Helper to remove metadata and duplicated subject from message
const cleanMessageContent = (content, subject = '') => {
  if (!content) return '';
  
  // 1. Remove metadata pattern: (Curso: ...) (Lección: ...) (Pregunta ID: ...)
  let cleaned = content.replace(/(\(Curso:[^)]+\)\s*\(Lección:[^)]+\)\s*\(Pregunta ID:[^)]+\))/gi, '');
  
  // 2. Remove subject if it appears at the start (ignoring tags/whitespace)
  if (subject) {
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const subjectPattern = new RegExp(`^\\s*(?:<[^>]+>\\s*)*${escapeRegExp(subject.trim())}\\s*(?:<\\/[^>]+>\\s*)*`, 'i');
    cleaned = cleaned.replace(subjectPattern, '');
  }

  // 3. Cleanup empty tags/whitespace
  return cleaned.replace(/<p>\s*<\/p>/gi, '').trim();
};

const MessagesPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getColor, isDarkMode } = useTheme();
  const { course, loading: courseLoading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  // Check if user is admin
  const isAdmin = window.qe_data?.user?.capabilities?.manage_options === true || 
                  window.qe_data?.user?.is_admin === true;

  // pageColors pattern - unified with admin MessagesManager
  const pageColors = useMemo(() => ({
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgPage: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    inputBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  }), [getColor, isDarkMode]);
  
  // Messages from global context
  const {
    messages,
    loading,
    error,
    pagination,
    computed,
    updateMessageStatus,
    deleteMessage,
    fetchMessages
  } = useMessagesContext();

  // State
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [relatedQuestion, setRelatedQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [parentMessage, setParentMessage] = useState(null);
  const [loadingParent, setLoadingParent] = useState(false);

  // Load parent message when a reply is selected
  useEffect(() => {
    const loadParent = async () => {
      if (selectedMessage?.parent_id) {
        setLoadingParent(true);
        try {
          const config = getApiConfig();
          const response = await makeApiRequest(`${config.endpoints.custom_api}/messages/${selectedMessage.id}/parent`);
          setParentMessage(response.data?.data?.parent || null);
        } catch (err) {
          console.error('Error loading parent message:', err);
          setParentMessage(null);
        } finally {
          setLoadingParent(false);
        }
      } else {
        setParentMessage(null);
      }
    };
    loadParent();
  }, [selectedMessage]);

  // Load related question when message is selected
  useEffect(() => {
    const loadQuestion = async () => {
      if (selectedMessage?.related_object_id) {
        setLoadingQuestion(true);
        try {
          const config = getApiConfig();
          const response = await makeApiRequest(`${config.endpoints.questions}/${selectedMessage.related_object_id}?context=view`);
          setRelatedQuestion(response.data || response);
        } catch (err) {
          console.error('Error loading question:', err);
          setRelatedQuestion(null);
        } finally {
          setLoadingQuestion(false);
        }
      } else {
        setRelatedQuestion(null);
      }
    };
    loadQuestion();
    setShowQuestion(false);
  }, [selectedMessage]);

  // Reset selected message when messages change
  useEffect(() => {
    if (selectedMessage && !messages.find(m => m.id === selectedMessage.id)) {
      setSelectedMessage(null);
    }
  }, [messages, selectedMessage]);

  // Select a message and mark as read
  const handleSelectMessage = useCallback((message) => {
    setSelectedMessage(message);
    if (message.status === 'unread') {
      updateMessageStatus(message.id, 'read');
    }
  }, [updateMessageStatus]);

  // Close panel
  const handleClosePanel = useCallback(() => {
    setSelectedMessage(null);
  }, []);

  // Delete a message
  const handleDeleteMessage = useCallback(async (messageId) => {
    setDeletingId(messageId);
    try {
      await deleteMessage(messageId);
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
    } finally {
      setDeletingId(null);
    }
  }, [deleteMessage, selectedMessage]);

  // Format date for table
  const formatTableDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('messages.yesterday') || 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  const isLoading = courseLoading || loading;
  const isPanelOpen = !!selectedMessage;

  // If admin, show MessagesManager directly within course context
  if (isAdmin && course && !courseLoading) {
    const title = course.title?.rendered || course.title;
    return (
      <CoursePageTemplate
        courseId={courseId}
        courseName={courseName}
        sectionName={t('header.messages')}
        icon={MessageSquare}
        loading={courseLoading}
      >
        <MessagesManager initialSearch={title ? `(Curso: ${title})` : ''} courseMode={true} />
      </CoursePageTemplate>
    );
  }

  // User view - simplified table layout similar to admin
  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('header.messages')}
      icon={MessageSquare}
      loading={courseLoading}
    >
      <div className="flex flex-col relative" style={{ backgroundColor: pageColors.bgPage, height: 'calc(100vh - 52px)', maxHeight: 'calc(100vh - 52px)' }}>
        <div className="flex-1 relative overflow-hidden min-h-0">
          {/* LIST VIEW - Slides out to left when detail is open */}
          <div 
            className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${
              isPanelOpen ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            {/* HEADER BAR */}
            <div 
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ 
                backgroundColor: pageColors.bgCard,
                borderBottom: `1px solid ${pageColors.cardBorder}`
              }}
            >
              {/* Left: Title */}
              <div className="flex items-center gap-2 text-sm" style={{ color: pageColors.textMuted }}>
                <Inbox size={16} />
                <span className="font-medium">{t('header.messages')}</span>
                {computed.unreadMessages > 0 && (
                  <span 
                    className="px-2 py-0.5 text-xs font-bold rounded-full text-white"
                    style={{ backgroundColor: pageColors.error }}
                  >
                    {computed.unreadMessages} sin leer
                  </span>
                )}
              </div>

              {/* Right: Refresh */}
              <button 
                onClick={() => fetchMessages?.()}
                disabled={loading}
                className="p-2 rounded-lg transition-all duration-200"
                style={{ 
                  backgroundColor: pageColors.inputBg, 
                  border: `1px solid ${pageColors.cardBorder}`,
                  color: pageColors.textMuted
                }}
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-hidden p-4">
              <div 
                className="h-full rounded-xl overflow-hidden flex flex-col"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  border: `1px solid ${pageColors.cardBorder}`,
                  boxShadow: pageColors.shadow
                }}
              >
                {/* Table Header */}
                <div 
                  className="grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider flex-shrink-0"
                  style={{ 
                    gridTemplateColumns: '1fr 1.5fr 120px',
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.textMuted,
                    borderBottom: `1px solid ${pageColors.cardBorder}`
                  }}
                >
                  <div>Remitente</div>
                  <div>Mensaje</div>
                  <div className="flex items-center gap-1"><Clock size={12} />Fecha</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading && messages.length === 0 && (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} />
                    </div>
                  )}
                  {!isLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48">
                      <Inbox size={40} style={{ color: pageColors.textMuted, opacity: 0.3 }} />
                      <p className="text-sm mt-3" style={{ color: pageColors.textMuted }}>
                        {t('messages.emptyInbox')}
                      </p>
                    </div>
                  )}
                  {messages.map((message) => {
                    const isUnread = message.status === 'unread';
                    return (
                      <div 
                        key={message.id}
                        className="grid gap-4 px-4 py-3 items-center cursor-pointer transition-all duration-150"
                        style={{ 
                          gridTemplateColumns: '1fr 1.5fr 120px',
                          backgroundColor: 'transparent',
                          borderBottom: `1px solid ${pageColors.cardBorder}`,
                        }}
                        onClick={() => handleSelectMessage(message)}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = pageColors.hoverBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: pageColors.inputBg }}>
                            <User size={14} style={{ color: pageColors.textMuted }} />
                          </div>
                          <span className={`text-sm truncate ${isUnread ? 'font-semibold' : ''}`} style={{ color: isUnread ? pageColors.text : pageColors.textMuted }}>
                            {message.sender_name || t('messages.system')}
                          </span>
                          {isUnread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pageColors.error }} />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${isUnread ? 'font-medium' : ''}`} style={{ color: pageColors.text }}>
                            {cleanMessageContent(message.message, message.subject) ? cleanMessageContent(message.message, message.subject).replace(/<[^>]*>/g, '').substring(0, 100) : '(Sin mensaje)'}
                          </p>
                        </div>
                        <div className="text-xs" style={{ color: pageColors.textMuted }}>
                          {formatTableDate(message.created_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* DETAIL PANEL - Slides in from right */}
          <div 
            className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${
              isPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ backgroundColor: pageColors.bgPage }}
          >
            {selectedMessage && (
              <>
                {/* Detail Header */}
                <div 
                  className="px-4 py-3 flex items-center justify-between flex-shrink-0"
                  style={{ 
                    backgroundColor: pageColors.bgCard,
                    borderBottom: `1px solid ${pageColors.cardBorder}`
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                      onClick={handleClosePanel} 
                      className="p-2 rounded-lg transition-all mr-2" 
                      style={{ backgroundColor: pageColors.inputBg, color: pageColors.text }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" 
                      style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)` }}
                    >
                      <User size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm block truncate" style={{ color: pageColors.text }}>
                        {selectedMessage.sender_name || t('messages.system')}
                      </span>
                      <span className="text-xs" style={{ color: pageColors.textMuted }}>
                        {new Date(selectedMessage.created_at).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-3xl mx-auto space-y-4">
                    
                    {/* Loading parent indicator */}
                    {loadingParent && (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} />
                      </div>
                    )}

                    {/* 1. Original message (parent) - user's feedback/question - RIGHT SIDE */}
                    {parentMessage && (
                      <div className="flex gap-3 justify-end max-w-4xl ml-auto">
                        <div className="max-w-[85%]">
                          <div 
                            className="rounded-2xl rounded-tr-sm p-4" 
                            style={{ 
                              background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`,
                              color: '#fff',
                              boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)'
                            }}
                          >
                            <div 
                              className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed break-words" 
                              dangerouslySetInnerHTML={{ __html: cleanMessageContent(parentMessage.message, parentMessage.subject) }} 
                            />
                          </div>
                          <p className="text-xs mt-2 mr-3 text-right" style={{ color: pageColors.textMuted }}>
                            {t('messages.you') || 'Tú'} • {new Date(parentMessage.created_at).toLocaleString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div 
                          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" 
                          style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)` }}
                        >
                          <Send size={14} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* 2. Related Question Viewer - centered between messages */}
                    {selectedMessage.related_object_id && (
                      <div 
                        className="mx-4 sm:mx-8 rounded-xl overflow-hidden"
                        style={{ 
                          backgroundColor: pageColors.inputBg, 
                          border: `1px solid ${pageColors.cardBorder}` 
                        }}
                      >
                        {/* Toggle header */}
                        <button
                          onClick={() => setShowQuestion(!showQuestion)}
                          className="w-full flex items-center justify-between p-4 transition-all"
                          style={{ color: pageColors.text }}
                        >
                          <div className="flex items-center gap-2">
                            <FileQuestion size={18} style={{ color: pageColors.accent }} />
                            <span className="font-medium text-sm">
                              {loadingQuestion ? 'Cargando pregunta...' : 'Ver pregunta relacionada'}
                            </span>
                          </div>
                          {showQuestion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        {/* Question content */}
                        {showQuestion && relatedQuestion && (
                          <div className="p-4 pt-0 space-y-4">
                            {/* Question title/enunciado */}
                            <div 
                              className="p-4 rounded-xl"
                              style={{ 
                                backgroundColor: pageColors.bgCard, 
                                border: `1px solid ${pageColors.cardBorder}` 
                              }}
                            >
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: pageColors.textMuted }}>
                                Enunciado
                              </p>
                              <div 
                                className="text-sm leading-relaxed prose prose-sm max-w-none"
                                style={{ color: pageColors.text }}
                                dangerouslySetInnerHTML={{ __html: relatedQuestion.title?.rendered || relatedQuestion.title || '' }}
                              />
                            </div>

                            {/* Options/Answers */}
                            {relatedQuestion.meta?._question_options && relatedQuestion.meta._question_options.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: pageColors.textMuted }}>
                                  Respuestas
                                </p>
                                <div className="space-y-2">
                                  {relatedQuestion.meta._question_options.map((option, index) => (
                                    <div 
                                      key={index}
                                      className="flex items-start gap-3 p-3 rounded-lg"
                                      style={{ 
                                        backgroundColor: option.isCorrect 
                                          ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5')
                                          : pageColors.bgCard,
                                        border: `1px solid ${option.isCorrect 
                                          ? (isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0')
                                          : pageColors.cardBorder}`
                                      }}
                                    >
                                      <div className="flex-shrink-0 mt-0.5">
                                        {option.isCorrect ? (
                                          <CheckCircle size={16} style={{ color: pageColors.success }} />
                                        ) : (
                                          <XCircle size={16} style={{ color: pageColors.textMuted }} />
                                        )}
                                      </div>
                                      <span 
                                        className="text-sm"
                                        style={{ color: option.isCorrect ? pageColors.success : pageColors.text }}
                                        dangerouslySetInnerHTML={{ __html: option.text || '' }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            {relatedQuestion.content?.rendered && (
                              <div 
                                className="p-4 rounded-xl"
                                style={{ 
                                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                                  border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe'}`
                                }}
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: pageColors.info }}>
                                  Explicación
                                </p>
                                <div 
                                  className="text-sm leading-relaxed prose prose-sm max-w-none"
                                  style={{ color: pageColors.text }}
                                  dangerouslySetInnerHTML={{ __html: relatedQuestion.content.rendered }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. Reply/Response from admin - LEFT SIDE */}
                    <div className="flex gap-3 max-w-4xl">
                      <div 
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" 
                        style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)` }}
                      >
                        <User size={16} className="text-white" />
                      </div>
                      <div className="max-w-[85%]">
                        <div 
                          className="rounded-2xl rounded-tl-sm p-4" 
                          style={{ 
                            backgroundColor: pageColors.bgCard, 
                            border: `1px solid ${pageColors.cardBorder}`, 
                            boxShadow: pageColors.shadowSm 
                          }}
                        >
                          <div 
                            className="text-sm prose prose-sm max-w-none leading-relaxed break-words" 
                            style={{ color: pageColors.text }} 
                            dangerouslySetInnerHTML={{ __html: cleanMessageContent(selectedMessage.message, selectedMessage.subject) }} 
                          />
                        </div>
                        <p className="text-xs mt-2 ml-3" style={{ color: pageColors.textMuted }}>
                          {parentMessage ? (t('messages.adminResponse') || 'Respuesta') : (selectedMessage.sender_name || t('messages.system'))} • {new Date(selectedMessage.created_at).toLocaleString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Info note */}
                    <div 
                      className="mt-6 p-4 rounded-xl text-center"
                      style={{ 
                        backgroundColor: pageColors.inputBg, 
                        border: `1px solid ${pageColors.cardBorder}` 
                      }}
                    >
                      <p className="text-sm" style={{ color: pageColors.textMuted }}>
                        {t('messages.contactSupport') || 'Para responder a este mensaje, contacta al soporte del curso.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default MessagesPage;