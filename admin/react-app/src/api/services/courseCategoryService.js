/**
 * Course category service
 * Handles category-related operations for courses
 */

import { getApiConfig, DEFAULT_PAGINATION } from '../config/apiConfig.js';
import { httpGet, extractPaginationFromHeaders } from '../utils/httpUtils.js';
import { buildCategoryCourseQueryParams, sanitizeCourseData } from '../utils/courseDataUtils.js';
import { getCourses } from './courseService.js';

/**
 * Get courses by category with pagination
 * @param {string} categoryName - Category name to filter by
 * @param {Object} options - Pagination and filter options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.perPage - Items per page (default: 20)
 * @returns {Promise<Object>} Promise that resolves with courses and pagination info
 */
export const getCoursesByCategory = async (categoryName, options = {}) => {
  try {
    if (!categoryName || typeof categoryName !== 'string') {
      throw new Error('Category name is required and must be a string');
    }

    const { 
      page = DEFAULT_PAGINATION.page, 
      perPage = DEFAULT_PAGINATION.perPage 
    } = options;

    const { endpoints } = getApiConfig();
    const queryParams = buildCategoryCourseQueryParams(categoryName, {
      page,
      perPage
    });

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
      category: categoryName
    };

  } catch (error) {
    console.error(`Error fetching courses for category "${categoryName}":`, error);
    throw error;
  }
};

/**
 * Get all available course categories with course counts
 * @param {Object} options - Options for category retrieval
 * @param {boolean} options.includeEmpty - Include categories with no courses
 * @returns {Promise<Array>} Array of category objects with counts
 */
