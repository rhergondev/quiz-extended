// admin/react-app/src/components/frontend/statistics/StatsFilters.jsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Filter, Calendar, BookOpen } from 'lucide-react';

const StatsFilters = ({ 
  selectedCourse, 
  setSelectedCourse, 
  timeRange, 
  setTimeRange,
  compact = false,
  isDarkMode = false,
  pageColors = null
}) => {
  const { getColor } = useTheme();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use provided pageColors or generate defaults
  const colors = pageColors || {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    primary: getColor('primary', '#3b82f6'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const response = await fetch(
        `${window.qe_data.rest_url}quiz-extended/v1/user-enrollments`,
        {
          headers: {
            'X-WP-Nonce': window.qe_data.nonce,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch courses');
      
      const data = await response.json();
      setCourses(data.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeRanges = [
    { value: 'all', label: 'Todo' },
    { value: 'week', label: '7d' },
    { value: 'month', label: '30d' },
    { value: 'year', label: '1a' }
  ];

  // Compact inline mode
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Course Filter */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: colors.textMuted }} />
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
            className="text-sm py-1.5 px-2 border rounded-md transition-all focus:outline-none focus:ring-1"
            style={{ 
              borderColor: isDarkMode ? colors.primary + '40' : '#d1d5db',
              backgroundColor: colors.background,
              color: colors.text,
              minWidth: '140px'
            }}
            disabled={loading}
          >
            <option value="">Todos los cursos</option>
            {courses.map(course => (
              <option key={course.course_id} value={course.course_id}>
                {course.course_title}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range - Button Group */}
        <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ backgroundColor: isDarkMode ? colors.primary + '20' : '#f3f4f6' }}>
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className="text-xs font-medium py-1 px-2 rounded transition-all"
              style={{ 
                backgroundColor: timeRange === range.value ? colors.primary : 'transparent',
                color: timeRange === range.value ? '#ffffff' : colors.textMuted
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full mode (legacy support)
  return (
    <div 
      className="p-4 rounded-lg border mb-4"
      style={{ 
        backgroundColor: colors.background,
        borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb'
      }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: isDarkMode ? colors.primary + '30' : '#e5e7eb' }}>
        <Filter className="w-4 h-4" style={{ color: colors.primary }} />
        <h3 className="text-sm font-semibold" style={{ color: colors.text }}>Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Course Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
            <BookOpen className="w-3 h-3" />
            Curso
          </label>
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full text-sm p-2 border rounded-md transition-all focus:outline-none focus:ring-1"
            style={{ 
              borderColor: isDarkMode ? colors.primary + '40' : '#d1d5db',
              backgroundColor: colors.background,
              color: colors.text
            }}
            disabled={loading}
          >
            <option value="">Todos los cursos</option>
            {courses.map(course => (
              <option key={course.course_id} value={course.course_id}>
                {course.course_title}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Filter */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: colors.textMuted }}>
            <Calendar className="w-3 h-3" />
            Período
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full text-sm p-2 border rounded-md transition-all focus:outline-none focus:ring-1"
            style={{ 
              borderColor: isDarkMode ? colors.primary + '40' : '#d1d5db',
              backgroundColor: colors.background,
              color: colors.text
            }}
          >
            {[
              { value: 'all', label: 'Todo el tiempo' },
              { value: 'week', label: 'Última semana' },
              { value: 'month', label: 'Último mes' },
              { value: 'year', label: 'Último año' }
            ].map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default StatsFilters;
