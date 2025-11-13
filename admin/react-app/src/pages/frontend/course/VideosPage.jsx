import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { ChevronDown, ChevronRight, Video, Play, X, ChevronLeft, Check, Circle } from 'lucide-react';

const VideosPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
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
      <div className="relative" style={{ height: 'calc(100vh - 60px)' }}>
        {/* Main Content - Lista de videos */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedVideo ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="max-w-5xl mx-auto h-full overflow-y-auto px-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg p-4 animate-pulse" style={{ backgroundColor: getColor('background', '#ffffff') }}>
                    <div className="h-6 rounded" style={{ backgroundColor: `${getColor('primary', '#1a202c')}20`, width: '60%' }}></div>
                  </div>
                ))}
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: getColor('background', '#ffffff') }}>
                <Video size={48} className="mx-auto mb-4" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                <p className="text-lg font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                  {t('videos.noVideos')}
                </p>
                <p className="text-sm mt-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                  {t('videos.noVideosDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {lessons.map((lesson) => {
                  const isExpanded = expandedLessons.has(lesson.id);
                  const videoCount = lesson.videoSteps.length;
                  const lessonTitle = lesson.title?.rendered || lesson.title || t('courses.untitledLesson');

                  return (
                    <div 
                      key={lesson.id}
                      className="rounded-lg overflow-hidden border transition-all duration-200"
                      style={{ 
                        backgroundColor: getColor('background', '#ffffff'),
                        borderColor: `${getColor('primary', '#1a202c')}20`,
                        borderWidth: '2px'
                      }}
                    >
                      {/* Lesson Header */}
                      <button
                        onClick={() => toggleLesson(lesson.id)}
                        className="w-full px-8 py-5 flex items-center justify-between transition-all duration-200 hover:bg-opacity-50"
                        style={{ 
                          backgroundColor: isExpanded ? `${getColor('primary', '#1a202c')}08` : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown size={22} style={{ color: getColor('primary', '#1a202c') }} />
                          ) : (
                            <ChevronRight size={22} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                          )}
                          <Video size={22} style={{ color: getColor('primary', '#1a202c') }} />
                          <span className="font-semibold text-left text-base" style={{ color: getColor('primary', '#1a202c') }}>
                            {lessonTitle}
                          </span>
                        </div>
                        <span 
                          className="text-sm font-medium px-3 py-1 rounded-full"
                          style={{ 
                            backgroundColor: `${getColor('primary', '#1a202c')}15`,
                            color: getColor('primary', '#1a202c')
                          }}
                        >
                          {videoCount} {videoCount === 1 ? t('videos.video') : t('videos.videos')}
                        </span>
                      </button>

                      {/* Video Steps */}
                      {isExpanded && (
                        <div 
                          className="border-t"
                          style={{ borderColor: `${getColor('primary', '#1a202c')}10` }}
                        >
                          {lesson.videoSteps.map((step, index) => {
                            const duration = getVideoDuration(step);
                            
                            return (
                              <div
                                key={step.id || index}
                                className="px-8 py-4 flex items-center justify-between transition-all duration-200"
                                style={{ 
                                  backgroundColor: index % 2 === 0 ? `${getColor('primary', '#1a202c')}03` : 'transparent',
                                  borderBottom: index < lesson.videoSteps.length - 1 ? `1px solid ${getColor('primary', '#1a202c')}10` : 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}08`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = index % 2 === 0 ? `${getColor('primary', '#1a202c')}03` : 'transparent';
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <Play size={18} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                                      {step.title}
                                    </span>
                                    {duration && (
                                      <span className="text-xs mt-0.5" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                        {duration}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleOpenVideo(step, lesson)}
                                  className="p-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
                                  style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                  title={t('videos.watch')}
                                >
                                  <Play size={18} style={{ color: getColor('primary', '#1a202c') }} />
                                  <span className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                                    {t('videos.watch')}
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
              {/* Header - compacto */}
              <div 
                className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: `${getColor('primary', '#1a202c')}15` 
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Video size={20} style={{ color: getColor('primary', '#1a202c') }} />
                  <h2 className="text-base font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                    {selectedVideo.title}
                  </h2>
                </div>

                {/* Navigation and Complete buttons */}
                <div className="flex items-center gap-2">
                  {/* Previous button */}
                  <button
                    onClick={handlePrevious}
                    disabled={!hasPrevious}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ 
                      backgroundColor: `${getColor('primary', '#1a202c')}10`,
                      opacity: hasPrevious ? 1 : 0.4,
                      cursor: hasPrevious ? 'pointer' : 'not-allowed'
                    }}
                    onMouseEnter={(e) => {
                      if (hasPrevious) {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                    }}
                    title={t('navigation.previous')}
                  >
                    <ChevronLeft size={20} style={{ color: getColor('primary', '#1a202c') }} />
                  </button>

                  {/* Complete button */}
                  <button
                    onClick={handleToggleComplete}
                    disabled={progressLoading}
                    className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm"
                    style={{ 
                      backgroundColor: isCurrentStepCompleted() 
                        ? `${getColor('primary', '#1a202c')}` 
                        : `${getColor('primary', '#1a202c')}10`,
                      color: isCurrentStepCompleted() ? '#ffffff' : getColor('primary', '#1a202c')
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentStepCompleted()) {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentStepCompleted()) {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                      }
                    }}
                  >
                    {isCurrentStepCompleted() ? (
                      <Check size={16} />
                    ) : (
                      <Circle size={16} />
                    )}
                    <span className="font-medium">
                      {isCurrentStepCompleted() ? t('progress.completed') : t('progress.markComplete')}
                    </span>
                  </button>

                  {/* Next button */}
                  <button
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ 
                      backgroundColor: `${getColor('primary', '#1a202c')}10`,
                      opacity: hasNext ? 1 : 0.4,
                      cursor: hasNext ? 'pointer' : 'not-allowed'
                    }}
                    onMouseEnter={(e) => {
                      if (hasNext) {
                        e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                    }}
                    title={t('navigation.next')}
                  >
                    <ChevronRight size={20} style={{ color: getColor('primary', '#1a202c') }} />
                  </button>

                  {/* Close button */}
                  <button
                    onClick={closeVideoViewer}
                    className="p-1.5 rounded-lg transition-all ml-2"
                    style={{ backgroundColor: `${getColor('primary', '#1a202c')}10` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                    }}
                    title={t('common.back')}
                  >
                    <X size={20} style={{ color: getColor('primary', '#1a202c') }} />
                  </button>
                </div>
              </div>

              {/* Video Content */}
              <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#000000' }}>
                {getVideoUrl(selectedVideo) ? (
                  <iframe
                    src={getVideoUrl(selectedVideo)}
                    className="w-full h-full border-0"
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Video size={64} className="mx-auto mb-4" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                      <p className="text-lg font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('videos.noVideoUrl')}
                      </p>
                      <p className="text-sm mt-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
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
