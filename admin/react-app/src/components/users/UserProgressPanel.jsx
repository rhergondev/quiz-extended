import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Trophy,
  BarChart3,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  Target,
  Award,
  Activity,
  X,
  Download,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useUsers from '../../hooks/useUsers';
import QEButton from '../common/QEButton';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Panel para mostrar el progreso y estadísticas de un usuario
 */
const UserProgressPanel = ({
  userId,
  onCancel,
  availableCourses = [],
  isCollapsed = false,
  className = ''
}) => {
  const { theme } = useTheme();
  const { getUser, getUserProgress, updating } = useUsers({ autoFetch: false });

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all'); // 'all', 'month', 'week'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'courses', 'achievements'

  // --- EFFECTS ---
  useEffect(() => {
    if (userId) {
      loadProgressData();
    }
  }, [userId, selectedTimeframe]);

  // --- DATA LOADING ---
  const loadProgressData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log('📊 Loading progress data for user:', userId);
      
      // Load user data and progress data in parallel
      const [user, progress] = await Promise.all([
        getUser(userId),
        getUserProgress(userId, selectedTimeframe)
      ]);

      setUserData(user);
      setProgressData(progress);
      
      console.log('✅ Progress data loaded:', { user, progress });
    } catch (error) {
      console.error('❌ Error loading progress data:', error);
      // Keep any existing data in case of error
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing progress data...');
    loadProgressData();
  };

  const handleExportProgress = () => {
    // TODO: Implement CSV export of progress data
    console.log('Exporting progress data for user:', userId);
  };

  // --- COMPUTED VALUES ---
  const displayName = userData?.name || `${userData?.first_name} ${userData?.last_name}`.trim() || userData?.username;
  const avatarUrl = userData?.avatar_urls?.[48] || userData?.avatar_urls?.[96];

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-500 bg-green-100';
    if (progress >= 50) return 'text-yellow-500 bg-yellow-100';
    if (progress >= 20) return 'text-orange-500 bg-orange-100';
    return 'text-red-500 bg-red-100';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'courses', label: 'Course Progress', icon: BookOpen },
    { id: 'achievements', label: 'Achievements', icon: Award }
  ];

  // --- RENDER ---
  if (loading || updating) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Progress</p>
            <p className="text-xs text-gray-500">
              {progressData?.overall?.averageProgress || 0}% avg
            </p>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {progressData?.overall?.completedCourses || 0}
              </div>
              <div className="text-xs text-gray-500">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {progressData?.overall?.certificatesEarned || 0}
              </div>
              <div className="text-xs text-gray-500">Certificates</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {progressData?.overall?.totalTimeSpent ? formatTime(progressData.overall.totalTimeSpent) : '0m'}
              </div>
              <div className="text-xs text-gray-500">Study Time</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Learning Progress</h2>
              <p className="text-sm text-gray-500">{displayName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <QEButton
              onClick={handleExportProgress}
              variant="ghost"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </QEButton>
            <QEButton
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </QEButton>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Timeframe Filter */}
        <div className="mt-4 flex space-x-2">
          {[
            { value: 'all', label: 'All Time' },
            { value: 'month', label: 'This Month' },
            { value: 'week', label: 'This Week' }
          ].map((timeframe) => (
            <button
              key={timeframe.value}
              onClick={() => setSelectedTimeframe(timeframe.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedTimeframe === timeframe.value
                  ? 'qe-bg-primary qe-text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {timeframe.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'qe-border-primary qe-text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && progressData?.overall && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Average Progress</p>
                    <p className="text-2xl font-bold text-blue-600">{progressData.overall.averageProgress}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {progressData.overall.completedCourses}/{progressData.overall.totalCourses}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Time Spent</p>
                    <p className="text-2xl font-bold text-purple-600">{formatTime(progressData.overall.totalTimeSpent)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Certificates</p>
                    <p className="text-2xl font-bold text-yellow-600">{progressData.overall.certificatesEarned}</p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Weekly Activity Chart */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Activity</h3>
              <div className="flex items-end justify-between h-32 space-x-2">
                {progressData.weeklyActivity?.map((day, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className="qe-bg-primary rounded-t-sm w-full transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${Math.max((day.minutes / 120) * 100, 5)}%`,
                        minHeight: day.minutes > 0 ? '4px' : '2px'
                      }}
                      title={`${day.minutes} minutes`}
                    />
                    <span className="text-xs text-gray-500 mt-2">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courses' && progressData?.courses && (
          <div className="space-y-4">
            {progressData.courses.map((course) => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{course.title}</h3>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(course.timeSpent)}
                      </span>
                      <span className="flex items-center">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {course.lessonsCompleted}/{course.totalLessons} lessons
                      </span>
                      <span className="flex items-center">
                        <Activity className="h-3 w-3 mr-1" />
                        {new Date(course.lastActivity).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {course.completed ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Trophy className="h-3 w-3 mr-1" />
                        Completed
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProgressColor(course.progress)}`}>
                        {course.progress}%
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        course.completed ? 'bg-green-500' : 'qe-bg-accent'
                      }`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && progressData?.achievements && (
          <div className="space-y-4">
            {progressData.achievements.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No achievements yet</p>
                <p className="text-sm text-gray-400">Complete courses and lessons to earn achievements</p>
              </div>
            ) : (
              progressData.achievements.map((achievement) => (
                <div key={achievement.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Award className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{achievement.description}</p>
                      <div className="flex items-center text-xs text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        Earned on {new Date(achievement.earnedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProgressPanel;