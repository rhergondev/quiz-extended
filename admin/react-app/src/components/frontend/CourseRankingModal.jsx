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

  // Función para ajustar el brillo del color
  const adjustColorBrightness = (color, percent) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return [h * 360, s * 100, l * 100];
    };

    const hslToRgb = (h, s, l) => {
      h /= 360; s /= 100; l /= 100;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [h, s, l] = rgbToHsl(r, g, b);
    const newL = Math.max(0, Math.min(100, l + (l * percent)));
    const [newR, newG, newB] = hslToRgb(h, s, newL);
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const isLightColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  const getAdjustedPrimaryColor = () => {
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--qe-primary')
      .trim();
    if (primaryColor && primaryColor.startsWith('#')) {
      const isLight = isLightColor(primaryColor);
      return adjustColorBrightness(primaryColor, isLight ? -0.05 : 0.05);
    }
    return primaryColor;
  };

  // Debug: Ver qué datos recibe el modal
  console.log('CourseRankingModal - Props:', { 
    courseId, 
    courseName, 
    ranking: ranking?.length || 0, 
    myStatus, 
    totalQuizzes 
  });

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
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 z-50" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 qe-border-primary pointer-events-auto"
          style={{ backgroundColor: 'var(--qe-bg-card)' }}
        >
        {/* Header - Más compacto */}
        <div 
          className="p-4 border-b qe-border-primary"
          style={{ backgroundColor: getAdjustedPrimaryColor() }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Ranking del Curso</h2>
                <p className="text-sm text-white opacity-90">{courseName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white p-2 rounded-lg transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* My Status Banner */}
        {myStatus && (
          <div className={`p-4 border-b qe-border-primary ${hasCompletedAll ? 'bg-green-50' : 'qe-bg-accent-light'}`}>
            <div className="flex items-start gap-3">
              {hasCompletedAll ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 qe-text-accent mt-0.5 flex-shrink-0" />
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
                    <p className="text-sm font-semibold qe-text-accent">
                      Completa todos los cuestionarios para aparecer en el ranking oficial
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs qe-text-secondary">
                      <span>Completados: {completedQuizzes}/{totalQuizzes}</span>
                      <span>Pendientes: {pendingQuizzes}</span>
                      {completedQuizzes > 0 && (
                        <span>Tu promedio actual: <span className="font-bold">{formatScore(myStatus.average_score)}</span></span>
                      )}
                    </div>
                    {myStatus.is_temporary && myStatus.temporary_position && (
                      <p className="text-xs qe-text-secondary mt-1 flex items-center gap-1">
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
        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--qe-bg-card)' }}>
          {ranking.length === 0 ? (
            <div className="text-center py-12 qe-text-secondary">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold mb-2 qe-text-primary">Sin ranking todavía</p>
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
                      ? 'qe-bg-accent-light qe-border-accent shadow-md'
                      : 'qe-bg-background qe-border-primary hover:qe-bg-primary-light'
                  }`}
                >
                  {/* Position */}
                  <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                    {getMedalIcon(entry.position) || (
                      <div className="text-2xl font-bold qe-text-secondary">
                        #{entry.position}
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={entry.avatar_url}
                    alt={entry.display_name}
                    className="w-12 h-12 rounded-full border-2 qe-border-primary"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-semibold qe-text-primary truncate">
                        {entry.display_name}
                      </h3>
                      {entry.is_current_user && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full qe-bg-primary-light qe-text-primary">
                          Tú
                        </span>
                      )}
                    </div>
                    <p className="text-sm qe-text-secondary mt-0.5">
                      {entry.total_attempts} intento{entry.total_attempts !== 1 ? 's' : ''} · 
                      {entry.quizzes_completed} quiz{entry.quizzes_completed !== 1 ? 'zes' : ''} completado{entry.quizzes_completed !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold qe-text-primary">
                      {formatScore(entry.average_score)}
                    </div>
                    <div className="text-xs qe-text-secondary">Promedio</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t qe-border-primary flex justify-between items-center"
          style={{ backgroundColor: getAdjustedPrimaryColor() }}
        >
          <div className="text-sm text-white">
            Total de usuarios clasificados: <span className="font-semibold">{ranking.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 qe-bg-accent text-white rounded-lg qe-hover-accent transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default CourseRankingModal;
