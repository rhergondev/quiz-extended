import { useState, useEffect, useCallback } from 'react';
import { getCourses, createCourse, deleteCourse } from '../../api/coursesApi';

/**
 * Un hook personalizado para gestionar el estado y la lógica de los cursos.
 * Encapsula las llamadas a la API, el estado de carga y la manipulación de datos.
 *
 * @returns {object} Un objeto con el estado de los cursos y las funciones para manipularlos.
 * - courses {Array}: La lista de cursos.
 * - isLoading {boolean}: True si se están cargando los datos.
 * - error {Error|null}: Un objeto de error si alguna llamada a la API falla.
 * - addCourse {function(object): Promise<void>}: Función para crear un nuevo curso.
 * - removeCourse {function(number): Promise<void>}: Función para borrar un curso por su ID.
 */
export const useCourses = () => {
  // --- ESTADO ---
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- EFECTOS ---
  // useEffect para cargar los cursos iniciales cuando el hook se usa por primera vez.
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);
      } catch (err) {
        setError(err);
        console.error('Failed to fetch courses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []); // El array vacío asegura que esto solo se ejecute una vez al montar.

  // --- MANEJADORES DE ACCIONES ---

  // useCallback memoriza la función para evitar re-crearla en cada renderizado.
  const addCourse = useCallback(async (courseData) => {
    try {
      const newCourse = await createCourse(courseData);
      // Actualizamos el estado local añadiendo el nuevo curso a la lista.
      setCourses((prevCourses) => [newCourse, ...prevCourses]);
    } catch (err) {
      setError(err);
      console.error('Failed to create course:', err);
      // Podríamos querer re-lanzar el error para que el componente lo maneje
      throw err;
    }
  }, []);

  const removeCourse = useCallback(async (courseId) => {
    try {
      await deleteCourse(courseId);
      // Actualizamos el estado local eliminando el curso de la lista.
      // Esto proporciona una respuesta instantánea en la UI.
      setCourses((prevCourses) =>
        prevCourses.filter((course) => course.id !== courseId)
      );
    } catch (err) {
      setError(err);
      console.error(`Failed to delete course ${courseId}:`, err);
      throw err;
    }
  }, []);

  // --- VALOR DE RETORNO ---
  // Exponemos el estado y las funciones para que los componentes los puedan usar.
  return {
    courses,
    isLoading,
    error,
    addCourse,
    removeCourse,
  };
};