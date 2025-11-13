import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScoreFormat } from '../../../contexts/ScoreFormatContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import useQuizRanking from '../../../hooks/useQuizRanking';
import useQuizAttempts from '../../../hooks/useQuizAttempts';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import Quiz from '../../../components/frontend/Quiz';
import QuizResults from '../../../components/frontend/QuizResults';
import { ChevronDown, ChevronRight, ClipboardList, CheckCircle, Circle, Clock, Award, X, ChevronLeft, ChevronRight as ChevronRightNav, Play, Check, HelpCircle, Target, Calendar, Eye, XCircle } from 'lucide-react';

const TestsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor } = useTheme();
  const { formatScore } = useScoreFormat();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
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
  };

  const closeTestViewer = () => {
    setSelectedTest(null);
    setSelectedLesson(null);
    setIsQuizRunning(false);
    setQuizToStart(null);
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
        }
      } catch (error) {
        console.error('Error marking quiz as complete:', error);
      }
    } else {
      // Si no hay test para marcar, solo cambiar la vista
      setIsQuizRunning(false);
    }
  };

  const handleCloseResults = () => {
    // Limpiar resultados y volver a la vista de info
    setQuizResults(null);
    setResultsQuestions(null);
    setResultsQuizInfo(null);
    setQuizToStart(null);
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

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.tests')}
    >
      <div className="relative" style={{ height: 'calc(100vh - 60px)' }}>
        {/* Main Content - Lista de tests */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedTest ? '-translate-x-full' : 'translate-x-0'
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
                <ClipboardList size={48} className="mx-auto mb-4" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                <p className="text-lg font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                  {t('tests.noTests')}
                </p>
                <p className="text-sm mt-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                  {t('tests.noTestsDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {lessons.map((lesson) => {
                  const isExpanded = expandedLessons.has(lesson.id);
                  const testsCount = lesson.quizSteps.length;
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
                          <ClipboardList size={22} style={{ color: getColor('primary', '#1a202c') }} />
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
                          {testsCount} {testsCount === 1 ? t('tests.test') : t('tests.tests')}
                        </span>
                      </button>

                      {/* Quiz Steps */}
                      {isExpanded && (
                        <div 
                          className="border-t"
                          style={{ borderColor: `${getColor('primary', '#1a202c')}10` }}
                        >
                          {lesson.quizSteps.map((step, index) => {
                            const originalStepIndex = (lesson.meta?._lesson_steps || []).findIndex(s => 
                              s.type === step.type && s.title === step.title && JSON.stringify(s.data) === JSON.stringify(step.data)
                            );
                            const isCompleted = isQuizCompleted(lesson, originalStepIndex);
                            const passingScore = step.data?.passing_score || 70;
                            const timeLimit = step.data?.time_limit || null;
                            
                            return (
                              <div
                                key={step.id || index}
                                className="px-8 py-4 flex items-center justify-between transition-all duration-200"
                                style={{ 
                                  backgroundColor: index % 2 === 0 ? `${getColor('primary', '#1a202c')}03` : 'transparent',
                                  borderBottom: index < lesson.quizSteps.length - 1 ? `1px solid ${getColor('primary', '#1a202c')}10` : 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}08`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = index % 2 === 0 ? `${getColor('primary', '#1a202c')}03` : 'transparent';
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  {isCompleted ? (
                                    <CheckCircle size={18} style={{ color: '#10b981' }} />
                                  ) : (
                                    <Circle size={18} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                                  )}
                                  <div className="flex flex-col flex-1">
                                    <span className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                                      {step.title}
                                    </span>
                                    <div className="flex items-center gap-4 mt-1">
                                      {timeLimit && (
                                        <div className="flex items-center gap-1">
                                          <Clock size={12} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                                          <span className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                            {timeLimit} min
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <Award size={12} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                                        <span className="text-xs" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                          {t('tests.passingScore')}: {passingScore}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleOpenTest(step, lesson)}
                                  className="p-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
                                  style={{ 
                                    backgroundColor: isCompleted 
                                      ? `${getColor('primary', '#1a202c')}` 
                                      : `${getColor('primary', '#1a202c')}10`
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isCompleted 
                                      ? `${getColor('primary', '#1a202c')}` 
                                      : `${getColor('primary', '#1a202c')}10`;
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                  title={isCompleted ? t('tests.retake') : t('tests.start')}
                                >
                                  <Play size={18} style={{ color: isCompleted ? '#ffffff' : getColor('primary', '#1a202c') }} />
                                  <span 
                                    className="text-sm font-medium" 
                                    style={{ color: isCompleted ? '#ffffff' : getColor('primary', '#1a202c') }}
                                  >
                                    {isCompleted ? t('tests.retake') : t('tests.start')}
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

        {/* Test Viewer - Slides from right */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedTest ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {selectedTest && (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div 
                className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: `${getColor('primary', '#1a202c')}15` 
                }}
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList size={20} style={{ color: getColor('primary', '#1a202c') }} />
                  <h2 className="text-base font-semibold" style={{ color: getColor('primary', '#1a202c') }}>
                    {selectedTest.title}
                  </h2>
                </div>

                {/* Navigation buttons */}
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
                    <ChevronRightNav size={20} style={{ color: getColor('primary', '#1a202c') }} />
                  </button>

                  {/* Close button */}
                  <button
                    onClick={closeTestViewer}
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

              {/* Test Content */}
              <div className="flex-1 overflow-y-auto">
                {!isQuizRunning && !quizResults ? (
                  // Mostrar info del test
                  <div className="max-w-4xl mx-auto p-8">
                  {/* Estadísticas del Test - Solo si el usuario tiene nota */}
                  {hasUserStats && !rankingLoading && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-4" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('tests.statistics')}
                      </h3>
                      
                      <div 
                        className="rounded-lg overflow-hidden"
                        style={{ 
                          backgroundColor: getColor('background', '#ffffff'),
                          border: `2px solid ${getColor('primary', '#1a202c')}20`
                        }}
                      >
                        <div 
                          className="grid"
                          style={{ 
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            minHeight: '140px'
                          }}
                        >
                          {/* Columna Sin Riesgo */}
                          <div 
                            className="border-r transition-all duration-200"
                            style={{ 
                              borderColor: `${getColor('primary', '#1a202c')}20`,
                              backgroundColor: `${getColor('primary', '#1a202c')}03`
                            }}
                          >
                            <div 
                              className="p-5 border-b"
                              style={{ 
                                borderColor: `${getColor('primary', '#1a202c')}15`,
                                backgroundColor: `${getColor('primary', '#1a202c')}08`
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: getColor('primary', '#1a202c') }}>
                                  {t('tests.withoutRisk')}
                                </h4>
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getColor('primary', '#1a202c') }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="p-5 space-y-4">
                              {/* Media UA */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                    {t('tests.avgScore')}
                                  </span>
                                </div>
                                <div className="text-2xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                                  {formatScore(ranking?.statistics?.avg_score_without_risk || 0)}
                                </div>
                              </div>

                              {/* Mi Nota */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                    {t('tests.myScore')}
                                  </span>
                                </div>
                                <div className="text-3xl font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                                  {formatScore(userStats?.score || 0)}
                                </div>
                              </div>

                              {/* Percentil (diferencia) */}
                              <div 
                                className="pt-3 border-t"
                                style={{ borderColor: `${getColor('primary', '#1a202c')}15` }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
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
                                  <span className="text-sm font-medium" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                                    pts
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Columna Con Riesgo */}
                          <div 
                            className="transition-all duration-200"
                            style={{ 
                              backgroundColor: `${getColor('accent', '#f59e0b')}08`
                            }}
                          >
                            <div 
                              className="p-5 border-b"
                              style={{ 
                                borderColor: `${getColor('accent', '#f59e0b')}20`,
                                backgroundColor: `${getColor('accent', '#f59e0b')}15`
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: getColor('accent', '#f59e0b') }}>
                                  {t('tests.withRisk')}
                                </h4>
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getColor('accent', '#f59e0b') }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="p-5 space-y-4">
                              {/* Media UA */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: `${getColor('accent', '#f59e0b')}80` }}>
                                    {t('tests.avgScore')}
                                  </span>
                                </div>
                                <div className="text-2xl font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                  {formatScore(ranking?.statistics?.avg_score_with_risk || 0)}
                                </div>
                              </div>

                              {/* Mi Nota */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: `${getColor('accent', '#f59e0b')}80` }}>
                                    {t('tests.myScore')}
                                  </span>
                                </div>
                                <div className="text-3xl font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                  {formatScore(userStats?.score_with_risk || 0)}
                                </div>
                              </div>

                              {/* Percentil (diferencia) */}
                              <div 
                                className="pt-3 border-t"
                                style={{ borderColor: `${getColor('accent', '#f59e0b')}20` }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: `${getColor('accent', '#f59e0b')}80` }}>
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
                                  <span className="text-sm font-medium" style={{ color: `${getColor('accent', '#f59e0b')}70` }}>
                                    pts
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Info Card */}
                  <div 
                    className="rounded-lg overflow-hidden"
                    style={{ 
                      backgroundColor: getColor('background', '#ffffff'),
                      border: `2px solid ${getColor('primary', '#1a202c')}20`
                    }}
                  >
                    {/* Header con título y estado */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold mb-2" style={{ color: getColor('primary', '#1a202c') }}>
                            {selectedTest.title}
                          </h3>
                          {selectedTest.data?.description && (
                            <p className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}70` }}>
                              {selectedTest.data.description}
                            </p>
                          )}
                        </div>
                        {isCurrentStepCompleted() && (
                          <div 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full ml-4 flex-shrink-0"
                            style={{ backgroundColor: '#10b98120' }}
                          >
                            <CheckCircle size={18} style={{ color: '#10b981' }} />
                            <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                              {t('progress.completed')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Widgets Horizontales - Info del Test */}
                    <div 
                      style={{ 
                        borderTop: `2px solid ${getColor('primary', '#1a202c')}20`,
                        borderBottom: `2px solid ${getColor('primary', '#1a202c')}20`
                      }}
                    >
                      <div 
                        className="grid"
                        style={{ 
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          minHeight: '100px'
                        }}
                      >
                        {/* Preguntas */}
                        <div 
                          className="flex flex-col items-center justify-center py-4 border-r transition-all duration-200"
                          style={{ 
                            borderColor: `${getColor('primary', '#1a202c')}20`,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <HelpCircle 
                            size={24} 
                            style={{ color: getColor('primary', '#1a202c') }} 
                            className="mb-2" 
                          />
                          <span 
                            className="text-2xl font-bold"
                            style={{ color: getColor('primary', '#1a202c') }}
                          >
                            {selectedTest.data?.question_count || '?'}
                          </span>
                          <span 
                            className="text-xs mt-1"
                            style={{ color: `${getColor('primary', '#1a202c')}70` }}
                          >
                            {t('tests.questions')}
                          </span>
                        </div>

                        {/* Tiempo Límite */}
                        <div 
                          className="flex flex-col items-center justify-center py-4 border-r transition-all duration-200"
                          style={{ 
                            borderColor: `${getColor('primary', '#1a202c')}20`,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Clock 
                            size={24} 
                            style={{ color: getColor('primary', '#1a202c') }} 
                            className="mb-2" 
                          />
                          <span 
                            className="text-2xl font-bold"
                            style={{ color: getColor('primary', '#1a202c') }}
                          >
                            {selectedTest.data?.time_limit ? `${selectedTest.data.time_limit}` : '∞'}
                          </span>
                          <span 
                            className="text-xs mt-1"
                            style={{ color: `${getColor('primary', '#1a202c')}70` }}
                          >
                            {selectedTest.data?.time_limit ? t('tests.minutes') : t('tests.noTimeLimit')}
                          </span>
                        </div>

                        {/* Puntuación de Aprobado */}
                        <div 
                          className="flex flex-col items-center justify-center py-4 border-r transition-all duration-200"
                          style={{ 
                            borderColor: `${getColor('primary', '#1a202c')}20`,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Award 
                            size={24} 
                            style={{ color: getColor('primary', '#1a202c') }} 
                            className="mb-2" 
                          />
                          <span 
                            className="text-2xl font-bold"
                            style={{ color: getColor('primary', '#1a202c') }}
                          >
                            {selectedTest.data?.passing_score || 70}%
                          </span>
                          <span 
                            className="text-xs mt-1"
                            style={{ color: `${getColor('primary', '#1a202c')}70` }}
                          >
                            {t('tests.passingScore')}
                          </span>
                        </div>

                        {/* Dificultad */}
                        <div 
                          className="flex flex-col items-center justify-center py-4 transition-all duration-200"
                          style={{ 
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Target 
                            size={24} 
                            style={{ color: getColor('primary', '#1a202c') }} 
                            className="mb-2" 
                          />
                          <span 
                            className="text-sm font-bold px-3 py-1 rounded-full"
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
                            className="text-xs mt-2"
                            style={{ color: `${getColor('primary', '#1a202c')}70` }}
                          >
                            {t('tests.difficulty')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botón de comenzar */}
                    <div className="p-6">
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
                            } catch (error) {
                              console.error('❌ Error loading quiz:', error);
                            }
                          } else {
                            console.error('❌ No quiz_id found');
                          }
                        }}
                        className="w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-md"
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
                        <Play size={24} />
                        <span>{isCurrentStepCompleted() ? t('tests.retake') : t('tests.startTest')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Historial de Intentos - Solo si el usuario ha hecho el test */}
                  {quizAttempts.length > 0 && !attemptsLoading && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                          {t('tests.recentAttempts')}
                        </h3>
                        <span className="text-sm" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                          {t('tests.last5Attempts')}
                        </span>
                      </div>

                      <div 
                        className="rounded-lg overflow-hidden"
                        style={{ 
                          backgroundColor: getColor('background', '#ffffff'),
                          border: `2px solid ${getColor('primary', '#1a202c')}20`
                        }}
                      >
                        {quizAttempts.map((attempt, index) => {
                          const percentileWithoutRisk = calculatePercentile(attempt.score || 0, false);
                          const percentileWithRisk = calculatePercentile(attempt.score_with_risk || 0, true);
                          
                          return (
                            <div
                              key={attempt.id || index}
                              className="transition-all duration-200"
                              style={{ 
                                backgroundColor: index % 2 === 0 ? 'transparent' : `${getColor('primary', '#1a202c')}03`,
                                borderBottom: index < quizAttempts.length - 1 ? `1px solid ${getColor('primary', '#1a202c')}10` : 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : `${getColor('primary', '#1a202c')}03`;
                              }}
                            >
                              <div className="px-6 py-4 grid grid-cols-5 gap-4 items-center">
                                {/* Fecha */}
                                <div className="flex items-center gap-2">
                                  <Calendar size={16} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                                  <span className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                                    {new Date(attempt.end_time?.replace(' ', 'T')).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>

                                {/* Nota Sin Riesgo */}
                                <div className="flex flex-col">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold" style={{ color: getColor('primary', '#1a202c') }}>
                                      {formatScore(attempt.score || 0)}
                                    </span>
                                  </div>
                                  <span 
                                    className="text-xs font-medium"
                                    style={{ color: percentileWithoutRisk >= 0 ? '#10b981' : '#ef4444' }}
                                  >
                                    {percentileWithoutRisk >= 0 ? '+' : ''}{formatScore(percentileWithoutRisk)}
                                  </span>
                                </div>

                                {/* Nota Con Riesgo */}
                                <div className="flex flex-col">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold" style={{ color: getColor('accent', '#f59e0b') }}>
                                      {formatScore(attempt.score_with_risk || 0)}
                                    </span>
                                  </div>
                                  <span 
                                    className="text-xs font-medium"
                                    style={{ color: percentileWithRisk >= 0 ? '#10b981' : '#ef4444' }}
                                  >
                                    {percentileWithRisk >= 0 ? '+' : ''}{formatScore(percentileWithRisk)}
                                  </span>
                                </div>

                                {/* Estado */}
                                <div className="flex items-center gap-2">
                                  {attempt.passed ? (
                                    <>
                                      <CheckCircle size={18} style={{ color: '#10b981' }} />
                                      <span className="text-sm font-medium" style={{ color: '#10b981' }}>
                                        {t('tests.passed')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle size={18} style={{ color: '#ef4444' }} />
                                      <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
                                        {t('tests.failed')}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Detalles */}
                                <div className="flex justify-end">
                                  <button
                                    className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm"
                                    style={{ 
                                      backgroundColor: `${getColor('primary', '#1a202c')}10`,
                                      color: getColor('primary', '#1a202c')
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    title={t('tests.viewDetails')}
                                  >
                                    <Eye size={16} />
                                    <span className="font-medium">{t('tests.details')}</span>
                                  </button>
                                </div>
                              </div>
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
                      onClearCanvas={handleClearCanvas}
                    />
                  )
                ) : (
                  // Mostrar resultados
                  <div className="p-6">
                    <QuizResults
                      result={quizResults}
                      quizTitle={resultsQuizInfo?.title?.rendered || resultsQuizInfo?.title || selectedTest?.data?.title}
                      questions={resultsQuestions}
                    />
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleCloseResults}
                        className="px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                        style={{
                          backgroundColor: getColor('primary', '#1a202c'),
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {t('tests.backToInfo')}
                      </button>
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

export default TestsPage;
