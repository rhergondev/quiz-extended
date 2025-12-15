/**
 * useBooks Hook
 * 
 * Custom hook for managing books (PDFs) with pagination, filtering, and CRUD operations.
 * 
 * @package QuizExtended
 * @subpackage Hooks
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getApiConfig } from '../api/config/apiConfig';

/**
 * Default filter values
 */
const DEFAULT_FILTERS = {
  search: '',
  status: 'publish,draft',
};

/**
 * Hook for managing books
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Auto fetch on mount (default: true)
 * @param {number} options.perPage - Items per page (default: 20)
 * @param {number} options.debounceMs - Search debounce in ms (default: 300)
 * @returns {Object} Books state and methods
 */
const useBooks = (options = {}) => {
  const {
    autoFetch = true,
    perPage = 20,
    debounceMs = 300,
  } = options;

  // State
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage,
    total: 0,
    totalPages: 0,
  });

  // Refs
  const debounceRef = useRef(null);
  const abortControllerRef = useRef(null);
  const initialFetchDone = useRef(false);

  /**
   * Get API base URL
   */
  const getBaseUrl = useCallback(() => {
    const config = getApiConfig();
    return `${config.apiUrl}/quiz-extended/v1`;
  }, []);

  /**
   * Make API request
   */
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const config = getApiConfig();
    const url = `${getBaseUrl()}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': config.nonce,
        ...options.headers,
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }, [getBaseUrl]);

  /**
   * Fetch books from API
   */
  const fetchBooks = useCallback(async (resetPage = false, customFilters = null) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const currentFilters = customFilters || filters;
      const page = resetPage ? 1 : pagination.page;

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        status: currentFilters.status || 'publish,draft',
      });

      if (currentFilters.search) {
        params.append('search', currentFilters.search);
      }

      const result = await apiRequest(`/books?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      // Handle response structure: { success: true, data: { data: [...], pagination: {...} } }
      if (result.success && result.data) {
        const responseData = result.data;
        setBooks(Array.isArray(responseData.data) ? responseData.data : []);
        setPagination({
          page: responseData.pagination?.page || 1,
          perPage: responseData.pagination?.per_page || perPage,
          total: responseData.pagination?.total || 0,
          totalPages: responseData.pagination?.total_pages || 0,
        });
      } else {
        // Fallback: maybe direct array response
        setBooks(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching books:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, perPage, apiRequest]);

  /**
   * Update a single filter
   */
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Debounce search
      if (key === 'search') {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          fetchBooks(true, newFilters);
        }, debounceMs);
      } else {
        fetchBooks(true, newFilters);
      }
      
      return newFilters;
    });
  }, [fetchBooks, debounceMs]);

  /**
   * Load more books (pagination)
   */
  const loadMore = useCallback(async () => {
    if (loading || pagination.page >= pagination.totalPages) return;
    
    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
  }, [loading, pagination.page, pagination.totalPages]);

  /**
   * Get a single book
   */
  const getBook = useCallback(async (bookId) => {
    try {
      const result = await apiRequest(`/books/${bookId}`);
      // Handle nested response: { success: true, data: { ... } }
      if (result.success && result.data) {
        return result.data;
      }
      return result;
    } catch (err) {
      console.error('Error fetching book:', err);
      throw err;
    }
  }, [apiRequest]);

  /**
   * Create a new book
   */
  const createBook = useCallback(async (bookData) => {
    setLoading(true);
    try {
      const result = await apiRequest('/books', {
        method: 'POST',
        body: JSON.stringify(bookData),
      });

      // Handle nested response: { success: true, data: { ... } }
      const newBook = result.success && result.data ? result.data : result;
      
      if (newBook && newBook.id) {
        // Add to list
        setBooks(prev => [newBook, ...prev]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
        return newBook;
      }
      throw new Error(result.message || 'Failed to create book');
    } catch (err) {
      console.error('Error creating book:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  /**
   * Update a book
   */
  const updateBook = useCallback(async (bookId, bookData) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/books/${bookId}`, {
        method: 'PUT',
        body: JSON.stringify(bookData),
      });

      // Handle nested response: { success: true, data: { ... } }
      const updatedBook = result.success && result.data ? result.data : result;

      if (updatedBook && updatedBook.id) {
        // Update in list
        setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
        return updatedBook;
      }
      throw new Error(result.message || 'Failed to update book');
    } catch (err) {
      console.error('Error updating book:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  /**
   * Delete a book
   */
  const deleteBook = useCallback(async (bookId) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/books/${bookId}`, {
        method: 'DELETE',
      });

      if (result.success !== false) {
        // Remove from list
        setBooks(prev => prev.filter(b => b.id !== bookId));
        setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        return result;
      }
      throw new Error(result.message || 'Failed to delete book');
    } catch (err) {
      console.error('Error deleting book:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  /**
   * Get WooCommerce products for linking
   */
  const getWcProducts = useCallback(async (search = '') => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const result = await apiRequest(`/books/wc-products${params}`);
      return result.success !== false ? result : { data: [], woocommerce_active: false };
    } catch (err) {
      console.error('Error fetching WC products:', err);
      return { data: [], woocommerce_active: false };
    }
  }, [apiRequest]);

  /**
   * Link book to WooCommerce product
   */
  const linkProduct = useCallback(async (bookId, productId) => {
    try {
      const result = await apiRequest(`/books/${bookId}/link-product`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      });

      if (result.success) {
        // Refresh book data
        const updatedBook = await getBook(bookId);
        setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
        return result;
      }
      throw new Error(result.message || 'Failed to link product');
    } catch (err) {
      console.error('Error linking product:', err);
      throw err;
    }
  }, [apiRequest, getBook]);

  /**
   * Unlink book from WooCommerce product
   */
  const unlinkProduct = useCallback(async (bookId) => {
    try {
      const result = await apiRequest(`/books/${bookId}/unlink-product`, {
        method: 'POST',
      });

      if (result.success) {
        // Refresh book data
        const updatedBook = await getBook(bookId);
        setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
        return result;
      }
      throw new Error(result.message || 'Failed to unlink product');
    } catch (err) {
      console.error('Error unlinking product:', err);
      throw err;
    }
  }, [apiRequest, getBook]);

  /**
   * Refresh books list
   */
  const refresh = useCallback(() => {
    fetchBooks(true);
  }, [fetchBooks]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchBooks(true);
    }
  }, [autoFetch, fetchBooks]);

  // Fetch when page changes
  useEffect(() => {
    if (initialFetchDone.current && pagination.page > 1) {
      fetchBooks(false);
    }
  }, [pagination.page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Computed values
  const computed = useMemo(() => ({
    hasMore: pagination.page < pagination.totalPages,
    isEmpty: !loading && books.length === 0,
    isFiltered: filters.search !== '',
  }), [pagination, loading, books.length, filters]);

  return {
    // Data
    books,
    loading,
    error,
    filters,
    pagination,
    computed,

    // Actions
    fetchBooks,
    updateFilter,
    loadMore,
    refresh,

    // CRUD
    getBook,
    createBook,
    updateBook,
    deleteBook,

    // WooCommerce
    getWcProducts,
    linkProduct,
    unlinkProduct,
  };
};

export default useBooks;
