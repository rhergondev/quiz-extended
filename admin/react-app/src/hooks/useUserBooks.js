/**
 * useUserBooks Hook
 * 
 * Custom hook for fetching user's purchased books
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserBooks } from '../api/services/userBooksService.js';

/**
 * Hook for managing user's purchased books
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Whether to fetch books on mount
 * @returns {Object} Books data and methods
 */
const useUserBooks = ({ autoFetch = true } = {}) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch user's purchased books
   */
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getUserBooks();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('📚 Error fetching user books:', err);
      setError(err.message || 'Error loading books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh books list
   */
  const refresh = useCallback(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchBooks();
    }
  }, [autoFetch, fetchBooks]);

  return {
    books,
    loading,
    error,
    refresh,
    fetchBooks,
    hasBooks: books.length > 0,
  };
};

export default useUserBooks;
