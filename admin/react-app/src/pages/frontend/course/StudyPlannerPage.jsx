import React, { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLessons } from '../../../hooks/useLessons';
import CourseSidebar from '../../../components/course/CourseSidebar';
import LessonCalendar from '../../../components/calendar/LessonCalendar';
import { Calendar, ChevronRight, Loader, Video, FileText, ClipboardList, X } from 'lucide-react';

/**
 * LessonDetailModal - Modal to show lesson details when clicked
 */
const LessonDetailModal = ({ lesson, onClose, pageColors, getColor, isDarkMode }) => {
  const { t } = useTranslation();
  
  if (!lesson) return null;

  const lessonType = lesson.meta?._lesson_type || 'default';
  const startDate = lesson.meta?._start_date 
    ? new Date(lesson.meta._start_date).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      })
    : t('calendar.noDate', 'Sin fecha');
  
  const typeLabels = {
    video: t('lessons.types.video', 'Video'),
    test: t('lessons.types.test', 'Test'),
    pdf: t('lessons.types.pdf', 'PDF'),
    default: t('lessons.types.lesson', 'Lección'),
  };

  const TypeIcon = lessonType === 'video' ? Video : lessonType === 'test' ? ClipboardList : FileText;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all"
        style={{ backgroundColor: pageColors.bgCard }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: pageColors.hoverBg }}
            >
              <TypeIcon size={24} style={{ color: pageColors.text }} />
            </div>
            <span 
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ 
                backgroundColor: pageColors.hoverBg,
                color: pageColors.text
              }}
            >
              {typeLabels[lessonType] || typeLabels.default}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: pageColors.hoverBg }}
          >
            <X size={18} style={{ color: pageColors.text }} />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-4" style={{ color: pageColors.text }}>
          {lesson.title?.rendered || lesson.title || t('calendar.untitledLesson', 'Lección sin título')}
        </h3>

        {/* Details */}
        <div className="space-y-3">
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: pageColors.bgSubtle }}
          >
            <Calendar size={18} style={{ color: pageColors.textMuted }} />
            <div>
              <div className="text-xs" style={{ color: pageColors.textMuted }}>
                {t('calendar.startDate', 'Fecha de inicio')}
              </div>
              <div className="font-semibold" style={{ color: pageColors.text }}>
                {startDate}
              </div>
            </div>
          </div>

          {lesson.meta?._lesson_order !== undefined && (
            <div 
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: pageColors.bgSubtle }}
            >
              <span className="text-sm font-mono" style={{ color: pageColors.textMuted }}>#</span>
              <div>
                <div className="text-xs" style={{ color: pageColors.textMuted }}>
                  {t('calendar.order', 'Orden')}
                </div>
                <div className="font-semibold" style={{ color: pageColors.text }}>
                  {lesson.meta._lesson_order}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="mt-6 pt-4 border-t"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb') }}
        >
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 font-medium rounded-lg transition-opacity hover:opacity-90"
            style={{ 
              backgroundColor: pageColors.primaryBg,
              color: '#ffffff'
            }}
          >
            {t('common.close', 'Cerrar')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * StudyPlannerPage - Calendar view of course lessons
 */
const StudyPlannerPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { lessons, loading, error } = useLessons({ courseId, perPage: 100 });
  
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Dark mode aware colors (same pattern as TestHistoryPage)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSubtle: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`,
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
    hoverBgStrong: isDarkMode ? 'rgba(255,255,255,0.15)' : `${getColor('primary', '#1a202c')}20`,
    primaryBg: getColor('primary', '#1a202c'),
  };

  // Handle lesson selection from calendar
  const handleSelectLesson = useCallback((lesson) => {
    setSelectedLesson(lesson);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setSelectedLesson(null);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const withDate = lessons.filter(l => l.meta?._start_date).length;
    const withoutDate = lessons.length - withDate;
    const upcoming = lessons.filter(l => {
      if (!l.meta?._start_date) return false;
      return new Date(l.meta._start_date) > new Date();
    }).length;
    
    return { total: lessons.length, withDate, withoutDate, upcoming };
  }, [lessons]);

  return (
    <div className="flex h-full w-full">
      <CourseSidebar />
      <div 
        className="flex-1 flex flex-col overflow-auto"
        style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
      >
        {/* Breadcrumbs Header */}
        <header 
          className="px-6 py-3 border-b sticky top-0 z-[1] flex-shrink-0" 
          style={{ 
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}15`,
            backgroundColor: getColor('secondaryBackground', '#f3f4f6')
          }}
        >
          <nav className="flex items-center text-sm space-x-2">
            <Link 
              to="/courses"
              className="transition-colors duration-200 hover:underline font-medium"
              style={{ color: pageColors.text }}
            >
              {t('sidebar.courses', 'Cursos')}
            </Link>
            <ChevronRight size={16} style={{ color: pageColors.textMuted }} />
            <span 
              className="font-medium"
              style={{ color: pageColors.text }}
            >
              {t('courses.studyPlanner', 'Planificador')}
            </span>
          </nav>
        </header>

        {/* Page Content */}
        <div className="max-w-7xl w-full mx-auto px-4 py-6 pb-24">
          {/* Header with stats */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: pageColors.hoverBg }}
                >
                  <Calendar size={28} style={{ color: pageColors.text }} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: pageColors.text }}>
                    {t('courses.studyPlanner', 'Planificador')}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: pageColors.textMuted }}>
                    {t('calendar.description', 'Visualiza el calendario de lecciones del curso')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div 
                className="rounded-xl p-4 border-2"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <p className="text-2xl font-bold" style={{ color: pageColors.text }}>{stats.total}</p>
                <p className="text-sm" style={{ color: pageColors.textMuted }}>{t('calendar.totalLessons', 'Total lecciones')}</p>
              </div>
              <div 
                className="rounded-xl p-4 border-2"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{stats.withDate}</p>
                <p className="text-sm" style={{ color: pageColors.textMuted }}>{t('calendar.scheduled', 'Programadas')}</p>
              </div>
              <div 
                className="rounded-xl p-4 border-2"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <p className="text-2xl font-bold" style={{ color: pageColors.accent }}>{stats.withoutDate}</p>
                <p className="text-sm" style={{ color: pageColors.textMuted }}>{t('calendar.unscheduled', 'Sin programar')}</p>
              </div>
              <div 
                className="rounded-xl p-4 border-2"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats.upcoming}</p>
                <p className="text-sm" style={{ color: pageColors.textMuted }}>{t('calendar.upcoming', 'Próximas')}</p>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin" style={{ color: pageColors.text }} />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div 
              className="p-6 rounded-lg border-2"
              style={{
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                borderColor: '#ef4444',
                color: '#ef4444'
              }}
            >
              {error.message}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && lessons.length === 0 && (
            <div 
              className="p-12 text-center rounded-xl border-2"
              style={{
                backgroundColor: pageColors.bgCard,
                borderColor: getColor('borderColor', '#e5e7eb')
              }}
            >
              <Calendar size={64} className="mx-auto mb-4" style={{ color: pageColors.textMuted }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: pageColors.text }}>
                {t('calendar.noLessons', 'No hay lecciones')}
              </h3>
              <p style={{ color: pageColors.textMuted }}>
                {t('calendar.noLessonsDescription', 'Este curso aún no tiene lecciones programadas.')}
              </p>
            </div>
          )}

          {/* Calendar */}
          {!loading && !error && lessons.length > 0 && (
            <LessonCalendar
              lessons={lessons}
              onSelectLesson={handleSelectLesson}
              defaultView="month"
              pageColors={pageColors}
              getColor={getColor}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Lesson detail modal */}
          {selectedLesson && (
            <LessonDetailModal
              lesson={selectedLesson}
              onClose={handleCloseModal}
              pageColors={pageColors}
              getColor={getColor}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlannerPage;
