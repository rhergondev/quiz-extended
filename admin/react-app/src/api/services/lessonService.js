/**
 * Lesson Service - Complete New Version
 * Direct WordPress API integration with proper endpoint handling
 * FIXED: Course filtering now works correctly
 */

import { 
  transformLessonDataForApi,
  sanitizeLessonData,
  validateLessonData 
} from '../utils/lessonDataUtils.js';

/**
 * Get WordPress configuration and validate
 */
const getWpConfig = () => {
  const config = window.qe_data || {};
  
  if (!config.nonce) {
    throw new Error('WordPress configuration not found. Make sure qe_data is properly loaded.');
  }
  
  if (!config.endpoints || !config.endpoints.lessons) {
    throw new Error('Lessons endpoint not configured in WordPress');
  }
  
  return config;
};

/**
 * Make a direct API call to WordPress REST API
 */
const makeApiRequest = async (url, options = {}) => {
  try {
    const config = getWpConfig();
    
    console.log('🚀 API Request:', url);
    console.log('📋 Options:', options);
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
      },
      credentials: 'same-origin',
      ...options
    };

    const response = await fetch(url, defaultOptions);
    
    console.log('📡 Response Status:', response.status);
    console.log('📊 Response Headers:', {
      'X-WP-Total': response.headers.get('X-WP-Total'),
      'X-WP-TotalPages': response.headers.get('X-WP-TotalPages'),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ API Error Response:', errorData);
      throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Response Data Count:', Array.isArray(data) ? data.length : 'Not an array');
    
    return {
      data,
      headers: {
        'X-WP-Total': response.headers.get('X-WP-Total'),
        'X-WP-TotalPages': response.headers.get('X-WP-TotalPages')
      }
    };

  } catch (error) {
    console.error('💥 API Request Failed:', error);
    throw error;
  }
};

/**
 * Build query parameters for lesson requests
 */
const buildLessonQueryParams = (options = {}) => {
  const {
    page = 1,
    perPage = 20,
    status = 'publish,draft,private',
    search = '',
    courseId = null,
    orderBy = 'menu_order',
    order = 'asc',
    embed = true
  } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    status: status,
    orderby: orderBy,
    order: order
  });

  if (embed) {
    params.append('_embed', 'true');
  }

  if (search && search.trim()) {
    params.append('search', search.trim());
  }

  // FIXED: Use proper meta_query format for course filtering
  if (courseId) {
    const numericCourseId = parseInt(courseId, 10);
    if (Number.isInteger(numericCourseId) && numericCourseId > 0) {
      params.append('meta_query[0][key]', '_course_id');
      params.append('meta_query[0][value]', numericCourseId.toString());
      params.append('meta_query[0][compare]', '=');
      params.append('meta_query[0][type]', 'NUMERIC');
    }
  }

  console.log('🔧 Built query params:', params.toString());
  return params;
};

/**
 * Get all lessons with optional filtering
 */
