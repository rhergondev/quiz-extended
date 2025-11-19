import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { ChevronDown, ChevronRight, ClipboardList, CheckCircle, Circle, Clock, Award } from 'lucide-react';

const TestBrowserPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getColor } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hook para manejar el progreso del estudiante
  const { 
    isCompleted,
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

  const handleStartTest = (step, lesson) => {
    // Encontrar el índice original del step en la lección completa (no solo quizzes)
    const originalStepIndex = (lesson.meta?._lesson_steps || []).findIndex(s => 
      s.type === step.type && s.title === step.title && JSON.stringify(s.data) === JSON.stringify(step.data)
    );
    
    // Navegar a CourseLessonsPage con el step específico seleccionado
    navigate(`/courses/${courseId}/lessons`, {
      state: {
        selectedLessonId: lesson.id,
        selectedStepIndex: originalStepIndex
      }
    });
  };

  // Check if a quiz step is completed
  const isQuizCompleted = (lesson, stepIndex) => {
    return isCompleted(lesson.id, 'step', lesson.id, stepIndex);
  };

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.tests')}
    >
      <div className="relative h-full">
        {/* Main Content - Lista de tests */}
        <div className="absolute inset-0">
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
                                  onClick={() => handleStartTest(step, lesson)}
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
                                  <ClipboardList 
                                    size={18} 
                                    style={{ color: isCompleted ? '#ffffff' : getColor('primary', '#1a202c') }} 
                                  />
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
      </div>
    </CoursePageTemplate>
  );
};

export default TestBrowserPage;
