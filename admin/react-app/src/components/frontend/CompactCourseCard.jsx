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
import { getApiConfig } from '../../api/config/apiConfig';
import { makeApiRequest } from '../../api/services/baseService';
import { getCourseLessons } from '../../api/services/courseLessonService';
import CourseTopicsModal from './CourseTopicsModal';
import CourseRankingModal from './CourseRankingModal';

const CompactCourseCard = ({ course, lessonCount, lessonCountLoading }) => {
  const { id, title, excerpt, content, _embedded } = course;
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState({});
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    unanswered: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Fetch lessons using the new course-specific endpoint
  // Only fetch when modal is opened to improve performance
  useEffect(() => {
    const fetchLessons = async () => {
      if (!id || !showTopicsModal) return;
      
      setLessonsLoading(true);
      try {
        // Ensure id is an integer
        const courseIdInt = typeof id === 'number' ? id : parseInt(id, 10);
        if (isNaN(courseIdInt)) {
          console.error('Invalid course ID:', id);
          setLessons([]);
          return;
        }
        
        const result = await getCourseLessons(courseIdInt, { perPage: 100 });
        setLessons(result.data || []);
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      } finally {
        setLessonsLoading(false);
      }
    };

    fetchLessons();
  }, [id, showTopicsModal]); // Only fetch when modal opens
  
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
  
  // Extraer el excerpt correctamente - priorizar excerpt.rendered
  let renderedExcerpt = '';
  
  // Primero intentar con excerpt
  if (excerpt?.rendered && typeof excerpt.rendered === 'string') {
    renderedExcerpt = excerpt.rendered.replace(/<[^>]+>/g, '').trim();
  } else if (typeof excerpt === 'string') {
    renderedExcerpt = excerpt.replace(/<[^>]+>/g, '').trim();
  }
  
  // Si el excerpt está vacío, intentar con content
  if (!renderedExcerpt) {
    if (content?.rendered && typeof content.rendered === 'string') {
      renderedExcerpt = content.rendered.replace(/<[^>]+>/g, '').trim();
    } else if (typeof content === 'string') {
      renderedExcerpt = content.replace(/<[^>]+>/g, '').trim();
    }
  }
  
  // Progreso de lecciones
  // Use the lessonCount prop if provided (from bulk fetch), otherwise fallback to local lessons
  const totalLessons = lessonCount !== undefined ? lessonCount : (lessons?.length || 0);
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
    if (!lessons || lessons.length === 0 || courseAttempts.length === 0) return null;
    
    // Extract quiz IDs from lesson steps
    const courseQuizIds = new Set();
    lessons.forEach(lesson => {
      const steps = lesson.meta?._lesson_steps || [];
      steps.forEach(step => {
        if (step.type === 'quiz' && step.data?.quiz_id) {
          courseQuizIds.add(parseInt(step.data.quiz_id));
        }
      });
    });
    
    if (courseQuizIds.size === 0) return null;
    
    // Para cada quiz, obtener la última nota
    const lastScores = Array.from(courseQuizIds)
      .map(quizId => {
        const quizAttempts = courseAttempts
          .filter(a => a.quiz_id === quizId)
          .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
        
        return quizAttempts.length > 0 ? quizAttempts[0].score_with_risk : null;
      })
      .filter(score => score !== null);
    
    if (lastScores.length === 0) return null;
    
    return Math.round(lastScores.reduce((sum, score) => sum + Number(score), 0) / lastScores.length);
  }, [lessons, courseAttempts]);

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

  // Obtener el título de un quiz desde los lesson steps
  const getQuizTitle = (quizId) => {
    if (!lessons || lessons.length === 0) return null;
    
    // Search for the quiz in lesson steps
    for (const lesson of lessons) {
      const steps = lesson.meta?._lesson_steps || [];
      for (const step of steps) {
        if (step.type === 'quiz' && step.data?.quiz_id === quizId) {
          return step.data.quiz_title || null;
        }
      }
    }
    
    return null;
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
      className="rounded-lg shadow-sm border qe-border-primary hover:shadow-lg transition-all duration-300 bg-white overflow-hidden flex flex-col"
    >
      {/* Imagen destacada arriba */}
      {imageUrl ? (
        <div 
          className="h-48 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${imageUrl})`,
          }}
        />
      ) : (
        <div 
          className="h-48 flex items-center justify-center"
          style={{ backgroundColor: 'var(--qe-primary)' }}
        >
          <BookOpen className="w-20 h-20 text-white opacity-50" />
        </div>
      )}

      {/* Contenido de la tarjeta */}
      <div className="p-6 flex flex-col flex-1">
        {/* Título y descripción */}
        <div className="mb-4">
          <h3 
            className="text-2xl font-bold qe-text-primary line-clamp-2 mb-2"
            dangerouslySetInnerHTML={{ __html: renderedTitle }}
          />
          {renderedExcerpt && (
            <p className="text-sm qe-text-secondary line-clamp-3">
              {renderedExcerpt}
            </p>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold qe-text-secondary">Progreso</span>
            <span className="text-lg font-bold qe-text-primary">{progressPercentage}%</span>
          </div>
          <div className="qe-bg-card-secondary rounded-full h-3 overflow-hidden">
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: 'var(--qe-primary)'
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm qe-text-secondary">
              {completedLessons}/{totalLessons} temas
            </span>
            {averageScore !== null && (
              <span className={`text-sm font-semibold ${
                averageScore >= 70 ? 'text-green-600' : 
                averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {averageScore}%
              </span>
            )}
          </div>
        </div>

        {/* Botones de acción en vertical */}
        <div className="space-y-3 mt-auto">
          {/* Botón principal más grande */}
          <Link
            to={`/courses/${id}`}
            className="block w-full py-3 text-center text-base font-semibold text-white rounded-lg transition-all shadow-sm hover:shadow-md"
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

          {/* Botones secundarios en fila */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowTopicsModal(true)}
              className="py-2.5 text-center text-sm font-medium text-white rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--qe-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
              }}
            >
              <List className="w-4 h-4" />
              Temas
            </button>

            <button
              onClick={() => setShowRankingModal(true)}
              className="py-2.5 text-center text-sm font-medium text-white rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--qe-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--qe-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--qe-primary)';
              }}
            >
              <Award className="w-4 h-4" />
              Ranking
            </button>
          </div>
        </div>
      </div>

      {/* Modal de temas */}
      <CourseTopicsModal 
        isOpen={showTopicsModal}
        onClose={() => setShowTopicsModal(false)}
        courseId={id}
        courseTitle={renderedTitle}
        lessons={lessons}
        isCompleted={isCompleted}
        markComplete={markComplete}
        unmarkComplete={unmarkComplete}
        progressLoading={progressLoading}
        getQuizTitle={getQuizTitle}
        getQuizScore={getQuizScore}
      />

      {/* Modal de ranking */}
      <CourseRankingModal
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        courseId={id}
        courseName={renderedTitle}
      />
    </div>
  );
};

export default CompactCourseCard;
