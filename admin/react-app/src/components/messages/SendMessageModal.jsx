// admin/react-app/src/components/messages/SendMessageModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  X, Send, Users, User, Loader, CheckCircle, 
  BookOpen, Search, AlertCircle, Megaphone, Bell, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';

const SendMessageModal = ({ isOpen, onClose, onMessageSent, simplifiedMode = false, courseId = null }) => {
  const { getColor, isDarkMode } = useTheme();

  // Theme-aware colors
  const colors = {
    primary: getColor('primary', '#1e3a5f'),
    accent: getColor('accent', '#f59e0b'),
    textPrimary: isDarkMode ? getColor('textPrimary', '#f9fafb') : '#1f2937',
    textSecondary: isDarkMode ? getColor('textSecondary', '#9ca3af') : '#6b7280',
    textMuted: isDarkMode ? '#6b7280' : '#9ca3af',
    background: isDarkMode ? getColor('background', '#111827') : '#ffffff',
    backgroundSecondary: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#f9fafb',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
  };
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
    if (isOpen && !simplifiedMode && recipientType === 'specific') {
      fetchUsers();
    }
    if (isOpen && !simplifiedMode && recipientType === 'course') {
      fetchCourses();
    }
  }, [isOpen, recipientType, simplifiedMode]);

  // Efecto para configurar valores por defecto en modo simplificado
  useEffect(() => {
    if (isOpen && simplifiedMode) {
      setMessageType('announcement'); // Siempre será anuncio en modo simplificado
      setRecipientType('course'); // Configurar como tipo curso
    }
  }, [isOpen, simplifiedMode]);

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

    // En modo simplificado, no validamos destinatarios (se envía automáticamente al curso)
    if (!simplifiedMode) {
      if (recipientType === 'specific' && selectedUsers.length === 0) {
        setError('Selecciona al menos un usuario');
        return;
      }

      if (recipientType === 'course' && !selectedCourse) {
        setError('Selecciona un curso');
        return;
      }
    } else {
      // En modo simplificado, verificar que tenemos courseId
      if (!courseId) {
        setError('No se detectó el ID del curso');
        return;
      }
    }

    setSending(true);
    setError('');

    try {
      const config = getApiConfig();
      const url = `${config.endpoints.custom_api}/messages/send`;

      let recipient_ids;
      if (simplifiedMode && courseId) {
        // Modo simplificado: enviar automáticamente a todos los miembros del curso
        recipient_ids = [`course:${courseId}`];
        console.log('📤 Modo simplificado - Enviando a curso:', courseId, 'recipient_ids:', recipient_ids);
      } else if (recipientType === 'all') {
        recipient_ids = ['all'];
      } else if (recipientType === 'course') {
        recipient_ids = [`course:${selectedCourse}`];
      } else {
        recipient_ids = selectedUsers;
      }

      const payload = {
        recipient_ids,
        subject,
        message,
        type: messageType
      };
      
      console.log('📤 Enviando mensaje:', payload);

      await makeApiRequest(url, {
        method: 'POST',
        body: JSON.stringify(payload)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none overflow-y-auto">
        <div 
          className="pointer-events-auto w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden my-auto"
          style={{ 
            backgroundColor: colors.background,
            border: `2px solid ${isDarkMode ? colors.accent : colors.primary}`
          }}
        >
          {/* Header */}
          <div 
            className="px-4 py-3 sm:px-6 sm:py-5 flex items-center justify-between flex-shrink-0"
            style={{ 
              backgroundColor: isDarkMode ? colors.backgroundSecondary : colors.primary
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/20">
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-white">{simplifiedMode ? 'Mensaje al Curso' : 'Nuevo Mensaje'}</h2>
                <p className="text-xs sm:text-sm text-white/80 hidden sm:block">{simplifiedMode ? 'Envía un mensaje a todos los miembros del curso' : 'Comunícate con tus estudiantes'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ backgroundColor: colors.background }}>
            {success ? (
              <div className="text-center py-8 sm:py-12">
                <div 
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                >
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: colors.textPrimary }}>
                  ¡Mensaje Enviado!
                </h3>
                <p style={{ color: colors.textSecondary }}>
                  Tu mensaje ha sido enviado correctamente
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Destinatarios - solo mostrar si NO es modo simplificado */}
                {!simplifiedMode && (
                <div>
                  <label 
                    className="block text-sm font-semibold mb-2 sm:mb-3"
                    style={{ color: colors.textPrimary }}
                  >
                    Destinatarios
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {recipientOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = recipientType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRecipientType(option.value)}
                          className="p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 sm:gap-2"
                          style={{ 
                            borderColor: isSelected ? colors.accent : colors.border,
                            backgroundColor: isSelected ? (isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7') : colors.background
                          }}
                        >
                          <div 
                            className="p-1.5 sm:p-2 rounded-md sm:rounded-lg"
                            style={{ 
                              backgroundColor: isSelected ? colors.accent : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6'),
                              color: isSelected ? '#ffffff' : colors.textSecondary
                            }}
                          >
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="text-center">
                            <span 
                              className="block text-xs sm:text-sm font-medium"
                              style={{ color: isSelected ? colors.accent : colors.textPrimary }}
                            >
                              {option.label}
                            </span>
                            <span className="text-[10px] sm:text-xs hidden sm:block" style={{ color: colors.textMuted }}>{option.sublabel}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* Selección de Curso */}
                {!simplifiedMode && recipientType === 'course' && (
                  <div 
                    className="p-3 sm:p-4 rounded-lg sm:rounded-xl"
                    style={{ backgroundColor: colors.backgroundSecondary }}
                  >
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: colors.textPrimary }}
                    >
                      Seleccionar curso
                    </label>
                    {loadingCourses ? (
                      <div className="flex items-center justify-center py-3 sm:py-4 gap-2" style={{ color: colors.textSecondary }}>
                        <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span className="text-sm">Cargando cursos...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-sm focus:outline-none focus:ring-2"
                        style={{ 
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.border}`,
                          color: colors.textPrimary
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
                {!simplifiedMode && recipientType === 'specific' && (
                  <div 
                    className="p-3 sm:p-4 rounded-lg sm:rounded-xl"
                    style={{ backgroundColor: colors.backgroundSecondary }}
                  >
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: colors.textPrimary }}
                    >
                      Seleccionar usuarios
                      {selectedUsers.length > 0 && (
                        <span 
                          className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: colors.accent }}
                        >
                          {selectedUsers.length}
                        </span>
                      )}
                    </label>
                    
                    {/* Buscador */}
                    <div className="relative mb-2 sm:mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar usuarios..."
                        className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                        style={{ 
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.border}`,
                          color: colors.textPrimary
                        }}
                      />
                    </div>

                    {/* Lista de usuarios */}
                    <div 
                      className="rounded-lg max-h-36 sm:max-h-48 overflow-y-auto"
                      style={{ border: `1px solid ${colors.border}` }}
                    >
                      {loadingUsers ? (
                        <div className="p-4 text-center" style={{ color: colors.textSecondary }}>
                          <Loader className="w-5 h-5 animate-spin inline mr-2" />
                          Cargando usuarios...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center" style={{ color: colors.textSecondary }}>
                          No se encontraron usuarios
                        </div>
                      ) : (
                        filteredUsers.map((user, idx) => {
                          const isChecked = selectedUsers.includes(user.id);
                          return (
                            <label
                              key={user.id}
                              className="flex items-center p-2.5 sm:p-3 cursor-pointer transition-colors"
                              style={{ 
                                borderBottom: idx < filteredUsers.length - 1 ? `1px solid ${colors.border}` : 'none',
                                backgroundColor: isChecked ? (isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#fef3c7') : 'transparent'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleUser(user.id)}
                                className="w-4 h-4 rounded flex-shrink-0"
                                style={{ accentColor: colors.accent }}
                              />
                              <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                                <p 
                                  className="text-sm font-medium truncate"
                                  style={{ color: colors.textPrimary }}
                                >
                                  {user.name}
                                </p>
                                <p className="text-xs truncate hidden sm:block" style={{ color: colors.textSecondary }}>
                                  {user.email}
                                </p>
                              </div>
                              {isChecked && (
                                <CheckCircle className="w-4 h-4 flex-shrink-0 hidden sm:block" style={{ color: colors.accent }} />
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Tipo de mensaje - solo mostrar si NO es modo simplificado */}
                {!simplifiedMode && (
                <div>
                  <label 
                    className="block text-sm font-semibold mb-2 sm:mb-3"
                    style={{ color: colors.textPrimary }}
                  >
                    Tipo de mensaje
                  </label>
                  <div className="flex gap-1.5 sm:gap-2">
                    {messageTypes.map(type => {
                      const Icon = type.icon;
                      const isSelected = messageType === type.value;
                      const typeColors = {
                        blue: { bg: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe', text: '#3b82f6', border: '#3b82f6' },
                        amber: { bg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', text: '#f59e0b', border: '#f59e0b' },
                        red: { bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', text: '#ef4444', border: '#ef4444' }
                      };
                      const c = typeColors[type.color];
                      
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setMessageType(type.value)}
                          className="flex-1 px-2 py-2 sm:px-4 sm:py-3 rounded-lg border-2 flex items-center justify-center gap-1 sm:gap-2 transition-all"
                          style={{
                            borderColor: isSelected ? c.border : colors.border,
                            backgroundColor: isSelected ? c.bg : 'transparent',
                            color: isSelected ? c.text : colors.textSecondary
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs sm:text-sm font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* Asunto */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-1.5 sm:mb-2"
                    style={{ color: colors.textPrimary }}
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
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-sm focus:outline-none focus:ring-2"
                    style={{ 
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>

                {/* Mensaje */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-1.5 sm:mb-2"
                    style={{ color: colors.textPrimary }}
                  >
                    Mensaje <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    required
                    maxLength={5000}
                    rows={4}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{ 
                      backgroundColor: colors.background,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      Soporta texto plano
                    </span>
                    <span 
                      className="text-xs"
                      style={{ color: message.length > 4500 ? '#f59e0b' : colors.textSecondary }}
                    >
                      {message.length}/5000
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div 
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ 
                      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                      border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`
                    }}
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div 
              className="px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 border-t flex-shrink-0"
              style={{ 
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border
              }}
            >
              <div className="text-xs hidden sm:block" style={{ color: colors.textSecondary }}>
                {simplifiedMode ? 'Se enviará a todos los miembros del curso' : (
                  <>
                    {recipientType === 'all' && 'Se enviará a todos los usuarios'}
                    {recipientType === 'course' && selectedCourse && `Se enviará a los usuarios del curso`}
                    {recipientType === 'specific' && selectedUsers.length > 0 && `Se enviará a ${selectedUsers.length} usuario(s)`}
                  </>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ 
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    backgroundColor: 'transparent'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: colors.accent
                  }}
                >
                  {sending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Enviando...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar</span>
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