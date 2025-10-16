// admin/react-app/src/components/frontend/dashboard/UserInbox.jsx

import React, { useState, useCallback } from 'react';
import { 
  Mail, 
  Inbox, 
  Bell, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader,
  Calendar,
  User,
  CheckCheck
} from 'lucide-react';
import useUserInbox from '../../../hooks/useUserInbox';

const UserInbox = () => {
  const [expandedMessage, setExpandedMessage] = useState(null);
  const [filter, setFilter] = useState('all');

  const {
    messages,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useUserInbox({
    filter,
    autoFetch: true,
    enablePolling: true,
    pollingInterval: 60000
  });

  const handleToggleMessage = useCallback((messageId) => {
    const message = messages.find(m => m.id === messageId);
    
    if (expandedMessage === messageId) {
      setExpandedMessage(null);
    } else {
      setExpandedMessage(messageId);
      // Mark as read if unread
      if (message && message.status === 'unread') {
        markAsRead(messageId);
      }
    }
  }, [expandedMessage, messages, markAsRead]);

  const getTypeIcon = (type) => {
    if (type.includes('announcement')) {
      return <Bell className="w-5 h-5 text-blue-500" />;
    } else if (type.includes('alert')) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <Inbox className="w-5 h-5 text-gray-500" />;
  };

  const getTypeLabel = (type) => {
    if (type.includes('announcement')) return 'Anuncio';
    if (type.includes('notification')) return 'Notificación';
    if (type.includes('alert')) return 'Alerta';
    return 'Mensaje';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Hace un momento';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours}h`;
    } else if (diffInHours < 48) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mensajes</h2>
              <p className="text-sm text-gray-600">
                {loading ? (
                  <span className="flex items-center">
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                    Cargando...
                  </span>
                ) : unreadCount > 0 ? (
                  <span className="text-blue-600 font-medium">
                    {unreadCount} {unreadCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}
                  </span>
                ) : (
                  'No tienes mensajes nuevos'
                )}
              </p>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Todos ({messages.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              No leídos ({unreadCount})
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-lg text-sm font-medium text-green-600 hover:bg-green-50 transition-colors flex items-center space-x-1"
                title="Marcar todos como leídos"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Marcar todos</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="divide-y divide-gray-200">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        {loading && messages.length === 0 ? (
          <div className="p-12 text-center">
            <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500">Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'unread' ? 'No tienes mensajes sin leer' : 'No tienes mensajes'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`transition-colors ${
                message.status === 'unread' ? 'bg-blue-50' : 'bg-white'
              }`}
            >
              {/* Message Header */}
              <div
                onClick={() => handleToggleMessage(message.id)}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(message.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`text-sm font-medium truncate ${
                          message.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {message.subject}
                        </h3>
                        {message.status === 'unread' && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {message.sender_name || 'Sistema'}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(message.created_at)}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {getTypeLabel(message.type)}
                        </span>
                      </div>

                      {/* Preview (only if not expanded) */}
                      {expandedMessage !== message.id && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {message.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Toggle Icon */}
                  <div className="ml-4 flex-shrink-0">
                    {expandedMessage === message.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedMessage === message.id && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-gray-50">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {message.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserInbox;