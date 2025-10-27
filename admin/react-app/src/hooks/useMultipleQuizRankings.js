import { useState, useEffect, useCallback } from 'react';
import { getQuizRanking } from '../api/services/rankingService';

export const useMultipleQuizRankings = (quizIds = []) => {
  const [rankings, setRankings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRankings = useCallback(async () => {
    if (!quizIds || quizIds.length === 0) {
      setLoading(false);
      setRankings({});
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Fetch all rankings in parallel
      const promises = quizIds.map(quizId => 
        getQuizRanking(quizId)
          .then(data => ({ quizId, data }))
          .catch(err => {
            console.error(`Error fetching ranking for quiz ${quizId}:`, err);
            return { quizId, data: null };
          })
      );
      
      const results = await Promise.all(promises);
      
      // Convert array to object with quizId as key
      const rankingsMap = results.reduce((acc, { quizId, data }) => {
        acc[quizId] = data;
        return acc;
      }, {});
      
      setRankings(rankingsMap);
    } catch (err) {
      setError('Could not load quiz rankings.');
      console.error('Error fetching quiz rankings:', err);
    } finally {
      setLoading(false);
    }
  }, [quizIds.join(',')]); // Use join to create stable dependency

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  return { rankings, loading, error, refetch: fetchRankings };
};

export default useMultipleQuizRankings;
