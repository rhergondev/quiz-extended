/**
 * Este archivo contiene todas las funciones para interactuar con los endpoints
 * de la API REST de WordPress relacionados con los Cursos.
 */

// Obtenemos los datos globales inyectados por PHP (ver admin/class-qe-assets.php)
// El '|| {}' es un fallback de seguridad en caso de que el objeto no exista.
const { api_url, nonce } = window.qe_data || {};

// === LECTURA (READ) ===

/**
 * Obtiene una lista de todos los cursos.
 * @returns {Promise<Array>} Una promesa que se resuelve con el array de cursos.
 */
export const getCourses = async () => {
  try {
    const response = await fetch(`${api_url}/wp/v2/course?_embed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    // En una app real, aquí manejarías el error de forma más elegante.
    return [];
  }
};

// === CREACIÓN (CREATE) ===

/**
 * Crea un nuevo curso.
 * @param {object} courseData - Los datos del curso a crear.
 * Ejemplo: { title: 'Nuevo Curso', content: 'Descripción...', status: 'draft' }
 * @returns {Promise<object>} Una promesa que se resuelve con el objeto del curso creado.
 */
export const createCourse = async (courseData) => {
  try {
    const response = await fetch(`${api_url}/wp/v2/course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce, // Nonce de seguridad para autenticar la petición
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      throw new Error('Failed to create course');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating course:', error);
    throw error; // Re-lanzamos el error para que el hook lo pueda capturar.
  }
};

// === BORRADO (DELETE) ===

/**
 * Borra un curso por su ID.
 * @param {number} courseId - El ID del curso a borrar.
 * @returns {Promise<boolean>} Una promesa que se resuelve a true si el borrado fue exitoso.
 */
export const deleteCourse = async (courseId) => {
  try {
    const response = await fetch(`${api_url}/wp/v2/course/${courseId}`, {
      method: 'DELETE',
      headers: {
        'X-WP-Nonce': nonce,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete course');
    }

    // Una respuesta de borrado exitosa no siempre devuelve contenido.
    // Verificamos el status para confirmar el éxito.
    return response.status === 200 || response.status === 204;
  } catch (error) {
    console.error(`Error deleting course ${courseId}:`, error);
    throw error;
  }
};

// === NOTA: Faltaría la función de ACTUALIZACIÓN (UPDATE),
// que sería muy similar a createCourse pero con el método 'PUT'.