import React, { useState } from 'react';
import { X, Send, Loader, MessageSquareWarning, CheckCircle } from 'lucide-react';
import { messageService } from '../../api/services/messageService';

const QuestionFeedbackModal = ({ question, initialFeedbackType = 'feedback', onClose }) => {
  const [feedbackType, setFeedbackType] = useState(initialFeedbackType);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('El mensaje no puede estar vacío.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await messageService.submitFeedback({
        question_id: question.id,
        feedback_type: feedbackType,
        message: message,
      });
      setSuccess(true);
      setMessage('');
      // Opcional: cerrar el modal automáticamente tras un tiempo
      setTimeout(() => {
          onClose();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Error al enviar el mensaje.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md animate-fade-in-up">
        {success ? (
          <div className="text-center p-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="text-lg font-bold text-gray-800 mt-4 mb-2">¡Mensaje Enviado!</h3>
            <p className="text-gray-600 mb-4">Gracias por tu colaboración. Hemos recibido tu mensaje.</p>
            <button 
                onClick={onClose} 
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
                Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <MessageSquareWarning className="mr-2 text-indigo-500"/>
                {feedbackType === 'challenge' ? 'Impugnar Pregunta' : 'Comentario o Sugerencia'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Pregunta: <span className="font-semibold" dangerouslySetInnerHTML={{ __html: question.title.rendered }} />
            </p>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="feedbackType" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Mensaje
                </label>
                <select
                  id="feedbackType"
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="feedback">💬 Comentario o Sugerencia</option>
                  <option value="challenge">⚠️ Impugnación</option>
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Tu mensaje
                </label>
                <textarea
                  id="message"
                  rows="5"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={feedbackType === 'challenge' ? 'Explica por qué crees que la pregunta o sus respuestas son incorrectas...' : 'Escribe aquí tu duda, sugerencia o corrección...'}
                ></textarea>
              </div>
              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader className="animate-spin mr-2" size={20} /> : <Send className="mr-2" size={20} />}
                  Enviar Mensaje
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionFeedbackModal;