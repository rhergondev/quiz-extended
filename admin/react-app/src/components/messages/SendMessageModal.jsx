// admin/react-app/src/components/messages/SendMessageModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  X, Send, Users, User, Loader, CheckCircle, 
  BookOpen, Search, AlertCircle, Megaphone, Bell, AlertTriangle
} from 'lucide-react';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';

const SendMessageModal = ({ isOpen, onClose, onMessageSent }) => {
  const [recipientType, setRecipientType] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('announcement');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (isOpen && recipientType === 'specific') {
      fetchUsers();
    }
    if (isOpen && recipientType === 'course') {
      fetchCourses();
    }
  }, [isOpen, recipientType]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const config = getApiConfig();
      const url = `${config.endpoints.users}?per_page=100`;
      const response = await makeApiRequest(url);
      setUsers(response.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const config = getApiConfig();
      const url = `${config.endpoints.courses}?per_page=100`;
      const response = await makeApiRequest(url);
      setCourses(response.data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Error al cargar cursos');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setError('Asunto y mensaje son obligatorios');
      return;
    }

    if (recipientType === 'specific' && selectedUsers.length === 0) {
      setError('Selecciona al menos un usuario');
      return;
    }

    if (recipientType === 'course' && !selectedCourse) {
      setError('Selecciona un curso');
      return;
    }

    setSending(true);
    setError('');

    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/send`;

      let recipient_ids;
      if (recipientType === 'all') {
        recipient_ids = ['all'];
      } else if (recipientType === 'course') {
        recipient_ids = [`course:${selectedCourse}`];
      } else {
        recipient_ids = selectedUsers;
      }

      await makeApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          recipient_ids,
          subject,
          message,
          type: messageType
        })
      });

      setSuccess(true);
      
      setTimeout(() => {
        resetForm();
        onMessageSent && onMessageSent();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Error sending message:', err);
      
      // Parse API error response for user-friendly message
      let errorMessage = 'Error al enviar el mensaje. Por favor, inténtalo de nuevo.';
      
      if (err.message) {
        // The API now returns friendly messages, use them directly
        errorMessage = err.message;
      } else if (err.data?.message) {
        errorMessage = err.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setRecipientType('all');
    setSelectedUsers([]);
    setSelectedCourse('');
    setSubject('');
    setMessage('');
    setMessageType('announcement');
    setSuccess(false);
    setError('');
    setSearchTerm('');
  };

  const handleToggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Configuración de tipos de mensaje
  const messageTypes = [
    { value: 'announcement', label: 'Anuncio', icon: Megaphone, color: 'blue' },
    { value: 'notification', label: 'Notificación', icon: Bell, color: 'amber' },
    { value: 'alert', label: 'Alerta', icon: AlertTriangle, color: 'red' }
  ];

  // Configuración de destinatarios
  const recipientOptions = [
    { value: 'all', label: 'Todos', sublabel: 'usuarios', icon: Users },
    { value: 'course', label: 'Por curso', sublabel: 'específico', icon: BookOpen },
    { value: 'specific', label: 'Usuarios', sublabel: 'específicos', icon: User }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--qe-background)',
            border: '1px solid var(--qe-border)'
          }}
        >
          {/* Header */}
          <div 
            className="px-6 py-5 flex items-center justify-between"
            style={{ 
              background: 'linear-gradient(135deg, var(--qe-primary) 0%, var(--qe-secondary) 100%)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Nuevo Mensaje</h2>
                <p className="text-sm text-white/80">Comunícate con tus estudiantes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {success ? (
              <div className="text-center py-12">
                <div 
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                >
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--qe-text-primary)' }}>
                  ¡Mensaje Enviado!
                </h3>
                <p style={{ color: 'var(--qe-text-secondary)' }}>
                  Tu mensaje ha sido enviado correctamente
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Destinatarios */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-3"
                    style={{ color: 'var(--qe-text-primary)' }}
                  >
                    Destinatarios
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {recipientOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = recipientType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRecipientType(option.value)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          style={isSelected ? { borderColor: 'var(--qe-primary)' } : {}}
                        >
                          <div 
                            className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                            style={isSelected ? { backgroundColor: 'var(--qe-primary)' } : {}}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-center">
                            <span 
                              className={`block text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}
                              style={isSelected ? { color: 'var(--qe-primary)' } : {}}
                            >
                              {option.label}
                            </span>
                            <span className="text-xs text-gray-400">{option.sublabel}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selección de Curso */}
                {recipientType === 'course' && (
                  <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: 'var(--qe-surface)' }}
                  >
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--qe-text-primary)' }}
                    >
                      Seleccionar curso
                    </label>
                    {loadingCourses ? (
                      <div className="flex items-center justify-center py-4 gap-2" style={{ color: 'var(--qe-text-secondary)' }}>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Cargando cursos...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                        style={{ 
                          backgroundColor: 'var(--qe-background)',
                          borderColor: 'var(--qe-border)',
                          color: 'var(--qe-text-primary)'
                        }}
                      >
                        <option value="">Selecciona un curso...</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title?.rendered || course.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Selección de Usuarios */}
                {recipientType === 'specific' && (
                  <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: 'var(--qe-surface)' }}
                  >
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--qe-text-primary)' }}
                    >
                      Seleccionar usuarios
                      {selectedUsers.length > 0 && (
                        <span 
                          className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: 'var(--qe-primary)' }}
                        >
                          {selectedUsers.length} seleccionados
                        </span>
                      )}
                    </label>
                    
                    {/* Buscador */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar usuarios..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                        style={{ 
                          backgroundColor: 'var(--qe-background)',
                          borderColor: 'var(--qe-border)',
                          color: 'var(--qe-text-primary)'
                        }}
                      />
                    </div>

                    {/* Lista de usuarios */}
                    <div 
                      className="rounded-lg border max-h-48 overflow-y-auto"
                      style={{ borderColor: 'var(--qe-border)' }}
                    >
                      {loadingUsers ? (
                        <div className="p-4 text-center" style={{ color: 'var(--qe-text-secondary)' }}>
                          <Loader className="w-5 h-5 animate-spin inline mr-2" />
                          Cargando usuarios...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center" style={{ color: 'var(--qe-text-secondary)' }}>
                          No se encontraron usuarios
                        </div>
                      ) : (
                        filteredUsers.map((user, idx) => {
                          const isChecked = selectedUsers.includes(user.id);
                          return (
                            <label
                              key={user.id}
                              className={`flex items-center p-3 cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                              style={{ 
                                borderBottom: idx < filteredUsers.length - 1 ? '1px solid var(--qe-border)' : 'none',
                                backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.05)' : undefined
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleUser(user.id)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="ml-3 flex-1 min-w-0">
                                <p 
                                  className="text-sm font-medium truncate"
                                  style={{ color: 'var(--qe-text-primary)' }}
                                >
                                  {user.name}
                                </p>
                                <p className="text-xs truncate" style={{ color: 'var(--qe-text-secondary)' }}>
                                  {user.email}
                                </p>
                              </div>
                              {isChecked && (
                                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Tipo de mensaje */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-3"
                    style={{ color: 'var(--qe-text-primary)' }}
                  >
                    Tipo de mensaje
                  </label>
                  <div className="flex gap-2">
                    {messageTypes.map(type => {
                      const Icon = type.icon;
                      const isSelected = messageType === type.value;
                      const colors = {
                        blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-500', icon: 'bg-blue-500' },
                        amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-500', icon: 'bg-amber-500' },
                        red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500', icon: 'bg-red-500' }
                      };
                      const c = colors[type.color];
                      
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setMessageType(type.value)}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                            isSelected 
                              ? `${c.bg} ${c.border} ${c.text}` 
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Asunto */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-2"
                    style={{ color: 'var(--qe-text-primary)' }}
                  >
                    Asunto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Escribe el asunto del mensaje..."
                    required
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: 'var(--qe-background)',
                      borderColor: 'var(--qe-border)',
                      color: 'var(--qe-text-primary)'
                    }}
                  />
                </div>

                {/* Mensaje */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-2"
                    style={{ color: 'var(--qe-text-primary)' }}
                  >
                    Mensaje <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    required
                    maxLength={5000}
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{ 
                      backgroundColor: 'var(--qe-background)',
                      borderColor: 'var(--qe-border)',
                      color: 'var(--qe-text-primary)'
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: 'var(--qe-text-secondary)' }}>
                      Soporta texto plano
                    </span>
                    <span 
                      className={`text-xs ${message.length > 4500 ? 'text-amber-500' : ''}`}
                      style={{ color: message.length > 4500 ? undefined : 'var(--qe-text-secondary)' }}
                    >
                      {message.length}/5000
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div 
              className="px-6 py-4 flex items-center justify-between border-t"
              style={{ 
                backgroundColor: 'var(--qe-surface)',
                borderColor: 'var(--qe-border)'
              }}
            >
              <div className="text-xs" style={{ color: 'var(--qe-text-secondary)' }}>
                {recipientType === 'all' && 'Se enviará a todos los usuarios'}
                {recipientType === 'course' && selectedCourse && `Se enviará a los usuarios del curso`}
                {recipientType === 'specific' && selectedUsers.length > 0 && `Se enviará a ${selectedUsers.length} usuario(s)`}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{ 
                    borderColor: 'var(--qe-border)',
                    color: 'var(--qe-text-primary)'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                  style={{ 
                    backgroundColor: 'var(--qe-primary)',
                    boxShadow: sending ? 'none' : '0 4px 14px 0 rgba(59, 130, 246, 0.4)'
                  }}
                >
                  {sending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensaje</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SendMessageModal;