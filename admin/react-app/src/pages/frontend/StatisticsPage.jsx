// admin/react-app/src/pages/frontend/StatisticsPage.jsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionStatsChart from '../../components/frontend/statistics/QuestionStatsChart';
import WeakLessonsPanel from '../../components/frontend/statistics/WeakLessonsPanel';
import PerformanceComparison from '../../components/frontend/statistics/PerformanceComparison';
import CourseStatsGrid from '../../components/frontend/statistics/CourseStatsGrid';
import ProgressOverTime from '../../components/frontend/statistics/ProgressOverTime';
import StatsFilters from '../../components/frontend/statistics/StatsFilters';
import { TrendingUp, Award, Target, BarChart3 } from 'lucide-react';

const StatisticsPage = () => {
  const { getColor } = useTheme();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // all, week, month, year
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, [selectedCourse, timeRange]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // TODO: Remove fake data when API is ready
      const useFakeData = true; // Cambiar a false cuando la API esté lista
      
      if (useFakeData) {
        // Datos de ejemplo para visualización
        setTimeout(() => {
          setStatsData({
            total_questions: 150,
            correct_answers: 95,
            incorrect_answers: 40,
            unanswered: 15
          });
          setLoading(false);
        }, 500);
        return;
      }

      const params = new URLSearchParams();
      if (selectedCourse) {
        params.append('course_id', selectedCourse);
      }
      
      const response = await fetch(
        `${window.qe_data.rest_url}quiz-extended/v1/user-stats/questions?${params}`,
        {
          headers: {
            'X-WP-Nonce': window.qe_data.nonce,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch statistics');
      
      const data = await response.json();
      setStatsData(data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Fallback to fake data on error
      setStatsData({
        total_questions: 150,
        correct_answers: 95,
        incorrect_answers: 40,
        unanswered: 15
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAccuracy = () => {
    if (!statsData || statsData.total_questions === 0) return 0;
    return ((statsData.correct_answers / statsData.total_questions) * 100).toFixed(1);
  };

  const calculateProgress = () => {
    if (!statsData || statsData.total_questions === 0) return 0;
    const answered = statsData.correct_answers + statsData.incorrect_answers;
    return ((answered / statsData.total_questions) * 100).toFixed(1);
  };

  return (
    <div className="min-h-full" style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}>
      <div className="container mx-auto p-6 space-y-8 max-w-full">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-10 h-10" style={{ color: getColor('primary', '#3b82f6') }} />
            <h1 className="text-4xl font-bold qe-text-primary">
              Mis Estadísticas
            </h1>
          </div>
          <p className="text-lg qe-text-secondary">
            Analiza tu rendimiento y compáralo con otros estudiantes
          </p>
        </header>

      {/* Filters */}
      <StatsFilters
        selectedCourse={selectedCourse}
        setSelectedCourse={setSelectedCourse}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2" 
               style={{ borderColor: getColor('primary', '#3b82f6') }}></div>
        </div>
      ) : (
        <>
          {/* Main Layout: 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Stats Charts */}
            <div className="lg:col-span-2 space-y-6 flex flex-col">
              {/* Performance Comparison - Full Width */}
              <PerformanceComparison 
                userAccuracy={parseFloat(calculateAccuracy())}
                selectedCourse={selectedCourse}
              />

              {/* Question Stats & Progress - 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                {/* Question Stats Donut Chart */}
                <QuestionStatsChart statsData={statsData} />

                {/* Progress Over Time */}
                <ProgressOverTime 
                  selectedCourse={selectedCourse}
                  timeRange={timeRange}
                />
              </div>
            </div>

            {/* Right Column: Weak Lessons Panel */}
            <div className="lg:col-span-1 flex flex-col">
              <WeakLessonsPanel selectedCourse={selectedCourse} />
            </div>
          </div>

          {/* Course Stats Grid - Full Width */}
          <CourseStatsGrid selectedCourse={selectedCourse} />
        </>
      )}
      </div>
    </div>
  );
};

export default StatisticsPage;
