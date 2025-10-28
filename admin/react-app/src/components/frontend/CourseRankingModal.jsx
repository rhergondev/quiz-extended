import React from 'react';
import { X, Trophy, Award, Medal, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import QEButton from '../common/QEButton';

/**
 * CourseRankingModal
 * Shows ranking for users in a course
 * Only users who completed ALL quizzes appear in final ranking
 */
const CourseRankingModal = ({ courseId, courseName, ranking, myStatus, totalQuizzes, onClose }) => {
  const { formatScore } = useScoreFormat();

  // Get medal icon based on position
  const getMedalIcon = (position) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6" style={{ color: '#FFD700' }} />;
      case 2:
        return <Award className="w-6 h-6" style={{ color: '#C0C0C0' }} />;
      case 3:
        return <Medal className="w-6 h-6" style={{ color: '#CD7F32' }} />;
      default:
        return null;
    }
  };

  const hasCompletedAll = myStatus?.has_completed_all;
  const completedQuizzes = myStatus?.completed_quizzes || 0;
  const pendingQuizzes = myStatus?.pending_quizzes || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div 
          className="p-6 border-b"
          style={{ 
            background: 'linear-gradient(135deg, var(--qe-primary), var(--qe-secondary))',
            color: 'white'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Ranking del Curso</h2>
                <p className="text-sm opacity-90 mt-1">{courseName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:opacity-80 transition-opacity"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* My Status Banner */}
        {myStatus && (
          <div className={`p-4 ${hasCompletedAll ? 'bg-green-50' : 'bg-yellow-50'} border-b`}>
            <div className="flex items-start gap-3">
              {hasCompletedAll ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                {hasCompletedAll ? (
                  <>
                    <p className="text-sm font-semibold text-green-900">
                      ¡Has completado todos los cuestionarios!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Tu promedio: <span className="font-bold">{formatScore(myStatus.average_score)}</span> · 
                      Intentos totales: {myStatus.total_attempts}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-yellow-900">
                      Completa todos los cuestionarios para aparecer en el ranking oficial
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-yellow-700">
                      <span>Completados: {completedQuizzes}/{totalQuizzes}</span>
                      <span>Pendientes: {pendingQuizzes}</span>
                      {completedQuizzes > 0 && (
                        <span>Tu promedio actual: <span className="font-bold">{formatScore(myStatus.average_score)}</span></span>
                      )}
                    </div>
                    {myStatus.is_temporary && myStatus.temporary_position && (
                      <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Posición temporal (entre usuarios con {completedQuizzes} quiz{completedQuizzes !== 1 ? 'zes' : ''} completado{completedQuizzes !== 1 ? 's' : ''}): #{myStatus.temporary_position}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ranking List */}
        <div className="flex-1 overflow-y-auto p-6">
          {ranking.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold mb-2">Sin ranking todavía</p>
              <p className="text-sm">
                Ningún usuario ha completado todos los cuestionarios del curso.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.map((entry) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    entry.is_current_user
                      ? 'bg-blue-50 border-blue-300 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Position */}
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    {getMedalIcon(entry.position) || (
                      <div className="text-2xl font-bold text-gray-600">
                        #{entry.position}
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={entry.avatar_url}
                    alt={entry.display_name}
                    className="w-12 h-12 rounded-full border-2 border-gray-200"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {entry.display_name}
                      </h3>
                      {entry.is_current_user && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ 
                          backgroundColor: 'var(--qe-primary-light)', 
                          color: 'var(--qe-primary)' 
                        }}>
                          Tú
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {entry.total_attempts} intento{entry.total_attempts !== 1 ? 's' : ''} · 
                      {entry.quizzes_completed} quiz{entry.quizzes_completed !== 1 ? 'zes' : ''} completado{entry.quizzes_completed !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold" style={{ color: 'var(--qe-primary)' }}>
                      {formatScore(entry.average_score)}
                    </div>
                    <div className="text-xs text-gray-500">Promedio</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Total de usuarios clasificados: <span className="font-semibold">{ranking.length}</span>
          </div>
          <QEButton
            onClick={onClose}
            variant="primary"
            className="px-6 py-2 rounded-lg"
          >
            Cerrar
          </QEButton>
        </div>
      </div>
    </div>
  );
};

export default CourseRankingModal;
