/**
 * Main API Entry Point - CONSOLIDATED
 * * Exports all API functions with backward compatibility
 * Now using baseService foundation
 * * @package QuizExtended
 * @subpackage API
 * @version 2.0.0
 */

// ============================================================
// CORE SERVICES
// ============================================================

// Course Operations
export {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  duplicateCourse,
  getCoursesCount,
  courseExists,
  getEnrolledUsersCount,
  updateCourseStatus,
  publishCourse,
  unpublishCourse,
  toggleCourseFeatured,
  searchCoursesByTitle,
  getCoursesByCategory,
  getCoursesByDifficulty,
  getFeaturedCourses,
  getPublishedCourses
} from './services/courseService.js';

// Lesson Operations
export {
  getLessons,
  getLessonsByCourse,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  duplicateLesson,
  getLessonsCount,
  lessonExists,
  updateLessonStatus,
  publishLesson,
  unpublishLesson,
  updateLessonOrder,
  moveLessonToCourse,
  getLessonsByType,
  getPublishedLessons,
  getLessonStatistics
} from './services/lessonService.js';

// Quiz Operations
export {
  getQuizzes,
  getQuizzesByCourse,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  duplicateQuiz,
  getQuizStatistics,
  addQuestionToQuiz,
  removeQuestionFromQuiz,
  updateQuizQuestionOrder
} from './services/quizService.js';

// Question Operations
export {
  getQuestions,
  getQuestionsByQuiz,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  duplicateQuestion,
  getQuestionsCount,
  questionExists,
  updateQuestionStatus,
  updateQuestionOrder,
  getQuestionsByType,
  getQuestionsByDifficulty,
  getQuestionsByCategory,
  getQuestionsByProvider,
  getPublishedQuestions as getPublishedQuestions_,
  getQuestionStatistics,
  bulkCreateQuestions
} from './services/questionService.js';

// Ranking Operations
export { getQuizRanking } from './services/rankingService.js';

// User Enrollment Operations
export {
  getUserEnrollments,
  enrollUserInCourse,
  unenrollUserFromCourse,
  isUserEnrolled,
  batchEnrollUsers,
  enrollUserInMultipleCourses,
  getUserEnrollmentStats
} from './services/userEnrollmentService.js';

// ============================================================
// BATCH OPERATIONS
// ============================================================

// Course Batch Actions
export {
  batchDeleteCourses,
  batchUpdateStatus,
  batchUpdateCategory,
  executeBatchOperations
} from './services/batchActionsService.js';

// Lesson Batch Actions
export {
  batchDeleteLessons,
  batchUpdateLessonStatus,
  batchMoveLessonsToCourse,
  batchUpdateLessonType,
  batchDuplicateLessons,
  batchUpdateLessonContentType,
  executeBatchLessonOperations
} from './services/lessonBatchActionsService.js';

// ============================================================
// SPECIALIZED SERVICES
// ============================================================

// Category Operations
export {
  getCoursesByCategory as getCoursesByCategoryDetailed,
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
  searchCoursesByTitle as searchCoursesByTitleAdvanced,
  searchCoursesByPriceRange,
  searchCoursesByDifficulty as searchCoursesByDifficultyAdvanced,
  searchCoursesByDateRange,
  getSearchSuggestions,
  getPopularSearchTerms,
  getSearchStatistics
} from './services/courseSearchService.js';

// ============================================================
// COMPATIBILITY ALIASES
// ============================================================

// Backward compatibility for renamed functions
export { getCategoryStatistics as getCategoryStats } from './services/courseCategoryService.js';

// ============================================================
// CONFIGURATION & UTILITIES
// ============================================================

// Base Service (for advanced users creating custom services)
export { createResourceService, makeApiRequest } from './services/baseService.js';

// API Configuration
export { getApiConfig, DEFAULT_PAGINATION } from './config/apiConfig.js';

// Error Handling
export {
  ErrorType,
  createErrorObject,
  logError,
  handleApiError,
  safeAsync,
  createValidationError,
  isErrorType,
  setupGlobalErrorHandler
} from './utils/errorHandler.js';

// Batch Utilities
export { BATCH_CONFIG } from './utils/batchUtils.js';

// Data Utilities - Course
export { 
  VALID_COURSE_STATUSES, 
  VALID_DIFFICULTY_LEVELS,
  validateCourseData,
  transformCourseDataForApi,
  sanitizeCourseData
} from './utils/courseDataUtils.js';

// Data Utilities - Lesson
export {
  VALID_LESSON_STATUSES,
  VALID_LESSON_TYPES,
  VALID_CONTENT_TYPES,
  VALID_COMPLETION_CRITERIA,
  validateLessonData,
  transformLessonDataForApi,
  sanitizeLessonData
} from './utils/lessonDataUtils.js';

// HTTP Utilities
export {
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  extractPaginationFromHeaders
} from './utils/httpUtils.js';

// Debounce Utilities
export {
  useDebouncedCallback,
  useRequestDeduplicator,
  useSearchInput,
  useFilterDebounce,
  RequestDeduplicator
} from './utils/debounceUtils.js';