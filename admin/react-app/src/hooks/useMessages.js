// admin/react-app/src/hooks/useMessages.js

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getApiConfig } from '../api/config/apiConfig';
import { makeApiRequest } from '../api/services/baseService';

/**
 * Custom hook for managing messages with intelligent polling
 * @param {Object} options - Configuration options
 * @param {string} options.search - Search term
 * @param {string} options.status - Filter by status
 * @param {string} options.type - Filter by message type
 * @param {boolean} options.autoFetch - Auto-fetch on mount
 * @param {boolean} options.enablePolling - Enable automatic polling
 * @param {number} options.pollingInterval - Polling interval in milliseconds (default: 30000)
 * @returns {Object} Messages state and operations
 */
const useMessages = (options = {}) => {
  const {
    search = '',
    status = null,
    type = null,
    autoFetch = true,
    enablePolling = true,
    pollingInterval = 30000 // 30 seconds
  } = options;

  // --- STATE ---
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 20,
    hasMore: false
  });

  // --- REFS ---
  const mountedRef = useRef(true);
  const currentFiltersRef = useRef({ search, status, type });
  const lastFetchParamsRef = useRef('');
  const pollingTimerRef = useRef(null);
  const lastTotalRef = useRef(0);
  const isPageVisibleRef = useRef(true);

  // Update filters ref
  useEffect(() => {
    currentFiltersRef.current = { search, status, type };
  }, [search, status, type]);

  // Page visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      
      if (!document.hidden && enablePolling) {
        console.log('🔍 Page visible again, checking for new messages...');
        checkForNewMessages();
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

  // --- CHECK FOR NEW MESSAGES (Lightweight) ---
  const checkForNewMessages = useCallback(async () => {
    if (!mountedRef.current || !isPageVisibleRef.current) return;

    try {
      const config = getApiConfig();
      const currentFilters = currentFiltersRef.current;

      // Build query params (only get first page with count)
      const queryParams = new URLSearchParams({
        page: '1',
        per_page: '1', // Only get 1 item to check total
        orderby: 'created_at',
        order: 'desc'
      });

      if (currentFilters.status) {
        queryParams.append('status', currentFilters.status);
      }

      if (currentFilters.type) {
        queryParams.append('type', currentFilters.type);
      }

      const url = `${config.endpoints.custom_api}/messages?${queryParams}`;

      console.log('🔄 Checking for new messages...');

      const response = await makeApiRequest(url);

      if (!mountedRef.current) return;

      const totalHeader = response.headers['X-WP-Total'];
      const currentTotal = totalHeader ? parseInt(totalHeader, 10) : 0;

      // Check if there are new messages
      if (lastTotalRef.current > 0 && currentTotal > lastTotalRef.current) {
        const newCount = currentTotal - lastTotalRef.current;
        console.log(`🔔 ${newCount} new message(s) detected!`);
        setHasNewMessages(true);
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Quiz Extended', {
            body: `You have ${newCount} new message(s)`,
            icon: '/wp-content/plugins/quiz-extended/assets/icon.png'
          });
        }
      }

      lastTotalRef.current = currentTotal;

    } catch (err) {
      console.error('❌ Error checking for new messages:', err);
    }
  }, []);

  // --- START POLLING ---
  const startPolling = useCallback(() => {
    if (!enablePolling || pollingTimerRef.current) return;

    console.log(`⏰ Starting polling every ${pollingInterval / 1000}s`);

    const poll = () => {
      checkForNewMessages();
      pollingTimerRef.current = setTimeout(poll, pollingInterval);
    };

    pollingTimerRef.current = setTimeout(poll, pollingInterval);
  }, [enablePolling, pollingInterval, checkForNewMessages]);

  // --- STOP POLLING ---
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      console.log('⏸️ Stopping polling');
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // --- FETCH MESSAGES ---
  const fetchMessages = useCallback(async (reset = false) => {
    if (!mountedRef.current) return;

    const page = reset ? 1 : pagination.currentPage + 1;

    if (!reset && !pagination.hasMore) {
      console.log('📭 No more messages to load');
      return;
    }

    try {
      if (reset) {
        setLoading(true);
        setError(null);
        setMessages([]);
        setHasNewMessages(false); // Clear new messages flag
      }

      const config = getApiConfig();
      const currentFilters = currentFiltersRef.current;

      // Build query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        orderby: 'created_at',
        order: 'desc'
      });

      if (currentFilters.search) {
        queryParams.append('search', currentFilters.search);
      }

      if (currentFilters.status) {
        queryParams.append('status', currentFilters.status);
      }

      if (currentFilters.type) {
        queryParams.append('type', currentFilters.type);
      }

      const url = `${config.endpoints.custom_api}/messages?${queryParams}`;

      // Prevent duplicate requests
      const currentRequestParams = `${url}-${page}-${reset}`;
      if (currentRequestParams === lastFetchParamsRef.current && !reset) {
        console.log('🚫 Duplicate request prevented');
        return;
      }
      lastFetchParamsRef.current = currentRequestParams;

      console.log('🚀 Fetching messages:', url);

      const response = await makeApiRequest(url);

      if (!mountedRef.current) return;

      // Extract data
      const data = response.data?.data || [];

      // Extract pagination
      const totalHeader = response.headers['X-WP-Total'];
      const totalPagesHeader = response.headers['X-WP-TotalPages'];

      const currentTotal = totalHeader ? parseInt(totalHeader, 10) : data.length;
      lastTotalRef.current = currentTotal; // Update last known total

      const newPagination = {
        currentPage: page,
        totalPages: totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1,
        total: currentTotal,
        perPage: 20,
        hasMore: page < (totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1)
      };

      setPagination(newPagination);

      setMessages(prev => reset ? data : [...prev, ...data]);

      console.log(`✅ Loaded ${data.length} messages (Page ${page})`);

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

  // --- UPDATE MESSAGE ---
  const updateMessage = useCallback(async (messageId, updates) => {
    if (!mountedRef.current) return;

    setUpdating(true);
    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/${messageId}`;

      console.log(`📝 Updating message ${messageId}:`, updates);

      const response = await makeApiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (!mountedRef.current) return;

      const updatedMessage = response.data?.data;

      // Update local state
      setMessages(prev =>
        prev.map(msg => msg.id === messageId ? { ...msg, ...updatedMessage } : msg)
      );

      // Notify WordPress to update menu badge
      if (window.jQuery) {
        window.jQuery(document).trigger('qe-message-status-changed');
      }

      console.log('✅ Message updated successfully');

      return updatedMessage;

    } catch (err) {
      console.error('❌ Error updating message:', err);
      throw err;
    } finally {
      if (mountedRef.current) {
        setUpdating(false);
      }
    }
  }, []);

  // --- REQUEST NOTIFICATION PERMISSION ---
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // --- COMPUTED STATS ---
  const computed = useMemo(() => {
    return {
      totalMessages: pagination.total,
      unreadMessages: messages.filter(m => m.status === 'unread').length,
      feedbackMessages: messages.filter(m => m.type === 'question_feedback').length,
      challengeMessages: messages.filter(m => m.type === 'question_challenge').length
    };
  }, [messages, pagination.total]);

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch) {
      fetchMessages(true);
    }
  }, [search, status, type]);

  // Start/stop polling based on enablePolling
  useEffect(() => {
    if (enablePolling) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enablePolling, startPolling, stopPolling]);

  return {
    messages,
    loading,
    error,
    pagination,
    computed,
    updating,
    hasNewMessages,
    fetchMessages,
    updateMessage,
    checkForNewMessages,
    startPolling,
    stopPolling,
    requestNotificationPermission
  };
};

export default useMessages;