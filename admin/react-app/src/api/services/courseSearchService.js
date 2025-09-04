/**
 * Course search service
 * Handles advanced search operations for courses
 */

import { getApiConfig, DEFAULT_PAGINATION } from '../config/apiConfig.js';
import { httpGet, extractPaginationFromHeaders } from '../utils/httpUtils.js';
import { buildCourseQueryParams, sanitizeCourseData, VALID_DIFFICULTY_LEVELS } from '../utils/courseDataUtils.js';
import { getCourses } from './courseService.js';

/**
 * Advanced course search with multiple filters
 * @param {Object} searchOptions - Search criteria
 * @param {string} searchOptions.query - Search query string
 * @param {string} searchOptions.category - Category filter
 * @param {string} searchOptions.status - Status filter
 * @param {string} searchOptions.difficulty - Difficulty level filter
 * @param {number} searchOptions.minPrice - Minimum price filter
 * @param {number} searchOptions.maxPrice - Maximum price filter
 * @param {string} searchOptions.dateFrom - Start date filter (YYYY-MM-DD)
 * @param {string} searchOptions.dateTo - End date filter (YYYY-MM-DD)
 * @param {Object} paginationOptions - Pagination options
 * @param {number} paginationOptions.page - Page number
 * @param {number} paginationOptions.perPage - Items per page
 * @param {string} paginationOptions.orderBy - Order by field
 * @param {string} paginationOptions.order - Order direction (asc/desc)
 * @returns {Promise<Object>} Search results with pagination
 */
export const advancedCourseSearch = async (searchOptions = {}, paginationOptions = {}) => {
  try {
    const {
      query = '',
      category = '',
      status = 'publish,draft',
      difficulty = '',
      minPrice = null,
      maxPrice = null,
      dateFrom = '',
      dateTo = ''
    } = searchOptions;

    const {
      page = DEFAULT_PAGINATION.page,
      perPage = DEFAULT_PAGINATION.perPage,
      orderBy = 'date',
      order = 'desc'
    } = paginationOptions;

    const { endpoints } = getApiConfig();
    const queryParams = new URLSearchParams({
      _embed: 'true',
      status: status,
      page: page.toString(),
      per_page: perPage.toString(),
      orderby: orderBy,
      order: order
    });

    // Add search query
    if (query.trim()) {
      queryParams.append('search', query.trim());
    }

    // Add meta queries for advanced filters
    const metaQueries = [];

    if (category) {
      metaQueries.push({
        key: '_course_category',
        value: category,
        compare: '='
      });
    }

    if (difficulty && VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
      metaQueries.push({
        key: '_difficulty_level',
        value: difficulty,
        compare: '='
      });
    }

    if (minPrice !== null || maxPrice !== null) {
      const priceQuery = {
        key: '_price',
        type: 'NUMERIC'
      };

      if (minPrice !== null && maxPrice !== null) {
        priceQuery.value = [minPrice, maxPrice];
        priceQuery.compare = 'BETWEEN';
      } else if (minPrice !== null) {
        priceQuery.value = minPrice;
        priceQuery.compare = '>=';
      } else if (maxPrice !== null) {
        priceQuery.value = maxPrice;
        priceQuery.compare = '<=';
      }

      metaQueries.push(priceQuery);
    }

    // Add date filters
    if (dateFrom || dateTo) {
      const dateQuery = {
        key: '_start_date',
        type: 'DATE'
      };

      if (dateFrom && dateTo) {
        dateQuery.value = [dateFrom, dateTo];
        dateQuery.compare = 'BETWEEN';
      } else if (dateFrom) {
        dateQuery.value = dateFrom;
        dateQuery.compare = '>=';
      } else if (dateTo) {
        dateQuery.value = dateTo;
        dateQuery.compare = '<=';
      }

      metaQueries.push(dateQuery);
    }

    // Add meta queries to URL params (WordPress REST API format)
    if (metaQueries.length > 0) {
      metaQueries.forEach((metaQuery, index) => {
        queryParams.append(`meta_query[${index}][key]`, metaQuery.key);
        queryParams.append(`meta_query[${index}][value]`, Array.isArray(metaQuery.value) ? metaQuery.value.join(',') : metaQuery.value);
        queryParams.append(`meta_query[${index}][compare]`, metaQuery.compare);
        if (metaQuery.type) {
          queryParams.append(`meta_query[${index}][type]`, metaQuery.type);
        }
      });

      if (metaQueries.length > 1) {
        queryParams.append('meta_query[relation]', 'AND');
      }
    }

    const response = await httpGet(`${endpoints.courses}?${queryParams}`);
    const courses = await response.json();
    
    // Extract pagination info from headers
    const pagination = extractPaginationFromHeaders(response, page, perPage);

    // Sanitize course data for consistent structure
    const sanitizedCourses = courses.map(sanitizeCourseData);

    return {
      data: sanitizedCourses,
      pagination: {
        ...pagination,
        hasMore: pagination.currentPage < pagination.totalPages && courses.length > 0
      },
      searchCriteria: searchOptions,
      appliedFilters: {
        hasQuery: !!query.trim(),
        hasCategory: !!category,
        hasDifficulty: !!difficulty,
        hasPriceRange: minPrice !== null || maxPrice !== null,
        hasDateRange: !!dateFrom || !!dateTo
      }
    };

  } catch (error) {
    console.error('❌ Error performing advanced course search:', error);
    throw error;
  }
};

