import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Debounce Utilities
 * Provides reusable debouncing functions to prevent excessive API calls
 */

/**
 * Basic debounce function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * React hook for debouncing values
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * React hook for debouncing callbacks
 * @param {Function} callback - Callback function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} deps - Dependencies array
 * @returns {Function} Debounced callback
 */
export const useDebouncedCallback = (callback, delay, deps = []) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay, ...deps]);
};

/**
 * React hook for throttling functions
 * @param {Function} callback - Callback function to throttle
 * @param {number} delay - Delay in milliseconds
 * @param {Array} deps - Dependencies array
 * @returns {Function} Throttled callback
 */
export const useThrottledCallback = (callback, delay, deps = []) => {
  const lastCall = useRef(0);
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callbackRef.current(...args);
    } else {
      // Clear existing timeout and set a new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callbackRef.current(...args);
      }, delay - (now - lastCall.current));
    }
  }, [delay, ...deps]);
};

/**
 * Advanced debounce hook with immediate option
 * @param {Function} callback - Callback function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Options object
 * @param {boolean} options.immediate - Execute immediately on first call
 * @param {number} options.maxWait - Maximum time to wait before execution
 * @param {Array} deps - Dependencies array
 * @returns {Function} Debounced callback
 */
export const useAdvancedDebounce = (callback, delay, options = {}, deps = []) => {
  const { immediate = false, maxWait = null } = options;
  
  const timeoutRef = useRef(null);
  const maxTimeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  const lastCallTime = useRef(0);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    const now = Date.now();
    const callNow = immediate && !timeoutRef.current;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up max wait timeout if specified
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        maxTimeoutRef.current = null;
        timeoutRef.current = null;
        lastCallTime.current = Date.now();
      }, maxWait);
    }

    // Set up regular debounce timeout
    timeoutRef.current = setTimeout(() => {
      if (!callNow) {
        callbackRef.current(...args);
      }
      timeoutRef.current = null;
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
      lastCallTime.current = Date.now();
    }, delay);

    // Call immediately if specified
    if (callNow) {
      callbackRef.current(...args);
      lastCallTime.current = now;
    }
  }, [delay, immediate, maxWait, ...deps]);
};

/**
 * Request deduplication utility
 * Prevents duplicate API requests with the same parameters
 */