export const getLessons = async (options = {}) => {
  try {
    const config = getWpConfig();
    const params = buildLessonQueryParams(options);
    
    const url = `${config.endpoints.lessons}?${params.toString()}`;
    console.log('🎯 GET Lessons URL:', url);
    
    const response = await makeApiRequest(url);
    
    // Sanitize the lesson data
    const sanitizedLessons = response.data ? response.data.map(sanitizeLessonData) : [];
    
    return {
      data: sanitizedLessons,
      pagination: {
        currentPage: options.page || 1,
        totalPages: parseInt(response.headers['X-WP-TotalPages'] || '1'),
        total: parseInt(response.headers['X-WP-Total'] || '0'),
        perPage: options.perPage || 20
      }
    };
    
  } catch (error) {
    console.error('❌ Error fetching lessons:', error);
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

    console.log('🎓 Getting lessons for course:', courseId);
    
    // Use the general getLessons method with courseId filter
    return getLessons({
      ...options,
      courseId: courseId
    });
    
  } catch (error) {
    console.error('❌ Error fetching lessons by course:', error);
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

    const config = getWpConfig();
    const { embed = true } = options;
    
    const params = new URLSearchParams();
    if (embed) {
      params.append('_embed', 'true');
    }

    const url = `${config.endpoints.lessons}/${lessonId}?${params.toString()}`;
    console.log('🎯 GET Single Lesson URL:', url);
    
    const response = await makeApiRequest(url);
    
    return sanitizeLessonData(response.data);

  } catch (error) {
    console.error(`❌ Error fetching lesson ${lessonId}:`, error);
    
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
    const config = getWpConfig();
    
    // Validate lesson data before sending
    const validation = validateLessonData(lessonData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformLessonDataForApi(lessonData);

    console.log('📝 Creating lesson with data:', transformedData);
    
    const response = await makeApiRequest(config.endpoints.lessons, {
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

    const config = getWpConfig();

    // Validate lesson data before sending
    const validation = validateLessonData(lessonData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Transform data for API
    const transformedData = transformLessonDataForApi(lessonData);

    console.log(`✏️ Updating lesson ${lessonId} with data:`, transformedData);
    
    const url = `${config.endpoints.lessons}/${lessonId}`;
    const response = await makeApiRequest(url, {
      method: 'POST', // WordPress REST API uses POST for updates
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

    const config = getWpConfig();
    const { force = false } = options;
    
    const params = new URLSearchParams();
    if (force) {
      params.append('force', 'true');
    }

    console.log(`🗑️ Deleting lesson ${lessonId}...`);
    
    const url = `${config.endpoints.lessons}/${lessonId}?${params.toString()}`;
    const response = await makeApiRequest(url, {
      method: 'DELETE'
    });
    
    console.log('✅ Lesson deleted successfully:', lessonId);
    return response.data;

  } catch (error) {
    console.error(`❌ Error deleting lesson ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Duplicate a lesson
 */
export const duplicateLesson = async (lessonId) => {
  try {
    if (!lessonId || !Number.isInteger(lessonId) || lessonId <= 0) {
      throw new Error('Invalid lesson ID provided');
    }

    console.log(`📋 Duplicating lesson ${lessonId}...`);
    
    // First, get the original lesson
    const originalLesson = await getLesson(lessonId);
    if (!originalLesson) {
      throw new Error('Original lesson not found');
    }

    // Prepare data for duplication
    const duplicateData = {
      title: `${originalLesson.title} (Copy)`,
      content: originalLesson.content,
      status: 'draft', // Always create duplicates as drafts
      meta: {
        ...originalLesson.meta,
        _lesson_order: (parseInt(originalLesson.meta._lesson_order || '1') + 1).toString()
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
 * Get lessons count with optional filters
 */
export const getLessonsCount = async (options = {}) => {
  try {
    const result = await getLessons({ ...options, perPage: 1 });
    return result.pagination.total;
  } catch (error) {
    console.error('❌ Error getting lessons count:', error);
    return 0;
  }
};

/**
 * Batch delete multiple lessons
 */
export const batchDeleteLessons = async (lessonIds, force = false) => {
  try {
    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      throw new Error('Invalid lesson IDs array provided');
    }

    console.log(`🗑️ Batch deleting ${lessonIds.length} lessons...`);
    
    const results = {
      successful: [],
      failed: []
    };

    // Process deletions in parallel (but be careful with rate limits)
    const deletePromises = lessonIds.map(async (lessonId) => {
      try {
        await deleteLesson(lessonId, { force });
        results.successful.push(lessonId);
        return { id: lessonId, success: true };
      } catch (error) {
        results.failed.push({ id: lessonId, error: error.message });
        return { id: lessonId, success: false, error: error.message };
      }
    });

    await Promise.allSettled(deletePromises);
    
    console.log(`✅ Batch delete completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;

  } catch (error) {
    console.error('❌ Error in batch delete lessons:', error);
    throw error;
  }
};

/**
 * Batch update lesson status
 */
export const batchUpdateLessonStatus = async (lessonIds, newStatus) => {
  try {
    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      throw new Error('Invalid lesson IDs array provided');
    }

    if (!['publish', 'draft', 'private', 'pending'].includes(newStatus)) {
      throw new Error('Invalid status provided');
    }

    console.log(`📊 Batch updating ${lessonIds.length} lessons to status: ${newStatus}...`);
    
    const results = {
      successful: [],
      failed: []
    };

    // Process updates in parallel
    const updatePromises = lessonIds.map(async (lessonId) => {
      try {
        await updateLesson(lessonId, { status: newStatus });
        results.successful.push(lessonId);
        return { id: lessonId, success: true };
      } catch (error) {
        results.failed.push({ id: lessonId, error: error.message });
        return { id: lessonId, success: false, error: error.message };
      }
    });

    await Promise.allSettled(updatePromises);
    
    console.log(`✅ Batch status update completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;

  } catch (error) {
    console.error('❌ Error in batch update lesson status:', error);
    throw error;
  }
};

/**
 * Move lessons to a different course
 */
export const moveLessonsToCourse = async (lessonIds, newCourseId) => {
  try {
    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      throw new Error('Invalid lesson IDs array provided');
    }

    const numericCourseId = parseInt(newCourseId, 10);
    if (!Number.isInteger(numericCourseId) || numericCourseId <= 0) {
      throw new Error('Invalid course ID provided');
    }

    console.log(`🎓 Moving ${lessonIds.length} lessons to course: ${numericCourseId}...`);
    
    const results = {
      successful: [],
      failed: []
    };

    // Process moves in parallel
    const movePromises = lessonIds.map(async (lessonId) => {
      try {
        await updateLesson(lessonId, {
          meta: {
            _course_id: numericCourseId.toString()
          }
        });
        results.successful.push(lessonId);
        return { id: lessonId, success: true };
      } catch (error) {
        results.failed.push({ id: lessonId, error: error.message });
        return { id: lessonId, success: false, error: error.message };
      }
    });

    await Promise.allSettled(movePromises);
    
    console.log(`✅ Batch move completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;

  } catch (error) {
    console.error('❌ Error moving lessons to course:', error);
    throw error;
  }
};

/**
 * Search lessons with advanced filters
 */
export const searchLessons = async (query, filters = {}) => {
  try {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters long');
    }

    console.log(`🔍 Searching lessons with query: "${query.trim()}"`);
    
    const searchOptions = {
      search: query.trim(),
      perPage: filters.perPage || 20,
      page: filters.page || 1,
      status: filters.status || 'publish,draft,private',
      courseId: filters.courseId || null,
      orderBy: filters.orderBy || 'relevance',
      order: filters.order || 'desc'
    };

    return getLessons(searchOptions);

  } catch (error) {
    console.error('❌ Error searching lessons:', error);
    throw error;
  }
};

/**
 * Get lesson statistics
 */
export const getLessonStatistics = async (courseId = null) => {
  try {
    console.log('📊 Getting lesson statistics...', courseId ? `for course ${courseId}` : 'for all lessons');
    
    const options = courseId ? { courseId, perPage: -1 } : { perPage: -1 };
    const result = await getLessons(options);
    
    const stats = {
      total: result.data.length,
      byStatus: {
        publish: result.data.filter(l => l.status === 'publish').length,
        draft: result.data.filter(l => l.status === 'draft').length,
        private: result.data.filter(l => l.status === 'private').length,
        pending: result.data.filter(l => l.status === 'pending').length
      },
      byType: result.data.reduce((acc, lesson) => {
        const type = lesson.meta?._lesson_type || 'text';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      byContentType: {
        free: result.data.filter(l => l.meta?._content_type !== 'premium').length,
        premium: result.data.filter(l => l.meta?._content_type === 'premium').length
      },
      totalDuration: result.data.reduce((total, lesson) => {
        const duration = parseInt(lesson.meta?._duration_minutes || '0');
        return total + duration;
      }, 0),
      averageDuration: result.data.length > 0 
        ? Math.round(result.data.reduce((total, lesson) => {
            const duration = parseInt(lesson.meta?._duration_minutes || '0');
            return total + duration;
          }, 0) / result.data.length)
        : 0,
      lessonsWithQuizzes: result.data.filter(lesson => 
        lesson.meta?._has_quiz === 'yes' || lesson.meta?._lesson_type === 'quiz'
      ).length
    };

    console.log('✅ Lesson statistics:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error getting lesson statistics:', error);
    throw error;
  }
};

/**
 * Test API configuration and endpoints
 */
export const testApiConfig = () => {
  try {
    const config = getWpConfig();
    
    console.log('🧪 API Configuration Test:');
    console.log('✅ WordPress config found:', !!config);
    console.log('✅ Nonce present:', !!config.nonce);
    console.log('✅ Endpoints configured:', !!config.endpoints);
    console.log('✅ Lessons endpoint:', config.endpoints?.lessons);
    console.log('✅ Courses endpoint:', config.endpoints?.courses);
    
    return {
      success: true,
      config: config,
      endpoints: config.endpoints
    };
    
  } catch (error) {
    console.error('❌ API Configuration Test Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};