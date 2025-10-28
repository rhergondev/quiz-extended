// src/components/frontend/QuizStartConfirmation.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Users,
  Award,
  Target,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useQuizRanking } from '../../hooks/useQuizRanking';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
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
  const { ranking, loading, error } = useQuizRanking(quiz?.id);
  const { formatScore } = useScoreFormat();

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

  const statistics = ranking?.statistics;
  const currentUser = ranking?.currentUser;

  // Buscar los datos completos del usuario actual en top o relative
  const currentUserId = currentUser?.id;
  let currentUserData = null;
  
  if (currentUserId && ranking) {
    // Buscar en top
    currentUserData = ranking.top?.find(u => u.user_id === currentUserId);
    // Si no está en top, buscar en relative
    if (!currentUserData) {
      currentUserData = ranking.relative?.find(u => u.user_id === currentUserId);
    }
  }

  // Calcular mi nota (último intento)
  const myLastScore = currentUserData?.score || 0;
  const myLastScoreWithRisk = currentUserData?.score_with_risk || 0;

  // Calcular percentil (diferencia con la media)
  const percentileWithoutRisk = statistics?.avg_score_without_risk 
    ? myLastScore - statistics.avg_score_without_risk 
    : 0;
  const percentileWithRisk = statistics?.avg_score_with_risk 
    ? myLastScoreWithRisk - statistics.avg_score_with_risk 
    : 0;

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

      {/* Barra de información del cuestionario - AMPLIADA */}
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

      {/* Estadísticas - SIN RIESGO */}
      {statistics && statistics.total_users > 0 && !loading && currentUser && (
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              <h3 className="text-base font-bold text-gray-800">
                Estadísticas Sin Riesgo
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Media UA */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-4 h-4 mr-1 text-blue-600" />
                  <div className="text-gray-600 text-xs font-medium">Media UA</div>
                </div>
                <div className="text-blue-600 font-bold text-center text-2xl">
                  {formatScore(statistics.avg_score_without_risk)}
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  {statistics.total_users} usuarios
                </div>
              </div>

              {/* Mi Nota */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                <div className="flex items-center justify-center mb-2">
                  <Award className="w-4 h-4 mr-1 text-green-600" />
                  <div className="text-gray-600 text-xs font-medium">Mi Nota</div>
                </div>
                <div className="text-green-600 font-bold text-center text-2xl">
                  {formatScore(myLastScore)}
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  Último intento
                </div>
              </div>

              {/* Mi Percentil */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                <div className="flex items-center justify-center mb-2">
                  {percentileWithoutRisk > 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1 text-purple-600" />
                  ) : percentileWithoutRisk < 0 ? (
                    <TrendingDown className="w-4 h-4 mr-1 text-purple-600" />
                  ) : (
                    <Minus className="w-4 h-4 mr-1 text-purple-600" />
                  )}
                  <div className="text-gray-600 text-xs font-medium">Mi Percentil</div>
                </div>
                <div className={`font-bold text-center text-2xl ${
                  percentileWithoutRisk > 0 ? 'text-green-600' : 
                  percentileWithoutRisk < 0 ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {percentileWithoutRisk > 0 ? '+' : ''}{percentileWithoutRisk.toFixed(1)}
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  vs. media
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas - CON RIESGO */}
          <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
              <h3 className="text-base font-bold text-gray-800">
                Estadísticas Con Riesgo
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Media UA */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-4 h-4 mr-1 text-orange-600" />
                  <div className="text-gray-600 text-xs font-medium">Media UA</div>
                </div>
                <div className="text-orange-600 font-bold text-center text-2xl">
                  {formatScore(statistics.avg_score_with_risk)}
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  {statistics.total_users} usuarios
                </div>
              </div>

              {/* Mi Nota */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                <div className="flex items-center justify-center mb-2">
                  <Award className="w-4 h-4 mr-1 text-green-600" />
                  <div className="text-gray-600 text-xs font-medium">Mi Nota</div>
                </div>
                <div className="text-green-600 font-bold text-center text-2xl">
                  {formatScore(myLastScoreWithRisk)}
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  Último intento
                </div>
              </div>

              {/* Mi Percentil */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                <div className="flex items-center justify-center mb-2">
                  {percentileWithRisk > 0 ? (
                    <TrendingUp className="w-4 h-4 mr-1 text-purple-600" />
                  ) : percentileWithRisk < 0 ? (
                    <TrendingDown className="w-4 h-4 mr-1 text-purple-600" />
                  ) : (
                    <Minus className="w-4 h-4 mr-1 text-purple-600" />
                  )}
                  <div className="text-gray-600 text-xs font-medium">Mi Percentil</div>
                </div>
                <div className={`font-bold text-center text-2xl ${
                  percentileWithRisk > 0 ? 'text-green-600' : 
                  percentileWithRisk < 0 ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {percentileWithRisk > 0 ? '+' : ''}{percentileWithRisk.toFixed(1)}
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  vs. media
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Últimos Intentos */}
      <div className="mt-6">
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

      {/* Botón de Inicio */}
      <div className="text-center pt-6">
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
    </div>
  );
};

export default QuizStartConfirmation;