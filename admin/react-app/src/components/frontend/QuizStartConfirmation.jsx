// src/components/frontend/QuizStartConfirmation.jsx
import React from 'react';
import { PlayCircle, HelpCircle, Clock, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { useQuizRanking } from '../../hooks/useQuizRanking';

const StatItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center text-sm text-gray-600">
    <Icon className="w-4 h-4 mr-2 text-gray-400" />
    <span className="font-semibold mr-1">{label}:</span>
    <span>{value}</span>
  </div>
);

const QuizStartConfirmation = ({ quiz, onStartQuiz }) => {
  const { ranking, loading: rankingLoading } = useQuizRanking(quiz?.id);
  if (!quiz) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No se pudo cargar la información del cuestionario.</p>
      </div>
    );
  }

  const {
    title,
    question_count = 0,
    time_limit = 0,
    passing_score = 0
  } = quiz;

  const statistics = ranking?.statistics;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-lg max-w-2xl mx-auto">
      <HelpCircle className="mx-auto h-12 w-12 text-indigo-500 mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {title?.rendered || 'Cuestionario'}
      </h2>
      <p className="text-gray-600 mb-6">
        Estás a punto de comenzar el cuestionario. ¿Estás listo?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-left bg-gray-50 p-4 rounded-md border">
        <StatItem
          icon={HelpCircle}
          label="Preguntas"
          value={question_count}
        />
        <StatItem
          icon={Clock}
          label="Tiempo Límite"
          value={time_limit > 0 ? `${time_limit} minutos` : 'Sin límite'}
        />
        <StatItem
          icon={CheckCircle}
          label="Puntuación para Aprobar"
          value={`${passing_score}%`}
        />
      </div>

      {/* Statistics Section - Average Scores */}
      {statistics && statistics.total_users > 0 && !rankingLoading && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
          <div className="flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-700">
              Estadísticas de Otros Usuarios
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-gray-500 text-center text-xs mb-1">Media sin riesgo</div>
              <div className="text-indigo-600 font-bold text-center text-xl">
                {Math.round(statistics.avg_score_without_risk)}%
              </div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-gray-500 text-center text-xs mb-1">Media con riesgo</div>
              <div className="text-red-600 font-bold text-center text-xl">
                {Math.round(statistics.avg_score_with_risk)}%
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center text-xs text-gray-500">
            <Users className="w-3 h-3 mr-1" />
            <span>Basado en {statistics.total_users} usuario{statistics.total_users !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <button
        onClick={onStartQuiz}
        className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
      >
        <PlayCircle className="w-5 h-5 mr-2" />
        Comenzar Cuestionario
      </button>
    </div>
  );
};

export default QuizStartConfirmation;