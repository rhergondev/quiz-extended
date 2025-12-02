/**
 * useLessons - Lesson Management Hook (Refactored)
 * 
 * Uses useResource for base functionality when fetching all lessons
 * Uses dedicated course lessons endpoint when filtering by courseId
 * Extended with lesson-specific features
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 2.1.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useResource } from './useResource';
import * as lessonService from '../api/services/lessonService';
import { getCourseLessons } from '../api/services/courseLessonService';

/**
 * Lesson management hook
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.search - Search term
 * @param {number} options.courseId - Course ID filter (uses optimized endpoint if provided)
 * @param {string} options.lessonType - Lesson type filter
 * @param {string} options.status - Status filter
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {number} options.perPage - Items per page (default: 20)
 * @returns {Object} Lesson state and methods
 */
export const useLessons = (options = {}) => {
  const {
    search = '',
    courseId = null,
    lessonType = null,
    status = null,
    autoFetch = true,
    perPage = 20
  } = options;

  // State for course-specific lessons (when courseId is provided)
  const [courseLessons, setCourseLessons] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState(null);
  const [coursePagination, setCoursePagination] = useState(null);

  // Determine if we should use the course-specific endpoint
  const useCourseEndpoint = Boolean(courseId);

  // ============================================================
  // COURSE-SPECIFIC LESSON FETCHING
  // ============================================================

  const fetchCourseLessons = useCallback(async () => {
    if (!courseId) return;

    setCourseLoading(true);
    setCourseError(null);
    
    try {
      console.log(`📚 useLessons: Fetching lessons for course ${courseId} using optimized endpoint`);
      const result = await getCourseLessons(parseInt(courseId, 10), {
        perPage: perPage,
        status: status || 'publish,draft,private'
      });
      
      console.log(`✅ useLessons: Received ${result.data?.length || 0} lessons in correct order`);
      setCourseLessons(result.data || []);
      setCoursePagination(result.pagination);
    } catch (error) {
      console.error(`❌ useLessons: Error fetching course lessons:`, error);
      setCourseError(error);
      setCourseLessons([]);
    } finally {
      setCourseLoading(false);
    }
  }, [courseId, perPage, status]);

  // Auto-fetch course lessons when courseId changes
  useEffect(() => {
    if (useCourseEndpoint && autoFetch) {
      fetchCourseLessons();
    }
  }, [useCourseEndpoint, autoFetch, fetchCourseLessons]);

  // ============================================================
  // DATA PROCESSOR (for generic lesson fetching)
  // ============================================================
  
  /**
   * Process/enhance lesson data with computed values
   */
  const dataProcessor = useMemo(() => (lesson) => {
    // Parse start_date and determine visibility
    const startDateRaw = lesson.meta?._start_date || '';
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const now = new Date();
    
    // Lesson is available if:
    // 1. No start date is set (empty string or null) - always visible
    // 2. Start date has passed (startDate <= now)
    const isAvailable = !startDate || startDate <= now;
    
    return {
      ...lesson,
      // Enhanced computed values
      course_id: lesson.meta?._course_id || null,
      lesson_order: parseInt(lesson.meta?._lesson_order || '0'),
      lesson_type: lesson.meta?._lesson_type || 'mixed',
      description: lesson.meta?._lesson_description || '',
      steps: lesson.meta?._lesson_steps || [],
      steps_count: Array.isArray(lesson.meta?._lesson_steps) 
        ? lesson.meta._lesson_steps.length 
        : 0,
      prerequisite_lessons: lesson.meta?._prerequisite_lessons || [],
      completion_criteria: lesson.meta?._completion_criteria || 'view',
      is_required: lesson.meta?._is_required === 'yes',
      duration_minutes: parseInt(lesson.meta?._duration_minutes || '0'),
      video_url: lesson.meta?._video_url || '',
      has_quiz: lesson.meta?._has_quiz === 'yes',
      quiz_id: lesson.meta?._quiz_id || null,
      // Start date fields
      start_date: startDateRaw, // Raw ISO string or empty
      start_date_parsed: startDate, // Date object or null
      is_available: isAvailable, // Whether lesson is currently accessible
      // Computed flags
      has_video: Boolean(lesson.meta?._video_url),
      has_steps: Array.isArray(lesson.meta?._lesson_steps) && lesson.meta._lesson_steps.length > 0,
      has_prerequisites: Array.isArray(lesson.meta?._prerequisite_lessons) && lesson.meta._prerequisite_lessons.length > 0,
      has_start_date: Boolean(startDateRaw)
    };
  }, []);

  // Process course lessons with the same enhancer
  const processedCourseLessons = useMemo(() => {
    return courseLessons.map(dataProcessor);
  }, [courseLessons, dataProcessor]);

  // ============================================================
  // COMPUTED VALUES CALCULATOR
  // ============================================================
  
  /**
   * Calculate lesson-specific computed values
   */
  const computedValuesCalculator = useMemo(() => (lessons) => {
    const total = lessons.length;
    
    if (total === 0) {
      return {
        total: 0,
        published: 0,
        draft: 0,
        private: 0,
        totalSteps: 0,
        averageStepsPerLesson: 0,
        totalDuration: 0,
        averageDuration: 0,
        byType: {},
        withQuizzes: 0,
        withVideo: 0,
        withPrerequisites: 0,
        requiredLessons: 0
      };
    }

    // Aggregate values
    let totalSteps = 0;
    let totalDuration = 0;
    const byType = {};
    let withQuizzes = 0;
    let withVideo = 0;
    let withPrerequisites = 0;
    let requiredLessons = 0;

    lessons.forEach(lesson => {
      // Steps
      totalSteps += lesson.steps_count || 0;
      
      // Duration
      totalDuration += lesson.duration_minutes || 0;
      
      // Type counts
      const type = lesson.lesson_type || 'mixed';
      byType[type] = (byType[type] || 0) + 1;
      
      // Features
      if (lesson.has_quiz) withQuizzes++;
      if (lesson.has_video) withVideo++;
      if (lesson.has_prerequisites) withPrerequisites++;
      if (lesson.is_required) requiredLessons++;
    });

    return {
      total,
      published: lessons.filter(l => l.status === 'publish').length,
      draft: lessons.filter(l => l.status === 'draft').length,
      private: lessons.filter(l => l.status === 'private').length,
      totalSteps,
      averageStepsPerLesson: total > 0 ? Math.round(totalSteps / total) : 0,
      totalDuration,
      averageDuration: total > 0 ? Math.round(totalDuration / total) : 0,
      byType,
      withQuizzes,
      withVideo,
      withPrerequisites,
      requiredLessons
    };
  }, []);

  // Computed values for course lessons
  const courseComputed = useMemo(() => {
    return computedValuesCalculator(processedCourseLessons);
  }, [processedCourseLessons, computedValuesCalculator]);

  // ============================================================
  // USE BASE RESOURCE HOOK (for non-course-specific fetching)
  // ============================================================
  
  const {
    items: genericLessons,
    loading: genericLoading,
    creating,
    updating,
    deleting,
    error: genericError,
    pagination: genericPagination,
    computed: genericComputed,
    filters,
    updateFilter,
    resetFilters,
    setFilters,
    fetchItems: fetchGenericLessons,
    loadMore: loadMoreGenericLessons,
    createItem: createLesson,
    updateItem: updateLesson,
    deleteItem: deleteLesson,
    duplicateItem: duplicateLesson,
    refresh: refreshGeneric,
    hasMore: genericHasMore
  } = useResource({
    service: lessonService,
    resourceName: 'lesson',
    initialFilters: {
      search,
      courseId: useCourseEndpoint ? null : courseId, // Only pass courseId if NOT using course endpoint
      lessonType,
      status: status || 'publish,draft,private'
    },
    dataProcessor,
    computedValuesCalculator,
    autoFetch: useCourseEndpoint ? false : autoFetch, // Don't auto-fetch if using course endpoint
    ...options
  });

  // ============================================================
  // UNIFIED INTERFACE
  // ============================================================

  // Return course-specific data if using course endpoint, otherwise generic data
  const lessons = useCourseEndpoint ? processedCourseLessons : genericLessons;
  const loading = useCourseEndpoint ? courseLoading : genericLoading;
  const error = useCourseEndpoint ? courseError : genericError;
  const pagination = useCourseEndpoint ? coursePagination : genericPagination;
  const computed = useCourseEndpoint ? courseComputed : genericComputed;
  const hasMore = useCourseEndpoint ? false : genericHasMore; // Course endpoint returns all at once

  const refresh = useCallback(() => {
    if (useCourseEndpoint) {
      return fetchCourseLessons();
    } else {
      return refreshGeneric();
    }
  }, [useCourseEndpoint, fetchCourseLessons, refreshGeneric]);

  const fetchLessons = useCallback((options) => {
    if (useCourseEndpoint) {
      return fetchCourseLessons();
    } else {
      return fetchGenericLessons(options);
    }
  }, [useCourseEndpoint, fetchCourseLessons, fetchGenericLessons]);

  const loadMoreLessons = useCallback(() => {
    if (useCourseEndpoint) {
      console.warn('⚠️  loadMore is not supported when filtering by courseId');
      return Promise.resolve();
    } else {
      return loadMoreGenericLessons();
    }
  }, [useCourseEndpoint, loadMoreGenericLessons]);

  // ============================================================
  // LESSON-SPECIFIC METHODS
  // ============================================================
  
  /**
   * Publish lesson (set status to 'publish')
   */
  const publishLesson = async (lessonId) => {
    return updateLesson(lessonId, { status: 'publish' });
  };

  /**
   * Unpublish lesson (set status to 'draft')
   */
  const unpublishLesson = async (lessonId) => {
    return updateLesson(lessonId, { status: 'draft' });
  };

  /**
   * Update lesson order
   */
  const updateLessonOrder = async (lessonId, newOrder) => {
    return updateLesson(lessonId, { lessonOrder: newOrder });
  };

  /**
   * Move lesson to different course
   */
  const moveLessonToCourse = async (lessonId, newCourseId) => {
    return updateLesson(lessonId, { courseId: newCourseId });
  };

  /**
   * Update lesson type
   */
  const updateLessonType = async (lessonId, newType) => {
    return updateLesson(lessonId, { lessonType: newType });
  };

  /**
   * Add step to lesson
   */
  const addStepToLesson = async (lessonId, step) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) throw new Error('Lesson not found');
    
    const currentSteps = lesson.steps || [];
    return updateLesson(lessonId, { 
      steps: [...currentSteps, step] 
    });
  };

  /**
   * Remove step from lesson
   */
  const removeStepFromLesson = async (lessonId, stepIndex) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) throw new Error('Lesson not found');
    
    const currentSteps = lesson.steps || [];
    return updateLesson(lessonId, { 
      steps: currentSteps.filter((_, index) => index !== stepIndex) 
    });
  };

  // ============================================================
  // RETURN
  // ============================================================
  
  return {
    // Data
    lessons,
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
    fetchLessons,
    loadMoreLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    duplicateLesson,
    refresh,

    // Lesson-specific actions
    publishLesson,
    unpublishLesson,
    updateLessonOrder,
    moveLessonToCourse,
    updateLessonType,
    addStepToLesson,
    removeStepFromLesson,

    // Helpers
    hasMore
  };
};

export default useLessons;