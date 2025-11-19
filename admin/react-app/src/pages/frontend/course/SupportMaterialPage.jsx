import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import useCourse from '../../../hooks/useCourse';
import useStudentProgress from '../../../hooks/useStudentProgress';
import { getCourseLessons } from '../../../api/services/courseLessonService';
import CoursePageTemplate from '../../../components/course/CoursePageTemplate';
import { ChevronDown, ChevronRight, FileText, File, BookOpen, X, ChevronLeft, Check, Circle } from 'lucide-react';

const SupportMaterialPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor } = useTheme();
  const { course } = useCourse(courseId);
  const courseName = course?.title?.rendered || course?.title || '';
  
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPDF, setSelectedPDF] = useState(null);
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
        
        // Filter lessons to only include those with PDF or text steps
        const lessonsWithMaterial = (result.data || [])
          .map(lesson => {
            const materialSteps = (lesson.meta?._lesson_steps || [])
              .filter(step => step.type === 'pdf' || step.type === 'text')
              .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0));
            
            return {
              ...lesson,
              materialSteps
            };
          })
          .filter(lesson => lesson.materialSteps.length > 0);
        
        setLessons(lessonsWithMaterial);
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [courseId]);

  // Create flat array of all material steps for navigation
  const allMaterialSteps = useMemo(() => {
    return lessons.flatMap(lesson => 
      lesson.materialSteps.map(step => ({
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

  const handleOpenPDF = (step, lesson) => {
    setSelectedPDF(step);
    setSelectedLesson(lesson);
  };

  const closePDFViewer = () => {
    setSelectedPDF(null);
    setSelectedLesson(null);
  };

  // Navigation functions
  const getCurrentStepIndex = () => {
    if (!selectedPDF || !selectedLesson) return -1;
    return allMaterialSteps.findIndex(item => 
      item.step === selectedPDF && item.lesson.id === selectedLesson.id
    );
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const prevItem = allMaterialSteps[currentIndex - 1];
      setSelectedPDF(prevItem.step);
      setSelectedLesson(prevItem.lesson);
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < allMaterialSteps.length - 1) {
      const nextItem = allMaterialSteps[currentIndex + 1];
      setSelectedPDF(nextItem.step);
      setSelectedLesson(nextItem.lesson);
    }
  };

  // Toggle complete
  const handleToggleComplete = async () => {
    if (!selectedLesson || !selectedPDF || !courseId) return;

    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) return;

    const { originalStepIndex } = allMaterialSteps[currentIndex];
    
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

  // Check if current step is completed
  const isCurrentStepCompleted = () => {
    if (!selectedLesson || !selectedPDF) return false;
    const currentIndex = getCurrentStepIndex();
    if (currentIndex === -1) return false;
    const { originalStepIndex } = allMaterialSteps[currentIndex];
    return isCompleted(selectedLesson.id, 'step', selectedLesson.id, originalStepIndex);
  };

  const currentIndex = getCurrentStepIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allMaterialSteps.length - 1;

  // Get PDF URL from step data
  const getPDFUrl = (step) => {
    if (step.data?.url) {
      return step.data.url;
    }
    if (step.data?.file_id) {
      // TODO: Fetch media URL from WordPress if needed
      return null;
    }
    return null;
  };

  // Mock data for design
  const mockLessons = [
    {
      id: 1,
      title: 'Introducción al Curso',
      steps: [
        { id: 1, type: 'pdf', title: 'Guía de Inicio Rápido', data: { filename: 'guia-inicio.pdf' } },
        { id: 2, type: 'pdf', title: 'Manual del Estudiante', data: { filename: 'manual-estudiante.pdf' } },
      ]
    },
    {
      id: 2,
      title: 'Conceptos Fundamentales',
      steps: [
        { id: 3, type: 'pdf', title: 'Teoría Base', data: { filename: 'teoria-base.pdf' } },
        { id: 4, type: 'pdf', title: 'Ejemplos Prácticos', data: { filename: 'ejemplos.pdf' } },
        { id: 5, type: 'pdf', title: 'Ejercicios Complementarios', data: { filename: 'ejercicios.pdf' } },
      ]
    },
    {
      id: 3,
      title: 'Técnicas Avanzadas',
      steps: [
        { id: 6, type: 'pdf', title: 'Metodología Avanzada', data: { filename: 'metodologia.pdf' } },
      ]
    },
  ];

  const displayLessons = loading ? [] : mockLessons;

  return (
    <CoursePageTemplate
      courseId={courseId}
      courseName={courseName}
      sectionName={t('courses.supportMaterial')}
    >
      <div className="relative h-full">
        {/* Main Content - Lista de materiales */}
        <div 
          className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
            selectedPDF ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 py-6">
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
                <FileText size={48} className="mx-auto mb-4" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                <p className="text-lg font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                  {t('supportMaterial.noMaterials')}
                </p>
                <p className="text-sm mt-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                  {t('supportMaterial.noMaterialsDescription')}
                </p>
              </div>
            ) : (
              <div className="py-4">
                {/* Contenedor único para todos los materiales */}
                <div 
                  className="rounded-xl overflow-hidden border-2"
                  style={{ 
                    backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                    borderColor: getColor('borderColor', '#e5e7eb')
                  }}
                >
                  {lessons.map((lesson, lessonIndex) => {
                    const isExpanded = expandedLessons.has(lesson.id);
                    const materialCount = lesson.materialSteps.length;
                    const lessonTitle = lesson.title?.rendered || lesson.title || t('courses.untitledLesson');

                    return (
                      <div key={lesson.id}>
                        {/* Lesson Header */}
                        <button
                          onClick={() => toggleLesson(lesson.id)}
                          className="w-full px-6 py-4 flex items-center justify-between transition-all duration-200"
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
                              <ChevronDown size={20} style={{ color: getColor('primary', '#1a202c') }} />
                            ) : (
                              <ChevronRight size={20} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                            )}
                            <FileText size={20} style={{ color: getColor('primary', '#1a202c') }} />
                            <span className="font-semibold text-left" style={{ color: getColor('primary', '#1a202c') }}>
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
                            {materialCount} {materialCount === 1 ? t('supportMaterial.document') : t('supportMaterial.documents')}
                          </span>
                        </button>

                        {/* Material Steps */}
                        {isExpanded && (
                          <div>
                            {lesson.materialSteps.map((step, index) => {
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
                                  
                                  <div className="px-6 py-4 flex items-center justify-between transition-all duration-200">
                                    <div className="flex items-center gap-3 flex-1">
                                      <File size={18} style={{ color: `${getColor('primary', '#1a202c')}60` }} />
                                      <span className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                                        {step.title}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleOpenPDF(step, lesson)}
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
                                      title={t('supportMaterial.read')}
                                    >
                                      <BookOpen size={18} style={{ color: getColor('primary', '#1a202c') }} />
                                      <span className="text-sm font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                                        {t('supportMaterial.read')}
                                      </span>
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

        {/* PDF Viewer Page - Slides from right */}
        <div 
          className={`absolute inset-0 w-full transition-transform duration-300 ease-in-out ${
            selectedPDF ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: getColor('secondaryBackground', '#f8f9fa') }}
        >
          {selectedPDF && (
            <div className="h-full flex flex-col w-full overflow-hidden">
              {/* Header Compacto con Breadcrumbs Integrados */}
              <div 
                className="flex items-center justify-between px-4 py-1.5 border-b flex-shrink-0"
                style={{ 
                  backgroundColor: getColor('background', '#ffffff'),
                  borderColor: `${getColor('primary', '#1a202c')}15` 
                }}
              >
                <div className="flex flex-col gap-1">
                  {/* Breadcrumbs compactos */}
                  <nav className="flex items-center text-xs space-x-1.5">
                    <Link 
                      to="/courses"
                      className="transition-colors duration-200 hover:underline font-medium"
                      style={{ color: getColor('primary', '#1a202c') }}
                    >
                      {t('sidebar.studyPlanner')}
                    </Link>
                    <ChevronRight size={12} style={{ color: `${getColor('primary', '#1a202c')}50` }} />
                    <Link 
                      to={`/courses/${courseId}/dashboard`}
                      className="transition-colors duration-200 hover:underline font-medium"
                      style={{ color: getColor('primary', '#1a202c') }}
                      dangerouslySetInnerHTML={{ __html: courseName }}
                    />
                    <ChevronRight size={12} style={{ color: `${getColor('primary', '#1a202c')}50` }} />
                    <span className="font-medium" style={{ color: `${getColor('primary', '#1a202c')}70` }}>
                      {t('courses.supportMaterial')}
                    </span>
                  </nav>
                  {/* Título del material */}
                  <div className="flex items-center gap-2">
                    <FileText size={18} style={{ color: getColor('primary', '#1a202c') }} />
                    <h2 className="text-base font-semibold leading-none" style={{ color: getColor('primary', '#1a202c') }}>
                      {selectedPDF.title}
                    </h2>
                  </div>
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

                  {/* Close button - movido a la derecha */}
                  <button
                    onClick={closePDFViewer}
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

              {/* PDF Content - sin padding para máximo aprovechamiento */}
              <div className="flex-1 overflow-hidden">
                {getPDFUrl(selectedPDF) ? (
                  <iframe
                    src={getPDFUrl(selectedPDF)}
                    className="w-full h-full border-0"
                    title={selectedPDF.title}
                  />
                ) : selectedPDF.type === 'text' && selectedPDF.data?.content ? (
                  <div 
                    className="px-24 py-8 overflow-y-auto h-full prose max-w-none"
                    style={{ backgroundColor: getColor('background', '#ffffff') }}
                    dangerouslySetInnerHTML={{ __html: selectedPDF.data.content }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FileText size={64} className="mx-auto mb-4" style={{ color: `${getColor('primary', '#1a202c')}40` }} />
                      <p className="text-lg font-medium" style={{ color: getColor('primary', '#1a202c') }}>
                        {t('supportMaterial.noPreview')}
                      </p>
                      <p className="text-sm mt-2" style={{ color: `${getColor('primary', '#1a202c')}60` }}>
                        {t('supportMaterial.noPreviewDescription')}
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

export default SupportMaterialPage;
