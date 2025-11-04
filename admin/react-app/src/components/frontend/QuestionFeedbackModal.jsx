import React, { useState } from 'react';
import { X, Send, Loader, MessageSquareWarning, CheckCircle } from 'lucide-react';
import { messageService } from '../../api/services/messageService';
import QEButton from '../common/QEButton';

const QuestionFeedbackModal = ({ question, initialFeedbackType = 'feedback', onClose }) => {
  const [feedbackType, setFeedbackType] = useState(initialFeedbackType);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Manejar tanto title.rendered como title directo
  const questionTitle = typeof question.title === 'object' && question.title?.rendered 
    ? question.title.rendered 
    : question.title;

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
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 z-50" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex justify-center items-center p-4 pointer-events-none">
        <div className="qe-bg-background rounded-lg shadow-xl w-full max-w-md animate-fade-in-up border-2 qe-border-primary overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto">
        {success ? (
          <div className="text-center p-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="text-lg font-bold qe-text-primary mt-4 mb-2">¡Mensaje Enviado!</h3>
            <p className="qe-text-secondary mb-4">Gracias por tu colaboración. Hemos recibido tu mensaje.</p>
            <QEButton 
                onClick={onClose} 
                variant="primary"
                className="w-full px-4 py-2 rounded-md"
            >
                Cerrar
            </QEButton>
          </div>
        ) : (
          <>
            {/* Header - Compacto */}
            <div className="qe-bg-gradient-primary p-4 border-b qe-border-primary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquareWarning className="w-6 h-6 text-white" />
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {feedbackType === 'challenge' ? 'Impugnar Pregunta' : 'Comentario o Sugerencia'}
                    </h2>
                  </div>
                </div>
                <QEButton 
                  onClick={onClose} 
                  variant="ghost"
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X size={20} className="text-white" />
                </QEButton>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm qe-text-secondary mb-4">
                Pregunta: <span className="font-semibold" dangerouslySetInnerHTML={{ __html: questionTitle || '' }} />
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="feedbackType" className="block text-sm font-medium qe-text-primary mb-1">
                    Tipo de Mensaje
                  </label>
                  <select
                    id="feedbackType"
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    className="w-full px-3 py-2 border qe-border-primary rounded-md qe-bg-background qe-text-primary focus:outline-none focus:ring-2 focus:qe-ring-accent focus:border-transparent"
                  >
                    <option value="feedback">💬 Comentario o Sugerencia</option>
                    <option value="challenge">⚠️ Impugnación</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium qe-text-primary mb-1">
                    Tu mensaje
                  </label>
                  <textarea
                    id="message"
                    rows="5"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border qe-border-primary rounded-md qe-bg-background qe-text-primary focus:outline-none focus:ring-2 focus:qe-ring-accent focus:border-transparent"
                    placeholder={feedbackType === 'challenge' ? 'Explica por qué crees que la pregunta o sus respuestas son incorrectas...' : 'Escribe aquí tu duda, sugerencia o corrección...'}
                  ></textarea>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t qe-border-primary qe-bg-primary-light flex justify-end">
              <QEButton
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                variant="primary"
                className="px-6 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader className="animate-spin mr-2" size={20} /> : <Send className="mr-2" size={20} />}
                Enviar Mensaje
              </QEButton>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default QuestionFeedbackModal;