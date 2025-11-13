import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { ChevronDown, ChevronRight, ClipboardList, CheckCircle, Circle, Clock, Award, X, ChevronLeft, ChevronRight as ChevronRightNav, Play, Check, HelpCircle, Target } from 'lucide-react';

const TestsPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
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
  };

  const closeTestViewer = () => {
    setSelectedTest(null);
    setSelectedLesson(null);
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
                <div className="max-w-4xl mx-auto p-8">
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default TestsPage;
