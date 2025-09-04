/**
 * Main API entry point
 * Exports all API functions to maintain backward compatibility
 */

// Core Course Operations
export {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  duplicateCourse,
  getCoursesCount,
  courseExists
} from './services/courseService.js';

// Batch Actions
export {
  batchDeleteCourses,
  batchUpdateStatus,
  batchUpdateCategory,
  executeBatchOperations
} from './services/batchActionsService.js';

// Category Operations
export {
  getCoursesByCategory,
  getCourseCategories,
  getCategoryCourseCount,
  getPopularCategories,
  searchCategories,
  getCategoryStatistics,
  categoryExists,
  getCoursesFromMultipleCategories,
  createCourseCategory
} from './services/courseCategoryService.js';

// Search Operations
export {
  advancedCourseSearch,
  searchCourses,
  searchCoursesByTitle,
  searchCoursesByPriceRange,
  searchCoursesByDifficulty,
  searchCoursesByDateRange,
  getSearchSuggestions,
  getPopularSearchTerms,
  getSearchStatistics
} from './services/courseSearchService.js';

// COMPATIBILITY ALIASES (for backward compatibility)
export { getCategoryStatistics as getCategoryStats } from './services/courseCategoryService.js';

// Configuration and utilities (for advanced users)
export { getApiConfig, DEFAULT_PAGINATION } from './config/apiConfig.js';
export { BATCH_CONFIG } from './utils/batchUtils.js';
export { 
  VALID_COURSE_STATUSES, 
  VALID_DIFFICULTY_LEVELS,
  validateCourseData,
  transformCourseDataForApi
} from './utils/courseDataUtils.js';

// HTTP utilities (for advanced users who need direct HTTP access)
export {
  httpGet,
  httpPost,
  httpPut,
  httpDelete
} from './utils/httpUtils.js';