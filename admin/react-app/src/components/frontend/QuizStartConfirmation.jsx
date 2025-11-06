// src/components/frontend/QuizStartConfirmation.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  Target,
  TrendingUp
} from 'lucide-react';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import { useQuizRanking } from '../../hooks/useQuizRanking';
import QuizResultsSummary from './dashboard/QuizResultsSummary';
import QEButton from '../common/QEButton';

const StatItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center text-sm text-gray-600">
    <Icon className="w-4 h-4 mr-2 text-gray-400" />
    <span className="font-semibold mr-1">{label}:</span>
    <span>{value}</span>
  </div>
);

const QuizStartConfirmation = ({ quiz, onStartQuiz }) => {
  const navigate = useNavigate();
  const { formatScore } = useScoreFormat();
  
  // Obtener estadísticas del ranking
  const { ranking, isLoading: rankingLoading } = useQuizRanking(quiz?.id);

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
    passing_score = 0,
    difficulty = null
  } = quiz;

  // Obtener etiqueta y color de dificultad
  const getDifficultyConfig = (diff) => {
    const configs = {
      'easy': { label: 'Fácil', color: 'text-green-600', bg: 'bg-green-50' },
      'medium': { label: 'Medio', color: 'text-yellow-600', bg: 'bg-yellow-50' },
      'hard': { label: 'Difícil', color: 'text-red-600', bg: 'bg-red-50' }
    };
    return configs[diff] || { label: 'Medio', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  const difficultyConfig = getDifficultyConfig(difficulty);

  // Estadísticas del quiz - Separadas por sin riesgo y con riesgo
  const statistics = ranking?.statistics || {};
  const currentUser = ranking?.currentUser || null;
  const topUsers = ranking?.top || [];
  const relativeUsers = ranking?.relative || [];
  
  // Buscar la nota del usuario actual en el ranking (primero en top, luego en relative)
  const userInTop = topUsers.find(u => u.user_id === currentUser?.id);
  const userInRelative = relativeUsers.find(u => u.user_id === currentUser?.id);
  const userStats = userInTop || userInRelative;
  const hasUserStats = userStats !== null && userStats !== undefined && statistics.total_users > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <HelpCircle className="mx-auto h-12 w-12 text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {title?.rendered || title || 'Cuestionario'}
        </h2>
        <p className="text-gray-600">
          Estás a punto de comenzar el cuestionario. ¿Estás listo?
        </p>
      </div>

      {/* Barra de información del cuestionario */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left bg-gray-50 p-6 rounded-lg border border-gray-200">
        <StatItem
          icon={HelpCircle}
          label="Preguntas"
          value={question_count}
        />
        <StatItem
          icon={Clock}
          label="Tiempo Límite"
          value={time_limit > 0 ? `${time_limit} min` : 'Sin límite'}
        />
        <StatItem
          icon={CheckCircle}
          label="Puntuación Mínima"
          value={formatScore(passing_score)}
        />
        <div className="flex items-center text-sm text-gray-600">
          <Target className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-semibold mr-1">Dificultad:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${difficultyConfig.bg} ${difficultyConfig.color}`}>
            {difficultyConfig.label}
          </span>
        </div>
      </div>

      {/* Estadísticas del Quiz - Dos tarjetas: Sin Riesgo y Con Riesgo */}
      {hasUserStats && !rankingLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta SIN RIESGO */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Sin Riesgo
              </h3>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Media UA */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Media UA:</span>
                <span className="text-lg font-bold text-gray-800">
                  {formatScore(statistics.avg_score_without_risk || 0)}
                </span>
              </div>
              
              {/* Mi Nota */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mi Nota:</span>
                <span className="text-lg font-bold text-blue-700">
                  {formatScore(userStats?.score || 0)}
                </span>
              </div>
              
              {/* Separador */}
              <div className="border-t border-blue-200 my-2"></div>
              
              {/* Mi Percentil */}
              <div className="flex justify-between items-center bg-white bg-opacity-60 p-2 rounded">
                <span className="text-sm font-semibold text-gray-700">Mi Percentil:</span>
                <span className="text-xl font-extrabold text-blue-600">
                  {(() => {
                    const myScore = userStats?.score || 0;
                    const avgScore = statistics.avg_score_without_risk || 0;
                    const percentile = myScore - avgScore;
                    return `${percentile > 0 ? '+' : ''}${formatScore(percentile)}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta CON RIESGO */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-lg border-2 border-yellow-300 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Con Riesgo
              </h3>
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Media UA */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Media UA:</span>
                <span className="text-lg font-bold text-gray-800">
                  {formatScore(statistics.avg_score_with_risk || 0)}
                </span>
              </div>
              
              {/* Mi Nota */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mi Nota:</span>
                <span className="text-lg font-bold text-amber-700">
                  {formatScore(userStats?.score_with_risk || 0)}
                </span>
              </div>
              
              {/* Separador */}
              <div className="border-t border-yellow-200 my-2"></div>
              
              {/* Mi Percentil */}
              <div className="flex justify-between items-center bg-white bg-opacity-60 p-2 rounded">
                <span className="text-sm font-semibold text-gray-700">Mi Percentil:</span>
                <span className="text-xl font-extrabold text-amber-600">
                  {(() => {
                    const myScore = userStats?.score_with_risk || 0;
                    const avgScore = statistics.avg_score_with_risk || 0;
                    const percentile = myScore - avgScore;
                    return `${percentile > 0 ? '+' : ''}${formatScore(percentile)}`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón de Inicio - ANTES de los intentos */}
      <div className="text-center pt-2">
        <QEButton
          onClick={onStartQuiz}
          variant="primary"
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-white font-bold text-lg rounded-xl shadow-lg transform hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(to right, var(--qe-primary), var(--qe-secondary))' }}
        >
          <PlayCircle className="w-6 h-6 mr-2" />
          Comenzar Cuestionario
        </QEButton>
      </div>

      {/* Tabla de Últimos Intentos */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Mis Últimos Intentos
          </h3>
          <QEButton
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            variant="primary"
            className="text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            Ver todos →
          </QEButton>
        </div>
        
        <QuizResultsSummary 
          quizId={quiz.id} 
          maxResults={5} 
          showCourseColumn={false}
        />
      </div>
    </div>
  );
};

export default QuizStartConfirmation;