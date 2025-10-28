import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, X, ArrowRight } from 'lucide-react';
import quizAutosaveService from '../../../api/services/quizAutosaveService';

/**
 * Widget that shows an alert banner if there's a pending quiz with autosaved progress
 * Displays on Dashboard to prompt user to continue their incomplete quiz
 */
const PendingQuizAlert = () => {
  const [pendingQuiz, setPendingQuiz] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkForPendingQuiz = async () => {
      try {
        const autosave = await quizAutosaveService.getLatestAutosave();
        
        if (autosave) {
          setPendingQuiz(autosave);
        }
      } catch (error) {
        console.error('Error checking for pending quiz:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkForPendingQuiz();
  }, []);

  const handleContinueQuiz = () => {
    if (pendingQuiz && pendingQuiz.quiz_id) {
      navigate(`/quiz/${pendingQuiz.quiz_id}`);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Format time ago
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

  // Calculate progress
  const getProgress = () => {
    if (!pendingQuiz) return { answered: 0, total: 0, percent: 0 };
    
    const answers = typeof pendingQuiz.answers === 'string'
      ? JSON.parse(pendingQuiz.answers)
      : pendingQuiz.answers;
    
    const quizData = typeof pendingQuiz.quiz_data === 'string'
      ? JSON.parse(pendingQuiz.quiz_data)
      : pendingQuiz.quiz_data;
    
    const answered = Object.keys(answers || {}).length;
    const total = quizData?.meta?._quiz_question_ids?.length || 0;
    const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
    
    return { answered, total, percent };
  };

  // Don't render if loading, no pending quiz, or dismissed
  if (isLoading || !pendingQuiz || !isVisible) {
    return null;
  }

  const { answered, total, percent } = getProgress();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg shadow-md overflow-hidden">
      <div className="p-5">
        <div className="flex items-start">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Content */}
          <div className="ml-4 flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Tienes un cuestionario sin terminar
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  Continúa donde lo dejaste y completa tu evaluación
                </p>
              </div>
              
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar notificación"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quiz details */}
            <div className="mt-3 bg-white rounded-lg p-3 space-y-2 border border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Cuestionario:</span>
                <span className="text-gray-900 font-semibold">
                  {pendingQuiz.quiz_title || 'Sin título'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Progreso:</span>
                <span className="text-gray-900">
                  {answered} de {total} preguntas ({percent}%)
                </span>
              </div>

              {pendingQuiz.time_remaining && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Tiempo restante:
                  </span>
                  <span className="text-gray-900">
                    {Math.floor(pendingQuiz.time_remaining / 60)}:{(pendingQuiz.time_remaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                Última actualización: {getTimeAgo(pendingQuiz.updated_at)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              ></div>
            </div>

            {/* Action button */}
            <button
              onClick={handleContinueQuiz}
              className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              Continuar cuestionario
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingQuizAlert;
