import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

/**
 * Modal to prompt user to resume or restart a quiz with saved progress
 * 
 * @param {Object} props
 * @param {Object} props.autosaveData - Autosave data from backend
 * @param {Function} props.onResume - Callback when user clicks resume
 * @param {Function} props.onRestart - Callback when user clicks restart
 * @param {Function} props.onClose - Callback to close modal (optional)
 * @param {boolean} props.isOpen - Modal visibility state
 */
const QuizRecoveryModal = ({ autosaveData, onResume, onRestart, onClose, isOpen = true }) => {
  if (!isOpen || !autosaveData) {
    return null;
  }

  const {
    quiz_title,
    current_question_index,
    answers,
    time_remaining,
    updated_at,
  } = autosaveData;

  // Calculate progress
  const totalQuestions = autosaveData.quiz_data?.questions?.length || 0;
  const answeredQuestions = Object.keys(answers || {}).length;
  const progressPercent = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100) 
    : 0;

  // Format last saved time
  const getTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffMins > 0) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    return 'hace unos segundos';
  };

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Cuestionario en progreso
                </h3>
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-500">
                    Se encontró un cuestionario sin terminar. ¿Deseas continuar donde lo dejaste?
                  </p>

                  {/* Quiz info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Cuestionario:</span>
                      <span className="text-sm text-gray-900">{quiz_title || 'Sin título'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Progreso:</span>
                      <span className="text-sm text-gray-900">
                        {answeredQuestions} de {totalQuestions} preguntas ({progressPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Pregunta actual:</span>
                      <span className="text-sm text-gray-900">
                        {(current_question_index || 0) + 1} de {totalQuestions}
                      </span>
                    </div>

                    {time_remaining && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Tiempo restante:
                        </span>
                        <span className="text-sm text-gray-900">
                          {formatTimeRemaining(time_remaining)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                      <span>Última actualización:</span>
                      <span>{getTimeAgo(updated_at)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={onResume}
              className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Continuar donde lo dejé
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
            >
              Empezar de nuevo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizRecoveryModal;
