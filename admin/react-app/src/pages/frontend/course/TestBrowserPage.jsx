import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { Search, ClipboardList, CheckCircle, Circle, Clock, Award, Play, Filter, Target, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const TestBrowserPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getColor } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Flatten all tests from lessons
  const allTests = useMemo(() => {
    return lessons.flatMap(lesson => 
      lesson.quizSteps.map(step => ({
        ...step,
        lessonTitle: lesson.title?.rendered || lesson.title,
        lessonId: lesson.id,
        originalStepIndex: (lesson.meta?._lesson_steps || []).findIndex(s => 
          s.type === step.type && s.title === step.title && JSON.stringify(s.data) === JSON.stringify(step.data)
        )
      }))
    );
  }, [lessons]);

  // Filter tests based on search term
  const filteredTests = useMemo(() => {
    if (!searchTerm) return allTests;
    const lowerTerm = searchTerm.toLowerCase();
    return allTests.filter(test => 
      test.title.toLowerCase().includes(lowerTerm) || 
      test.lessonTitle?.toLowerCase().includes(lowerTerm)
    );
  }, [allTests, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTests.length / ITEMS_PER_PAGE);
  const paginatedTests = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTests, currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // Scroll to top of list
    const listContainer = document.querySelector('.test-browser-list');
    if (listContainer) {
      listContainer.scrollTop = 0;
    }
  };

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleStartTest = (test) => {
    // Navegar a TestsPage con el quiz seleccionado
    // Usamos la ruta /tests que configuraremos en FrontendApp
    navigate(`/courses/${courseId}/tests`, {
      state: {
        selectedQuizId: test.data?.quiz_id,
        scrollToQuiz: true
      }
    });
  };

  // Check if a quiz step is completed
  const isQuizCompleted = (lessonId, stepIndex) => {
    return isCompleted(lessonId, 'step', lessonId, stepIndex);
  };

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.testBrowser')}
    >
      <div className="relative h-full flex flex-col">
        {/* Search Header */}
        <div 
          className="px-6 py-4 border-b flex-shrink-0"
          style={{ 
            backgroundColor: getColor('background', '#ffffff'),
            borderColor: `${getColor('primary', '#1a202c')}15`
          }}
        >
          <div className="max-w-5xl mx-auto w-full">
            <div className="relative">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                size={20} 
                style={{ color: `${getColor('primary', '#1a202c')}60` }} 
              />
              <input
                type="text"
                placeholder={t('tests.searchPlaceholder') || "Buscar tests..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: `${getColor('secondaryBackground', '#f3f4f6')}`,
                  borderColor: 'transparent',
                  color: getColor('textPrimary', '#1a202c')
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                {filteredTests.length > 0 ? (
                  <>
                    {t('pagination.showing') || 'Mostrando'} {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTests.length)} {t('pagination.of') || 'de'} {filteredTests.length} {t('pagination.results') || 'resultados'}
                  </>
                ) : (
                  <>0 {t('pagination.results') || 'resultados'}</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content - Lista plana de tests */}
        <div className="flex-1 overflow-y-auto bg-gray-50 test-browser-list" style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}>
          <div className="max-w-5xl mx-auto px-6 py-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-lg p-6 animate-pulse h-32" style={{ backgroundColor: getColor('background', '#ffffff') }}>
                    <div className="h-6 rounded mb-4" style={{ backgroundColor: `${getColor('primary', '#1a202c')}10`, width: '70%' }}></div>
                    <div className="h-4 rounded" style={{ backgroundColor: `${getColor('primary', '#1a202c')}05`, width: '40%' }}></div>
                  </div>
                ))}
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: getColor('background', '#ffffff') }}>
                <Filter size={48} className="mx-auto mb-4" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                <p className="text-lg font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                  {t('tests.noTestsFound')}
                </p>
                <p className="text-sm mt-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                  {t('tests.tryDifferentSearch')}
                </p>
              </div>
            ) : (
              // 🎨 Contenedor global con borde único (Estilo lista plana)
              <div className="py-4">
                <div 
                  className="rounded-xl overflow-hidden border-2"
                  style={{ 
                    backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                    borderColor: getColor('borderColor', '#e5e7eb')
                  }}
                >
                {paginatedTests.map((test, index) => {
                  const isCompleted = isQuizCompleted(test.lessonId, test.originalStepIndex);
                  const passingScore = test.data?.passing_score || 70;
                  const timeLimit = test.data?.time_limit || null;
                  const difficulty = test.data?.difficulty || 'medium';
                  const startDate = test.data?.start_date || null;
                  
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

                  return (
                    <div key={`${test.lessonId}-${index}`}>
                      {/* Separador horizontal (excepto el primero) */}
                      {index > 0 && (
                        <div 
                          className="mx-6"
                          style={{ 
                            height: '1px', 
                            backgroundColor: 'rgba(156, 163, 175, 0.2)'
                          }}
                        />
                      )}

                      <div 
                        className="px-6 py-4 flex items-center justify-between transition-all duration-200"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {/* Status Icon */}
                          {isCompleted ? (
                            <CheckCircle size={18} style={{ color: '#10b981' }} />
                          ) : (
                            <Circle size={18} style={{ color: getColor('textSecondary', '#6b7280') }} />
                          )}

                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium mb-0.5" style={{ color: getColor('textPrimary', '#1f2937') }}>
                                {test.title}
                              </span>
                              {/* Lesson Badge for context in flat list */}
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded border"
                                style={{ 
                                  color: getColor('textSecondary', '#6b7280'),
                                  borderColor: `${getColor('textSecondary', '#6b7280')}30`
                                }}
                              >
                                {test.lessonTitle}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1">
                              {/* Dificultad */}
                              <div 
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
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
                                <div className="flex items-center gap-1">
                                  <Clock size={12} style={{ color: getColor('textSecondary', '#6b7280') }} />
                                  <span className="text-xs" style={{ color: getColor('textSecondary', '#6b7280') }}>
                                    {timeLimit} min
                                  </span>
                                </div>
                              )}
                              
                              {/* Fecha de inicio */}
                              <div className="flex items-center gap-1">
                                <Calendar size={12} style={{ color: getColor('textSecondary', '#6b7280') }} />
                                <span className="text-xs" style={{ color: getColor('textSecondary', '#6b7280') }}>
                                  {formatStartDate(startDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => handleStartTest(test)}
                          className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm ml-4"
                          style={{ 
                            backgroundColor: isCompleted 
                              ? getColor('primary', '#1a202c')
                              : `${getColor('primary', '#1a202c')}10`,
                            color: isCompleted ? '#ffffff' : getColor('primary', '#1a202c')
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            if (!isCompleted) {
                              e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}15`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            if (!isCompleted) {
                              e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                            }
                          }}
                          title={isCompleted ? t('tests.retake') : t('tests.start')}
                        >
                          <Play size={16} />
                          <span>{isCompleted ? t('tests.retake') : t('tests.start')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      {/* Botón anterior */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: `${getColor('primary', '#1a202c')}10`,
                          color: getColor('primary', '#1a202c')
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== 1) {
                            e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                        }}
                      >
                        <ChevronLeft size={20} />
                      </button>

                      {/* Números de página */}
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, index) => {
                          if (page === '...') {
                            return (
                              <span 
                                key={`ellipsis-${index}`} 
                                className="px-3 py-2"
                                style={{ color: getColor('textSecondary', '#6b7280') }}
                              >
                                ...
                              </span>
                            );
                          }

                          const isActive = page === currentPage;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className="min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all flex justify-center items-center"
                              style={{
                                backgroundColor: isActive 
                                  ? getColor('primary', '#1a202c') 
                                  : `${getColor('primary', '#1a202c')}05`,
                                color: isActive 
                                  ? '#ffffff' 
                                  : getColor('primary', '#1a202c')
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}15`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}05`;
                                }
                              }}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Botón siguiente */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: `${getColor('primary', '#1a202c')}10`,
                          color: getColor('primary', '#1a202c')
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== totalPages) {
                            e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
                        }}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CoursePageTemplate>
  );
};

export default TestBrowserPage;
