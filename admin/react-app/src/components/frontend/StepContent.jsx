import React, { useState, useEffect } from 'react';
import { BookOpen, PlayCircle, FileText, CheckSquare, File, ChevronLeft, ChevronRight, Trophy, X, Check, Circle, Menu, PenTool, Pencil, Highlighter, Eraser, Trash2 } from 'lucide-react';
import Quiz from './Quiz';
import QuizStartConfirmation from './QuizStartConfirmation';
import PdfStep from './PdfStep';
import { getEmbedUrl } from '../../api/utils/videoUtils';
import useStudentProgress from '../../hooks/useStudentProgress';
import { useTheme } from '../../contexts/ThemeContext';

const stepIcons = {
  video: <PlayCircle className="w-5 h-5 text-blue-500" />,
  text: <FileText className="w-5 h-5 text-green-500" />,
  quiz: <CheckSquare className="w-5 h-5 text-purple-500" />,
  pdf: <File className="w-5 h-5 text-red-500" />, // Añade el icono para PDF
  default: <BookOpen className="w-5 h-5 text-gray-500" />,
};

const StepContent = ({ step, lesson, lessons = [], onNavigate, courseId, onOpenRanking, rankingLoading, onOpenLessonList, onQuizStateChange }) => {
  const { getColor } = useTheme(); // Obtener función para colores seguros
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizState, setQuizState] = useState(null); // 🎯 FOCUS MODE: Track quiz internal state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(false);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false); // Toggle para dibujar o no
  
  // Estados de las herramientas de dibujo
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingLineWidth, setDrawingLineWidth] = useState(2);
  const [clearCanvasFunction, setClearCanvasFunction] = useState(null);

  // 🎯 FOCUS MODE: Forward quiz state to parent
  useEffect(() => {
    if (onQuizStateChange && typeof onQuizStateChange === 'function') {
      onQuizStateChange(quizState);
    }
  }, [quizState, onQuizStateChange]);

  // 🎯 FOCUS MODE: Determine if we should hide header/navigation
  const isQuizFocusMode = quizState === 'in-progress';
  
  // Debug: Log props on mount and change
  useEffect(() => {
    console.log('🔍 StepContent props:', { 
      step: step?.id, 
      lesson: lesson?.id, 
      lessonsCount: lessons?.length, 
      courseId,
      hasOnNavigate: !!onNavigate 
    });
  }, [step, lesson, lessons, courseId, onNavigate]);
  
  // Hook para manejar el progreso del estudiante
  const { 
    isCompleted, 
    markComplete, 
    unmarkComplete, 
    loading: progressLoading,
    completedItems
  } = useStudentProgress(courseId, true);

  // Debug: Log completed items
  useEffect(() => {
    console.log('🔍 Completed items:', completedItems);
  }, [completedItems]);

  useEffect(() => {
    setQuizStarted(false);
    setQuizSubmitted(false);
  }, [step]);

  // 🎯 Lógica de navegación entre pasos
  const getCurrentStepInfo = () => {
    if (!lesson || !step || !lessons || lessons.length === 0) {
      return { currentLessonIndex: -1, currentStepIndex: -1, steps: [] };
    }

    const currentLessonIndex = lessons.findIndex(l => l.id === lesson.id);
    const steps = lesson.meta?._lesson_steps || [];
    
    // 🔥 IMPORTANTE: Los steps se identifican por índice, no por ID
    // Buscamos el paso actual comparando por referencia o por todas sus propiedades
    const currentStepIndex = steps.findIndex(s => {
      // Si tienen ID y coinciden
      if (s.id && step.id && s.id === step.id) return true;
      
      // Si son el mismo objeto (referencia)
      if (s === step) return true;
      
      // Comparación profunda: mismo tipo y mismos datos
      if (s.type === step.type) {
        const sData = JSON.stringify(s.data || {});
        const stepData = JSON.stringify(step.data || {});
        if (sData === stepData) return true;
      }
      
      return false;
    });

    console.log('🔍 getCurrentStepInfo:', { 
      currentLessonIndex, 
      currentStepIndex, 
      lessonId: lesson.id,
      stepType: step.type,
      totalSteps: steps.length 
    });

    return { currentLessonIndex, currentStepIndex, steps };
  };

  const getNavigationInfo = () => {
    const { currentLessonIndex, currentStepIndex, steps } = getCurrentStepInfo();
    
    if (currentLessonIndex === -1 || currentStepIndex === -1) {
      return { hasPrev: false, hasNext: false, prevLesson: null, prevStep: null, nextLesson: null, nextStep: null };
    }
    
    let prevLesson = null;
    let prevStep = null;
    let nextLesson = null;
    let nextStep = null;
    let hasPrev = false;
    let hasNext = false;

    // Verificar paso anterior
    if (currentStepIndex > 0) {
      // Hay paso anterior en la misma lección
      prevLesson = lesson;
      prevStep = steps[currentStepIndex - 1];
      hasPrev = true;
    } else if (currentLessonIndex > 0) {
      // Ir al último paso de la lección anterior
      const previousLesson = lessons[currentLessonIndex - 1];
      const previousSteps = previousLesson.meta?._lesson_steps || [];
      if (previousSteps.length > 0) {
        prevLesson = previousLesson;
        prevStep = previousSteps[previousSteps.length - 1];
        hasPrev = true;
      }
    }

    // Verificar paso siguiente
    if (currentStepIndex < steps.length - 1) {
      // Hay paso siguiente en la misma lección
      nextLesson = lesson;
      nextStep = steps[currentStepIndex + 1];
      hasNext = true;
    } else if (currentLessonIndex < lessons.length - 1) {
      // Ir al primer paso de la siguiente lección
      const followingLesson = lessons[currentLessonIndex + 1];
      const followingSteps = followingLesson.meta?._lesson_steps || [];
      if (followingSteps.length > 0) {
        nextLesson = followingLesson;
        nextStep = followingSteps[0];
        hasNext = true;
      }
    }

    return { hasPrev, hasNext, prevLesson, prevStep, nextLesson, nextStep };
  };

  const handlePrevious = () => {
    const { hasPrev, prevLesson, prevStep } = getNavigationInfo();
    console.log('🔍 DEBUG handlePrevious:', { hasPrev, prevLesson, prevStep });
    if (hasPrev && prevStep && prevLesson && onNavigate) {
      onNavigate(prevStep, prevLesson);
    }
  };

  const handleNext = () => {
    const { hasNext, nextLesson, nextStep } = getNavigationInfo();
    console.log('🔍 DEBUG handleNext:', { hasNext, nextLesson, nextStep });
    if (hasNext && nextStep && nextLesson && onNavigate) {
      onNavigate(nextStep, nextLesson);
    }
  };

  // Calcular el estado de navegación
  const navigationInfo = getNavigationInfo();

  // 🎯 Manejar marcar/desmarcar como completado (solo para pasos NO quiz)
  const handleToggleComplete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!lesson || !step || !courseId) {
      console.warn('⚠️ Missing required data:', { lesson, step, courseId });
      return;
    }

    try {
      const { currentStepIndex } = getCurrentStepInfo();
      
      if (currentStepIndex === -1) {
        console.error('❌ Could not find current step index');
        return;
      }
      
      console.log('🔍 DEBUG Toggle Complete:', { 
        lessonId: lesson.id, 
        stepIndex: currentStepIndex, 
        stepId: step.id 
      });
      
      const isStepCompleted = isCompleted(lesson.id, 'step', lesson.id, currentStepIndex);
      console.log('🔍 Current completion status:', isStepCompleted);
      
      if (isStepCompleted) {
        await unmarkComplete(lesson.id, 'step', lesson.id, currentStepIndex);
        console.log('✅ Step unmarked as complete');
      } else {
        await markComplete(lesson.id, 'step', lesson.id, currentStepIndex);
        console.log('✅ Step marked as complete');
      }
    } catch (error) {
      console.error('❌ Error toggling step completion:', error);
    }
  };

  // Calcular el estado de completado
  const { currentStepIndex } = getCurrentStepInfo();
  const isStepCompleted = lesson && step && courseId && currentStepIndex !== -1
    ? isCompleted(lesson.id, 'step', lesson.id, currentStepIndex)
    : false;

  // 🎯 Calcular progreso de la lección actual
  const getLessonProgress = () => {
    if (!lesson || !courseId) return { completed: 0, total: 0 };
    
    const steps = lesson.meta?._lesson_steps || [];
    const total = steps.length;
    const completed = steps.filter((_, index) => 
      isCompleted(lesson.id, 'step', lesson.id, index)
    ).length;
    
    return { completed, total };
  };

  const lessonProgress = getLessonProgress();

  const renderStepContent = (step) => {
    if (!step || !step.type) {
      return <p className="text-gray-500">Contenido del paso no disponible.</p>;
    }

    const stepData = step.data || {};

    switch (step.type) {
      case 'video':
        // 🔥 2. Usa la nueva utilidad para obtener una URL de embed robusta
        const embedUrl = getEmbedUrl(stepData.video_url);
        return (
          <div>
            {embedUrl ? (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={embedUrl}
                  title={step.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <p>La URL del video no es válida o no es compatible.</p>
            )}
          </div>
        );
      case 'text':
        return (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: stepData.content || 'No hay contenido de texto.' }}
          />
        );
      case 'quiz':
        // Intentar obtener quiz_id de múltiples ubicaciones
        const quizId = stepData.quiz_id || step.quiz_id || step.data?.quiz_id;
        
        if (!quizId) {
          return <p>Error: No se ha especificado un ID de cuestionario para este paso.</p>;
        }

        if (!quizStarted) {
          // Create a simple quiz object with the title from the step data
          const quizInfo = {
            id: quizId,
            title: {
              rendered: stepData.quiz_title || step.data?.quiz_title || 'Cuestionario'
            }
          };
          return <QuizStartConfirmation quiz={quizInfo} onStartQuiz={() => setQuizStarted(true)} />;
        }
        
        console.log('🔍 Rendering Quiz component:', { quizId, lessonId: lesson?.id, lesson });

        // Pasar información de progreso al Quiz para que pueda marcar como completado
        return (
          <Quiz 
            quizId={quizId}
            lessonId={lesson?.id || lesson?.ID}
            onQuizStateChange={(state) => {
              setQuizState(state); // Track internally
            }}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            isDrawingEnabled={isDrawingEnabled}
            setIsDrawingEnabled={setIsDrawingEnabled}
            showDrawingToolbar={showDrawingToolbar}
            setShowDrawingToolbar={setShowDrawingToolbar}
            drawingTool={drawingTool}
            drawingColor={drawingColor}
            drawingLineWidth={drawingLineWidth}
            onClearCanvas={setClearCanvasFunction}
            onQuizComplete={() => {
              // Marcar el paso del quiz como completado automáticamente
              const { currentStepIndex } = getCurrentStepInfo();
              if (currentStepIndex !== -1 && lesson && courseId) {
                markComplete(lesson.id, 'step', lesson.id, currentStepIndex)
                  .then(() => {
                    console.log('✅ Quiz step marked as complete');
                    setQuizSubmitted(true); // Notificar que el quiz fue completado
                  })
                  .catch(err => console.error('❌ Error marking quiz as complete:', err));
              }
            }}
          />
        );
      
      // 🔥 2. Añade el 'case' para el tipo 'pdf'
      case 'pdf':
        return <PdfStep step={step} />;
        
      default:
        return (
          <p>Tipo de paso no soportado: {step.type}</p>
        );
    }
  };

  if (!step || !lesson) {
    return (
      <div className="flex-grow lg:w-2/3 p-8 flex flex-col items-center justify-center text-center bg-white rounded-lg shadow-md">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Selecciona un paso</h2>
        <p className="text-gray-500 mt-2">Elige un paso de la lista de lecciones para ver su contenido.</p>
      </div>
    );
  }

  const getQuizTitle = (quizId, stepData) => {
    // Use quiz_title from step data if available
    if (stepData.quiz_title) {
      return stepData.quiz_title;
    }
    // Fallback
    return 'Cuestionario';
  };

  // Obtener quiz_id de múltiples ubicaciones posibles
  const quizIdForTitle = step.type === 'quiz' ? (step.data?.quiz_id || step.quiz_id) : null;
  const stepTitle = step.type === 'quiz' ? getQuizTitle(quizIdForTitle, step.data || {}) : step.title;

 return (
    <div className="flex-grow lg:w-full h-full flex flex-col">
      {/* Header sticky sin padding externo - Hidden in Focus Mode */}
      {!isQuizFocusMode && (
        <div className="sticky top-0 z-10 px-6 py-4 border-b flex-shrink-0" style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}>
          {quizStarted && !quizSubmitted ? (
          // Header especial para Quiz en progreso: Solo título y botón salir
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* Botón hamburguesa para Quiz */}
              <button
                onClick={onOpenLessonList}
                className="p-2 rounded-lg transition-all"
                style={{ backgroundColor: getColor('primary', '#3b82f6') + '15' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '25';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '15';
                }}
                title="Abrir índice de lecciones"
              >
                <Menu className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
              </button>
              
              {/* Toggle para activar/desactivar el dibujo */}
              <button
                onClick={() => {
                  if (!isDrawingMode) {
                    setIsDrawingMode(true);
                    setIsDrawingEnabled(true);
                    setShowDrawingToolbar(true);
                  } else {
                    setIsDrawingEnabled(!isDrawingEnabled);
                  }
                }}
                className="p-2 rounded-lg transition-all"
                style={{ 
                  backgroundColor: isDrawingEnabled 
                    ? getColor('accent', '#f59e0b') + '25' 
                    : getColor('primary', '#3b82f6') + '15' 
                }}
                onMouseEnter={(e) => {
                  if (isDrawingEnabled) {
                    e.currentTarget.style.backgroundColor = getColor('accent', '#f59e0b') + '35';
                  } else {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '25';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isDrawingEnabled) {
                    e.currentTarget.style.backgroundColor = getColor('accent', '#f59e0b') + '25';
                  } else {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '15';
                  }
                }}
                title={!isDrawingMode ? 'Activar herramientas' : (isDrawingEnabled ? 'Pausar dibujo' : 'Reanudar dibujo')}
              >
                <PenTool 
                  className="w-6 h-6" 
                  style={{ color: isDrawingEnabled ? getColor('accent', '#f59e0b') : getColor('primary', '#3b82f6') }} 
                />
              </button>
              
              {/* Menú expandible de herramientas */}
              {isDrawingMode && showDrawingToolbar && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
                  {/* Herramientas */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDrawingTool('pen')}
                      className="p-2 rounded transition-all"
                      style={{
                        backgroundColor: drawingTool === 'pen' ? getColor('primary', '#3b82f6') : 'transparent',
                        color: drawingTool === 'pen' ? 'white' : getColor('primary', '#3b82f6')
                      }}
                      title="Lápiz"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setDrawingTool('highlighter')}
                      className="p-2 rounded transition-all"
                      style={{
                        backgroundColor: drawingTool === 'highlighter' ? getColor('accent', '#f59e0b') : 'transparent',
                        color: drawingTool === 'highlighter' ? 'white' : getColor('accent', '#f59e0b')
                      }}
                      title="Resaltador"
                    >
                      <Highlighter className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setDrawingTool('eraser')}
                      className="p-2 rounded transition-all"
                      style={{
                        backgroundColor: drawingTool === 'eraser' ? '#dc2626' : 'transparent',
                        color: drawingTool === 'eraser' ? 'white' : '#dc2626'
                      }}
                      title="Borrador"
                    >
                      <Eraser className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Colores */}
                  {drawingTool !== 'eraser' && (
                    <div className="flex gap-1 ml-2 pl-2 border-l" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
                      {[
                        { value: '#000000', name: 'Negro' },
                        { value: getColor('primary', '#3b82f6'), name: 'Primario' },
                        { value: getColor('accent', '#f59e0b'), name: 'Acento' },
                        { value: '#dc2626', name: 'Rojo' },
                        { value: '#16a34a', name: 'Verde' },
                      ].map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setDrawingColor(c.value)}
                          className="w-7 h-7 rounded border-2 transition-all hover:scale-110"
                          style={{ 
                            backgroundColor: c.value,
                            borderColor: drawingColor === c.value ? '#fff' : 'transparent',
                            boxShadow: drawingColor === c.value ? `0 0 0 2px ${getColor('primary', '#3b82f6')}` : 'none'
                          }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Grosor */}
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={drawingLineWidth}
                      onChange={(e) => setDrawingLineWidth(Number(e.target.value))}
                      className="w-20 h-1"
                      style={{ accentColor: getColor('primary', '#3b82f6') }}
                      title={`Grosor: ${drawingLineWidth}`}
                    />
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex gap-1 ml-2 pl-2 border-l" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
                    <button
                      onClick={() => clearCanvasFunction && clearCanvasFunction()}
                      className="p-2 rounded transition-all"
                      style={{ 
                        backgroundColor: 'transparent',
                        color: '#dc2626'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Limpiar todos los dibujos"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => setShowDrawingToolbar(false)}
                      className="px-3 py-1 rounded text-sm font-medium transition-all"
                      style={{ 
                        backgroundColor: getColor('primary', '#3b82f6') + '15',
                        color: getColor('primary', '#3b82f6')
                      }}
                      title="Ocultar herramientas"
                    >
                      Ocultar
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsDrawingMode(false);
                        setIsDrawingEnabled(false);
                        setShowDrawingToolbar(false);
                      }}
                      className="px-3 py-1 rounded text-sm font-medium text-white transition-all"
                      style={{ backgroundColor: '#dc2626' }}
                      title="Salir del modo dibujo"
                    >
                      Salir
                    </button>
                  </div>
                </div>
              )}
              
              {/* Botón para mostrar herramientas cuando están ocultas */}
              {isDrawingMode && !showDrawingToolbar && (
                <button
                  onClick={() => setShowDrawingToolbar(true)}
                  className="px-3 py-2 rounded-lg transition-all text-sm font-medium"
                  style={{ 
                    backgroundColor: getColor('primary', '#3b82f6') + '15',
                    color: getColor('primary', '#3b82f6')
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '25';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '15';
                  }}
                  title="Mostrar herramientas"
                >
                  Herramientas
                </button>
              )}
            </div>
            
            <h1 className="text-xl font-bold text-gray-800 flex-1 text-center">{stepTitle}</h1>
            <button
              onClick={() => setQuizStarted(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all"
              style={{ backgroundColor: '#ef4444' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
              title="Salir del cuestionario"
            >
              <X className="w-4 h-4" />
              <span>Salir del cuestionario</span>
            </button>
          </div>
        ) : (
            // Header normal con toda la información
            <>
              {/* Primera fila: Botón hamburguesa + Nombre de lección + Título del paso */}
              <div className="flex items-center justify-between gap-4 mb-3">
                {/* Botón hamburguesa */}
                <button
                  onClick={onOpenLessonList}
                  className="p-2 rounded-lg transition-all flex-shrink-0"
                  style={{ backgroundColor: getColor('primary', '#3b82f6') + '15' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '25';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '15';
                  }}
                  title="Abrir índice de lecciones"
                >
                  <Menu className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
                </button>
                
                <div className="flex-1 min-w-0 flex items-baseline gap-3">
                  <p className="text-sm qe-text-primary font-semibold flex-shrink-0">
                    {lesson.title.rendered}
                  </p>
                  <span className="text-gray-400">•</span>
                  <h1 className="text-xl font-bold text-gray-800 truncate">{stepTitle}</h1>
                </div>
              </div>

              {/* Segunda fila: Progreso + Botones */}
              <div className="flex items-center justify-between gap-4">
                {/* Mini-tracker de progreso */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="qe-text-primary font-medium">Progreso:</span>
                    <span className="font-semibold qe-text-primary">
                      {lessonProgress.completed} / {lessonProgress.total}
                    </span>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ 
                        width: `${lessonProgress.total > 0 ? (lessonProgress.completed / lessonProgress.total) * 100 : 0}%`,
                        backgroundColor: 'var(--qe-primary)'
                      }}
                    />
                  </div>
                  
                  {/* Porcentaje */}
                  <span className="text-sm font-medium text-gray-600">
                    {lessonProgress.total > 0 
                      ? Math.round((lessonProgress.completed / lessonProgress.total) * 100) 
                      : 0}%
                  </span>
                </div>

                {/* Botones de navegación y ranking */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Botón Ranking */}
                  <button
                    onClick={onOpenRanking}
                    disabled={rankingLoading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--qe-primary)' }}
                    onMouseEnter={(e) => {
                      if (!rankingLoading) {
                        e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!rankingLoading) {
                        e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                      }
                    }}
                    title="Ver ranking del curso"
                  >
                    <Trophy className="w-4 h-4" />
                    <span className="hidden lg:inline">Ranking</span>
                  </button>

                  {/* Botón Anterior */}
                  <button
                    onClick={handlePrevious}
                    disabled={!navigationInfo.hasPrev}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: navigationInfo.hasPrev ? 'var(--qe-primary)' : '#9ca3af' }}
                    onMouseEnter={(e) => {
                      if (navigationInfo.hasPrev) {
                        e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (navigationInfo.hasPrev) {
                        e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                      }
                    }}
                    title="Paso anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  {/* Botón Marcar como Completado - Solo para pasos NO quiz, o para quiz completado */}
                  {(step.type !== 'quiz' || quizSubmitted) && (
                    <button
                      onClick={handleToggleComplete}
                      disabled={progressLoading}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: isStepCompleted ? '#10b981' : 'var(--qe-primary)' }}
                      onMouseEnter={(e) => {
                        if (!progressLoading) {
                          e.currentTarget.style.backgroundColor = isStepCompleted ? '#059669' : 'var(--qe-accent)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!progressLoading) {
                          e.currentTarget.style.backgroundColor = isStepCompleted ? '#10b981' : 'var(--qe-primary)';
                        }
                      }}
                      title={isStepCompleted ? "Marcar como no completado" : "Marcar como completado"}
                    >
                      {isStepCompleted ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="hidden md:inline">Completado</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4" />
                          <span className="hidden md:inline">Completar</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Botón Siguiente */}
                  <button
                    onClick={handleNext}
                    disabled={!navigationInfo.hasNext}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: navigationInfo.hasNext ? 'var(--qe-primary)' : '#9ca3af' }}
                    onMouseEnter={(e) => {
                      if (navigationInfo.hasNext) {
                        e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (navigationInfo.hasNext) {
                        e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                      }
                    }}
                    title="Siguiente paso"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Contenido del paso */}
      <div 
        className={step.type === 'quiz' && quizStarted ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto px-6 py-6"} 
        style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
      >
          {renderStepContent(step)}
        </div>
      </div>
  );
};

export default StepContent;