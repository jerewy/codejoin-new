const logger = require('../utils/logger');

/**
 * Circuit Breaker Pattern Implementation
 *
 * Protects against cascading failures by monitoring external service health
 * and temporarily disabling calls to failing services.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.errorThresholdPercentage = options.errorThresholdPercentage || 50; // 50% failure rate
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute default

    // Circuit breaker state
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;

    // Statistics
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      circuitOpens: 0,
      lastStateChange: new Date().toISOString()
    };

    logger.info('Circuit breaker initialized', {
      timeout: this.timeout,
      errorThresholdPercentage: this.errorThresholdPercentage,
      resetTimeout: this.resetTimeout
    });
  }

  /**
   * Execute function through circuit breaker
   */
  async execute(fn) {
    this.stats.totalRequests++;

    // Check if circuit should be reset
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.setState('HALF_OPEN');
      logger.info('Circuit breaker transitioning to HALF_OPEN state');
    }

    // Reject immediately if circuit is open
    if (this.state === 'OPEN') {
      const error = new Error('Circuit breaker is OPEN - service temporarily unavailable');
      error.code = 'CIRCUIT_BREAKER_OPEN';
      error.retryAfter = Math.ceil((this.nextAttempt - Date.now()) / 1000);
      throw error;
    }

    try {
      // Execute the function with timeout
      const result = await this.executeWithTimeout(fn);

      // Handle success
      this.onSuccess();
      return result;

    } catch (error) {
      // Handle failure
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Function execution timeout'));
      }, this.timeout);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.requestCount++;
    this.successCount++;
    this.stats.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      // Service appears to be healthy again
      this.setState('CLOSED');
      logger.info('Circuit breaker transitioning to CLOSED state after successful test');
    }

    // Reset failure count after enough successes in half-open state
    if (this.state === 'HALF_OPEN' && this.successCount >= 3) {
      this.reset();
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.requestCount++;
    this.failureCount++;
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();

    // Log the failure
    logger.debug('Circuit breaker recorded failure', {
      state: this.state,
      failureCount: this.failureCount,
      requestCount: this.requestCount,
      error: error.message
    });

    // Check if we should open the circuit
    const failureRate = this.requestCount > 0 ? (this.failureCount / this.requestCount) * 100 : 0;

    if (failureRate >= this.errorThresholdPercentage) {
      if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
        this.setState('OPEN');
        this.stats.circuitOpens++;

        logger.warn('Circuit breaker OPENED due to high failure rate', {
          failureRate: failureRate.toFixed(2),
          failureCount: this.failureCount,
          requestCount: this.requestCount,
          threshold: this.errorThresholdPercentage
        });
      }
    }
  }

  /**
   * Set circuit breaker state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stats.lastStateChange = new Date().toISOString();

    if (newState === 'OPEN') {
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.warn('Circuit breaker OPENED', {
        resetTimeout: this.resetTimeout,
        nextAttempt: new Date(this.nextAttempt).toISOString(),
        failureCount: this.failureCount,
        requestCount: this.requestCount
      });
    } else if (newState === 'CLOSED') {
      this.reset();
      logger.info('Circuit breaker CLOSED - service is healthy');
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.state = 'CLOSED';
  }

  /**
   * Check if circuit is open
   */
  isOpen() {
    return this.state === 'OPEN';
  }

  /**
   * Get current circuit breaker state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      failureRate: this.requestCount > 0 ? (this.failureCount / this.requestCount) * 100 : 0,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextAttempt: this.nextAttempt ? new Date(this.nextAttempt).toISOString() : null,
      stats: { ...this.stats },
      config: {
        timeout: this.timeout,
        errorThresholdPercentage: this.errorThresholdPercentage,
        resetTimeout: this.resetTimeout
      }
    };
  }

  /**
   * Force open the circuit (for testing or manual intervention)
   */
  forceOpen() {
    this.setState('OPEN');
    logger.warn('Circuit breaker manually forced OPEN');
  }

  /**
   * Force close the circuit (for testing or manual intervention)
   */
  forceClose() {
    this.setState('CLOSED');
    logger.info('Circuit breaker manually forced CLOSED');
  }

  /**
   * Get detailed metrics
   */
  getMetrics() {
    const now = Date.now();
    const uptime = this.stats.lastStateChange ? now - new Date(this.stats.lastStateChange).getTime() : 0;

    return {
      state: this.state,
      uptime: uptime,
      failureRate: this.requestCount > 0 ? (this.failureCount / this.requestCount) * 100 : 0,
      requestsPerMinute: this.calculateRequestsPerMinute(),
      healthScore: this.calculateHealthScore(),
      ...this.getState()
    };
  }

  /**
   * Calculate requests per minute
   */
  calculateRequestsPerMinute() {
    // This is a simplified calculation - in production you'd track timestamps
    return Math.round(this.stats.totalRequests / Math.max(1, uptime / 60000));
  }

  /**
   * Calculate health score (0-100)
   */
  calculateHealthScore() {
    if (this.state === 'OPEN') {
      return 0;
    }

    if (this.state === 'HALF_OPEN') {
      return 50;
    }

    const failureRate = this.requestCount > 0 ? (this.failureCount / this.requestCount) * 100 : 0;
    return Math.max(0, 100 - failureRate);
  }
}

module.exports = CircuitBreaker;