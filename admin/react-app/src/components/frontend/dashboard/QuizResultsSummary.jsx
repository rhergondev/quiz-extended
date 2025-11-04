// src/components/dashboard/QuizResultsList.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useQuizAttempts from '../../../hooks/useQuizAttempts';
import useQuizRanking from '../../../hooks/useQuizRanking';
import useMultipleQuizRankings from '../../../hooks/useMultipleQuizRankings';
import { useScoreFormat } from '../../../contexts/ScoreFormatContext';
import { Award, BookOpen, Calendar, CheckCircle, XCircle, TrendingUp, TrendingDown, ExternalLink, Eye } from 'lucide-react';

const QuizResultsSummary = ({ quizId = null, maxResults = null, showCourseColumn = true, limitedView = false }) => {
  const { attempts, loading, error } = useQuizAttempts();
  const navigate = useNavigate();
  const { formatScore } = useScoreFormat();

  // Filtrar intentos si se especifica un quizId
  let filteredAttempts = quizId 
    ? attempts.filter(a => parseInt(a.quiz_id) === parseInt(quizId))
    : attempts;
  
  // Aplicar límite si está en modo limitado o si se especifica maxResults
  if (limitedView) {
    filteredAttempts = filteredAttempts.slice(0, 5);
  } else if (maxResults) {
    filteredAttempts = filteredAttempts.slice(0, maxResults);
  }

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
    <div className="rounded-lg shadow-sm border qe-border-primary" style={{ backgroundColor: 'var(--qe-bg-card)' }}>
      {!quizId && (
        <div className="px-4 pt-4 pb-3 border-b qe-border-primary mx-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 qe-bg-primary-light rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 qe-text-primary" />
            </div>
            <h2 className="text-lg font-bold qe-text-primary flex items-center">
              Mis Cuestionarios
            </h2>
          </div>
        </div>
      )}
      <div className="overflow-x-auto mx-4 mb-4">
        <table className="min-w-full">
          <thead>
            <tr className="qe-bg-primary-light border-b-2 qe-border-primary">
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold qe-text-primary uppercase tracking-wider align-middle">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Fecha
                </div>
              </th>
              {showCourseColumn && (
                <>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold qe-text-primary uppercase tracking-wider align-middle">
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Curso / Cuestionario
                    </div>
                  </th>
                </>
              )}
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold qe-text-primary uppercase tracking-wider align-middle bg-gradient-to-br from-blue-50 to-blue-100/50">
                <div className="flex items-center justify-center">
                  <div className="qe-bg-card px-3 py-1 rounded-full">
                    Sin Riesgo
                  </div>
                </div>
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold qe-text-primary uppercase tracking-wider align-middle bg-yellow-50">
                <div className="flex items-center justify-center">
                  <div className="qe-bg-card px-3 py-1 rounded-full">
                    Con Riesgo
                  </div>
                </div>
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold qe-text-primary uppercase tracking-wider align-middle">
                Estado
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold qe-text-primary uppercase tracking-wider align-middle">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y qe-border-primary">
            {filteredAttempts.map((attempt, index) => {
              if (!attempt || !attempt.attempt_id) {
                return null;
              }

              const percentileSinRiesgo = calculatePercentile(attempt.quiz_id, attempt.score, false);
              const percentilConRiesgo = calculatePercentile(attempt.quiz_id, attempt.score_with_risk, true);

              return (
                <tr 
                  key={attempt.attempt_id} 
                  className="hover:qe-bg-primary-light transition-all duration-200"
                >
                  {/* Fecha */}
                  <td className="px-6 py-5 whitespace-nowrap align-middle">
                    <div className="flex items-center">
                      <div className="qe-bg-primary-light p-2 rounded-lg mr-3">
                        <Calendar className="w-4 h-4 qe-text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold qe-text-primary">
                          {new Date(attempt.end_time).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'short'
                          })}
                        </div>
                        <div className="text-xs qe-text-secondary">
                          {new Date(attempt.end_time).toLocaleDateString('es-ES', { 
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Curso y Cuestionario */}
                  {showCourseColumn && (
                    <td className="px-6 py-5 align-middle">
                      <div className="space-y-2">
                        <div className="flex items-center text-xs qe-text-secondary">
                          <BookOpen className="w-3 h-3 mr-1.5 qe-text-primary" />
                          {attempt.courseTitle || 'Sin curso'}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium qe-text-primary max-w-xs truncate">
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
                            className="text-white rounded p-1 transition-colors"
                            style={{ backgroundColor: 'var(--qe-primary)' }}
                            title="Ir al cuestionario"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  )}
                  
                  {/* Grupo Sin Riesgo */}
                  <td className="px-6 py-5 text-center align-middle bg-gradient-to-br from-blue-50 to-blue-100/50">
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
                  <td className="px-6 py-5 text-center align-middle bg-yellow-50">
                    <div className="inline-flex flex-col items-center space-y-2 py-2">
                      <div className={`text-2xl font-bold ${
                        attempt.passed ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatScore(attempt.score_with_risk)}
                      </div>
                      {showPercentiles && percentilConRiesgo !== '-' && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full qe-bg-card shadow-sm">
                          {parseFloat(percentilConRiesgo) > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : parseFloat(percentilConRiesgo) < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          ) : null}
                          <span className={`text-xs font-semibold ${
                            parseFloat(percentilConRiesgo) > 0 ? 'text-green-600' : 
                            parseFloat(percentilConRiesgo) < 0 ? 'text-red-600' : 
                            'qe-text-secondary'
                          }`}>
                            {percentilConRiesgo}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Estado */}
                  <td className="px-6 py-5 text-center align-middle">
                    {attempt.passed ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-600">Aprobado</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-bold text-red-600">No Aprobado</span>
                      </div>
                    )}
                  </td>
                  
                  {/* Botón Ver Detalles */}
                  <td className="px-6 py-5 text-center align-middle">
                    <button
                      onClick={() => navigate(`/dashboard/attempts/${attempt.attempt_id}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      style={{ backgroundColor: 'var(--qe-primary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                      }}
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