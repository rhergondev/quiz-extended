import { useState, useEffect, useCallback } from 'react';
import { getQuizRanking } from '../api/services/rankingService';

export const useQuizRanking = (quizId) => {
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRanking = useCallback(async () => {
    if (!quizId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getQuizRanking(quizId);
      setRanking(data);
    } catch (err) {
      setError('Could not load quiz ranking.');
      console.error('Error fetching quiz ranking:', err);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return { ranking, loading, error, refetch: fetchRanking };
};

export default useQuizRanking;
