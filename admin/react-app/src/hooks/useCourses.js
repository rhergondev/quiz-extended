/**
 * useCourses - Course Management Hook (Refactored)
 * 
 * Uses useResource for base functionality
 * Extended with course-specific features
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 2.0.0
 */

import { useMemo } from 'react';
import { useResource } from './useResource';
import * as courseService from '../api/services/courseService';

/**
 * Course management hook
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.search - Search term
 * @param {string} options.category - Category filter
 * @param {string} options.difficulty - Difficulty filter
 * @param {string} options.status - Status filter
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {number} options.perPage - Items per page (default: 20)
 * @returns {Object} Course state and methods
 */
export const useCourses = (options = {}) => {
  const {
    search = '',
    category = null,
    difficulty = null,
    status = null,
    autoFetch = true,
    perPage = 20
  } = options;

  // ============================================================
  // DATA PROCESSOR
  // ============================================================
  
  /**
   * Process/enhance course data with computed values
   */
  const dataProcessor = useMemo(() => (course) => {
    return {
      ...course,
      // Enhanced computed values
      lesson_count: course.meta?._lesson_count || 0,
      student_count: course.meta?._student_count || 0,
      enrolled_users_count: course.meta?.enrolled_users_count || 0,
      price: parseFloat(course.meta?._course_price || 0),
      sale_price: parseFloat(course.meta?._sale_price || 0),
      difficulty: course.meta?._course_difficulty || 'intermediate',
      category: course.meta?._course_category || 'general',
      completion_rate: parseInt(course.meta?._completion_rate || '0'),
      duration_hours: parseInt(course.meta?._course_duration || '0'),
      featured: course.meta?._featured === 'yes',
      // Computed flags
      on_sale: course.meta?._sale_price && 
               parseFloat(course.meta._sale_price) < parseFloat(course.meta._course_price || 0),
      has_lessons: (course.meta?._lesson_count || 0) > 0,
      has_students: (course.meta?._student_count || 0) > 0
    };
  }, []);

  // ============================================================
  // COMPUTED VALUES CALCULATOR
  // ============================================================
  
  /**
   * Calculate course-specific computed values
   */
  const computedValuesCalculator = useMemo(() => (courses) => {
    const total = courses.length;
    
    if (total === 0) {
      return {
        total: 0,
        published: 0,
        draft: 0,
        private: 0,
        totalStudents: 0,
        totalLessons: 0,
        averagePrice: 0,
        averageDuration: 0,
        averageCompletionRate: 0,
        byCategory: {},
        byDifficulty: {},
        featuredCount: 0,
        onSaleCount: 0
      };
    }

    // Aggregate values
    let totalStudents = 0;
    let totalLessons = 0;
    let totalPrice = 0;
    let totalDuration = 0;
    let totalCompletionRate = 0;
    let priceCount = 0;
    const byCategory = {};
    const byDifficulty = {};
    let featuredCount = 0;
    let onSaleCount = 0;

    courses.forEach(course => {
      // Students and lessons
      totalStudents += course.student_count || 0;
      totalLessons += course.lesson_count || 0;
      
      // Price (only count non-zero prices)
      const price = course.price || 0;
      if (price > 0) {
        totalPrice += price;
        priceCount++;
      }
      
      // Duration
      totalDuration += course.duration_hours || 0;
      
      // Completion rate
      totalCompletionRate += course.completion_rate || 0;
      
      // Category counts
      const cat = course.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      
      // Difficulty counts
      const diff = course.difficulty || 'intermediate';
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
      
      // Featured
      if (course.featured) featuredCount++;
      
      // On sale
      if (course.on_sale) onSaleCount++;
    });

    return {
      total,
      published: courses.filter(c => c.status === 'publish').length,
      draft: courses.filter(c => c.status === 'draft').length,
      private: courses.filter(c => c.status === 'private').length,
      totalStudents,
      totalLessons,
      averagePrice: priceCount > 0 ? Math.round(totalPrice / priceCount) : 0,
      averageDuration: total > 0 ? Math.round(totalDuration / total) : 0,
      averageCompletionRate: total > 0 ? Math.round(totalCompletionRate / total) : 0,
      byCategory,
      byDifficulty,
      featuredCount,
      onSaleCount
    };
  }, []);

  // ============================================================
  // USE BASE RESOURCE HOOK
  // ============================================================
  
  const {
    items: courses,
    loading,
    creating,
    updating,
    deleting,
    error,
    pagination,
    computed,
    filters,
    updateFilter,
    resetFilters,
    setFilters,
    fetchItems: fetchCourses,
    loadMore: loadMoreCourses,
    createItem: createCourse,
    updateItem: updateCourse,
    deleteItem: deleteCourse,
    duplicateItem: duplicateCourse,
    refresh,
    hasMore
  } = useResource({
    service: courseService,
    resourceName: 'course',
    initialFilters: {
      search,
      category,
      difficulty,
      status: status || 'publish,draft,private'
    },
    debounceMs: 500,
    autoFetch,
    perPage,
    dataProcessor,
    computedValuesCalculator
  });

  // ============================================================
  // COURSE-SPECIFIC METHODS
  // ============================================================
  
  /**
   * Publish course (set status to 'publish')
   */
  const publishCourse = async (courseId) => {
    return updateCourse(courseId, { status: 'publish' });
  };

  /**
   * Unpublish course (set status to 'draft')
   */
  const unpublishCourse = async (courseId) => {
    return updateCourse(courseId, { status: 'draft' });
  };

  /**
   * Toggle course featured status
   */
  const toggleFeatured = async (courseId, featured) => {
    return updateCourse(courseId, { featured });
  };

  /**
   * Update course price
   */
  const updatePrice = async (courseId, price, salePrice = null) => {
    return updateCourse(courseId, { 
      price, 
      ...(salePrice !== null && { salePrice }) 
    });
  };

  // ============================================================
  // RETURN
  // ============================================================
  
  return {
    // Data
    courses,
    loading,
    creating,
    updating,
    deleting,
    error,
    pagination,
    computed,

    // Filters
    filters,
    updateFilter,
    resetFilters,
    setFilters,

    // Actions
    fetchCourses,
    loadMoreCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    duplicateCourse,
    refresh,

    // Course-specific actions
    publishCourse,
    unpublishCourse,
    toggleFeatured,
    updatePrice,

    // Helpers
    hasMore
  };
};

export default useCourses;