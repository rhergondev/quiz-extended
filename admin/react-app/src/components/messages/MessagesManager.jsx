// admin/react-app/src/components/messages/MessagesManager.jsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useParams, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Mail,
  MailOpen,
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
  Plus,
  Clock,
  ArrowRight
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import useMessages from '../../hooks/useMessages';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';
import { updateQuestion } from '../../api/services/questionService';
import SendMessageModal from './SendMessageModal';
import QuestionEditorPanel from '../questions/QuestionEditorPanel';
import { useTaxonomyOptions } from '../../hooks/useTaxonomyOptions.js';
import useQuizzes from '../../hooks/useQuizzes';
import useLessons from '../../hooks/useLessons';
import useCourses from '../../hooks/useCourses';
import { toast } from 'react-toastify';

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

// Component to fetch and display question title
const QuestionPreview = ({ questionId, pageColors }) => {
  const [title, setTitle] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchQuestion = async () => {
      try {
        const config = getApiConfig();
        const response = await makeApiRequest(`${config.endpoints.questions}/${questionId}`);
        if (isMounted && response) {
          const questionData = response.data || response;
          setTitle(questionData.title?.rendered || questionData.title || `Pregunta #${questionId}`);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) setTitle(`Pregunta #${questionId}`);
      }
    };
    if (questionId) fetchQuestion();
    return () => { isMounted = false; };
  }, [questionId]);

  if (!title) return <span className="text-sm font-medium" style={{ color: pageColors.text }}>Cargando pregunta...</span>;

  return (
    <span 
      className="text-sm font-medium block" 
      style={{ color: pageColors.text }} 
      dangerouslySetInnerHTML={{ __html: title }} 
    />
  );
};

