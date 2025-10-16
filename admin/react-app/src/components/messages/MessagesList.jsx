// admin/react-app/src/components/messages/MessagesList.jsx

import React from 'react';
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
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'question_feedback':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'question_challenge':
        return <Flag className="w-5 h-5 text-orange-500" />;
      default:
        return <Mail className="w-5 h-5 text-gray-500" />;
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-200">
        {messages.map((message) => (
          <div
            key={message.id}
            onClick={() => onMessageClick(message)}
            className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
              message.status === 'unread' ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              {/* Left side - Message info */}
              <div className="flex items-start space-x-4 flex-1">
                {/* Type Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(message.type)}
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className={`text-sm font-medium truncate ${
                      message.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {message.subject}
                    </h3>
                    {message.status === 'unread' && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>

                  {/* Message preview */}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {message.message}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>From: {message.sender_name || `User #${message.sender_id}`}</span>
                    <span>•</span>
                    <span>Question #{message.related_object_id}</span>
                    <span>•</span>
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Right side - Status and actions */}
              <div className="flex items-center space-x-3 ml-4">
                {getStatusBadge(message.status)}

                {/* Quick actions */}
                <div className="flex items-center space-x-1">
                  {message.status === 'unread' && (
                    <button
                      onClick={(e) => handleStatusClick(e, message.id, 'read')}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Mark as read"
                      disabled={updating}
                    >
                      <MailOpen className="w-4 h-4" />
                    </button>
                  )}
                  {message.status === 'read' && (
                    <button
                      onClick={(e) => handleStatusClick(e, message.id, 'resolved')}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Mark as resolved"
                      disabled={updating}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {(message.status === 'read' || message.status === 'resolved') && (
                    <button
                      onClick={(e) => handleStatusClick(e, message.id, 'archived')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Archive"
                      disabled={updating}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessagesList;