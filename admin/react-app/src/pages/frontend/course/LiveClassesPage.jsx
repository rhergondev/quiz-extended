import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import { getCalendarNotes } from '../../../api/services/calendarNotesService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { Radio, Calendar, ExternalLink, Clock } from 'lucide-react';

/**
 * Compute countdown info from now to a target date+time.
 */
const getCountdown = (noteDate, time, t) => {
  const target = new Date(noteDate + 'T' + (time ? time.substring(0, 5) : '00:00'));
  const now = new Date();
  const diffMs = target - now;

  // Class is happening now (within a 1.5h window after start)
  if (diffMs < 0 && diffMs > -90 * 60 * 1000) {
    return { text: t('liveClasses.inProgress', 'En curso'), urgent: true, live: true };
  }
  // Already passed
  if (diffMs < 0) {
    return { text: t('liveClasses.finished', 'Finalizada'), urgent: false, live: false, past: true };
  }

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return {
      text: remainingHours > 0
        ? t('liveClasses.countdownDaysHours', 'En {{days}}d {{hours}}h', { days, hours: remainingHours })
        : t('liveClasses.countdownDays', 'En {{days}} d\u00eda{{s}}', { days, s: days > 1 ? 's' : '' }),
      urgent: false,
      live: false
    };
  }
  if (hours > 0) {
    const remainingMin = minutes % 60;
    return {
      text: t('liveClasses.countdownHoursMin', 'En {{hours}}h {{min}}min', { hours, min: remainingMin }),
      urgent: hours < 1,
      live: false
    };
  }
  return {
    text: t('liveClasses.countdownMin', 'Empieza en {{min}} min', { min: minutes }),
    urgent: true,
    live: false
  };
};

const LiveClassesPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  // Colores adaptativos según el modo (misma lógica que sidebar/topbar/messages/support)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
    // Button colors (same as CourseCard)
    buttonBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    buttonHoverBg: isDarkMode ? getColor('primary', '#3b82f6') : getColor('accent', '#f59e0b'),
  };

  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  // Fetch live classes
  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    getCalendarNotes(courseId)
      .then(notes => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = notes
          .filter(n => n.type === 'live_class')
          .filter(n => {
            const classDate = new Date(n.note_date);
            // Show classes from today onwards, plus classes from yesterday that might still be "in progress"
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return classDate >= yesterday;
          })
          .sort((a, b) => new Date(a.note_date) - new Date(b.note_date));
        setLiveClasses(upcoming);
      })
      .catch(() => setLiveClasses([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  // Tick every 60s to update countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter out fully past classes on each render
  const visibleClasses = useMemo(() => {
    return liveClasses.filter(lc => {
      const countdown = getCountdown(lc.note_date, lc.time, t);
      return !countdown.past;
    });
  }, [liveClasses, t]);

  const formatDate = (noteDate, time) => {
    const date = new Date(noteDate + 'T00:00:00');
    const formatted = date.toLocaleDateString(undefined, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    if (time) {
      return `${capitalized} - ${time.substring(0, 5)}`;
    }
    return capitalized;
  };

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.liveClasses')}
    >
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">

          {/* Loading skeleton */}
          {loading && (
            <div
              className="rounded-xl border-2 overflow-hidden"
              style={{
                backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                borderColor: isDarkMode ? pageColors.accent : getColor('borderColor', '#e5e7eb')
              }}
            >
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="px-4 sm:px-6 py-5 flex items-center gap-4 animate-pulse"
                  style={{ borderBottom: i < 3 ? `1px solid rgba(156, 163, 175, 0.2)` : 'none' }}
                >
                  <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: pageColors.text + '15' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded" style={{ backgroundColor: pageColors.text + '15', maxWidth: '250px' }} />
                    <div className="h-3 rounded" style={{ backgroundColor: pageColors.text + '10', maxWidth: '180px' }} />
                  </div>
                  <div className="h-8 w-24 rounded-lg" style={{ backgroundColor: pageColors.text + '10' }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && visibleClasses.length === 0 && (
            <div
              className="text-center py-12 rounded-lg border"
              style={{
                backgroundColor: getColor('background', '#ffffff'),
                borderColor: getColor('borderColor', '#e5e7eb')
              }}
            >
              <Radio size={40} className="mx-auto mb-3" style={{ color: pageColors.text + '30' }} />
              <p className="text-sm font-medium" style={{ color: pageColors.text }}>
                {t('dashboard.noLiveClasses', 'Sin clases programadas')}
              </p>
              <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                {t('dashboard.noLiveClassesDescription', 'No hay clases en directo pr\u00f3ximas')}
              </p>
            </div>
          )}

          {/* Live Classes List */}
          {!loading && visibleClasses.length > 0 && (
            <div className="py-4">
              <div
                className="rounded-xl border-2 overflow-hidden"
                style={{
                  backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                  borderColor: isDarkMode ? pageColors.accent : getColor('borderColor', '#e5e7eb')
                }}
              >
                {visibleClasses.map((lc, index) => {
                  const countdown = getCountdown(lc.note_date, lc.time, t);
                  const classColor = lc.color || '#EF4444';
                  const isLast = index === visibleClasses.length - 1;

                  return (
                    <div key={lc.id}>
                      {/* Class row */}
                      <div
                        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-all duration-200 gap-3"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`
                        }}
                      >
                        {/* Left: Icon + Info */}
                        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden min-w-0 flex-1">
                          {/* Color-coded icon */}
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: classColor + '20' }}
                          >
                            <Radio size={20} style={{ color: classColor }} />
                          </div>

                          {/* Title + date */}
                          <div className="min-w-0 flex-1">
                            <span
                              className="font-semibold text-left block truncate"
                              style={{ color: pageColors.text }}
                            >
                              {lc.title}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Calendar size={12} style={{ color: pageColors.textMuted }} />
                              <span className="text-xs" style={{ color: pageColors.textMuted }}>
                                {formatDate(lc.note_date, lc.time)}
                              </span>
                            </div>
                            {lc.description && (
                              <p className="text-xs mt-1 line-clamp-1 hidden sm:block" style={{ color: pageColors.textMuted }}>
                                {lc.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Countdown badge + Join button */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          {/* Countdown badge */}
                          <span
                            className="hidden sm:inline-block text-xs font-semibold px-3 py-1 rounded-full"
                            style={{
                              backgroundColor: countdown.live
                                ? '#EF4444'
                                : countdown.urgent
                                  ? isDarkMode ? `${pageColors.accent}30` : `${pageColors.accent}15`
                                  : isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
                              color: countdown.live
                                ? '#ffffff'
                                : countdown.urgent
                                  ? pageColors.accent
                                  : pageColors.text,
                              minWidth: '90px',
                              textAlign: 'center'
                            }}
                          >
                            {countdown.live && (
                              <span className="relative inline-flex h-2 w-2 mr-1.5 align-middle">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                              </span>
                            )}
                            {!countdown.live && countdown.urgent && (
                              <Clock size={11} className="inline mr-1 align-middle" style={{ marginTop: '-1px' }} />
                            )}
                            {countdown.text}
                          </span>

                          {/* Join button */}
                          {lc.link && (
                            <a
                              href={lc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 flex-shrink-0"
                              style={{
                                backgroundColor: countdown.live ? '#EF4444' : pageColors.buttonBg,
                                color: countdown.live ? '#ffffff' : pageColors.buttonText
                              }}
                              onMouseEnter={(e) => {
                                if (countdown.live) {
                                  e.currentTarget.style.backgroundColor = '#dc2626';
                                } else if (isDarkMode) {
                                  e.currentTarget.style.filter = 'brightness(1.15)';
                                } else {
                                  e.currentTarget.style.backgroundColor = pageColors.buttonHoverBg;
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.filter = 'none';
                                e.currentTarget.style.backgroundColor = countdown.live ? '#EF4444' : pageColors.buttonBg;
                              }}
                            >
                              <ExternalLink size={14} />
                              <span className="hidden sm:inline">{t('calendar.joinClass', 'Unirse a la clase')}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Separator between classes */}
                      {!isLast && (
                        <div
                          style={{
                            height: '2px',
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default LiveClassesPage;
