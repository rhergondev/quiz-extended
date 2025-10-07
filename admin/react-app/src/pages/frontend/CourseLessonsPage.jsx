import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getCourse } from '../../api/services/courseService';
import useLessons from '../../hooks/useLessons';
import CourseLessonList from '../../components/frontend/CourseLessonList';

const CourseLessonsPage = () => {
  const { courseId } = useParams();
  
  const [course, setCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState(null);

  const { lessons, loading: lessonsLoading, error: lessonsError } = useLessons({ 
    courseId: courseId, 
    autoFetch: true,
    perPage: 100
  });

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

  if (courseLoading) {
    return <div>Cargando contenido del curso...</div>;
  }

  if (courseError || lessonsError) {
    return <div className="text-red-600">Error al cargar el curso o las lecciones.</div>;
  }

  if (!course) {
    return <div>Curso no encontrado.</div>;
  }

  return (
    // 🔥 CORRECCIÓN: Añadido "items-start" para alinear las columnas en la parte superior.
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Columna principal del contenido */}
      <div className="flex-grow lg:w-2/3">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{course.title}</h1>
        <div 
          className="prose max-w-none" 
          dangerouslySetInnerHTML={{ __html: course.content }} 
        />
      </div>

      {/* Columna lateral para lecciones */}
      <CourseLessonList lessons={lessons} isLoading={lessonsLoading} />
    </div>
  );
};

export default CourseLessonsPage;