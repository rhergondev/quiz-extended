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

  // Función para ajustar el brillo del color
  const adjustColorBrightness = (color, percent) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

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

  const isLightColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  const getAdjustedPrimaryColor = () => {
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--qe-primary')
      .trim();
    if (primaryColor && primaryColor.startsWith('#')) {
      const isLight = isLightColor(primaryColor);
      return adjustColorBrightness(primaryColor, isLight ? -0.05 : 0.05);
    }
    return primaryColor;
  };

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
        <div 
          className="rounded-lg shadow-xl w-full max-w-md animate-fade-in-up border-2 qe-border-primary overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
          style={{ backgroundColor: 'var(--qe-bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
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
            <div 
              className="p-4 border-b qe-border-primary"
              style={{ backgroundColor: getAdjustedPrimaryColor() }}
            >
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
            <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#FFFFFF' }}>
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
                    className="w-full px-3 py-2 border qe-border-primary rounded-md qe-text-primary focus:outline-none focus:ring-2 focus:qe-ring-accent focus:border-transparent"
                    style={{ backgroundColor: 'var(--qe-bg-card)' }}
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
                    className="w-full px-3 py-2 border qe-border-primary rounded-md qe-text-primary focus:outline-none focus:ring-2 focus:qe-ring-accent focus:border-transparent"
                    style={{ backgroundColor: 'var(--qe-bg-card)' }}
                    placeholder={feedbackType === 'challenge' ? 'Explica por qué crees que la pregunta o sus respuestas son incorrectas...' : 'Escribe aquí tu duda, sugerencia o corrección...'}
                  ></textarea>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </form>
            </div>

            {/* Footer */}
            <div 
              className="p-4 border-t qe-border-primary flex justify-end"
              style={{ backgroundColor: getAdjustedPrimaryColor() }}
            >
              <QEButton
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                variant="ghost"
                className="px-6 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-white hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                {loading ? <Loader className="animate-spin mr-2 text-white" size={20} /> : <Send className="mr-2 text-white" size={20} />}
                <span className="text-white">Enviar Mensaje</span>
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