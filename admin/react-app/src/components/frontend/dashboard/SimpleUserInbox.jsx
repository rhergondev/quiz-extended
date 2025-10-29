import React, { useState, useEffect } from 'react';
import { Mail, ChevronLeft, ChevronRight, Search, Trash2, RefreshCw, X } from 'lucide-react';
import useUserInbox from '../../../hooks/useUserInbox';

const SimpleUserInbox = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { messages, loading, error, unreadCount, fetchMessages, markAsRead, deleteMessage } = useUserInbox({ 
    autoFetch: true, 
    enablePolling: false 
  });

  // Filtrar mensajes según búsqueda
  const filteredMessages = searchTerm 
    ? messages.filter(m => 
        m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : messages;

  const currentMessage = filteredMessages[currentIndex];

  // Ajustar índice si está fuera de rango después de filtrar
  useEffect(() => {
    if (filteredMessages.length > 0 && currentIndex >= filteredMessages.length) {
      setCurrentIndex(filteredMessages.length - 1);
    }
  }, [filteredMessages.length, currentIndex]);

  // Marcar como leído cuando se muestra
  useEffect(() => {
    if (currentMessage && currentMessage.status === 'unread') {
      markAsRead(currentMessage.id).catch(() => {});
    }
  }, [currentMessage, markAsRead]);

  // Navegar entre mensajes
  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < filteredMessages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Manejar borrado de mensaje
  const handleDeleteMessage = async () => {
    if (!currentMessage) return;

    try {
      await deleteMessage(currentMessage.id);
      
      // Ajustar navegación después de borrar
      if (filteredMessages.length === 1) {
        // Si era el último mensaje, resetear
        setCurrentIndex(0);
      } else if (currentIndex >= filteredMessages.length - 1) {
        // Si estamos en el último, retroceder
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      // Si hay siguiente, el índice actual mostrará el siguiente mensaje automáticamente
    } catch (err) {
      console.error('Error deleting message:', err);
      // Aquí podrías mostrar un toast de error si lo tienes implementado
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Hace un momento';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffHours < 48) return 'Ayer';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header con contador y controles */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Mail className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Mensajes</div>
            <div className="text-xs text-gray-600">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
            </div>
          </div>
        </div>

        {/* Controles de navegación y búsqueda */}
        <div className="flex items-center gap-2">
          {/* Botón búsqueda */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded hover:bg-white transition-colors ${showSearch ? 'bg-white text-indigo-600' : 'text-gray-600'}`}
            title="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Botón actualizar */}
          <button
            onClick={() => fetchMessages(true)}
            disabled={loading}
            className="p-2 rounded hover:bg-white text-gray-600 transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Navegación */}
          {filteredMessages.length > 0 && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-300">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="p-1.5 rounded hover:bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs text-gray-600 px-2 min-w-[60px] text-center">
                {currentIndex + 1} de {filteredMessages.length}
              </span>
              
              <button
                onClick={goToNext}
                disabled={currentIndex === filteredMessages.length - 1}
                className="p-1.5 rounded hover:bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de búsqueda (colapsable) */}
      {showSearch && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar en mensajes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentIndex(0); // Reset al primer resultado
              }}
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="text-xs text-gray-500 mt-2">
              {filteredMessages.length} resultado{filteredMessages.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Contenido del mensaje actual */}
      <div className="p-5">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        {loading && messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-sm">Cargando mensajes...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {searchTerm ? 'No se encontraron mensajes' : 'No tienes mensajes'}
            </p>
          </div>
        ) : currentMessage ? (
          <div className="space-y-4">
            {/* Encabezado del mensaje */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {currentMessage.subject}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>De: {currentMessage.sender_name || 'Admin'}</span>
                  <span>•</span>
                  <span>{formatDate(currentMessage.created_at)}</span>
                  {currentMessage.status === 'unread' && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                        Nuevo
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Botón borrar */}
              <button
                onClick={handleDeleteMessage}
                className="ml-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Borrar mensaje"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del mensaje */}
            <div className="prose prose-sm max-w-none">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentMessage.message }}
                />
              </div>
            </div>

            {/* Metadatos adicionales */}
            {currentMessage.type && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                  {currentMessage.type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SimpleUserInbox;
