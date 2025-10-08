// src/components/frontend/QuizStartConfirmation.jsx
import React from 'react';
import { PlayCircle, HelpCircle, Clock, CheckCircle } from 'lucide-react';

const StatItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center text-sm text-gray-600">
    <Icon className="w-4 h-4 mr-2 text-gray-400" />
    <span className="font-semibold mr-1">{label}:</span>
    <span>{value}</span>
  </div>
);

const QuizStartConfirmation = ({ quiz, onStartQuiz }) => {
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-lg max-w-2xl mx-auto">
      <HelpCircle className="mx-auto h-12 w-12 text-indigo-500 mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {title?.rendered || 'Cuestionario'}
      </h2>
      <p className="text-gray-600 mb-6">
        Estás a punto de comenzar el cuestionario. ¿Estás listo?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left bg-gray-50 p-4 rounded-md border">
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