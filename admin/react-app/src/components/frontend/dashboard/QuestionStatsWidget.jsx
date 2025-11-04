import React, { useState, useMemo } from 'react';
import { BarChart2, TrendingUp, Target, Award } from 'lucide-react';
import useQuestions from '../../../hooks/useQuestions';
import useCourses from '../../../hooks/useCourses';

const QuestionStatsWidget = () => {
  const [selectedCourseId, setSelectedCourseId] = useState('all');

  const { courses, loading: coursesLoading } = useCourses({
    autoFetch: true,
    perPage: 100
  });

  const { questions, loading: questionsLoading } = useQuestions({
    autoFetch: true,
    perPage: 100
  });

  // Filter questions by course
  const filteredQuestions = useMemo(() => {
    if (selectedCourseId === 'all') return questions;
    
    return questions.filter(q => {
      const questionCourses = q.meta?._course_ids || [];
      return questionCourses.includes(parseInt(selectedCourseId));
    });
  }, [questions, selectedCourseId]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!filteredQuestions.length) {
      return {
        total: 0,
        byDifficulty: {},
        byCategory: {},
        avgPoints: 0
      };
    }

    const byDifficulty = {};
    const byCategory = {};
    let totalPoints = 0;

    filteredQuestions.forEach(q => {
      // Difficulty
      const difficulty = q.meta?._difficulty || 'Sin clasificar';
      byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;

      // Category (from taxonomies)
      const categories = q._embedded?.['wp:term']?.[0] || [];
      if (categories.length > 0) {
        categories.forEach(cat => {
          byCategory[cat.name] = (byCategory[cat.name] || 0) + 1;
        });
      } else {
        byCategory['Sin categoría'] = (byCategory['Sin categoría'] || 0) + 1;
      }

      // Points
      const points = parseInt(q.meta?._points) || 0;
      totalPoints += points;
    });

    return {
      total: filteredQuestions.length,
      byDifficulty,
      byCategory,
      avgPoints: filteredQuestions.length > 0 ? (totalPoints / filteredQuestions.length).toFixed(1) : 0
    };
  }, [filteredQuestions]);

  const loading = coursesLoading || questionsLoading;

  // Get top difficulty
  const topDifficulty = useMemo(() => {
    if (!Object.keys(stats.byDifficulty).length) return null;
    return Object.entries(stats.byDifficulty).sort((a, b) => b[1] - a[1])[0];
  }, [stats.byDifficulty]);

  // Get top category
  const topCategory = useMemo(() => {
    if (!Object.keys(stats.byCategory).length) return null;
    return Object.entries(stats.byCategory).sort((a, b) => b[1]  - a[1])[0];
  }, [stats.byCategory]);

  return (
    <div className="rounded-lg shadow-sm border qe-border-primary h-full flex flex-col" style={{ backgroundColor: 'var(--qe-bg-card)' }}>
      {/* Header */}
      <div className="p-4 pb-3 border-b qe-border-primary mx-4">
        <div className="flex items-center gap-3">
          <div className="p-2 qe-bg-primary-light rounded-lg">
            <BarChart2 className="w-5 h-5 qe-text-primary" />
          </div>
          <h2 className="text-lg font-bold qe-text-primary">Estadísticas de Preguntas</h2>
        </div>
      </div>

      {/* Course Filter */}
      <div className="px-4 pb-3">
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full px-3 py-2 text-sm border qe-border-primary rounded-lg qe-text-primary focus:outline-none focus:ring-2 focus:qe-ring-accent"
          style={{ backgroundColor: 'var(--qe-bg-primary-light)' }}
          disabled={coursesLoading}
        >
          <option value="all">Todos los cursos</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.title?.rendered || course.title || `Curso ${course.id}`}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="p-4 pt-0 pb-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 qe-text-secondary">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 qe-border-primary mx-auto mb-2"></div>
            <p className="text-sm">Cargando estadísticas...</p>
          </div>
        ) : stats.total === 0 ? (
          <div className="text-center py-8">
            <BarChart2 className="w-12 h-12 qe-text-secondary mx-auto mb-3 opacity-30" />
            <p className="text-sm qe-text-secondary">
              {selectedCourseId === 'all' 
                ? 'No hay preguntas disponibles'
                : 'No hay preguntas para este curso'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Total Questions */}
            <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium qe-text-secondary">Total</span>
                <Target className="w-4 h-4 qe-text-primary" />
              </div>
              <div className="text-2xl font-bold qe-text-primary">{stats.total}</div>
              <div className="text-xs qe-text-secondary mt-1">Preguntas</div>
            </div>

            {/* Average Points */}
            <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium qe-text-secondary">Promedio</span>
                <TrendingUp className="w-4 h-4 qe-text-primary" />
              </div>
              <div className="text-2xl font-bold qe-text-primary">{stats.avgPoints}</div>
              <div className="text-xs qe-text-secondary mt-1">Puntos</div>
            </div>

            {/* Top Difficulty */}
            {topDifficulty && (
              <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium qe-text-secondary">Dificultad</span>
                  <Award className="w-4 h-4 qe-text-primary" />
                </div>
                <div className="text-lg font-bold qe-text-primary capitalize">{topDifficulty[0]}</div>
                <div className="text-xs qe-text-secondary mt-1">{topDifficulty[1]} preguntas</div>
              </div>
            )}

            {/* Top Category */}
            {topCategory && (
              <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium qe-text-secondary">Categoría</span>
                  <BarChart2 className="w-4 h-4 qe-text-primary" />
                </div>
                <div className="text-lg font-bold qe-text-primary truncate">{topCategory[0]}</div>
                <div className="text-xs qe-text-secondary mt-1">{topCategory[1]} preguntas</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionStatsWidget;
