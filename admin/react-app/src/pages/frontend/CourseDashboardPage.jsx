import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useScoreFormat } from '../../contexts/ScoreFormatContext';
import useCourse from '../../hooks/useCourse';
import CoursePageTemplate from '../../components/course/CoursePageTemplate';
import { getMyRankingStatus } from '../../api/services/courseRankingService';
import { getCalendarNotes } from '../../api/services/calendarNotesService';
import { getCourseLessons } from '../../api/services/courseLessonService';
import { getCourseProgress } from '../../api/services/studentProgressService';
import { ClipboardList, FileText, Video, Trophy, TrendingUp, Award, Users, ToggleLeft, ToggleRight, Calendar, ExternalLink, BarChart3 } from 'lucide-react';
import { CourseRankingProvider, CourseRankingSlidePanel } from '../../components/frontend/CourseRankingPanel';

const CourseDashboardPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { formatScore } = useScoreFormat();
  
  const { course, loading } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || t('courses.title');
  const [rankingStatus, setRankingStatus] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [showWithRisk, setShowWithRisk] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [nextLiveClass, setNextLiveClass] = useState(null);
  const [liveClassLoading, setLiveClassLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);

  // Dark mode aware colors (same pattern as SupportMaterialPage)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    if (courseId) {
      const courseIdInt = parseInt(courseId, 10);
      
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
      
      // Fetch live classes
      setLiveClassLoading(true);
      getCalendarNotes(courseId)
        .then(notes => {
          // Filter for live_class type and find next upcoming one
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const liveClasses = notes
            .filter(n => n.type === 'live_class')
            .filter(n => new Date(n.note_date) >= today)
            .sort((a, b) => new Date(a.note_date) - new Date(b.note_date));
          setNextLiveClass(liveClasses[0] || null);
          setLiveClassLoading(false);
        })
        .catch(error => {
          console.error('Error loading live classes:', error);
          setLiveClassLoading(false);
        });
      
      // Fetch lessons for content summary
      setLessonsLoading(true);
      getCourseLessons(courseIdInt, { perPage: 100 })
        .then(result => {
          console.log('📚 Dashboard lessons result:', result);
          setLessons(result.data || []);
          setLessonsLoading(false);
        })
        .catch(error => {
          console.error('Error loading lessons:', error);
          setLessonsLoading(false);
        });
      
      // Fetch course progress for completed counts
      getCourseProgress(courseIdInt)
        .then(progress => {
          setProgressData(progress);
        })
        .catch(error => {
          console.error('Error loading progress:', error);
        });
    }
  }, [courseId]);

  // Calculate steps by type from lessons
  const stepsByType = useMemo(() => {
    const types = { quiz: { total: 0 }, text: { total: 0 }, pdf: { total: 0 }, video: { total: 0 } };
    
    console.log('📊 Calculating stepsByType from lessons:', lessons);
    
    lessons.forEach(lesson => {
      const steps = lesson.meta?._lesson_steps || [];
      console.log(`  📖 Lesson ${lesson.id} has ${steps.length} steps:`, steps);
      steps.forEach(step => {
        if (step.type) {
          if (!types[step.type]) {
            types[step.type] = { total: 0 };
          }
          types[step.type].total += 1;
        }
      });
    });
    
    console.log('📊 Final stepsByType:', types);
    return types;
  }, [lessons]);

  // Componente de Donut Chart mejorado con progreso
  const DonutChart = ({ completed, total, icon: Icon, label, color }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
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
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon size={18} style={{ color }} className="mb-0.5" />
            <span className="text-lg font-bold" style={{ color: pageColors.text }}>
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

  // Calcular qué tipos de contenido están disponibles (usando datos de progreso del API)
  const availableContentTypes = useMemo(() => {
    const types = [];
    const apiSteps = progressData?.steps_by_type || {};
    
    // Usar datos del API si están disponibles, si no usar los calculados localmente
    const quizData = apiSteps.quiz || stepsByType.quiz || { total: 0, completed: 0 };
    const textData = apiSteps.text || stepsByType.text || { total: 0, completed: 0 };
    const pdfData = apiSteps.pdf || stepsByType.pdf || { total: 0, completed: 0 };
    const videoData = apiSteps.video || stepsByType.video || { total: 0, completed: 0 };
    
    if ((quizData.total || 0) > 0) {
      types.push({
        type: 'quiz',
        total: quizData.total,
        completed: quizData.completed || 0,
        icon: ClipboardList,
        label: t('courses.tests'),
        color: pageColors.primary
      });
    }
    
    const materialTotal = (textData.total || 0) + (pdfData.total || 0);
    const materialCompleted = (textData.completed || 0) + (pdfData.completed || 0);
    if (materialTotal > 0) {
      types.push({
        type: 'material',
        total: materialTotal,
        completed: materialCompleted,
        icon: FileText,
        label: t('courses.supportMaterial'),
        color: '#10b981'
      });
    }
    
    if ((videoData.total || 0) > 0) {
      types.push({
        type: 'video',
        total: videoData.total,
        completed: videoData.completed || 0,
        icon: Video,
        label: t('courses.videosSection'),
        color: '#8b5cf6'
      });
    }
    
    return types;
  }, [stepsByType, progressData, t, pageColors.primary]);

  // Overall progress percentage from API
  const progressPercentage = progressData?.percentage || 0;

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
        {/* Main Grid: Ranking + Content Progress + Next Live Class */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              style={{ backgroundColor: isDarkMode ? pageColors.accent : pageColors.primary }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-white" />
                  <span className="font-semibold text-white text-sm">
                    {t('ranking.yourPosition')}
                  </span>
                </div>
                {/* Toggle for risk mode */}
                {rankingStatus && rankingStatus.completed_quizzes > 0 && (
                  <button
                    onClick={() => setShowWithRisk(!showWithRisk)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 shadow-sm"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ffffff',
                      color: isDarkMode ? '#ffffff' : (showWithRisk ? pageColors.accent : pageColors.primary),
                    }}
                  >
                    {showWithRisk ? (
                      <ToggleRight size={14} style={{ color: isDarkMode ? '#ffffff' : pageColors.accent }} />
                    ) : (
                      <ToggleLeft size={14} style={{ color: isDarkMode ? '#ffffff' : pageColors.primary }} />
                    )}
                    <span>{showWithRisk ? t('tests.withRisk') : t('tests.withoutRisk')}</span>
                  </button>
                )}
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
              ) : rankingStatus && rankingStatus.completed_quizzes > 0 ? (
                <div className="text-center space-y-4">
                  <div 
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full"
                    style={{ backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.accent}15` }}
                  >
                    <span className="text-2xl font-bold" style={{ color: pageColors.accent }}>
                      #{showWithRisk ? (rankingStatus.position_with_risk || '?') : (rankingStatus.position || '?')}
                      {rankingStatus.total_users && (
                        <span className="text-sm font-normal" style={{ color: pageColors.textMuted }}>
                          /{rankingStatus.total_users}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp size={16} style={{ color: pageColors.primary }} />
                      <span className="text-lg font-bold" style={{ color: pageColors.text }}>
                        {formatScore(showWithRisk ? (rankingStatus.average_score_with_risk || 0) : (rankingStatus.average_score || 0))}
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
                    <span className="text-xs flex-1" style={{ color: pageColors.textMuted }}>
                      {rankingStatus.completed_quizzes}/{rankingStatus.total_quizzes} {t('ranking.quizzesCompleted')}
                    </span>
                    <button
                      onClick={() => setIsRankingOpen(true)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200 hover:shadow-md"
                      style={{
                        backgroundColor: isDarkMode ? `${pageColors.accent}20` : `${pageColors.accent}10`,
                        borderColor: isDarkMode ? `${pageColors.accent}40` : `${pageColors.accent}30`,
                      }}
                      title={t('statistics.ranking')}
                    >
                      <BarChart3 size={14} style={{ color: pageColors.accent }} />
                    </button>
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
                      {t('ranking.noTestsYet')}
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
                    {t('ranking.completeFirstQuiz')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Content Progress Card */}
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
              style={{ backgroundColor: isDarkMode ? pageColors.accent : pageColors.primary }}
            >
              <div className="flex items-center gap-2">
                <Award size={18} className="text-white" />
                <span className="font-semibold text-white text-sm">
                  {t('courses.contentSummary', 'Resumen de Contenido')}
                </span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-4">
              

              {availableContentTypes.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
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

          {/* Next Live Class Card */}
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
              style={{ backgroundColor: isDarkMode ? pageColors.accent : pageColors.primary }}
            >
              <div className="flex items-center gap-2">
                <Video size={18} className="text-white" />
                <span className="font-semibold text-white text-sm">
                  {t('dashboard.nextLiveClass', 'Próxima Clase en Directo')}
                </span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {liveClassLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div 
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: '#0891B2' }}
                  ></div>
                </div>
              ) : nextLiveClass ? (
                <div className="text-center space-y-4">
                  {/* Date badge */}
                  <div 
                    className="inline-flex items-center justify-center px-4 py-2 rounded-full"
                    style={{ backgroundColor: isDarkMode ? 'rgba(8, 145, 178, 0.2)' : 'rgba(8, 145, 178, 0.1)' }}
                  >
                    <Calendar size={16} style={{ color: '#0891B2' }} className="mr-2" />
                    <span className="text-sm font-semibold" style={{ color: '#0891B2' }}>
                      {new Date(nextLiveClass.note_date).toLocaleDateString('es-ES', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}
                      {nextLiveClass.time && ` - ${nextLiveClass.time.substring(0, 5)}`}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <div>
                    <h4 className="text-base font-bold mb-1" style={{ color: pageColors.text }}>
                      {nextLiveClass.title}
                    </h4>
                    {nextLiveClass.description && (
                      <p className="text-xs line-clamp-2" style={{ color: pageColors.textMuted }}>
                        {nextLiveClass.description}
                      </p>
                    )}
                  </div>

                  {/* Join button */}
                  {nextLiveClass.link && (
                    <a
                      href={nextLiveClass.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
                      style={{ 
                        backgroundColor: '#0891B2',
                        color: '#fff'
                      }}
                    >
                      <ExternalLink size={16} />
                      {t('calendar.joinClass', 'Unirse a la clase')}
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div 
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full"
                    style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}
                  >
                    <Video size={32} style={{ color: pageColors.textMuted }} />
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium" style={{ color: pageColors.text }}>
                      {t('dashboard.noLiveClasses', 'Sin clases programadas')}
                    </p>
                    <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                      {t('dashboard.noLiveClassesDescription', 'No hay clases en directo próximas')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Course Progress Widget - full width */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: pageColors.cardBg,
            borderColor: pageColors.border
          }}
        >
          <div
            className="px-4 py-3"
            style={{ backgroundColor: isDarkMode ? pageColors.accent : pageColors.primary }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-white" />
                <span className="font-semibold text-white text-sm">
                  {t('courses.progress', 'Progreso del Curso')}
                </span>
              </div>
              <span className="text-white font-bold text-sm">{progressPercentage}%</span>
            </div>
          </div>
          <div className="px-6 py-4">
            <div
              className="rounded-full h-4 overflow-hidden"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${pageColors.primary}15` }}
            >
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${progressPercentage}%`,
                  backgroundColor: isDarkMode ? pageColors.accent : pageColors.primary
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <CourseRankingProvider
        courseId={courseId}
        courseName={courseName}
        isOpen={isRankingOpen}
        onOpen={() => setIsRankingOpen(true)}
        onClose={() => setIsRankingOpen(false)}
      >
        <CourseRankingSlidePanel />
      </CourseRankingProvider>
    </CoursePageTemplate>
  );
};

export default CourseDashboardPage;
