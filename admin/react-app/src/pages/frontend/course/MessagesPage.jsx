import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, Mail, MailOpen, Trash2, ChevronLeft, 
  Inbox, AlertCircle, Clock, Check
} from 'lucide-react';

// Hooks & Context
import { useMessagesContext } from '../../../contexts/MessagesContext';
import useCourse from '../../../hooks/useCourse';
import { useTheme } from '../../../contexts/ThemeContext';

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

  // Colores del tema
  const primary = getColor('primary', '#3b82f6');
  const accent = getColor('accent', '#f59e0b');
  const textPrimary = getColor('textPrimary', '#f9fafb');
  const textSecondary = getColor('textSecondary', '#6b7280');

  // Colores adaptativos según el modo (misma lógica que sidebar/topbar)
  const pageColors = {
    text: isDarkMode ? textPrimary : primary,
    textMuted: textSecondary,
    hoverBg: isDarkMode ? accent : primary,
  };
  
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

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('messages.yesterday');
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  const formatFullDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isLoading = courseLoading || loading;

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

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('header.messages')}
      icon={MessageSquare}
      loading={courseLoading}
    >
      <div className="flex flex-col p-3 gap-3" style={{ backgroundColor: isDarkMode ? getColor('secondaryBackground', '#111827') : '#f5f7fa' }}>
        {/* Main Content */}
        <div className="flex-1 flex gap-3">
          {/* LEFT PANEL - Message List */}
          <div 
            className="w-64 flex-shrink-0 flex flex-col rounded-xl overflow-hidden" 
            style={{ 
              backgroundColor: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
              boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
              maxHeight: 'calc(100vh - 120px)'
            }}
          >
            <div className="p-3" style={{ borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ 
                    background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                    boxShadow: `0 2px 8px ${isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'}`
                  }}
                >
                  <MessageSquare size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold truncate" style={{ color: pageColors.text }}>
                    {t('header.messages')}
                  </h2>
                  {computed.unreadMessages > 0 && (
                    <p className="text-xs" style={{ color: pageColors.textMuted }}>
                      <span className="font-semibold" style={{ color: '#ef4444' }}>{computed.unreadMessages}</span> sin leer
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && messages.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${accent}30`, borderTopColor: accent }} />
                </div>
              )}
              
              {!isLoading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Inbox size={28} style={{ color: pageColors.textMuted, opacity: 0.5 }} />
                  <p className="text-sm mt-3" style={{ color: pageColors.textMuted }}>
                    {t('messages.emptyInbox')}
                  </p>
                </div>
              )}

              {messages.map((message) => {
                const isSelected = selectedMessage?.id === message.id;
                const isUnread = message.status === 'unread';
                
                return (
                  <div 
                    key={message.id} 
                    onClick={() => handleSelectMessage(message)} 
                    className="px-3 py-2 cursor-pointer transition-all duration-200" 
                    style={{ 
                      borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)') : 'transparent', 
                      borderLeft: isSelected ? `2px solid ${accent}` : '2px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe' }}>
                        <AlertCircle size={12} style={{ color: '#3b82f6' }} />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`text-xs truncate ${isUnread ? 'font-bold' : 'font-medium'}`} style={{ color: isUnread ? pageColors.text : pageColors.textMuted, maxWidth: '100px' }}>
                          {message.sender_name || t('messages.system')}
                        </span>
                        <span className="text-xs flex-shrink-0" style={{ color: pageColors.textMuted }}>
                          {formatDate(message.created_at)}
                        </span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#ef4444' }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL - Message Detail */}
          <div 
            className="flex-1 flex flex-col rounded-xl overflow-hidden" 
            style={{ 
              backgroundColor: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
              boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
              maxHeight: 'calc(100vh - 120px)'
            }}
          >
            {selectedMessage ? (
              <>
                <div 
                  className="px-3 py-2 flex items-center justify-between" 
                  style={{ 
                    backgroundColor: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
                    borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" 
                      style={{ 
                        background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                      }}
                    >
                      <Mail size={14} className="text-white" />
                    </div>
                    <span className="font-bold text-sm truncate" style={{ color: pageColors.text }}>
                      {selectedMessage.sender_name || t('messages.system')}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: pageColors.textMuted }}>
                      {formatFullDate(selectedMessage.created_at)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                    disabled={deletingId === selectedMessage.id}
                    className="p-1.5 rounded-lg transition-all duration-200 disabled:opacity-50" 
                    style={{ 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                      color: '#ef4444'
                    }} 
                    title={t('messages.delete')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
                    }}
                  >
                    {deletingId === selectedMessage.id ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div 
                    className="prose prose-sm max-w-none text-sm"
                    style={{ color: pageColors.text }}
                    dangerouslySetInnerHTML={{ __html: cleanMessageContent(selectedMessage.message, selectedMessage.subject) }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-4">
                  <Mail size={48} style={{ color: accent, opacity: 0.3 }} className="mx-auto mb-3" />
                  <p className="text-sm" style={{ color: pageColors.textMuted }}>
                    {t('messages.selectToRead')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default MessagesPage;