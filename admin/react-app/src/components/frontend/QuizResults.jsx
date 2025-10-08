// src/components/frontend/QuizResults.jsx
import React from 'react';
import { CheckCircle, XCircle, Award, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

const QuizResults = ({ result, quizTitle }) => {
  if (!result) {
    return <div className="text-center p-8">Cargando resultados...</div>;
  }

  const { passed, score, correct_answers, total_questions } = result;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-lg max-w-2xl mx-auto">
      {passed ? (
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
      ) : (
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
      )}
      
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {passed ? '¡Felicidades, has aprobado!' : 'Necesitas repasar un poco más'}
      </h2>
      <p className="text-gray-600 mb-6">Resultados para el cuestionario: <strong>{quizTitle}</strong></p>

      <div className="my-8">
        <p className="text-lg text-gray-700">Tu puntuación final es:</p>
        <p className={`text-6xl font-bold my-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
          {score}%
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-left bg-gray-50 p-4 rounded-md border">
        <div className="flex items-center">
          <Award className="w-5 h-5 mr-2 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Puntuación</p>
            <p className="font-semibold text-gray-900">{score}%</p>
          </div>
        </div>
        <div className="flex items-center">
          <BarChart className="w-5 h-5 mr-2 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Respuestas Correctas</p>
            <p className="font-semibold text-gray-900">{correct_answers} de {total_questions}</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Link 
          to="/courses" 
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          Volver a Cursos
        </Link>
      </div>
    </div>
  );
};

export default QuizResults;