export class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Execute a request with deduplication
   * @param {string} key - Unique key for the request
   * @param {Function} requestFn - Function that returns a promise
   * @returns {Promise} Request promise
   */
  async execute(key, requestFn) {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      console.log(`🚫 Duplicate request prevented: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Create new request
    const requestPromise = requestFn()
      .finally(() => {
        // Remove from pending requests when completed
        this.pendingRequests.delete(key);
      });

    // Store the promise
    this.pendingRequests.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Cancel a pending request
   * @param {string} key - Request key to cancel
   */
  cancel(key) {
    this.pendingRequests.delete(key);
  }

  /**
   * Cancel all pending requests
   */
  cancelAll() {
    this.pendingRequests.clear();
  }

  /**
   * Get number of pending requests
   * @returns {number} Number of pending requests
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

/**
 * React hook for request deduplication
 * @returns {Object} Deduplicator methods
 */
export const useRequestDeduplicator = () => {
  const deduplicatorRef = useRef(new RequestDeduplicator());

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      deduplicatorRef.current.cancelAll();
    };
  }, []);

  return {
    execute: deduplicatorRef.current.execute.bind(deduplicatorRef.current),
    cancel: deduplicatorRef.current.cancel.bind(deduplicatorRef.current),
    cancelAll: deduplicatorRef.current.cancelAll.bind(deduplicatorRef.current),
    getPendingCount: deduplicatorRef.current.getPendingCount.bind(deduplicatorRef.current)
  };
};

/**
 * Search input debounce hook
 * Specialized hook for search inputs with proper handling
 * @param {string} initialValue - Initial search value
 * @param {Function} onSearch - Search callback function
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Object} Search input props and methods
 */
export const useSearchInput = (initialValue = '', onSearch, delay = 500) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebouncedCallback(
    async (value) => {
      setIsSearching(true);
      try {
        await onSearch(value);
      } finally {
        setIsSearching(false);
      }
    },
    delay,
    [onSearch]
  );

  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchValue('');
    debouncedSearch('');
  }, [debouncedSearch]);

  return {
    searchValue,
    isSearching,
    handleSearchChange,
    clearSearch,
    setSearchValue
  };
};

/**
 * Filter debounce hook
 * Specialized hook for filter changes with proper handling
 * @param {Object} initialFilters - Initial filter values
 * @param {Function} onFiltersChange - Filters change callback
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Object} Filter props and methods
 */
export const useFilterDebounce = (initialFilters = {}, onFiltersChange, delay = 300) => {
  const [filters, setFilters] = useState(initialFilters);
  const [isFiltering, setIsFiltering] = useState(false);

  const debouncedFilterChange = useDebouncedCallback(
    async (newFilters) => {
      setIsFiltering(true);
      try {
        await onFiltersChange(newFilters);
      } finally {
        setIsFiltering(false);
      }
    },
    delay,
    [onFiltersChange]
  );

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      debouncedFilterChange(newFilters);
      return newFilters;
    });
  }, [debouncedFilterChange]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const mergedFilters = { ...prev, ...newFilters };
      debouncedFilterChange(mergedFilters);
      return mergedFilters;
    });
  }, [debouncedFilterChange]);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    debouncedFilterChange(initialFilters);
  }, [initialFilters, debouncedFilterChange]);

  return {
    filters,
    isFiltering,
    updateFilter,
    updateFilters,
    resetFilters,
  };
};

/**
 * API rate limiter utility
 * Prevents too many API calls within a time window
 */
export class APIRateLimiter {
  constructor(maxRequests = 10, timeWindow = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  /**
   * Check if request is allowed
   * @returns {boolean} Whether request is allowed
   */
  canMakeRequest() {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    // Check if we're under the limit
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a new request
   * @returns {boolean} Whether request was recorded
   */
  recordRequest() {
    if (this.canMakeRequest()) {
      this.requests.push(Date.now());
      return true;
    }
    return false;
  }

  /**
   * Get time until next request is allowed
   * @returns {number} Milliseconds until next request
   */
  getTimeUntilNextRequest() {
    if (this.canMakeRequest()) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.requests);
    return this.timeWindow - (Date.now() - oldestRequest);
  }

  /**
   * Reset the rate limiter
   */
  reset() {
    this.requests = [];
  }
}

/**
 * React hook for API rate limiting
 * @param {number} maxRequests - Maximum requests per time window
 * @param {number} timeWindow - Time window in milliseconds
 * @returns {Object} Rate limiter methods
 */
export const useAPIRateLimit = (maxRequests = 10, timeWindow = 1000) => {
  const rateLimiterRef = useRef(new APIRateLimiter(maxRequests, timeWindow));

  return {
    canMakeRequest: rateLimiterRef.current.canMakeRequest.bind(rateLimiterRef.current),
    recordRequest: rateLimiterRef.current.recordRequest.bind(rateLimiterRef.current),
    getTimeUntilNextRequest: rateLimiterRef.current.getTimeUntilNextRequest.bind(rateLimiterRef.current),
    reset: rateLimiterRef.current.reset.bind(rateLimiterRef.current)
  };
};

/**
 * Custom hook for managing form inputs with debouncing
 * @param {Object} initialValues - Initial form values
 * @param {Function} onSubmit - Submit callback
 * @param {Object} options - Configuration options
 * @returns {Object} Form management utilities
 */
export const useDebouncedForm = (initialValues = {}, onSubmit, options = {}) => {
  const { debounceMs = 300, validateOnChange = true } = options;
  
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const debouncedValidation = useDebouncedCallback(
    (newValues) => {
      if (validateOnChange && typeof options.validate === 'function') {
        const validationErrors = options.validate(newValues);
        setErrors(validationErrors || {});
      }
    },
    debounceMs,
    [validateOnChange, options.validate]
  );

  const setValue = useCallback((key, value) => {
    setValues(prev => {
      const newValues = { ...prev, [key]: value };
      setIsDirty(true);
      debouncedValidation(newValues);
      return newValues;
    });
  }, [debouncedValidation]);

  const updateValues = useCallback((newValues) => {
    setValues(prev => {
      const mergedValues = { ...prev, ...newValues };
      setIsDirty(true);
      debouncedValidation(mergedValues);
      return mergedValues;
    });
  }, [debouncedValidation]);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    setIsSubmitting(true);
    try {
      if (typeof options.validate === 'function') {
        const validationErrors = options.validate(values);
        if (validationErrors && Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }
      
      await onSubmit(values);
      setIsDirty(false);
    } catch (error) {
      console.error('Form submission error:', error);
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit, options]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    isDirty,
    setValue,
    updateValues, // 🔧 Changed name
    setErrors,
    handleSubmit,
    reset
  };
};