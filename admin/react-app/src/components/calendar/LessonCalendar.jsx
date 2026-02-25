/**
 * LessonCalendar - Calendar component for displaying lesson start dates
 * 
 * Uses react-big-calendar with date-fns localizer for month view
 * Custom week view (7 days without hours)
 * Custom year view with small checks and tooltips
 * 
 * @package QuizExtended
 * @subpackage Components/Calendar
 * @version 2.0.0
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours, startOfYear, endOfYear, eachDayOfInterval, isSameDay, getMonth, getDate, startOfMonth, endOfMonth, addMonths, isToday, eachMonthOfInterval } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Video, FileText, ClipboardList } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configure date-fns localizer
const locales = {
  'en': enUS,
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date, options) => startOfWeek(date, { ...options, weekStartsOn: 1 }),
  getDay,
  locales,
});

/**
 * Get lesson type color
 * @param {string} lessonType - The lesson type
 * @param {boolean} isDarkMode - Dark mode flag
 * @param {string} customColor - Custom color for notes
 * @returns {Object} Color configuration
 */
const getLessonTypeColor = (lessonType, isDarkMode, customColor = null) => {
  const colors = {
    video: { bg: '#EF4444', border: '#DC2626', text: '#FFFFFF' },
    quiz: { bg: '#3B82F6', border: '#2563EB', text: '#FFFFFF' },
    test: { bg: '#3B82F6', border: '#2563EB', text: '#FFFFFF' },
    pdf: { bg: '#10B981', border: '#059669', text: '#FFFFFF' },
    note: { bg: customColor || '#8B5CF6', border: customColor || '#7C3AED', text: '#FFFFFF' },
    live_class: { bg: '#EF4444', border: '#DC2626', text: '#FFFFFF' },
    default: { bg: '#8B5CF6', border: '#7C3AED', text: '#FFFFFF' },
  };
  return colors[lessonType] || colors.default;
};

/**
 * Custom event component for month view
 */
const EventComponent = ({ event }) => {
  return (
    <div className="flex items-center gap-1 text-xs overflow-hidden px-1">
      <span className="truncate font-medium">{event.title}</span>
    </div>
  );
};

/**
 * Custom Week View - Simple 7 days without hours
 */
