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
import { useTheme } from '../../contexts/ThemeContext';
import useQuizRanking from '../../hooks/useQuizRanking';
import QuizResultsSummary from './dashboard/QuizResultsSummary';
import QEButton from '../common/QEButton';

const StatItem = ({ icon: Icon, label, value, isDarkMode }) => (
  <div className="flex items-center text-sm" style={{ color: isDarkMode ? '#ffffff' : '#4b5563' }}>
    <Icon className="w-4 h-4 mr-2" style={{ color: isDarkMode ? '#9ca3af' : '#9ca3af' }} />
    <span className="font-semibold mr-1">{label}:</span>
    <span>{value}</span>
  </div>
);

const QuizStartConfirmation = ({ quiz, onStartQuiz }) => {
  const navigate = useNavigate();
  const { formatScore } = useScoreFormat();
  const { getColor, isDarkMode } = useTheme();
  
  // Obtener estadísticas del ranking
  const { ranking, loading: rankingLoading } = useQuizRanking(quiz?.id);

  // Dark mode colors
  const colors = {
    text: isDarkMode ? '#ffffff' : '#1f2937',
    textMuted: isDarkMode ? '#ffffff' : '#4b5563',
    textSecondary: isDarkMode ? '#d1d5db' : '#6b7280',
    bg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSecondary: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
  };

  if (!quiz) {
    return (
      <div className="text-center p-8">
        <p style={{ color: colors.textSecondary }}>No se pudo cargar la información del cuestionario.</p>
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
    <div 
      className="rounded-lg p-8 shadow-lg max-w-5xl mx-auto space-y-6"
      style={{ 
        backgroundColor: colors.bg,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: colors.border
      }}
    >
      {/* Header */}
      <div className="text-center">
        <HelpCircle className="mx-auto h-12 w-12 text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
          {title?.rendered || title || 'Cuestionario'}
        </h2>
        <p style={{ color: colors.textMuted }}>
          Estás a punto de comenzar el cuestionario. ¿Estás listo?
        </p>
      </div>

      {/* Barra de información del cuestionario */}
      <div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left p-6 rounded-lg"
        style={{ 
          backgroundColor: colors.bgSecondary,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: colors.border
        }}
      >
        <StatItem
          icon={HelpCircle}
          label="Preguntas"
          value={question_count}
          isDarkMode={isDarkMode}
        />
        <StatItem
          icon={Clock}
          label="Tiempo Límite"
          value={time_limit > 0 ? `${time_limit} min` : 'Sin límite'}
          isDarkMode={isDarkMode}
        />
        <StatItem
          icon={CheckCircle}
          label="Puntuación Mínima"
          value={formatScore(passing_score)}
          isDarkMode={isDarkMode}
        />
        <div className="flex items-center text-sm" style={{ color: colors.textMuted }}>
          <Target className="w-4 h-4 mr-2" style={{ color: isDarkMode ? '#9ca3af' : '#9ca3af' }} />
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
          <div 
            className="p-6 rounded-lg border-2 shadow-sm"
            style={{
              background: isDarkMode ? 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15))' : 'linear-gradient(to bottom right, #eff6ff, #eef2ff)',
              borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.textMuted }}>
                Sin Riesgo
              </h3>
              <div className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff' }}>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Media UA */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.textMuted }}>Media UA:</span>
                <span className="text-lg font-bold" style={{ color: colors.text }}>
                  {formatScore(statistics.avg_score_without_risk || 0)}
                </span>
              </div>
              
              {/* Mi Nota */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.textMuted }}>Mi Nota:</span>
                <span className="text-lg font-bold text-blue-700">
                  {formatScore(userStats?.score || 0)}
                </span>
              </div>
              
              {/* Separador */}
              <div className="my-2" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe' }}></div>
              
              {/* Mi Percentil */}
              <div 
                className="flex justify-between items-center p-2 rounded"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)' }}
              >
                <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>Mi Percentil:</span>
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
          <div 
            className="p-6 rounded-lg border-2 shadow-sm"
            style={{
              background: isDarkMode ? 'linear-gradient(to bottom right, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))' : 'linear-gradient(to bottom right, #fefce8, #fffbeb)',
              borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.4)' : '#fcd34d'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.textMuted }}>
                Con Riesgo
              </h3>
              <div className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#ffffff' }}>
                <Target className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Media UA */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.textMuted }}>Media UA:</span>
                <span className="text-lg font-bold" style={{ color: colors.text }}>
                  {formatScore(statistics.avg_score_with_risk || 0)}
                </span>
              </div>
              
              {/* Mi Nota */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.textMuted }}>Mi Nota:</span>
                <span className="text-lg font-bold text-amber-700">
                  {formatScore(userStats?.score_with_risk || 0)}
                </span>
              </div>
              
              {/* Separador */}
              <div className="my-2" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#fcd34d' }}></div>
              
              {/* Mi Percentil */}
              <div 
                className="flex justify-between items-center p-2 rounded"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)' }}
              >
                <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>Mi Percentil:</span>
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
      <div className="pt-2" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: colors.border }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: colors.text }}>
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