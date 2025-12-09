// admin/react-app/src/pages/frontend/StatisticsPage.jsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionStatsChart from '../../components/frontend/statistics/QuestionStatsChart';
import WeakLessonsPanel from '../../components/frontend/statistics/WeakLessonsPanel';
import PerformanceComparison from '../../components/frontend/statistics/PerformanceComparison';
import ProgressOverTime from '../../components/frontend/statistics/ProgressOverTime';
import StatsFilters from '../../components/frontend/statistics/StatsFilters';
import { BarChart3, PieChart, BookOpen } from 'lucide-react';

const StatisticsPage = () => {
  const { getColor, isDarkMode } = useTheme();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' or 'lessons'

  // Dark mode colors - improved
  const pageColors = {
    text: isDarkMode ? '#f9fafb' : '#1a202c',
    textMuted: isDarkMode ? '#9ca3af' : '#6b7280',
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: isDarkMode ? '#1f2937' : '#ffffff',
    secondaryBg: isDarkMode ? '#111827' : '#f3f4f6',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    cardBg: isDarkMode ? '#1f2937' : '#ffffff',
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
    <div className="h-full flex flex-col" style={{ backgroundColor: pageColors.secondaryBg }}>
      <div className="container mx-auto px-3 py-3 max-w-7xl flex-1 flex flex-col min-h-0">
        {/* Compact Header with inline filters */}
        <div 
          className="flex-shrink-0 px-3 py-2 rounded-lg mb-3"
          style={{ 
            backgroundColor: pageColors.cardBg,
            border: `1px solid ${pageColors.border}`
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Title */}
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: pageColors.primary }} />
              <h1 className="text-sm font-bold" style={{ color: pageColors.text }}>
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
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
                 style={{ borderColor: pageColors.primary }}></div>
          </div>
        ) : (
          /* Main Layout: Single row with everything */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
            
            {/* Left: Donut Chart - Compact (3 cols) */}
            <div className="lg:col-span-3">
              <QuestionStatsChart 
                statsData={statsData} 
                compact={true}
                isDarkMode={isDarkMode}
                pageColors={pageColors}
                mini={true}
              />
            </div>

            {/* Center: Tabs for Questions/Lessons Analysis (5 cols) */}
            <div className="lg:col-span-5 flex flex-col min-h-0">
              {/* Tabs */}
              <div 
                className="flex-shrink-0 flex gap-1 p-1 rounded-lg mb-2"
                style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}
              >
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all`}
                  style={{ 
                    backgroundColor: activeTab === 'questions' ? pageColors.cardBg : 'transparent',
                    color: activeTab === 'questions' ? pageColors.primary : pageColors.textMuted,
                    boxShadow: activeTab === 'questions' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <PieChart size={12} />
                  Evolución
                </button>
                <button
                  onClick={() => setActiveTab('lessons')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all`}
                  style={{ 
                    backgroundColor: activeTab === 'lessons' ? pageColors.cardBg : 'transparent',
                    color: activeTab === 'lessons' ? pageColors.accent : pageColors.textMuted,
                    boxShadow: activeTab === 'lessons' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <BookOpen size={12} />
                  Repasar
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0">
                {activeTab === 'questions' ? (
                  <ProgressOverTime 
                    selectedCourse={selectedCourse}
                    timeRange={timeRange}
                    compact={true}
                    isDarkMode={isDarkMode}
                    pageColors={pageColors}
                  />
                ) : (
                  <WeakLessonsPanel 
                    selectedCourse={selectedCourse}
                    compact={true}
                    isDarkMode={isDarkMode}
                    pageColors={pageColors}
                  />
                )}
              </div>
            </div>

            {/* Right: Performance Comparison (4 cols) */}
            <div className="lg:col-span-4">
              <PerformanceComparison 
                userAccuracy={parseFloat(calculateAccuracy())}
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
