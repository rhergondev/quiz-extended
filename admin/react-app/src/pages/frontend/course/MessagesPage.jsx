import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare, Mail, MailOpen, ChevronLeft,
  Inbox, Clock, RefreshCw, User,
  FileQuestion, ChevronDown, ChevronUp, CheckCircle, XCircle, Send,
  Flag, MessageCircle, Archive, ArrowRight, Video
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

// Helper to strip metadata prefixes from message content (supports old and new format)
const cleanMessageContent = (content) => {
  if (!content) return '';
  return content
    .replace(/\(Curso:[^)]+\)\s*/gi, '')
    .replace(/\(Lección:[^)]+\)\s*/gi, '')
    .replace(/\(Pregunta ID:[^)]+\)\s*/gi, '')
    .replace(/\(Video:[^)]+\)\s*/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
};

// Extract raw video URL from (Video: URL) metadata prefix
const extractVideoUrl = (content) => {
  if (!content) return null;
  const match = content.match(/\(Video:\s*([^)]+)\)/i);
  return match ? match[1].trim() : null;
};

// Convert video URL to embeddable iframe format
const convertToEmbedUrl = (url) => {
  if (!url) return null;
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  return url;
};

const MessagesPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
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
    pagination,
    computed,
    updateMessageStatus,
    fetchMessages
  } = useMessagesContext();

  // State
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [relatedQuestion, setRelatedQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [parentMessage, setParentMessage] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loadingParent, setLoadingParent] = useState(false);

  // TEMPORARY: Show all messages for non-admin users
  // TODO: Backend needs to add course_id field to messages or provide a course filter endpoint
  const filteredMessages = useMemo(() => {
    console.log('📬 MessagesPage: Showing all messages (no course filter available):', messages.length);
    return messages;
  }, [messages]);

  // Count unread messages in filtered set
  const filteredUnreadCount = useMemo(() => {
    return filteredMessages.filter(msg => msg.status === 'unread').length;
  }, [filteredMessages]);

  // Load parent message and full thread when a reply is selected
  useEffect(() => {
    const loadParent = async () => {
      if (selectedMessage?.parent_id) {
        setLoadingParent(true);
        try {
          const config = getApiConfig();
          const response = await makeApiRequest(`${config.endpoints.custom_api}/messages/${selectedMessage.id}/parent`);
          const data = response.data?.data || response.data || {};
          setParentMessage(data.parent || null);
          setThreadMessages(data.thread_messages || []);
        } catch (err) {
          console.error('Error loading parent message:', err);
          setParentMessage(null);
          setThreadMessages([]);
        } finally {
          setLoadingParent(false);
        }
      } else {
        setParentMessage(null);
        setThreadMessages([]);
      }
    };
    loadParent();
  }, [selectedMessage]);

  // Load related question when message is selected (skip for video_feedback type)
  useEffect(() => {
    const loadQuestion = async () => {
      const effectiveType = parentMessage?.type || selectedMessage?.type;
      if (selectedMessage?.related_object_id && effectiveType !== 'video_feedback' && effectiveType !== 'video_challenge') {
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
  }, [selectedMessage, parentMessage]);

  // Reset selected message when filtered messages change
  useEffect(() => {
    if (selectedMessage && !filteredMessages.find(m => m.id === selectedMessage.id)) {
      setSelectedMessage(null);
    }
  }, [filteredMessages, selectedMessage]);

  // Select a message — mark as read silently (updates badge/counter) but don't change displayed status
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

  // Format date - relative for mobile cards
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
        <div className="flex flex-col relative" style={{ backgroundColor: pageColors.bgPage, height: 'calc(100dvh - 84px)', maxHeight: 'calc(100dvh - 84px)', overflow: 'hidden' }}>
          <MessagesManager initialSearch={title ? `(Curso: ${title})` : ''} courseMode={true} />
        </div>
      </CoursePageTemplate>
    );
  }

  // --- Helper functions matching admin MessagesManager ---
  const getTypeInfo = (type) => {
    if (type === 'question_feedback') return { icon: MessageCircle, label: 'Duda', color: pageColors.info, bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' };
    if (type === 'question_challenge') return { icon: Flag, label: 'Impugnación', color: pageColors.error, bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' };
    if (type === 'video_feedback') return { icon: Video, label: 'Duda (Video)', color: pageColors.info, bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' };
    if (type === 'video_challenge') return { icon: Flag, label: 'Impugnación (Video)', color: pageColors.error, bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' };
    if (type === 'admin_reply') return { icon: Send, label: 'Respuesta', color: isDarkMode ? '#93c5fd' : pageColors.primary, bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' };
    if (type?.startsWith('admin_')) return { icon: Mail, label: 'Aviso', color: pageColors.accent, bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' };
    return { icon: Mail, label: 'Mensaje', color: pageColors.textMuted, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6' };
  };

  // Non-admin status: show what the admin set. Messages with parent_id are admin replies = "Respondido"
  const getStatusInfo = (status, message = null) => {
    // If message is an admin reply (has parent_id), the reply itself IS the resolution
    if (message?.parent_id) return { label: 'Respondido', color: pageColors.success, bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5', icon: CheckCircle };
    if (status === 'resolved') return { label: 'Resuelto', color: pageColors.success, bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5', icon: CheckCircle };
    if (status === 'unread') return { label: 'Nuevo', color: pageColors.accent, bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', icon: Mail };
    if (status === 'read') return { label: 'Leído', color: pageColors.textMuted, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6', icon: MailOpen };
    return { label: status || 'Archivado', color: pageColors.textMuted, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6', icon: Archive };
  };

  const formatFullDate = (dateString) => new Date(dateString).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatDesktopDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // User view - table layout matching admin MessagesManager
  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('header.messages')}
      icon={MessageSquare}
      loading={courseLoading}
    >
      <div className="flex flex-col relative" style={{ backgroundColor: pageColors.bgPage, height: 'calc(100dvh - 68px)', maxHeight: 'calc(100dvh - 68px)', overflow: 'hidden' }}>
        <div className="flex-1 relative overflow-hidden min-h-0" style={{ overflowX: 'hidden' }}>
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
                {filteredUnreadCount > 0 && (
                  <span
                    className="px-2 py-0.5 text-xs font-bold rounded-full text-white"
                    style={{ backgroundColor: pageColors.error }}
                  >
                    {filteredUnreadCount} sin leer
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

            {/* TABLE / MOBILE CARDS */}
            <div className="flex-1 overflow-hidden p-2 sm:p-4">
              <div
                className="h-full rounded-xl overflow-hidden flex flex-col"
                style={{
                  backgroundColor: pageColors.bgCard,
                  border: `1px solid ${pageColors.cardBorder}`,
                  boxShadow: pageColors.shadow
                }}
              >
                {/* Table Header - Hidden on mobile */}
                <div
                  className="hidden md:grid qe-msg-grid-user gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider flex-shrink-0"
                  style={{
                    backgroundColor: pageColors.inputBg,
                    color: pageColors.textMuted,
                    borderBottom: `1px solid ${pageColors.cardBorder}`
                  }}
                >
                  <div>Remitente</div>
                  <div>Mensaje</div>
                  <div>Tipo</div>
                  <div>Estado</div>
                  <div className="hidden lg:flex items-center gap-1"><Clock size={12} />Fecha</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto pb-4">
                  {isLoading && filteredMessages.length === 0 && (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} />
                    </div>
                  )}
                  {!isLoading && filteredMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48">
                      <Inbox size={40} style={{ color: pageColors.textMuted, opacity: 0.3 }} />
                      <p className="text-sm mt-3" style={{ color: pageColors.textMuted }}>
                        {t('messages.emptyInbox')}
                      </p>
                    </div>
                  )}
                  {filteredMessages.map((message) => {
                    const isUnread = message.status === 'unread';
                    const typeInfo = getTypeInfo(message.type);
                    const statusInfo = getStatusInfo(message.status, message);
                    const TypeIcon = typeInfo.icon;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <React.Fragment key={message.id}>
                        {/* Desktop Row */}
                        <div
                          className="hidden md:grid qe-msg-grid-user gap-4 px-4 py-3 items-center cursor-pointer transition-all duration-150"
                          style={{
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
                              {cleanMessageContent(message.message) ? cleanMessageContent(message.message).replace(/<[^>]*>/g, '').substring(0, 100) : '(Sin mensaje)'}
                            </p>
                          </div>
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: typeInfo.bgColor, color: typeInfo.color }}>
                              <TypeIcon size={12} />{typeInfo.label}
                            </span>
                          </div>
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}>
                              <StatusIcon size={12} />{statusInfo.label}
                            </span>
                          </div>
                          <div className="hidden lg:block text-xs" style={{ color: pageColors.textMuted }}>
                            {formatDesktopDate(message.created_at)}
                          </div>
                        </div>

                        {/* Mobile Card */}
                        <div
                          className="md:hidden p-3 cursor-pointer transition-all duration-150 active:scale-[0.99]"
                          style={{
                            backgroundColor: 'transparent',
                            borderBottom: `1px solid ${pageColors.cardBorder}`,
                          }}
                          onClick={() => handleSelectMessage(message)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar with unread indicator */}
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: pageColors.inputBg }}>
                                <User size={16} style={{ color: pageColors.textMuted }} />
                              </div>
                              {isUnread && (
                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ backgroundColor: pageColors.error, borderColor: pageColors.bgCard }} />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header row: sender + date */}
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`} style={{ color: pageColors.text }}>
                                  {message.sender_name || t('messages.system')}
                                </span>
                                <span className="text-xs flex-shrink-0" style={{ color: pageColors.textMuted }}>
                                  {formatTableDate(message.created_at)}
                                </span>
                              </div>

                              {/* Message preview */}
                              <p className={`text-sm line-clamp-2 mb-2 ${isUnread ? 'font-medium' : ''}`} style={{ color: isUnread ? pageColors.text : pageColors.textMuted }}>
                                {cleanMessageContent(message.message) ? cleanMessageContent(message.message).replace(/<[^>]*>/g, '').substring(0, 120) : '(Sin mensaje)'}
                              </p>

                              {/* Tags row */}
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: typeInfo.bgColor, color: typeInfo.color }}>
                                  <TypeIcon size={10} />{typeInfo.label}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}>
                                  <StatusIcon size={10} />{statusInfo.label}
                                </span>
                              </div>
                            </div>

                            {/* Arrow indicator */}
                            <ArrowRight size={16} className="flex-shrink-0 mt-3" style={{ color: pageColors.textMuted, opacity: 0.5 }} />
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {/* Load More */}
                  {pagination.hasMore && (
                    <div className="flex justify-center py-4">
                      <button
                        onClick={() => fetchMessages(false)}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: pageColors.inputBg,
                          border: `1px solid ${pageColors.cardBorder}`,
                          color: pageColors.text
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = pageColors.hoverBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = pageColors.inputBg; }}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw size={14} className="animate-spin" />
                            Cargando...
                          </span>
                        ) : (
                          `Cargar más mensajes (${filteredMessages.length} visibles de ${pagination.total} totales)`
                        )}
                      </button>
                    </div>
                  )}
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
                {/* Detail Header - matching admin style with badges */}
                <div
                  className="px-3 sm:px-4 py-3 flex items-center justify-between flex-shrink-0"
                  style={{
                    backgroundColor: pageColors.bgCard,
                    borderBottom: `1px solid ${pageColors.cardBorder}`
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <button
                      onClick={handleClosePanel}
                      className="p-2 rounded-lg transition-all flex-shrink-0"
                      style={{ backgroundColor: pageColors.inputBg, color: pageColors.text }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)` }}
                    >
                      <User size={14} className="text-white sm:hidden" />
                      <User size={16} className="text-white hidden sm:block" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0 flex-1">
                      <span className="font-bold text-sm truncate" style={{ color: pageColors.text }}>
                        {selectedMessage.sender_name || t('messages.system')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(() => { const ti = getTypeInfo(selectedMessage.type); const TI = ti.icon; return <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: ti.bgColor, color: ti.color }}><TI size={10} />{ti.label}</span>; })()}
                        {(() => { const si = getStatusInfo(selectedMessage.status, selectedMessage); return <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: si.bgColor, color: si.color }}>{si.label}</span>; })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Content - matching admin thread layout */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 min-h-0">

                  {/* Loading parent indicator */}
                  {loadingParent && (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} />
                    </div>
                  )}

                  {/* 1. Original message - LEFT side (matching admin layout) */}
                  {parentMessage ? (
                    // Parent exists: show user's original message on LEFT
                    <div className="flex gap-2 sm:gap-4 max-w-4xl">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)` }}>
                        <User size={14} className="text-white sm:hidden" />
                        <User size={16} className="text-white hidden sm:block" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="rounded-2xl rounded-tl-sm p-3 sm:p-4" style={{ backgroundColor: pageColors.bgCard, border: `1px solid ${pageColors.cardBorder}`, boxShadow: pageColors.shadowSm }}>
                          <div className="text-sm prose prose-sm max-w-none leading-relaxed break-words" style={{ color: pageColors.text, wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: cleanMessageContent(parentMessage.message) }} />
                        </div>
                        <p className="text-xs mt-1.5 sm:mt-2 ml-2 sm:ml-3" style={{ color: pageColors.textMuted }}>
                          {t('messages.you') || 'Tú'} • {formatFullDate(parentMessage.created_at)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // No parent: show selectedMessage as the original on LEFT
                    <div className="flex gap-2 sm:gap-4 max-w-4xl">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)` }}>
                        <User size={14} className="text-white sm:hidden" />
                        <User size={16} className="text-white hidden sm:block" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="rounded-2xl rounded-tl-sm p-3 sm:p-4" style={{ backgroundColor: pageColors.bgCard, border: `1px solid ${pageColors.cardBorder}`, boxShadow: pageColors.shadowSm }}>
                          <div className="text-sm prose prose-sm max-w-none leading-relaxed break-words" style={{ color: pageColors.text, wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: cleanMessageContent(selectedMessage.message) }} />
                        </div>
                        <p className="text-xs mt-1.5 sm:mt-2 ml-2 sm:ml-3" style={{ color: pageColors.textMuted }}>
                          {selectedMessage.sender_name || t('messages.system')} • {formatFullDate(selectedMessage.created_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 2a. Video embed - for video_feedback type (selectedMessage or its parent) */}
                  {(() => {
                    // Determine effective type: if viewing a reply, check parent type
                    const effectiveType = parentMessage?.type || selectedMessage.type;
                    if (effectiveType !== 'video_feedback' && effectiveType !== 'video_challenge') return null;
                    // Extract video URL from the original message content
                    const rawContent = parentMessage?.message || selectedMessage.message;
                    const videoUrl = extractVideoUrl(rawContent);
                    const embedUrl = videoUrl ? convertToEmbedUrl(videoUrl) : null;
                    if (!embedUrl) return null;
                    return (
                      <div className="ml-10 sm:ml-14 max-w-2xl">
                        <div
                          className="rounded-xl overflow-hidden p-3 sm:p-4"
                          style={{ backgroundColor: pageColors.inputBg, border: `1px solid ${pageColors.cardBorder}` }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Video size={15} style={{ color: pageColors.accent }} />
                            <span className="font-medium text-sm" style={{ color: pageColors.text }}>Video de la duda</span>
                          </div>
                          <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
                            <iframe
                              src={embedUrl}
                              className="w-full h-full border-0"
                              title="Video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2b. Question card - anything with related_object_id that is not a video message */}
                  {selectedMessage.related_object_id &&
                   (parentMessage?.type || selectedMessage.type) !== 'video_feedback' &&
                   (parentMessage?.type || selectedMessage.type) !== 'video_challenge' && (
                    <div className="ml-10 sm:ml-14 max-w-2xl">
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: pageColors.inputBg,
                          border: `1px solid ${pageColors.cardBorder}`
                        }}
                      >
                        {/* Toggle header */}
                        <button
                          onClick={() => setShowQuestion(!showQuestion)}
                          className="w-full flex items-center justify-between p-3 sm:p-4 transition-all rounded-xl"
                          style={{ color: pageColors.text }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = pageColors.hoverBg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div className="flex items-center gap-2">
                            <FileQuestion size={16} style={{ color: pageColors.accent }} />
                            <span className="font-medium text-sm">
                              {loadingQuestion ? 'Cargando pregunta...' : 'Ver pregunta relacionada'}
                            </span>
                          </div>
                          {showQuestion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        {/* Question content */}
                        {showQuestion && relatedQuestion && (
                          <div className="p-3 sm:p-4 pt-0 space-y-4">
                            {/* Question title/enunciado */}
                            <div
                              className="p-3 sm:p-4 rounded-xl"
                              style={{
                                backgroundColor: pageColors.bgCard,
                                border: `1px solid ${pageColors.cardBorder}`
                              }}
                            >
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: pageColors.textMuted }}>
                                Enunciado
                              </p>
                              <div
                                className="explanation-content text-sm leading-relaxed break-words"
                                style={{ color: pageColors.text, overflowWrap: 'anywhere' }}
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
                                        className="text-sm break-words"
                                        style={{ color: option.isCorrect ? pageColors.success : pageColors.text, overflowWrap: 'anywhere' }}
                                        dangerouslySetInnerHTML={{ __html: option.text || '' }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            {(relatedQuestion.content?.rendered || relatedQuestion.meta?._explanation) && (
                              <div
                                className="p-3 sm:p-4 rounded-xl"
                                style={{
                                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                                  border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe'}`
                                }}
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: pageColors.info }}>
                                  Explicación
                                </p>
                                <div
                                  className="explanation-content text-xs leading-relaxed break-words"
                                  style={{ color: isDarkMode ? '#ffffff' : pageColors.textMuted, overflowWrap: 'anywhere' }}
                                  dangerouslySetInnerHTML={{ __html: relatedQuestion.content?.rendered || relatedQuestion.meta?._explanation || '' }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Admin replies - RIGHT side blue bubbles (all thread messages) */}
                  {parentMessage && threadMessages.length > 0 ? (
                    threadMessages.map((reply) => (
                      <div key={reply.id} className="flex gap-2 sm:gap-4 justify-end max-w-4xl ml-auto">
                        <div className="max-w-[85%] sm:max-w-[80%]">
                          <div className="rounded-2xl rounded-tr-sm p-3 sm:p-4" style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`, color: '#fff', boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)' }}>
                            <div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: cleanMessageContent(reply.message) }} />
                          </div>
                          <p className="text-xs mt-1.5 sm:mt-2 mr-2 sm:mr-3 text-right" style={{ color: pageColors.textMuted }}>
                            {reply.sender_name || (t('messages.adminResponse') || 'Respuesta')} • {formatFullDate(reply.created_at)}
                          </p>
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)` }}>
                          <Send size={12} className="text-white sm:hidden" />
                          <Send size={14} className="text-white hidden sm:block" />
                        </div>
                      </div>
                    ))
                  ) : parentMessage && (
                    // Fallback: show selectedMessage as single reply if no thread_messages
                    <div className="flex gap-2 sm:gap-4 justify-end max-w-4xl ml-auto">
                      <div className="max-w-[85%] sm:max-w-[80%]">
                        <div className="rounded-2xl rounded-tr-sm p-3 sm:p-4" style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`, color: '#fff', boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)' }}>
                          <div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: cleanMessageContent(selectedMessage.message) }} />
                        </div>
                        <p className="text-xs mt-1.5 sm:mt-2 mr-2 sm:mr-3 text-right" style={{ color: pageColors.textMuted }}>
                          {t('messages.adminResponse') || 'Respuesta'} • {formatFullDate(selectedMessage.created_at)}
                        </p>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)` }}>
                        <Send size={12} className="text-white sm:hidden" />
                        <Send size={14} className="text-white hidden sm:block" />
                      </div>
                    </div>
                  )}

                  {/* Info note */}
                  <div
                    className="mt-4 p-3 sm:p-4 rounded-xl text-center"
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
              </>
            )}
          </div>
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default MessagesPage;