const MessagesManager = ({ initialSearch = '', courseMode: courseModeProp = false, courseId: courseIdProp = null }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const params = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Deep linking: leer messageId de la URL
  const urlMessageId = searchParams.get('messageId');
  
  // Extraer courseId de la URL (ej: /courses/840/messages) o usar el prop
  const courseId = params.courseId || courseIdProp;
  
  // Activar courseMode automáticamente si hay un courseId (de URL o prop)
  const courseMode = courseModeProp || !!courseId;

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

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  
  // Courses with messages (for course selector)
  const [coursesWithMessages, setCoursesWithMessages] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState(null);

  const { searchValue, handleSearchChange, clearSearch } = useSearchInput(searchParams.get('search') || initialSearch, () => {}, 500);
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
    courseId: selectedCourseFilter,
    autoFetch: true,
    enablePolling: true,
    pollingInterval: 30000
  });

  // Fetch replies for a message - MUST be defined before the useEffect that uses it
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

  // Fetch courses with messages on mount
  useEffect(() => {
    const fetchCoursesWithMessages = async () => {
      setLoadingCourses(true);
      try {
        const config = getApiConfig();
        const response = await makeApiRequest(`${config.endpoints.custom_api}/messages/courses`);
        const data = response?.data?.courses || response?.courses || [];
        setCoursesWithMessages(data);
      } catch (err) {
        console.error('Error fetching courses with messages:', err);
      } finally {
        setLoadingCourses(false);
      }
    };
    if (!courseMode) fetchCoursesWithMessages();
  }, [courseMode]);

  useEffect(() => { requestNotificationPermission(); }, [requestNotificationPermission]);
  useEffect(() => { if (selectedMessage && !messages.find(m => m.id === selectedMessage.id)) setSelectedMessage(null); }, [messages, selectedMessage]);

  // 🔗 Deep linking: abrir mensaje desde URL con ?messageId=X
  useEffect(() => {
    if (!urlMessageId || loading || messages.length === 0) return;
    
    const messageIdNum = parseInt(urlMessageId, 10);
    if (isNaN(messageIdNum)) return;
    
    // Buscar el mensaje en la lista cargada
    const messageFromList = messages.find(m => m.id === messageIdNum);
    
    if (messageFromList) {
      // Mensaje encontrado en la lista, abrirlo
      console.log('🔗 Deep link: Abriendo mensaje #' + messageIdNum);
      setSelectedMessage(messageFromList);
      setShowQuestionEditor(false);
      setReplyText('');
      setReplies([]);
      fetchReplies(messageIdNum);
      // No marcamos como leído al acceder, solo cuando se responda
      // Limpiar el query param después de abrir
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('messageId');
        return newParams;
      });
    } else {
      // Mensaje no está en la lista actual, intentar cargarlo directamente
      const fetchMessageById = async () => {
        try {
          const config = getApiConfig();
          const response = await makeApiRequest(`${config.endpoints.custom_api}/messages/${messageIdNum}`);
          const message = response?.data?.data || response?.data;
          if (message) {
            console.log('🔗 Deep link: Mensaje cargado desde API #' + messageIdNum);
            setSelectedMessage(message);
            setShowQuestionEditor(false);
            setReplyText('');
            setReplies([]);
            fetchReplies(messageIdNum);
            // No marcamos como leído al acceder, solo cuando se responda
          }
        } catch (err) {
          console.error('Error loading message from deep link:', err);
          toast.error('No se pudo cargar el mensaje');
        }
        // Limpiar el query param
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('messageId');
          return newParams;
        });
      };
      fetchMessageById();
    }
  }, [urlMessageId, loading, messages, fetchReplies, setSearchParams]);

  const handleRefresh = useCallback(() => {
    fetchMessages(true); 
    setSelectedIds(new Set()); 
    if (selectedMessage) fetchReplies(selectedMessage.id);
  }, [fetchMessages, selectedMessage, fetchReplies]);

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
    setShowQuestionEditor(false); 
    setReplyText('');
    setReplies([]); // Clear previous replies
    fetchReplies(message.id); // Load replies for this message
    // No marcamos como leído al acceder, solo cuando se responda
  }, [fetchReplies]);

  const handleClosePanel = useCallback(() => {
    setSelectedMessage(null);
    setReplies([]);
    setReplyText('');
  }, []);

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
      toast.success('Respuesta enviada correctamente');
    } catch (err) {
      console.error('❌ Error sending reply:', err);
      toast.error(`Error al enviar: ${err.message || 'Error desconocido'}`);
    } finally {
      setSendingReply(false);
    }
  }, [replyText, selectedMessage, handleStatusChange, fetchReplies]);

  const handleQuestionSave = useCallback(async (questionData) => {
    if (!selectedMessage?.related_object_id) {
      console.error('No question ID available to update');
      return;
    }
    try {
      await updateQuestion(selectedMessage.related_object_id, questionData);
      toast.success('Pregunta actualizada correctamente');
      setShowQuestionEditor(false);
    } catch (err) {
      console.error('Error updating question:', err);
      toast.error(`Error al guardar: ${err.message || 'Error desconocido'}`);
      throw err; // Re-throw so QuestionEditorPanel can handle it
    }
  }, [selectedMessage]);

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
    if (status === 'unread' || status === 'read') return { label: 'Sin leer', color: pageColors.error, bgColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', icon: Mail };
    if (status === 'resolved') return { label: 'Resuelto', color: pageColors.success, bgColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5', icon: CheckCircle };
    return { label: status || 'Archivado', color: pageColors.textMuted, bgColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6', icon: Archive };
  };

  const isPanelOpen = selectedMessage !== null;

  const formatTableDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Get selected course name for display
  const selectedCourseName = useMemo(() => {
    if (!selectedCourseFilter) return null;
    const course = coursesWithMessages.find(c => c.id === selectedCourseFilter);
    return course?.title || null;
  }, [selectedCourseFilter, coursesWithMessages]);

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: pageColors.bgPage, maxHeight: '100%' }}>
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* LIST VIEW - Slides out to left when detail is open */}
        <div 
          className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${
            isPanelOpen ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          {/* HEADER BAR */}
          <div 
            className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 flex-shrink-0"
            style={{ 
              backgroundColor: pageColors.bgCard,
              borderBottom: `1px solid ${pageColors.cardBorder}`
            }}
          >
            {/* Mobile: Top row with title and actions */}
            <div className="flex items-center justify-between sm:hidden">
              <div className="flex items-center gap-2">
                <Inbox size={18} style={{ color: pageColors.accent }} />
                <span className="font-semibold text-sm" style={{ color: pageColors.text }}>Mensajes</span>
                {computed?.unread > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: pageColors.error }}>
                    {computed.unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRefresh} 
                  disabled={loading}
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: pageColors.inputBg, color: pageColors.textMuted }}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setIsSendModalOpen(true)} 
                  className="p-2 rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`, color: '#fff' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Mobile: Search and filters row */}
            {!courseMode && (
              <div className="flex sm:hidden items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: pageColors.textMuted }} />
                  <input 
                    type="text" 
                    value={searchValue} 
                    onChange={(e) => handleSearchChange(e.target.value)} 
                    placeholder="Buscar..." 
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-lg focus:outline-none" 
                    style={{ backgroundColor: pageColors.inputBg, border: `1px solid ${pageColors.cardBorder}`, color: pageColors.text }} 
                  />
                  {searchValue && (
                    <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: pageColors.textMuted }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select 
                  value={filters.status} 
                  onChange={(e) => updateFilter('status', e.target.value)} 
                  className="text-xs px-2 py-2 rounded-lg" 
                  style={{ backgroundColor: pageColors.inputBg, border: `1px solid ${pageColors.cardBorder}`, color: pageColors.text }}
                >
                  <option value="all">Todos</option>
                  <option value="unread">Sin leer</option>
                  <option value="resolved">Resueltos</option>
                </select>
              </div>
            )}

            {/* Desktop: Left - Course Selector */}
            <div className="hidden sm:flex items-center gap-3">
              {!courseMode && coursesWithMessages.length > 0 && (
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: pageColors.inputBg }}>
                  <button 
                    onClick={() => setSelectedCourseFilter(null)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200" 
                    style={{ 
                      backgroundColor: !selectedCourseFilter ? pageColors.bgCard : 'transparent', 
                      color: !selectedCourseFilter ? pageColors.text : pageColors.textMuted,
                      boxShadow: !selectedCourseFilter ? pageColors.shadowSm : 'none'
                    }}
                  >
                    <Inbox size={16} />Todos
                  </button>
                  {coursesWithMessages.slice(0, 4).map(course => (
                    <button 
                      key={course.id}
                      onClick={() => setSelectedCourseFilter(course.id)} 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 max-w-[150px]" 
                      style={{ 
                        backgroundColor: selectedCourseFilter === course.id ? pageColors.bgCard : 'transparent', 
                        color: selectedCourseFilter === course.id ? pageColors.text : pageColors.textMuted,
                        boxShadow: selectedCourseFilter === course.id ? pageColors.shadowSm : 'none'
                      }}
                      title={course.title}
                    >
                      <span className="truncate">{course.title}</span>
                      {course.unread_count > 0 && (
                        <span 
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: pageColors.error }}
                        >
                          {course.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                  {coursesWithMessages.length > 4 && (
                    <select
                      value={selectedCourseFilter && !coursesWithMessages.slice(0, 4).find(c => c.id === selectedCourseFilter) ? selectedCourseFilter : ''}
                      onChange={(e) => setSelectedCourseFilter(e.target.value ? parseInt(e.target.value) : null)}
                      className="text-sm px-2 py-1.5 rounded-md transition-all"
                      style={{ backgroundColor: 'transparent', color: pageColors.textMuted, border: 'none' }}
                    >
                      <option value="">+{coursesWithMessages.length - 4} más</option>
                      {coursesWithMessages.slice(4).map(course => (
                        <option key={course.id} value={course.id}>{course.title} ({course.unread_count})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              {!courseMode && coursesWithMessages.length === 0 && !loadingCourses && (
                <div className="flex items-center gap-2 text-sm" style={{ color: pageColors.textMuted }}>
                  <Inbox size={16} />
                  <span>Bandeja de entrada</span>
                </div>
              )}
            </div>

            {/* Desktop: Center - Search and Filters */}
            <div className="hidden sm:flex items-center gap-3 flex-1 max-w-xl mx-4">
              {!courseMode && (
                <>
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: pageColors.textMuted }} />
                    <input 
                      type="text" 
                      value={searchValue} 
                      onChange={(e) => handleSearchChange(e.target.value)} 
                      placeholder="Buscar mensajes..." 
                      className="w-full pl-10 pr-10 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 transition-all" 
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

                  <select 
                    value={filters.status} 
                    onChange={(e) => updateFilter('status', e.target.value)} 
                    className="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all" 
                    style={{ 
                      backgroundColor: pageColors.inputBg, 
                      border: `1px solid ${pageColors.cardBorder}`,
                      color: pageColors.text,
                      '--tw-ring-color': pageColors.accent
                    }}
                  >
                    <option value="all">Todos</option>
                    <option value="unread">Sin leer</option>
                    <option value="resolved">Resueltos</option>
                  </select>
                  <select 
                    value={filters.type} 
                    onChange={(e) => updateFilter('type', e.target.value)} 
                    className="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all" 
                    style={{ 
                      backgroundColor: pageColors.inputBg, 
                      border: `1px solid ${pageColors.cardBorder}`,
                      color: pageColors.text,
                      '--tw-ring-color': pageColors.accent
                    }}
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="question_feedback">Dudas</option>
                    <option value="question_challenge">Impugnaciones</option>
                  </select>
                </>
              )}
            </div>

            {/* Desktop: Right - Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe' }}>
                  <span className="text-sm font-medium" style={{ color: pageColors.info }}>{selectedIds.size} sel.</span>
                  <button onClick={() => handleBatchAction('resolve')} className="text-xs px-2 py-1 rounded font-medium" style={{ backgroundColor: pageColors.success, color: '#fff' }}>Resueltos</button>
                  <button onClick={() => handleBatchAction('archive')} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: pageColors.hoverBg, color: pageColors.textMuted }}>Archivar</button>
                </div>
              )}
              <button 
                onClick={handleRefresh} 
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
              <button 
                onClick={() => setIsSendModalOpen(true)} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                style={{ 
                  background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`,
                  color: '#fff',
                }}
              >
                <Plus size={16} />Nuevo mensaje
              </button>
            </div>
          </div>

          {/* TABLE / MOBILE CARDS */}
          <div className="flex-1 overflow-hidden p-2 sm:p-4 pb-16">
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
                className="hidden md:grid gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider flex-shrink-0"
                style={{ 
                  gridTemplateColumns: '40px 1fr 1.5fr 100px 100px 140px',
                  backgroundColor: pageColors.inputBg,
                  color: pageColors.textMuted,
                  borderBottom: `1px solid ${pageColors.cardBorder}`
                }}
              >
                <div className="flex items-center justify-center"><Square size={14} /></div>
                <div>Remitente</div>
                <div>Mensaje</div>
                <div>Tipo</div>
                <div>Estado</div>
                <div className="flex items-center gap-1"><Clock size={12} />Fecha</div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto">
                {loading && messages.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} />
                  </div>
                )}
                {!loading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48">
                    <Inbox size={40} style={{ color: pageColors.textMuted, opacity: 0.3 }} />
                    <p className="text-sm mt-3" style={{ color: pageColors.textMuted }}>
                      {selectedCourseFilter ? 'No hay mensajes en este curso' : 'No hay mensajes'}
                    </p>
                  </div>
                )}
                {messages.map((message) => {
                  const isSelected = selectedMessage?.id === message.id;
                  const isChecked = selectedIds.has(message.id);
                  const isUnread = message.status === 'unread' || message.status === 'read';
                  const typeInfo = getTypeInfo(message.type);
                  const statusInfo = getStatusInfo(message.status);
                  const TypeIcon = typeInfo.icon;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <React.Fragment key={message.id}>
                      {/* Desktop Row */}
                      <div 
                        className="hidden md:grid gap-4 px-4 py-3 items-center cursor-pointer transition-all duration-150"
                        style={{ 
                          gridTemplateColumns: '40px 1fr 1.5fr 100px 100px 140px',
                          backgroundColor: 'transparent',
                          borderBottom: `1px solid ${pageColors.cardBorder}`,
                        }}
                        onClick={() => handleMessageClick(message)}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = pageColors.hoverBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => handleToggleSelect(message.id, e)} className="transition-transform hover:scale-110">
                            {isChecked ? <CheckSquare size={16} style={{ color: pageColors.accent }} /> : <Square size={16} style={{ color: pageColors.textMuted }} />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: pageColors.inputBg }}>
                            <User size={14} style={{ color: pageColors.textMuted }} />
                          </div>
                          <span className={`text-sm truncate ${isUnread ? 'font-semibold' : ''}`} style={{ color: isUnread ? pageColors.text : pageColors.textMuted }}>
                            {message.sender_name || `Usuario #${message.sender_id}`}
                          </span>
                          {isUnread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pageColors.error }} />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${isUnread ? 'font-medium' : ''}`} style={{ color: pageColors.text }}>
                            {cleanMessageContent(message.message, message.subject) ? cleanMessageContent(message.message, message.subject).replace(/<[^>]*>/g, '').substring(0, 100) : '(Sin mensaje)'}
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
                        <div className="text-xs" style={{ color: pageColors.textMuted }}>
                          {formatTableDate(message.created_at)}
                        </div>
                      </div>

                      {/* Mobile Card */}
                      <div 
                        className="md:hidden p-3 cursor-pointer transition-all duration-150 active:scale-[0.99]"
                        style={{ 
                          backgroundColor: 'transparent',
                          borderBottom: `1px solid ${pageColors.cardBorder}`,
                        }}
                        onClick={() => handleMessageClick(message)}
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
                                {message.sender_name || `Usuario #${message.sender_id}`}
                              </span>
                              <span className="text-xs flex-shrink-0" style={{ color: pageColors.textMuted }}>
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            
                            {/* Message preview */}
                            <p className={`text-sm line-clamp-2 mb-2 ${isUnread ? 'font-medium' : ''}`} style={{ color: isUnread ? pageColors.text : pageColors.textMuted }}>
                              {cleanMessageContent(message.message, message.subject) ? cleanMessageContent(message.message, message.subject).replace(/<[^>]*>/g, '').substring(0, 120) : '(Sin mensaje)'}
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
              </div>
            </div>
          </div>
        </div>

        {/* DETAIL VIEW - Slides in from right */}
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
                      {selectedMessage.sender_name || `Usuario #${selectedMessage.sender_id}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(() => { const typeInfo = getTypeInfo(selectedMessage.type); const TypeIcon = typeInfo.icon; return <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: typeInfo.bgColor, color: typeInfo.color }}><TypeIcon size={10} />{typeInfo.label}</span>; })()}
                      {(() => { const statusInfo = getStatusInfo(selectedMessage.status); return <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}>{statusInfo.label}</span>; })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleStatusChange(selectedMessage.id, 'archived')} 
                    className="p-2 rounded-lg" 
                    style={{ backgroundColor: pageColors.inputBg, border: `1px solid ${pageColors.cardBorder}`, color: pageColors.textMuted }} 
                    title="Archivar"
                  >
                    <Archive size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 min-h-0" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                {/* Original message */}
                <div className="flex gap-2 sm:gap-4 max-w-4xl">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)` }}>
                    <User size={14} className="text-white sm:hidden" />
                    <User size={16} className="text-white hidden sm:block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl rounded-tl-sm p-3 sm:p-4" style={{ backgroundColor: pageColors.bgCard, border: `1px solid ${pageColors.cardBorder}`, boxShadow: pageColors.shadowSm }}>
                      <div className="text-sm prose prose-sm max-w-none leading-relaxed break-words" style={{ color: pageColors.text }} dangerouslySetInnerHTML={{ __html: cleanMessageContent(selectedMessage.message, selectedMessage.subject) }} />
                    </div>
                    <p className="text-xs mt-1.5 sm:mt-2 ml-2 sm:ml-3" style={{ color: pageColors.textMuted }}>{formatFullDate(selectedMessage.created_at)}</p>
                  </div>
                </div>

                {/* Question card */}
                {selectedMessage.related_object_id && (
                  <div className="ml-10 sm:ml-14 max-w-2xl p-3 sm:p-4 rounded-xl" style={{ backgroundColor: pageColors.inputBg, border: `1px solid ${pageColors.cardBorder}` }}>
                    {showQuestionEditor ? (
                      <div className="rounded-xl overflow-visible" style={{ border: `1px solid ${pageColors.cardBorder}` }}>
                        <QuestionEditorPanel questionId={selectedMessage.related_object_id} mode="edit" onSave={handleQuestionSave} onCancel={() => setShowQuestionEditor(false)} simpleMode={true} />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2 mb-3">
                          <FileQuestion size={16} className="flex-shrink-0 mt-0.5" style={{ color: pageColors.accent }} />
                          <QuestionPreview questionId={selectedMessage.related_object_id} pageColors={pageColors} />
                        </div>
                        <button onClick={() => setShowQuestionEditor(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium w-full justify-center" style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`, color: '#fff' }}>
                          <Edit3 size={14} />Editar pregunta
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Loading */}
                {loadingReplies && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${pageColors.accent}30`, borderTopColor: pageColors.accent }} /></div>}

                {/* Replies */}
                {replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2 sm:gap-4 justify-end max-w-4xl ml-auto">
                    <div className="max-w-[85%] sm:max-w-[80%]">
                      <div className="rounded-2xl rounded-tr-sm p-3 sm:p-4" style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)`, color: '#fff', boxShadow: '0 2px 12px rgba(59, 130, 246, 0.2)' }}>
                        <div className="text-sm prose prose-sm prose-invert max-w-none leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: reply.message }} />
                      </div>
                      <p className="text-xs mt-1.5 sm:mt-2 mr-2 sm:mr-3 text-right" style={{ color: pageColors.textMuted }}>
                        {formatFullDate(reply.created_at)}{reply.sender_name && <span className="ml-1">• {reply.sender_name}</span>}
                      </p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pageColors.primary}, ${pageColors.primary}dd)` }}>
                      <Send size={12} className="text-white sm:hidden" />
                      <Send size={14} className="text-white hidden sm:block" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply input */}
              <div className="p-2 sm:p-3 flex-shrink-0" style={{ backgroundColor: pageColors.bgCard, borderTop: `1px solid ${pageColors.cardBorder}` }}>
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  <div className="flex gap-2 items-end">
                    <textarea 
                      value={replyText} 
                      onChange={(e) => setReplyText(e.target.value)} 
                      placeholder="Escribe tu respuesta..." 
                      rows={3} 
                      maxLength={5000}
                      className="flex-1 px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2" 
                      style={{ backgroundColor: pageColors.inputBg, border: `1px solid ${pageColors.cardBorder}`, color: pageColors.text, '--tw-ring-color': pageColors.accent }} 
                    />
                    <button onClick={handleSendReply} disabled={!replyText.trim() || sendingReply} className="px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 text-sm font-medium disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${pageColors.accent}, ${pageColors.accent}dd)`, color: '#fff' }}>
                      {sendingReply ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <><Send size={14} /><span className="hidden sm:inline">Enviar</span></>}
                    </button>
                  </div>
                  {replyText.length > 4500 && (
                    <span className="text-xs text-right" style={{ color: replyText.length >= 5000 ? pageColors.error : pageColors.textMuted }}>
                      {replyText.length}/5000 caracteres
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <SendMessageModal 
        isOpen={isSendModalOpen} 
        onClose={() => setIsSendModalOpen(false)} 
        onMessageSent={() => { handleRefresh(); }}
        simplifiedMode={courseMode}
        courseId={courseId}
      />
    </div>
  );
};

export default MessagesManager;
