// admin/react-app/src/pages/frontend/StatisticsPage.jsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionStatsChart from '../../components/frontend/statistics/QuestionStatsChart';
import WeakLessonsPanel from '../../components/frontend/statistics/WeakLessonsPanel';
import PerformanceComparison from '../../components/frontend/statistics/PerformanceComparison';
import ProgressOverTime from '../../components/frontend/statistics/ProgressOverTime';
import StatsFilters from '../../components/frontend/statistics/StatsFilters';
import { BarChart3 } from 'lucide-react';

const StatisticsPage = () => {
  const { getColor, isDarkMode } = useTheme();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dark mode colors
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
  };

  useEffect(() => {
    fetchStatistics();
  }, [selectedCourse, timeRange]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
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
      console.log('Stats API Response:', data);
      setStatsData(data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Fallback to empty data on error
      setStatsData({
        total_questions: 0,
        correct_answers: 0,
        incorrect_answers: 0,
        unanswered: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAccuracy = () => {
    if (!statsData || statsData.total_questions === 0) return 0;
    return ((statsData.correct_answers / statsData.total_questions) * 100).toFixed(1);
  };

  return (
    <div className="min-h-full pt-8" style={{ backgroundColor: pageColors.secondaryBg }}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Compact Header with inline filters */}
        <div 
          className="p-4 rounded-lg border mb-4"
          style={{ 
            backgroundColor: pageColors.background,
            borderColor: isDarkMode ? pageColors.primary + '40' : '#e5e7eb'
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: pageColors.primary }} />
              <h1 className="text-lg font-bold" style={{ color: pageColors.text }}>
                Mis Estadísticas
              </h1>
            </div>
            
            {/* Inline Filters */}
            <StatsFilters
              selectedCourse={selectedCourse}
              setSelectedCourse={setSelectedCourse}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              compact={true}
              isDarkMode={isDarkMode}
              pageColors={pageColors}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2" 
                 style={{ borderColor: pageColors.primary }}></div>
          </div>
        ) : (
          /* Main Layout: 2 columns - Charts left, Info right */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Column: Charts (3/5 width) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Question Stats Donut - Compact */}
              <QuestionStatsChart 
                statsData={statsData} 
                compact={true}
                isDarkMode={isDarkMode}
                pageColors={pageColors}
              />

              {/* Progress Over Time - Compact */}
              <ProgressOverTime 
                selectedCourse={selectedCourse}
                timeRange={timeRange}
                compact={true}
                isDarkMode={isDarkMode}
                pageColors={pageColors}
              />
            </div>

            {/* Right Column: Performance + Weak Lessons (2/5 width) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Performance Comparison - Compact */}
              <PerformanceComparison 
                userAccuracy={parseFloat(calculateAccuracy())}
                selectedCourse={selectedCourse}
                compact={true}
                isDarkMode={isDarkMode}
                pageColors={pageColors}
              />

              {/* Weak Lessons Panel - Compact */}
              <WeakLessonsPanel 
                selectedCourse={selectedCourse}
                compact={true}
                isDarkMode={isDarkMode}
                pageColors={pageColors}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;
