/**
 * useLessons - Lesson Management Hook (Refactored)
 * 
 * Uses useResource for base functionality
 * Extended with lesson-specific features
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 2.0.0
 */

import { useMemo } from 'react';
import { useResource } from './useResource';
import * as lessonService from '../api/services/lessonService';

/**
 * Lesson management hook
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.search - Search term
 * @param {number} options.courseId - Course ID filter
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

  // ============================================================
  // DATA PROCESSOR
  // ============================================================
  
  /**
   * Process/enhance lesson data with computed values
   */
  const dataProcessor = useMemo(() => (lesson) => {
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
      // Computed flags
      has_video: Boolean(lesson.meta?._video_url),
      has_steps: Array.isArray(lesson.meta?._lesson_steps) && lesson.meta._lesson_steps.length > 0,
      has_prerequisites: Array.isArray(lesson.meta?._prerequisite_lessons) && lesson.meta._prerequisite_lessons.length > 0
    };
  }, []);

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

  // ============================================================
  // USE BASE RESOURCE HOOK
  // ============================================================
  
  const {
    items: lessons,
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
    fetchItems: fetchLessons,
    loadMore: loadMoreLessons,
    createItem: createLesson,
    updateItem: updateLesson,
    deleteItem: deleteLesson,
    duplicateItem: duplicateLesson,
    refresh,
    hasMore
  } = useResource({
    service: lessonService,
    resourceName: 'lesson',
    initialFilters: {
      search,
      courseId,
      lessonType,
      status: status || 'publish,draft,private'
    },
    dataProcessor,
    computedValuesCalculator,
    ...options
  });

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