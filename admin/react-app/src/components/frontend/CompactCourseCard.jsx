import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  List,
  TrendingUp,
  Award,
  Target,
  BarChart2,
  Users,
  FileText,
  Video,
  Image as ImageIcon,
  HelpCircle
} from 'lucide-react';
import useLessons from '../../hooks/useLessons';
import useStudentProgress from '../../hooks/useStudentProgress';
import useQuizAttempts from '../../hooks/useQuizAttempts';
import useQuizzes from '../../hooks/useQuizzes';
import { getApiConfig } from '../../api/config/apiConfig';
import { makeApiRequest } from '../../api/services/baseService';

const CompactCourseCard = ({ course }) => {
  const { id, title, excerpt, _embedded } = course;
  const [showLessonsPanel, setShowLessonsPanel] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState({});
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    unanswered: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Hooks para datos
  const { lessons, loading: lessonsLoading } = useLessons({ 
    courseId: id, 
    autoFetch: true,
    perPage: 100
  });
  
  const { 
    completedItems, 
    markComplete,
    unmarkComplete, 
    isCompleted,
    loading: progressLoading 
  } = useStudentProgress(id, true);

  const { attempts, loading: attemptsLoading } = useQuizAttempts({
    autoFetch: true
  });

  const { quizzes } = useQuizzes({
    courseId: id,
    autoFetch: true
  });

  // Fetch course-specific question stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const config = getApiConfig();
        const response = await makeApiRequest(
          `${config.apiUrl}/quiz-extended/v1/user-stats/questions?course_id=${id}`
        );
        const data = response.data?.data || response.data || {};
        setStats({
          totalQuestions: data.total_questions || 0,
          correctAnswers: data.correct_answers || 0,
          incorrectAnswers: data.incorrect_answers || 0,
          unanswered: data.unanswered || 0
        });
      } catch (error) {
        console.error('Error fetching course stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [id]);

  // Calcular estadísticas
  const imageUrl = _embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const renderedTitle = title?.rendered || title || 'Curso sin título';
  
  // Extraer el excerpt correctamente
  let renderedExcerpt = '';
  if (excerpt) {
    if (typeof excerpt === 'string') {
      renderedExcerpt = excerpt.replace(/<[^>]+>/g, '');
    } else if (excerpt.rendered) {
      renderedExcerpt = excerpt.rendered.replace(/<[^>]+>/g, '');
    }
  }
  
  // Progreso de lecciones
  const totalLessons = lessons?.length || 0;
  const completedLessons = completedItems?.filter(item => item.content_type === 'lesson')?.length || 0;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Estadísticas de cuestionarios del curso
  const courseAttempts = attempts?.filter(a => 
    a.course_id === id && 
    a.score_with_risk !== undefined && 
    a.score_with_risk !== null &&
    !isNaN(a.score_with_risk)
  ) || [];
  const completedQuizzes = new Set(courseAttempts.map(a => a.quiz_id)).size;
  
  // Calcular la nota media usando solo la última nota de cada quiz
  const averageScore = useMemo(() => {
    if (!quizzes || quizzes.length === 0 || courseAttempts.length === 0) return null;
    
    // Obtener los IDs de los quizzes del curso
    const courseQuizIds = quizzes.map(q => q.id);
    
    // Para cada quiz, obtener la última nota
    const lastScores = courseQuizIds
      .map(quizId => {
        const quizAttempts = courseAttempts
          .filter(a => a.quiz_id === quizId)
          .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
        
        return quizAttempts.length > 0 ? quizAttempts[0].score_with_risk : null;
      })
      .filter(score => score !== null);
    
    if (lastScores.length === 0) return null;
    
    return Math.round(lastScores.reduce((sum, score) => sum + Number(score), 0) / lastScores.length);
  }, [quizzes, courseAttempts]);

  // Handler para marcar/desmarcar lección
  const handleToggleLesson = async (lessonId, e) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      if (isCompleted(lessonId, 'lesson')) {
        // TODO: Implementar unmarkComplete en useStudentProgress hook
        console.log('Desmarcar no implementado aún');
        // await unmarkComplete(lessonId, 'lesson');
      } else {
        await markComplete(lessonId, 'lesson');
      }
    } catch (error) {
      console.error('Error toggling lesson:', error);
    }
  };

  // Toggle expansión de lección
  const toggleLessonExpansion = (lessonId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  // Obtener icono según tipo de step
  const getStepIcon = (stepType) => {
    switch(stepType) {
      case 'quiz': return HelpCircle;
      case 'video': return Video;
      case 'text': return FileText;
      case 'image': return ImageIcon;
      default: return FileText;
    }
  };

  // Obtener el título de un quiz desde la base de datos
  const getQuizTitle = (quizId) => {
    if (!quizzes || quizzes.length === 0) return null;
    const quiz = quizzes.find(q => q.id === quizId);
    return quiz ? (quiz.title?.rendered || quiz.title) : null;
  };

  // Obtener la última nota de un quiz
  const getQuizScore = (quizId) => {
    if (!attempts || attempts.length === 0) return null;
    
    const quizAttempts = attempts
      .filter(attempt => attempt.quiz_id === quizId)
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    
    return quizAttempts.length > 0 ? quizAttempts[0].score_with_risk : null;
  };

  return (
    <div 
      className="rounded-lg shadow-sm border qe-border-primary hover:shadow-lg transition-all duration-300 relative"
      style={{ 
        backgroundColor: 'var(--qe-bg-card)',
        minHeight: '280px',
        width: showLessonsPanel ? 'auto' : '100%',
        maxWidth: showLessonsPanel ? 'none' : '100%'
      }}
    >
      {/* Imagen de fondo con transparencia - solo en columna principal */}
      {imageUrl && (
        <div 
          className="absolute bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${imageUrl})`,
            opacity: 0.15,
            top: 0,
            left: 0,
            bottom: 0,
            right: showLessonsPanel ? 'auto' : 0,
            width: showLessonsPanel ? 'calc(100% - 384px)' : '100%'
          }}
        />
      )}
      
      {/* Overlay blanco para mejorar legibilidad - solo en columna principal */}
      <div 
        className="absolute bg-white" 
        style={{ 
          opacity: 0.6,
          top: 0,
          left: 0,
          bottom: 0,
          right: showLessonsPanel ? 'auto' : 0,
          width: showLessonsPanel ? 'calc(100% - 384px)' : '100%'
        }} 
      />

      {/* Contenido principal en dos columnas */}
      <div className="relative z-10 flex h-full" style={{ minHeight: '280px' }}>
        {/* Columna izquierda: Info principal - SIEMPRE mantiene su ancho */}
        <div className="p-4 flex flex-col justify-between flex-1" style={{ minWidth: '320px' }}>
          <div className="space-y-3">
            {/* Título y descripción */}
            <div>
              <h3 
                className="text-xl font-bold qe-text-primary line-clamp-2 mb-1"
                dangerouslySetInnerHTML={{ __html: renderedTitle }}
              />
              {renderedExcerpt && (
                <p className="text-sm qe-text-secondary line-clamp-2">
                  {renderedExcerpt}
                </p>
              )}
            </div>

            {/* Barra de progreso */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold qe-text-secondary">Progreso del curso</span>
                <span className="text-sm font-bold qe-text-primary">{progressPercentage}%</span>
              </div>
              <div className="qe-bg-card-secondary rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ 
                    width: `${progressPercentage}%`,
                    backgroundColor: 'var(--qe-primary)'
                  }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs qe-text-secondary">
                  {completedLessons}/{totalLessons} lecciones
                </span>
                <span className="text-xs qe-text-secondary">
                  {completedQuizzes} cuestionarios
                </span>
              </div>
            </div>

            {/* Grid de estadísticas 2x2 */}
            <div className="grid grid-cols-2 gap-2">
              {/* Nota media */}
              <div className="bg-white/90 rounded-lg p-2 border qe-border-primary">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 qe-text-primary" />
                  <span className="text-xs font-medium qe-text-secondary">Nota Media</span>
                </div>
                <div className={`text-lg font-bold ${
                  averageScore === null ? 'qe-text-secondary' :
                  averageScore >= 70 ? 'text-green-600' : 
                  averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {averageScore !== null ? `${averageScore}%` : '-'}
                </div>
              </div>

              {/* Preguntas acertadas */}
              <div className="bg-white/90 rounded-lg p-2 border qe-border-primary">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-medium qe-text-secondary">Correctas</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {stats.correctAnswers}
                </div>
              </div>

              {/* Preguntas incorrectas */}
              <div className="bg-white/90 rounded-lg p-2 border qe-border-primary">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-red-600" />
                  <span className="text-xs font-medium qe-text-secondary">Incorrectas</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {stats.incorrectAnswers}
                </div>
              </div>

              {/* Sin contestar */}
              <div className="bg-white/90 rounded-lg p-2 border qe-border-primary">
                <div className="flex items-center gap-1 mb-1">
                  <BarChart2 className="w-3 h-3 text-gray-500" />
                  <span className="text-xs font-medium qe-text-secondary">Pendientes</span>
                </div>
                <div className="text-lg font-bold text-gray-600">
                  {stats.unanswered}
                </div>
              </div>
            </div>
          </div>

          {/* Botón de acción con más espacio superior */}
          <Link
            to={`/courses/${id}`}
            className="block w-full py-2.5 text-center text-sm font-medium text-white rounded-lg transition-all shadow-sm hover:shadow-md mt-4"
            style={{ backgroundColor: 'var(--qe-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
            }}
          >
            {progressPercentage === 100 ? 'Reiniciar Curso' : progressPercentage > 0 ? 'Continuar Curso' : 'Comenzar Curso'}
          </Link>

          {/* Botón para expandir panel de lecciones */}
          <button
            onClick={() => setShowLessonsPanel(!showLessonsPanel)}
            className="p-2 rounded text-white transition-all flex items-center justify-center gap-2 mt-3"
            style={{ backgroundColor: 'var(--qe-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
            }}
          >
            <List className="w-4 h-4" />
            <span className="text-xs font-medium">
              {showLessonsPanel ? 'Ocultar Lecciones' : 'Ver Lecciones'}
            </span>
          </button>
        </div>

        {/* Panel lateral de lecciones (expandible) - se agrega a la derecha */}
        {showLessonsPanel && (
          <div 
            className="bg-white border-l qe-border-primary flex-shrink-0"
            style={{ width: '384px' }}
          >
            <div className="h-full flex flex-col">
            {/* Header del panel */}
            <div className="flex items-center justify-between mb-4 px-4 pt-4">
              <h4 className="text-lg font-bold qe-text-primary">Lecciones del Curso</h4>
              <button
                onClick={() => setShowLessonsPanel(false)}
                className="p-1.5 rounded text-white hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--qe-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Barra de progreso en el panel */}
            <div className="mb-4 pb-4 border-b qe-border-primary px-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold qe-text-secondary">Progreso</span>
                <span className="text-sm font-bold qe-text-primary">{progressPercentage}%</span>
              </div>
              <div className="qe-bg-card-secondary rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ 
                    width: `${progressPercentage}%`,
                    backgroundColor: 'var(--qe-primary)'
                  }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs qe-text-secondary">
                  {completedLessons}/{totalLessons} lecciones
                </span>
                <span className="text-xs qe-text-secondary">
                  {completedQuizzes} cuestionarios
                </span>
              </div>
            </div>

            {/* Lista de lecciones */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {lessons.map((lesson) => {
                const completed = isCompleted(lesson.id, 'lesson');
                const isExpanded = expandedLessons[lesson.id];
                const steps = lesson.meta?._lesson_steps || [];
                
                return (
                  <div key={lesson.id} className="space-y-1">
                    <div className="flex items-center gap-2 p-2 rounded qe-bg-primary-light hover:qe-bg-card-secondary transition-colors">
                      <button
                        onClick={(e) => handleToggleLesson(lesson.id, e)}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-all group"
                        disabled={progressLoading}
                      >
                        {completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 group-hover:text-green-700 transition-colors" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {steps.length > 0 && (
                            <button
                              onClick={(e) => toggleLessonExpansion(lesson.id, e)}
                              className="flex-shrink-0 p-0.5 rounded text-white hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: 'var(--qe-primary)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                          <Link
                            to={`/courses/${id}`}
                            state={{ selectedLessonId: lesson.id, scrollToLesson: true }}
                            className="flex-1 text-sm qe-text-primary hover:qe-text-accent transition-colors font-medium truncate"
                          >
                            <span 
                              className={completed ? 'line-through opacity-60' : ''}
                              dangerouslySetInnerHTML={{ __html: lesson.title?.rendered || lesson.title }}
                            />
                          </Link>
                        </div>
                        
                        {/* Steps colapsables */}
                        {isExpanded && steps.length > 0 && (
                          <div className="ml-2 mt-2 space-y-1.5 border-l-2 qe-border-primary pl-3">
                            {steps.map((step, index) => {
                              const StepIcon = getStepIcon(step.type);
                              const stepId = step.data?.quiz_id || step.data?.video_id || step.data?.file_id || step.data?.image_id || null;
                              const isStepCompleted = stepId ? isCompleted(stepId, step.type) : false;
                              const score = step.type === 'quiz' && stepId ? getQuizScore(stepId) : null;
                              
                              // Obtener el título del step desde la base de datos
                              let stepTitle = step.title;
                              
                              // Si es un quiz, intentar obtener el título real desde la BD
                              if (step.type === 'quiz' && step.data?.quiz_id) {
                                const quizTitle = getQuizTitle(step.data.quiz_id);
                                if (quizTitle) {
                                  stepTitle = quizTitle;
                                } else if (!stepTitle || stepTitle.trim() === '') {
                                  stepTitle = `Cuestionario ${index + 1}`;
                                }
                              } else if (!stepTitle || stepTitle.trim() === '') {
                                // Si no hay título, usar nombres descriptivos como fallback
                                const typeNames = {
                                  'video': 'Video',
                                  'text': 'Contenido',
                                  'image': 'Imagen',
                                  'pdf': 'PDF'
                                };
                                stepTitle = `${typeNames[step.type] || 'Step'} ${index + 1}`;
                              }
                              
                              return (
                                <Link
                                  key={index}
                                  to={`/courses/${id}`}
                                  state={{ 
                                    selectedLessonId: lesson.id, 
                                    selectedStepIndex: index,
                                    scrollToLesson: true 
                                  }}
                                  className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:qe-bg-card-secondary transition-colors group"
                                >
                                  <StepIcon className="w-3.5 h-3.5 qe-text-secondary group-hover:qe-text-primary flex-shrink-0 transition-colors" />
                                  <span className={`flex-1 truncate group-hover:font-medium transition-all ${isStepCompleted ? 'line-through opacity-60' : ''}`}>
                                    {stepTitle}
                                  </span>
                                  {score !== null && (
                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                      score >= 70 ? 'bg-green-100 text-green-700' :
                                      score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {score}%
                                    </span>
                                  )}
                                  {isStepCompleted && (
                                    <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default CompactCourseCard;
