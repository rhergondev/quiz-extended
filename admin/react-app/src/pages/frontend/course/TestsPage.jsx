import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScoreFormat } from '../../../contexts/ScoreFormatContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import useQuizRanking from '../../../hooks/useQuizRanking';
import useQuizAttempts from '../../../hooks/useQuizAttempts';
import useQuizAttemptDetails from '../../../hooks/useQuizAttemptDetails';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import Quiz from '../../../components/frontend/Quiz';
import QuizResults from '../../../components/frontend/QuizResults';
import { CourseRankingProvider, CourseRankingTrigger, CourseRankingSlidePanel } from '../../../components/frontend/CourseRankingPanel';
import { ChevronDown, ChevronRight, ClipboardList, CheckCircle, Circle, Clock, Award, X, ChevronLeft, ChevronRight as ChevronRightNav, Play, Check, HelpCircle, Target, Calendar, Eye, XCircle, Loader, Trophy } from 'lucide-react';

const TestsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getColor, isDarkMode } = useTheme();
  const { formatScore } = useScoreFormat();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';

  // Dark mode aware colors
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSubtle: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`,
    borderSubtle: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}15`,
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
    hoverBgStrong: isDarkMode ? 'rgba(255,255,255,0.15)' : `${getColor('primary', '#1a202c')}15`,
  };
  
  // 🔥 Ref para controlar que la navegación externa solo se procese una vez
  const hasProcessedNavigation = React.useRef(false);
  
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showQuizViewer, setShowQuizViewer] = useState(false);
  const [quizToStart, setQuizToStart] = useState(null);
  const [isQuizRunning, setIsQuizRunning] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [resultsQuestions, setResultsQuestions] = useState(null);
  const [resultsQuizInfo, setResultsQuizInfo] = useState(null);
  const [isQuizFocusMode, setIsQuizFocusMode] = useState(false); // 🎯 Focus mode: hide all UI when quiz is running
  const [isRankingOpen, setIsRankingOpen] = useState(false); // 🏆 Ranking panel state
  
  // 🆕 Estado para vista de intento previo
  const [viewingAttemptId, setViewingAttemptId] = useState(null);
  
  // Drawing mode states for Quiz component
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(false);
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingLineWidth, setDrawingLineWidth] = useState(2);

  // Hook para manejar el progreso del estudiante
  const { 
    isCompleted,
    markComplete, 
    unmarkComplete, 
    loading: progressLoading,
    fetchCompletedContent
  } = useStudentProgress(courseId, false);

  // Obtener quiz_id del test seleccionado
  const quizId = selectedTest?.data?.quiz_id;

  // Hook para obtener ranking y estadísticas del quiz
  const { ranking, loading: rankingLoading } = useQuizRanking(quizId);

  // Hook para obtener todos los intentos del usuario (solo los últimos 5 ya ordenados)
  const { attempts, loading: attemptsLoading } = useQuizAttempts({ perPage: 5, autoFetch: true });

  // 🆕 Hook para cargar detalles de un intento específico
  const { details: attemptDetails, loading: attemptDetailsLoading, error: attemptDetailsError } = useQuizAttemptDetails(viewingAttemptId);

  // Filtrar intentos de este quiz específico (últimos 5)
  const quizAttempts = useMemo(() => {
    if (!quizId || !attempts) return [];
    
    return attempts
      .filter(a => parseInt(a.quiz_id) === parseInt(quizId))
      .slice(0, 5);
  }, [quizId, attempts]);

  // Función para calcular percentil (diferencia con la media)
  const calculatePercentile = (score, withRisk) => {
    if (!ranking?.statistics) return 0;
    const avgScore = withRisk 
      ? ranking.statistics.avg_score_with_risk 
      : ranking.statistics.avg_score_without_risk;
    return score - avgScore;
  };

  // Obtener estadísticas del usuario actual
  const userStats = useMemo(() => {
    if (!ranking) return null;
    const topUsers = ranking.top || [];
    const relativeUsers = ranking.relative || [];
    const currentUser = ranking.currentUser;
    
    const userInTop = topUsers.find(u => u.user_id === currentUser?.id);
    const userInRelative = relativeUsers.find(u => u.user_id === currentUser?.id);
    return userInTop || userInRelative;
  }, [ranking]);

  const hasUserStats = userStats !== null && ranking?.statistics?.total_users > 0;

  // Fetch completed content when component mounts
  useEffect(() => {
    if (courseId) {
      fetchCompletedContent();
    }
  }, [courseId, fetchCompletedContent]);

  // 🎯 FOCUS MODE: Hide body overflow and Topbar when quiz is running
  useEffect(() => {
    if (isQuizFocusMode) {
      // Hide body overflow
      document.body.style.overflow = 'hidden';
      
      // Hide Topbar by adding a class to the layout
      const layoutElement = document.querySelector('[class*="flex flex-col w-full"]');
      if (layoutElement) {
        layoutElement.style.overflow = 'hidden';
      }
    } else {
      // Restore body overflow
      document.body.style.overflow = '';
      
      // Restore layout
      const layoutElement = document.querySelector('[class*="flex flex-col w-full"]');
      if (layoutElement) {
        layoutElement.style.overflow = '';
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isQuizFocusMode]);

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
        
        // Filter lessons to only include those with quiz steps
        const lessonsWithTests = (result.data || [])
          .map(lesson => {
            const quizSteps = (lesson.meta?._lesson_steps || [])
              .filter(step => step.type === 'quiz')
              .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
            
            return {
              ...lesson,
              quizSteps
            };
          })
          .filter(lesson => lesson.quizSteps.length > 0);
        
        setLessons(lessonsWithTests);
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [courseId]);

  // Handle navigation from external sources (like TestHistoryPage or StatisticsPage)
  useEffect(() => {
    // 🔥 Si ya procesamos la navegación, no hacer nada
    if (hasProcessedNavigation.current) return;
    
    // Solo ejecutar si hay estado de navegación Y tenemos lecciones cargadas
    if (!location.state || lessons.length === 0) return;
    
    // 📊 Handle navigation from StatisticsPage - expand lesson
    if (location.state?.openLessonId) {
      const lessonId = location.state.openLessonId;
      console.log('TestsPage - received openLessonId from StatisticsPage:', lessonId);
      
      // Expand the lesson
      setExpandedLessons(new Set([lessonId]));
      
      // Scroll to lesson if requested
      if (location.state.scrollToLesson) {
        setTimeout(() => {
          const lessonElement = document.getElementById(`lesson-${lessonId}`);
          if (lessonElement) {
            lessonElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
      
      // Mark as processed
      hasProcessedNavigation.current = true;
      
      // Clear state
      window.history.replaceState({}, document.title);
      return;
    }
    
    if (location.state?.viewAttemptId) {
      const quizId = location.state.selectedQuizId;
      console.log('TestsPage - received navigation state:', location.state);
      
      // Find the quiz in lessons
      for (const lesson of lessons) {
        const quizStep = lesson.quizSteps?.find(step => step.data?.quiz_id === quizId);
        if (quizStep) {
          console.log('TestsPage - found quiz, opening test viewer');
          // Open the test viewer immediately - skip showing the list
          setSelectedTest(quizStep);
          setSelectedLesson(lesson);
          // Set the viewing attempt ID
          setViewingAttemptId(location.state.viewAttemptId);
          // Clear other states
          setQuizResults(null);
          setResultsQuestions(null);
          setResultsQuizInfo(null);
          setIsQuizRunning(false);
          setQuizToStart(null);
          setIsQuizFocusMode(false);
          setLoading(false);
          
          // 🔥 Marcar como procesado
          hasProcessedNavigation.current = true;
          break;
        }
      }
    } else if (location.state?.selectedQuizId && location.state?.scrollToQuiz) {
      const quizId = location.state.selectedQuizId;
      console.log('TestsPage - scrolling to quiz:', quizId);
      
      // Find and open the quiz
      for (const lesson of lessons) {
        const quizStep = lesson.quizSteps?.find(step => step.data?.quiz_id === quizId);
        if (quizStep) {
          setSelectedTest(quizStep);
          setSelectedLesson(lesson);
          setQuizResults(null);
          setResultsQuestions(null);
          setResultsQuizInfo(null);
          setIsQuizRunning(false);
          setQuizToStart(null);
          setIsQuizFocusMode(false);
          setViewingAttemptId(null);
          setLoading(false);
          
          // 🔥 Marcar como procesado
          hasProcessedNavigation.current = true;
          break;
        }
      }
    }
  }, [location.state, lessons]);

  // Create flat array of all quiz steps for navigation
  const allTestSteps = useMemo(() => {
    return lessons.flatMap(lesson => 
      lesson.quizSteps.map(step => ({
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

  const handleOpenTest = (step, lesson) => {
    setSelectedTest(step);
    setSelectedLesson(lesson);
    setQuizResults(null);
    setResultsQuestions(null);
    setResultsQuizInfo(null);
    setIsQuizRunning(false);
    setQuizToStart(null);
    setIsQuizFocusMode(false); // 🎯 Deactivate focus mode
  };

  const closeTestViewer = () => {
    // 🔥 Si venimos de navegación externa y hay una ruta de retorno, navegar ahí
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      // Comportamiento normal: cerrar el viewer
      setSelectedTest(null);
      setSelectedLesson(null);
      setIsQuizRunning(false);
      setQuizToStart(null);
      setIsQuizFocusMode(false);
      setViewingAttemptId(null);
    }
  };

  // 🆕 Handler para abrir vista de intento previo
  const handleViewAttemptDetails = (attemptId) => {
    setViewingAttemptId(attemptId);
    setIsQuizRunning(false);
    setQuizToStart(null);
    setQuizResults(null);
    setIsQuizFocusMode(false);
  };

  // 🆕 Handler para volver desde vista de intento previo
  const handleBackFromAttemptView = () => {
    // 🔥 Si venimos de navegación externa con viewAttemptId, volver a la ruta de origen
    if (location.state?.returnTo && location.state?.viewAttemptId) {
      navigate(location.state.returnTo);
    } else {
      // Comportamiento normal: solo limpiar el viewingAttemptId
      setViewingAttemptId(null);
    }
  };

  const handleQuizComplete = async (result, questions, quizInfo) => {
    // Guardar los resultados para mostrarlos
    setQuizResults(result);
    setResultsQuestions(questions);
    setResultsQuizInfo(quizInfo);
    
    // Marcar el quiz como completado
    if (quizToStart?.id && selectedLesson) {
      try {
        const currentIndex = getCurrentStepIndex();
        if (currentIndex !== -1) {
          const { originalStepIndex } = allTestSteps[currentIndex];
          await markComplete(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
          
          // Refreschar contenido completado
          await fetchCompletedContent();
          
          // Disparar evento para actualizar el sidebar
          window.dispatchEvent(new CustomEvent('courseProgressUpdated', { detail: { courseId } }));
          
          // Cambiar a vista de resultados (no cerrar el viewer)
          setIsQuizRunning(false);
          setIsQuizFocusMode(false); // 🎯 Deactivate focus mode
        }
      } catch (error) {
        console.error('Error marking quiz as complete:', error);
      }
    } else {
      // Si no hay test para marcar, solo cambiar la vista
      setIsQuizRunning(false);
      setIsQuizFocusMode(false); // 🎯 Deactivate focus mode
    }
  };

  const handleCloseResults = () => {
    // Limpiar resultados y volver a la vista de info
    setQuizResults(null);
    setResultsQuestions(null);
    setResultsQuizInfo(null);
    setQuizToStart(null);
    setIsQuizFocusMode(false); // 🎯 Deactivate focus mode
  };

  const handleClearCanvas = () => {
    // Canvas clearing logic handled by DrawingCanvas component
  };

  // Navigation functions
  const getCurrentStepIndex = () => {
    if (!selectedTest || !selectedLesson) return -1;
    return allTestSteps.findIndex(item => 
      item.step === selectedTest && item.lesson.id === selectedLesson.id
    );
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const prevItem = allTestSteps[currentIndex - 1];
      setSelectedTest(prevItem.step);
      setSelectedLesson(prevItem.lesson);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < allTestSteps.length - 1) {
      const nextItem = allTestSteps[currentIndex + 1];
      setSelectedTest(nextItem.step);
      setSelectedLesson(nextItem.lesson);
    }
  };

  // Toggle complete
  const handleToggleComplete = async () => {
    if (!selectedLesson || !selectedTest || !courseId) return;

    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) return;

    const { originalStepIndex } = allTestSteps[currentIndex];
    
    try {
      const isStepCompleted = isCompleted(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
      
      if (isStepCompleted) {
        await unmarkComplete(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
      } else {
        await markComplete(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
      }
      
      // Force reload of completed content and trigger a page reload to update sidebar
      await fetchCompletedContent();
      
      // Trigger custom event to notify sidebar to reload
      window.dispatchEvent(new CustomEvent('courseProgressUpdated', { detail: { courseId } }));
      
    } catch (error) {
      console.error('Error toggling step completion:', error);
    }
  };

  // Check if a quiz step is completed
  const isQuizCompleted = (lesson, stepIndex) => {
    return isCompleted(lesson.id, 'step', lesson.id, stepIndex);
  };

  // Check if current step is completed
  const isCurrentStepCompleted = () => {
    if (!selectedLesson || !selectedTest) return false;
    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) return false;
    const { originalStepIndex } = allTestSteps[currentIndex];
    return isCompleted(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
  };

  const currentIndex = getCurrentStepIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allTestSteps.length - 1;

  // Check if we're coming from external navigation
  const isExternalNavigation = !!(location.state?.viewAttemptId || location.state?.selectedQuizId);

  return (
    <>
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.tests')}
    >
      <CourseRankingProvider
        courseId={courseId}
        courseName={courseName}
        isOpen={isRankingOpen}
        onOpen={() => setIsRankingOpen(true)}
        onClose={() => setIsRankingOpen(false)}
      >
      <div className="relative h-full">
        {/* Main Content - Lista de tests */}
        {!isExternalNavigation && (
          <div 
            className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
              selectedTest || isRankingOpen ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            <div className="h-full overflow-y-auto">
              <div className="max-w-5xl mx-auto px-4 pt-6 pb-12">
              {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg p-4 animate-pulse" style={{ backgroundColor: getColor('background', '#ffffff') }}>
                    <div className="h-6 rounded" style={{ backgroundColor: `${getColor('primary', '#1a202c')}20`, width: '60%' }}></div>
                  </div>
                ))}
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: pageColors.bgCard }}>
                <ClipboardList size={48} className="mx-auto mb-4" style={{ color: `${pageColors.text}40` }} />
                <p className="text-lg font-medium" style={{ color: pageColors.text }}>
                  {t('tests.noTests')}
                </p>
                <p className="text-sm mt-2" style={{ color: pageColors.textMuted }}>
                  {t('tests.noTestsDescription')}
                </p>
              </div>
            ) : (
              // 🎨 Contenedor global con borde único
              <div className="py-4">
                {/* 🏆 Botón de Ranking del Curso - Arriba de la lista de tests */}
                <CourseRankingTrigger />
                
                <div 
                  className="rounded-xl overflow-hidden border-2"
                  style={{ 
                    backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                    borderColor: getColor('borderColor', '#e5e7eb')
                  }}
                >
                  {lessons.map((lesson, lessonIndex) => {
                    const isExpanded = expandedLessons.has(lesson.id);
                    const testsCount = lesson.quizSteps.length;
                    const lessonTitle = lesson.title?.rendered || lesson.title || t('courses.untitledLesson');

                    return (
                      <div key={lesson.id} id={`lesson-${lesson.id}`}>
                        {/* Lesson Header */}
                        <button
                          onClick={() => toggleLesson(lesson.id)}
                          className="w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-all duration-200"
                          style={{ 
                            backgroundColor: pageColors.bgSubtle
                          }}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            {isExpanded ? (
                              <ChevronDown size={20} style={{ color: pageColors.text }} className="flex-shrink-0" />
                            ) : (
                              <ChevronRight size={20} style={{ color: pageColors.textMuted }} className="flex-shrink-0" />
                            )}
                            <ClipboardList size={20} style={{ color: pageColors.text }} className="flex-shrink-0" />
                            <span className="font-semibold text-left truncate" style={{ color: pageColors.text }}>
                              {lessonTitle}
                            </span>
                          </div>
                          <span 
                            className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full flex-shrink-0 ml-2"
                            style={{ 
                              backgroundColor: pageColors.hoverBg,
                              color: pageColors.text
                            }}
                          >
                            {testsCount} <span className="hidden sm:inline">{testsCount === 1 ? t('tests.test') : t('tests.tests')}</span>
                          </span>
                        </button>

                        {/* Quiz Steps */}
                        {isExpanded && (
                          <div>
                            {lesson.quizSteps.map((step, stepIndex) => {
                              const originalStepIndex = (lesson.meta?._lesson_steps || []).findIndex(s => 
                                s.type === step.type && s.title === step.title && JSON.stringify(s.data) === JSON.stringify(step.data)
                              );
                              const isCompleted = isQuizCompleted(lesson, originalStepIndex);
                              const difficulty = step.data?.difficulty || 'medium'; // Get difficulty
                              const timeLimit = step.data?.time_limit || null;
                              const startDate = step.data?.start_date || null; // 🆕 Get start date
                              
                              // Format start date
                              const formatStartDate = (dateString) => {
                                if (!dateString) return '--/--/----';
                                try {
                                  const date = new Date(dateString);
                                  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                } catch (e) {
                                  return '--/--/----';
                                }
                              };
                              
                              // Difficulty labels
                              const difficultyLabels = {
                                'easy': t('tests.difficultyEasy') || 'Fácil',
                                'medium': t('tests.difficultyMedium') || 'Medio',
                                'hard': t('tests.difficultyHard') || 'Difícil'
                              };
                              
                              // Difficulty colors
                              const difficultyColors = {
                                'easy': '#10b981',
                                'medium': '#f59e0b',
                                'hard': '#ef4444'
                              };
                              
                              return (
                                <div key={step.id || stepIndex}>
                                  {/* Separador horizontal */}
                                  <div 
                                    className="mx-6"
                                    style={{ 
                                      height: '1px', 
                                      backgroundColor: 'rgba(156, 163, 175, 0.2)'
                                    }}
                                  />
                                  
                                  <div
                                    className="px-4 sm:px-6 py-4 flex items-center justify-between transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-3 flex-1 mr-2 overflow-hidden">
                                      {isCompleted ? (
                                        <CheckCircle size={18} style={{ color: '#10b981' }} className="flex-shrink-0" />
                                      ) : (
                                        <Circle size={18} style={{ color: pageColors.textMuted }} className="flex-shrink-0" />
                                      )}
                                      <div className="flex flex-col flex-1 overflow-hidden">
                                        <span className="text-sm font-medium mb-1.5 truncate" style={{ color: pageColors.text }}>
                                          {step.title}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                          {/* Dificultad */}
                                          <div 
                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                                            style={{ 
                                              backgroundColor: `${difficultyColors[difficulty]}15`,
                                            }}
                                          >
                                            <Target size={12} style={{ color: difficultyColors[difficulty] }} />
                                            <span className="text-xs font-medium" style={{ color: difficultyColors[difficulty] }}>
                                              {difficultyLabels[difficulty]}
                                            </span>
                                          </div>
                                          
                                          {/* Tiempo límite */}
                                          {timeLimit && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <Clock size={12} style={{ color: pageColors.textMuted }} />
                                              <span className="text-xs" style={{ color: pageColors.textMuted }}>
                                                {timeLimit} min
                                              </span>
                                            </div>
                                          )}
                                          
                                          {/* Fecha de inicio */}
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            <Calendar size={12} style={{ color: pageColors.textMuted }} />
                                            <span className="text-xs" style={{ color: pageColors.textMuted }}>
                                              <span className="hidden sm:inline">{t('tests.startDate')}: </span>{formatStartDate(startDate)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleOpenTest(step, lesson)}
                                      className="px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm flex-shrink-0"
                                      style={{ 
                                        backgroundColor: isCompleted 
                                          ? getColor('primary', '#1a202c')
                                          : pageColors.hoverBg,
                                        color: isCompleted ? '#ffffff' : pageColors.text
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                        if (!isCompleted) {
                                          e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        if (!isCompleted) {
                                          e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                                        }
                                      }}
                                      title={isCompleted ? t('tests.retake') : t('tests.start')}
                                    >
                                      <Play size={16} />
                                      <span className="hidden sm:inline">{isCompleted ? t('tests.retake') : t('tests.start')}</span>
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
        )}

        {/* Test Viewer - Slides from right */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedTest ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {selectedTest && (
            <div className="h-full flex flex-col">
              {/* Header Compacto con Breadcrumbs Integrados */}
              <div 
                className="flex items-center justify-between px-4 py-2 sm:py-1.5 border-b flex-shrink-0 gap-2"
                style={{ 
                  backgroundColor: pageColors.bgCard,
                  borderColor: pageColors.borderSubtle 
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
                      {t('courses.tests')}
                    </span>
                  </nav>
                  {/* Título del test */}
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} style={{ color: pageColors.text }} className="flex-shrink-0" />
                    <h2 className="text-sm sm:text-base font-semibold leading-tight truncate" style={{ color: pageColors.text }}>
                      {selectedTest.title}
                    </h2>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Previous button */}
                  <button
                    onClick={handlePrevious}
                    disabled={!hasPrevious}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ 
                      backgroundColor: pageColors.hoverBg,
                      opacity: hasPrevious ? 1 : 0.4,
                      cursor: hasPrevious ? 'pointer' : 'not-allowed'
                    }}
                    onMouseEnter={(e) => {
                      if (hasPrevious) {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                    }}
                    title={t('navigation.previous')}
                  >
                    <ChevronLeft size={20} style={{ color: pageColors.text }} />
                  </button>

                  {/* Complete button */}
                  <button
                    onClick={handleToggleComplete}
                    disabled={progressLoading}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm"
                    style={{ 
                      backgroundColor: isCurrentStepCompleted() 
                        ? getColor('primary', '#1a202c')
                        : pageColors.hoverBg,
                      color: isCurrentStepCompleted() ? '#ffffff' : pageColors.text
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentStepCompleted()) {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentStepCompleted()) {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                      }
                    }}
                    title={isCurrentStepCompleted() ? t('progress.completed') : t('progress.markComplete')}
                  >
                    {isCurrentStepCompleted() ? (
                      <Check size={16} />
                    ) : (
                      <Circle size={16} />
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
                      backgroundColor: pageColors.hoverBg,
                      opacity: hasNext ? 1 : 0.4,
                      cursor: hasNext ? 'pointer' : 'not-allowed'
                    }}
                    onMouseEnter={(e) => {
                      if (hasNext) {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                    }}
                    title={t('navigation.next')}
                  >
                    <ChevronRightNav size={20} style={{ color: pageColors.text }} />
                  </button>

                  {/* Close button */}
                  <button
                    onClick={closeTestViewer}
                    className="p-1.5 rounded-lg transition-all ml-1 sm:ml-2"
                    style={{ backgroundColor: pageColors.hoverBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                    }}
                    title={t('common.back')}
                  >
                    <X size={20} style={{ color: pageColors.text }} />
                  </button>
                </div>
              </div>

              {/* Test Content */}
              <div className="flex-1 overflow-y-auto">
                {viewingAttemptId ? (
                  // 🆕 NUEVO: Mostrar detalles de intento previo
                  attemptDetailsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: pageColors.text }} />
                        <p className="text-lg font-medium" style={{ color: pageColors.text }}>
                          {t('tests.loadingAttemptDetails')}
                        </p>
                      </div>
                    </div>
                  ) : attemptDetailsError ? (
                    <div className="flex items-center justify-center h-full p-8">
                      <div 
                        className="text-center p-6 rounded-lg border-2"
                        style={{
                          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                          borderColor: '#ef4444'
                        }}
                      >
                        <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
                        <p className="text-lg font-medium mb-2" style={{ color: '#ef4444' }}>
                          {t('tests.errorLoadingAttempt')}
                        </p>
                        <p className="text-sm" style={{ color: pageColors.textMuted }}>
                          {attemptDetailsError}
                        </p>
                        <button
                          onClick={handleBackFromAttemptView}
                          className="mt-4 px-4 py-2 rounded-lg font-medium"
                          style={{
                            backgroundColor: getColor('primary', '#1a202c'),
                            color: '#ffffff'
                          }}
                        >
                          {t('common.back')}
                        </button>
                      </div>
                    </div>
                  ) : attemptDetails ? (
                    <div className="h-full flex flex-col relative">
                      {/* Botón flotante de volver - posición absoluta */}
                      <button
                        onClick={handleBackFromAttemptView}
                        className="absolute top-4 left-4 z-10 p-2 rounded-full shadow-lg transition-all"
                        style={{ 
                          backgroundColor: pageColors.bgCard,
                          border: `2px solid ${pageColors.borderSubtle}`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c');
                          e.currentTarget.querySelector('svg').style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = pageColors.bgCard;
                          e.currentTarget.querySelector('svg').style.color = pageColors.text;
                        }}
                        title={t('common.back')}
                      >
                        <ChevronLeft size={24} style={{ color: pageColors.text }} />
                      </button>
                      
                      {/* Renderizar QuizResults - h-full para ocupar todo el espacio */}
                      <div className="h-full overflow-hidden">
                        <QuizResults
                          result={{
                            ...attemptDetails.attempt,
                            detailed_results: attemptDetails.detailed_results
                          }}
                          quizTitle={attemptDetails.attempt.quizTitle || selectedTest?.title}
                          questions={attemptDetails.questions}
                          noPadding={true}
                        />
                      </div>
                    </div>
                  ) : null
                ) : !isQuizRunning && !quizResults ? (
                  // Mostrar info del test
                  <div className="max-w-4xl mx-auto pt-8 pb-24 px-8">
                  {/* Estadísticas del Test - Solo si el usuario tiene nota */}
                  {rankingLoading ? (
                    // Loading skeleton
                    <div className="mb-6">
                      <div 
                        className="rounded-xl overflow-hidden border-2 animate-pulse"
                        style={{ 
                          backgroundColor: getColor('secondaryBackground'),
                          borderColor: getColor('borderColor')
                        }}
                      >
                        <div className="h-48" style={{ backgroundColor: `${getColor('primary', '#1a202c')}05` }}></div>
                        <div style={{ height: '1px', backgroundColor: 'rgba(156, 163, 175, 0.2)' }} />
                        <div className="h-48" style={{ backgroundColor: `${getColor('accent', '#f59e0b')}05` }}></div>
                      </div>
                    </div>
                  ) : hasUserStats ? (
                    <div className="mb-6">
                      
                      {/* Contenedor unificado con borde */}
                      <div 
                        className="rounded-xl overflow-hidden border-2"
                        style={{ 
                          backgroundColor: getColor('secondaryBackground'),
                          borderColor: getColor('borderColor')
                        }}
                      >
                        {/* Sin Riesgo - Primera fila */}
                        <div>
                          {/* Header Sin Riesgo */}
                          <div 
                            className="px-4 py-3"
                            style={{ 
                              backgroundColor: getColor('primary', '#1a202c')
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                                {t('tests.withoutRisk')}
                              </h4>
                              <div 
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: getColor('textColorContrast', '#ffffff') }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Contenido Sin Riesgo - Grid de 3 columnas */}
                          <div 
                            className="grid px-4 py-3"
                            style={{ 
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '1rem'
                            }}
                          >
                            {/* Mi Nota */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: pageColors.textMuted }}>
                                  {t('tests.myScore')}
                                </span>
                              </div>
                              <div className="text-2xl font-bold" style={{ color: pageColors.text }}>
                                {formatScore(userStats?.score || 0)}
                              </div>
                            </div>

                            {/* Media UA */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: pageColors.textMuted }}>
                                  {t('tests.avgScore')}
                                </span>
                              </div>
                              <div className="text-2xl font-bold" style={{ color: pageColors.text }}>
                                {formatScore(ranking?.statistics?.avg_score_without_risk || 0)}
                              </div>
                            </div>

                            {/* Mi Percentil (diferencia) */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: pageColors.textMuted }}>
                                  {t('tests.percentile')}
                                </span>
                              </div>
                              <div 
                                className="text-2xl font-extrabold flex items-baseline gap-1"
                                style={{ 
                                  color: calculatePercentile(userStats?.score || 0, false) >= 0 ? '#10b981' : '#ef4444'
                                }}
                              >
                                <span>
                                  {calculatePercentile(userStats?.score || 0, false) >= 0 ? '+' : ''}
                                  {formatScore(calculatePercentile(userStats?.score || 0, false))}
                                </span>
                                <span className="text-xs font-medium" style={{ color: pageColors.textMuted }}>
                                  pts
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Separador horizontal */}
                        <div 
                          style={{ 
                            height: '1px', 
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }} 
                        />

                        {/* Con Riesgo - Segunda fila */}
                        <div>
                          {/* Header Con Riesgo */}
                          <div 
                            className="px-4 py-3"
                            style={{ 
                              backgroundColor: getColor('accent', '#f59e0b')
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                                {t('tests.withRisk')}
                              </h4>
                              <div 
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: getColor('textColorContrast', '#ffffff') }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Contenido Con Riesgo - Grid de 3 columnas */}
                          <div 
                            className="grid px-4 py-3"
                            style={{ 
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '1rem'
                            }}
                          >
                            {/* Mi Nota */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: pageColors.textMuted }}>
                                  {t('tests.myScore')}
                                </span>
                              </div>
                              <div className="text-2xl font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                {formatScore(userStats?.score_with_risk || 0)}
                              </div>
                            </div>

                            {/* Media UA */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: pageColors.textMuted }}>
                                  {t('tests.avgScore')}
                                </span>
                              </div>
                              <div className="text-2xl font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                {formatScore(ranking?.statistics?.avg_score_with_risk || 0)}
                              </div>
                            </div>

                            {/* Mi Percentil (diferencia) */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: pageColors.textMuted }}>
                                  {t('tests.percentile')}
                                </span>
                              </div>
                              <div 
                                className="text-2xl font-extrabold flex items-baseline gap-1"
                                style={{ 
                                  color: calculatePercentile(userStats?.score_with_risk || 0, true) >= 0 ? '#10b981' : '#ef4444'
                                }}
                              >
                                <span>
                                  {calculatePercentile(userStats?.score_with_risk || 0, true) >= 0 ? '+' : ''}
                                  {formatScore(calculatePercentile(userStats?.score_with_risk || 0, true))}
                                </span>
                                <span className="text-xs font-medium" style={{ color: pageColors.textMuted }}>
                                  pts
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Test Info Card */}
                  <div 
                    className="rounded-xl overflow-hidden border-2"
                    style={{ 
                      backgroundColor: getColor('secondaryBackground'),
                      borderColor: getColor('borderColor')
                    }}
                  >
                    {/* Header con título y estado */}
                    <div 
                      className="px-4 py-3"
                      style={{ 
                        backgroundColor: getColor('primary', '#1a202c')
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-0.5" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                            {selectedTest.title}
                          </h3>
                          {selectedTest.data?.description && (
                            <p className="text-xs" style={{ color: getColor('textColorContrast', '#ffffff'), opacity: 0.8 }}>
                              {selectedTest.data.description}
                            </p>
                          )}
                        </div>
                        {isCurrentStepCompleted() && (
                          <div 
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-4 flex-shrink-0"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                          >
                            <CheckCircle size={16} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                            <span className="text-xs font-medium" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                              {t('progress.completed')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Separador */}
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />

                    {/* Widgets Horizontales - Info del Test */}
                    <div 
                      className="grid grid-cols-3"
                      style={{ 
                        minHeight: '80px'
                      }}
                    >
                        {/* Preguntas */}
                        <div 
                          className="flex flex-col items-center justify-center py-3 border-r transition-all duration-200"
                          style={{ 
                            borderColor: pageColors.borderSubtle,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = pageColors.bgSubtle}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <HelpCircle 
                            size={20} 
                            style={{ color: pageColors.text }} 
                            className="mb-1" 
                          />
                          <span 
                            className="text-xl font-bold"
                            style={{ color: pageColors.text }}
                          >
                            {selectedTest.data?.question_count || '?'}
                          </span>
                          <span 
                            className="text-[10px] mt-0.5"
                            style={{ color: pageColors.textMuted }}
                          >
                            {t('tests.questions')}
                          </span>
                        </div>

                        {/* Tiempo Límite */}
                        <div 
                          className="flex flex-col items-center justify-center py-3 border-r transition-all duration-200"
                          style={{ 
                            borderColor: pageColors.borderSubtle,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = pageColors.bgSubtle}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Clock 
                            size={20} 
                            style={{ color: pageColors.text }} 
                            className="mb-1" 
                          />
                          <span 
                            className="text-xl font-bold"
                            style={{ color: pageColors.text }}
                          >
                            {selectedTest.data?.time_limit ? `${selectedTest.data.time_limit}` : '∞'}
                          </span>
                          <span 
                            className="text-[10px] mt-0.5"
                            style={{ color: pageColors.textMuted }}
                          >
                            {selectedTest.data?.time_limit ? t('tests.minutes') : t('tests.noTimeLimit')}
                          </span>
                        </div>

                        {/* Dificultad */}
                        <div 
                          className="flex flex-col items-center justify-center py-3 transition-all duration-200"
                          style={{ 
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = pageColors.bgSubtle}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Target 
                            size={20} 
                            style={{ color: pageColors.text }} 
                            className="mb-1" 
                          />
                          <span 
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: (() => {
                                const diff = selectedTest.data?.difficulty || 'medium';
                                return diff === 'easy' ? '#10b98120' : diff === 'hard' ? '#ef444420' : '#f59e0b20';
                              })(),
                              color: (() => {
                                const diff = selectedTest.data?.difficulty || 'medium';
                                return diff === 'easy' ? '#10b981' : diff === 'hard' ? '#ef4444' : '#f59e0b';
                              })()
                            }}
                          >
                            {(() => {
                              const diff = selectedTest.data?.difficulty || 'medium';
                              return diff === 'easy' ? t('tests.easy') : diff === 'hard' ? t('tests.hard') : t('tests.medium');
                            })()}
                          </span>
                          <span 
                            className="text-[10px] mt-1"
                            style={{ color: pageColors.textMuted }}
                          >
                            {t('tests.difficulty')}
                          </span>
                        </div>
                      </div>
                    
                    {/* Separador inferior */}
                    <div 
                      style={{ 
                        height: '1px', 
                        backgroundColor: 'rgba(156, 163, 175, 0.2)'
                      }} 
                    />

                    {/* Botones de acción */}
                    <div className="p-4">
                      {/* Botón de comenzar - ahora ocupa todo el ancho */}
                      <button
                        onClick={async () => {
                          console.log('🎯 Comenzar test - selectedTest:', selectedTest);
                          console.log('🎯 quiz_id extraído:', quizId);
                          
                          if (quizId) {
                            try {
                              // Cargar el quiz completo desde la API
                              const { getQuiz } = await import('../../../api/services/quizService');
                              const quizData = await getQuiz(quizId);
                              console.log('✅ Quiz cargado:', quizData);
                              
                              setQuizToStart(quizData);
                              setIsQuizRunning(true);
                              setIsQuizFocusMode(true); // 🎯 Activate focus mode
                            } catch (error) {
                              console.error('❌ Error loading quiz:', error);
                            }
                          } else {
                            console.error('❌ No quiz_id found');
                          }
                        }}
                        className="w-full py-3 rounded-lg font-bold text-base transition-all flex items-center justify-center gap-2 shadow-md"
                        style={{ 
                          backgroundColor: getColor('primary', '#1a202c'),
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}dd`;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c');
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                        }}
                      >
                        <Play size={20} />
                        <span>{isCurrentStepCompleted() ? t('tests.retake') : t('tests.startTest')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Historial de Intentos - Solo si el usuario ha hecho el test */}
                  {quizAttempts.length > 0 && !attemptsLoading && (
                    <div className="mt-6">
                      <div 
                        className="rounded-xl overflow-hidden border-2"
                        style={{ 
                          backgroundColor: getColor('secondaryBackground'),
                          borderColor: getColor('borderColor')
                        }}
                      >
                        {/* Header con fondo de color */}
                        <div 
                          className="px-4 py-3 flex items-center justify-between"
                          style={{ 
                            backgroundColor: getColor('primary', '#1a202c')
                          }}
                        >
                          <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                            {t('tests.recentAttempts')}
                          </h3>
                          <span className="text-[10px] font-medium" style={{ color: getColor('textColorContrast', '#ffffff'), opacity: 0.8 }}>
                            {t('tests.last5Attempts')}
                          </span>
                        </div>
                        
                        {/* Separador */}
                        <div 
                          style={{ 
                            height: '1px', 
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }} 
                        />

                        {quizAttempts.map((attempt, index) => {
                          const percentileWithoutRisk = calculatePercentile(attempt.score || 0, false);
                          const percentileWithRisk = calculatePercentile(attempt.score_with_risk || 0, true);
                          
                          return (
                            <div key={attempt.attempt_id || attempt.id || index}>
                              {/* Layout Mobile */}
                              <div className="sm:hidden px-4 py-3 space-y-3">
                                {/* Header: Fecha + Estado */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Calendar size={14} style={{ color: getColor('textSecondary', '#6b7280') }} />
                                    <span className="text-xs font-medium" style={{ color: getColor('textPrimary', '#1a202c') }}>
                                      {new Date(attempt.end_time?.replace(' ', 'T')).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {attempt.passed ? (
                                      <>
                                        <CheckCircle size={14} style={{ color: '#10b981' }} />
                                        <span className="text-xs font-medium" style={{ color: '#10b981' }}>
                                          {t('tests.passed')}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle size={14} style={{ color: '#ef4444' }} />
                                        <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
                                          {t('tests.failed')}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Scores */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div 
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: pageColors.bgSubtle }}
                                  >
                                    <div className="text-[10px] mb-1" style={{ color: pageColors.textMuted }}>
                                      {t('tests.withoutRisk')}
                                    </div>
                                    <div className="text-base font-bold" style={{ color: pageColors.text }}>
                                      {formatScore(attempt.score || 0)}
                                    </div>
                                    <span 
                                      className="text-[10px] font-medium"
                                      style={{ color: percentileWithoutRisk >= 0 ? '#10b981' : '#ef4444' }}
                                    >
                                      {percentileWithoutRisk >= 0 ? '+' : ''}{formatScore(percentileWithoutRisk)}
                                    </span>
                                  </div>

                                  <div 
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: `${getColor('accent', '#f59e0b')}10` }}
                                  >
                                    <div className="text-[10px] mb-1" style={{ color: pageColors.textMuted }}>
                                      {t('tests.withRisk')}
                                    </div>
                                    <div className="text-base font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                      {formatScore(attempt.score_with_risk || 0)}
                                    </div>
                                    <span 
                                      className="text-[10px] font-medium"
                                      style={{ color: percentileWithRisk >= 0 ? '#10b981' : '#ef4444' }}
                                    >
                                      {percentileWithRisk >= 0 ? '+' : ''}{formatScore(percentileWithRisk)}
                                    </span>
                                  </div>
                                </div>

                                {/* Botón Ver Detalles */}
                                <button
                                  onClick={() => {
                                    const attemptId = attempt.attempt_id || attempt.id;
                                    handleViewAttemptDetails(attemptId);
                                  }}
                                  className="w-full px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs"
                                  style={{ 
                                    backgroundColor: pageColors.hoverBg,
                                    color: pageColors.text
                                  }}
                                >
                                  <Eye size={14} />
                                  <span className="font-medium">{t('tests.details')}</span>
                                </button>
                              </div>

                              {/* Layout Desktop */}
                              <div className="hidden sm:grid sm:grid-cols-5 gap-4 items-center px-4 py-3">
                                {/* Fecha */}
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} style={{ color: pageColors.textMuted }} />
                                  <span className="text-xs font-medium" style={{ color: pageColors.text }}>
                                    {new Date(attempt.end_time?.replace(' ', 'T')).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                {/* Nota Sin Riesgo */}
                                <div className="flex flex-col">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-base font-bold" style={{ color: pageColors.text }}>
                                      {formatScore(attempt.score || 0)}
                                    </span>
                                  </div>
                                  <span 
                                    className="text-[10px] font-medium"
                                    style={{ color: percentileWithoutRisk >= 0 ? '#10b981' : '#ef4444' }}
                                  >
                                    {percentileWithoutRisk >= 0 ? '+' : ''}{formatScore(percentileWithoutRisk)}
                                  </span>
                                </div>

                                {/* Nota Con Riesgo */}
                                <div className="flex flex-col">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-base font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                      {formatScore(attempt.score_with_risk || 0)}
                                    </span>
                                  </div>
                                  <span 
                                    className="text-[10px] font-medium"
                                    style={{ color: percentileWithRisk >= 0 ? '#10b981' : '#ef4444' }}
                                  >
                                    {percentileWithRisk >= 0 ? '+' : ''}{formatScore(percentileWithRisk)}
                                  </span>
                                </div>

                                {/* Estado */}
                                <div className="flex items-center gap-1.5">
                                  {attempt.passed ? (
                                    <>
                                      <CheckCircle size={16} style={{ color: '#10b981' }} />
                                      <span className="text-xs font-medium" style={{ color: '#10b981' }}>
                                        {t('tests.passed')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle size={16} style={{ color: '#ef4444' }} />
                                      <span className="text-xs font-medium" style={{ color: '#ef4444' }}>
                                        {t('tests.failed')}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Detalles */}
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => {
                                      const attemptId = attempt.attempt_id || attempt.id;
                                      handleViewAttemptDetails(attemptId);
                                    }}
                                    className="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 text-xs"
                                    style={{ 
                                      backgroundColor: pageColors.hoverBg,
                                      color: pageColors.text
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    title={t('tests.viewDetails')}
                                  >
                                    <Eye size={14} />
                                    <span className="font-medium">{t('tests.details')}</span>
                                  </button>
                                </div>
                              </div>
                              
                              {/* Separador horizontal */}
                              {index < quizAttempts.length - 1 && (
                                <div 
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
                ) : !quizResults ? (
                  // Mostrar Quiz component
                  quizToStart && (
                    <Quiz
                      quizId={quizToStart.id}
                      lessonId={selectedLesson?.id}
                      onQuizComplete={handleQuizComplete}
                      isDrawingMode={isDrawingMode}
                      setIsDrawingMode={setIsDrawingMode}
                      isDrawingEnabled={isDrawingEnabled}
                      setIsDrawingEnabled={setIsDrawingEnabled}
                      showDrawingToolbar={showDrawingToolbar}
                      setShowDrawingToolbar={setShowDrawingToolbar}
                      drawingTool={drawingTool}
                      drawingColor={drawingColor}
                      drawingLineWidth={drawingLineWidth}
                      onDrawingToolChange={setDrawingTool}
                      onDrawingColorChange={setDrawingColor}
                      onDrawingLineWidthChange={setDrawingLineWidth}
                      onClearCanvas={handleClearCanvas}
                    />
                  )
                ) : (
                  // Mostrar resultados
                  <div className="h-full flex flex-col relative">
                    {/* Botón flotante de volver */}
                    <button
                      onClick={handleCloseResults}
                      className="absolute top-4 left-4 z-10 p-2 rounded-full shadow-lg transition-all"
                      style={{ 
                        backgroundColor: getColor('background', '#ffffff'),
                        border: `2px solid ${getColor('primary', '#1a202c')}15`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c');
                        e.currentTarget.querySelector('svg').style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = getColor('background', '#ffffff');
                        e.currentTarget.querySelector('svg').style.color = getColor('primary', '#1a202c');
                      }}
                      title={t('tests.backToInfo')}
                    >
                      <ChevronLeft size={24} style={{ color: getColor('primary', '#1a202c') }} />
                    </button>
                    
                    {/* QuizResults sin padding para ocupar todo el espacio */}
                    <div className="h-full overflow-hidden">
                      <QuizResults
                        result={quizResults}
                        quizTitle={resultsQuizInfo?.title?.rendered || resultsQuizInfo?.title || selectedTest?.data?.title}
                        questions={resultsQuestions}
                        noPadding={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 🏆 Ranking Panel - Slides from right */}
        <CourseRankingSlidePanel />
      </div>
      </CourseRankingProvider>
    </CoursePageTemplate>
    
    {/* 🎯 FOCUS MODE: Full-screen Quiz overlay */}
    {isQuizFocusMode && quizToStart && (
      <div 
        className="fixed inset-0 z-[9999] flex flex-col pt-10"
        style={{ 
          backgroundColor: getColor('background', '#ffffff')
        }}
      >
        <div className="w-full flex-1 overflow-hidden">
          <Quiz
            quizId={quizToStart.id}
            lessonId={selectedLesson?.id}
            onQuizComplete={handleQuizComplete}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            isDrawingEnabled={isDrawingEnabled}
            setIsDrawingEnabled={setIsDrawingEnabled}
            showDrawingToolbar={showDrawingToolbar}
            setShowDrawingToolbar={setShowDrawingToolbar}
            drawingTool={drawingTool}
            drawingColor={drawingColor}
            drawingLineWidth={drawingLineWidth}
            onDrawingToolChange={setDrawingTool}
            onDrawingColorChange={setDrawingColor}
            onDrawingLineWidthChange={setDrawingLineWidth}
            onClearCanvas={handleClearCanvas}
          />
        </div>
      </div>
    )}
  </>
  );
};

export default TestsPage;
