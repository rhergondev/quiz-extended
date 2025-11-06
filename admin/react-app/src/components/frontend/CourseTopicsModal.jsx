import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2, 
  Circle,
  FileText,
  Video,
  Image as ImageIcon,
  HelpCircle
} from 'lucide-react';

const CourseTopicsModal = ({ 
  isOpen, 
  onClose, 
  courseId, 
  courseTitle,
  lessons, 
  isCompleted, 
  markComplete,
  unmarkComplete,
  progressLoading,
  getQuizTitle,
  getQuizScore
}) => {
  const [expandedLessons, setExpandedLessons] = useState({});

  if (!isOpen) return null;

  // Toggle expansión de lección
  const toggleLessonExpansion = (lessonId) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  // Handler para marcar/desmarcar lección
  const handleToggleLesson = async (lessonId, e) => {
    e.stopPropagation();
    
    try {
      if (isCompleted(lessonId, 'lesson')) {
        await unmarkComplete(lessonId, 'lesson');
      } else {
        await markComplete(lessonId, 'lesson');
      }
    } catch (error) {
      console.error('Error toggling lesson:', error);
    }
  };

  // Handler para marcar/desmarcar sección (step)
  const handleToggleStep = async (lessonId, stepIndex, stepType, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Usar 'step' como content_type y pasar lessonId + stepIndex
      const isStepCompleted = isCompleted(lessonId, 'step', lessonId, stepIndex);
      
      if (isStepCompleted) {
        await unmarkComplete(lessonId, 'step', lessonId, stepIndex);
      } else {
        await markComplete(lessonId, 'step', lessonId, stepIndex);
      }
    } catch (error) {
      console.error('Error toggling step:', error);
    }
  };

  // Obtener icono según tipo de sección
  const getStepIcon = (stepType) => {
    switch(stepType) {
      case 'quiz': return HelpCircle;
      case 'video': return Video;
      case 'text': return FileText;
      case 'image': return ImageIcon;
      default: return FileText;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b qe-border-primary">
          <div>
            <h2 className="text-2xl font-bold qe-text-primary">Temas del Curso</h2>
            <p 
              className="text-sm qe-text-secondary mt-1"
              dangerouslySetInnerHTML={{ __html: courseTitle }}
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--qe-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Lista de temas con scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {lessons.map((lesson, lessonIndex) => {
              const completed = isCompleted(lesson.id, 'lesson');
              const isExpanded = expandedLessons[lesson.id];
              const steps = lesson.meta?._lesson_steps || [];
              
              return (
                <div key={lesson.id} className="border qe-border-primary rounded-lg overflow-hidden">
                  {/* Lesson Header */}
                  <div 
                    className="flex items-center gap-3 p-4 bg-white hover:qe-bg-primary-light transition-colors cursor-pointer"
                    onClick={() => toggleLessonExpansion(lesson.id)}
                  >
                    {/* Checkbox custom - tema */}
                    <div
                      onClick={(e) => handleToggleLesson(lesson.id, e)}
                      className="flex-shrink-0 cursor-pointer"
                      style={{
                        opacity: progressLoading ? 0.5 : 1,
                        pointerEvents: progressLoading ? 'none' : 'auto'
                      }}
                    >
                      {completed ? (
                        <CheckCircle2 
                          className="w-6 h-6 transition-all" 
                          style={{ 
                            color: '#16a34a',
                            fill: 'transparent',
                            strokeWidth: 2
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#15803d';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#16a34a';
                          }}
                        />
                      ) : (
                        <Circle 
                          className="w-6 h-6 transition-all" 
                          style={{ 
                            color: '#9ca3af',
                            fill: 'transparent',
                            strokeWidth: 2
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#22c55e';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#9ca3af';
                          }}
                        />
                      )}
                    </div>

                    {/* Número de tema */}
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: 'var(--qe-primary)' }}
                    >
                      {lessonIndex + 1}
                    </div>

                    {/* Título del tema */}
                    <Link
                      to={`/courses/${courseId}`}
                      state={{ selectedLessonId: lesson.id, scrollToLesson: true }}
                      className="flex-1 text-base font-semibold qe-text-primary hover:qe-text-accent transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span 
                        className={completed ? 'line-through opacity-60' : ''}
                        dangerouslySetInnerHTML={{ __html: lesson.title?.rendered || lesson.title }}
                      />
                    </Link>

                    {/* Badge de secciones */}
                    {steps.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full qe-bg-primary-light qe-text-primary font-medium">
                        {steps.length} sección{steps.length !== 1 ? 'es' : ''}
                      </span>
                    )}

                    {/* Expand icon */}
                    <button
                      className="flex-shrink-0 p-1 rounded text-white transition-all"
                      style={{ backgroundColor: 'var(--qe-primary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Secciones expandibles */}
                  {isExpanded && steps.length > 0 && (
                    <div className="bg-gray-50 border-t qe-border-primary">
                      <div className="p-4 space-y-2">
                        {steps.map((step, index) => {
                          const StepIcon = getStepIcon(step.type);
                          const stepId = step.data?.quiz_id || step.data?.video_id || step.data?.file_id || step.data?.image_id || null;
                          
                          // Usar el nuevo sistema: siempre usar 'step' como tipo y verificar con lesson.id + index
                          const isStepCompleted = isCompleted(lesson.id, 'step', lesson.id, index);
                          const score = step.type === 'quiz' && stepId ? getQuizScore(stepId) : null;
                          
                          // Obtener el título de la sección
                          let stepTitle = step.title;
                          
                          if (step.type === 'quiz' && step.data?.quiz_id) {
                            // First priority: use quiz_title from step data (already enriched by backend)
                            if (step.data.quiz_title) {
                              stepTitle = step.data.quiz_title;
                            } else {
                              // Fallback: use getQuizTitle function
                              const quizTitle = getQuizTitle(step.data.quiz_id);
                              if (quizTitle) {
                                stepTitle = quizTitle;
                              } else if (!stepTitle || stepTitle.trim() === '') {
                                stepTitle = `Cuestionario ${index + 1}`;
                              }
                            }
                          } else if (!stepTitle || stepTitle.trim() === '') {
                            const typeNames = {
                              'video': 'Video',
                              'text': 'Contenido',
                              'image': 'Imagen',
                              'pdf': 'PDF'
                            };
                            stepTitle = `${typeNames[step.type] || 'Sección'} ${index + 1}`;
                          }
                          
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-white rounded-lg border qe-border-primary hover:shadow-md transition-all group"
                            >
                              {/* Checkbox custom - sección */}
                              <div
                                onClick={(e) => handleToggleStep(lesson.id, index, step.type, e)}
                                className="flex-shrink-0 cursor-pointer"
                                style={{
                                  opacity: progressLoading ? 0.5 : 1,
                                  pointerEvents: progressLoading ? 'none' : 'auto'
                                }}
                              >
                                {isStepCompleted ? (
                                  <CheckCircle2 
                                    className="w-5 h-5 transition-all" 
                                    style={{ 
                                      color: '#16a34a',
                                      fill: 'transparent',
                                      strokeWidth: 2
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = '#15803d';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = '#16a34a';
                                    }}
                                  />
                                ) : (
                                  <Circle 
                                    className="w-5 h-5 transition-all" 
                                    style={{ 
                                      color: '#9ca3af',
                                      fill: 'transparent',
                                      strokeWidth: 2
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = '#22c55e';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = '#9ca3af';
                                    }}
                                  />
                                )}
                              </div>

                              {/* Sección icon */}
                              <StepIcon className="w-5 h-5 qe-text-secondary group-hover:qe-text-primary flex-shrink-0 transition-colors" />
                              
                              {/* Sección title - link para navegación */}
                              <Link
                                to={`/courses/${courseId}`}
                                state={{ 
                                  selectedLessonId: lesson.id, 
                                  selectedStepIndex: index,
                                  scrollToLesson: true 
                                }}
                                className={`flex-1 text-sm group-hover:font-medium transition-all ${isStepCompleted ? 'line-through opacity-60' : ''}`}
                                onClick={onClose}
                              >
                                {stepTitle}
                              </Link>
                              
                              {/* Score badge */}
                              {score !== null && (
                                <span className={`text-xs font-semibold px-2 py-1 rounded flex-shrink-0 ${
                                  score >= 70 ? 'bg-green-100 text-green-700' :
                                  score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {score}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t qe-border-primary">
          <div className="text-sm qe-text-secondary">
            {lessons.filter(l => isCompleted(l.id, 'lesson')).length} de {lessons.length} temas completados
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:shadow-md"
            style={{ backgroundColor: 'var(--qe-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseTopicsModal;
