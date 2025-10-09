/**
 * Circuit Breaker Implementation
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when external AI services are experiencing issues.
 */

const logger = require('../utils/logger');

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation, requests pass through
  OPEN: 'OPEN',         // Circuit is open, requests fail immediately
  HALF_OPEN: 'HALF_OPEN' // Testing if service has recovered
};

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5; // Failures before opening
    this.resetTimeout = options.resetTimeout || 60000;     // 60 seconds
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttempt = null;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };

    // Event handlers
    this.onStateChange = options.onStateChange || (() => {});
    this.onFailure = options.onFailure || (() => {});
    this.onSuccess = options.onSuccess || (() => {});

    logger.info(`Circuit breaker initialized: ${this.name}`, {
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout
    });
  }

  /**
   * Execute an operation through the circuit breaker
   * @param {Function} operation - The operation to execute
   * @param {Object} context - Context for logging
   * @returns {Promise} Result of the operation
   */
  async execute(operation, context = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    logger.debug(`Circuit breaker request: ${this.name}`, {
      requestId,
      state: this.state,
      context
    });

    this.metrics.totalRequests++;

    try {
      // Check if circuit is open
      if (this.state === CircuitState.OPEN) {
        if (this.shouldAttemptReset()) {
          this.setState(CircuitState.HALF_OPEN, 'Attempting reset');
        } else {
          this.metrics.rejectedRequests++;
          const waitTime = this.getNextAttemptTime();

          logger.warn(`Circuit breaker rejecting request: ${this.name}`, {
            requestId,
            waitTime,
            state: this.state
          });

          throw new CircuitBreakerError(
            `Circuit breaker is OPEN for ${this.name}. Next attempt in ${waitTime}ms`,
            'CIRCUIT_OPEN',
            { waitTime, requestId }
          );
        }
      }

      // Execute the operation
      const result = await operation();
      const responseTime = Date.now() - startTime;

      this.onSuccess(result, responseTime, context);
      this.recordSuccess(responseTime);

      logger.debug(`Circuit breaker request succeeded: ${this.name}`, {
        requestId,
        responseTime,
        state: this.state
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.onFailure(error, responseTime, context);
      this.recordFailure(error);

      logger.error(`Circuit breaker request failed: ${this.name}`, {
        requestId,
        responseTime,
        error: error.message,
        state: this.state,
        failureCount: this.failureCount
      });

      throw error;
    }
  }

  /**
   * Record a successful operation
   * @param {number} responseTime - Response time in milliseconds
   */
  recordSuccess(responseTime) {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    this.metrics.successfulRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.successfulRequests;

    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.CLOSED, 'Service recovered');
      this.resetCounters();
    }
  }

  /**
   * Record a failed operation
   * @param {Error} error - The error that occurred
   */
  recordFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.metrics.failedRequests++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN, 'Service still failing');
    } else if (this.failureCount >= this.failureThreshold) {
      this.setState(CircuitState.OPEN, `Failure threshold reached (${this.failureThreshold})`);
    }
  }

  /**
   * Set the circuit breaker state
   * @param {string} newState - New state
   * @param {string} reason - Reason for state change
   */
  setState(newState, reason) {
    const oldState = this.state;
    this.state = newState;
    this.metrics.stateChanges++;

    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.resetTimeout;
    }

    logger.info(`Circuit breaker state changed: ${this.name}`, {
      from: oldState,
      to: newState,
      reason,
      failureCount: this.failureCount,
      successCount: this.successCount
    });

    this.onStateChange(newState, oldState, reason);
  }

  /**
   * Check if we should attempt to reset the circuit
   * @returns {boolean} True if we should attempt reset
   */
  shouldAttemptReset() {
    return Date.now() >= this.nextAttempt;
  }

  /**
   * Get time until next attempt
   * @returns {number} Milliseconds until next attempt
   */
  getNextAttemptTime() {
    if (this.state !== CircuitState.OPEN) {
      return 0;
    }
    return Math.max(0, this.nextAttempt - Date.now());
  }

  /**
   * Reset failure and success counters
   */
  resetCounters() {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
  }

  /**
   * Force reset the circuit breaker
   */
  forceReset() {
    this.setState(CircuitState.CLOSED, 'Manual reset');
    this.resetCounters();
    this.nextAttempt = null;
  }

  /**
   * Get current circuit breaker metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.nextAttempt,
      nextAttemptIn: this.getNextAttemptTime(),
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 0,
      failureRate: this.metrics.totalRequests > 0
        ? this.metrics.failedRequests / this.metrics.totalRequests
        : 0
    };
  }

  /**
   * Check if circuit breaker is healthy
   * @returns {boolean} True if healthy
   */
  isHealthy() {
    return this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Generate a unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get circuit breaker status for health checks
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      isHealthy: this.isHealthy(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptIn: this.getNextAttemptTime(),
      metrics: this.getMetrics()
    };
  }
}

/**
 * Circuit Breaker Error
 */
class CircuitBreakerError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.code = code;
    this.details = details;
    this.isCircuitBreakerError = true;
  }
}

/**
 * Circuit Breaker Factory
 */
class CircuitBreakerFactory {
  constructor() {
    this.circuitBreakers = new Map();
  }

  /**
   * Get or create a circuit breaker
   * @param {string} name - Circuit breaker name
   * @param {Object} options - Circuit breaker options
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  get(name, options = {}) {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker({ name, ...options }));
    }
    return this.circuitBreakers.get(name);
  }

  /**
   * Get all circuit breakers
   * @returns {Map} All circuit breakers
   */
  getAll() {
    return this.circuitBreakers;
  }

  /**
   * Get health status of all circuit breakers
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const status = {};
    this.circuitBreakers.forEach((breaker, name) => {
      status[name] = breaker.getStatus();
    });
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    this.circuitBreakers.forEach((breaker) => {
      breaker.forceReset();
    });
  }
}

// Global circuit breaker factory instance
const circuitBreakerFactory = new CircuitBreakerFactory();

module.exports = {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerFactory,
  CircuitState,
  circuitBreakerFactory
};