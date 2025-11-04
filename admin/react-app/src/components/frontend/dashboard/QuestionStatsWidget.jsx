import React, { useState, useMemo, useEffect } from 'react';
import { BarChart2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import useCourses from '../../../hooks/useCourses';
import { getApiConfig } from '../../../api/config/apiConfig';
import { makeApiRequest } from '../../../api/services/baseService';

const QuestionStatsWidget = () => {
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    unanswered: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const { courses, loading: coursesLoading } = useCourses({
    autoFetch: true,
    perPage: 100
  });

  // Fetch statistics from the API
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const config = getApiConfig();
        const params = selectedCourseId !== 'all' ? `?course_id=${selectedCourseId}` : '';
        const response = await makeApiRequest(`${config.apiUrl}/quiz-extended/v1/user-stats/questions${params}`);
        
        setStats({
          totalQuestions: response.data.total_questions || 0,
          correctAnswers: response.data.correct_answers || 0,
          incorrectAnswers: response.data.incorrect_answers || 0,
          unanswered: response.data.unanswered || 0
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setStats({
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          unanswered: 0
        });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [selectedCourseId]);

  const loading = coursesLoading || loadingStats;

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
      <div className="px-4 pb-3 pt-2">
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
        ) : stats.totalQuestions === 0 ? (
          <div className="text-center py-8">
            <BarChart2 className="w-12 h-12 qe-text-secondary mx-auto mb-3 opacity-30" />
            <p className="text-sm qe-text-secondary">
              {selectedCourseId === 'all' 
                ? 'No has respondido ninguna pregunta aún'
                : 'No has respondido preguntas de este curso'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Total Questions */}
            <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium qe-text-secondary">Total</span>
                <BarChart2 className="w-4 h-4 qe-text-primary" />
              </div>
              <div className="text-2xl font-bold qe-text-primary">{stats.totalQuestions}</div>
              <div className="text-xs qe-text-secondary mt-1">Preguntas</div>
            </div>

            {/* Correct Answers */}
            <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium qe-text-secondary">Correctas</span>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.correctAnswers}</div>
              <div className="text-xs qe-text-secondary mt-1">
                {stats.totalQuestions > 0 ? `${Math.round((stats.correctAnswers / stats.totalQuestions) * 100)}%` : '0%'}
              </div>
            </div>

            {/* Incorrect Answers */}
            <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium qe-text-secondary">Incorrectas</span>
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.incorrectAnswers}</div>
              <div className="text-xs qe-text-secondary mt-1">
                {stats.totalQuestions > 0 ? `${Math.round((stats.incorrectAnswers / stats.totalQuestions) * 100)}%` : '0%'}
              </div>
            </div>

            {/* Unanswered */}
            <div className="qe-bg-primary-light rounded-lg p-3 border qe-border-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium qe-text-secondary">Sin Contestar</span>
                <HelpCircle className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-2xl font-bold text-gray-600">{stats.unanswered}</div>
              <div className="text-xs qe-text-secondary mt-1">
                {stats.totalQuestions > 0 ? `${Math.round((stats.unanswered / stats.totalQuestions) * 100)}%` : '0%'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionStatsWidget;
