import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScoreFormat } from '../../../contexts/ScoreFormatContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import useQuizRanking from '../../../hooks/useQuizRanking';
import useQuizAttempts from '../../../hooks/useQuizAttempts';
import useQuizAttemptDetails from '../../../hooks/useQuizAttemptDetails';
import useLessons from '../../../hooks/useLessons';
import useCourses from '../../../hooks/useCourses';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import { getQuizzes } from '../../../api/services/quizService';
import { isUserAdmin } from '../../../utils/userUtils';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import Quiz from '../../../components/frontend/Quiz';
import QuizResults from '../../../components/frontend/QuizResults';
import LessonModal from '../../../components/lessons/LessonModal';
import UnifiedTestModal from '../../../components/tests/UnifiedTestModal';
import { CourseRankingProvider, CourseRankingTrigger, CourseRankingSlidePanel } from '../../../components/frontend/CourseRankingPanel';
import { ChevronDown, ChevronUp, ChevronRight, ClipboardList, CheckCircle, Circle, Clock, Award, X, ChevronLeft, ChevronRight as ChevronRightNav, Play, Check, HelpCircle, Target, Calendar, Eye, XCircle, Loader, Trophy, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';

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
    textMuted: isDarkMode ? '#ffffff' : getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSubtle: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`,
    borderSubtle: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}15`,
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
    hoverBgStrong: isDarkMode ? 'rgba(255,255,255,0.15)' : `${getColor('primary', '#1a202c')}15`,
    // Button colors (same as CourseCard)
    buttonBg: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6'),
    buttonText: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    buttonHoverBg: isDarkMode ? getColor('primary', '#3b82f6') : getColor('accent', '#f59e0b'),
    // Container border - accent in dark mode for consistency
    containerBorder: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb'),
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

  // Admin functionality
  const userIsAdmin = isUserAdmin();
  const lessonsManager = useLessons({ autoFetch: false, courseId: courseId });
  const coursesHook = useCourses({ autoFetch: false, status: 'publish,draft,private' });
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Modal states for admin
  const [lessonModalState, setLessonModalState] = useState({
    isOpen: false,
    mode: 'create',
    lesson: null
  });
  const [testModalState, setTestModalState] = useState({
    isOpen: false,
    mode: 'create',
    lessonId: null,
    testIndex: null,
    test: null
  });
  const [deleteThemeModalState, setDeleteThemeModalState] = useState({
    isOpen: false,
    lesson: null
  });

  // Load quizzes for test modal
  useEffect(() => {
    if (userIsAdmin && loadingQuizzes === false && allQuizzes.length === 0) {
      const fetchQuizzes = async () => {
        setLoadingQuizzes(true);
        try {
          const response = await getQuizzes({ perPage: 100, status: 'publish,draft,private' });
          setAllQuizzes(response.data || []);
        } catch (error) {
          console.error('Error loading quizzes:', error);
        } finally {
          setLoadingQuizzes(false);
        }
      };
      fetchQuizzes();
    }
  }, [userIsAdmin]);

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

  // Obtener quiz_id del test seleccionado
  const quizId = selectedTest?.data?.quiz_id;

  // Hook para obtener ranking y estadísticas del quiz
  const { ranking, loading: rankingLoading } = useQuizRanking(quizId);

  // Hook para obtener los intentos del usuario para este quiz específico (últimos 5)
  const { attempts: quizAttempts, loading: attemptsLoading, fetchAttempts: refetchAttempts } = useQuizAttempts({ 
    quizId: quizId, 
    perPage: 5, 
    autoFetch: false // No auto-fetch, lo haremos cuando quizId cambie
  });

  // Refetch cuando cambia el quizId
  React.useEffect(() => {
    if (quizId) {
      refetchAttempts(1);
    }
  }, [quizId, refetchAttempts]);

  // 🆕 Hook para cargar detalles de un intento específico
  const { details: attemptDetails, loading: attemptDetailsLoading, error: attemptDetailsError } = useQuizAttemptDetails(viewingAttemptId);

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

  // 🔄 Reset state when navigating to tests page without specific state (clean navigation)
  useEffect(() => {
    // If there's no state (clean navigation from sidebar), reset to list view
    if (!location.state) {
      setSelectedTest(null);
      setSelectedLesson(null);
      setQuizToStart(null);
      setQuizResults(null);
      setResultsQuestions(null);
      setResultsQuizInfo(null);
      setIsQuizRunning(false);
      setIsQuizFocusMode(false);
      setViewingAttemptId(null);
      hasProcessedNavigation.current = false;
    }
  }, [location.key]); // location.key changes on every navigation

  // 🎯 FOCUS MODE: Hide body overflow and Topbar when quiz is running
  useEffect(() => {
    if (isQuizFocusMode) {
      // Hide body overflow and add class to hide topbar
      document.body.style.overflow = 'hidden';
      document.body.classList.add('qe-quiz-focus-mode');
    } else {
      // Restore body overflow and remove class
      document.body.style.overflow = '';
      document.body.classList.remove('qe-quiz-focus-mode');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('qe-quiz-focus-mode');
    };
  }, [isQuizFocusMode]);

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
      
      // Map lessons with their quiz steps (show all lessons, even without tests)
      const lessonsWithTests = (result.data || [])
        .map(lesson => {
          const quizSteps = (lesson.meta?._lesson_steps || [])
            .filter(step => step.type === 'quiz')
            .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
          
          return {
            ...lesson,
            quizSteps
          };
        });
      
      setLessons(lessonsWithTests);
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
      const shouldResumeAutosave = location.state?.resumeAutosave;
      console.log('TestsPage - scrolling to quiz:', quizId, 'type:', typeof quizId, 'resumeAutosave:', shouldResumeAutosave);
      console.log('TestsPage - available lessons:', lessons.length);
      
      // Find and open the quiz
      let found = false;
      for (const lesson of lessons) {
        console.log('TestsPage - checking lesson:', lesson.id, 'quizSteps:', lesson.quizSteps?.length);
        // Use loose comparison to handle string/number mismatch
        const quizStep = lesson.quizSteps?.find(step => {
          const stepQuizId = step.data?.quiz_id;
          console.log('TestsPage - comparing stepQuizId:', stepQuizId, 'with quizId:', quizId);
          return String(stepQuizId) === String(quizId);
        });
        if (quizStep) {
          console.log('TestsPage - Found quiz step:', quizStep);
          found = true;
          setSelectedTest(quizStep);
          setSelectedLesson(lesson);
          setQuizResults(null);
          setResultsQuestions(null);
          setResultsQuizInfo(null);
          setViewingAttemptId(null);
          
          // If resumeAutosave flag is set, trigger the start quiz flow which will show recovery modal
          if (shouldResumeAutosave) {
            // Keep loading true while we load the quiz
            // Load the full quiz data before starting (same as clicking "Start" button)
            const stepQuizId = quizStep.data?.quiz_id;
            if (stepQuizId) {
              (async () => {
                try {
                  const { getQuiz } = await import('../../../api/services/quizService');
                  const quizData = await getQuiz(stepQuizId);
                  console.log('✅ Quiz loaded for resume:', quizData);
                  setQuizToStart(quizData);
                  setIsQuizRunning(true);
                  setIsQuizFocusMode(true);
                  setLoading(false); // Only stop loading after quiz is ready
                } catch (error) {
                  console.error('❌ Error loading quiz for resume:', error);
                  setLoading(false);
                }
              })();
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
            setIsQuizRunning(false);
            setQuizToStart(null);
            setIsQuizFocusMode(false);
          }
          
          // 🔥 Marcar como procesado
          hasProcessedNavigation.current = true;
          break;
        }
      }
      
      if (!found) {
        console.warn('TestsPage - Quiz not found in any lesson! quizId:', quizId);
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
    
    // Refrescar historial de intentos para que aparezca el nuevo
    if (quizId) {
      setTimeout(() => refetchAttempts(1), 500); // Pequeño delay para que el backend guarde
    }
    
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
    // Limpiar resultados y volver a la lista de tests
    setQuizResults(null);
    setResultsQuestions(null);
    setResultsQuizInfo(null);
    setQuizToStart(null);
    setSelectedTest(null);
    setSelectedLesson(null);
    setIsQuizFocusMode(false); // 🎯 Deactivate focus mode
  };

  const handleExitQuiz = () => {
    // Salir del quiz y volver a la vista de info (el progreso ya se guarda automáticamente con autosave)
    setIsQuizRunning(false);
    setQuizToStart(null);
    setIsQuizFocusMode(false);
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

  // ============ ADMIN HANDLERS ============

  const handleCreateLesson = () => {
    setLessonModalState({ isOpen: true, mode: 'create', lesson: null });
  };

  const handleSaveLesson = async (data, nextAction = 'close') => {
    try {
      if (lessonModalState.mode === 'create') {
        const newLesson = await lessonsManager.createLesson({
          ...data,
          courseId: courseId // Ensure it's assigned to current course
        });
        toast.success(t('admin.lessons.createSuccess'));
        
        await fetchLessons();
        
        if (nextAction === 'addTest') {
          handleAddTest(newLesson.id);
        }
        
        handleCloseLessonModal();
      } else {
        await lessonsManager.updateLesson(lessonModalState.lesson.id, data);
        toast.success(t('admin.lessons.updateSuccess'));
        await fetchLessons();
        handleCloseLessonModal();
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error(t('errors.saveLesson'));
      throw error;
    }
  };

  const handleCloseLessonModal = () => {
    setLessonModalState({ isOpen: false, mode: 'create', lesson: null });
  };

  const handleAddTest = (lessonId) => {
    setTestModalState({
      isOpen: true,
      mode: 'create',
      lessonId: lessonId,
      testIndex: null,
      test: null
    });
  };

  const handleEditTest = (lessonId, testIndex, test) => {
    setTestModalState({
      isOpen: true,
      mode: 'edit',
      lessonId: lessonId,
      testIndex: testIndex,
      test: test
    });
  };

  const handleSaveTest = async (testData) => {
    try {
      const lesson = lessons.find(l => l.id === testModalState.lessonId);
      if (!lesson) throw new Error('Lesson not found');

      const currentSteps = lesson.meta?._lesson_steps || [];
      let updatedSteps;

      if (testModalState.mode === 'create') {
        updatedSteps = [...currentSteps, testData];
      } else {
        // Find the quiz step to edit by getting the nth quiz in the array
        const quizSteps = currentSteps.filter(s => s.type === 'quiz');
        const targetQuiz = quizSteps[testModalState.testIndex];
        
        updatedSteps = currentSteps.map(step => 
          step === targetQuiz ? testData : step
        );
      }

      // Update lesson with all required fields
      await lessonsManager.updateLesson(lesson.id, {
        title: lesson.title?.rendered || lesson.title,
        courseId: lesson.meta?._lesson_course?.[0] || courseId,
        meta: {
          _lesson_steps: updatedSteps
        }
      });

      await fetchLessons();
      toast.success(t('tests.testSaved'));
      handleCloseTestModal();
    } catch (error) {
      console.error('Error saving test:', error);
      throw error;
    }
  };

  const handleDeleteTest = async (lessonId, testIndex) => {
    if (!window.confirm(t('tests.deleteConfirm'))) return;
    
    try {
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) throw new Error('Lesson not found');

      const currentSteps = lesson.meta?._lesson_steps || [];
      const quizSteps = currentSteps.filter(s => s.type === 'quiz');
      const testToDelete = quizSteps[testIndex];
      
      const updatedSteps = currentSteps.filter(step => step !== testToDelete);

      // Update lesson with all required fields
      await lessonsManager.updateLesson(lesson.id, {
        title: lesson.title?.rendered || lesson.title,
        courseId: lesson.meta?._lesson_course?.[0] || courseId,
        meta: {
          _lesson_steps: updatedSteps
        }
      });

      await fetchLessons();
      toast.success(t('tests.testDeleted'));
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error(t('tests.deleteError'));
    }
  };

  const handleCloseTestModal = () => {
    setTestModalState({
      isOpen: false,
      mode: 'create',
      lessonId: null,
      testIndex: null,
      test: null
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
      toast.success(t('tests.themeDeleted'));
      handleCloseDeleteThemeModal();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error(t('tests.deleteThemeError'));
    }
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
                    {t('tests.createTheme')}
                  </button>
                </div>
              )}

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
                    borderColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('borderColor', '#e5e7eb')
                  }}
                >
                  {lessons.map((lesson, lessonIndex) => {
                    const isExpanded = expandedLessons.has(lesson.id);
                    const testsCount = lesson.quizSteps.length;
                    const lessonTitle = lesson.title?.rendered || lesson.title || t('courses.untitledLesson');

                    return (
                      <div key={lesson.id} id={`lesson-${lesson.id}`}>
                        {/* Lesson Header */}
                        <div
                          className="w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-all duration-200"
                          style={{ 
                            backgroundColor: pageColors.bgSubtle
                          }}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <ClipboardList size={20} style={{ color: pageColors.text }} className="flex-shrink-0" />
                            <span className="font-semibold text-left truncate" style={{ color: pageColors.text }}>
                              {lessonTitle}
                            </span>
                          </div>
                          
                          {/* Badge count + Expand/Collapse Button + Admin Actions */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <span 
                              className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full"
                              style={{ 
                                backgroundColor: pageColors.hoverBg,
                                color: pageColors.text
                              }}
                            >
                              {testsCount} <span className="hidden sm:inline">{testsCount === 1 ? t('tests.test') : t('tests.tests')}</span>
                            </span>

                            {/* Admin: Delete Theme Button */}
                            {userIsAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteThemeModal(lesson);
                                }}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                                title={t('tests.deleteTheme') || 'Delete Theme'}
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

                            {/* Admin: Add Test Button */}
                            {userIsAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddTest(lesson.id);
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
                                <span className="hidden sm:inline">{t('tests.addTest') || 'Add Test'}</span>
                              </button>
                            )}
                            
                            {/* Expand/Collapse Button - same style as CourseCard */}
                            <button
                              onClick={() => testsCount > 0 && toggleLesson(lesson.id)}
                              disabled={testsCount === 0}
                              className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                              style={{ 
                                backgroundColor: pageColors.buttonBg,
                                color: pageColors.buttonText
                              }}
                              onMouseEnter={(e) => {
                                if (testsCount === 0) return;
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
                              {isExpanded ? t('tests.hideLesson') : t('tests.showLesson')}
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

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
                              const questionCount = step.data?.question_count || null; // 🆕 Get question count
                              
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
                                  {/* Separador horizontal - full width for first item, with margin for others */}
                                  <div 
                                    className={stepIndex > 0 ? "mx-6" : ""}
                                    style={{ 
                                      height: '2px', 
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
                                          
                                          {/* Número de preguntas */}
                                          {questionCount && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <HelpCircle size={12} style={{ color: pageColors.textMuted }} />
                                              <span className="text-xs" style={{ color: pageColors.textMuted }}>
                                                {questionCount} {t('tests.questions')}
                                              </span>
                                            </div>
                                          )}
                                          
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
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {/* Admin: Edit and Delete Buttons */}
                                      {userIsAdmin && (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditTest(lesson.id, stepIndex, step);
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
                                              handleDeleteTest(lesson.id, stepIndex);
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
                                        onClick={() => handleOpenTest(step, lesson)}
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
                                        {t('tests.available')}
                                      </button>
                                    </div>
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
                    className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium"
                    style={{ 
                      backgroundColor: pageColors.hoverBg,
                      opacity: hasPrevious ? 1 : 0.4,
                      cursor: hasPrevious ? 'pointer' : 'not-allowed',
                      color: pageColors.text
                    }}
                    onMouseEnter={(e) => {
                      if (hasPrevious) {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.hoverBg;
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
                      backgroundColor: pageColors.hoverBg,
                      opacity: hasNext ? 1 : 0.4,
                      cursor: hasNext ? 'pointer' : 'not-allowed',
                      color: pageColors.text
                    }}
                    onMouseEnter={(e) => {
                      if (hasNext) {
                        e.currentTarget.style.backgroundColor = pageColors.hoverBgStrong;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = pageColors.hoverBg;
                    }}
                  >
                    <span>{t('navigation.next')}</span>
                    <ChevronRightNav size={16} style={{ color: pageColors.text }} />
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
                    <div className="h-full overflow-hidden">
                      <QuizResults
                        result={{
                          ...attemptDetails.attempt,
                          detailed_results: attemptDetails.detailed_results
                        }}
                        quizTitle={attemptDetails.attempt.quizTitle || selectedTest?.title}
                        questions={attemptDetails.questions}
                        noPadding={true}
                        difficulty={selectedTest?.data?.difficulty || 'medium'}
                        onBack={handleBackFromAttemptView}
                        courseId={courseId}
                        courseName={courseName}
                        lessonId={selectedLesson?.id}
                        lessonTitle={selectedLesson?.title}
                      />
                    </div>
                  ) : null
                ) : !isQuizRunning && !quizResults ? (
                  // Mostrar info del test
                  <div className="h-full flex flex-col p-4 overflow-y-auto">
                    {/* Contenedor principal sin borde */}
                    <div 
                      className="flex-1 flex flex-col p-4 max-w-7xl mx-auto w-full rounded-2xl"
                      style={{ 
                        backgroundColor: getColor('background', '#ffffff')
                      }}
                    >
                      {/* HEADER: Título del Quiz + Estado */}
                      <div 
                        className="px-4 py-2 flex-shrink-0 rounded-xl mb-3"
                        style={{ backgroundColor: getColor('primary', '#1a202c') }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold truncate" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                              {selectedTest.title}
                            </h3>
                            {selectedTest.data?.description && (
                              <p className="text-xs truncate mt-0.5" style={{ color: getColor('textColorContrast', '#ffffff'), opacity: 0.8 }}>
                                {selectedTest.data.description}
                              </p>
                            )}
                          </div>
                          {isCurrentStepCompleted() && (
                            <div 
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full ml-3 flex-shrink-0"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                            >
                              <CheckCircle size={14} style={{ color: getColor('textColorContrast', '#ffffff') }} />
                              <span className="text-[10px] font-medium" style={{ color: getColor('textColorContrast', '#ffffff') }}>
                                {t('progress.completed')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECCIÓN 1: Info del test (Dificultad, Preguntas, Tiempo) - Sin borde */}
                      <div className="flex items-center justify-center gap-6 mb-3 py-2">
                        {/* Dificultad */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('tests.difficulty')}:</span>
                          <span 
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
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
                        </div>
                        
                        {/* Separador */}
                        <div className="h-4 w-px" style={{ backgroundColor: pageColors.borderSubtle }}></div>
                        
                        {/* Preguntas */}
                        <div className="flex items-center gap-2">
                          <HelpCircle size={14} style={{ color: pageColors.textMuted }} />
                          <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('tests.questions')}:</span>
                          <span className="text-sm font-bold" style={{ color: pageColors.text }}>
                            {selectedTest.data?.question_count || '?'}
                          </span>
                        </div>
                        
                        {/* Separador */}
                        <div className="h-4 w-px" style={{ backgroundColor: pageColors.borderSubtle }}></div>
                        
                        {/* Tiempo */}
                        <div className="flex items-center gap-2">
                          <Clock size={14} style={{ color: pageColors.textMuted }} />
                          <span className="text-xs" style={{ color: pageColors.textMuted }}>{t('tests.time')}:</span>
                          <span className="text-sm font-bold" style={{ color: pageColors.text }}>
                            {selectedTest.data?.time_limit ? `${selectedTest.data.time_limit} min` : '∞'}
                          </span>
                        </div>
                      </div>

                      {/* SECCIÓN 2: Estadísticas Sin Arriesgar */}
                      {hasUserStats && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c') }}>
                            {t('tests.withoutRisk')}
                          </p>
                          <div 
                            className="rounded-xl overflow-hidden"
                            style={{ 
                              backgroundColor: getColor('primary', '#1a202c'),
                              border: isDarkMode ? '1px solid #ffffff' : 'none'
                            }}
                          >
                            <div className="grid grid-cols-3">
                              {/* Media UA */}
                              <div className="py-2 text-center">
                                <div className="text-[10px] uppercase mb-1 font-bold" style={{ color: isDarkMode ? getColor('accent', '#f59e0b') : '#ffffff' }}>{t('tests.avgScore')}</div>
                                <div className="text-lg font-bold" style={{ color: '#ffffff' }}>{formatScore(ranking?.statistics?.avg_score_without_risk || 0)}</div>
                              </div>
                              {/* Mi Nota */}
                              <div className="py-2 text-center">
                                <div className="text-[10px] uppercase mb-1 font-bold" style={{ color: isDarkMode ? getColor('accent', '#f59e0b') : '#ffffff' }}>{t('tests.myScore')}</div>
                                <div className="text-lg font-bold" style={{ color: '#ffffff' }}>{formatScore(userStats?.score || 0)}</div>
                              </div>
                              {/* Mi Percentil */}
                              <div className="py-2 text-center">
                                <div className="text-[10px] uppercase mb-1 font-bold" style={{ color: isDarkMode ? getColor('accent', '#f59e0b') : '#ffffff' }}>{t('tests.percentile')}</div>
                                <div className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                  {calculatePercentile(userStats?.score || 0, false) >= 0 ? '+' : ''}{formatScore(calculatePercentile(userStats?.score || 0, false))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SECCIÓN 3: Estadísticas Arriesgando */}
                      {hasUserStats && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c') }}>
                            {t('tests.withRisk')}
                          </p>
                          <div 
                            className="rounded-xl overflow-hidden"
                            style={{ 
                              backgroundColor: getColor('primary', '#1a202c'),
                              border: isDarkMode ? '1px solid #ffffff' : 'none'
                            }}
                          >
                            <div className="grid grid-cols-3">
                              {/* Media UA */}
                              <div className="py-2 text-center">
                                <div className="text-[10px] uppercase mb-1 font-bold" style={{ color: isDarkMode ? getColor('accent', '#f59e0b') : '#ffffff' }}>{t('tests.avgScore')}</div>
                                <div className="text-lg font-bold" style={{ color: '#ffffff' }}>{formatScore(ranking?.statistics?.avg_score_with_risk || 0)}</div>
                              </div>
                              {/* Mi Nota */}
                              <div className="py-2 text-center">
                                <div className="text-[10px] uppercase mb-1 font-bold" style={{ color: isDarkMode ? getColor('accent', '#f59e0b') : '#ffffff' }}>{t('tests.myScore')}</div>
                                <div className="text-lg font-bold" style={{ color: '#ffffff' }}>{formatScore(userStats?.score_with_risk || 0)}</div>
                              </div>
                              {/* Mi Percentil */}
                              <div className="py-2 text-center">
                                <div className="text-[10px] uppercase mb-1 font-bold" style={{ color: isDarkMode ? getColor('accent', '#f59e0b') : '#ffffff' }}>{t('tests.percentile')}</div>
                                <div className="text-lg font-bold" style={{ color: '#ffffff' }}>
                                  {calculatePercentile(userStats?.score_with_risk || 0, true) >= 0 ? '+' : ''}{formatScore(calculatePercentile(userStats?.score_with_risk || 0, true))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SECCIÓN 4: Historial de intentos */}
                      {quizAttempts.length > 0 && !attemptsLoading && (
                        <div className="mb-3 flex-1 flex flex-col min-h-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: pageColors.text }}>
                              {t('tests.recentAttempts')}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: pageColors.hoverBg, color: pageColors.textMuted }}>
                              {quizAttempts.slice(0, 5).length}/5
                            </span>
                          </div>
                          <div 
                            className="rounded-xl overflow-hidden flex-1 flex flex-col"
                            style={{ 
                              backgroundColor: isDarkMode ? '#000000' : '#ffffff',
                              border: isDarkMode ? '1px solid #ffffff' : 'none'
                            }}
                          >
                            {/* Header de columnas - 9 columnas: Intento, Fecha | Nota, Percentil, Nota Corte | Arriesgando, Percentil, Nota Corte | Ver */}
                            <div 
                              className="grid grid-cols-9 text-[9px] uppercase tracking-wide font-bold py-2 px-3 border-b"
                              style={{ 
                                color: isDarkMode ? getColor('accent', '#f59e0b') : '#ffffff', 
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', 
                                backgroundColor: isDarkMode ? getColor('primary', '#1a202c') : '#000000' 
                              }}
                            >
                              <div>{t('tests.attempt')}</div>
                              <div>{t('tests.date')}</div>
                              <div className="text-center border-l pl-2" style={{ borderColor: pageColors.borderSubtle }}>{t('tests.score')}</div>
                              <div className="text-center">{t('tests.percentile')}</div>
                              <div className="text-center">{t('tests.cutoffScore')}</div>
                              <div className="text-center border-l pl-2" style={{ borderColor: pageColors.borderSubtle, color: getColor('accent', '#f59e0b') }}>{t('tests.withRisk')}</div>
                              <div className="text-center">{t('tests.percentile')}</div>
                              <div className="text-center">{t('tests.cutoffScore')}</div>
                              <div className="text-center border-l pl-2" style={{ borderColor: pageColors.borderSubtle }}>{t('tests.viewCorrection')}</div>
                            </div>
                            
                            {/* Lista de intentos */}
                            <div className="flex-1 overflow-y-auto">
                              {quizAttempts.slice(0, 5).map((attempt, index) => {
                                const percentileWithoutRisk = calculatePercentile(attempt.score || 0, false);
                                const percentileWithRisk = calculatePercentile(attempt.score_with_risk || 0, true);
                                const cutoffWithoutRisk = ranking?.statistics?.top_20_cutoff_without_risk || 0;
                                const cutoffWithRisk = ranking?.statistics?.top_20_cutoff_with_risk || 0;
                                return (
                                  <div 
                                    key={attempt.attempt_id || attempt.id || index}
                                    className="grid grid-cols-9 items-center px-3 py-2 border-b transition-colors"
                                    style={{ 
                                      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                      backgroundColor: 'transparent',
                                      color: isDarkMode ? '#ffffff' : '#000000'
                                    }}
                                  >
                                    {/* Intento */}
                                    <div className="text-xs font-medium" style={{ color: pageColors.text }}>
                                      #{index + 1}
                                    </div>
                                    
                                    {/* Fecha */}
                                    <div className="text-[10px]" style={{ color: pageColors.textMuted }}>
                                      {new Date(attempt.end_time?.replace(' ', 'T')).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                    </div>
                                    
                                    {/* Nota (Sin riesgo) */}
                                    <div className="text-center border-l pl-2" style={{ borderColor: pageColors.borderSubtle }}>
                                      <span className="text-sm font-bold" style={{ color: pageColors.text }}>
                                        {formatScore(attempt.score || 0)}
                                      </span>
                                    </div>
                                    
                                    {/* Percentil (Sin riesgo) */}
                                    <div className="text-center">
                                      <span className="text-xs font-medium" style={{ color: percentileWithoutRisk >= 0 ? '#10b981' : '#ef4444' }}>
                                        {percentileWithoutRisk >= 0 ? '+' : ''}{percentileWithoutRisk.toFixed(1)}
                                      </span>
                                    </div>
                                    
                                    {/* Nota Corte (Sin riesgo) */}
                                    <div className="text-center">
                                      <span className="text-xs font-medium" style={{ color: pageColors.text }}>
                                        {formatScore(cutoffWithoutRisk)}
                                      </span>
                                    </div>
                                    
                                    {/* Arriesgando */}
                                    <div className="text-center border-l pl-2" style={{ borderColor: pageColors.borderSubtle }}>
                                      <span className="text-sm font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                        {formatScore(attempt.score_with_risk || 0)}
                                      </span>
                                    </div>
                                    
                                    {/* Percentil (Arriesgando) */}
                                    <div className="text-center">
                                      <span className="text-xs font-medium" style={{ color: percentileWithRisk >= 0 ? '#10b981' : '#ef4444' }}>
                                        {percentileWithRisk >= 0 ? '+' : ''}{percentileWithRisk.toFixed(1)}
                                      </span>
                                    </div>
                                    
                                    {/* Nota Corte (Con riesgo) */}
                                    <div className="text-center">
                                      <span className="text-xs font-medium" style={{ color: pageColors.text }}>
                                        {formatScore(cutoffWithRisk)}
                                      </span>
                                    </div>
                                    
                                    {/* Ver Corrección */}
                                    <div className="flex justify-center border-l pl-2" style={{ borderColor: pageColors.borderSubtle }}>
                                      <button
                                        onClick={() => handleViewAttemptDetails(attempt.attempt_id || attempt.id)}
                                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-all"
                                        style={{ 
                                          backgroundColor: getColor('primary', '#1a202c'),
                                          color: '#ffffff'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                      >
                                        <Eye size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* BOTÓN DE INICIAR */}
                      <div className="flex-shrink-0 mt-auto pt-3">
                        <button
                          onClick={async () => {
                            if (quizId) {
                              try {
                                const { getQuiz } = await import('../../../api/services/quizService');
                                const quizData = await getQuiz(quizId);
                                setQuizToStart(quizData);
                                setIsQuizRunning(true);
                                setIsQuizFocusMode(true);
                              } catch (error) {
                                console.error('❌ Error loading quiz:', error);
                              }
                            }
                          }}
                          className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                          style={{ 
                            backgroundColor: isDarkMode ? getColor('accent', '#f59e0b') : getColor('primary', '#1a202c'),
                            color: isDarkMode ? '#000000' : '#ffffff'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <Play size={18} />
                          <span>{isCurrentStepCompleted() ? t('tests.retakeQuiz') : t('tests.startQuiz')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !quizResults ? (
                  // Mostrar Quiz component
                  quizToStart && (
                    <Quiz
                      quizId={quizToStart.id}
                      lessonId={selectedLesson?.id}
                      onQuizComplete={handleQuizComplete}
                      onExit={handleExitQuiz}
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
                  <div className="h-full overflow-hidden">
                    <QuizResults
                      result={quizResults}
                      quizTitle={resultsQuizInfo?.title?.rendered || resultsQuizInfo?.title || selectedTest?.data?.title}
                      questions={resultsQuestions}
                      noPadding={true}
                      difficulty={selectedTest?.data?.difficulty || 'medium'}
                      onBack={handleCloseResults}
                      courseId={courseId}
                      courseName={courseName}
                      lessonId={selectedLesson?.id}
                      lessonTitle={selectedLesson?.title}
                    />
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
    
    {/* Admin Modals */}
    {userIsAdmin && (
      <>
        {/* Lesson Modal */}
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

        {/* Test Modal (Unified) */}
        <UnifiedTestModal
          isOpen={testModalState.isOpen}
          onClose={handleCloseTestModal}
          mode={testModalState.mode}
          test={testModalState.test}
          onSave={handleSaveTest}
          courseId={courseId}
        />

        {/* Delete Theme Confirmation Modal */}
        {deleteThemeModalState.isOpen && (
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
                  {t('tests.deleteThemeTitle')}
                </h2>
              </div>

              {/* Content */}
              <div className="px-6 py-5">
                <p className="text-sm mb-4" style={{ color: pageColors.text }}>
                  {t('tests.deleteThemeConfirm')}
                </p>
                
                {/* Theme info */}
                <div 
                  className="p-4 rounded-lg mb-4"
                  style={{ 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${getColor('borderColor', '#e5e7eb')}`
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList size={18} style={{ color: pageColors.accent }} />
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
                    {t('tests.associatedTests', { 
                      count: deleteThemeModalState.lesson?.quizSteps?.length || 0 
                    })}
                  </p>
                </div>

                <p className="text-xs" style={{ color: '#ef4444' }}>
                  {t('tests.deleteThemeWarning')}
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
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Trash2 size={16} />
                  {t('tests.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )}
    
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
            onExit={handleExitQuiz}
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
