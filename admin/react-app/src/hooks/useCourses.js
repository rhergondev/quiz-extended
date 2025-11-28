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
 * @param {boolean} options.enrolledOnly - Filter to show only enrolled courses
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {number} options.perPage - Items per page (default: 100 - optimized for admin listings)
 * @param {boolean} options.embed - Include embedded data (author, media) (default: false - optimized)
 * @param {Array} options.fields - Specific fields to return (reduces data transfer)
 * @returns {Object} Course state and methods
 */
export const useCourses = (options = {}) => {
  const {
    search = '',
    category = null,
    difficulty = null,
    status = null,
    enrolledOnly = false,
    autoFetch = true,
    perPage = 100, // 🎯 OPTIMIZED: Increased default to reduce pagination requests
    embed = false, // 🎯 OPTIMIZED: Disabled by default to reduce data transfer
    fields = null // 🔥 NEW: Allow specifying specific fields
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
      lesson_count: course.meta?._lesson_count || course.lessons_count || 0,
      // 🔧 FIX: Use enrolled_users_count from REST field (not meta._student_count)
      student_count: course.enrolled_users_count || course.meta?._student_count || 0,
      enrolled_users_count: course.enrolled_users_count || course.meta?.enrolled_users_count || 0,
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
      has_lessons: (course.meta?._lesson_count || course.lessons_count || 0) > 0,
      has_students: (course.enrolled_users_count || course.meta?._student_count || 0) > 0
    };
  }, []);

  // ============================================================
  // COMPUTED VALUES CALCULATOR
  // ============================================================
  
  /**
 * Calculate computed statistics from courses data
 */
const computedValuesCalculator = useMemo(() => (courses) => {
  if (!Array.isArray(courses) || courses.length === 0) {
    return {
      totalCourses: 0,
      publishedCourses: 0,
      draftCourses: 0,
      privateCourses: 0,
      totalStudents: 0,
      totalLessons: 0,
      totalPrice: 0,
      averagePrice: 0,
      totalRevenue: 0,
      averageDuration: 0,
      averageCompletionRate: 0,
      featuredCount: 0,
      onSaleCount: 0,
      freeCoursesCount: 0,
      paidCoursesCount: 0,
      byCategory: {},
      byDifficulty: {},
    };
  }

  const total = courses.length;
  let publishedCount = 0;
  let draftCount = 0;
  let privateCount = 0;
  let totalStudents = 0;
  let totalLessons = 0;
  let totalPrice = 0;
  let priceCount = 0;
  let totalRevenue = 0;
  let totalDuration = 0;
  let totalCompletionRate = 0;
  let featuredCount = 0;
  let onSaleCount = 0;
  let freeCoursesCount = 0;
  let paidCoursesCount = 0;
  
  const byCategory = {};
  const byDifficulty = {};

  courses.forEach(course => {
    const meta = course.meta || {};
    const status = course.status || 'draft';
    const price = parseFloat(meta._price || 0);
    const salePrice = parseFloat(meta._sale_price || 0);
    // 🔧 FIX: Prioritize enrolled_users_count from REST field
    const students = parseInt(course.enrolled_users_count || meta._student_count || 0);
    const lessons = parseInt(meta._lesson_count || course.lessons_count || 0);
    const duration = parseInt(meta._course_duration || 0);
    const completionRate = parseFloat(meta._completion_rate || 0);
    const featured = meta._featured === 'yes' || meta._featured === true;
    const productType = meta._product_type || 'free';
    
    // Status counts
    if (status === 'publish') publishedCount++;
    if (status === 'draft') draftCount++;
    if (status === 'private') privateCount++;
    
    // Student and lesson totals
    totalStudents += students;
    totalLessons += lessons;
    
    // Price calculations
    if (productType === 'paid' && price > 0) {
      totalPrice += price;
      priceCount++;
      paidCoursesCount++;
      
      // Revenue calculation: usar el precio efectivo (sale o normal)
      const effectivePrice = (salePrice > 0 && salePrice < price) ? salePrice : price;
      totalRevenue += effectivePrice * students;
      
      // Check if on sale
      if (salePrice > 0 && salePrice < price) {
        onSaleCount++;
      }
    } else if (productType === 'free' || price === 0) {  // CORRECCIÓN: condición más explícita
      freeCoursesCount++;
    }

    
    // Duration and completion
    if (duration > 0) totalDuration += duration;
    if (completionRate > 0) totalCompletionRate += completionRate;
    
    // Featured count
    if (featured) featuredCount++;
    
    // Category breakdown
    const categories = course.qe_category || [];
    if (Array.isArray(categories) && categories.length > 0) {
      categories.forEach(catId => {
        const catName = course._embedded?.['wp:term']?.[0]?.find(t => t.id === catId)?.name || 'Uncategorized';
        byCategory[catName] = (byCategory[catName] || 0) + 1;
      });
    } else {
      byCategory['Uncategorized'] = (byCategory['Uncategorized'] || 0) + 1;
    }
    
    // Difficulty breakdown
    const difficulty = meta._course_difficulty || meta._difficulty || 'intermediate';
    byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;
  });

  return {
    totalCourses: total,
    publishedCourses: publishedCount,
    draftCourses: draftCount,
    privateCourses: privateCount,
    totalStudents,
    totalLessons,
    totalPrice,
    averagePrice: priceCount > 0 ? Math.round((totalPrice / priceCount) * 100) / 100 : 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageDuration: total > 0 ? Math.round(totalDuration / total) : 0,
    averageCompletionRate: total > 0 ? Math.round(totalCompletionRate / total) : 0,
    featuredCount,
    onSaleCount,
    freeCoursesCount,
    paidCoursesCount,
    byCategory,
    byDifficulty,
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
      status: status || 'publish', // 🎯 Por defecto solo cursos publicados (seguros para frontend)
      enrolledOnly, // 🎯 NEW: Filtro de enrollment
      embed, // 🎯 OPTIMIZED: Control de embedded data
      fields // 🔥 NEW: Pass fields parameter
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