/**
 * Simple course search (text-based)
 * @param {string} searchQuery - Search query string
 * @param {Object} options - Search options
 * @param {number} options.page - Page number
 * @param {number} options.perPage - Items per page
 * @param {string} options.status - Status filter
 * @returns {Promise<Object>} Search results
 */
export const searchCourses = async (searchQuery, options = {}) => {
  try {
    if (!searchQuery || typeof searchQuery !== 'string') {
      throw new Error('Search query is required and must be a string');
    }

    const {
      page = DEFAULT_PAGINATION.page,
      perPage = DEFAULT_PAGINATION.perPage,
      status = 'publish,draft'
    } = options;

    return await getCourses({
      page,
      perPage,
      status,
      search: searchQuery.trim()
    });

  } catch (error) {
    console.error(`❌ Error searching courses for "${searchQuery}":`, error);
    throw error;
  }
};

/**
 * Search courses by title only
 * @param {string} titleQuery - Title search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
export const searchCoursesByTitle = async (titleQuery, options = {}) => {
  try {
    if (!titleQuery || typeof titleQuery !== 'string') {
      throw new Error('Title query is required and must be a string');
    }

    // Use the regular search as WordPress search includes title by default
    return await searchCourses(titleQuery, options);

  } catch (error) {
    console.error(`❌ Error searching courses by title "${titleQuery}":`, error);
    throw error;
  }
};

/**
 * Search courses by price range
 * @param {number} minPrice - Minimum price
 * @param {number} maxPrice - Maximum price
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
export const searchCoursesByPriceRange = async (minPrice, maxPrice, options = {}) => {
  try {
    if (minPrice !== null && (isNaN(minPrice) || minPrice < 0)) {
      throw new Error('Minimum price must be a valid non-negative number');
    }

    if (maxPrice !== null && (isNaN(maxPrice) || maxPrice < 0)) {
      throw new Error('Maximum price must be a valid non-negative number');
    }

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      throw new Error('Minimum price cannot be greater than maximum price');
    }

    return await advancedCourseSearch({
      minPrice,
      maxPrice,
      ...options
    }, {
      page: options.page,
      perPage: options.perPage
    });

  } catch (error) {
    console.error(`❌ Error searching courses by price range ${minPrice}-${maxPrice}:`, error);
    throw error;
  }
};

/**
 * Search courses by difficulty level
 * @param {string} difficultyLevel - Difficulty level to search for
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
export const searchCoursesByDifficulty = async (difficultyLevel, options = {}) => {
  try {
    if (!difficultyLevel || !VALID_DIFFICULTY_LEVELS.includes(difficultyLevel)) {
      throw new Error(`Invalid difficulty level. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`);
    }

    return await advancedCourseSearch({
      difficulty: difficultyLevel,
      ...options
    }, {
      page: options.page,
      perPage: options.perPage
    });

  } catch (error) {
    console.error(`❌ Error searching courses by difficulty "${difficultyLevel}":`, error);
    throw error;
  }
};

/**
 * Search courses by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
export const searchCoursesByDateRange = async (startDate, endDate, options = {}) => {
  try {
    // Validate dates
    if (startDate && isNaN(Date.parse(startDate))) {
      throw new Error('Start date must be a valid date in YYYY-MM-DD format');
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      throw new Error('End date must be a valid date in YYYY-MM-DD format');
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date cannot be after end date');
    }

    return await advancedCourseSearch({
      dateFrom: startDate,
      dateTo: endDate,
      ...options
    }, {
      page: options.page,
      perPage: options.perPage
    });

  } catch (error) {
    console.error(`❌ Error searching courses by date range ${startDate}-${endDate}:`, error);
    throw error;
  }
};

/**
 * Get search suggestions based on partial query
 * @param {string} partialQuery - Partial search query
 * @param {number} limit - Maximum number of suggestions
 * @returns {Promise<Array>} Array of search suggestions
 */
export const getSearchSuggestions = async (partialQuery, limit = 5) => {
  try {
    if (!partialQuery || typeof partialQuery !== 'string' || partialQuery.trim().length < 2) {
      return [];
    }

    // Search for courses that match the partial query
    const searchResult = await searchCourses(partialQuery.trim(), {
      perPage: limit * 2, // Get more results to extract suggestions
      status: 'publish' // Only published courses for suggestions
    });

    // Extract unique title suggestions
    const suggestions = searchResult.data
      .map(course => course.title?.rendered || course.title)
      .filter(title => title && title.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, limit);

    return [...new Set(suggestions)]; // Remove duplicates

  } catch (error) {
    console.error(`❌ Error getting search suggestions for "${partialQuery}":`, error);
    return [];
  }
};

/**
 * Get popular search terms (mock implementation - would need real analytics)
 * @param {number} limit - Maximum number of terms to return
 * @returns {Promise<Array>} Array of popular search terms
 */
export const getPopularSearchTerms = async (limit = 10) => {
  try {
    // This is a mock implementation
    // In a real scenario, you'd track search analytics
    const mockPopularTerms = [
      'JavaScript',
      'React',
      'Python',
      'Web Development',
      'Data Science',
      'Machine Learning',
      'CSS',
      'Node.js',
      'Database',
      'API Development'
    ];

    return mockPopularTerms.slice(0, limit);

  } catch (error) {
    console.error('❌ Error getting popular search terms:', error);
    return [];
  }
};

/**
 * Get search statistics
 * @returns {Promise<Object>} Search statistics object
 */
export const getSearchStatistics = async () => {
  try {
    // Get total courses
    const allCoursesResult = await getCourses({ perPage: 1 });
    const totalCourses = allCoursesResult.pagination.total;

    // Get published courses
    const publishedCoursesResult = await getCourses({ 
      perPage: 1, 
      status: 'publish' 
    });
    const publishedCourses = publishedCoursesResult.pagination.total;

    // Get draft courses
    const draftCoursesResult = await getCourses({ 
      perPage: 1, 
      status: 'draft' 
    });
    const draftCourses = draftCoursesResult.pagination.total;

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      searchableContent: publishedCourses,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error getting search statistics:', error);
    return {
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      searchableContent: 0,
      lastUpdated: new Date().toISOString()
    };
  }
};