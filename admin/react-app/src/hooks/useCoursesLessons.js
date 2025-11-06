/**
 * useCoursesLessons Hook
 * 
 * Optimized hook for fetching lessons from multiple courses
 * Uses bulk API to reduce HTTP requests
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { getBulkCourseLessons, getBulkLessonCounts } from '../api/services/coursesBulkService';

/**
 * Hook to fetch lessons for multiple courses efficiently
 * 
 * @param {number[]} courseIds - Array of course IDs
 * @param {Object} options - Options
 * @param {boolean} options.enabled - Enable auto-fetch (default: true)
 * @param {boolean} options.includeContent - Include full lesson content (default: false)
 * @param {boolean} options.countsOnly - Fetch only lesson counts (default: false)
 * @returns {Object} { lessonsMap, countsMap, loading, error, refetch }
 */
export const useCoursesLessons = (courseIds, options = {}) => {
  const {
    enabled = true,
    includeContent = false,
    countsOnly = false
  } = options;

  const [lessonsMap, setLessonsMap] = useState({});
  const [countsMap, setCountsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLessons = async () => {
    if (!courseIds || courseIds.length === 0) {
      setLessonsMap({});
      setCountsMap({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (countsOnly) {
        // Fetch only counts for better performance
        const counts = await getBulkLessonCounts(courseIds);
        setCountsMap(counts);
      } else {
        // Fetch full data
        const data = await getBulkCourseLessons(courseIds, { includeContent });
        setLessonsMap(data);
        
        // Also extract counts
        const counts = {};
        Object.keys(data).forEach(courseId => {
          counts[courseId] = data[courseId].count || 0;
        });
        setCountsMap(counts);
      }
    } catch (err) {
      console.error('Error fetching courses lessons:', err);
      setError(err.message || 'Failed to fetch lessons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && courseIds && courseIds.length > 0) {
      fetchLessons();
    }
  }, [enabled, JSON.stringify(courseIds), includeContent, countsOnly]);

  return {
    lessonsMap,
    countsMap,
    loading,
    error,
    refetch: fetchLessons
  };
};

export default useCoursesLessons;
