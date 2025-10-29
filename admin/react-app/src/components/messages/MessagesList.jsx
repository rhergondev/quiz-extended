// admin/react-app/src/components/messages/MessagesList.jsx

import React, { useEffect } from 'react';
import { 
  Mail, 
  MailOpen, 
  Flag, 
  MessageCircle, 
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';

const MessagesList = ({ messages, loading, onMessageClick, onStatusChange, updating }) => {
  
  console.log('🔄 MessagesList render, messages:', messages.map(m => ({ id: m.id, status: m.status })));
  
  // Debug: Log when messages prop changes
  useEffect(() => {
    console.log('💥 MessagesList: messages prop changed!', messages.map(m => ({ id: m.id, status: m.status })));
  }, [messages]);
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'question_feedback':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'question_challenge':
        return <Flag className="w-5 h-5 text-red-500" />;
      default:
        return <Mail className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'question_feedback':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <MessageCircle className="w-3 h-3 mr-1" />
            Duda
          </span>
        );
      case 'question_challenge':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <Flag className="w-3 h-3 mr-1" />
            Impugnación
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            <Mail className="w-3 h-3 mr-1" />
            Mensaje
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      unread: { color: 'bg-red-100 text-red-800', label: 'Unread' },
      read: { color: 'bg-blue-100 text-blue-800', label: 'Read' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      archived: { color: 'bg-gray-100 text-gray-800', label: 'Archived' }
    };

    const badge = badges[status] || badges.read;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleStatusClick = (e, messageId, newStatus) => {
    e.stopPropagation();
    onStatusChange(messageId, newStatus);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
        <p className="text-gray-500">There are no messages matching your filters.</p>
      </div>
    );
  }

  return (
    <>
      {/* Custom scrollbar styles for webkit browsers */}
      <style>{`
        .messages-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        .messages-scroll-container::-webkit-scrollbar-track {
          background: #F7FAFC;
          border-radius: 4px;
        }
        .messages-scroll-container::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 4px;
        }
        .messages-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
      `}</style>
      
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Scrollable container with max height and custom scrollbar styles */}
        <div 
          className="messages-scroll-container divide-y divide-gray-100 max-h-[calc(100vh-400px)] overflow-y-auto"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E0 #F7FAFC'
          }}
        >
          {messages.map((message) => {
          // Debug log for each message render
          console.log(`🎨 Rendering message ${message.id}: status="${message.status}", isUnread=${message.status === 'unread'}`);
          
          return (
            <div
              key={message.id}
              onClick={() => onMessageClick(message)}
              className={`p-5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 ${
                message.status === 'unread' 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500' 
                  : 'hover:shadow-sm'
              }`}
            >
            <div className="flex items-start justify-between gap-4">
              {/* Left side - Message info */}
              <div className="flex items-start space-x-4 flex-1 min-w-0">
                {/* Type Icon with background */}
                <div className={`flex-shrink-0 mt-1 p-2.5 rounded-lg ${
                  message.type === 'question_challenge' 
                    ? 'bg-red-100' 
                    : message.type === 'question_feedback'
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}>
                  {getTypeIcon(message.type)}
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className={`text-base font-semibold truncate ${
                      message.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {message.subject}
                    </h3>
                    {message.status === 'unread' && (
                      <span className="flex-shrink-0 flex items-center justify-center w-2 h-2">
                        <span className="absolute w-2 h-2 bg-indigo-500 rounded-full animate-ping opacity-75"></span>
                        <span className="relative w-2 h-2 bg-indigo-600 rounded-full"></span>
                      </span>
                    )}
                  </div>

                  {/* Message preview */}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {message.message.replace(/<[^>]*>/g, '')}
                  </p>

                  {/* Meta info with badges */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {message.sender_name || `User #${message.sender_id}`}
                    </span>
                    
                    {getTypeBadge(message.type)}
                    
                    <span className="flex items-center text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Question #{message.related_object_id}
                    </span>
                    
                    <span className="flex items-center text-gray-500">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right side - Status and actions */}
              <div className="flex flex-col items-end space-y-3">
                {getStatusBadge(message.status)}

                {/* Quick actions */}
                <div className="flex items-center space-x-1">
                  {message.status === 'unread' && (
                    <button
                      onClick={(e) => handleStatusClick(e, message.id, 'read')}
                      className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                      title="Marcar como leído"
                      disabled={updating}
                    >
                      <MailOpen className="w-4 h-4" />
                    </button>
                  )}
                  {message.status === 'read' && (
                    <button
                      onClick={(e) => handleStatusClick(e, message.id, 'resolved')}
                      className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                      title="Marcar como resuelto"
                      disabled={updating}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {(message.status === 'read' || message.status === 'resolved') && (
                    <button
                      onClick={(e) => handleStatusClick(e, message.id, 'archived')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 transform hover:scale-110"
                      title="Archivar"
                      disabled={updating}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
    </>
  );
};

export default MessagesList;