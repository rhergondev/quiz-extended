import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, Loader } from 'lucide-react';
import { getCourse } from '../../api/services/courseService';
import { getCourseLessons } from '../../api/services/courseLessonService';
import useCourseRanking from '../../hooks/useCourseRanking';
import CourseLessonList from '../../components/frontend/CourseLessonList';
import StepContent from '../../components/frontend/StepContent';
import CourseRankingModal from '../../components/frontend/CourseRankingModal';
import QEButton from '../../components/common/QEButton';

// --- Componentes de Estado para mayor claridad ---

const LoadingState = () => (
  <div className="flex items-center justify-center h-full text-gray-500">
    <Loader className="animate-spin mr-2" />
    {/* t('loadingCourseContent') se podría añadir a los archivos de traducción */}
    Cargando contenido del curso...
  </div>
);

const ErrorState = ({ message }) => (
  <div className="p-4 text-red-600">
    Error: {message}
  </div>
);

const EmptyState = () => (
  <div className="p-4 text-gray-500">
    {/* t('courseNotFound') se podría añadir a los archivos de traducción */}
    Curso no encontrado o no hay lecciones disponibles.
  </div>
);


// --- Componente Principal ---

const CourseLessonsPage = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const { t } = useTranslation();

  // 1. Gestión de estado centralizada
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState(null);
  const [activeContent, setActiveContent] = useState({ lesson: null, step: null });
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);

  // 2. Fetch lessons using the new course-specific endpoint
  useEffect(() => {
    const fetchLessons = async () => {
      if (!courseId) return;
      
      setLessonsLoading(true);
      setLessonsError(null);
      try {
        // Convert courseId to integer (it comes as string from useParams)
        const courseIdInt = parseInt(courseId, 10);
        if (isNaN(courseIdInt)) {
          throw new Error('Invalid course ID');
        }
        
        const result = await getCourseLessons(courseIdInt, { perPage: 100 });
        setLessons(result.data || []);
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessonsError(error.message || 'Failed to load lessons');
        setLessons([]);
      } finally {
        setLessonsLoading(false);
      }
    };

    fetchLessons();
  }, [courseId]);

  // 3. Sort lessons by _lesson_order and sort steps within each lesson by order
  const sortedLessons = useMemo(() => {
    if (!lessons || lessons.length === 0) return [];
    
    // Sort lessons by _lesson_order (ascending), then by title if orders are equal
    const lessonsSorted = [...lessons].sort((a, b) => {
      const orderA = parseInt(a.meta?._lesson_order) || 0;
      const orderB = parseInt(b.meta?._lesson_order) || 0;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If orders are equal, sort alphabetically
      const titleA = (a.title?.rendered || a.title || '').toLowerCase();
      const titleB = (b.title?.rendered || b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
    
    // Sort steps within each lesson by their order field
    return lessonsSorted.map(lesson => {
      if (!lesson.meta?._lesson_steps || lesson.meta._lesson_steps.length === 0) {
        return lesson;
      }
      
      const sortedSteps = [...lesson.meta._lesson_steps].sort((a, b) => {
        const orderA = parseInt(a.order) || 0;
        const orderB = parseInt(b.order) || 0;
        return orderA - orderB;
      });
      
      return {
        ...lesson,
        meta: {
          ...lesson.meta,
          _lesson_steps: sortedSteps
        }
      };
    });
  }, [lessons]);
  
  // Ranking hook
  const { 
    ranking, 
    myStatus, 
    loading: rankingLoading, 
    totalQuizzes,
    refetch: refetchRanking 
  } = useCourseRanking(courseId, false); // Don't auto-fetch, load on demand
  
  const { 
    data: fetchedCourse, 
    loading: courseLoading, 
    error: courseError 
  } = useCourseData(courseId);

  // 4. Lógica de efectos consolidada
  useEffect(() => {
    if (fetchedCourse) setCourse(fetchedCourse);
  }, [fetchedCourse]);
  
  useEffect(() => {
    if (courseError || lessonsError) {
      setError((courseError || lessonsError).message || 'Ocurrió un error');
    }
  }, [courseError, lessonsError]);
  
  // Efecto para seleccionar el primer paso por defecto O el paso/quiz especificado
  useEffect(() => {
    // Solo ejecutar una vez cuando todo esté cargado
    if (hasInitialized || lessonsLoading || !sortedLessons?.length) {
      return;
    }
    
    // Prioridad 1: Si venimos con una lección y paso específicos desde el modal
    const selectedLessonId = location.state?.selectedLessonId;
    const selectedStepIndex = location.state?.selectedStepIndex;
    
    if (selectedLessonId !== undefined && selectedStepIndex !== undefined) {
      // Buscar la lección específica
      const targetLesson = sortedLessons.find(l => parseInt(l.id) === parseInt(selectedLessonId));
      
      if (targetLesson && targetLesson.meta?._lesson_steps) {
        const steps = targetLesson.meta._lesson_steps;
        
        // Verificar que el índice esté dentro del rango
        if (selectedStepIndex >= 0 && selectedStepIndex < steps.length) {
          const targetStep = steps[selectedStepIndex];
          
          setActiveContent({ lesson: targetLesson, step: targetStep });
          setHasInitialized(true);
          
          // Limpiar el estado para evitar reselección en futuras navegaciones
          window.history.replaceState({}, document.title);
          return;
        }
      }
    }
    
    // Prioridad 2: Si venimos de vuelta a un quiz específico
    const selectedQuizId = location.state?.selectedQuizId;
    
    if (selectedQuizId) {
      // Buscar la lección que contiene este quiz
      const associatedLesson = sortedLessons.find(l => {
        const hasStep = l.meta?._lesson_steps?.some(s => {
          return s?.data?.quiz_id && parseInt(s.data.quiz_id) === parseInt(selectedQuizId);
        });
        return hasStep;
      });
      
      if (associatedLesson) {
        const quizStep = associatedLesson.meta._lesson_steps.find(s => 
          s?.data?.quiz_id && parseInt(s.data.quiz_id) === parseInt(selectedQuizId)
        );
        
        if (quizStep) {
          setActiveContent({ lesson: associatedLesson, step: quizStep });
          setHasInitialized(true);
          
          // Limpiar el estado para evitar reselección en futuras navegaciones
          window.history.replaceState({}, document.title);
          return;
        }
      }
    }
    
    // Comportamiento por defecto: seleccionar el primer paso
    const firstLesson = sortedLessons[0];
    const firstStep = firstLesson?.meta?._lesson_steps?.[0];
    
    if (firstLesson && firstStep) {
      setActiveContent({ lesson: firstLesson, step: firstStep });
      setHasInitialized(true);
    }
  }, [sortedLessons, lessonsLoading, hasInitialized, location.state]);

  // 5. Handler para la selección de pasos
  const handleSelectStep = (step, lesson) => {
    setActiveContent({ step, lesson });
  };

  // 6. Handler para abrir el ranking
  const handleOpenRanking = async () => {
    setShowRankingModal(true);
    await refetchRanking(); // Fetch ranking data when opening modal
  };
  
  // 7. Renderizado condicional limpio
  const isLoading = courseLoading || lessonsLoading;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!course || !sortedLessons || sortedLessons.length === 0) return <EmptyState />;

  return (
    // ✅ Fondo gris y maquetación corregida (lista a la izquierda, contenido a la derecha)
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-gray-100">
      {/* Panel de contenido principal */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Ranking Button - Positioned in main content area */}
        <div className="absolute top-4 right-4 z-10">
          <QEButton
            onClick={handleOpenRanking}
            variant="primary"
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            disabled={rankingLoading}
          >
            <Trophy className="w-5 h-5" />
            <span className="hidden sm:inline">Ranking del Curso</span>
          </QEButton>
        </div>

        <StepContent 
          lesson={activeContent.lesson} 
          step={activeContent.step}
        />
      </div>

      {/* Panel lateral de lecciones */}
      <CourseLessonList 
        lessons={sortedLessons} 
        isLoading={lessonsLoading}
        selectedStepId={activeContent.step?.id}
        onSelectStep={handleSelectStep}
      />

      {/* Ranking Modal */}
      {showRankingModal && (
        <CourseRankingModal
          isOpen={showRankingModal}
          onClose={() => setShowRankingModal(false)}
          courseId={courseId}
          courseName={course?.title?.rendered || course?.title || 'Curso'}
        />
      )}
    </div>
  );
};

// Hook personalizado para encapsular la lógica de fetching de un curso
const useCourseData = (courseId) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCourse = useCallback(async () => {
        if (!courseId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const courseData = await getCourse(parseInt(courseId));
            setData(courseData);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);

    return { data, loading, error };
}

export default CourseLessonsPage;