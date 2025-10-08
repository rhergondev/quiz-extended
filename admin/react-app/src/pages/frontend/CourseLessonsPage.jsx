import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getCourse } from '../../api/services/courseService';
import useLessons from '../../hooks/useLessons';
import useQuizzes from '../../hooks/useQuizzes'; // <-- 1. Importamos el hook de quizzes
import CourseLessonList from '../../components/frontend/CourseLessonList';
import StepContent from '../../components/frontend/StepContent';

const CourseLessonsPage = () => {
  const { courseId } = useParams();
  
  const [course, setCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState(null);
  
  const [activeContent, setActiveContent] = useState({ lesson: null, step: null });

  const { lessons, loading: lessonsLoading, error: lessonsError } = useLessons({ 
    courseId: courseId, 
    autoFetch: true,
    perPage: 100
  });

  // 2. Obtenemos todos los quizzes para tener sus títulos
  const { quizzes, loading: quizzesLoading } = useQuizzes({ perPage: 100, autoFetch: true });

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    setCourseLoading(true);
    setCourseError(null);
    try {
      const courseData = await getCourse(parseInt(courseId));
      setCourse(courseData);
    } catch (err) {
      setCourseError(err.message);
    } finally {
      setCourseLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  useEffect(() => {
    if (!lessonsLoading && lessons && lessons.length > 0 && !activeContent.step) {
      const firstLesson = lessons[0];
      const firstStep = firstLesson.meta?._lesson_steps?.[0];
      if (firstLesson && firstStep) {
        setActiveContent({ lesson: firstLesson, step: firstStep });
      }
    }
  }, [lessons, lessonsLoading, activeContent.step]);

  const handleSelectStep = (step, lesson) => {
    setActiveContent({ step, lesson });
  };

  if (courseLoading || quizzesLoading) {
    return <div>Cargando contenido del curso...</div>;
  }

  if (courseError || lessonsError) {
    return <div className="text-red-600">Error al cargar el curso o las lecciones.</div>;
  }

  if (!course) {
    return <div>Curso no encontrado.</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      
      <StepContent 
        lesson={activeContent.lesson} 
        step={activeContent.step} 
        quizzes={quizzes} // <-- 4. Pasamos los quizzes al contenido
      />
            <CourseLessonList 
        lessons={lessons} 
        isLoading={lessonsLoading}
        selectedStepId={activeContent.step?.id}
        onSelectStep={handleSelectStep}
        quizzes={quizzes} // <-- 3. Pasamos los quizzes a la lista
      />
    </div>
  );
};

export default CourseLessonsPage;