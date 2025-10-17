import React, { useState, useCallback } from 'react';
import useMessages from '../../hooks/useMessages';
import useUsers from '../../hooks/useUsers';
import SendMessageModal from './SendMessageModal';

// Componente para la lista de mensajes (panel izquierdo)
const MessageListItem = ({ message, onSelect, isActive }) => (
    <div
        className={`p-3 cursor-pointer border-b border-gray-200 hover:bg-gray-100 ${isActive ? 'bg-blue-100' : ''} ${message.status === 'unread' ? 'font-bold' : ''}`}
        onClick={() => onSelect(message)}
    >
        <div className="flex justify-between items-center">
            <p className="text-sm truncate">{message.sender_name || 'Sistema'}</p>
            {/* CORRECCIÓN: Usamos el formateador nativo de JS */}
            <time className="text-xs text-gray-500">
                {new Date(message.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </time>
        </div>
        <p className="text-sm truncate mt-1">{message.subject}</p>
    </div>
);

// Componente para ver el detalle del mensaje (panel derecho)
const MessageContentView = ({ message, onUpdateStatus, onDelete }) => {
    if (!message) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Selecciona un mensaje para leerlo</p>
            </div>
        );
    }

    const handleMarkAsRead = () => {
        if (message.status === 'unread') {
            onUpdateStatus(message.id, 'read');
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold mb-2">{message.subject}</h2>
                <div className="flex items-center text-sm text-gray-600">
                    <p><strong>De:</strong> {message.sender_name || 'Sistema'}</p>
                    <span className="mx-2">|</span>
                     {/* CORRECCIÓN: Usamos el formateador nativo de JS */}
                    <time>
                        <strong>Fecha:</strong> {new Date(message.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </time>
                </div>
            </div>
            <div className="py-4 flex-grow overflow-y-auto" dangerouslySetInnerHTML={{ __html: message.message }} />
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <div>
                   {message.status === 'unread' && (
                        <button onClick={handleMarkAsRead} className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                            Marcar como leído
                        </button>
                    )}
                </div>
                <button onClick={() => onDelete(message.id)} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">
                    Eliminar
                </button>
            </div>
        </div>
    );
};

// Componente principal del Widget
const MessagesDashboardWidget = () => {
    const {
        messages,
        isLoading,
        error,
        total,
        // fetchMessages, // No se usa directamente, lo elimina el linter si no se llama
        updateMessageStatus,
        deleteMessage,
        sendMessage
    } = useMessages();
    const { users, isLoading: usersLoading } = useUsers();

    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isSendModalOpen, setSendModalOpen] = useState(false);

    const handleSelectMessage = (message) => {
        setSelectedMessage(message);
        if (message.status === 'unread') {
            updateMessageStatus(message.id, 'read');
        }
    };
    
    const handleDeleteMessage = useCallback(async (id) => {
        await deleteMessage(id);
        if(selectedMessage && selectedMessage.id === id) {
            setSelectedMessage(null);
        }
    }, [deleteMessage, selectedMessage]);

    // CORRECCIÓN: Reemplazado LoadingSpinner por un texto simple
    if (isLoading) return <div className="p-4">Cargando mensajes...</div>;
    if (error) return <p className="text-red-500">Error: {error.message}</p>;

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Bandeja de Entrada ({total} mensajes)</h2>
                <button
                    onClick={() => setSendModalOpen(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    Enviar Mensaje
                </button>
            </div>
            <div className="flex" style={{ height: '600px' }}>
                <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                    {/* CORRECCIÓN: Eliminado EmptyState, el manejo que tenías ya era correcto */}
                    {messages.length > 0 ? (
                        messages.map(msg => (
                            <MessageListItem
                                key={msg.id}
                                message={msg}
                                onSelect={handleSelectMessage}
                                isActive={selectedMessage?.id === msg.id}
                            />
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                           No hay mensajes.
                        </div>
                    )}
                </div>
                <div className="w-2/3">
                    <MessageContentView 
                        message={selectedMessage}
                        onUpdateStatus={updateMessageStatus}
                        onDelete={handleDeleteMessage}
                    />
                </div>
            </div>

            {isSendModalOpen && (
                <SendMessageModal
                    isOpen={isSendModalOpen}
                    onClose={() => setSendModalOpen(false)}
                    onSendMessage={sendMessage}
                    users={users}
                    isLoadingUsers={usersLoading}
                />
            )}
        </div>
    );
};

export default MessagesDashboardWidget;