/**
 * Global Error Handler
 * 
 * Centralized error handling for API requests and application errors
 * Provides consistent error formatting and logging
 * 
 * @package QuizExtended
 * @subpackage API/Utils
 * @version 1.0.0
 */

/**
 * Error types classification
 */
export const ErrorType = {
  NETWORK: 'NETWORK_ERROR',
  API: 'API_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION: 'PERMISSION_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Classify error by type
 * @param {Error} error - Error object
 * @returns {string} Error type
 */
const classifyError = (error) => {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK;
  }
  if (message.includes('404')) {
    return ErrorType.NOT_FOUND;
  }
  if (message.includes('401') || message.includes('unauthorized')) {
    return ErrorType.AUTH;
  }
  if (message.includes('403') || message.includes('forbidden')) {
    return ErrorType.PERMISSION;
  }
  if (message.includes('validation')) {
    return ErrorType.VALIDATION;
  }
  if (message.includes('timeout')) {
    return ErrorType.TIMEOUT;
  }
  if (message.includes('api error')) {
    return ErrorType.API;
  }
  
  return ErrorType.UNKNOWN;
};

/**
 * Get user-friendly error message
 * @param {string} errorType - Error type
 * @param {Error} error - Original error
 * @returns {string} User-friendly message
 */
const getUserMessage = (errorType, error) => {
  const messages = {
    [ErrorType.NETWORK]: 'Network error. Please check your connection.',
    [ErrorType.API]: 'Server error. Please try again later.',
    [ErrorType.VALIDATION]: 'Invalid data provided.',
    [ErrorType.AUTH]: 'Authentication required. Please log in.',
    [ErrorType.NOT_FOUND]: 'Resource not found.',
    [ErrorType.PERMISSION]: 'You do not have permission to perform this action.',
    [ErrorType.TIMEOUT]: 'Request timeout. Please try again.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred.'
  };

  return messages[errorType] || messages[ErrorType.UNKNOWN];
};

/**
 * Create standardized error object
 * @param {Error} error - Original error
 * @param {Object} context - Additional context
 * @returns {Object} Standardized error
 */
export const createErrorObject = (error, context = {}) => {
  const errorType = classifyError(error);
  
  return {
    type: errorType,
    message: error.message,
    userMessage: getUserMessage(errorType, error),
    originalError: error,
    context,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
};

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  const errorObj = createErrorObject(error, context);
  
  console.error('🔴 Error:', {
    type: errorObj.type,
    message: errorObj.message,
    context: errorObj.context,
    timestamp: errorObj.timestamp
  });

  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', errorObj.stack);
  }

  // Here you could send to error tracking service (Sentry, etc.)
  // sendToErrorTracking(errorObj);
};

/**
 * Handle API error with retry logic
 * @param {Function} apiCall - API call function
 * @param {Object} options - Options
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.retryDelay - Delay between retries (ms)
 * @param {Function} options.shouldRetry - Function to determine if should retry
 * @returns {Promise<any>} API call result
 */
export const handleApiError = async (apiCall, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = (error) => {
      const type = classifyError(error);
      return type === ErrorType.NETWORK || type === ErrorType.TIMEOUT;
    }
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if should retry
      if (!shouldRetry(error)) {
        throw error;
      }

      console.warn(`⚠️ Retry attempt ${attempt + 1}/${maxRetries}`, error.message);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  // All retries failed
  logError(lastError, { maxRetries, apiCall: apiCall.name });
  throw lastError;
};

/**
 * Error boundary helper for async operations
 * @param {Function} fn - Async function to execute
 * @param {Object} context - Context for error logging
 * @returns {Promise<[any, Error]>} Tuple of [result, error]
 */
export const safeAsync = async (fn, context = {}) => {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    logError(error, context);
    return [null, createErrorObject(error, context)];
  }
};

/**
 * Validation error helper
 * @param {Array<string>} errors - Validation errors
 * @returns {Error} Validation error
 */
export const createValidationError = (errors) => {
  const error = new Error(`Validation failed: ${errors.join(', ')}`);
  error.type = ErrorType.VALIDATION;
  error.errors = errors;
  return error;
};

/**
 * Check if error is of specific type
 * @param {Error} error - Error to check
 * @param {string} type - Error type to check
 * @returns {boolean} Is error of type
 */
export const isErrorType = (error, type) => {
  return classifyError(error) === type;
};

/**
 * Global error handler for uncaught errors
 */
export const setupGlobalErrorHandler = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      logError(new Error(event.reason), { 
        type: 'unhandledRejection',
        promise: event.promise 
      });
    });

    window.addEventListener('error', (event) => {
      logError(event.error, { 
        type: 'uncaughtError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }
};