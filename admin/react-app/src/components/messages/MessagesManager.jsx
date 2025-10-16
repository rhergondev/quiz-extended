// admin/react-app/src/components/messages/MessagesManager.jsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle,
  Mail,
  Flag,
  MessageCircle,
  Send
} from 'lucide-react';

import useMessages from '../../hooks/useMessages';
import { useSearchInput, useFilterDebounce } from '../../api/utils/debounceUtils';

import PageHeader from '../common/PageHeader';
import FilterBar from '../common/FilterBar';
import MessagesList from './MessagesList';
import MessageDetailModal from './MessageDetailModal';
import SendMessageModal from './SendMessageModal';

const MessagesManager = () => {
  // --- LOCAL STATE ---
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

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
    updateMessage,
    fetchMessages,
    requestNotificationPermission
  } = useMessages({
    search: searchValue,
    status: filters.status !== 'all' ? filters.status : null,
    type: filters.type !== 'all' ? filters.type : null,
    autoFetch: true,
    enablePolling: true,
    pollingInterval: 30000 // Check every 30 seconds
  });

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // --- COMPUTED STATS ---
  const statsCards = useMemo(() => {
    const { 
      totalMessages = 0,
      unreadMessages = 0,
      feedbackMessages = 0,
      challengeMessages = 0
    } = computed || {};

    return [
      {
        label: 'Total Messages',
        value: totalMessages,
        icon: MessageSquare,
        iconColor: 'text-blue-500'
      },
      {
        label: 'Unread',
        value: unreadMessages,
        icon: Mail,
        iconColor: 'text-red-500'
      },
      {
        label: 'Feedback',
        value: feedbackMessages,
        icon: MessageCircle,
        iconColor: 'text-green-500'
      },
      {
        label: 'Challenges',
        value: challengeMessages,
        icon: Flag,
        iconColor: 'text-orange-500'
      }
    ];
  }, [computed]);

  // --- EVENT HANDLERS ---
  const handleRefresh = useCallback(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  const handleMessageClick = useCallback((message) => {
    setSelectedMessage(message);
    setIsDetailModalOpen(true);
    
    // Mark as read if unread
    if (message.status === 'unread') {
      updateMessage(message.id, { status: 'read' });
    }
  }, [updateMessage]);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setTimeout(() => setSelectedMessage(null), 300);
  }, []);

  const handleStatusChange = useCallback(async (messageId, newStatus) => {
    try {
      await updateMessage(messageId, { status: newStatus });
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  }, [updateMessage]);

  // --- SEARCH CONFIG ---
  const searchConfig = {
    value: searchValue,
    onChange: (e) => handleSearchChange(e.target.value),
    onClear: clearSearch,
    placeholder: 'Search messages...',
    isLoading: isSearching,
  };

  // --- FILTERS CONFIG ---
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'archived', label: 'Archived' }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'question_feedback', label: 'Feedback' },
    { value: 'question_challenge', label: 'Challenge' }
  ];

  const filtersConfig = [
    {
      label: 'Status',
      value: filters.status,
      onChange: (value) => updateFilter('status', value),
      options: statusOptions,
      placeholder: 'All Statuses',
    },
    {
      label: 'Type',
      value: filters.type,
      onChange: (value) => updateFilter('type', value),
      options: typeOptions,
      placeholder: 'All Types',
    }
  ];

  // --- RENDER ---
  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <PageHeader
        title="Messages"
        description="Manage student feedback and question challenges"
        stats={statsCards}
        isLoading={isFiltering || isSearching}
        primaryAction={{
          text: 'Enviar Mensaje',
          onClick: () => setIsSendModalOpen(true),
          icon: Send
        }}
      />

      {/* New Messages Notification Banner */}
      {hasNewMessages && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                New messages available
              </h3>
              <p className="text-sm text-blue-600">
                Click refresh to see the latest messages
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Refresh Now
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchConfig={searchConfig}
        filtersConfig={filtersConfig}
        onRefresh={handleRefresh}
        onResetFilters={resetFilters}
        isLoading={loading}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Messages List */}
      <MessagesList
        messages={messages}
        loading={loading}
        onMessageClick={handleMessageClick}
        onStatusChange={handleStatusChange}
        updating={updating}
      />

      {/* Message Detail Modal */}
      {isDetailModalOpen && selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          onClose={handleCloseDetailModal}
          onStatusChange={handleStatusChange}
          updating={updating}
        />
      )}

      {/* Send Message Modal */}
      <SendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onMessageSent={handleRefresh}
      />
    </div>
  );
};

export default MessagesManager;