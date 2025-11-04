// admin/react-app/src/components/messages/MessageDetailModal.jsx

import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  User, 
  Calendar,
  FileQuestion,
  Flag,
  MessageCircle,
  CheckCircle,
  Archive,
  MailOpen
} from 'lucide-react';

const MessageDetailModal = ({ message, onClose, onStatusChange, updating }) => {
  const [localStatus, setLocalStatus] = useState(message.status);

  const handleStatusChange = async (newStatus) => {
    setLocalStatus(newStatus);
    await onStatusChange(message.id, newStatus);
  };

  const getTypeInfo = (type) => {
    const types = {
      question_feedback: {
        icon: MessageCircle,
        label: 'Feedback',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      question_challenge: {
        icon: Flag,
        label: 'Challenge',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      }
    };

    return types[type] || types.question_feedback;
  };

  const typeInfo = getTypeInfo(message.type);
  const TypeIcon = typeInfo.icon;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 z-50" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="qe-bg-background rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border-2 qe-border-primary pointer-events-auto">
        {/* Header */}
        <div className="qe-bg-gradient-primary p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`p-3 ${typeInfo.bgColor} ${typeInfo.color} rounded-lg`}>
                <TypeIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-1 text-xs font-medium bg-white bg-opacity-20 rounded">
                    {typeInfo.label}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{message.subject}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Meta Information */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 qe-bg-primary-light rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <User className="w-4 h-4 qe-text-secondary" />
              <span className="qe-text-secondary">From:</span>
              <span className="font-medium qe-text-primary">
                {message.sender_name || `User #${message.sender_id}`}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 qe-text-secondary" />
              <span className="qe-text-secondary">Date:</span>
              <span className="font-medium qe-text-primary">
                {formatDate(message.created_at)}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <FileQuestion className="w-4 h-4 qe-text-secondary" />
              <span className="qe-text-secondary">Question:</span>
              <a
                href={`/wp-admin/post.php?post=${message.related_object_id}&action=edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium qe-text-accent hover:underline"
              >
                Question #{message.related_object_id}
              </a>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="w-4 h-4 qe-text-secondary" />
              <span className="qe-text-secondary">Status:</span>
              <span className={`font-medium capitalize ${
                localStatus === 'unread' ? 'text-red-600' :
                localStatus === 'read' ? 'qe-text-accent' :
                localStatus === 'resolved' ? 'text-green-600' :
                'qe-text-secondary'
              }`}>
                {localStatus}
              </span>
            </div>
          </div>

          {/* Message Body */}
          <div className="mb-6">
            <h3 className="text-sm font-medium qe-text-primary mb-2">Message:</h3>
            <div className="qe-bg-background border qe-border-primary rounded-lg p-4">
              <p className="qe-text-primary whitespace-pre-wrap leading-relaxed">
                {message.message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="border-t qe-border-primary p-6 qe-bg-primary-light">
          <div className="flex items-center justify-between">
            <div className="text-sm qe-text-secondary">
              Message ID: {message.id}
            </div>
            <div className="flex items-center space-x-2">
              {localStatus === 'unread' && (
                <button
                  onClick={() => handleStatusChange('read')}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 qe-bg-accent text-white rounded-lg qe-hover-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MailOpen className="w-4 h-4" />
                  <span>Mark as Read</span>
                </button>
              )}
              {localStatus === 'read' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark as Resolved</span>
                </button>
              )}
              {(localStatus === 'read' || localStatus === 'resolved') && (
                <button
                  onClick={() => handleStatusChange('archived')}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 border qe-border-primary qe-text-primary rounded-lg hover:qe-bg-primary-light transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MessageDetailModal;