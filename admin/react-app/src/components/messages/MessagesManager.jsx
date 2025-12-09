// admin/react-app/src/components/messages/MessagesManager.jsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  AlertCircle, 
  Mail,
  MailOpen,
  Flag,
  MessageCircle,
  Send,
  Search,
  RefreshCw,
  X,
  User,
  Clock,
  FileQuestion,
  CheckCircle,
  Archive,
  Inbox,
  ChevronDown,
  ExternalLink,
  Users,
  Eye,
  EyeOff,
  Megaphone,
  Bell,
  AlertTriangle,
  Trash2,
  CheckSquare,
  Square,
  Minus
} from 'lucide-react';

import { useTheme } from '../../contexts/ThemeContext';
import useMessages from '../../hooks/useMessages';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';
import SendMessageModal from './SendMessageModal';

const MessagesManager = () => {
  const { getColor, isDarkMode } = useTheme();

  // Theme-aware colors
  const colors = useMemo(() => ({
    primary: getColor('primary', '#1e3a5f'),
    accent: getColor('accent', '#f59e0b'),
    accentLight: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
    success: '#10b981',
    error: '#ef4444',
    textPrimary: isDarkMode ? getColor('textPrimary', '#f9fafb') : '#1f2937',
    textSecondary: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    textMuted: isDarkMode ? '#6b7280' : '#9ca3af',
    background: isDarkMode ? getColor('background', '#111827') : '#ffffff',
    backgroundSecondary: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#f9fafb',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    headerBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('primary', '#1e3a5f'),
  }), [getColor, isDarkMode]);

  // --- VIEW STATE ---
  const [activeView, setActiveView] = useState('inbox'); // 'inbox' | 'sent'
  
  // --- LOCAL STATE ---
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  
  // --- BATCH SELECTION STATE ---
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  
  // --- SENT MESSAGES STATE ---
  const [sentMessages, setSentMessages] = useState([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentError, setSentError] = useState(null);
  const [selectedSentMessage, setSelectedSentMessage] = useState(null);

  // --- DEBOUNCED SEARCH INPUT ---
  const { searchValue, isSearching, handleSearchChange, clearSearch } = useSearchInput('', () => {}, 500);
  
  // --- FILTERS ---
  const { filters, isFiltering, updateFilter, resetFilters } = useFilterDebounce(
    { status: 'all', type: 'all' },
    () => {}, 300
  );

  // --- HOOKS ---
  const { 
    messages, 
    loading, 
    error, 
    pagination,
    computed,
    updating,
    hasNewMessages,
    updateMessageStatus,
    fetchMessages,
    requestNotificationPermission
  } = useMessages({
    search: searchValue,
    status: filters.status !== 'all' ? filters.status : null,
    type: filters.type !== 'all' ? filters.type : null,
    autoFetch: true,
    enablePolling: true,
    pollingInterval: 30000
  });

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Fetch sent messages when view changes to 'sent'
  useEffect(() => {
    if (activeView === 'sent') {
      fetchSentMessages();
    }
  }, [activeView]);

  // Reset selected message when messages change
  useEffect(() => {
    if (selectedMessage && !messages.find(m => m.id === selectedMessage.id)) {
      setSelectedMessage(null);
    }
  }, [messages, selectedMessage]);

  // --- FETCH SENT MESSAGES ---
  const fetchSentMessages = useCallback(async () => {
    setSentLoading(true);
    setSentError(null);
    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/sent?per_page=50`;
      
      const response = await makeApiRequest(url);
      
      // The response structure is: { data: { success: true, data: [...] }, headers: {...} }
      // We need response.data.data to get the actual messages array
      const messagesArray = response?.data?.data || response?.data || [];
      
      setSentMessages(Array.isArray(messagesArray) ? messagesArray : []);
    } catch (err) {
      console.error('Error fetching sent messages:', err);
      setSentError(err.message || 'Error al cargar mensajes enviados');
    } finally {
      setSentLoading(false);
    }
  }, []);

  // --- EVENT HANDLERS ---
  const handleRefresh = useCallback(() => {
    if (activeView === 'inbox') {
      fetchMessages(true);
      setSelectedIds(new Set()); // Clear selection on refresh
    } else {
      fetchSentMessages();
    }
  }, [fetchMessages, fetchSentMessages, activeView]);

  // --- BATCH SELECTION HANDLERS ---
  const handleToggleSelect = useCallback((messageId, event) => {
    event.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  }, [messages, selectedIds.size]);

  const handleBatchAction = useCallback(async (action) => {
    if (selectedIds.size === 0) return;
    
    setBatchLoading(true);
    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/batch`;
      
      await makeApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: action
        })
      });
      
      // Clear selection and refresh
      setSelectedIds(new Set());
      setSelectedMessage(null);
      fetchMessages(true);
    } catch (err) {
      console.error('Error in batch action:', err);
    } finally {
      setBatchLoading(false);
    }
  }, [selectedIds, fetchMessages]);

  const handleMessageClick = useCallback((message) => {
    setSelectedMessage(message);
    setSelectedSentMessage(null);
    if (message.status === 'unread') {
      updateMessageStatus(message.id, 'read');
    }
  }, [updateMessageStatus]);

  const handleSentMessageClick = useCallback((message) => {
    setSelectedSentMessage(message);
    setSelectedMessage(null);
  }, []);

  const handleStatusChange = useCallback(async (messageId, newStatus) => {
    try {
      await updateMessageStatus(messageId, newStatus);
      // Update local selected message status
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }, [updateMessageStatus, selectedMessage]);

  // --- HELPERS ---
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
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

  const getTypeInfo = (type) => {
    switch (type) {
      case 'question_feedback':
        return { 
          icon: MessageCircle, 
          label: 'Duda', 
          color: '#3b82f6', 
          bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' 
        };
      case 'question_challenge':
        return { 
          icon: Flag, 
          label: 'Impugnación', 
          color: '#ef4444', 
          bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' 
        };
      default:
        return { 
          icon: Mail, 
          label: 'Mensaje', 
          color: colors.textSecondary, 
          bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6' 
        };
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'unread':
        return { label: 'Sin leer', color: '#ef4444', bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' };
      case 'read':
        return { label: 'Leído', color: '#3b82f6', bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' };
      case 'resolved':
        return { label: 'Resuelto', color: '#10b981', bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5' };
      case 'archived':
        return { label: 'Archivado', color: colors.textSecondary, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6' };
      default:
        return { label: status, color: colors.textSecondary, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6' };
    }
  };

  const getSentTypeInfo = (type) => {
    switch (type) {
      case 'announcement':
        return { 
          icon: Megaphone, 
          label: 'Anuncio', 
          color: '#3b82f6', 
          bgColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe' 
        };
      case 'notification':
        return { 
          icon: Bell, 
          label: 'Notificación', 
          color: '#f59e0b', 
          bgColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' 
        };
      case 'alert':
        return { 
          icon: AlertTriangle, 
          label: 'Alerta', 
          color: '#ef4444', 
          bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' 
        };
      default:
        return { 
          icon: Send, 
          label: 'Mensaje', 
          color: colors.textSecondary, 
          bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6' 
        };
    }
  };

  // --- RENDER ---
  return (
    <div 
      className="h-[calc(100vh-120px)] min-h-[350px] flex flex-col rounded-xl overflow-hidden"
      style={{ 
        backgroundColor: colors.background,
        border: `2px solid ${isDarkMode ? colors.accent : colors.primary}`
      }}
    >
      {/* Header with Stats */}
      <div 
        className="flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: colors.headerBg }}
      >
        <div className="px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }}
              >
                <MessageSquare size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-white truncate">Mensajería</h1>
                <p className="text-[10px] sm:text-xs text-white/70 truncate hidden sm:block">
                  Gestiona dudas e impugnaciones
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSendModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all flex-shrink-0"
              style={{ 
                backgroundColor: colors.accent,
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Send size={12} />
              <span className="hidden sm:inline">Enviar Mensaje</span>
              <span className="sm:hidden">Enviar</span>
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mt-2">
            <div 
              className="rounded px-2 py-1.5"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-1">
                <MessageSquare size={12} className="text-white/70" />
                <span className="text-white/70 text-[10px]">Total</span>
              </div>
              <p className="text-base font-bold text-white">
                {computed?.totalMessages || 0}
              </p>
            </div>
            <div 
              className="rounded px-2 py-1.5"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-1">
                <Mail size={12} className="text-red-300" />
                <span className="text-white/70 text-[10px]">Sin Leer</span>
              </div>
              <p className="text-base font-bold text-white">
                {computed?.unreadMessages || 0}
              </p>
            </div>
            <div 
              className="rounded px-2 py-1.5"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-1">
                <MessageCircle size={12} className="text-blue-300" />
                <span className="text-white/70 text-[10px]">Dudas</span>
              </div>
              <p className="text-base font-bold text-white">
                {computed?.feedbackMessages || 0}
              </p>
            </div>
            <div 
              className="rounded px-2 py-1.5"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-1">
                <Flag size={12} className="text-orange-300" />
                <span className="text-white/70 text-[10px]">Impugn.</span>
              </div>
              <p className="text-base font-bold text-white">
                {computed?.challengeMessages || 0}
              </p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => {
                setActiveView('inbox');
                setSelectedSentMessage(null);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${activeView === 'inbox' 
                  ? 'bg-white text-gray-900' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Inbox size={12} />
              Recibidos
              {computed?.unreadMessages > 0 && (
                <span className="px-1 rounded-full text-[9px] bg-red-500 text-white">
                  {computed.unreadMessages}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveView('sent');
                setSelectedMessage(null);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${activeView === 'sent' 
                  ? 'bg-white text-gray-900' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Send size={12} />
              Enviados
              {sentMessages.length > 0 && (
                <span className="px-1 rounded-full text-[9px] bg-white/30 text-white">
                  {sentMessages.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar - Only for Inbox */}
      {activeView === 'inbox' && (
        <div 
          className="flex-shrink-0 px-2 sm:px-3 py-2 border-b flex flex-wrap items-center gap-1.5 sm:gap-2"
          style={{ 
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border
          }}
        >
          {/* Search */}
          <div className="w-full sm:flex-1 relative order-1">
            <Search 
              size={14} 
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: colors.textMuted }}
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar mensajes..."
              className="w-full pl-8 pr-6 py-1.5 text-xs rounded border focus:outline-none focus:ring-1"
              style={{ 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
            {searchValue && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: colors.textMuted }}
              >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative flex-1 sm:flex-none order-2 min-w-[120px]">
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="w-full appearance-none pl-2 pr-6 py-1.5 text-xs rounded border focus:outline-none focus:ring-1"
            style={{ 
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.textPrimary
            }}
          >
            <option value="all">Todos estados</option>
            <option value="unread">Sin leer</option>
            <option value="read">Leídos</option>
            <option value="resolved">Resueltos</option>
            <option value="archived">Archivados</option>
          </select>
          <ChevronDown 
            size={12} 
            className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: colors.textMuted }}
          />
        </div>

        {/* Type Filter */}
        <div className="relative flex-1 sm:flex-none order-3 min-w-[120px]">
          <select
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="w-full appearance-none pl-2 pr-6 py-1.5 text-xs rounded border focus:outline-none focus:ring-1"
            style={{ 
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.textPrimary
            }}
          >
            <option value="all">Todos tipos</option>
            <option value="question_feedback">Dudas</option>
            <option value="question_challenge">Impugnaciones</option>
          </select>
          <ChevronDown 
            size={12} 
            className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: colors.textMuted }}
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 rounded border transition-all disabled:opacity-50 order-4"
          style={{ 
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.textSecondary
          }}
          title="Actualizar"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        </div>
      )}

      {/* Batch Actions Bar - Only when messages are selected */}
      {activeView === 'inbox' && messages.length > 0 && (
        <div 
          className="flex-shrink-0 px-2 sm:px-3 py-1.5 border-b flex flex-wrap items-center gap-1.5 sm:gap-2"
          style={{ 
            backgroundColor: selectedIds.size > 0 
              ? (isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe') 
              : colors.backgroundSecondary,
            borderColor: colors.border
          }}
        >
          {/* Select All Checkbox */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors"
            disabled={batchLoading}
            style={{ color: colors.textPrimary }}
          >
            {selectedIds.size === 0 ? (
              <Square size={14} style={{ color: colors.textSecondary }} />
            ) : selectedIds.size === messages.length ? (
              <CheckSquare size={14} style={{ color: colors.accent }} />
            ) : (
              <Minus size={14} style={{ color: colors.accent }} />
            )}
            <span className="text-xs font-medium">
              {selectedIds.size === 0 
                ? 'Seleccionar' 
                : `${selectedIds.size} sel.`}
            </span>
          </button>

          {/* Batch Action Buttons - Only visible when items selected */}
          {selectedIds.size > 0 && (
            <>
              <div className="h-3 w-px" style={{ backgroundColor: colors.border }} />
              
              <button
                onClick={() => handleBatchAction('mark_read')}
                disabled={batchLoading}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all disabled:opacity-50"
                style={{ 
                  backgroundColor: colors.primary,
                  color: '#ffffff'
                }}
                title="Marcar como leídos"
              >
                <MailOpen size={12} />
                Leídos
              </button>
              
              <button
                onClick={() => handleBatchAction('archive')}
                disabled={batchLoading}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all disabled:opacity-50 border"
                style={{ 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textSecondary
                }}
                title="Archivar"
              >
                <Archive size={12} />
                Archivar
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} mensaje(s)?`)) {
                    handleBatchAction('delete');
                  }
                }}
                disabled={batchLoading}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all disabled:opacity-50"
                style={{ 
                  backgroundColor: colors.error,
                  color: '#ffffff'
                }}
                title="Eliminar"
              >
                <Trash2 size={12} />
                Eliminar
              </button>

              {batchLoading && (
                <div 
                  className="w-3 h-3 border-2 rounded-full animate-spin"
                  style={{ 
                    borderColor: `${colors.primary}20`,
                    borderTopColor: colors.primary
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Sent Messages Filter Bar */}
      {activeView === 'sent' && (
        <div 
          className="flex-shrink-0 px-2 sm:px-3 py-2 border-b flex flex-wrap items-center justify-between gap-1.5"
          style={{ 
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border
          }}
        >
          <div className="flex items-center gap-1.5">
            <Send size={12} style={{ color: colors.textSecondary }} />
            <span className="text-xs" style={{ color: colors.textSecondary }}>
              Mensajes enviados
            </span>
          </div>
          <button
            onClick={fetchSentMessages}
            disabled={sentLoading}
            className="p-1.5 rounded border transition-all disabled:opacity-50"
            style={{ 
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.textSecondary
            }}
            title="Actualizar"
          >
            <RefreshCw size={12} className={sentLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {/* New Messages Banner */}
      {hasNewMessages && activeView === 'inbox' && (
        <div 
          className="flex-shrink-0 px-3 py-1.5 flex items-center justify-between"
          style={{ backgroundColor: colors.accentLight }}
        >
          <div className="flex items-center gap-1.5">
            <div 
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: colors.accent }}
            />
            <span className="text-xs font-medium" style={{ color: colors.accent }}>
              Nuevos mensajes
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs font-medium px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: colors.accent,
              color: '#ffffff'
            }}
          >
            Actualizar
          </button>
        </div>
      )}

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col md:flex-row overflow-hidden rounded-b-xl border-x border-b min-h-0"
        style={{ borderColor: colors.border }}
      >
        {/* ==================== INBOX VIEW ==================== */}
        {activeView === 'inbox' && (
          <>
            {/* Error State */}
            {error && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-3">
                  <AlertCircle size={32} className="mx-auto mb-2" style={{ color: colors.error }} />
              <p className="text-sm font-medium" style={{ color: colors.error }}>Error al cargar</p>
              <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 px-3 py-1.5 rounded text-xs font-medium"
                style={{ backgroundColor: colors.primary, color: '#ffffff' }}
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && messages.length === 0 && !error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div 
                className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2"
                style={{ 
                  borderColor: `${colors.primary}20`,
                  borderTopColor: colors.primary
                }}
              />
              <p className="text-xs" style={{ color: colors.textSecondary }}>Cargando...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-3">
              <Inbox size={32} className="mx-auto mb-2" style={{ color: colors.textMuted }} />
              <h4 className="text-sm font-semibold mb-0.5" style={{ color: colors.textPrimary }}>
                No hay mensajes
              </h4>
              <p className="text-xs" style={{ color: colors.textSecondary }}>
                Sin resultados para los filtros
              </p>
            </div>
          </div>
        )}

        {/* Messages Content */}
        {!error && messages.length > 0 && (
          <>
            {/* Message List - Left Panel */}
            <div 
              className="w-full md:w-2/5 border-b md:border-b-0 md:border-r overflow-y-auto flex-shrink-0 max-h-[40vh] md:max-h-none"
              style={{ 
                borderColor: colors.border,
                backgroundColor: colors.backgroundSecondary
              }}
            >
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
                    className="px-2.5 py-2 cursor-pointer border-b transition-all duration-150"
                    style={{ 
                      borderColor: colors.border,
                      backgroundColor: isSelected 
                        ? colors.background
                        : isChecked 
                          ? (isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe')
                          : 'transparent',
                      borderLeftWidth: isSelected ? '2px' : '0',
                      borderLeftColor: isSelected ? colors.accent : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isChecked) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : colors.background;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isChecked) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => handleToggleSelect(message.id, e)}
                        className="flex-shrink-0 mt-0.5 rounded transition-colors"
                      >
                        {isChecked ? (
                          <CheckSquare size={14} style={{ color: colors.accent }} />
                        ) : (
                          <Square size={14} style={{ color: colors.textMuted }} />
                        )}
                      </button>
                      
                      {/* Type Icon */}
                      <div 
                        className="flex-shrink-0 p-1.5 rounded"
                        style={{ backgroundColor: typeInfo.bgColor }}
                      >
                        <TypeIcon size={12} style={{ color: typeInfo.color }} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span 
                            className={`text-[10px] truncate ${isUnread ? 'font-bold' : 'font-medium'}`}
                            style={{ color: isUnread ? colors.accent : colors.textSecondary }}
                          >
                            {message.sender_name || `Usuario #${message.sender_id}`}
                          </span>
                          <span 
                            className="text-[10px] flex-shrink-0"
                            style={{ color: colors.textMuted }}
                          >
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p 
                          className={`text-xs truncate ${isUnread ? 'font-semibold' : ''}`}
                          style={{ color: colors.textPrimary }}
                        >
                          {message.subject}
                        </p>
                        <p 
                          className="text-[10px] truncate mt-0.5"
                          style={{ color: colors.textSecondary }}
                        >
                          {message.message.replace(/<[^>]*>/g, '').substring(0, 50)}...
                        </p>
                        
                        {/* Badges */}
                        <div className="flex items-center gap-1 mt-1">
                          <span 
                            className="text-[9px] px-1 py-0.5 rounded font-medium"
                            style={{ 
                              backgroundColor: typeInfo.bgColor,
                              color: typeInfo.color
                            }}
                          >
                            {typeInfo.label}
                          </span>
                          {isUnread && (
                            <span 
                              className="text-[9px] px-1 py-0.5 rounded font-medium"
                              style={{ 
                                backgroundColor: '#fee2e2',
                                color: '#ef4444'
                              }}
                            >
                              Nuevo
                            </span>
                          )}
                        </div>
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
                    color: colors.accent,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.background;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Cargar más
                </button>
              )}
            </div>

            {/* Message Detail - Right Panel */}
            <div 
              className="flex-1 flex flex-col overflow-hidden min-h-[150px]"
              style={{ backgroundColor: colors.background }}
            >
              {selectedMessage ? (
                <>
                  {/* Message Header */}
                  <div 
                    className="px-3 sm:px-4 py-2 sm:py-3 border-b flex-shrink-0"
                    style={{ borderColor: colors.border }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {(() => {
                            const typeInfo = getTypeInfo(selectedMessage.type);
                            const TypeIcon = typeInfo.icon;
                            return (
                              <span 
                                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ 
                                  backgroundColor: typeInfo.bgColor,
                                  color: typeInfo.color
                                }}
                              >
                                <TypeIcon size={10} />
                                {typeInfo.label}
                              </span>
                            );
                          })()}
                          {(() => {
                            const statusInfo = getStatusInfo(selectedMessage.status);
                            return (
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ 
                                  backgroundColor: statusInfo.bgColor,
                                  color: statusInfo.color
                                }}
                              >
                                {statusInfo.label}
                              </span>
                            );
                          })()}
                        </div>
                        <h2 
                          className="text-sm sm:text-base font-bold"
                          style={{ color: colors.textPrimary }}
                        >
                          {selectedMessage.subject}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] sm:text-xs">
                          <span 
                            className="flex items-center gap-0.5"
                            style={{ color: colors.accent }}
                          >
                            <User size={11} />
                            {selectedMessage.sender_name || `Usuario #${selectedMessage.sender_id}`}
                          </span>
                          <span 
                            className="flex items-center gap-0.5"
                            style={{ color: colors.textSecondary }}
                          >
                            <Clock size={11} />
                            {formatFullDate(selectedMessage.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Related Question Link */}
                  {selectedMessage.related_object_id && (
                    <div 
                      className="px-3 sm:px-4 py-1.5 sm:py-2 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                      style={{ 
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileQuestion size={12} style={{ color: colors.textSecondary }} />
                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                          Pregunta:
                        </span>
                        <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>
                          #{selectedMessage.related_object_id}
                        </span>
                      </div>
                      <a
                        href={`/wp-admin/post.php?post=${selectedMessage.related_object_id}&action=edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-xs font-medium transition-colors"
                        style={{ color: colors.accent }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        Ver
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}

                  {/* Message Body */}
                  <div 
                    className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3"
                    style={{ backgroundColor: colors.backgroundSecondary }}
                  >
                    <div 
                      className="prose prose-sm max-w-none rounded p-2 sm:p-3 border text-xs"
                      style={{ 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.textPrimary
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedMessage.message }}
                    />
                  </div>

                  {/* Actions Footer */}
                  <div 
                    className="px-3 sm:px-4 py-1.5 sm:py-2 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 flex-shrink-0"
                    style={{ 
                      borderColor: colors.border,
                      backgroundColor: colors.backgroundSecondary
                    }}
                  >
                    <span className="text-[10px]" style={{ color: colors.textMuted }}>
                      ID: {selectedMessage.id}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {selectedMessage.status === 'unread' && (
                        <button
                          onClick={() => handleStatusChange(selectedMessage.id, 'read')}
                          disabled={updating}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all disabled:opacity-50"
                          style={{ 
                            backgroundColor: '#3b82f6',
                            color: '#ffffff'
                          }}
                        >
                          <MailOpen size={11} />
                          Leído
                        </button>
                      )}
                      {selectedMessage.status === 'read' && (
                        <button
                          onClick={() => handleStatusChange(selectedMessage.id, 'resolved')}
                          disabled={updating}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all disabled:opacity-50"
                          style={{ 
                            backgroundColor: colors.success,
                            color: '#ffffff'
                          }}
                        >
                          <CheckCircle size={11} />
                          Resolver
                        </button>
                      )}
                      {(selectedMessage.status === 'read' || selectedMessage.status === 'resolved') && (
                        <button
                          onClick={() => handleStatusChange(selectedMessage.id, 'archived')}
                          disabled={updating}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all disabled:opacity-50"
                          style={{ 
                            backgroundColor: 'transparent',
                            borderColor: colors.border,
                            color: colors.textSecondary
                          }}
                        >
                          <Archive size={11} />
                          Archivar
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-3">
                    <Mail size={32} className="mx-auto mb-2" style={{ color: colors.textMuted, opacity: 0.5 }} />
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      Selecciona un mensaje
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
          </>
        )}

        {/* ==================== SENT VIEW ==================== */}
        {activeView === 'sent' && (
          <>
            {/* Sent Error State */}
            {sentError && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-4">
                  <AlertCircle size={48} className="mx-auto mb-3" style={{ color: colors.error }} />
                  <p className="font-medium" style={{ color: colors.error }}>Error al cargar mensajes enviados</p>
                  <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>{sentError}</p>
                  <button
                    onClick={fetchSentMessages}
                    className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {/* Sent Loading State */}
            {sentLoading && sentMessages.length === 0 && !sentError && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div 
                    className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
                    style={{ 
                      borderColor: `${colors.primary}20`,
                      borderTopColor: colors.primary
                    }}
                  />
                  <p style={{ color: colors.textSecondary }}>Cargando mensajes enviados...</p>
                </div>
              </div>
            )}

            {/* Sent Empty State */}
            {!sentLoading && !sentError && sentMessages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-4">
                  <Send size={48} className="mx-auto mb-3" style={{ color: colors.textMuted }} />
                  <h4 className="text-base font-semibold mb-1" style={{ color: colors.textPrimary }}>
                    No hay mensajes enviados
                  </h4>
                  <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                    Aún no has enviado mensajes a los estudiantes
                  </p>
                  <button
                    onClick={() => setIsSendModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm mx-auto"
                    style={{ 
                      backgroundColor: colors.accent,
                      color: '#ffffff'
                    }}
                  >
                    <Send size={16} />
                    Enviar primer mensaje
                  </button>
                </div>
              </div>
            )}

            {/* Sent Messages Content */}
            {!sentError && sentMessages.length > 0 && (
              <>
                {/* Sent Message List - Left Panel */}
                <div 
                  className="w-full md:w-2/5 border-b md:border-b-0 md:border-r overflow-y-auto flex-shrink-0 max-h-[40vh] md:max-h-none"
                  style={{ 
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundSecondary
                  }}
                >
                  {sentMessages.map((msg) => {
                    const isSelected = selectedSentMessage?.id === msg.id;
                    const typeInfo = getSentTypeInfo(msg.type_display);
                    const TypeIcon = typeInfo.icon;
                    
                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleSentMessageClick(msg)}
                        className="px-4 py-3 cursor-pointer border-b transition-all duration-150"
                        style={{ 
                          borderColor: colors.border,
                          backgroundColor: isSelected 
                            ? colors.background
                            : 'transparent',
                          borderLeftWidth: isSelected ? '3px' : '0',
                          borderLeftColor: isSelected ? colors.accent : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = colors.background;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Type Icon */}
                          <div 
                            className="flex-shrink-0 p-2 rounded-lg mt-0.5"
                            style={{ backgroundColor: typeInfo.bgColor }}
                          >
                            <TypeIcon size={16} style={{ color: typeInfo.color }} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <Users size={12} style={{ color: colors.accent }} />
                                <span 
                                  className="text-xs font-medium"
                                  style={{ color: colors.accent }}
                                >
                                  {msg.recipient_count} destinatarios
                                </span>
                              </div>
                              <span 
                                className="text-xs flex-shrink-0"
                                style={{ color: colors.textMuted }}
                              >
                                {formatDate(msg.created_at)}
                              </span>
                            </div>
                            <p 
                              className="text-sm font-semibold truncate mt-0.5"
                              style={{ color: colors.textPrimary }}
                            >
                              {msg.subject}
                            </p>
                            <p 
                              className="text-xs truncate mt-1"
                              style={{ color: colors.textSecondary }}
                            >
                              {msg.message.replace(/<[^>]*>/g, '').substring(0, 60)}...
                            </p>
                            
                            {/* Stats Badges */}
                            <div className="flex items-center gap-2 mt-2">
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ 
                                  backgroundColor: typeInfo.bgColor,
                                  color: typeInfo.color
                                }}
                              >
                                {typeInfo.label}
                              </span>
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                                style={{ 
                                  backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
                                  color: '#059669'
                                }}
                              >
                                <Eye size={10} />
                                {msg.read_count} leídos
                              </span>
                              {msg.unread_count > 0 && (
                                <span 
                                  className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                                  style={{ 
                                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                                    color: '#dc2626'
                                  }}
                                >
                                  <EyeOff size={10} />
                                  {msg.unread_count} sin leer
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sent Message Detail - Right Panel */}
                <div 
                  className="flex-1 flex flex-col overflow-hidden min-h-[200px]"
                  style={{ backgroundColor: colors.background }}
                >
                  {selectedSentMessage ? (
                    <>
                      {/* Sent Message Header */}
                      <div 
                        className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0"
                        style={{ borderColor: colors.border }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {(() => {
                                const typeInfo = getSentTypeInfo(selectedSentMessage.type_display);
                                const TypeIcon = typeInfo.icon;
                                return (
                                  <span 
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-medium"
                                    style={{ 
                                      backgroundColor: typeInfo.bgColor,
                                      color: typeInfo.color
                                    }}
                                  >
                                    <TypeIcon size={12} />
                                    {typeInfo.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <h2 
                              className="text-base sm:text-lg font-bold"
                              style={{ color: colors.textPrimary }}
                            >
                              {selectedSentMessage.subject}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
                              <span 
                                className="flex items-center gap-1"
                                style={{ color: colors.accent }}
                              >
                                <Users size={14} />
                                {selectedSentMessage.recipient_count} destinatarios
                              </span>
                              <span 
                                className="flex items-center gap-1"
                                style={{ color: colors.textSecondary }}
                              >
                                <Clock size={14} />
                                {formatFullDate(selectedSentMessage.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recipients Info */}
                      <div 
                        className="px-4 sm:px-6 py-2 sm:py-3 border-b"
                        style={{ 
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: colors.border
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                              Destinatarios
                            </p>
                            <p className="text-sm" style={{ color: colors.textPrimary }}>
                              {selectedSentMessage.recipient_names || 'Múltiples usuarios'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-lg font-bold" style={{ color: colors.success }}>
                                {selectedSentMessage.read_count}
                              </p>
                              <p className="text-xs" style={{ color: colors.textSecondary }}>Leídos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold" style={{ color: colors.error }}>
                                {selectedSentMessage.unread_count}
                              </p>
                              <p className="text-xs" style={{ color: colors.textSecondary }}>Sin leer</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sent Message Body */}
                      <div 
                        className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4"
                        style={{ backgroundColor: colors.backgroundSecondary }}
                      >
                        <div 
                          className="prose prose-sm max-w-none rounded-lg p-3 sm:p-4 border"
                          style={{ 
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.textPrimary
                          }}
                          dangerouslySetInnerHTML={{ __html: selectedSentMessage.message }}
                        />
                      </div>

                      {/* Sent Message Footer */}
                      <div 
                        className="px-4 sm:px-6 py-2 sm:py-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0"
                        style={{ 
                          borderColor: colors.border,
                          backgroundColor: colors.backgroundSecondary
                        }}
                      >
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          ID: {selectedSentMessage.id}
                        </span>
                        <div className="text-xs" style={{ color: colors.textSecondary }}>
                          {Math.round((selectedSentMessage.read_count / selectedSentMessage.recipient_count) * 100)}% tasa de apertura
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center px-4">
                        <Send size={48} className="mx-auto mb-3" style={{ color: colors.textMuted, opacity: 0.5 }} />
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          Selecciona un mensaje para ver los detalles
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Send Message Modal */}
      <SendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onMessageSent={() => {
          handleRefresh();
          // Refetch sent messages too
          if (sentMessages.length > 0) {
            fetchSentMessages();
          }
        }}
      />
    </div>
  );
};

export default MessagesManager;