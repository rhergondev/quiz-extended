/**
 * This file contains all functions to interact with WordPress REST API endpoints
 * related to Courses with pagination support.
 */

const { api_url, nonce } = window.qe_data || {};

const COURSES_ENDPOINT = `${api_url}/wp/v2/course`;

// === READ (READ) with Pagination ===

/**
 * Get a paginated list of all courses.
 * @param {Object} options - Pagination and filter options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.perPage - Items per page (default: 20)
 * @param {string} options.status - Course status filter
 * @param {string} options.search - Search term
 * @returns {Promise<Object>} Promise that resolves with courses and pagination info
 */
export const getCourses = async (options = {}) => {
  try {
    const { 
      page = 1, 
      perPage = 20, 
      status = 'publish,draft',
      search = '' 
    } = options;

    // Build query parameters
    const params = new URLSearchParams({
      _embed: 'true',
      status: status,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    // Add search parameter if provided
    if (search.trim()) {
      params.append('search', search.trim());
    }

    const response = await fetch(`${COURSES_ENDPOINT}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const courses = await response.json();
    
    // Get pagination info from headers
    const totalCourses = parseInt(response.headers.get('X-WP-Total') || '0');
    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
    const currentPage = parseInt(response.headers.get('X-WP-Page') || page.toString());

    return {
      data: courses,
      pagination: {
        total: totalCourses,
        totalPages: totalPages,
        currentPage: currentPage,
        perPage: perPage,
        hasMore: currentPage < totalPages && courses.length > 0
      }
    };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return {
      data: [],
      pagination: {
        total: 0,
        totalPages: 0,
        currentPage: 1,
        perPage: perPage,
        hasMore: false
      }
    };
  }
};

// === CREATE (CREATE) ===

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

// === DELETE (DELETE) ===

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