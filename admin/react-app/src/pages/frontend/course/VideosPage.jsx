import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import useLessons from '../../../hooks/useLessons';
import useCourses from '../../../hooks/useCourses';
import { isUserAdmin } from '../../../utils/userUtils';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import LessonModal from '../../../components/lessons/LessonModal';
import VideoModal from '../../../components/videos/VideoModal';
import { ChevronDown, ChevronUp, ChevronRight, Video, Play, X, ChevronLeft, Check, Circle, Film, Plus, Trash2, AlertTriangle, Edit2 } from 'lucide-react';

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
    // Button colors (same as CourseCard)
    buttonBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    buttonHoverBg: isDarkMode ? getColor('primary', '#3b82f6') : getColor('accent', '#f59e0b'),
  };

  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Admin functionality
  const userIsAdmin = isUserAdmin();
  const lessonsManager = useLessons({ autoFetch: false, courseId: courseId });
  const coursesHook = useCourses({ autoFetch: false, status: 'publish,draft,private' });
  
  // Modal states
  const [lessonModalState, setLessonModalState] = useState({
    isOpen: false,
    mode: 'create',
    lesson: null
  });
  const [videoModalState, setVideoModalState] = useState({
    isOpen: false,
    mode: 'create',
    lessonId: null,
    videoIndex: null,
    video: null
  });
  const [deleteThemeModalState, setDeleteThemeModalState] = useState({
    isOpen: false,
    lesson: null
  });

  // Load courses for lesson modal
  useEffect(() => {
    if (userIsAdmin && coursesHook.courses.length === 0 && !coursesHook.loading) {
      coursesHook.fetchCourses();
    }
  }, [userIsAdmin]);

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

  // Fetch lessons function (reusable)
  const fetchLessons = async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const courseIdInt = parseInt(courseId, 10);
      if (isNaN(courseIdInt)) {
        throw new Error('Invalid course ID');
      }
      
      const result = await getCourseLessons(courseIdInt, { perPage: 100 });
      
      // Map lessons with their video steps (show all lessons, even without videos)
      const lessonsWithVideos = (result.data || [])
        .map(lesson => {
          const videoSteps = (lesson.meta?._lesson_steps || [])
            .filter(step => step.type === 'video')
            .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
          
          return {
            ...lesson,
            videoSteps
          };
        });
      
      setLessons(lessonsWithVideos);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [courseId]);

  // Admin handlers
  const handleCreateLesson = () => {
    setLessonModalState({ isOpen: true, mode: 'create', lesson: null });
  };

  const handleEditLesson = (lesson) => {
    setLessonModalState({ isOpen: true, mode: 'edit', lesson: lesson });
  };

  const handleSaveLesson = async (data, nextAction = 'close') => {
    try {
      if (lessonModalState.mode === 'create') {
        const newLesson = await lessonsManager.createLesson(data);
        toast.success(t('videos.lessonCreated'));
        
        await fetchLessons();
        
        if (nextAction === 'addVideo') {
          handleAddVideo(newLesson.id);
        }
        
        handleCloseLessonModal();
      } else {
        await lessonsManager.updateLesson(lessonModalState.lesson.id, data);
        toast.success(t('videos.lessonUpdated'));
        await fetchLessons();
        handleCloseLessonModal();
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      throw error;
    }
  };

  const handleCloseLessonModal = () => {
    setLessonModalState({ isOpen: false, mode: 'create', lesson: null });
  };

  const handleAddVideo = (lessonId) => {
    setVideoModalState({
      isOpen: true,
      mode: 'create',
      lessonId: lessonId,
      videoIndex: null,
      video: null
    });
  };

  const handleEditVideo = (lessonId, videoIndex, video) => {
    setVideoModalState({
      isOpen: true,
      mode: 'edit',
      lessonId: lessonId,
      videoIndex: videoIndex,
      video: video
    });
  };

  const handleSaveVideo = async (videoData) => {
    try {
      const lesson = lessons.find(l => l.id === videoModalState.lessonId);
      if (!lesson) throw new Error('Lesson not found');

      const currentSteps = lesson.meta?._lesson_steps || [];
      let updatedSteps;

      if (videoModalState.mode === 'create') {
        updatedSteps = [...currentSteps, videoData];
      } else {
        // Find the video step to edit by getting the nth video in the array
        const videoSteps = currentSteps.filter(s => s.type === 'video');
        const targetVideo = videoSteps[videoModalState.videoIndex];
        
        updatedSteps = currentSteps.map(step => 
          step === targetVideo ? videoData : step
        );
      }

      // Update lesson with all required fields to avoid validation errors
      await lessonsManager.updateLesson(lesson.id, {
        title: lesson.title?.rendered || lesson.title,
        courseId: lesson.meta?._lesson_course?.[0] || courseId,
        meta: {
          _lesson_steps: updatedSteps
        }
      });

      await fetchLessons();
      toast.success(t('videos.videoSaved'));
      handleCloseVideoModal();
    } catch (error) {
      console.error('Error saving video:', error);
      throw error;
    }
  };

  const handleDeleteVideo = async (lessonId, videoIndex) => {
    if (!window.confirm(t('videos.deleteConfirm'))) return;
    
    try {
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) throw new Error('Lesson not found');

      const currentSteps = lesson.meta?._lesson_steps || [];
      const videoSteps = currentSteps.filter(s => s.type === 'video');
      const videoToDelete = videoSteps[videoIndex];
      
      const updatedSteps = currentSteps.filter(step => step !== videoToDelete);

      // Update lesson with all required fields to avoid validation errors
      await lessonsManager.updateLesson(lesson.id, {
        title: lesson.title?.rendered || lesson.title,
        courseId: lesson.meta?._lesson_course?.[0] || courseId,
        meta: {
          _lesson_steps: updatedSteps
        }
      });

      await fetchLessons();
      toast.success(t('videos.videoDeleted'));
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error(t('videos.errors.deleteFailed'));
    }
  };

  const handleCloseVideoModal = () => {
    setVideoModalState({
      isOpen: false,
      mode: 'create',
      lessonId: null,
      videoIndex: null,
      video: null
    });
  };

  // Delete theme handlers
  const handleOpenDeleteThemeModal = (lesson) => {
    setDeleteThemeModalState({
      isOpen: true,
      lesson: lesson
    });
  };

  const handleCloseDeleteThemeModal = () => {
    setDeleteThemeModalState({
      isOpen: false,
      lesson: null
    });
  };

  const handleConfirmDeleteTheme = async () => {
    if (!deleteThemeModalState.lesson) return;
    
    try {
      await lessonsManager.deleteLesson(deleteThemeModalState.lesson.id);
      await fetchLessons();
      toast.success(t('videos.themeDeleted'));
      handleCloseDeleteThemeModal();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error(t('videos.errors.deleteTheme'));
    }
  };

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

  // Convert video URL to embeddable format (Vimeo, YouTube, etc.)
  const convertToEmbedUrl = (url) => {
    if (!url) return null;
    
    // Vimeo: convert https://vimeo.com/123456789 to https://player.vimeo.com/video/123456789
    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    // YouTube: convert various formats to embed URL
    // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // If already an embed URL or other format, return as is
    return url;
  };

  // Get video URL from step data
  const getVideoUrl = (step) => {
    if (step.data?.video_url || step.data?.url) {
      const rawUrl = step.data.video_url || step.data.url;
      return convertToEmbedUrl(rawUrl);
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
            {/* Admin: Create Theme Button */}
            {userIsAdmin && (
              <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
                <button
                  onClick={handleCreateLesson}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
                  style={{
                    backgroundColor: pageColors.accent,
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={18} />
                  {t('videos.createTheme')}
                </button>
              </div>
            )}

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
                  borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
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
                      <div
                        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-all duration-200"
                        style={{ 
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`
                        }}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Icon + Title */}
                          <Video size={20} style={{ color: pageColors.text }} className="flex-shrink-0" />
                          <span 
                            className="font-semibold text-left truncate"
                            style={{ color: pageColors.text }}
                            dangerouslySetInnerHTML={{ __html: lessonTitle }}
                          />
                        </div>
                        
                        {/* Badge count + Admin Actions + Expand/Collapse Button */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          {/* Admin: Edit Theme Button */}
                          {userIsAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditLesson(lesson);
                              }}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ backgroundColor: `${pageColors.accent}15` }}
                              title={t('videos.editTheme')}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${pageColors.accent}25`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = `${pageColors.accent}15`;
                              }}
                            >
                              <Edit2 size={16} style={{ color: pageColors.accent }} />
                            </button>
                          )}

                          {/* Admin: Delete Theme Button */}
                          {userIsAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteThemeModal(lesson);
                              }}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                              title={t('videos.deleteTheme')}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                              }}
                            >
                              <Trash2 size={16} style={{ color: '#ef4444' }} />
                            </button>
                          )}

                          {/* Admin: Add Video Button */}
                          {userIsAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddVideo(lesson.id);
                              }}
                              className="px-3 py-1.5 rounded-lg transition-all text-xs font-medium flex items-center gap-1.5"
                              style={{ 
                                backgroundColor: pageColors.accent,
                                color: '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              <Plus size={14} />
                              <span className="hidden sm:inline">{t('videos.addVideo')}</span>
                            </button>
                          )}

                          <span 
                            className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full"
                            style={{ 
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
                              color: pageColors.text,
                              minWidth: '90px',
                              textAlign: 'center',
                              display: 'inline-block'
                            }}
                          >
                            {videoCount} <span className="hidden sm:inline">{videoCount === 1 ? t('videos.video') : t('videos.videos')}</span>
                          </span>
                          
                          {/* Expand/Collapse Button - same style as CourseCard */}
                          <button
                            onClick={() => videoCount > 0 && toggleLesson(lesson.id)}
                            disabled={videoCount === 0}
                            className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            style={{ 
                              backgroundColor: pageColors.buttonBg,
                              color: pageColors.buttonText
                            }}
                            onMouseEnter={(e) => {
                              if (videoCount === 0) return;
                              if (isDarkMode) {
                                e.currentTarget.style.filter = 'brightness(1.15)';
                              } else {
                                e.currentTarget.style.backgroundColor = pageColors.buttonHoverBg;
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'none';
                              e.currentTarget.style.backgroundColor = pageColors.buttonBg;
                            }}
                          >
                            {isExpanded ? t('videos.hideLesson') : t('videos.showLesson')}
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Video Steps - expandido */}
                      {isExpanded && (
                        <div>
                          {lesson.videoSteps.map((step, index) => {
                            const duration = getVideoDuration(step);
                            
                            return (
                              <div key={step.id || index}>
                                {/* Separador horizontal - full width for first item, with margin for others */}
                                <div 
                                  className={index > 0 ? "mx-6" : ""}
                                  style={{ 
                                    height: '2px', 
                                    backgroundColor: 'rgba(156, 163, 175, 0.2)'
                                  }}
                                />
                                <div 
                                  className="flex items-center gap-3 px-4 sm:px-6 py-4 transition-colors duration-150"
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
                                  {/* Admin: Edit and Delete Buttons */}
                                  {userIsAdmin && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditVideo(lesson.id, index, step);
                                        }}
                                        className="p-1.5 rounded-lg transition-all"
                                        style={{ backgroundColor: `${pageColors.accent}15` }}
                                        title={t('common.edit')}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = `${pageColors.accent}25`;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = `${pageColors.accent}15`;
                                        }}
                                      >
                                        <Edit2 size={14} style={{ color: pageColors.accent }} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteVideo(lesson.id, index);
                                        }}
                                        className="p-1.5 rounded-lg transition-all"
                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                                        title={t('common.delete')}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                                        }}
                                      >
                                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                                      </button>
                                    </div>
                                  )}
                                  {/* Available Button - same style as CourseCard */}
                                  <button
                                    onClick={() => handleOpenVideo(step, lesson)}
                                    className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex-shrink-0"
                                    style={{ 
                                      backgroundColor: pageColors.buttonBg,
                                      color: pageColors.buttonText
                                    }}
                                    onMouseEnter={(e) => {
                                      if (isDarkMode) {
                                        e.currentTarget.style.filter = 'brightness(1.15)';
                                      } else {
                                        e.currentTarget.style.backgroundColor = pageColors.buttonHoverBg;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.filter = 'none';
                                      e.currentTarget.style.backgroundColor = pageColors.buttonBg;
                                    }}
                                  >
                                    {t('videos.available')}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Separador entre lecciones */}
                      {lessonIndex < lessons.length - 1 && (
                        <div 
                          style={{ 
                            height: '2px', 
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
                    className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium"
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
                  >
                    <ChevronLeft size={16} style={{ color: pageColors.text }} />
                    <span>{t('navigation.previous')}</span>
                  </button>

                  {/* Next button */}
                  <button
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium"
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
                  >
                    <span>{t('navigation.next')}</span>
                    <ChevronRight size={16} style={{ color: pageColors.text }} />
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

      {/* Admin: Lesson Modal (for creating/editing themes) */}
      {userIsAdmin && (
        <LessonModal
          isOpen={lessonModalState.isOpen}
          onClose={handleCloseLessonModal}
          lesson={lessonModalState.lesson}
          mode={lessonModalState.mode}
          onSave={handleSaveLesson}
          availableCourses={coursesHook.courses.map(c => ({ 
            value: c.id.toString(), 
            label: c.title?.rendered || c.title 
          }))}
          compact={true}
          preselectedCourseId={courseId}
        />
      )}

      {/* Admin: Video Modal */}
      {userIsAdmin && (
        <VideoModal
          isOpen={videoModalState.isOpen}
          onClose={handleCloseVideoModal}
          mode={videoModalState.mode}
          video={videoModalState.video}
          onSave={handleSaveVideo}
        />
      )}

      {/* Admin: Delete Theme Confirmation Modal */}
      {userIsAdmin && deleteThemeModalState.isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999999
          }}
          onClick={handleCloseDeleteThemeModal}
        >
          <div
            className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: getColor('background', '#ffffff') }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center gap-3 px-6 py-4 border-b"
              style={{ borderColor: getColor('borderColor', '#e5e7eb') }}
            >
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: pageColors.text }}>
                {t('videos.deleteThemeTitle')}
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-sm mb-4" style={{ color: pageColors.text }}>
                {t('videos.deleteThemeConfirm')}
              </p>
              
              {/* Lesson info */}
              <div 
                className="p-4 rounded-lg mb-4"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${getColor('borderColor', '#e5e7eb')}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Video size={18} style={{ color: pageColors.accent }} />
                  <span 
                    className="font-medium"
                    style={{ color: pageColors.text }}
                    dangerouslySetInnerHTML={{ 
                      __html: deleteThemeModalState.lesson?.title?.rendered || 
                              deleteThemeModalState.lesson?.title || 
                              t('courses.untitledLesson') 
                    }}
                  />
                </div>
                <p className="text-sm" style={{ color: pageColors.textMuted }}>
                  {t('videos.associatedVideos', { 
                    count: deleteThemeModalState.lesson?.videoSteps?.length || 0 
                  })}
                </p>
              </div>

              <p className="text-xs" style={{ color: '#ef4444' }}>
                {t('videos.deleteThemeWarning')}
              </p>
            </div>

            {/* Footer */}
            <div 
              className="flex items-center justify-end gap-3 px-6 py-4 border-t"
              style={{ 
                borderColor: getColor('borderColor', '#e5e7eb'),
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              }}
            >
              <button
                type="button"
                onClick={handleCloseDeleteThemeModal}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: pageColors.text,
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTheme}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Trash2 size={16} />
                {t('videos.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </CoursePageTemplate>
  );
};

export default VideosPage;
