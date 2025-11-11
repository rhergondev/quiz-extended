import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  PlayCircle, 
  FileText, 
  CheckSquare, 
  ChevronDown, 
  ChevronUp,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';


const CourseLessonList = ({ lessons, isLoading, selectedStepId, onSelectStep, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const [expandedLessonId, setExpandedLessonId] = useState(null);

  // 🔍 DEBUG: Log para ver el orden de las lecciones recibidas
  useEffect(() => {
    if (lessons && lessons.length > 0) {
      console.log('🔍 DEBUG CourseLessonList: Orden de lecciones recibidas:', 
        lessons.map((l, idx) => ({ 
          index: idx, 
          id: l.id, 
          title: l.title?.rendered || l.title,
          _lesson_order: l.meta?._lesson_order 
        }))
      );
    }
  }, [lessons]);

  useEffect(() => {
    if (selectedStepId && !expandedLessonId) {
      const lessonWithStep = lessons.find(l => l.meta?._lesson_steps?.some(s => s.id === selectedStepId));
      if (lessonWithStep) {
        setExpandedLessonId(lessonWithStep.id);
      }
    }
  }, [selectedStepId, expandedLessonId, lessons]);
  
  const getStepIcon = (stepType) => {
    switch(stepType) {
      case 'video': return <PlayCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />;
      case 'quiz': return <CheckSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />;
      default: return <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />;
    }
  };

  const handleLessonClick = (lessonId) => {
    setExpandedLessonId(prevId => (prevId === lessonId ? null : lessonId));
  };

  const handleStepClick = (step, lesson) => {
    onSelectStep(step, lesson);
    // Cerrar el modal después de seleccionar un paso
    if (onClose) onClose();
  };
  
  const getStepTitle = (step) => {
    // For quiz steps, use the quiz_title from the step data if available
    if (step.type === 'quiz' && step.data?.quiz_title) {
      return step.data.quiz_title;
    }
    // Otherwise use the step title
    return step.title || t('untitled');
  };

  const loadingSkeleton = (
    <div className="p-4 animate-pulse">
      <div className="h-6 bg-gray-300 rounded w-3/4 mb-6"></div>
      <div className="space-y-4">
        <div className="h-5 bg-gray-300 rounded w-full"></div>
        <div className="h-5 bg-gray-300 rounded w-5/6"></div>
        <div className="h-5 bg-gray-300 rounded w-full"></div>
      </div>
    </div>
  );

  // Si no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay oscuro de fondo */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal centrado tipo widget */}
        <div 
          className="w-full max-w-4xl max-h-[85vh] rounded-xl shadow-lg border-2 flex flex-col"
          style={{ 
            backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
            borderColor: getColor('primary', '#3b82f6')
          }}
          onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro del modal
        >
          {/* Header del modal */}
          <div className="p-6 border-b-2 flex items-center justify-between flex-shrink-0" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
            <h2 className="text-2xl font-bold qe-text-primary">
              {t('courses.courseContent')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-all"
              style={{ backgroundColor: getColor('primary', '#3b82f6') + '15' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '25';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '15';
              }}
              title="Cerrar"
            >
              <X className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
            </button>
          </div>

          {/* Contenido del modal con scroll */}
          <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            loadingSkeleton
          ) : lessons && lessons.length > 0 ? (
            <ul className="space-y-3 max-w-3xl mx-auto">
              {lessons.map((lesson) => {
                const isExpanded = expandedLessonId === lesson.id;
                const steps = lesson.meta?._lesson_steps || [];
                const lessonTitle = lesson.title?.rendered || lesson.title || 'Sin título';
                
                return (
                  <li key={lesson.id} className="rounded-lg overflow-hidden border-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
                    <div
                      onClick={() => handleLessonClick(lesson.id)}
                      className="p-4 flex justify-between items-center cursor-pointer transition-all hover:bg-gray-100"
                      style={{ backgroundColor: isExpanded ? getColor('primary', '#3b82f6') + '10' : 'transparent' }}
                    >
                      <div className="flex items-center space-x-3">
                        <BookOpen className="w-5 h-5 flex-shrink-0" style={{ color: getColor('primary', '#3b82f6') }} />
                        <span className="text-sm font-bold qe-text-primary">{lessonTitle}</span>
                      </div>
                      {steps.length > 0 && (
                        isExpanded ? 
                          <ChevronUp className="w-5 h-5" style={{ color: getColor('primary', '#3b82f6') }} /> : 
                          <ChevronDown className="w-5 h-5 qe-text-secondary" />
                      )}
                    </div>
                    
                    {isExpanded && steps.length > 0 && (
                      <ul className="bg-white bg-opacity-50">
                        {steps.map((step) => {
                          const isSelected = step.id === selectedStepId;
                          const title = getStepTitle(step);
                          return (
                            <li 
                              key={step.id}
                              onClick={() => handleStepClick(step, lesson)}
                              className="flex items-center space-x-2 py-3 px-6 border-l-4 transition-all cursor-pointer hover:bg-gray-50"
                              style={{ 
                                borderLeftColor: isSelected ? getColor('primary', '#3b82f6') : 'transparent',
                                backgroundColor: isSelected ? getColor('primary', '#3b82f6') + '15' : 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '08';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {getStepIcon(step.type)}
                              <span className={`text-sm ${isSelected ? 'font-semibold qe-text-primary' : 'qe-text-secondary'}`}>
                                {title}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-4 qe-text-secondary text-center">{t('noLessonsForCourse')}</p>
          )}
        </div>

          {/* Footer con botón de cerrar */}
          <div className="p-4 border-t-2 flex justify-center flex-shrink-0" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg"
              style={{ 
                backgroundColor: getColor('primary', '#3b82f6')
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CourseLessonList;