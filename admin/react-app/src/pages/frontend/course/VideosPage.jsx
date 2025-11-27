import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { ChevronDown, ChevronRight, Video, Play, X, ChevronLeft, Check, Circle, Film } from 'lucide-react';

const VideosPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  // Colores adaptativos según el modo (misma lógica que sidebar/topbar/messages/support)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    accent: getColor('accent', '#f59e0b'),
    hoverBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
  };

  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Hook para manejar el progreso del estudiante
  const { 
    isCompleted, 
    markComplete, 
    unmarkComplete, 
    loading: progressLoading,
    fetchCompletedContent
  } = useStudentProgress(courseId, false);

  // Fetch completed content when component mounts
  useEffect(() => {
    if (courseId) {
      fetchCompletedContent();
    }
  }, [courseId, fetchCompletedContent]);

  useEffect(() => {
    const fetchLessons = async () => {
      if (!courseId) return;
      
      setLoading(true);
      try {
        const courseIdInt = parseInt(courseId, 10);
        if (isNaN(courseIdInt)) {
          throw new Error('Invalid course ID');
        }
        
        const result = await getCourseLessons(courseIdInt, { perPage: 100 });
        
        // Filter lessons to only include those with video steps
        const lessonsWithVideos = (result.data || [])
          .map(lesson => {
            const videoSteps = (lesson.meta?._lesson_steps || [])
              .filter(step => step.type === 'video')
              .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
            
            return {
              ...lesson,
              videoSteps
            };
          })
          .filter(lesson => lesson.videoSteps.length > 0);
        
        setLessons(lessonsWithVideos);
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [courseId]);

  // Create flat array of all video steps for navigation
  const allVideoSteps = useMemo(() => {
    return lessons.flatMap(lesson => 
      lesson.videoSteps.map(step => ({
        step,
        lesson,
        // Store original step index in the lesson for progress tracking
        originalStepIndex: (lesson.meta?._lesson_steps || []).findIndex(s => 
          s.type === step.type && s.title === step.title && JSON.stringify(s.data) === JSON.stringify(step.data)
        )
      }))
    );
  }, [lessons]);

  const toggleLesson = (lessonId) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const handleOpenVideo = (step, lesson) => {
    setSelectedVideo(step);
    setSelectedLesson(lesson);
  };

  const closeVideoViewer = () => {
    setSelectedVideo(null);
    setSelectedLesson(null);
  };

  // Navigation functions
  const getCurrentStepIndex = () => {
    if (!selectedVideo || !selectedLesson) return -1;
    return allVideoSteps.findIndex(item => 
      item.step === selectedVideo && item.lesson.id === selectedLesson.id
    );
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const prevItem = allVideoSteps[currentIndex - 1];
      setSelectedVideo(prevItem.step);
      setSelectedLesson(prevItem.lesson);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < allVideoSteps.length - 1) {
      const nextItem = allVideoSteps[currentIndex + 1];
      setSelectedVideo(nextItem.step);
      setSelectedLesson(nextItem.lesson);
    }
  };

  // Toggle complete
  const handleToggleComplete = async () => {
    if (!selectedLesson || !selectedVideo || !courseId) return;

    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) return;

    const { originalStepIndex } = allVideoSteps[currentIndex];
    
    try {
      const isStepCompleted = isCompleted(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
      
      if (isStepCompleted) {
        await unmarkComplete(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
      } else {
        await markComplete(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
      }
      
      // Force reload of completed content and trigger update
      await fetchCompletedContent();
      
      // Trigger custom event to notify sidebar to reload
      window.dispatchEvent(new CustomEvent('courseProgressUpdated', { detail: { courseId } }));
      
    } catch (error) {
      console.error('Error toggling step completion:', error);
    }
  };

  // Check if current step is completed
  const isCurrentStepCompleted = () => {
    if (!selectedLesson || !selectedVideo) return false;
    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) return false;
    const { originalStepIndex } = allVideoSteps[currentIndex];
    return isCompleted(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
  };

  const currentIndex = getCurrentStepIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allVideoSteps.length - 1;

  // Get video URL from step data
  const getVideoUrl = (step) => {
    if (step.data?.video_url || step.data?.url) {
      return step.data.video_url || step.data.url;
    }
    return null;
  };

  // Get video duration
  const getVideoDuration = (step) => {
    if (step.data?.duration) {
      const minutes = parseInt(step.data.duration);
      return minutes > 0 ? `${minutes} min` : null;
    }
    return null;
  };

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.videosSection')}
    >
      <div className="relative h-full">
        {/* Main Content - Lista de videos */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedVideo ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
            {loading ? (
              <div 
                className="rounded-lg border overflow-hidden"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className="px-4 py-3 flex items-center gap-3 animate-pulse"
                    style={{ borderBottom: i < 3 ? `1px solid ${getColor('borderColor', '#e5e7eb')}` : 'none' }}
                  >
                    <div className="w-5 h-5 rounded" style={{ backgroundColor: pageColors.text + '20' }}></div>
                    <div className="h-4 rounded flex-1" style={{ backgroundColor: pageColors.text + '15', maxWidth: '200px' }}></div>
                    <div className="h-5 w-8 rounded-full" style={{ backgroundColor: pageColors.text + '10' }}></div>
                  </div>
                ))}
              </div>
            ) : lessons.length === 0 ? (
              <div 
                className="text-center py-12 rounded-lg border"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <Film size={40} className="mx-auto mb-3" style={{ color: pageColors.text + '30' }} />
                <p className="text-sm font-medium" style={{ color: pageColors.text }}>
                  {t('videos.noVideos')}
                </p>
                <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                  {t('videos.noVideosDescription')}
                </p>
              </div>
            ) : (
              /* Contenedor único para todos los videos */
              <div className="py-4">
              <div 
                className="rounded-xl border-2 overflow-hidden"
                style={{ 
                  backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                {lessons.map((lesson, lessonIndex) => {
                  const isExpanded = expandedLessons.has(lesson.id);
                  const videoCount = lesson.videoSteps.length;
                  const lessonTitle = lesson.title?.rendered || lesson.title || t('courses.untitledLesson');

                  return (
                    <div 
                      key={lesson.id}
                    >
                      {/* Lesson Header */}
                      <button
                        onClick={() => toggleLesson(lesson.id)}
                        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-all duration-200"
                        style={{ 
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`
                        }}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Chevron */}
                          {isExpanded ? (
                            <ChevronDown size={20} style={{ color: pageColors.text }} className="flex-shrink-0" />
                          ) : (
                            <ChevronRight size={20} style={{ color: pageColors.textMuted }} className="flex-shrink-0" />
                          )}
                          
                          {/* Icon + Title */}
                          <Video size={20} style={{ color: pageColors.text }} className="flex-shrink-0" />
                          <span 
                            className="font-semibold text-left truncate"
                            style={{ color: pageColors.text }}
                            dangerouslySetInnerHTML={{ __html: lessonTitle }}
                          />
                        </div>
                        
                        {/* Badge count */}
                        <span 
                          className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full flex-shrink-0 ml-2"
                          style={{ 
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
                            color: pageColors.text
                          }}
                        >
                          {videoCount} <span className="hidden sm:inline">{videoCount === 1 ? t('videos.video') : t('videos.videos')}</span>
                        </span>
                      </button>

                      {/* Video Steps - expandido */}
                      {isExpanded && (
                        <div>
                          {lesson.videoSteps.map((step, index) => {
                            const duration = getVideoDuration(step);
                            
                            return (
                              <div key={step.id || index}>
                                {/* Separador horizontal */}
                                <div 
                                  className="mx-6"
                                  style={{ 
                                    height: '1px', 
                                    backgroundColor: 'rgba(156, 163, 175, 0.2)'
                                  }}
                                />
                                <div 
                                  className="flex items-center gap-3 px-4 sm:px-6 py-4 transition-colors duration-150 cursor-pointer group"
                                  onClick={() => handleOpenVideo(step, lesson)}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isDarkMode 
                                      ? 'rgba(255,255,255,0.05)' 
                                      : `${getColor('primary', '#1a202c')}03`;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <Play size={18} style={{ color: pageColors.textMuted }} className="flex-shrink-0" />
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span 
                                      className="text-sm font-medium truncate"
                                      style={{ color: pageColors.text }}
                                    >
                                      {step.title}
                                    </span>
                                    {duration && (
                                      <span className="text-xs" style={{ color: pageColors.textMuted }}>
                                        {duration}
                                      </span>
                                    )}
                                  </div>
                                  <Play 
                                    size={18} 
                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ color: pageColors.accent }} 
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Separador entre lecciones */}
                      {lessonIndex < lessons.length - 1 && (
                        <div 
                          className="mx-6"
                          style={{ 
                            height: '1px', 
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Video Viewer Page - Slides from right */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedVideo ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {selectedVideo && (
            <div className="h-full flex flex-col">
              {/* Header Compacto con Breadcrumbs Integrados */}
              <div 
                className="flex items-center justify-between px-4 py-2 sm:py-1.5 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: getColor('borderColor', '#e5e7eb')
                }}
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  {/* Breadcrumbs compactos */}
                  <nav className="hidden sm:flex items-center text-xs space-x-1.5">
                    <Link 
                      to="/courses"
                      className="transition-colors duration-200 hover:underline font-medium"
                      style={{ color: pageColors.text }}
                    >
                      {t('sidebar.studyPlanner')}
                    </Link>
                    <ChevronRight size={12} style={{ color: pageColors.textMuted }} />
                    <Link 
                      to={`/courses/${courseId}/dashboard`}
                      className="transition-colors duration-200 hover:underline font-medium"
                      style={{ color: pageColors.text }}
                      dangerouslySetInnerHTML={{ __html: courseName }}
                    />
                    <ChevronRight size={12} style={{ color: pageColors.textMuted }} />
                    <span className="font-medium" style={{ color: pageColors.textMuted }}>
                      {t('courses.videos')}
                    </span>
                  </nav>
                  {/* Título del video */}
                  <div className="flex items-center gap-2">
                    <Video size={16} style={{ color: pageColors.accent }} className="flex-shrink-0" />
                    <h2 className="text-sm font-medium leading-tight truncate" style={{ color: pageColors.text }}>
                      {selectedVideo.title}
                    </h2>
                  </div>
                </div>

                {/* Navigation and Complete buttons */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Previous button */}
                  <button
                    onClick={handlePrevious}
                    disabled={!hasPrevious}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ 
                      backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`,
                      opacity: hasPrevious ? 1 : 0.4,
                      cursor: hasPrevious ? 'pointer' : 'not-allowed'
                    }}
                    onMouseEnter={(e) => {
                      if (hasPrevious) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                    }}
                    title={t('navigation.previous')}
                  >
                    <ChevronLeft size={18} style={{ color: pageColors.text }} />
                  </button>

                  {/* Complete button */}
                  <button
                    onClick={handleToggleComplete}
                    disabled={progressLoading}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs"
                    style={{ 
                      backgroundColor: isCurrentStepCompleted() 
                        ? pageColors.accent
                        : (isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`),
                      color: isCurrentStepCompleted() ? '#ffffff' : pageColors.text
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentStepCompleted()) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentStepCompleted()) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                      }
                    }}
                    title={isCurrentStepCompleted() ? t('progress.completed') : t('progress.markComplete')}
                  >
                    {isCurrentStepCompleted() ? (
                      <Check size={14} />
                    ) : (
                      <Circle size={14} />
                    )}
                    <span className="font-medium hidden sm:inline">
                      {isCurrentStepCompleted() ? t('progress.completed') : t('progress.markComplete')}
                    </span>
                  </button>

                  {/* Next button */}
                  <button
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ 
                      backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`,
                      opacity: hasNext ? 1 : 0.4,
                      cursor: hasNext ? 'pointer' : 'not-allowed'
                    }}
                    onMouseEnter={(e) => {
                      if (hasNext) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                    }}
                    title={t('navigation.next')}
                  >
                    <ChevronRight size={18} style={{ color: pageColors.text }} />
                  </button>

                  {/* Close button */}
                  <button
                    onClick={closeVideoViewer}
                    className="p-1.5 rounded-lg transition-all ml-1"
                    style={{ backgroundColor: isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}25` : `${pageColors.text}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? `${pageColors.accent}15` : `${pageColors.text}10`;
                    }}
                    title={t('common.back')}
                  >
                    <X size={18} style={{ color: pageColors.text }} />
                  </button>
                </div>
              </div>

              {/* Video Content - con padding alrededor */}
              <div 
                className="flex-1 overflow-hidden flex items-center justify-center p-4 md:p-6"
                style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
              >
                {getVideoUrl(selectedVideo) ? (
                  <div 
                    className="w-full h-full max-w-5xl rounded-lg overflow-hidden shadow-lg"
                    style={{ backgroundColor: '#000000' }}
                  >
                    <iframe
                      src={getVideoUrl(selectedVideo)}
                      className="w-full h-full border-0"
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div 
                    className="flex items-center justify-center h-full w-full rounded-lg"
                    style={{ backgroundColor: getColor('background', '#ffffff') }}
                  >
                    <div className="text-center">
                      <Video size={48} className="mx-auto mb-3" style={{ color: pageColors.text + '30' }} />
                      <p className="text-sm font-medium" style={{ color: pageColors.text }}>
                        {t('videos.noVideoUrl')}
                      </p>
                      <p className="text-xs mt-1" style={{ color: pageColors.textMuted }}>
                        {t('videos.noVideoUrlDescription')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default VideosPage;
