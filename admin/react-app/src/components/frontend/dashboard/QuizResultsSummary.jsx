// src/components/dashboard/QuizResultsList.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useQuizAttempts from '../../../hooks/useQuizAttempts';
import useQuizRanking from '../../../hooks/useQuizRanking';
import useMultipleQuizRankings from '../../../hooks/useMultipleQuizRankings';
import { useScoreFormat } from '../../../contexts/ScoreFormatContext';
import { Award, BookOpen, Calendar, CheckCircle, XCircle, TrendingUp, TrendingDown, ExternalLink, Eye } from 'lucide-react';

const QuizResultsSummary = ({ quizId = null, maxResults = null, showCourseColumn = true }) => {
  const { attempts, loading, error } = useQuizAttempts();
  const navigate = useNavigate();
  const { formatScore } = useScoreFormat();

  // Filtrar intentos si se especifica un quizId
  const filteredAttempts = quizId 
    ? attempts.filter(a => parseInt(a.quiz_id) === parseInt(quizId)).slice(0, maxResults || 5)
    : attempts;

  // Obtener lista única de quiz IDs de los intentos filtrados
  const uniqueQuizIds = [...new Set(filteredAttempts.map(a => a.quiz_id))];

  // Si hay un quizId específico, usar el hook individual
  // Si no, usar el hook múltiple para todos los quizzes
  const { ranking: singleQuizRanking, loading: singleRankingLoading } = useQuizRanking(quizId);
  const { rankings: multipleRankings, loading: multipleRankingsLoading } = useMultipleQuizRankings(
    quizId ? [] : uniqueQuizIds
  );
  
  // Siempre mostrar percentiles (ahora podemos calcularlos para múltiples quizzes)
  const showPercentiles = true;
  const rankingLoading = quizId ? singleRankingLoading : multipleRankingsLoading;

  const calculatePercentile = (attemptQuizId, score, withRisk) => {
    // Obtener el ranking apropiado según el contexto
    const ranking = quizId 
      ? singleQuizRanking 
      : multipleRankings[attemptQuizId];
    
    if (!ranking) return '-';
    
    const statistics = ranking.statistics;
    if (!statistics) return '-';
    
    const avgScore = withRisk 
      ? statistics.avg_score_with_risk 
      : statistics.avg_score_without_risk;
    
    if (avgScore === undefined || avgScore === null) return '-';
    
    const diff = score - avgScore;
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  if (filteredAttempts.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800">
          {quizId ? 'No hay intentos para este cuestionario' : 'No has completado ningún cuestionario todavía'}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {quizId ? '' : '¡Sigue aprendiendo y tus resultados aparecerán aquí!'}
        </p>
      </div>
    );
  }

  const handleRowClick = (attempt, e) => {
    // Ya no navegamos automáticamente al hacer click en la fila
    // Solo el botón "Ver detalles" navegará
    return;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      {!quizId && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Award className="w-7 h-7 mr-3 text-indigo-600" />
                Mis Resultados de Cuestionarios
              </h2>
              <p className="text-sm text-gray-600 mt-1">Revisa tu progreso y compara tus notas con la media</p>
            </div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Fecha
                </div>
              </th>
              {showCourseColumn && (
                <>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Curso / Cuestionario
                    </div>
                  </th>
                </>
              )}
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider bg-blue-50">
                <div className="flex items-center justify-center">
                  <div className="bg-blue-100 px-3 py-1 rounded-full">
                    Sin Riesgo
                  </div>
                </div>
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider bg-yellow-50">
                <div className="flex items-center justify-center">
                  <div className="bg-yellow-100 px-3 py-1 rounded-full">
                    Con Riesgo
                  </div>
                </div>
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAttempts.map((attempt, index) => {
              if (!attempt || !attempt.attempt_id) {
                return null;
              }

              const percentileSinRiesgo = calculatePercentile(attempt.quiz_id, attempt.score, false);
              const percentilConRiesgo = calculatePercentile(attempt.quiz_id, attempt.score_with_risk, true);

              return (
                <tr 
                  key={attempt.attempt_id} 
                  className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 transition-all duration-200"
                >
                  {/* Fecha */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          {new Date(attempt.end_time).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'short'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(attempt.end_time).toLocaleDateString('es-ES', { 
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Curso y Cuestionario */}
                  {showCourseColumn && (
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <BookOpen className="w-3 h-3 mr-1.5 text-indigo-400" />
                          {attempt.courseTitle || 'Sin curso'}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-800 max-w-xs truncate">
                            {attempt.quizTitle || 'Cuestionario sin título'}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navegar al quiz específico en el curso
                              navigate(`/courses/${attempt.course_id}`, {
                                state: { 
                                  selectedQuizId: attempt.quiz_id,
                                  scrollToQuiz: true 
                                }
                              });
                            }}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                            title="Ir al cuestionario"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  )}
                  
                  {/* Grupo Sin Riesgo */}
                  <td className="px-6 py-5 text-center bg-gradient-to-br from-blue-50 to-blue-100/50">
                    <div className="inline-flex flex-col items-center space-y-2 py-2">
                      <div className={`text-2xl font-bold ${
                        attempt.passed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatScore(attempt.score)}
                      </div>
                      {showPercentiles && percentileSinRiesgo !== '-' && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 shadow-sm">
                          {parseFloat(percentileSinRiesgo) > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : parseFloat(percentileSinRiesgo) < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          ) : null}
                          <span className={`text-xs font-semibold ${
                            parseFloat(percentileSinRiesgo) > 0 ? 'text-green-600' : 
                            parseFloat(percentileSinRiesgo) < 0 ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {percentileSinRiesgo}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Grupo Con Riesgo */}
                  <td className="px-6 py-5 text-center bg-gradient-to-br from-yellow-50 to-yellow-100/50">
                    <div className="inline-flex flex-col items-center space-y-2 py-2">
                      <div className={`text-2xl font-bold ${
                        attempt.passed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatScore(attempt.score_with_risk)}
                      </div>
                      {showPercentiles && percentilConRiesgo !== '-' && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 shadow-sm">
                          {parseFloat(percentilConRiesgo) > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : parseFloat(percentilConRiesgo) < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          ) : null}
                          <span className={`text-xs font-semibold ${
                            parseFloat(percentilConRiesgo) > 0 ? 'text-green-600' : 
                            parseFloat(percentilConRiesgo) < 0 ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {percentilConRiesgo}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Estado */}
                  <td className="px-6 py-5 text-center">
                    {attempt.passed ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700">Aprobado</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-50 to-rose-50 border border-red-200">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-bold text-red-700">No Aprobado</span>
                      </div>
                    )}
                  </td>
                  
                  {/* Botón Ver Detalles */}
                  <td className="px-6 py-5 text-center">
                    <button
                      onClick={() => navigate(`/dashboard/attempts/${attempt.attempt_id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuizResultsSummary;