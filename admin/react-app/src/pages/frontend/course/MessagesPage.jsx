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

  // Redirect admins to MessagesManager with course filter
  useEffect(() => {
    if (isAdmin && course && !courseLoading) {
      const title = course.title?.rendered || course.title;
      if (title) {
        navigate(`/admin/messages?search=${encodeURIComponent('(Curso: ' + title + ')')}`, { replace: true });
      }
    }
  }, [isAdmin, course, courseLoading, navigate]);

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

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('header.messages')}
    >
      <div className="h-full overflow-hidden pb-8">
        <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          {/* Main Container */}
          <div 
            className="h-full rounded-lg overflow-hidden border flex flex-col"
            style={{ 
              backgroundColor: getColor('background', '#ffffff'),
              borderColor: getColor('borderColor', '#e5e7eb')
            }}
          >
            {/* Header */}
            <div 
              className="px-3 py-2.5 flex-shrink-0"
              style={{ backgroundColor: getColor('primary', '#1a202c') }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={20} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                  <div>
                    <h3 className="text-base font-bold" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                      {t('header.messages')}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {computed.unreadMessages > 0 && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ 
                        backgroundColor: getColor('accent', '#f59e0b'),
                        color: '#ffffff'
                      }}
                    >
                      {computed.unreadMessages} {t('messages.unread')}
                    </span>
                  )}
                  <span 
                    className="text-xs"
                    style={{ color: getColor('textColorContrast', '#ffffff'), opacity: 0.7 }}
                  >
                    {pagination.total} {t('messages.totalMessages')}
                  </span>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div style={{ height: '1px', backgroundColor: getColor('borderColor', '#e5e7eb') }} />

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div 
                      className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
                      style={{ 
                        borderColor: `${pageColors.text}20`,
                        borderTopColor: pageColors.text
                      }}
                    />
                    <p style={{ color: pageColors.textMuted }}>
                      {t('messages.loading')}
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-3" style={{ color: '#ef4444' }} />
                    <p className="font-medium" style={{ color: '#ef4444' }}>{t('messages.error')}</p>
                    <p className="text-sm mt-1" style={{ color: pageColors.textMuted }}>
                      {error}
                    </p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-4">
                    <Inbox size={48} className="mx-auto mb-3" style={{ color: accent, opacity: 0.5 }} />
                    <h4 className="text-base font-semibold mb-1" style={{ color: pageColors.text }}>
                      {t('messages.emptyInbox')}
                    </h4>
                    <p className="text-xs" style={{ color: pageColors.textMuted }}>
                      {t('messages.emptyInboxDescription')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Message List - Left Panel */}
                  <div 
                    className="w-full md:w-2/5 lg:w-1/3 border-r overflow-y-auto flex-shrink-0"
                    style={{ 
                      borderColor: getColor('borderColor', '#e5e7eb'),
                      backgroundColor: getColor('secondaryBackground', '#f9fafb')
                    }}
                  >
                    {messages.map((message) => {
                      const isSelected = selectedMessage?.id === message.id;
                      const isUnread = message.status === 'unread';
                      
                      return (
                        <div
                          key={message.id}
                          onClick={() => handleSelectMessage(message)}
                          className="px-3 py-2.5 cursor-pointer border-b transition-all duration-150"
                          style={{ 
                            borderColor: getColor('borderColor', '#e5e7eb'),
                            backgroundColor: isSelected 
                              ? getColor('background', '#ffffff')
                              : 'transparent',
                            borderLeftWidth: isSelected ? '3px' : '0',
                            borderLeftColor: isSelected ? accent : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = getColor('background', '#ffffff');
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Unread indicator */}
                            <div 
                              className="flex-shrink-0 w-2 h-2 rounded-full"
                              style={{ 
                                backgroundColor: isUnread ? accent : 'transparent'
                              }}
                            />
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span 
                                  className={`text-xs truncate ${isUnread ? 'font-bold' : 'font-medium'}`}
                                  style={{ color: isUnread ? accent : pageColors.textMuted }}
                                >
                                  {message.sender_name || t('messages.system')}
                                </span>
                                <span 
                                  className="text-[10px] flex-shrink-0 ml-2"
                                  style={{ color: pageColors.textMuted }}
                                >
                                  {formatDate(message.created_at)}
                                </span>
                              </div>
                              <p 
                                className={`text-sm truncate mt-0.5 ${isUnread ? 'font-semibold' : ''}`}
                                style={{ color: pageColors.text }}
                              >
                                {message.subject}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Load More */}
                    {pagination.hasMore && (
                      <button
                        onClick={() => fetchMessages(false)}
                        className="w-full py-2 text-xs font-medium transition-colors"
                        style={{ 
                          color: accent,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = getColor('background', '#ffffff');
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {t('messages.loadMore')}
                      </button>
                    )}
                  </div>

                  {/* Message Detail - Right Panel */}
                  <div className="hidden md:flex flex-1 flex-col overflow-hidden">
                    {selectedMessage ? (
                      <>
                        {/* Message Header */}
                        <div 
                          className="px-4 py-3 border-b flex-shrink-0"
                          style={{ borderColor: getColor('borderColor', '#e5e7eb') }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h2 
                                className="text-base font-bold truncate"
                                style={{ color: pageColors.text }}
                              >
                                {selectedMessage.subject}
                              </h2>
                              <div className="flex items-center gap-3 mt-1 text-xs">
                                <span 
                                  className="font-medium"
                                  style={{ color: accent }}
                                >
                                  {selectedMessage.sender_name || t('messages.system')}
                                </span>
                                <span style={{ color: pageColors.textMuted }}>
                                  {formatFullDate(selectedMessage.created_at)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteMessage(selectedMessage.id)}
                              disabled={deletingId === selectedMessage.id}
                              className="flex-shrink-0 p-1.5 rounded transition-all disabled:opacity-50"
                              style={{ color: '#ef4444' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fee2e2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title={t('messages.delete')}
                            >
                              {deletingId === selectedMessage.id ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Message Body */}
                        <div 
                          className="flex-1 overflow-y-auto px-4 py-3"
                          style={{ backgroundColor: getColor('secondaryBackground', '#f9fafb') }}
                        >
                          <div 
                            className="prose prose-sm max-w-none text-sm"
                            style={{ color: pageColors.text }}
                            dangerouslySetInnerHTML={{ __html: selectedMessage.message }}
                          />
                        </div>

                        {/* Message Actions - only show if unread */}
                        {selectedMessage.status === 'unread' && (
                          <div 
                            className="px-4 py-2 border-t flex-shrink-0"
                            style={{ 
                              borderColor: getColor('borderColor', '#e5e7eb'),
                              backgroundColor: getColor('secondaryBackground', '#f9fafb')
                            }}
                          >
                            <button
                              onClick={() => updateMessageStatus(selectedMessage.id, 'read')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
                              style={{ 
                                backgroundColor: accent,
                                color: '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              <Check size={14} />
                              {t('messages.markAsRead')}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center px-4">
                          <Mail size={36} className="mx-auto mb-2" style={{ color: accent, opacity: 0.4 }} />
                          <p className="text-sm" style={{ color: pageColors.textMuted }}>
                            {t('messages.selectToRead')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Message Detail Modal */}
      {selectedMessage && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: getColor('background', '#ffffff') }}>
          {/* Mobile Header */}
          <div 
            className="px-3 py-2.5 flex items-center gap-2 border-b flex-shrink-0"
            style={{ 
              backgroundColor: getColor('primary', '#1a202c'),
              borderColor: getColor('borderColor', '#e5e7eb')
            }}
          >
            <button
              onClick={() => setSelectedMessage(null)}
              className="p-1.5 -ml-1 rounded"
              style={{ color: getColor('textColorContrast', '#ffffff') }}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h3 
                className="text-sm font-bold truncate"
                style={{ color: getColor('textColorContrast', '#ffffff') }}
              >
                {selectedMessage.subject}
              </h3>
              <p 
                className="text-[10px] truncate"
                style={{ color: getColor('accent', '#f59e0b') }}
              >
                {selectedMessage.sender_name || t('messages.system')}
              </p>
            </div>
            <button
              onClick={() => handleDeleteMessage(selectedMessage.id)}
              disabled={deletingId === selectedMessage.id}
              className="p-1.5 rounded disabled:opacity-50"
              style={{ color: '#ffffff' }}
            >
              {deletingId === selectedMessage.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>

          {/* Mobile Body */}
          <div 
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{ backgroundColor: getColor('background', '#ffffff') }}
          >
            <div className="flex items-center gap-2 mb-3 text-[10px]" style={{ color: getColor('textSecondary', '#6b7280') }}>
              <Clock size={10} />
              <span>{formatFullDate(selectedMessage.created_at)}</span>
            </div>
            <div 
              className="prose prose-sm max-w-none text-sm"
              style={{ color: pageColors.text }}
              dangerouslySetInnerHTML={{ __html: selectedMessage.message }}
            />
          </div>

          {/* Mobile Actions - only show if unread */}
          {selectedMessage.status === 'unread' && (
            <div 
              className="px-3 py-2 border-t flex-shrink-0"
              style={{ 
                borderColor: getColor('borderColor', '#e5e7eb'),
                backgroundColor: getColor('secondaryBackground', '#f9fafb')
              }}
            >
              <button
                onClick={() => updateMessageStatus(selectedMessage.id, 'read')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                style={{ 
                  backgroundColor: getColor('accent', '#f59e0b'),
                  color: '#ffffff'
                }}
              >
                <Check size={14} />
                {t('messages.markAsRead')}
              </button>
            </div>
          )}
        </div>
      )}
    </CoursePageTemplate>
  );
};

export default MessagesPage;