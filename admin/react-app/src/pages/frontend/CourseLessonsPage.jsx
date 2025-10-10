import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCourse } from '../../api/services/courseService';
import useLessons from '../../hooks/useLessons';
import useQuizzes from '../../hooks/useQuizzes';
import CourseLessonList from '../../components/frontend/CourseLessonList';
import StepContent from '../../components/frontend/StepContent';
import { Loader } from 'lucide-react'; // Usaremos un icono para el estado de carga

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
  const { t } = useTranslation();

  // 1. Gestión de estado centralizada
  const [course, setCourse] = useState(null);
  const [activeContent, setActiveContent] = useState({ lesson: null, step: null });
  const [error, setError] = useState(null);

  // 2. Uso de hooks de datos
  const { lessons, loading: lessonsLoading, error: lessonsError } = useLessons({ 
    courseId, 
    autoFetch: !!courseId,
    perPage: 100
  });

  const { quizzes, loading: quizzesLoading, error: quizzesError } = useQuizzes({ 
    perPage: 100, 
    autoFetch: true 
  });
  
  const { 
    data: fetchedCourse, 
    loading: courseLoading, 
    error: courseError 
  } = useCourseData(courseId);

  // 3. Lógica de efectos consolidada
  useEffect(() => {
    if (fetchedCourse) setCourse(fetchedCourse);
  }, [fetchedCourse]);
  
  useEffect(() => {
    const anyError = courseError || lessonsError || quizzesError;
    if (anyError) setError(anyError.message || 'Ocurrió un error');
  }, [courseError, lessonsError, quizzesError]);
  
  // Efecto para seleccionar el primer paso por defecto
  useEffect(() => {
    if (!lessonsLoading && lessons?.length > 0 && !activeContent.step) {
      const firstLesson = lessons[0];
      const firstStep = firstLesson.meta?._lesson_steps?.[0];
      if (firstLesson && firstStep) {
        setActiveContent({ lesson: firstLesson, step: firstStep });
      }
    }
  }, [lessons, lessonsLoading, activeContent.step]);

  // 4. Handler para la selección de pasos
  const handleSelectStep = (step, lesson) => {
    setActiveContent({ step, lesson });
  };
  
  // 5. Renderizado condicional limpio
  const isLoading = courseLoading || quizzesLoading || lessonsLoading;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!course || !lessons || lessons.length === 0) return <EmptyState />;

  return (
    // ✅ Fondo gris y maquetación corregida (lista a la izquierda, contenido a la derecha)
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-gray-100">
      <div className="flex-1 overflow-y-auto">
        <StepContent 
          lesson={activeContent.lesson} 
          step={activeContent.step} 
          quizzes={quizzes}
        />
      </div>
      <CourseLessonList 
        lessons={lessons} 
        isLoading={lessonsLoading}
        selectedStepId={activeContent.step?.id}
        onSelectStep={handleSelectStep}
        quizzes={quizzes}
      />
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