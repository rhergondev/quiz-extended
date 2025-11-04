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
    <div className="rounded-lg h-full flex flex-col shadow-sm border qe-border-primary" style={{ backgroundColor: 'var(--qe-bg-card)' }}>
      {/* Header compacto con contador y controles */}
      <div className="flex items-center justify-between p-4 pb-3 border-b qe-border-primary mx-4">
        <div className="flex items-center gap-3">
          <div className="p-2 qe-bg-primary-light rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 qe-text-primary" />
          </div>
          <h2 className="text-lg font-bold qe-text-primary flex items-center">Mensajes</h2>
        </div>

        {/* Controles de navegación y búsqueda */}
        <div className="flex items-center gap-1">
          {/* Botón búsqueda */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 rounded text-white hover:qe-bg-accent transition-all"
            style={{ backgroundColor: 'var(--qe-primary)' }}
            title="Buscar"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
            }}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Botón actualizar */}
          <button
            onClick={() => fetchMessages(true)}
            disabled={loading}
            className="p-1.5 rounded text-white hover:qe-bg-accent transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--qe-primary)' }}
            title="Actualizar"
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Navegación */}
          {filteredMessages.length > 0 && (
            <div className="flex items-center gap-1 ml-1 pl-1 border-l qe-border-primary">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="p-1 rounded text-white hover:qe-bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: 'var(--qe-primary)' }}
                title="Anterior"
                onMouseEnter={(e) => {
                  if (currentIndex !== 0) e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                }}
                onMouseLeave={(e) => {
                  if (currentIndex !== 0) e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <span className="text-xs qe-text-primary px-1.5 min-w-[50px] text-center">
                {currentIndex + 1}/{filteredMessages.length}
              </span>
              
              <button
                onClick={goToNext}
                disabled={currentIndex === filteredMessages.length - 1}
                className="p-1 rounded text-white hover:qe-bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: 'var(--qe-primary)' }}
                title="Siguiente"
                onMouseEnter={(e) => {
                  if (currentIndex !== filteredMessages.length - 1) e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                }}
                onMouseLeave={(e) => {
                  if (currentIndex !== filteredMessages.length - 1) e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de búsqueda (colapsable) */}
      {showSearch && (
        <div className="p-3 border-b qe-border-primary qe-bg-primary-light">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar en mensajes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentIndex(0); // Reset al primer resultado
                }}
                className="w-full pl-8 pr-8 py-1.5 text-sm border qe-border-primary rounded-lg focus:outline-none focus:ring-2 focus:qe-ring-accent qe-bg-card qe-text-primary"
                style={{ backgroundColor: 'var(--qe-bg-card)' }}
                autoFocus
              />
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 qe-text-primary" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-white rounded-full p-0.5 hover:qe-bg-accent transition-all"
                  style={{ backgroundColor: 'var(--qe-primary)' }}
                  title="Limpiar búsqueda"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                  }}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            
            {/* Botón cerrar búsqueda */}
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchTerm('');
              }}
              className="p-1.5 rounded text-white hover:qe-bg-accent transition-all flex-shrink-0"
              style={{ backgroundColor: 'var(--qe-primary)' }}
              title="Cerrar búsqueda"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {searchTerm && (
            <div className="text-xs qe-text-secondary mt-1.5">
              {filteredMessages.length} resultado{filteredMessages.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Contenido del mensaje actual */}
      <div className="p-5">
        {error && (
          <div className="text-sm qe-text-error qe-bg-error-light p-3 rounded-lg">{error}</div>
        )}

        {loading && messages.length === 0 ? (
          <div className="text-center py-8 qe-text-secondary">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 qe-text-primary" />
            <p className="text-sm">Cargando mensajes...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 qe-text-secondary mx-auto mb-3 opacity-30" />
            <p className="text-sm qe-text-secondary">
              {searchTerm ? 'No se encontraron mensajes' : 'No tienes mensajes'}
            </p>
          </div>
        ) : currentMessage ? (
          <div className="space-y-4">
            {/* Encabezado del mensaje */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold qe-text-primary mb-2">
                  {currentMessage.subject}
                </h3>
                <div className="flex items-center gap-3 text-sm qe-text-primary">
                  <span className="font-semibold">De: {currentMessage.sender_name || 'Admin'}</span>
                  <span>•</span>
                  <span className="qe-text-secondary">{formatDate(currentMessage.created_at)}</span>
                  {currentMessage.status === 'unread' && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 qe-text-accent font-medium">
                        <span className="w-1.5 h-1.5 qe-bg-accent rounded-full"></span>
                        Nuevo
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Botón borrar */}
              <button
                onClick={handleDeleteMessage}
                className="ml-4 p-2 rounded transition-all text-white"
                style={{ backgroundColor: 'var(--qe-error, #dc2626)' }}
                title="Borrar mensaje"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--qe-error-dark, #b91c1c)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--qe-error, #dc2626)';
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo del mensaje */}
            <div className="prose prose-sm max-w-none">
              <div className="qe-bg-primary-light rounded-lg p-4 border qe-border-primary">
                <div 
                  className="qe-text-primary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentMessage.message }}
                />
              </div>
            </div>

            {/* Metadatos adicionales */}
            {currentMessage.type && (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 qe-bg-primary-light qe-text-primary rounded">
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
