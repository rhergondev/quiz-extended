// src/components/frontend/QuizStartConfirmation.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlayCircle, 
  HelpCircle, 
  Clock, 
  CheckCircle, 
  Target
} from 'lucide-react';
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