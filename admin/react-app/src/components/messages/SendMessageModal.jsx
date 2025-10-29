// admin/react-app/src/components/messages/SendMessageModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Send, Users, User, Loader, CheckCircle } from 'lucide-react';
import { makeApiRequest } from '../../api/services/baseService';
import { getApiConfig } from '../../api/config/apiConfig';

const SendMessageModal = ({ isOpen, onClose, onMessageSent }) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Enviar Mensaje</h2>
              <p className="text-blue-100 mt-1">Comunícate con tus estudiantes</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Mensaje Enviado!</h3>
              <p className="text-gray-600">
                Tu mensaje ha sido enviado correctamente
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Destinatarios
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipientType('all')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors ${
                      recipientType === 'all'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium text-sm text-center">Todos los usuarios</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('course')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors ${
                      recipientType === 'course'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium text-sm text-center">Usuarios de un curso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('specific')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors ${
                      recipientType === 'specific'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium text-sm text-center">Usuarios específicos</span>
                  </button>
                </div>
              </div>

              {/* Course Selection */}
              {recipientType === 'course' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar curso
                  </label>
                  {loadingCourses ? (
                    <div className="flex items-center justify-center py-4 text-gray-500">
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Cargando cursos...
                    </div>
                  ) : (
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar usuarios ({selectedUsers.length} seleccionados)
                  </label>
                  
                  {/* Search */}
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar usuarios..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {/* User List */}
                  <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="p-4 text-center text-gray-500">
                        <Loader className="w-5 h-5 animate-spin inline mr-2" />
                        Cargando usuarios...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No se encontraron usuarios
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <label
                          key={user.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleToggleUser(user.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Message Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de mensaje
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="announcement">Anuncio</option>
                  <option value="notification">Notificación</option>
                  <option value="alert">Alerta</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del mensaje..."
                  required
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  required
                  maxLength={5000}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/5000 caracteres
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
  );
};

export default SendMessageModal;