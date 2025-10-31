// admin/react-app/src/components/messages/SendMessageModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Send, Users, User, Loader, CheckCircle } from 'lucide-react';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';

const SendMessageModal = ({ isOpen, onClose, onMessageSent }) => {
  // Función para ajustar el brillo del color
  const adjustColorBrightness = (color, percent) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Convertir a HSL
    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return [h * 360, s * 100, l * 100];
    };

    const hslToRgb = (h, s, l) => {
      h /= 360; s /= 100; l /= 100;
      let r, g, b;

      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [h, s, l] = rgbToHsl(r, g, b);
    const newL = Math.max(0, Math.min(100, l + (l * percent)));
    const [newR, newG, newB] = hslToRgb(h, s, newL);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Determinar si un color es claro u oscuro
  const isLightColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  // Calcular color de fondo ajustado basado en el color primario
  const getAdjustedPrimaryColor = () => {
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--qe-primary')
      .trim();
    
    if (primaryColor && primaryColor.startsWith('#')) {
      const isLight = isLightColor(primaryColor);
      // Si es claro, oscurecer 5%, si es oscuro, aclarar 5%
      return adjustColorBrightness(primaryColor, isLight ? -0.05 : 0.05);
    }
    return primaryColor;
  };

  const [recipientType, setRecipientType] = useState('all'); // 'all', 'specific', 'course'
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

  // Fetch users when modal opens
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
      
      // Reset form after 2 seconds and close
      setTimeout(() => {
        resetForm();
        onMessageSent && onMessageSent();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Error al enviar el mensaje');
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

  if (!isOpen) return null;

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
        <div 
          className="rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 qe-border-primary pointer-events-auto"
          style={{ backgroundColor: 'var(--qe-bg-card)' }}
        >
          {/* Header - Compacto */}
          <div 
            className="p-4 border-b qe-border-primary"
            style={{ backgroundColor: getAdjustedPrimaryColor() }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Enviar Mensaje</h2>
                <p className="text-sm text-white opacity-90 mt-1">Comunícate con tus estudiantes</p>
              </div>
            <button
              onClick={onClose}
              className="text-white p-2 rounded-lg transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--qe-bg-card)' }}>
          {success ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold qe-text-primary mb-2">¡Mensaje Enviado!</h3>
              <p className="qe-text-secondary">
                Tu mensaje ha sido enviado correctamente
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium qe-text-primary mb-3">
                  Destinatarios
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipientType('all')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 transition-all ${
                      recipientType === 'all'
                        ? 'qe-border-accent qe-bg-accent-light qe-text-accent'
                        : 'qe-border-primary hover:qe-bg-primary-light'
                    }`}
                    style={{
                      boxShadow: recipientType === 'all' 
                        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium text-sm text-center">Todos los usuarios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('course')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 transition-all ${
                      recipientType === 'course'
                        ? 'qe-border-accent qe-bg-accent-light qe-text-accent'
                        : 'qe-border-primary hover:qe-bg-primary-light'
                    }`}
                    style={{
                      boxShadow: recipientType === 'course' 
                        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium text-sm text-center">Usuarios de un curso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('specific')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 transition-all ${
                      recipientType === 'specific'
                        ? 'qe-border-accent qe-bg-accent-light qe-text-accent'
                        : 'qe-border-primary hover:qe-bg-primary-light'
                    }`}
                    style={{
                      boxShadow: recipientType === 'specific' 
                        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium text-sm text-center">Usuarios específicos</span>
                  </button>
                </div>
              </div>

              {/* Course Selection */}
              {recipientType === 'course' && (
                <div>
                  <label className="block text-sm font-medium qe-text-primary mb-2">
                    Seleccionar curso
                  </label>
                  {loadingCourses ? (
                    <div className="flex items-center justify-center py-4 qe-text-secondary">
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Cargando cursos...
                    </div>
                  ) : (
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2 border qe-border-primary rounded-lg focus:ring-2 focus:qe-ring-accent focus:border-transparent qe-text-primary"
                      style={{ backgroundColor: 'var(--qe-bg-card)' }}
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

              {/* User Selection */}
              {recipientType === 'specific' && (
                <div>
                  <label className="block text-sm font-medium qe-text-primary mb-2">
                    Seleccionar usuarios ({selectedUsers.length} seleccionados)
                  </label>
                  
                  {/* Search */}
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar usuarios..."
                    className="w-full px-3 py-2 border qe-border-primary rounded-lg mb-3 focus:ring-2 focus:qe-ring-accent focus:border-transparent qe-text-primary"
                    style={{ backgroundColor: 'var(--qe-bg-card)' }}
                  />

                  {/* User List */}
                  <div 
                    className="border qe-border-primary rounded-lg max-h-60 overflow-y-auto"
                    style={{ backgroundColor: 'var(--qe-bg-card)' }}
                  >
                    {loadingUsers ? (
                      <div className="p-4 text-center qe-text-secondary">
                        <Loader className="w-5 h-5 animate-spin inline mr-2" />
                        Cargando usuarios...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center qe-text-secondary">
                        No se encontraron usuarios
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <label
                          key={user.id}
                          className="flex items-center p-3 qe-hover-primary cursor-pointer border-b qe-border-primary last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleToggleUser(user.id)}
                            className="w-4 h-4 border-gray-300 rounded focus:qe-ring-accent"
                            style={{ accentColor: 'var(--qe-accent)' }}
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium qe-text-primary">{user.name}</p>
                            <p className="text-xs qe-text-secondary">{user.email}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Message Type */}
              <div>
                <label className="block text-sm font-medium qe-text-primary mb-2">
                  Tipo de mensaje
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="w-full px-3 py-2 border qe-border-primary rounded-lg focus:ring-2 focus:qe-ring-accent focus:border-transparent qe-text-primary"
                  style={{ backgroundColor: 'var(--qe-bg-card)' }}
                >
                  <option value="announcement">Anuncio</option>
                  <option value="notification">Notificación</option>
                  <option value="alert">Alerta</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium qe-text-primary mb-2">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del mensaje..."
                  required
                  maxLength={200}
                  className="w-full px-3 py-2 border qe-border-primary rounded-lg focus:ring-2 focus:qe-ring-accent focus:border-transparent qe-text-primary"
                  style={{ backgroundColor: 'var(--qe-bg-card)' }}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium qe-text-primary mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  required
                  maxLength={5000}
                  rows={6}
                  className="w-full px-3 py-2 border qe-border-primary rounded-lg focus:ring-2 focus:qe-ring-accent focus:border-transparent resize-none qe-text-primary"
                  style={{ backgroundColor: 'var(--qe-bg-card)' }}
                />
                <p className="text-xs qe-text-secondary mt-1">
                  {message.length}/5000 caracteres
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="p-3 border border-red-200 rounded-lg"
                  style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)' }}
                >
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          )}
        </div>

                {/* Footer */}
        {!success && (
          <div 
            className="border-t qe-border-primary p-6 flex justify-end space-x-3"
            style={{ backgroundColor: getAdjustedPrimaryColor() }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 border border-white text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'transparent' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="px-6 py-2 qe-bg-accent text-white rounded-lg qe-hover-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
        )}
      </div>
    </div>
    </>
  );
};

export default SendMessageModal;