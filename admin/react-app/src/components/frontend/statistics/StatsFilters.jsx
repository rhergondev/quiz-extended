// admin/react-app/src/components/frontend/statistics/StatsFilters.jsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Filter, Calendar, BookOpen } from 'lucide-react';

const StatsFilters = ({ selectedCourse, setSelectedCourse, timeRange, setTimeRange }) => {
  const { getColor } = useTheme();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

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
    { value: 'all', label: 'Todo el tiempo' },
    { value: 'week', label: 'Última semana' },
    { value: 'month', label: 'Último mes' },
    { value: 'year', label: 'Último año' }
  ];

  return (
    <div 
      className="p-6 rounded-xl shadow-lg border-2 mb-6"
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
        <Filter className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
        <h3 className="text-xl font-bold qe-text-primary">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Filter */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium qe-text-primary mb-2">
            <BookOpen className="w-4 h-4" />
            Filtrar por Curso
          </label>
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full p-3 border-2 rounded-lg qe-text-primary transition-all focus:outline-none focus:ring-2"
            style={{ 
              borderColor: getColor('primary', '#3b82f6'),
              backgroundColor: getColor('background', '#ffffff')
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
          <label className="flex items-center gap-2 text-sm font-medium qe-text-primary mb-2">
            <Calendar className="w-4 h-4" />
            Período de Tiempo
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full p-3 border-2 rounded-lg qe-text-primary transition-all focus:outline-none focus:ring-2"
            style={{ 
              borderColor: getColor('primary', '#3b82f6'),
              backgroundColor: getColor('background', '#ffffff')
            }}
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCourse && (
        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: getColor('secondary', '#f3f4f6') }}>
          <p className="text-sm qe-text-secondary">
            📊 Mostrando estadísticas filtradas para: <strong className="qe-text-primary">
              {courses.find(c => c.course_id === selectedCourse)?.course_title || 'Curso seleccionado'}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default StatsFilters;
