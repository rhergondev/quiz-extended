import React from 'react';
import { Mail } from 'lucide-react';
import useUserInbox from '../../../hooks/useUserInbox';

const MessagesBadge = () => {
  const { unreadCount, loading } = useUserInbox({ 
    autoFetch: true, 
    enablePolling: true,
    pollingInterval: 60000 // Poll cada minuto
  });

  // No mostrar si no hay mensajes nuevos
  if (loading || unreadCount === 0) {
    return null;
  }

  // Scroll suave hasta el inbox
  const scrollToInbox = () => {
    const inboxElement = document.getElementById('user-inbox-section');
    if (inboxElement) {
      inboxElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <button
      onClick={scrollToInbox}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 animate-pulse"
      title={`Tienes ${unreadCount} mensaje${unreadCount !== 1 ? 's' : ''} nuevo${unreadCount !== 1 ? 's' : ''}`}
    >
      <Mail className="w-4 h-4" />
      <span className="font-semibold text-sm">{unreadCount}</span>
      <span className="text-xs">mensaje{unreadCount !== 1 ? 's' : ''}</span>
    </button>
  );
};

export default MessagesBadge;
