// admin/react-app/src/hooks/useUserInbox.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiConfig } from '../api/config/apiConfig';
import { makeApiRequest } from '../api/services/baseService';

/**
 * Custom hook for managing user inbox (student side)
 * @param {Object} options - Configuration options
 * @param {string} options.filter - Filter by status ('all', 'unread', 'read')
 * @param {boolean} options.autoFetch - Auto-fetch on mount
 * @param {boolean} options.enablePolling - Enable automatic polling
 * @param {number} options.pollingInterval - Polling interval in milliseconds (default: 60000)
 * @returns {Object} Inbox state and operations
 */
const useUserInbox = (options = {}) => {
  const {
    filter = 'all',
    autoFetch = true,
    enablePolling = true,
    pollingInterval = 60000 // 1 minute
  } = options;

  // --- STATE ---
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- REFS ---
  const mountedRef = useRef(true);
  const pollingTimerRef = useRef(null);
  const lastFetchRef = useRef(Date.now());

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
  const fetchMessages = useCallback(async (showLoading = true) => {
    if (!mountedRef.current) return;

    if (showLoading) {
      setLoading(true);
    }
    
    setError(null);

    try {
      const config = getApiConfig();
      
      const params = new URLSearchParams({
        per_page: '50',
        orderby: 'created_at',
        order: 'desc'
      });

      if (filter === 'unread') {
        params.append('status', 'unread');
      } else if (filter === 'read') {
        params.append('status', 'read');
      }

      const url = `${config.endpoints.custom_api}/messages/inbox?${params}`;
      
      console.log('📬 Fetching user inbox:', url);

      const response = await makeApiRequest(url);

      if (!mountedRef.current) return;

      const fetchedMessages = response.data?.data || [];
      
      setMessages(fetchedMessages);

      // Count unread
      const unread = fetchedMessages.filter(m => m.status === 'unread').length;
      setUnreadCount(unread);

      lastFetchRef.current = Date.now();

      console.log(`✅ Loaded ${fetchedMessages.length} messages (${unread} unread)`);

    } catch (err) {
      console.error('❌ Error fetching inbox:', err);
      if (mountedRef.current) {
        setError(err.message || 'Error al cargar los mensajes');
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [filter]);

  // --- MARK AS READ ---
  const markAsRead = useCallback(async (messageId) => {
    if (!mountedRef.current) return;

    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/${messageId}/read`;

      console.log(`📖 Marking message ${messageId} as read`);

      await makeApiRequest(url, { method: 'PUT' });

      if (!mountedRef.current) return;

      // Update local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      console.log('✅ Message marked as read');

    } catch (err) {
      console.error('❌ Error marking message as read:', err);
      throw err;
    }
  }, []);

  // --- MARK ALL AS READ ---
  const markAllAsRead = useCallback(async () => {
    const unreadMessages = messages.filter(m => m.status === 'unread');

    for (const message of unreadMessages) {
      try {
        await markAsRead(message.id);
      } catch (err) {
        console.error(`Error marking message ${message.id} as read:`, err);
      }
    }
  }, [messages, markAsRead]);

  // --- DELETE MESSAGE ---
  const deleteMessage = useCallback(async (messageId) => {
    if (!mountedRef.current) return;

    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/${messageId}`;

      console.log(`🗑️ Deleting message ${messageId}`);

      await makeApiRequest(url, { method: 'DELETE' });

      if (!mountedRef.current) return;

      // Update local state - remove message
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      // Update unread count if was unread
      const deletedMessage = messages.find(m => m.id === messageId);
      if (deletedMessage && deletedMessage.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      console.log('✅ Message deleted');

    } catch (err) {
      console.error('❌ Error deleting message:', err);
      throw err;
    }
  }, [messages]);

  // --- POLLING ---
  const startPolling = useCallback(() => {
    if (!enablePolling || pollingTimerRef.current) return;

    console.log(`⏰ Starting inbox polling every ${pollingInterval / 1000}s`);

    const poll = () => {
      // Only poll if page is visible
      if (!document.hidden) {
        fetchMessages(false); // Don't show loading on automatic refresh
      }
      pollingTimerRef.current = setTimeout(poll, pollingInterval);
    };

    pollingTimerRef.current = setTimeout(poll, pollingInterval);
  }, [enablePolling, pollingInterval, fetchMessages]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      console.log('⏸️ Stopping inbox polling');
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // --- EFFECTS ---

  // Auto-fetch on mount and filter change
  useEffect(() => {
    if (autoFetch) {
      fetchMessages(true);
    }
  }, [filter, autoFetch]);

  // Start/stop polling
  useEffect(() => {
    if (enablePolling && !loading) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enablePolling, loading, startPolling, stopPolling]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && enablePolling) {
        console.log('🔍 Page visible, checking for new messages...');
        fetchMessages(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enablePolling, fetchMessages]);

  return {
    messages,
    loading,
    error,
    unreadCount,
    fetchMessages,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    startPolling,
    stopPolling
  };
};

export default useUserInbox;