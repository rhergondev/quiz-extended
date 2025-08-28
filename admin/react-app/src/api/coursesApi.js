/**
 * Este archivo contiene todas las funciones para interactuar con los endpoints
 * de la API REST de WordPress relacionados con los Cursos.
 */

const { api_url, nonce } = window.qe_data || {};

const COURSES_ENDPOINT = `${api_url}/wp/v2/course`;

// === LECTURA (READ) ===

/**
 * Obtiene una lista de todos los cursos.
 * @returns {Promise<Array>} Una promesa que se resuelve con el array de cursos.
 */
export const getCourses = async () => {
  try {
    // --- CAMBIO CLAVE ---
    // Añadimos el parámetro 'status=publish,draft' para obtener todos los cursos.
    const response = await fetch(`${COURSES_ENDPOINT}?_embed&status=publish,draft`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // El nonce también es necesario aquí para poder ver los borradores de otros usuarios.
        'X-WP-Nonce': nonce,
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

// ... (El resto de las funciones createCourse y deleteCourse no necesitan cambios)

export const createCourse = async (courseData) => {
  try {
    const response = await fetch(COURSES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      body: JSON.stringify(courseData),
    });
    if (!response.ok) throw new Error('Failed to create course');
    return await response.json();
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId) => {
  try {
    const response = await fetch(`${COURSES_ENDPOINT}/${courseId}`, {
      method: 'DELETE',
      headers: {
        'X-WP-Nonce': nonce,
      },
    });
    if (!response.ok) throw new Error('Failed to delete course');
    return response.ok;
  } catch (error) {
    console.error(`Error deleting course ${courseId}:`, error);
    throw error;
  }
};