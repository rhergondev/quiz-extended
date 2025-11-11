// admin/react-app/src/components/frontend/statistics/CourseStatsGrid.jsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { BookOpen, TrendingUp, Target, Award } from 'lucide-react';

const CourseStatsGrid = ({ selectedCourse }) => {
  const { getColor } = useTheme();
  const [coursesStats, setCoursesStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoursesStats();
  }, []);

  const fetchCoursesStats = async () => {
    setLoading(true);
    try {
      // Fetch enrolled courses
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
      const courses = data.data || [];

      // Fetch stats for each course
      const statsPromises = courses.map(async (course) => {
        try {
          const statsResponse = await fetch(
            `${window.qe_data.rest_url}quiz-extended/v1/user-stats/questions?course_id=${course.course_id}`,
            {
              headers: {
                'X-WP-Nonce': window.qe_data.nonce,
              },
            }
          );

          if (!statsResponse.ok) throw new Error('Failed to fetch course stats');
          
          const statsData = await statsResponse.json();
          return {
            ...course,
            stats: statsData.data
          };
        } catch (error) {
          console.error(`Error fetching stats for course ${course.course_id}:`, error);
          return {
            ...course,
            stats: {
              total_questions: 0,
              correct_answers: 0,
              incorrect_answers: 0,
              unanswered: 0
            }
          };
        }
      });

      const coursesWithStats = await Promise.all(statsPromises);
      setCoursesStats(coursesWithStats);
    } catch (error) {
      console.error('Error fetching courses stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="p-6 rounded-xl shadow-lg border-2"
        style={{ 
          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
          borderColor: getColor('primary', '#3b82f6')
        }}
      >
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" 
               style={{ borderColor: getColor('primary', '#3b82f6') }}></div>
        </div>
      </div>
    );
  }

  // Filter courses if a specific course is selected
  const displayCourses = selectedCourse 
    ? coursesStats.filter(c => c.course_id === selectedCourse)
    : coursesStats;

  if (displayCourses.length === 0) {
    return null;
  }

  const calculateAccuracy = (stats) => {
    if (!stats || stats.total_questions === 0) return 0;
    return ((stats.correct_answers / stats.total_questions) * 100).toFixed(1);
  };

  const calculateProgress = (stats) => {
    if (!stats || stats.total_questions === 0) return 0;
    const answered = stats.correct_answers + stats.incorrect_answers;
    return ((answered / stats.total_questions) * 100).toFixed(1);
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return '#10b981';
    if (accuracy >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div 
      className="p-6 rounded-xl shadow-lg border-2"
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
        <BookOpen className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
        <h2 className="text-xl font-bold qe-text-primary">
          {selectedCourse ? 'Detalles del Curso' : 'Estadísticas por Curso'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCourses.map((course) => {
          const accuracy = parseFloat(calculateAccuracy(course.stats));
          const progress = parseFloat(calculateProgress(course.stats));
          const accuracyColor = getAccuracyColor(accuracy);

          return (
            <div 
              key={course.course_id}
              className="p-6 rounded-xl border-2 transition-all hover:shadow-xl hover:scale-105"
              style={{ 
                borderColor: getColor('primary', '#3b82f6'),
                backgroundColor: getColor('secondaryBackground', '#f8f9fa')
              }}
            >
              {/* Course Title */}
              <h3 className="text-lg font-bold qe-text-primary mb-4 line-clamp-2">
                {course.course_title}
              </h3>

              {/* Stats Grid */}
              <div className="space-y-4">
                {/* Accuracy */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5" style={{ color: accuracyColor }} />
                    <span className="text-sm font-medium qe-text-secondary">Precisión</span>
                  </div>
                  <span className="text-xl font-bold" style={{ color: accuracyColor }}>
                    {accuracy}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${accuracy}%`,
                      backgroundColor: accuracyColor
                    }}
                  />
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: getColor('primary', '#3b82f6') }} />
                    <span className="text-sm font-medium qe-text-secondary">Completado</span>
                  </div>
                  <span className="text-xl font-bold" style={{ color: getColor('primary', '#3b82f6') }}>
                    {progress}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: getColor('primary', '#3b82f6')
                    }}
                  />
                </div>

                {/* Questions breakdown */}
                <div className="pt-4 border-t-2" style={{ borderColor: getColor('secondary', '#e5e7eb') }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 qe-text-secondary" />
                    <span className="text-sm font-medium qe-text-secondary">Desglose</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded" style={{ backgroundColor: '#10b98120' }}>
                      <p className="text-xs qe-text-secondary">Correctas</p>
                      <p className="text-lg font-bold" style={{ color: '#10b981' }}>
                        {course.stats.correct_answers}
                      </p>
                    </div>
                    <div className="p-2 rounded" style={{ backgroundColor: '#ef444420' }}>
                      <p className="text-xs qe-text-secondary">Incorrectas</p>
                      <p className="text-lg font-bold" style={{ color: '#ef4444' }}>
                        {course.stats.incorrect_answers}
                      </p>
                    </div>
                    <div className="p-2 rounded" style={{ backgroundColor: '#94a3b820' }}>
                      <p className="text-xs qe-text-secondary">Pendientes</p>
                      <p className="text-lg font-bold" style={{ color: '#94a3b8' }}>
                        {course.stats.unanswered}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!selectedCourse && displayCourses.length > 0 && (
        <div className="mt-6 p-4 rounded-lg text-center" 
             style={{ backgroundColor: getColor('secondary', '#f3f4f6') }}>
          <p className="qe-text-secondary">
            📚 Tienes <strong className="qe-text-primary">{displayCourses.length}</strong> curso{displayCourses.length !== 1 ? 's' : ''} en progreso
          </p>
        </div>
      )}
    </div>
  );
};

export default CourseStatsGrid;
