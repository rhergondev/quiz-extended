import { useState, useEffect } from 'react';
import courseRankingService from '../api/services/courseRankingService';

/**
 * Hook for managing course ranking data
 * @param {number} courseId - Course ID
 * @param {boolean} autoFetch - Auto fetch on mount
 * @returns {Object} Ranking data and methods
 */
const useCourseRanking = (courseId, autoFetch = true) => {
  const [ranking, setRanking] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalQuizzes, setTotalQuizzes] = useState(0);

  const fetchRanking = async () => {
    if (!courseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [rankingData, statusData] = await Promise.all([
        courseRankingService.getCourseRanking(courseId),
        courseRankingService.getMyRankingStatus(courseId)
      ]);

      if (rankingData.success) {
        setRanking(rankingData.data.ranking || []);
        setTotalQuizzes(rankingData.data.total_quizzes || 0);
      }

      if (statusData.success) {
        setMyStatus(statusData.data);
      }
    } catch (err) {
      console.error('Error fetching course ranking:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && courseId) {
      fetchRanking();
    }
  }, [courseId, autoFetch]);

  return {
    ranking,
    myStatus,
    loading,
    error,
    totalQuizzes,
    refetch: fetchRanking
  };
};

export default useCourseRanking;
