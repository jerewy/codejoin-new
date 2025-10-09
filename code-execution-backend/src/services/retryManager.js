const logger = require('../utils/logger');

/**
 * Retry Manager with Exponential Backoff and Jitter
 *
 * Provides intelligent retry logic for external service calls with:
 * - Exponential backoff with jitter to prevent thundering herd
 * - Configurable retry conditions
 * - Maximum retry limits
 * - Detailed retry tracking and logging
 */
class RetryManager {
  constructor(defaultOptions = {}) {
    this.defaultOptions = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      multiplier: 2,
      jitter: true, // Add randomness to prevent synchronized retries
      retryableErrors: [
        '503', 'Service Unavailable', 'Overloaded', 'Temporarily unavailable',
        '429', 'Rate limit', 'Too many requests', 'quota',
        'timeout', 'connection', 'network', 'ECONNRESET'
      ],
      onRetry: null // Callback for retry attempts
    };

    this.options = { ...this.defaultOptions, ...defaultOptions };
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetries: 0
    };

    logger.info('Retry manager initialized', {
      maxRetries: this.options.maxRetries,
      baseDelay: this.options.baseDelay,
      maxDelay: this.options.maxDelay,
      retryableErrors: this.options.retryableErrors
    });
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, options = {}) {
    const config = { ...this.options, ...options };
    let lastError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug('Retrying operation', {
            attempt,
            maxRetries: config.maxRetries,
            lastError: lastError.message
          });
        }

        const result = await fn();

        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          this.stats.successfulRetries++;
          logger.info('Operation succeeded after retries', {
            attempt,
            totalRetries: attempt
          });

          if (config.onRetry) {
            await config.onRetry({
              attempt,
              success: true,
              totalRetries: attempt
            });
          }
        }

        return result;

      } catch (error) {
        lastError = error;

        // Don't retry on final attempt
        if (attempt === config.maxRetries) {
          this.stats.failedRetries++;
          this.updateAverageRetries(attempt);

          logger.error('Operation failed after all retries', {
            totalRetries: attempt,
            finalError: error.message
          });

          throw error;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error, config.retryableErrors)) {
          logger.debug('Error is not retryable', {
            error: error.message,
            code: error.code
          });
          throw error;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, config);

        logger.debug('Waiting before retry', {
          attempt,
          delay,
          error: error.message
        });

        if (config.onRetry) {
          await config.onRetry({
            attempt: attempt + 1,
            delay,
            error,
            retryable: true
          });
        }

        await this.sleep(delay);
        this.stats.totalRetries++;
      }
    }
  }

  /**
   * Check if error is retryable based on error message or code
   */
  isRetryableError(error, retryableErrors = null) {
    const errors = retryableErrors || this.options.retryableErrors;
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error.code || '').toLowerCase();

    return errors.some(retryableError => {
      const lowerRetryableError = retryableError.toLowerCase();
      return errorMessage.includes(lowerRetryableError) ||
             errorCode.includes(lowerRetryableError);
    });
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt, config) {
    // Calculate exponential backoff: baseDelay * (multiplier ^ attempt)
    let delay = config.baseDelay * Math.pow(config.multiplier, attempt);

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      // Add random variation: delay * (0.5 to 1.5)
      const jitterFactor = 0.5 + Math.random();
      delay = delay * jitterFactor;
    }

    return Math.round(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average retries calculation
   */
  updateAverageRetries(attempt) {
    const totalOperations = this.stats.successfulRetries + this.stats.failedRetries;
    if (totalOperations > 0) {
      this.stats.averageRetries = (this.stats.totalRetries / totalOperations).toFixed(2);
    }
  }

  /**
   * Get retry statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.successfulRetries / Math.max(1, this.stats.successfulRetries + this.stats.failedRetries) * 100
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetries: 0
    };
  }

  /**
   * Execute multiple functions with retry logic (for parallel operations)
   */
  async executeMultiple(functions, options = {}) {
    const config = { ...this.options, ...options };
    const results = [];
    const errors = [];

    // Execute functions in parallel with individual retry logic
    const promises = functions.map(async (fn, index) => {
      try {
        const result = await this.execute(fn, config);
        results[index] = { success: true, data: result };
      } catch (error) {
        errors[index] = error;
        results[index] = { success: false, error };
      }
    });

    await Promise.allSettled(promises);

    return {
      results,
      errors,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }

  /**
   * Create a retry-aware wrapper for any function
   */
  wrap(fn, options = {}) {
    return (...args) => {
      return this.execute(() => fn(...args), options);
    };
  }

  /**
   * Retry with custom condition function
   */
  async executeWithCondition(fn, shouldRetry, options = {}) {
    const config = { ...this.options, ...options };
    let lastError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await fn();

        // Check custom retry condition
        if (shouldRetry && shouldRetry(result, attempt)) {
          if (attempt === config.maxRetries) {
            throw new Error('Custom retry condition still met after max retries');
          }

          const delay = this.calculateDelay(attempt, config);
          await this.sleep(delay);
          continue;
        }

        return result;

      } catch (error) {
        lastError = error;

        if (attempt === config.maxRetries || !this.isRetryableError(error, config.retryableErrors)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }
}

/**
 * Backoff strategies for different scenarios
 */
class BackoffStrategies {
  /**
   * Fixed delay backoff
   */
  static fixed(delay, maxRetries = 3) {
    return {
      calculate: (attempt) => delay,
      maxRetries
    };
  }

  /**
   * Linear backoff: delay = baseDelay * (attempt + 1)
   */
  static linear(baseDelay, maxRetries = 3) {
    return {
      calculate: (attempt) => Math.min(baseDelay * (attempt + 1), 30000),
      maxRetries
    };
  }

  /**
   * Exponential backoff: delay = baseDelay * (multiplier ^ attempt)
   */
  static exponential(baseDelay, multiplier = 2, maxRetries = 3) {
    return {
      calculate: (attempt) => Math.min(baseDelay * Math.pow(multiplier, attempt), 30000),
      maxRetries
    };
  }

  /**
   * Fibonacci backoff
   */
  static fibonacci(baseDelay, maxRetries = 3) {
    const fibonacciSequence = [1, 1, 2, 3, 5, 8, 13, 21];
    return {
      calculate: (attempt) => {
        const index = Math.min(attempt, fibonacciSequence.length - 1);
        return Math.min(baseDelay * fibonacciSequence[index], 30000);
      },
      maxRetries
    };
  }
}

module.exports = RetryManager;
module.exports.BackoffStrategies = BackoffStrategies;