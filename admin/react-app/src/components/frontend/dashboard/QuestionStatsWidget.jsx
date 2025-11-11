import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourses from '../../../hooks/useCourses';
import { getApiConfig } from '../../../api/config/apiConfig';
import { makeApiRequest } from '../../../api/services/baseService';
import QuestionStatsChart from '../statistics/QuestionStatsChart';

const QuestionStatsWidget = () => {
  const { getColor } = useTheme();
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
        const url = `${config.apiUrl}/quiz-extended/v1/user-stats/questions${params}`;
        
        console.log('📊 Fetching user stats from:', url);
        const response = await makeApiRequest(url);
        console.log('📊 User stats response:', response);
        console.log('📊 Response data:', response.data);
        
        // Handle different response structures
        const data = response.data?.data || response.data || {};
        console.log('📊 Extracted data:', data);
        
        setStats({
          totalQuestions: data.total_questions || 0,
          correctAnswers: data.correct_answers || 0,
          incorrectAnswers: data.incorrect_answers || 0,
          unanswered: data.unanswered || 0
        });
        
        console.log('📊 Final stats state:', {
          totalQuestions: data.total_questions || 0,
          correctAnswers: data.correct_answers || 0,
          incorrectAnswers: data.incorrect_answers || 0,
          unanswered: data.unanswered || 0
        });
      } catch (error) {
        console.error('❌ Error fetching user stats:', error);
        console.error('Error details:', error.response || error.message);
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
    <div 
      className="p-6 rounded-xl shadow-lg border-2 h-full flex flex-col" 
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
          <h2 className="text-xl font-bold qe-text-primary">Estadísticas</h2>
        </div>
        
        <Link
          to="/statistics"
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all"
          style={{ backgroundColor: getColor('primary', '#3b82f6') }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = getColor('accent', '#f59e0b');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6');
          }}
        >
          Ver todas
        </Link>
      </div>

      {/* Course Filter */}
      <div className="pb-4">
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full px-3 py-2 text-sm border qe-border-primary rounded-lg qe-text-primary focus:outline-none focus:ring-2"
          style={{ 
            backgroundColor: getColor('background', '#ffffff'),
            '--tw-ring-color': getColor('primary', '#3b82f6')
          }}
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
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 qe-text-secondary">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
              style={{ borderColor: getColor('primary', '#3b82f6') }}
            ></div>
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
          <div className="h-full">
            <QuestionStatsChart 
              compact={true}
              statsData={{
                correct_answers: stats.correctAnswers,
                incorrect_answers: stats.incorrectAnswers,
                unanswered: stats.unanswered,
                total_questions: stats.totalQuestions
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionStatsWidget;
