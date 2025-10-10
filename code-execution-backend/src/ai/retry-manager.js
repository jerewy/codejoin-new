/**
 * Retry Manager with Exponential Backoff and Jitter
 *
 * Provides intelligent retry logic with various backoff strategies
 * to handle transient failures in external AI services.
 */

const logger = require('../utils/logger');

/**
 * Backoff Strategies
 */
const BackoffStrategy = {
  FIXED: 'fixed',                    // Fixed delay between retries
  LINEAR: 'linear',                  // Linear increase in delay
  EXPONENTIAL: 'exponential',        // Exponential backoff
  EXPONENTIAL_WITH_JITTER: 'exp_jitter', // Exponential with jitter
  FULL_JITTER: 'full_jitter'         // Full jitter backoff
};

/**
 * Retry Manager Implementation
 */
class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 5; // Increased from 3 to 5
    this.baseDelay = options.baseDelay || 500; // Reduced from 1s to 500ms
    this.maxDelay = options.maxDelay || 15000;  // Reduced from 30s to 15s
    this.strategy = options.strategy || BackoffStrategy.EXPONENTIAL_WITH_JITTER;
    this.multiplier = options.multiplier || 1.5; // Reduced from 2 to 1.5 (less aggressive)
    this.jitterFactor = options.jitterFactor || 0.2; // Increased from 0.1 to 0.2
    this.retryableErrors = options.retryableErrors || this.getDefaultRetryableErrors();
    this.onRetry = options.onRetry || (() => {});
    this.onFailed = options.onFailed || (() => {});
    this.onSuccess = options.onSuccess || (() => {});

    logger.info('Retry manager initialized', {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      strategy: this.strategy
    });
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {Object} context - Context for logging and error handling
   * @returns {Promise} Operation result
   */
  async executeWithRetry(operation, context = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    let lastError = null;

    logger.debug(`Retry manager starting execution`, {
      requestId,
      maxRetries: this.maxRetries,
      strategy: this.strategy,
      context
    });

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const attemptStartTime = Date.now();
        const result = await operation();
        const attemptTime = Date.now() - attemptStartTime;
        const totalTime = Date.now() - startTime;

        this.onSuccess(result, attempt, attemptTime, context);

        logger.debug(`Retry manager operation succeeded`, {
          requestId,
          attempt,
          attemptTime,
          totalTime,
          context
        });

        return result;

      } catch (error) {
        lastError = error;
        const attemptTime = Date.now() - startTime;

        logger.warn(`Retry manager operation failed`, {
          requestId,
          attempt,
          error: error.message,
          attemptTime,
          context
        });

        // Check if error is retryable and if we have retries left
        if (attempt === this.maxRetries || !this.isRetryableError(error)) {
          this.onFailed(lastError, attempt, attemptTime, context);
          throw this.enhanceError(lastError, attempt, requestId, context);
        }

        // Calculate delay for next retry
        const delay = this.calculateDelay(attempt);

        this.onRetry(lastError, attempt, delay, context);

        logger.info(`Retry manager scheduling retry`, {
          requestId,
          attempt: attempt + 1,
          delay,
          error: error.message,
          context
        });

        // Wait before next retry
        await this.delay(delay);
      }
    }

    // This should not be reached, but just in case
    throw this.enhanceError(lastError, this.maxRetries, requestId, context);
  }

  /**
   * Calculate delay for retry based on strategy
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    let delay;

    switch (this.strategy) {
      case BackoffStrategy.FIXED:
        delay = this.baseDelay;
        break;

      case BackoffStrategy.LINEAR:
        delay = this.baseDelay * (attempt + 1);
        break;

      case BackoffStrategy.EXPONENTIAL:
        delay = this.baseDelay * Math.pow(this.multiplier, attempt);
        break;

      case BackoffStrategy.EXPONENTIAL_WITH_JITTER:
        delay = this.baseDelay * Math.pow(this.multiplier, attempt);
        delay = this.addJitter(delay);
        break;

      case BackoffStrategy.FULL_JITTER:
        delay = this.baseDelay * Math.pow(this.multiplier, attempt);
        delay = this.addFullJitter(delay);
        break;

      default:
        delay = this.baseDelay * Math.pow(this.multiplier, attempt);
        delay = this.addJitter(delay);
    }

    // Cap the delay to maxDelay
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Add jitter to delay to avoid thundering herd
   * @param {number} delay - Base delay
   * @returns {number} Delay with jitter
   */
  addJitter(delay) {
    const jitter = delay * this.jitterFactor;
    const randomJitter = Math.random() * jitter * 2 - jitter;
    return Math.max(0, delay + randomJitter);
  }

  /**
   * Add full jitter (random between 0 and delay)
   * @param {number} delay - Base delay
   * @returns {number} Random delay
   */
  addFullJitter(delay) {
    return Math.random() * delay;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryableError(error) {
    if (!error) return false;

    // Check if error message contains retryable keywords
    const errorMessage = error.message.toLowerCase();

    for (const retryableError of this.retryableErrors) {
      if (typeof retryableError === 'string') {
        if (errorMessage.includes(retryableError.toLowerCase())) {
          return true;
        }
      } else if (retryableError instanceof RegExp) {
        if (retryableError.test(errorMessage)) {
          return true;
        }
      } else if (retryableError.test) {
        if (retryableError.test(error)) {
          return true;
        }
      }
    }

    // Check specific error codes
    if (error.code) {
      const retryableCodes = [
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
        '503',
        '502',
        '504',
        '429',
        '408'
      ];

      if (retryableCodes.includes(error.code.toString())) {
        return true;
      }
    }

    // Check HTTP status codes
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode;
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

      if (retryableStatusCodes.includes(statusCode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get default retryable error patterns
   * @returns {Array} Default retryable errors
   */
  getDefaultRetryableErrors() {
    return [
      // Network errors
      'network error',
      'connection refused',
      'connection timeout',
      'connection reset',
      'timeout',
      'timed out',
      'host unreachable',
      'dns lookup failed',

      // AI service specific errors
      'service unavailable',
      'temporarily unavailable',
      'overloaded',
      'rate limit',
      'quota exceeded',
      'too many requests',
      'try again later',
      'server error',
      'internal error',

      // HTTP errors
      /503|502|504|429|408/i, // Service unavailable, Bad gateway, Gateway timeout, Too many requests, Request timeout

      // Network patterns
      /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i
    ];
  }

  /**
   * Enhance error with retry information
   * @param {Error} error - Original error
   * @param {number} attempts - Number of attempts made
   * @param {string} requestId - Request ID
   * @param {Object} context - Operation context
   * @returns {RetryError} Enhanced error
   */
  enhanceError(error, attempts, requestId, context) {
    const retryError = new RetryError(
      error.message,
      error.code || 'RETRY_EXHAUSTED',
      {
        attempts,
        maxRetries: this.maxRetries,
        strategy: this.strategy,
        requestId,
        context,
        originalError: error
      }
    );

    // Preserve original error stack
    retryError.stack = error.stack;
    return retryError;
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get retry manager statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      strategy: this.strategy,
      multiplier: this.multiplier,
      jitterFactor: this.jitterFactor,
      retryableErrorCount: this.retryableErrors.length
    };
  }
}

/**
 * Retry Error Class
 */
class RetryError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'RetryError';
    this.code = code;
    this.details = details;
    this.isRetryError = true;
  }
}

/**
 * Retry Manager Factory
 */
class RetryManagerFactory {
  constructor() {
    this.managers = new Map();
  }

  /**
   * Get or create a retry manager
   * @param {string} name - Manager name
   * @param {Object} options - Manager options
   * @returns {RetryManager} Retry manager instance
   */
  get(name, options = {}) {
    if (!this.managers.has(name)) {
      this.managers.set(name, new RetryManager(options));
    }
    return this.managers.get(name);
  }

  /**
   * Create a custom retry manager
   * @param {Object} options - Manager options
   * @returns {RetryManager} New retry manager instance
   */
  create(options = {}) {
    return new RetryManager(options);
  }

  /**
   * Get all managers
   * @returns {Map} All managers
   */
  getAll() {
    return this.managers;
  }
}

// Global retry manager factory
const retryManagerFactory = new RetryManagerFactory();

module.exports = {
  RetryManager,
  RetryError,
  RetryManagerFactory,
  BackoffStrategy,
  retryManagerFactory
};