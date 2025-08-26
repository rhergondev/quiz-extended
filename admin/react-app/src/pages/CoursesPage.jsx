import React from 'react';
import { useCourses } from '../components/hooks/useCourses';
import CoursesActionBar from '../components/courses/CoursesActionBar';
import CoursesList from '../components/courses/CoursesList';

/**
 * La página principal para la gestión de Cursos.
 * Orquesta los componentes de la UI y la lógica del hook.
 */
const CoursesPage = () => {
  // 1. Usamos nuestro hook personalizado para obtener toda la lógica y el estado.
  const { courses, isLoading, addCourse, removeCourse } = useCourses();

  // 2. Definimos las funciones que se pasarán a los componentes hijos.
  const handleNewCourse = async () => {
    // Esto es un ejemplo. En una app real, abrirías un modal o un formulario.
    const newCourseData = {
      title: 'Nuevo Curso de Prueba',
      content: 'Esta es la descripción del nuevo curso.',
      status: 'draft', // Es buena práctica crear los cursos como borrador.
    };

    try {
      await addCourse(newCourseData);
      // Podríamos mostrar una notificación de éxito aquí.
      console.log('¡Curso creado con éxito!');
    } catch (error) {
      // Y una notificación de error aquí.
      console.error('Error al crear el curso:', error);
    }
  };

  const handleDeleteCourse = async (id) => {
    // Pedimos confirmación antes de una acción destructiva.
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await removeCourse(id);
        console.log(`Curso ${id} borrado con éxito.`);
      } catch (error) {
        console.error(`Error al borrar el curso ${id}:`, error);
      }
    }
  };

  const handleEditCourse = (id) => {
    // En el futuro, esto navegaría a una página de edición
    // o abriría un modal con los datos del curso.
    console.log(`Navegando a la edición del curso con ID: ${id}`);
  };

  // 3. Renderizamos la estructura de la página.
  return (
    <div className="wrap">
      {/* La barra de acciones recibe la función para crear un nuevo curso */}
      <CoursesActionBar onNewCourse={handleNewCourse} />

      <div className="p-4">
        {/* La lista de cursos recibe los datos y las funciones para editar/borrar */}
        <CoursesList
          courses={courses}
          isLoading={isLoading}
          onDelete={handleDeleteCourse}
          onEdit={handleEditCourse}
        />
      </div>
    </div>
  );
};

export default CoursesPage;