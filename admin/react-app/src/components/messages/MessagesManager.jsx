// admin/react-app/src/components/messages/MessagesManager.jsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  Mail,
  Flag,
  MessageCircle,
  Send,
  Search,
  RefreshCw,
  X,
  User,
  FileQuestion,
  CheckCircle,
  Archive,
  Inbox,
  Users,
  Eye,
  CheckSquare,
  Square,
  Edit3,
  ChevronLeft,
  Sun,
  Moon,
  Plus
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import useMessages from '../../hooks/useMessages';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';
import SendMessageModal from './SendMessageModal';
import QuestionEditorPanel from '../questions/QuestionEditorPanel';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';
import useQuizzes from '../../hooks/useQuizzes';
import useLessons from '../../hooks/useLessons';
import useCourses from '../../hooks/useCourses';
import { toast } from 'react-toastify';

const MessagesManager = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode, toggleDarkMode } = useTheme();

  // pageColors pattern - diseño unificado con frontend
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
    // New unified design tokens
    shadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    shadowSm: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accentGlow: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
  }), [getColor, isDarkMode]);

  const [activeView, setActiveView] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [sentMessages, setSentMessages] = useState([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [selectedSentMessage, setSelectedSentMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const { searchValue, handleSearchChange, clearSearch } = useSearchInput('', () => {}, 500);
  const { filters, updateFilter } = useFilterDebounce({ status: 'all', type: 'all' }, () => {}, 300);

  // Taxonomy options (like QuestionsManager)
  const { options: taxonomyOptions, refetch: refetchTaxonomies } = useTaxonomyOptions(['qe_category', 'qe_provider']);
  const categoryOptions = useMemo(() => (taxonomyOptions.qe_category || []).filter(opt => opt.value !== 'all'), [taxonomyOptions.qe_category]);
  const providerOptions = useMemo(() => (taxonomyOptions.qe_provider || []).filter(opt => opt.value !== 'all'), [taxonomyOptions.qe_provider]);

  const { quizzes: availableQuizzes } = useQuizzes({ autoFetch: true, perPage: 100 });
  const { lessons: availableLessons } = useLessons({ autoFetch: true, perPage: 100 });
  const { courses: availableCourses } = useCourses({ autoFetch: true, perPage: 100 });

  const { 
    messages, loading, computed, updateMessageStatus, fetchMessages, requestNotificationPermission
  } = useMessages({
    search: searchValue,
    status: filters.status !== 'all' ? filters.status : null,
    type: filters.type !== 'all' ? filters.type : null,
    autoFetch: true,
    enablePolling: true,
    pollingInterval: 30000
  });

  useEffect(() => { requestNotificationPermission(); }, [requestNotificationPermission]);
  useEffect(() => { if (activeView === 'sent') fetchSentMessages(); }, [activeView]);
  useEffect(() => { if (selectedMessage && !messages.find(m => m.id === selectedMessage.id)) setSelectedMessage(null); }, [messages, selectedMessage]);

  const fetchSentMessages = useCallback(async () => {
    setSentLoading(true);
    try {
      const config = getApiConfig();
      const response = await makeApiRequest(`${config.endpoints.custom_api}/messages/sent?per_page=50`);
      setSentMessages(Array.isArray(response?.data?.data || response?.data) ? (response?.data?.data || response?.data) : []);
    } catch (err) { console.error('Error fetching sent messages:', err); }
    finally { setSentLoading(false); }
  }, []);

  // Fetch replies for a message
  const fetchReplies = useCallback(async (messageId) => {
    setLoadingReplies(true);
    try {
      const config = getApiConfig();
      const response = await makeApiRequest(`${config.endpoints.custom_api}/messages/${messageId}/replies`);
      const data = response?.data?.data || response?.data || {};
      setReplies(data.replies || []);
      console.log('📩 Replies loaded:', data.replies?.length || 0);
    } catch (err) { 
      console.error('Error fetching replies:', err);
      setReplies([]); 
    }
    finally { setLoadingReplies(false); }
  }, []);

  const handleRefresh = useCallback(() => {
    if (activeView === 'inbox') { 
      fetchMessages(true); 
      setSelectedIds(new Set()); 
      if (selectedMessage) fetchReplies(selectedMessage.id);
    }
    else { fetchSentMessages(); }
  }, [fetchMessages, fetchSentMessages, activeView, selectedMessage, fetchReplies]);

  const handleToggleSelect = useCallback((messageId, event) => {
    event.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(messageId) ? newSet.delete(messageId) : newSet.add(messageId);
      return newSet;
    });
  }, []);

  const handleBatchAction = useCallback(async (action) => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      const config = getApiConfig();
      await makeApiRequest(`${config.endpoints.custom_api}/messages/batch`, {
        method: 'POST', body: JSON.stringify({ ids: Array.from(selectedIds), action })
      });
      setSelectedIds(new Set()); setSelectedMessage(null); fetchMessages(true);
    } catch (err) { console.error('Error in batch action:', err); }
    finally { setBatchLoading(false); }
  }, [selectedIds, fetchMessages]);

  const handleMessageClick = useCallback((message) => {
    setSelectedMessage(message); 
    setSelectedSentMessage(null); 
    setShowQuestionEditor(false); 
    setReplyText('');
    setReplies([]); // Clear previous replies
    fetchReplies(message.id); // Load replies for this message
    if (message.status === 'unread') updateMessageStatus(message.id, 'read');
  }, [updateMessageStatus, fetchReplies]);

  const handleSentMessageClick = useCallback((message) => { setSelectedSentMessage(message); setSelectedMessage(null); setReplies([]); }, []);

  const handleStatusChange = useCallback(async (messageId, newStatus) => {
    try {
      await updateMessageStatus(messageId, newStatus);
      if (selectedMessage?.id === messageId) setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) { console.error('Error updating message status:', error); }
  }, [updateMessageStatus, selectedMessage]);

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || !selectedMessage) {
      console.log('🚫 Reply blocked: no text or no selected message');
      return;
    }
    
    console.log('📤 Starting reply send...', {
      messageId: selectedMessage.id,
      senderId: selectedMessage.sender_id,
      replyLength: replyText.length
    });
    
    setSendingReply(true);
    try {
      const config = getApiConfig();
      const endpoint = `${config.endpoints.custom_api}/messages/reply`;
      const payload = {
        original_message_id: selectedMessage.id,
        recipient_id: selectedMessage.sender_id,
        subject: `Re: ${selectedMessage.subject}`,
        message: replyText,
        type: 'reply'
      };
      
      console.log('📤 Sending to:', endpoint);
      console.log('📤 Payload:', payload);
      
      const response = await makeApiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log('✅ Reply response:', response);
      
      setReplyText('');
      await handleStatusChange(selectedMessage.id, 'resolved');
      // Reload replies to show the new message in chat
      await fetchReplies(selectedMessage.id);
      fetchSentMessages();
      toast.success('Respuesta enviada correctamente');
    } catch (err) {
      console.error('❌ Error sending reply:', err);
      toast.error(`Error al enviar: ${err.message || 'Error desconocido'}`);
    } finally {
      setSendingReply(false);
    }
  }, [replyText, selectedMessage, handleStatusChange, fetchSentMessages, fetchReplies]);

  const handleQuestionSave = useCallback(async () => { setShowQuestionEditor(false); }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return date.toLocaleDateString('es-ES', { weekday: 'short' });
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (dateString) => new Date(dateString).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getTypeInfo = (type) => {
    if (type === 'question_feedback') return { icon: MessageCircle, label: 'Duda', color: pageColors.info, bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' };
    if (type === 'question_challenge') return { icon: Flag, label: 'Impugnación', color: pageColors.error, bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' };
    return { icon: Mail, label: 'Mensaje', color: pageColors.textMuted, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6' };
  };

  const getStatusInfo = (status) => {
    if (status === 'unread') return { label: 'Sin leer', color: pageColors.error, bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' };
    if (status === 'read') return { label: 'Leído', color: pageColors.info, bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' };
    if (status === 'resolved') return { label: 'Resuelto', color: pageColors.success, bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5' };
    return { label: status || 'Archivado', color: pageColors.textMuted, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6' };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]" style={{ backgroundColor: pageColors.bgPage }}>
      {/* TOP BAR - Frontend-style design */}
      <div 
        className="flex items-center justify-between px-6 py-4" 
        style={{ 
          backgroundColor: pageColors.bgCard, 
          borderBottom: `1px solid ${pageColors.cardBorder}`,
          boxShadow: pageColors.shadowSm
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="p-2.5 rounded-xl"
            style={{ 
              background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
              boxShadow: `0 4px 12px ${pageColors.accentGlow}`
            }}
          >
            <MessageSquare size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: pageColors.text }}>Mensajes</h1>
            {computed?.unreadMessages > 0 && (
              <p className="text-xs mt-0.5" style={{ color: pageColors.textMuted }}>
                <span className="font-semibold" style={{ color: pageColors.error }}>{computed.unreadMessages}</span> sin leer
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Main Send Button - Frontend style */}
          <button 
            onClick={() => setIsSendModalOpen(true)} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 focus:outline-none"
            style={{ 
              background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
              color: '#fff',
              boxShadow: `0 4px 12px ${pageColors.accentGlow}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 6px 20px ${pageColors.accentGlow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${pageColors.accentGlow}`;
            }}
          >
            <Plus size={18} />
            <span>Nuevo mensaje</span>
          </button>
          
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh} 
            disabled={loading || sentLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 focus:outline-none"
            style={{ 
              backgroundColor: pageColors.inputBg, 
              border: `1px solid ${pageColors.cardBorder}`,
              color: pageColors.text,
              boxShadow: pageColors.shadowSm
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = pageColors.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = pageColors.inputBg;
            }}
          >
            <RefreshCw size={16} className={loading || sentLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline text-sm">Actualizar</span>
          </button>
          
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl transition-all duration-200 focus:outline-none"
            style={{ 
              backgroundColor: pageColors.inputBg, 
              border: `1px solid ${pageColors.cardBorder}`,
              color: pageColors.text,
              boxShadow: pageColors.shadowSm
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = pageColors.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = pageColors.inputBg;
            }}
            title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* LEFT PANEL - Message List */}
        <div 
          className="w-80 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden" 
          style={{ 
            backgroundColor: pageColors.bgCard, 
            boxShadow: pageColors.shadow,
            border: `1px solid ${pageColors.cardBorder}`
          }}
        >
          <div className="p-4" style={{ borderBottom: `1px solid ${pageColors.cardBorder}` }}>
            <div className="flex gap-2 mb-3">
              <button 
                onClick={() => { setActiveView('inbox'); setSelectedSentMessage(null); }} 
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200" 
                style={{ 
                  backgroundColor: activeView === 'inbox' ? pageColors.accent : pageColors.inputBg, 
                  color: activeView === 'inbox' ? '#fff' : pageColors.textMuted, 
                  boxShadow: activeView === 'inbox' ? `0 2px 8px ${pageColors.accentGlow}` : 'none'
                }}
              >
                <Inbox size={14} />Recibidos
              </button>
              <button 
                onClick={() => { setActiveView('sent'); setSelectedMessage(null); }} 
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200" 
                style={{ 
                  backgroundColor: activeView === 'sent' ? pageColors.accent : pageColors.inputBg, 
                  color: activeView === 'sent' ? '#fff' : pageColors.textMuted,
                  boxShadow: activeView === 'sent' ? `0 2px 8px ${pageColors.accentGlow}` : 'none'
                }}
              >
                <Send size={14} />Enviados
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: pageColors.textMuted }} />
              <input 
                type="text" 
                value={searchValue} 
                onChange={(e) => handleSearchChange(e.target.value)} 
                placeholder="Buscar mensajes..." 
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 transition-all" 
                style={{ 
                  backgroundColor: pageColors.inputBg, 
                  border: `1px solid ${pageColors.cardBorder}`,
                  color: pageColors.text,
                  '--tw-ring-color': pageColors.accent
                }} 
              />
              {searchValue && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5" style={{ color: pageColors.textMuted }}>
                  <X size={14} />
                </button>
              )}
            </div>

            {activeView === 'inbox' && (
              <div className="flex gap-2 mt-3">
                <select 
                  value={filters.status} 
                  onChange={(e) => updateFilter('status', e.target.value)} 
                  className="flex-1 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 transition-all" 
                  style={{ 
                    backgroundColor: pageColors.inputBg, 
                    border: `1px solid ${pageColors.cardBorder}`,
                    color: pageColors.text,
                    '--tw-ring-color': pageColors.accent
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="unread">Sin leer</option>
                  <option value="read">Leídos</option>
                  <option value="resolved">Resueltos</option>
                </select>
                <select 
                  value={filters.type} 
                  onChange={(e) => updateFilter('type', e.target.value)} 
                  className="flex-1 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 transition-all" 
                  style={{ 
                    backgroundColor: pageColors.inputBg, 
                    border: `1px solid ${pageColors.cardBorder}`,
                    color: pageColors.text,
                    '--tw-ring-color': pageColors.accent
                  }}
                >
                  <option value="all">Tipo</option>
                  <option value="question_feedback">Dudas</option>
                  <option value="question_challenge">Impugn.</option>
                </select>
              </div>
            )}
          </div>

          {activeView === 'inbox' && selectedIds.size > 0 && (
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe', borderBottom: `1px solid ${pageColors.cardBorder}` }}>
              <span className="text-sm font-medium" style={{ color: pageColors.info }}>{selectedIds.size} seleccionados</span>
              <button onClick={() => handleBatchAction('mark_read')} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: pageColors.info, color: '#fff' }}>Marcar leídos</button>
              <button onClick={() => handleBatchAction('archive')} className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: pageColors.hoverBg, color: pageColors.textMuted }}>Archivar</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {activeView === 'inbox' ? (
              <>
                {loading && messages.length === 0 && <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} /></div>}
                {!loading && messages.length === 0 && <div className="flex flex-col items-center justify-center h-32 text-center px-4"><Inbox size={28} style={{ color: pageColors.textMuted, opacity: 0.5 }} /><p className="text-sm mt-3" style={{ color: pageColors.textMuted }}>No hay mensajes</p></div>}
                {messages.map((message) => {
                  const isSelected = selectedMessage?.id === message.id;
                  const isChecked = selectedIds.has(message.id);
                  const isUnread = message.status === 'unread';
                  const typeInfo = getTypeInfo(message.type);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <div 
                      key={message.id} 
                      onClick={() => handleMessageClick(message)} 
                      className="px-4 py-3.5 cursor-pointer transition-all duration-200" 
                      style={{ 
                        borderBottom: `1px solid ${pageColors.cardBorder}`,
                        backgroundColor: isSelected ? pageColors.hoverBg : 'transparent', 
                        borderLeft: isSelected ? `3px solid ${pageColors.accent}` : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <button onClick={(e) => handleToggleSelect(message.id, e)} className="mt-1 flex-shrink-0 transition-transform hover:scale-110">
                          {isChecked ? <CheckSquare size={16} style={{ color: pageColors.accent }} /> : <Square size={16} style={{ color: pageColors.textMuted }} />}
                        </button>
                        <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: typeInfo.bgColor }}>
                          <TypeIcon size={14} style={{ color: typeInfo.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-medium'}`} style={{ color: isUnread ? pageColors.text : pageColors.textMuted }}>
                              {message.sender_name || `Usuario #${message.sender_id}`}
                            </span>
                            <span className="text-xs flex-shrink-0" style={{ color: pageColors.textMuted }}>{formatDate(message.created_at)}</span>
                          </div>
                          {/* Subject - 2 lines */}
                          <p 
                            className={`text-sm leading-relaxed ${isUnread ? 'font-medium' : ''}`} 
                            style={{ 
                              color: pageColors.text,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {message.subject}
                          </p>
                          {isUnread && <span className="inline-block mt-2 w-2 h-2 rounded-full" style={{ backgroundColor: pageColors.error }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                {sentLoading && sentMessages.length === 0 && <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} /></div>}
                {!sentLoading && sentMessages.length === 0 && <div className="flex flex-col items-center justify-center h-32 text-center px-4"><Send size={28} style={{ color: pageColors.textMuted, opacity: 0.5 }} /><p className="text-sm mt-3" style={{ color: pageColors.textMuted }}>No hay mensajes enviados</p></div>}
                {sentMessages.map((msg) => {
                  const isSelected = selectedSentMessage?.id === msg.id;
                  return (
                    <div 
                      key={msg.id} 
                      onClick={() => handleSentMessageClick(msg)} 
                      className="px-4 py-3.5 cursor-pointer transition-all duration-200" 
                      style={{ 
                        borderBottom: `1px solid ${pageColors.cardBorder}`,
                        backgroundColor: isSelected ? pageColors.hoverBg : 'transparent', 
                        borderLeft: isSelected ? `3px solid ${pageColors.accent}` : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: pageColors.accentGlow }}>
                          <Users size={14} style={{ color: pageColors.accent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium" style={{ color: pageColors.accent }}>{msg.recipient_count} destinatarios</span>
                            <span className="text-xs" style={{ color: pageColors.textMuted }}>{formatDate(msg.created_at)}</span>
                          </div>
                          <p 
                            className="text-sm font-medium leading-relaxed" 
                            style={{ 
                              color: pageColors.text,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {msg.subject}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - CHAT VIEW */}
        <div 
          className="flex-1 flex flex-col rounded-2xl overflow-hidden" 
          style={{ 
            backgroundColor: pageColors.bgCard,
            boxShadow: pageColors.shadow,
            border: `1px solid ${pageColors.cardBorder}`
          }}
        >
          {activeView === 'inbox' && selectedMessage ? (
            <>
              <div 
                className="p-5 flex items-center justify-between" 
                style={{ 
                  backgroundColor: pageColors.bgCard, 
                  borderBottom: `1px solid ${pageColors.cardBorder}`
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center" 
                    style={{ 
                      background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
                      boxShadow: `0 4px 12px ${pageColors.accentGlow}`
                    }}
                  >
                    <User size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: pageColors.text }}>{selectedMessage.sender_name || `Usuario #${selectedMessage.sender_id}`}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => { const typeInfo = getTypeInfo(selectedMessage.type); const TypeIcon = typeInfo.icon; return <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: typeInfo.bgColor, color: typeInfo.color }}><TypeIcon size={12} />{typeInfo.label}</span>; })()}
                      {(() => { const statusInfo = getStatusInfo(selectedMessage.status); return <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}>{statusInfo.label}</span>; })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedMessage.status !== 'resolved' && (
                    <button 
                      onClick={() => handleStatusChange(selectedMessage.id, 'resolved')} 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{ 
                        backgroundColor: pageColors.success, 
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <CheckCircle size={14} />Resolver
                    </button>
                  )}
                  <button 
                    onClick={() => handleStatusChange(selectedMessage.id, 'archived')} 
                    className="p-2.5 rounded-xl transition-all duration-200" 
                    style={{ 
                      backgroundColor: pageColors.inputBg,
                      border: `1px solid ${pageColors.cardBorder}`,
                      color: pageColors.textMuted 
                    }} 
                    title="Archivar"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.inputBg;
                    }}
                  >
                    <Archive size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ backgroundColor: pageColors.bgPage }}>
                {/* Original message from user - LEFT SIDE */}
                <div className="flex gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" 
                    style={{ 
                      background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
                    }}
                  >
                    <User size={16} className="text-white" />
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div 
                      className="rounded-2xl rounded-tl-md p-4" 
                      style={{ 
                        backgroundColor: pageColors.bgCard, 
                        border: `1px solid ${pageColors.cardBorder}`,
                        boxShadow: pageColors.shadowSm
                      }}
                    >
                      <p className="text-sm font-semibold mb-3" style={{ color: pageColors.text }}>{selectedMessage.subject}</p>
                      <div className="text-sm prose prose-sm max-w-none leading-relaxed" style={{ color: pageColors.text }} dangerouslySetInnerHTML={{ __html: selectedMessage.message }} />
                    </div>
                    <p className="text-xs mt-2 ml-3" style={{ color: pageColors.textMuted }}>{formatFullDate(selectedMessage.created_at)}</p>
                  </div>
                </div>

                {/* Related question card */}
                {selectedMessage.related_object_id && (
                  <div 
                    className="ml-14 p-4 rounded-xl" 
                    style={{ 
                      backgroundColor: pageColors.inputBg, 
                      border: `1px solid ${pageColors.cardBorder}`,
                      boxShadow: pageColors.shadowSm
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FileQuestion size={16} style={{ color: pageColors.accent }} />
                      <span className="text-sm font-medium" style={{ color: pageColors.text }}>Pregunta #{selectedMessage.related_object_id}</span>
                    </div>
                    {!showQuestionEditor ? (
                      <button 
                        onClick={() => setShowQuestionEditor(true)} 
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium w-full justify-center transition-all duration-200"
                        style={{ 
                          background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`,
                          color: '#fff',
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <Edit3 size={14} />Editar pregunta
                      </button>
                    ) : (
                      <div className="mt-3">
                        <button onClick={() => setShowQuestionEditor(false)} className="flex items-center gap-1 text-sm mb-3 transition-colors hover:opacity-80" style={{ color: pageColors.textMuted }}><ChevronLeft size={16} />Cerrar editor</button>
                        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${pageColors.cardBorder}`, maxHeight: '500px', overflowY: 'auto' }}>
                          <QuestionEditorPanel questionId={selectedMessage.related_object_id} mode="edit" onSave={handleQuestionSave} onCancel={() => setShowQuestionEditor(false)} categoryOptions={categoryOptions} providerOptions={providerOptions} onCategoryCreated={refetchTaxonomies} onProviderCreated={refetchTaxonomies} availableQuizzes={availableQuizzes} availableLessons={availableLessons} availableCourses={availableCourses} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading replies indicator */}
                {loadingReplies && (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} />
                  </div>
                )}

                {/* Replies - RIGHT SIDE (admin messages) */}
                {replies.map((reply) => (
                  <div key={reply.id} className="flex gap-4 justify-end">
                    <div className="max-w-[80%]">
                      <div 
                        className="rounded-2xl rounded-tr-md p-4" 
                        style={{ 
                          background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`,
                          color: '#fff',
                          boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)'
                        }}
                      >
                        <div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: reply.message }} />
                      </div>
                      <p className="text-xs mt-2 mr-3 text-right" style={{ color: pageColors.textMuted }}>
                        {formatFullDate(reply.created_at)}
                        {reply.sender_name && <span className="ml-1">• {reply.sender_name}</span>}
                      </p>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" 
                      style={{ 
                        background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`
                      }}
                    >
                      <Send size={14} className="text-white" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Section */}
              <div 
                className="p-5" 
                style={{ 
                  backgroundColor: pageColors.bgCard, 
                  borderTop: `1px solid ${pageColors.cardBorder}`
                }}
              >
                <div className="flex gap-4">
                  <textarea 
                    value={replyText} 
                    onChange={(e) => setReplyText(e.target.value)} 
                    placeholder="Escribe tu respuesta..." 
                    rows={3} 
                    className="flex-1 px-4 py-3 text-sm rounded-xl resize-none focus:outline-none focus:ring-2 transition-all" 
                    style={{ 
                      backgroundColor: pageColors.inputBg, 
                      border: `1px solid ${pageColors.cardBorder}`,
                      color: pageColors.text,
                      '--tw-ring-color': pageColors.accent 
                    }} 
                  />
                  <button 
                    onClick={handleSendReply} 
                    disabled={!replyText.trim() || sendingReply} 
                    className="px-6 py-3 rounded-xl flex flex-col items-center justify-center gap-1.5 font-medium text-sm disabled:opacity-50 transition-all duration-200 self-stretch"
                    style={{ 
                      background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
                      color: '#fff', 
                      minWidth: '100px',
                      boxShadow: `0 4px 12px ${pageColors.accentGlow}`
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = `0 6px 20px ${pageColors.accentGlow}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${pageColors.accentGlow}`;
                    }}
                  >
                    {sendingReply ? (
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    ) : (
                      <>
                        <Send size={20} />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : activeView === 'sent' && selectedSentMessage ? (
            <>
              <div 
                className="p-5" 
                style={{ 
                  backgroundColor: pageColors.bgCard, 
                  borderBottom: `1px solid ${pageColors.cardBorder}`
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center" 
                    style={{ 
                      background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`,
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                    }}
                  >
                    <Send size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: pageColors.text }}>{selectedSentMessage.subject}</h3>
                    <div className="flex items-center gap-3 text-sm mt-1" style={{ color: pageColors.textMuted }}>
                      <span className="flex items-center gap-1"><Users size={14} />{selectedSentMessage.recipient_count} destinatarios</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Eye size={14} />{selectedSentMessage.read_count} leídos</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: pageColors.bgPage }}>
                <div className="flex gap-4 justify-end">
                  <div className="max-w-[80%]">
                    <div 
                      className="rounded-2xl rounded-tr-md p-4" 
                      style={{ 
                        background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`,
                        color: '#fff',
                        boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)'
                      }}
                    >
                      <div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedSentMessage.message }} />
                    </div>
                    <p className="text-xs mt-2 mr-3 text-right" style={{ color: pageColors.textMuted }}>{formatFullDate(selectedSentMessage.created_at)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: pageColors.bgPage }}>
              <div className="text-center">
                <div 
                  className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: pageColors.hoverBg }}
                >
                  <Mail size={36} style={{ color: pageColors.textMuted, opacity: 0.5 }} />
                </div>
                <p className="text-base font-medium" style={{ color: pageColors.textMuted }}>Selecciona una conversación</p>
                <p className="text-sm mt-1" style={{ color: pageColors.textMuted, opacity: 0.7 }}>Elige un mensaje de la lista para ver su contenido</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <SendMessageModal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} onMessageSent={() => { handleRefresh(); if (sentMessages.length > 0) fetchSentMessages(); }} />
    </div>
  );
};

export default MessagesManager;
