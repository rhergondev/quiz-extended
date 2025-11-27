import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import useCourse from '../../hooks/useCourse';
import CoursePageTemplate from '../../components/course/CoursePageTemplate';
import { getCourseProgress } from '../../api/services/studentProgressService';
import { getMyRankingStatus } from '../../api/services/courseRankingService';
import { ClipboardList, FileText, Video, Trophy, TrendingUp, Target, Award, Users } from 'lucide-react';

const CourseDashboardPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { formatScore } = useScoreFormat();
  
  const { course, loading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || t('courses.title');
  const [courseProgress, setCourseProgress] = useState(null);
  const [rankingStatus, setRankingStatus] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(true);

  // Dark mode aware colors (same pattern as StatisticsPage)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#1a202c'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    if (courseId) {
      getCourseProgress(courseId)
        .then(progress => setCourseProgress(progress))
        .catch(error => console.error('Error loading course progress:', error));
      
      // Fetch ranking status
      setRankingLoading(true);
      getMyRankingStatus(courseId)
        .then(response => {
          setRankingStatus(response.data);
          setRankingLoading(false);
        })
        .catch(error => {
          console.error('Error loading ranking status:', error);
          setRankingLoading(false);
        });
    }
  }, [courseId]);

  // Componente de Donut Chart mejorado
  const DonutChart = ({ completed, total, icon: Icon, label, color }) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative" style={{ width: '110px', height: '110px' }}>
          <svg className="transform -rotate-90" width="110" height="110">
            {/* Background circle */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : `${color}20`}
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon size={20} style={{ color }} className="mb-1" />
            <span className="text-sm font-bold" style={{ color: pageColors.text }}>
              {completed}/{total}
            </span>
          </div>
        </div>
        <span className="text-xs font-medium mt-2 text-center" style={{ color: pageColors.textMuted }}>
          {label}
        </span>
      </div>
    );
  };

  // Stat Card Component
  const StatCard = ({ icon: Icon, label, value, subValue, color, highlight }) => (
    <div 
      className={`rounded-xl p-4 transition-all duration-200 ${highlight ? 'ring-2' : ''}`}
      style={{ 
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${color}08`,
        ringColor: highlight ? color : 'transparent'
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: isDarkMode ? `${color}20` : `${color}15` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: pageColors.textMuted }}>
            {label}
          </p>
          <p className="text-xl font-bold" style={{ color: pageColors.text }}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs" style={{ color: pageColors.textMuted }}>
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const stepsByType = courseProgress?.steps_by_type || {};
  const totalSteps = courseProgress?.total_steps || 0;
  const completedSteps = courseProgress?.completed_steps || 0;
  const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Calcular qué tipos de contenido están disponibles
  const availableContentTypes = useMemo(() => {
    const types = [];
    
    if ((stepsByType.quiz?.total || 0) > 0) {
      types.push({
        type: 'quiz',
        completed: stepsByType.quiz.completed,
        total: stepsByType.quiz.total,
        icon: ClipboardList,
        label: t('courses.tests'),
        color: pageColors.primary
      });
    }
    
    const materialTotal = (stepsByType.text?.total || 0) + (stepsByType.pdf?.total || 0);
    if (materialTotal > 0) {
      types.push({
        type: 'material',
        completed: (stepsByType.text?.completed || 0) + (stepsByType.pdf?.completed || 0),
        total: materialTotal,
        icon: FileText,
        label: t('courses.supportMaterial'),
        color: '#10b981'
      });
    }
    
    if ((stepsByType.video?.total || 0) > 0) {
      types.push({
        type: 'video',
        completed: stepsByType.video.completed,
        total: stepsByType.video.total,
        icon: Video,
        label: t('courses.videosSection'),
        color: '#8b5cf6'
      });
    }
    
    return types;
  }, [stepsByType, t, pageColors.primary]);

  if (loading) {
    return (
      <div 
        className="p-6 min-h-full w-full flex items-center justify-center" 
        style={{ backgroundColor: pageColors.secondaryBg }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: pageColors.primary }}
          ></div>
          <p className="mt-4" style={{ color: pageColors.textMuted }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.dashboard')}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6">
        {/* Progress Overview Bar */}
        <div 
          className="rounded-xl p-4 border"
          style={{ 
            backgroundColor: pageColors.cardBg,
            borderColor: pageColors.border
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={18} style={{ color: pageColors.primary }} />
              <span className="font-semibold" style={{ color: pageColors.text }}>
                {t('courses.overallProgress')}
              </span>
            </div>
            <span className="text-2xl font-bold" style={{ color: pageColors.primary }}>
              {overallProgress}%
            </span>
          </div>
          <div 
            className="w-full h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}15` }}
          >
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${overallProgress}%`,
                backgroundColor: pageColors.primary
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: pageColors.textMuted }}>
            <span>{completedSteps} {t('courses.completed')}</span>
            <span>{totalSteps - completedSteps} {t('courses.remaining')}</span>
          </div>
        </div>

        {/* Main Grid: Ranking + Content Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ranking Card */}
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ 
              backgroundColor: pageColors.cardBg,
              borderColor: pageColors.border
            }}
          >
            {/* Header */}
            <div 
              className="px-4 py-3"
              style={{ backgroundColor: pageColors.primary }}
            >
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-white" />
                <span className="font-semibold text-white text-sm">
                  {t('ranking.yourPosition')}
                </span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {rankingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div 
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: pageColors.primary }}
                  ></div>
                </div>
              ) : rankingStatus && rankingStatus.has_completed_all ? (
                <div className="text-center space-y-4">
                  <div 
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full"
                    style={{ backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.accent}15` }}
                  >
                    <span className="text-3xl font-bold" style={{ color: pageColors.accent }}>
                      #{rankingStatus.position || rankingStatus.temporary_position || '?'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp size={16} style={{ color: pageColors.primary }} />
                      <span className="text-lg font-bold" style={{ color: pageColors.text }}>
                        {formatScore(rankingStatus.average_score || 0)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: pageColors.textMuted }}>
                      {t('ranking.averageScore')}
                    </p>
                  </div>

                  <div 
                    className="pt-4 border-t flex items-center justify-center gap-2"
                    style={{ borderColor: pageColors.border }}
                  >
                    <Users size={14} style={{ color: pageColors.textMuted }} />
                    <span className="text-xs" style={{ color: pageColors.textMuted }}>
                      {rankingStatus.completed_quizzes}/{rankingStatus.total_quizzes} {t('ranking.quizzesCompleted')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div 
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
                  >
                    <Trophy size={32} style={{ color: pageColors.textMuted }} />
                  </div>
                  
                  <div>
                    <span 
                      className="inline-block px-3 py-1 text-xs font-semibold rounded-full"
                      style={{ 
                        backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.accent}15`,
                        color: pageColors.accent
                      }}
                    >
                      {t('ranking.pending')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: pageColors.text }}>
                      {rankingStatus?.completed_quizzes || 0} / {rankingStatus?.total_quizzes || 0}
                    </p>
                    <p className="text-xs" style={{ color: pageColors.textMuted }}>
                      {t('ranking.quizzesCompleted')}
                    </p>
                  </div>

                  <p className="text-xs px-2" style={{ color: pageColors.textMuted }}>
                    {t('ranking.completeAllQuizzes')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Content Progress Card */}
          <div 
            className="lg:col-span-2 rounded-xl border overflow-hidden"
            style={{ 
              backgroundColor: pageColors.cardBg,
              borderColor: pageColors.border
            }}
          >
            {/* Header */}
            <div 
              className="px-4 py-3"
              style={{ backgroundColor: pageColors.primary }}
            >
              <div className="flex items-center gap-2">
                <Award size={18} className="text-white" />
                <span className="font-semibold text-white text-sm">
                  {t('courses.contentProgress')}
                </span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4">
              {availableContentTypes.length > 0 ? (
                <div className={`grid gap-4 ${
                  availableContentTypes.length === 1 ? 'grid-cols-1' :
                  availableContentTypes.length === 2 ? 'grid-cols-2' :
                  'grid-cols-1 sm:grid-cols-3'
                }`}>
                  {availableContentTypes.map((contentType) => (
                    <DonutChart
                      key={contentType.type}
                      completed={contentType.completed}
                      total={contentType.total}
                      icon={contentType.icon}
                      label={contentType.label}
                      color={contentType.color}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <ClipboardList size={48} style={{ color: pageColors.textMuted }} className="mb-3 opacity-50" />
                  <p className="text-sm font-medium" style={{ color: pageColors.textMuted }}>
                    {t('courses.noContent')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                    {t('courses.noContentDescription')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        {availableContentTypes.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              label={t('courses.totalProgress')}
              value={`${overallProgress}%`}
              color={pageColors.primary}
            />
            <StatCard
              icon={ClipboardList}
              label={t('courses.testsCompleted')}
              value={`${stepsByType.quiz?.completed || 0}/${stepsByType.quiz?.total || 0}`}
              color={pageColors.primary}
            />
            {rankingStatus && (
              <StatCard
                icon={TrendingUp}
                label={t('ranking.averageScore')}
                value={formatScore(rankingStatus.average_score || 0)}
                color={pageColors.accent}
                highlight={rankingStatus.has_completed_all}
              />
            )}
            {rankingStatus && rankingStatus.has_completed_all && (
              <StatCard
                icon={Trophy}
                label={t('ranking.yourPosition')}
                value={`#${rankingStatus.position || rankingStatus.temporary_position || '?'}`}
                color={pageColors.accent}
                highlight
              />
            )}
          </div>
        )}
      </div>
    </CoursePageTemplate>
  );
};

export default CourseDashboardPage;