export const getCourseCategories = async (options = {}) => {
  try {
    const { includeEmpty = false } = options;
    
    // Get all courses to extract categories
    const allCoursesResult = await getCourses({
      page: 1,
      perPage: 100, // Get a large number to capture most categories
      status: 'publish,draft'
    });

    const categoryMap = new Map();

    // Process all courses to count categories
    for (const course of allCoursesResult.data) {
      const category = course.meta?._course_category || 'Uncategorized';
      
      if (categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.get(category) + 1);
      } else {
        categoryMap.set(category, 1);
      }
    }

    // If we need to get more courses (pagination), continue fetching
    let currentPage = 1;
    while (allCoursesResult.pagination.hasMore && currentPage < allCoursesResult.pagination.totalPages) {
      currentPage++;
      const nextPageResult = await getCourses({
        page: currentPage,
        perPage: 100,
        status: 'publish,draft'
      });

      for (const course of nextPageResult.data) {
        const category = course.meta?._course_category || 'Uncategorized';
        
        if (categoryMap.has(category)) {
          categoryMap.set(category, categoryMap.get(category) + 1);
        } else {
          categoryMap.set(category, 1);
        }
      }
    }

    // Convert map to array and sort
    let categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      count,
      slug: name.toLowerCase().replace(/\s+/g, '-')
    }));

    // Filter empty categories if requested
    if (!includeEmpty) {
      categories = categories.filter(category => category.count > 0);
    }

    // Sort by name
    categories.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Found ${categories.length} course categories`);
    return categories;

  } catch (error) {
    console.error('❌ Error fetching course categories:', error);
    throw error;
  }
};

/**
 * Create or ensure a course category exists
 * Since WordPress handles categories automatically, this is more of a validation function
 * @param {string} categoryName - Category name to create/validate
 * @param {Object} options - Category options
 * @returns {Promise<Object>} Category object
 */
export const createCourseCategory = async (categoryName, options = {}) => {
  try {
    if (!categoryName || typeof categoryName !== 'string') {
      throw new Error('Category name is required and must be a string');
    }

    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) {
      throw new Error('Category name cannot be empty');
    }

    // Check if category already exists
    const existingCategory = await categoryExists(trimmedName);
    
    if (existingCategory.exists) {
      console.log(`✅ Category "${trimmedName}" already exists with ${existingCategory.courseCount} courses`);
      return {
        id: trimmedName.toLowerCase().replace(/\s+/g, '-'),
        name: trimmedName,
        count: existingCategory.courseCount,
        slug: trimmedName.toLowerCase().replace(/\s+/g, '-'),
        isNew: false
      };
    }

    // Since WordPress creates categories automatically when used,
    // we'll return a new category object that will be created when first used
    console.log(`✅ Category "${trimmedName}" prepared for creation`);
    return {
      id: trimmedName.toLowerCase().replace(/\s+/g, '-'),
      name: trimmedName,
      count: 0,
      slug: trimmedName.toLowerCase().replace(/\s+/g, '-'),
      isNew: true,
      description: options.description || ''
    };

  } catch (error) {
    console.error(`❌ Error creating/validating category "${categoryName}":`, error);
    throw error;
  }
};

/**
 * Get courses count for a specific category
 * @param {string} categoryName - Category name to count
 * @param {Object} options - Additional options
 * @param {string} options.status - Status filter for counting
 * @returns {Promise<number>} Number of courses in the category
 */
export const getCategoryCourseCount = async (categoryName, options = {}) => {
  try {
    if (!categoryName || typeof categoryName !== 'string') {
      throw new Error('Category name is required and must be a string');
    }

    const { status = 'publish,draft' } = options;

    const result = await getCoursesByCategory(categoryName, {
      page: 1,
      perPage: 1 // We only need the pagination info
    });

    return result.pagination.total;

  } catch (error) {
    console.error(`Error getting course count for category "${categoryName}":`, error);
    return 0;
  }
};

/**
 * Get popular categories (top N categories by course count)
 * @param {number} limit - Maximum number of categories to return
 * @param {Object} options - Additional options
 * @param {boolean} options.includeEmpty - Include categories with no courses
 * @returns {Promise<Array>} Array of popular categories
 */
export const getPopularCategories = async (limit = 10, options = {}) => {
  try {
    const categories = await getCourseCategories(options);
    
    // Sort by course count (descending) and take the top N
    return categories
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

  } catch (error) {
    console.error('Error fetching popular categories:', error);
    throw error;
  }
};

/**
 * Search categories by name
 * @param {string} searchTerm - Term to search for in category names
 * @param {Object} options - Search options
 * @param {boolean} options.exactMatch - Whether to perform exact match
 * @param {boolean} options.caseSensitive - Whether search is case sensitive
 * @returns {Promise<Array>} Array of matching categories
 */
export const searchCategories = async (searchTerm, options = {}) => {
  try {
    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new Error('Search term is required and must be a string');
    }

    const { exactMatch = false, caseSensitive = false } = options;
    const categories = await getCourseCategories({ includeEmpty: true });

    const normalizedSearchTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    return categories.filter(category => {
      const categoryName = caseSensitive ? category.name : category.name.toLowerCase();
      
      if (exactMatch) {
        return categoryName === normalizedSearchTerm;
      } else {
        return categoryName.includes(normalizedSearchTerm);
      }
    });

  } catch (error) {
    console.error(`Error searching categories for "${searchTerm}":`, error);
    throw error;
  }
};

/**
 * Get category statistics
 * @returns {Promise<Object>} Category statistics object
 */
export const getCategoryStatistics = async () => {
  try {
    const categories = await getCourseCategories({ includeEmpty: true });
    const totalCourses = categories.reduce((sum, category) => sum + category.count, 0);
    const categoriesWithCourses = categories.filter(category => category.count > 0);

    return {
      totalCategories: categories.length,
      categoriesWithCourses: categoriesWithCourses.length,
      emptyCategoriesCount: categories.length - categoriesWithCourses.length,
      totalCourses,
      averageCoursesPerCategory: categoriesWithCourses.length > 0 
        ? Math.round(totalCourses / categoriesWithCourses.length * 100) / 100 
        : 0,
      mostPopularCategory: categoriesWithCourses.length > 0 
        ? categoriesWithCourses.reduce((max, category) => 
            category.count > max.count ? category : max
          )
        : null,
      leastPopularCategory: categoriesWithCourses.length > 0 
        ? categoriesWithCourses.reduce((min, category) => 
            category.count < min.count ? category : min
          )
        : null
    };

  } catch (error) {
    console.error('Error getting category statistics:', error);
    throw error;
  }
};

/**
 * Check if a category exists and has courses
 * @param {string} categoryName - Category name to check
 * @returns {Promise<Object>} Object with existence and course count info
 */
export const categoryExists = async (categoryName) => {
  try {
    if (!categoryName || typeof categoryName !== 'string') {
      return { exists: false, courseCount: 0 };
    }

    const courseCount = await getCategoryCourseCount(categoryName);
    
    return {
      exists: courseCount > 0,
      courseCount
    };

  } catch (error) {
    console.error(`Error checking if category "${categoryName}" exists:`, error);
    return { exists: false, courseCount: 0 };
  }
};

/**
 * Get courses from multiple categories
 * @param {Array<string>} categoryNames - Array of category names
 * @param {Object} options - Pagination and filter options
 * @returns {Promise<Object>} Combined results from all categories
 */
export const getCoursesFromMultipleCategories = async (categoryNames, options = {}) => {
  try {
    if (!Array.isArray(categoryNames) || categoryNames.length === 0) {
      throw new Error('Category names must be a non-empty array');
    }

    const results = await Promise.all(
      categoryNames.map(categoryName => 
        getCoursesByCategory(categoryName, options).catch(error => {
          console.warn(`Failed to fetch courses for category "${categoryName}":`, error);
          return { data: [], pagination: { total: 0 } };
        })
      )
    );

    // Combine all courses and remove duplicates
    const allCourses = [];
    const seenIds = new Set();
    let totalCourses = 0;

    for (const result of results) {
      totalCourses += result.pagination?.total || 0;
      
      for (const course of result.data || []) {
        if (!seenIds.has(course.id)) {
          seenIds.add(course.id);
          allCourses.push(course);
        }
      }
    }

    return {
      data: allCourses,
      pagination: {
        total: totalCourses,
        totalPages: Math.ceil(allCourses.length / (options.perPage || DEFAULT_PAGINATION.perPage)),
        currentPage: options.page || DEFAULT_PAGINATION.page,
        perPage: options.perPage || DEFAULT_PAGINATION.perPage,
        hasMore: false // This would need more complex logic for true pagination
      },
      categories: categoryNames
    };

  } catch (error) {
    console.error('Error fetching courses from multiple categories:', error);
    throw error;
  }
};