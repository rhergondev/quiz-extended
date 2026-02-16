import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getApiConfig } from '../api/config/apiConfig';
import { makeApiRequest } from '../api/services/baseService';

const MessagesContext = createContext(null);

export const useMessagesContext = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessagesContext must be used within a MessagesProvider');
  }
  return context;
};

// Safe hook that returns null values if not within provider
export const useMessagesContextSafe = () => {
  return useContext(MessagesContext);
};

export const MessagesProvider = ({ children, enablePolling = true, pollingInterval = 30000 }) => {
  const isAdmin = useMemo(() => {
    return window.qe_data?.user?.roles?.includes('administrator') || false;
  }, []);

  // --- STATE ---
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // ✅ Actual unread count from API
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 20,
    hasMore: false
  });

  // --- REFS ---
  const mountedRef = useRef(true);
  const pollingTimerRef = useRef(null);
  const lastFetchParamsRef = useRef('');
  const isPageVisibleRef = useRef(true);
  const initialFetchDoneRef = useRef(false);

  // Page visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      
      if (!document.hidden && enablePolling && initialFetchDoneRef.current) {
        fetchMessages(true); // Refresh when page becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enablePolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  // --- FETCH MESSAGES ---
  const fetchMessages = useCallback(async (reset = false) => {
    if (!mountedRef.current) return;

    const page = reset ? 1 : pagination.currentPage + 1;

    if (!reset && !pagination.hasMore) {
      return;
    }

    try {
      if (reset) {
        setLoading(true);
        setError(null);
      }

      const config = getApiConfig();

      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        orderby: 'created_at',
        order: 'desc'
      });

      const endpoint = isAdmin ? 'messages' : 'messages/inbox';
      const url = `${config.endpoints.custom_api}/${endpoint}?${queryParams}`;

      // Prevent duplicate requests
      const currentRequestParams = `${url}-${page}-${reset}`;
      if (currentRequestParams === lastFetchParamsRef.current && !reset) {
        return;
      }
      lastFetchParamsRef.current = currentRequestParams;

      const response = await makeApiRequest(url);

      if (!mountedRef.current) return;

      const data = response.data?.data || [];

      const totalHeader = response.headers['X-WP-Total'];
      const totalPagesHeader = response.headers['X-WP-TotalPages'];

      const newPagination = {
        currentPage: page,
        totalPages: totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1,
        total: totalHeader ? parseInt(totalHeader, 10) : data.length,
        perPage: 20,
        hasMore: page < (totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1)
      };

      setPagination(newPagination);
      setMessages(prev => reset ? data : [...prev, ...data]);
      initialFetchDoneRef.current = true;

      // Fetch unread count separately to get accurate total
      fetchUnreadCount();

    } catch (err) {
      console.error('❌ Error fetching messages:', err);
      if (mountedRef.current) {
        setError(err.message || 'Failed to load messages');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [pagination]);

  // --- FETCH UNREAD COUNT ---
  const fetchUnreadCount = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const config = getApiConfig();
      const queryParams = new URLSearchParams({
        status: 'unread',
        per_page: '1', // We only need the header count, not the data
        page: '1'
      });

      const endpoint = isAdmin ? 'messages' : 'messages/inbox';
      const url = `${config.endpoints.custom_api}/${endpoint}?${queryParams}`;

      const response = await makeApiRequest(url);

      if (!mountedRef.current) return;

      // Get the total unread count from the header
      const totalUnread = response.headers['X-WP-Total'];
      const count = totalUnread ? parseInt(totalUnread, 10) : 0;

      setUnreadCount(count);

    } catch (err) {
      console.error('❌ Error fetching unread count:', err);
      // Don't update count on error, keep previous value
    }
  }, [isAdmin]);

  // --- UPDATE MESSAGE STATUS ---
  const updateMessageStatus = useCallback(async (messageId, status) => {
    if (!mountedRef.current) return;

    // Optimistic update
    setMessages(prev => prev.map(msg => 
      msg.id == messageId ? { ...msg, status } : msg
    ));

    setUpdating(true);
    try {
      const config = getApiConfig();
      const url = isAdmin
        ? `${config.endpoints.custom_api}/messages/${messageId}`
        : `${config.endpoints.custom_api}/messages/${messageId}/read`;

      const response = await makeApiRequest(url, isAdmin ? {
        method: 'PUT',
        body: JSON.stringify({ status })
      } : {
        method: 'POST'
      });

      if (!mountedRef.current) return;

      const updatedMessage = response.data || { status };

      // Update with server response
      setMessages(prev => prev.map(msg => 
        msg.id == messageId ? { ...msg, ...updatedMessage } : msg
      ));

      // Notify WordPress to update menu badge
      if (window.jQuery) {
        window.jQuery(document).trigger('qe-message-status-changed');
      }

      // Update unread count after status change
      fetchUnreadCount();

      return updatedMessage;

    } catch (err) {
      console.error('❌ Error updating message:', err);
      // Revert optimistic update on error
      fetchMessages(true);
      throw err;
    } finally {
      if (mountedRef.current) {
        setUpdating(false);
      }
    }
  }, [fetchMessages, fetchUnreadCount, isAdmin]);

  // --- DELETE MESSAGE ---
  const deleteMessage = useCallback(async (messageId) => {
    if (!mountedRef.current) return;

    if (!isAdmin) {
      throw new Error('No tienes permisos para eliminar mensajes.');
    }

    // Optimistic update
    const previousMessages = messages;
    setMessages(prev => prev.filter(msg => msg.id != messageId));
    setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));

    setUpdating(true);
    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/${messageId}`;

      await makeApiRequest(url, { method: 'DELETE' });

      if (!mountedRef.current) return;

    } catch (err) {
      console.error('❌ Error deleting message:', err);
      // Revert optimistic update on error
      setMessages(previousMessages);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      throw err;
    } finally {
      if (mountedRef.current) {
        setUpdating(false);
      }
    }
  }, [messages, isAdmin]);

  // --- POLLING ---
  useEffect(() => {
    if (!enablePolling) {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      return;
    }

    const poll = () => {
      if (isPageVisibleRef.current && initialFetchDoneRef.current) {
        fetchMessages(true);
      }
      pollingTimerRef.current = setTimeout(poll, pollingInterval);
    };

    pollingTimerRef.current = setTimeout(poll, pollingInterval);

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [enablePolling, pollingInterval, fetchMessages]);

  // --- INITIAL FETCH ---
  useEffect(() => {
    fetchMessages(true);
  }, []);

  // --- COMPUTED VALUES ---
  const computed = useMemo(() => ({
    totalMessages: pagination.total,
    unreadMessages: unreadCount, // ✅ Use actual count from API, not filtered from paginated messages
    feedbackMessages: messages.filter(m => m.type === 'question_feedback').length,
    challengeMessages: messages.filter(m => m.type === 'question_challenge').length
  }), [messages, pagination.total, unreadCount]);

  const value = {
    messages,
    loading,
    error,
    pagination,
    computed,
    updating,
    fetchMessages,
    updateMessageStatus,
    deleteMessage
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};

export default MessagesContext;