const CustomWeekView = ({ date, events, pageColors, getColor, isDarkMode, t, onSelectEvent }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  const locale = locales['es'];

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(new Date(event.start), day));
  };

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-7 gap-2 p-4 rounded-xl border-2"
      style={{
        backgroundColor: pageColors.bgCard,
        borderColor: getColor('borderColor', '#e5e7eb')
      }}
    >
      {days.map((day, index) => {
        const dayEvents = getEventsForDay(day);
        const isCurrentDay = isToday(day);
        
        return (
          <div 
            key={index}
            className="flex flex-col rounded-lg overflow-hidden border"
            style={{ 
              borderColor: isCurrentDay ? pageColors.accent : (isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')),
              borderWidth: isCurrentDay ? '2px' : '1px'
            }}
          >
            {/* Day header */}
            <div 
              className="px-2 py-2 text-center"
              style={{ 
                backgroundColor: isCurrentDay ? pageColors.accent : pageColors.bgSubtle,
                color: isCurrentDay ? '#ffffff' : pageColors.text
              }}
            >
              <div className="text-xs font-medium uppercase">
                {format(day, 'EEE', { locale })}
              </div>
              <div className="text-lg font-bold">
                {format(day, 'd')}
              </div>
            </div>
            
            {/* Events */}
            <div
              className="flex-1 p-2 space-y-1 min-h-[60px] md:min-h-[120px]"
              style={{ backgroundColor: pageColors.bgCard }}
            >
              {dayEvents.length === 0 ? (
                <div className="text-xs text-center py-4" style={{ color: pageColors.textMuted }}>
                  -
                </div>
              ) : (
                dayEvents.map((event, idx) => {
                  const colors = event.isNote
                    ? { bg: event.color, text: '#FFFFFF' }
                    : getLessonTypeColor(event.lessonType, isDarkMode);
                  const isLiveClass = event.isNote && event.isLiveClass;
                  const isPureNote = event.isNote && !event.isLiveClass;
                  return (
                    <div
                      key={idx}
                      className={`text-xs p-1.5 truncate cursor-pointer hover:opacity-80 transition-opacity ${isPureNote ? 'rounded-full' : 'rounded'}`}
                      style={{
                        backgroundColor: isLiveClass ? event.color + '20' : colors.bg,
                        color: isLiveClass ? event.color : colors.text,
                        border: isLiveClass ? `2px dashed ${event.color}` : 'none',
                      }}
                      title={event.title}
                      onClick={() => onSelectEvent && onSelectEvent(event)}
                    >
                      {event.title}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Custom Year View - Annual calendar with small checks and tooltips
 */
const CustomYearView = ({ date, events, pageColors, getColor, isDarkMode, t, onSelectEvent }) => {
  const year = date.getFullYear();
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const locale = locales['es'];

  // Create a map of dates with events for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(event);
    });
    return map;
  }, [events]);

  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, events: [], date: null });

  const handleDayHover = (e, day, dayEvents) => {
    if (dayEvents.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        show: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        events: dayEvents,
        date: day
      });
    }
  };

  const handleDayLeave = () => {
    setTooltip({ show: false, x: 0, y: 0, events: [], date: null });
  };

  return (
    <div className="relative">
      <div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border-2"
        style={{ 
          backgroundColor: pageColors.bgCard,
          borderColor: getColor('borderColor', '#e5e7eb')
        }}
      >
        {months.map((month, monthIndex) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // Adjust for Monday start
          
          return (
            <div key={monthIndex} className="p-2">
              {/* Month name */}
              <div 
                className="text-sm font-semibold mb-2 text-center capitalize"
                style={{ color: pageColors.text }}
              >
                {format(month, 'MMMM', { locale })}
              </div>
              
              {/* Days header */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div 
                    key={i} 
                    className="text-[9px] text-center font-medium"
                    style={{ color: pageColors.textMuted }}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells for days before month start */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-5 h-5" />
                ))}
                
                {/* Actual days */}
                {daysInMonth.map((day, dayIndex) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(dateKey) || [];
                  const hasEvents = dayEvents.length > 0;
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`w-5 h-5 flex items-center justify-center text-[10px] rounded relative ${hasEvents ? 'cursor-pointer' : 'cursor-default'}`}
                      style={{ 
                        backgroundColor: isCurrentDay 
                          ? pageColors.accent 
                          : hasEvents 
                            ? '#3B82F6' 
                            : 'transparent',
                        color: (isCurrentDay || hasEvents) ? '#ffffff' : pageColors.text
                      }}
                      onMouseEnter={(e) => handleDayHover(e, day, dayEvents)}
                      onMouseLeave={handleDayLeave}
                      onClick={() => {
                        if (hasEvents && onSelectEvent) {
                          // If there's only one event, select it directly
                          // Otherwise, show tooltip (already handled by hover)
                          if (dayEvents.length === 1) {
                            onSelectEvent(dayEvents[0]);
                          }
                        }
                      }}
                    >
                      <span style={{ opacity: hasEvents || isCurrentDay ? 1 : 0.6 }}>
                        {getDate(day)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg shadow-lg max-w-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')}`
          }}
        >
          <div className="text-xs font-semibold mb-1" style={{ color: pageColors.text }}>
            {tooltip.date && format(tooltip.date, 'd MMMM yyyy', { locale })}
          </div>
          {tooltip.events.map((event, idx) => {
            const colors = event.isNote
              ? { bg: event.color }
              : getLessonTypeColor(event.lessonType, isDarkMode);
            return (
              <div
                key={idx}
                className="text-xs py-0.5 flex items-center gap-1 cursor-pointer hover:opacity-80"
                style={{ color: pageColors.text }}
                onClick={() => onSelectEvent && onSelectEvent(event)}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.bg }}
                />
                <span className="truncate">{event.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Custom toolbar component with theme support
 */
const CustomToolbar = ({ label, onNavigate, onView, view, views, pageColors, getColor, isDarkMode }) => {
  const { t } = useTranslation();
  
  const viewLabels = {
    month: t('calendar.month', 'Mes'),
    week: t('calendar.week', 'Semana'),
    year: t('calendar.year', 'Año'),
  };

  return (
    <div 
      className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 p-3 rounded-xl border-2"
      style={{ 
        backgroundColor: pageColors.bgCard,
        borderColor: getColor('borderColor', '#e5e7eb')
      }}
    >
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
          style={{ 
            backgroundColor: pageColors.primaryBg,
            color: '#ffffff'
          }}
        >
          {t('calendar.today', 'Hoy')}
        </button>
        <button
          onClick={() => onNavigate('PREV')}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: pageColors.hoverBg }}
          aria-label={t('calendar.previous', 'Anterior')}
        >
          <ChevronLeft size={20} style={{ color: pageColors.text }} />
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="p-2 rounded-lg transition-colors"
          style={{ backgroundColor: pageColors.hoverBg }}
          aria-label={t('calendar.next', 'Siguiente')}
        >
          <ChevronRight size={20} style={{ color: pageColors.text }} />
        </button>
      </div>

      {/* Current label */}
      <h2 
        className="text-lg font-semibold capitalize"
        style={{ color: pageColors.text }}
      >
        {label}
      </h2>

      {/* View switcher */}
      <div 
        className="flex rounded-lg overflow-hidden border-2"
        style={{ borderColor: getColor('borderColor', '#e5e7eb') }}
      >
        {views.map((viewName) => (
          <button
            key={viewName}
            onClick={() => onView(viewName)}
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: view === viewName ? pageColors.primaryBg : pageColors.bgSubtle,
              color: view === viewName ? '#ffffff' : pageColors.text
            }}
          >
            {viewLabels[viewName] || viewName}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * LessonCalendar Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.lessons - Array of lesson objects
 * @param {Array} props.calendarNotes - Array of custom calendar notes (admin-created)
 * @param {Function} props.onSelectLesson - Callback when a lesson is selected
 * @param {Function} props.onSelectNote - Callback when a note is selected
 * @param {string} props.defaultView - Default calendar view ('month', 'week', 'year')
 * @param {Object} props.pageColors - Theme colors object
 * @param {Function} props.getColor - Theme color getter function
 * @param {boolean} props.isDarkMode - Dark mode flag
 */
const LessonCalendar = ({ 
  lessons = [], 
  calendarNotes = [],
  onSelectLesson,
  onSelectNote,
  defaultView = 'month',
  pageColors,
  getColor,
  isDarkMode
}) => {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState(defaultView);
  const [date, setDate] = useState(new Date());

  // Transform lessons to calendar events
  const events = useMemo(() => {
    // Step events - individual steps with their own start_date
    const stepEvents = [];
    lessons.forEach(lesson => {
      const steps = lesson.meta?._lesson_steps || [];
      steps.forEach((step, stepIndex) => {
        if (step.start_date) {
          const startDate = new Date(step.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = addHours(startDate, 24);

          // Map step type to lesson type for colors
          const stepType = step.type || 'default';
          // Skip "Tema" (default) type — not shown in planner
          if (stepType === 'default') return;
          const colors = getLessonTypeColor(stepType, isDarkMode);
          
          const lessonTitle = lesson.title?.rendered || lesson.title || '';
          const stepTitle = step.title || `${t('calendar.step', 'Paso')} ${stepIndex + 1}`;
          
          stepEvents.push({
            id: `step-${lesson.id}-${stepIndex}`,
            title: `${lessonTitle}: ${stepTitle}`,
            start: startDate,
            end: endDate,
            allDay: true,
            lessonType: stepType,
            lesson,
            step,
            stepIndex,
            isNote: false,
            isStep: true,
            color: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
          });
        }
      });
    });

    // Lesson events (lessons without steps but with start_date at lesson level)
    const lessonEvents = lessons
      .filter(lesson => {
        // Only show lesson-level events if lesson has _start_date and NO steps with start_date
        const hasStepsWithDates = (lesson.meta?._lesson_steps || []).some(s => s.start_date);
        const lessonType = lesson.meta?._lesson_type || 'default';
        // Skip "Tema" (default) type — not shown in planner
        return lesson.meta?._start_date && !hasStepsWithDates && lessonType !== 'default';
      })
      .map(lesson => {
        const startDate = new Date(lesson.meta._start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = addHours(startDate, 24);
        
        const lessonType = lesson.meta?._lesson_type || 'default';
        const colors = getLessonTypeColor(lessonType, isDarkMode);
        
        return {
          id: `lesson-${lesson.id}`,
          title: lesson.title?.rendered || lesson.title || t('calendar.untitledLesson', 'Lección sin título'),
          start: startDate,
          end: endDate,
          allDay: true,
          lessonType,
          lesson,
          isNote: false,
          isStep: false,
          color: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
        };
      });

    // Calendar note events (admin-created) - includes notes and live classes
    const noteEvents = calendarNotes.map(note => {
      const startDate = new Date(note.note_date);
      // If live class has a time, set it; otherwise use start of day
      if (note.type === 'live_class' && note.time) {
        const [hours, minutes] = note.time.split(':');
        startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      } else {
        startDate.setHours(0, 0, 0, 0);
      }
      const endDate = note.type === 'live_class' && note.time 
        ? addHours(startDate, 1) // Live classes default to 1 hour
        : addHours(startDate, 24); // Notes are all-day
      
      const isLiveClass = note.type === 'live_class';
      
      return {
        id: `note-${note.id}`,
        title: note.title,
        start: startDate,
        end: endDate,
        allDay: !isLiveClass || !note.time,
        lessonType: isLiveClass ? 'live_class' : 'note',
        note,
        isNote: true,
        isLiveClass,
        isStep: false,
        color: note.color || (isLiveClass ? '#EF4444' : '#8B5CF6'),
        borderColor: note.color || (isLiveClass ? '#DC2626' : '#7C3AED'),
        textColor: '#FFFFFF',
      };
    });

    return [...stepEvents, ...lessonEvents, ...noteEvents];
  }, [lessons, calendarNotes, t, isDarkMode]);

  // Count lessons without any dates (neither lesson-level nor step-level)
  const lessonsWithoutDates = useMemo(() => {
    return lessons.filter(lesson => {
      const hasLessonDate = !!lesson.meta?._start_date;
      const hasStepDates = (lesson.meta?._lesson_steps || []).some(s => s.start_date);
      return !hasLessonDate && !hasStepDates;
    }).length;
  }, [lessons]);

  // Custom event styling
  const eventStyleGetter = useCallback((event) => {
    const isLiveClass = event.isNote && event.isLiveClass;
    const isPureNote = event.isNote && !event.isLiveClass;

    if (isLiveClass) {
      return {
        style: {
          backgroundColor: event.color + '20',
          color: event.color,
          borderRadius: '6px',
          border: `2px dashed ${event.color}`,
          fontSize: '12px',
          padding: '2px 6px',
          cursor: 'pointer',
        },
      };
    }

    return {
      style: {
        backgroundColor: event.color,
        borderColor: event.borderColor,
        color: event.textColor,
        borderRadius: isPureNote ? '9999px' : '6px',
        border: `2px solid ${event.borderColor}`,
        fontSize: '12px',
        padding: isPureNote ? '2px 8px' : '2px 6px',
        cursor: 'pointer',
      },
    };
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback((event) => {
    if (event.isNote && onSelectNote) {
      onSelectNote(event.note);
    } else if (!event.isNote && onSelectLesson) {
      // Pass the full event object so caller can access step info, lessonType, etc.
      onSelectLesson(event);
    }
  }, [onSelectLesson, onSelectNote]);

  // Calendar messages (i18n)
  const messages = useMemo(() => ({
    today: t('calendar.today', 'Hoy'),
    previous: t('calendar.previous', 'Anterior'),
    next: t('calendar.next', 'Siguiente'),
    month: t('calendar.month', 'Mes'),
    week: t('calendar.week', 'Semana'),
    year: t('calendar.year', 'Año'),
    date: t('calendar.date', 'Fecha'),
    time: t('calendar.time', 'Hora'),
    event: t('calendar.event', 'Evento'),
    noEventsInRange: t('calendar.noEventsInRange', 'No hay lecciones programadas en este período.'),
    showMore: (total) => t('calendar.showMore', `+ {{count}} más`, { count: total }),
  }), [t]);

  // Get current locale
  const culture = i18n.language?.startsWith('es') ? 'es' : 'en';

  // Handle view change
  const handleViewChange = useCallback((newView) => {
    setView(newView);
  }, []);

  // Handle navigation
  const handleNavigate = useCallback((action) => {
    const newDate = new Date(date);
    
    if (action === 'TODAY') {
      setDate(new Date());
      return;
    }
    
    const increment = action === 'NEXT' ? 1 : -1;
    
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + increment);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (7 * increment));
    } else if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() + increment);
    }
    
    setDate(newDate);
  }, [date, view]);

  // Generate label based on view
  const getLabel = useCallback(() => {
    const locale = i18n.language?.startsWith('es') ? locales['es'] : locales['en'];
    
    if (view === 'month') {
      return format(date, 'MMMM yyyy', { locale });
    } else if (view === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${format(weekStart, 'd MMM', { locale })} - ${format(weekEnd, 'd MMM yyyy', { locale })}`;
    } else if (view === 'year') {
      return format(date, 'yyyy', { locale });
    }
    return '';
  }, [date, view, i18n.language]);

  // Custom toolbar with theme props
  const ToolbarWithTheme = useCallback((props) => (
    <CustomToolbar 
      {...props}
      label={getLabel()}
      view={view}
      views={['week', 'month', 'year']}
      onView={handleViewChange}
      onNavigate={handleNavigate}
      pageColors={pageColors}
      getColor={getColor}
      isDarkMode={isDarkMode}
    />
  ), [pageColors, getColor, isDarkMode, view, handleViewChange, handleNavigate, getLabel]);

  return (
    <div className="lesson-calendar">
      {/* Custom Toolbar */}
      <ToolbarWithTheme />

      {/* Calendar Views */}
      {view === 'month' && (
        <div 
          className="rounded-xl border-2 p-4" 
          style={{ 
            minHeight: '500px',
            backgroundColor: pageColors.bgCard,
            borderColor: getColor('borderColor', '#e5e7eb')
          }}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            view="month"
            date={date}
            onNavigate={setDate}
            views={['month']}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            messages={messages}
            culture={culture}
            components={{
              toolbar: () => null,
              event: EventComponent,
            }}
            popup
            selectable={false}
          />
        </div>
      )}

      {view === 'week' && (
        <CustomWeekView
          date={date}
          events={events}
          pageColors={pageColors}
          getColor={getColor}
          isDarkMode={isDarkMode}
          t={t}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {view === 'year' && (
        <CustomYearView
          date={date}
          events={events}
          pageColors={pageColors}
          getColor={getColor}
          isDarkMode={isDarkMode}
          t={t}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {/* Custom styles for month calendar */}
      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar {
          display: none;
        }
        .rbc-header {
          padding: 10px 4px;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')};
          background: ${pageColors.bgSubtle};
          color: ${pageColors.text};
        }
        .rbc-month-view {
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')};
          border-radius: 8px;
          overflow: hidden;
        }
        .rbc-month-row {
          border-top: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')};
        }
        .rbc-day-bg {
          background: ${pageColors.bgCard};
        }
        .rbc-day-bg + .rbc-day-bg {
          border-left: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')};
        }
        .rbc-today {
          background-color: ${pageColors.accent}20 !important;
        }
        .rbc-off-range-bg {
          background-color: ${pageColors.bgSubtle};
        }
        .rbc-date-cell {
          padding: 4px 8px;
          text-align: right;
          font-size: 13px;
          color: ${pageColors.text};
        }
        .rbc-date-cell.rbc-off-range {
          color: ${pageColors.textMuted};
        }
        .rbc-date-cell.rbc-now {
          font-weight: 700;
        }
        .rbc-date-cell.rbc-now > a,
        .rbc-date-cell.rbc-now > button {
          background-color: ${pageColors.accent} !important;
          background: ${pageColors.accent} !important;
          color: #ffffff !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-weight: 700 !important;
        }
        .rbc-date-cell > a,
        .rbc-date-cell > button,
        .rbc-date-cell a,
        .rbc-date-cell button {
          background-color: transparent !important;
          background: transparent !important;
          color: ${pageColors.text} !important;
          pointer-events: none !important;
          cursor: default !important;
          text-decoration: none !important;
          font-weight: 600 !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .rbc-date-cell > a:hover,
        .rbc-date-cell > a:focus,
        .rbc-date-cell > a:active,
        .rbc-date-cell > button:hover,
        .rbc-date-cell > button:focus,
        .rbc-date-cell > button:active,
        .rbc-date-cell a:hover,
        .rbc-date-cell button:hover {
          background-color: transparent !important;
          background: transparent !important;
          color: ${pageColors.text} !important;
          text-decoration: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .rbc-date-cell.rbc-off-range > a,
        .rbc-date-cell.rbc-off-range > button {
          color: ${pageColors.textMuted} !important;
        }
        .rbc-event {
          cursor: pointer;
          pointer-events: auto;
        }
        .rbc-event:hover {
          opacity: 0.85;
        }
        .rbc-day-bg {
          cursor: default;
        }
        .rbc-show-more {
          color: ${getColor('primary', '#3b82f6')};
          font-weight: 500;
          font-size: 12px;
          background: transparent;
          cursor: pointer;
          pointer-events: auto;
        }
        .rbc-row-content {
          z-index: 1;
        }
        .rbc-overlay {
          background: ${pageColors.bgCard};
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')};
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          padding: 8px;
          z-index: 100;
        }
        .rbc-overlay-header {
          color: ${pageColors.text};
          font-weight: 600;
          padding: 4px 8px;
          border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')};
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
};

export default LessonCalendar;
