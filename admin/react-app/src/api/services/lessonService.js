/**
 * Lesson service - Main CRUD operations for lessons
 * Provides high-level lesson management functions with proper error handling
 */

import { 
  transformLessonDataForApi,
  sanitizeLessonData,
  validateLessonData 
} from '../utils/lessonDataUtils.js';

export const buildLessonQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    status = 'publish,draft',
    search = '',
    courseId = null,
    orderBy = 'menu_order',
    order = 'asc',
    embed = true
  } = options;

  const params = new URLSearchParams({
    status: status,
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  // FIX: Mejorar el filtrado por curso
  if (courseId) {
    const numericCourseId = parseInt(courseId, 10);
    if (Number.isInteger(numericCourseId) && numericCourseId > 0) {
      // Usar meta_query para filtrar por curso
      params.append('meta_key', '_course_id');
      params.append('meta_value', numericCourseId.toString());
      params.append('meta_compare', '=');
    }
  }

  console.log('Built query params:', params.toString());
  return params;
};

/**
 * Build query parameters for course-specific lesson requests
 */
export const buildCourseLessonsQueryParams = (courseId, options = {}) => {
  const { 
    page = 1, 
    perPage = 20, 
    orderBy = 'menu_order', 
    order = 'asc',
    status = 'publish,draft,private',
    search = ''
  } = options;

  const params = new URLSearchParams({
    _embed: 'true',
    page: page.toString(),
    per_page: perPage.toString(),
    orderby: orderBy,
    order: order,
    status: status,
    meta_key: '_course_id',
    meta_value: courseId.toString(),
    meta_compare: '='
  });

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  console.log('Built course lessons query params:', params.toString());
  return params;
};

/**
 * Helper function to make API requests
 * Ya que no tienes apiClient, usamos fetch directamente
 */
const makeApiRequest = async (endpoint, options = {}) => {
  try {
    // Obtener configuración de WordPress
    const config = window.qeApiConfig || {};
    const baseUrl = config.apiUrl || '/wp-json/wp/v2/';
    const nonce = config.nonce || '';

    const url = `${baseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      ...options
    };

    console.log('Making API request to:', url);
    console.log('Request options:', defaultOptions);

    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      data,
      headers: {
        'X-WP-Total': response.headers.get('X-WP-Total'),
        'X-WP-TotalPages': response.headers.get('X-WP-TotalPages')
      }
    };
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Get lessons with optional filtering
 */
export const getLessons = async (options = {}) => {
  try {
    const params = buildLessonQueryParams(options);
    console.log('getLessons - API call with params:', params.toString());
    
    const response = await makeApiRequest(`lesson?${params.toString()}`);
    
    console.log('getLessons - Raw API response:', response);
    
    return {
      data: response.data ? response.data.map(sanitizeLessonData) : [],
      pagination: {
        currentPage: options.page || 1,
        totalPages: parseInt(response.headers['X-WP-TotalPages'] || '1'),
        total: parseInt(response.headers['X-WP-Total'] || '0'),
        perPage: options.perPage || 20
      }
    };
  } catch (error) {
    console.error('Error fetching lessons:', error);
    throw error;
  }
};

/**
 * Get lessons for a specific course
 */
export const getLessonsByCourse = async (courseId, options = {}) => {
  try {
    if (!courseId || !Number.isInteger(courseId) || courseId <= 0) {
      throw new Error('Invalid course ID provided');
    }

    const params = buildCourseLessonsQueryParams(courseId, options);
    console.log('getLessonsByCourse - API call with courseId:', courseId, 'params:', params.toString());
    
    const response = await makeApiRequest(`lesson?${params.toString()}`);
    
    console.log('getLessonsByCourse - Raw API response:', response);
    
    return {
      data: response.data ? response.data.map(sanitizeLessonData) : [],
      pagination: {
        currentPage: options.page || 1,
        totalPages: parseInt(response.headers['X-WP-TotalPages'] || '1'),
        total: parseInt(response.headers['X-WP-Total'] || '0'),
        perPage: options.perPage || 20
      }
    };
  } catch (error) {
    console.error('Error fetching lessons by course:', error);
    throw error;
  }
};

/**
 * Get a single lesson by ID
 */
export const getLesson = async (lessonId, options = {}) => {
  try {
    if (!lessonId || !Number.isInteger(lessonId) || lessonId <= 0) {
      throw new Error('Invalid lesson ID provided');
    }

    const { embed = true } = options;
    
    const queryParams = new URLSearchParams();
    if (embed) {
      queryParams.append('_embed', 'true');
    }

    const response = await makeApiRequest(`lesson/${lessonId}?${queryParams}`);
    
    return sanitizeLessonData(response.data);

  } catch (error) {
    console.error(`Error fetching lesson ${lessonId}:`, error);
    
    // Return null for 404 errors (lesson not found)
    if (error.message.includes('404')) {
      return null;
    }
    
    throw error;
  }
};

/**
 * Create a new lesson
 */
export const createLesson = async (lessonData) => {
  try {
    // Validate lesson data before sending
    const validation = validateLessonData(lessonData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformLessonDataForApi(lessonData);

    console.log('Creating lesson with data:', transformedData);
    const response = await makeApiRequest('lesson', {
      method: 'POST',
      body: JSON.stringify(transformedData)
    });
    
    console.log('✅ Lesson created successfully:', response.data.id);
    return sanitizeLessonData(response.data);

  } catch (error) {
    console.error('❌ Error creating lesson:', error);
    throw error;
  }
};

/**
 * Update an existing lesson
 */
export const updateLesson = async (lessonId, lessonData) => {
  try {
    if (!lessonId || !Number.isInteger(lessonId) || lessonId <= 0) {
      throw new Error('Invalid lesson ID provided');
    }

    // Validate lesson data before sending
    const validation = validateLessonData(lessonData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformLessonDataForApi(lessonData);

    const response = await makeApiRequest(`lesson/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(transformedData)
    });
    
    console.log('✅ Lesson updated successfully:', lessonId);
    return sanitizeLessonData(response.data);

  } catch (error) {
    console.error(`❌ Error updating lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Delete a lesson
 */
export const deleteLesson = async (lessonId, options = {}) => {
  try {
    if (!lessonId || !Number.isInteger(lessonId) || lessonId <= 0) {
      throw new Error('Invalid lesson ID provided');
    }

    const { force = false } = options;
    
    const queryParams = new URLSearchParams();
    if (force) {
      queryParams.append('force', 'true');
    }

    const url = `lesson/${lessonId}${queryParams.toString() ? `?${queryParams}` : ''}`;
    await makeApiRequest(url, { method: 'DELETE' });
    
    console.log(`✅ Lesson ${lessonId} deleted successfully`);
    return true;

  } catch (error) {
    console.error(`❌ Error deleting lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Duplicate a lesson
 */
export const duplicateLesson = async (lessonId, overrides = {}) => {
  try {
    // Get the original lesson
    const originalLesson = await getLesson(lessonId, { embed: false });
    
    if (!originalLesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }

    // Prepare duplicate data
    const duplicateData = {
      title: overrides.title || `${originalLesson.title} ${overrides.titleSuffix || '(Copy)'}`,
      content: originalLesson.content || '',
      status: overrides.status || 'draft', // Always start as draft
      courseId: overrides.newCourseId || originalLesson.meta?._course_id,
      menu_order: overrides.menu_order || (originalLesson.menu_order + 1),
      meta: {
        ...originalLesson.meta,
        ...overrides.meta,
        _course_id: (overrides.newCourseId || originalLesson.meta?._course_id)?.toString(),
        _lesson_order: overrides.lesson_order || ((parseInt(originalLesson.meta?._lesson_order || '1')) + 1).toString()
      }
    };

    // Create the duplicate
    const duplicatedLesson = await createLesson(duplicateData);
    
    console.log('✅ Lesson duplicated successfully:', duplicatedLesson.id);
    return duplicatedLesson;

  } catch (error) {
    console.error(`❌ Error duplicating lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Get lessons count
 */
export const getLessonsCount = async (filters = {}) => {
  try {
    const result = await getLessons({
      ...filters,
      page: 1,
      perPage: 1 // We only need the headers, not the data
    });

    return result.pagination.total;

  } catch (error) {
    console.error('Error getting lessons count:', error);
    return 0;
  }
};