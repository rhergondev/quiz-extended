/**
 * This file contains all functions to interact with WordPress REST API endpoints
 * related to Courses with pagination support and category integration.
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
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
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
    // Prepare the data for WordPress REST API format
    const requestData = {
      title: courseData.title,
      content: courseData.content || '',
      status: courseData.status || 'draft',
      meta: {
        // Ensure all meta fields are properly formatted
        _start_date: courseData.meta?._start_date || '',
        _end_date: courseData.meta?._end_date || '',
        _price: courseData.meta?._price || '',
        _sale_price: courseData.meta?._sale_price || '',
        _course_category: courseData.meta?._course_category || '',
        _difficulty_level: courseData.meta?._difficulty_level || '',
        _duration_weeks: courseData.meta?._duration_weeks || '',
        _max_students: courseData.meta?._max_students || '',
        ...courseData.meta
      }
    };

    const response = await fetch(COURSES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create course: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

// === UPDATE (UPDATE) ===

export const updateCourse = async (courseId, courseData) => {
  try {
    const requestData = {
      title: courseData.title,
      content: courseData.content || '',
      status: courseData.status || 'draft',
      meta: courseData.meta || {}
    };

    const response = await fetch(`${COURSES_ENDPOINT}/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update course: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating course ${courseId}:`, error);
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
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete course: ${response.status} ${response.statusText}`);
    }
    
    return response.ok;
  } catch (error) {
    console.error(`Error deleting course ${courseId}:`, error);
    throw error;
  }
};

// === UTILITY FUNCTIONS ===

/**
 * Get a single course by ID
 */
export const getCourse = async (courseId) => {
  try {
    const response = await fetch(`${COURSES_ENDPOINT}/${courseId}?_embed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch course: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Get courses by category
 */
export const getCoursesByCategory = async (categoryName, options = {}) => {
  try {
    const { page = 1, perPage = 20 } = options;

    const params = new URLSearchParams({
      _embed: 'true',
      page: page.toString(),
      per_page: perPage.toString(),
      meta_key: '_course_category',
      meta_value: categoryName,
      meta_compare: '='
    });

    const response = await fetch(`${COURSES_ENDPOINT}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const courses = await response.json();
    
    return {
      data: courses,
      pagination: {
        total: parseInt(response.headers.get('X-WP-Total') || '0'),
        totalPages: parseInt(response.headers.get('X-WP-TotalPages') || '1'),
        currentPage: parseInt(response.headers.get('X-WP-Page') || page.toString()),
        perPage: perPage,
      }
    };
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    return { data: [], pagination: { total: 0, totalPages: 0, currentPage: 1, perPage } };
  }
};