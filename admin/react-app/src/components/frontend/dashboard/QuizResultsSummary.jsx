// src/components/dashboard/QuizResultsList.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useQuizAttempts from '../../../hooks/useQuizAttempts';
import { Award, BookOpen, Calendar, CheckCircle, XCircle } from 'lucide-react';

const QuizResultsSummary = () => {
  const { attempts, loading, error } = useQuizAttempts();
  const navigate = useNavigate();

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  if (attempts.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800">No has completado ningún cuestionario todavía</h3>
        <p className="mt-2 text-sm text-gray-500">¡Sigue aprendiendo y tus resultados aparecerán aquí!</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Award className="w-6 h-6 mr-3 text-indigo-600" />
          Mis Resultados de Cuestionarios
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuestionario</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puntuación</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attempts.map((attempt, index) => {
              // 🔥 1. DEFENSA: Si el intento no es un objeto válido, no renderizar la fila.
              if (!attempt || !attempt.attempt_id) {
                return null;
              }

              return (
                <tr 
                  key={attempt.attempt_id} 
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/dashboard/attempts/${attempt.attempt_id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-indigo-600 hover:underline">
                      {/* 🔥 2. DEFENSA: Usamos un valor por defecto si la propiedad no existe */}
                      {attempt.quizTitle || 'Cuestionario sin título'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <BookOpen className="w-4 h-4 mr-2" />
                      {attempt.courseTitle || 'Curso sin título'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-indigo-600">{attempt.score}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                       <Calendar className="w-4 h-4 mr-2" />
                       {new Date(attempt.end_time).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {attempt.passed ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprobado
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        No Aprobado
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuizResultsSummary;