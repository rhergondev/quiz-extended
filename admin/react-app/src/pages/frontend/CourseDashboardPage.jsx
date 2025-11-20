import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import useCourse from '../../hooks/useCourse';
import CoursePageTemplate from '../../components/course/CoursePageTemplate';
import { getCourseProgress } from '../../api/services/studentProgressService';
import { getMyRankingStatus } from '../../api/services/courseRankingService';
import { ClipboardList, FileText, Video, Trophy, TrendingUp, Calendar } from 'lucide-react';

const CourseDashboardPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor } = useTheme();
  
  const { course, loading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || t('courses.title');
  const [courseProgress, setCourseProgress] = useState(null);
  const [rankingStatus, setRankingStatus] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(true);

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

  // Componente de Donut Chart simple
    const DonutChart = ({ completed, total, icon: Icon, label, color }) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const radius = 55;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center h-full py-4 sm:py-0">
        <div className="relative" style={{ width: '140px', height: '140px' }}>
          <svg className="transform -rotate-90" width="140" height="140">
            {/* Background circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke={color}
              strokeWidth="10"
              fill="none"
              opacity="0.2"
            />
            {/* Progress circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon size={24} style={{ color }} className="mb-1" />
            <span className="text-sm font-bold" style={{ color }}>
              {completed}/{total}
            </span>
          </div>
        </div>
        <span className="text-xs sm:text-sm font-medium mt-2 sm:mt-3" style={{ color, opacity: 0.8 }}>
          {label}
        </span>
      </div>
    );
  };

  const stepsByType = courseProgress?.steps_by_type || {};
  const totalSteps = courseProgress?.total_steps || 0;
  const completedSteps = courseProgress?.completed_steps || 0;

  // Calcular qué tipos de contenido están disponibles
  const availableContentTypes = useMemo(() => {
    const types = [];
    
    if ((stepsByType.quiz?.total || 0) > 0) {
      types.push({
        type: 'quiz',
        completed: stepsByType.quiz.completed,
        total: stepsByType.quiz.total,
        icon: ClipboardList,
        label: t('courses.tests')
      });
    }
    
    const materialTotal = (stepsByType.text?.total || 0) + (stepsByType.pdf?.total || 0);
    if (materialTotal > 0) {
      types.push({
        type: 'material',
        completed: (stepsByType.text?.completed || 0) + (stepsByType.pdf?.completed || 0),
        total: materialTotal,
        icon: FileText,
        label: t('courses.supportMaterial')
      });
    }
    
    if ((stepsByType.video?.total || 0) > 0) {
      types.push({
        type: 'video',
        completed: stepsByType.video.completed,
        total: stepsByType.video.total,
        icon: Video,
        label: t('courses.videosSection')
      });
    }
    
    return types;
  }, [stepsByType, t]);

  if (loading) {
    return (
      <div 
        className="p-6 min-h-full w-full flex items-center justify-center" 
        style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 qe-border-primary mx-auto"></div>
          <p className="mt-4 qe-text-secondary">{t('common.loading')}</p>
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
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4 sm:space-y-6">
        {/* Primera fila: 3 widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Widget Izquierdo - Ranking */}
          <div 
            className="lg:col-span-1 rounded-lg shadow-sm p-4 sm:p-6 min-h-[200px] flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md"
            style={{ 
              backgroundColor: getColor('background', '#ffffff'),
              borderLeft: `4px solid ${getColor('primary', '#1a202c')}`,
              borderRight: `4px solid ${getColor('primary', '#1a202c')}`
            }}
          >
            {rankingLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: getColor('primary', '#1a202c') }}></div>
                <p className="text-xs mt-2" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                  {t('common.loading')}...
                </p>
              </div>
            ) : rankingStatus && rankingStatus.has_completed_all ? (
              <div className="text-center space-y-2">
                <Trophy size={28} className="sm:w-8 sm:h-8 mx-auto" style={{ color: getColor('primary', '#1a202c') }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                    {t('ranking.yourPosition')}
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold mt-1" style={{ color: getColor('primary', '#1a202c') }}>
                    #{rankingStatus.temporary_position || 'N/A'}
                  </p>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: `${getColor('primary', '#1a202c')}20` }}>
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp size={14} style={{ color: getColor('primary', '#1a202c') }} />
                    <span className="text-xs font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                      {rankingStatus.average_score?.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                    {t('ranking.averageScore')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 sm:space-y-3">
                <Trophy size={28} className="sm:w-8 sm:h-8 mx-auto" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                <div>
                  <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full" style={{ 
                    backgroundColor: '#fbbf2420',
                    color: '#fbbf24'
                  }}>
                    {t('ranking.pending')}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                    {rankingStatus?.completed_quizzes || 0}/{rankingStatus?.total_quizzes || 0}
                  </p>
                  <p className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                    {t('ranking.quizzesCompleted')}
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                  {t('ranking.completeAllQuizzes')}
                </p>
              </div>
            )}
          </div>

          {/* Widget Central - Dinámico según contenido disponible */}
          <div 
            className="lg:col-span-3 rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
            style={{ 
              backgroundColor: getColor('background', '#ffffff'),
              borderLeft: `4px solid ${getColor('primary', '#1a202c')}`,
              borderRight: `4px solid ${getColor('primary', '#1a202c')}`
            }}
          >
            {availableContentTypes.length > 0 ? (
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 h-full min-h-[200px]"
              >
                {availableContentTypes.map((contentType, index) => (
                  <div 
                    key={contentType.type}
                    className={`flex items-center justify-center transition-all duration-200 ${
                      index < availableContentTypes.length - 1 ? 'border-b sm:border-b-0 sm:border-r' : ''
                    } ${
                      availableContentTypes.length === 2 && index === 0 ? 'sm:border-r' : ''
                    }`}
                    style={{ 
                      borderColor: `${getColor('primary', '#1a202c')}20`,
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <DonutChart
                      completed={contentType.completed}
                      total={contentType.total}
                      icon={contentType.icon}
                      label={contentType.label}
                      color={getColor('primary', '#1a202c')}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center">
                  <ClipboardList size={48} className="mx-auto mb-3" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                  <p className="text-sm font-medium" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                    {t('courses.noContent')}
                  </p>
                  <p className="text-xs mt-1" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                    {t('courses.noContentDescription')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Widget Derecho - Próximo Evento */}
          <div 
            className="lg:col-span-1 rounded-lg shadow-sm p-4 sm:p-6 min-h-[200px] flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md"
            style={{ 
              backgroundColor: getColor('background', '#ffffff'),
              borderLeft: `4px solid ${getColor('primary', '#1a202c')}`,
              borderRight: `4px solid ${getColor('primary', '#1a202c')}`
            }}
          >
            <div className="text-center space-y-2 sm:space-y-3 w-full">
              <Calendar size={28} className="sm:w-8 sm:h-8 mx-auto" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
              
              <div>
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full" style={{ 
                  backgroundColor: '#fbbf2420',
                  color: '#fbbf24'
                }}>
                  {t('events.pending')}
                </span>
              </div>

              {/* Fecha placeholder */}
              <div className="py-3 sm:py-4">
                <div className="text-4xl sm:text-5xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                  15
                </div>
                <div className="text-sm font-medium mt-1" style={{ color: `${getColor('primary', '#1a202c')}80` }}>
                  {t('events.november')}
                </div>
              </div>

              {/* Evento placeholder */}
              <div className="pt-2 sm:pt-3 border-t" style={{ borderColor: `${getColor('primary', '#1a202c')}20` }}>
                <p className="text-sm font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                  {t('events.nextEvent')}
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                  {t('events.noEventsScheduled')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default CourseDashboardPage;
