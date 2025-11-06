/**
 * useQuizzesById - Hook for loading specific quizzes by their IDs
 * 
 * This hook is optimized for cases where you need specific quizzes
 * instead of loading all quizzes with pagination.
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { getOne as getQuiz } from '../api/services/quizService';

/**
 * Load specific quizzes by their IDs
 * 
 * @param {Array<number>} quizIds - Array of quiz IDs to load
 * @returns {Object} - { quizzesMap, loading, error, refetch }
 */
export const useQuizzesById = (quizIds = []) => {
  const [quizzesMap, setQuizzesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuizzes = useCallback(async (ids) => {
    if (!ids || ids.length === 0) {
      setQuizzesMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filter out already loaded quizzes
      const idsToFetch = ids.filter(id => !quizzesMap[id]);
      
      if (idsToFetch.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch all quizzes in parallel
      const promises = idsToFetch.map(id => 
        getQuiz(id).catch(err => {
          console.error(`Failed to load quiz ${id}:`, err);
          return null; // Return null for failed requests
        })
      );

      const results = await Promise.all(promises);

      // Create a map of quiz_id => quiz_data
      const newQuizzesMap = { ...quizzesMap };
      results.forEach((quiz, index) => {
        if (quiz) {
          newQuizzesMap[idsToFetch[index]] = quiz;
        }
      });

      setQuizzesMap(newQuizzesMap);
    } catch (err) {
      setError(err.message || 'Failed to load quizzes');
      console.error('Error loading quizzes by ID:', err);
    } finally {
      setLoading(false);
    }
  }, [quizzesMap]);

  useEffect(() => {
    fetchQuizzes(quizIds);
  }, [JSON.stringify(quizIds)]); // Use JSON.stringify to properly compare arrays

  const refetch = useCallback(() => {
    setQuizzesMap({});
    fetchQuizzes(quizIds);
  }, [quizIds, fetchQuizzes]);

  return {
    quizzesMap,
    loading,
    error,
    refetch
  };
};

export default useQuizzesById;
