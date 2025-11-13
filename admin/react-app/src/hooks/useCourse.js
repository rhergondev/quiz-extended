/**
 * Hook to fetch a single course by ID
 * Optimized to fetch only one course instead of all courses
 * Includes in-memory cache to prevent duplicate requests
 * 
 * @package QuizExtended
 * @subpackage Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { getOne as getCourse } from '../api/services/courseService';

// In-memory cache shared across all hook instances
const courseCache = new Map();
const pendingRequests = new Map();

/**
 * Custom hook to fetch a single course with caching
 * @param {number|string} courseId - Course ID to fetch
 * @returns {Object} { course, loading, error, refetch }
 */
const useCourse = (courseId) => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(!!courseId);
  const [error, setError] = useState(null);

  const fetchCourse = useCallback(async (force = false) => {
    if (!courseId) {
      setCourse(null);
      setLoading(false);
      return;
    }

    // Convert courseId to number
    const id = parseInt(courseId, 10);
    if (isNaN(id)) {
      setError(new Error('Invalid course ID'));
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!force && courseCache.has(id)) {
      setCourse(courseCache.get(id));
      setLoading(false);
      return;
    }

    // If there's already a pending request for this course, wait for it
    if (pendingRequests.has(id)) {
      setLoading(true);
      setError(null);
      try {
        const courseData = await pendingRequests.get(id);
        setCourse(courseData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    // Create new request promise and store it
    const requestPromise = getCourse(id, { embed: false });
    pendingRequests.set(id, requestPromise);

    try {
      const courseData = await requestPromise;
      courseCache.set(id, courseData);
      setCourse(courseData);
    } catch (err) {
      console.error(`Error fetching course ${id}:`, err);
      setError(err);
    } finally {
      pendingRequests.delete(id);
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    } else {
      setCourse(null);
      setLoading(false);
    }
  }, [courseId, fetchCourse]);

  return {
    course,
    loading,
    error,
    refetch: () => fetchCourse(true) // Force refresh when manually refetching
  };
};

export default useCourse;
