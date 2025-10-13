/**
 * Enhanced Error Handling Middleware
 *
 * Comprehensive error handling with intelligent error categorization,
 * recovery suggestions, and detailed error reporting.
 */

const logger = require('../utils/logger');
const { healthMonitorFactory } = require('../monitoring/health-monitor');

/**
 * Error Categories
 */
const ErrorCategory = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  RATE_LIMIT: 'rate_limit',
  EXTERNAL_SERVICE: 'external_service',
  INTERNAL_ERROR: 'internal_error',
  DOCKER_ERROR: 'docker_error',
  AI_SERVICE_ERROR: 'ai_service_error',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

/**
 * Enhanced Error Handler
 */
class EnhancedErrorHandler {
  constructor(options = {}) {
    this.enableDetailedErrors = options.enableDetailedErrors || process.env.NODE_ENV !== 'production';
    this.enableRecoverySuggestions = options.enableRecoverySuggestions !== false;
    this.enableMetrics = options.enableMetrics !== false;
    this.errorMetrics = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsByCode: {},
      recentErrors: []
    };

    // Initialize health monitors for critical services - DISABLED to prevent quota consumption
    // Only monitor Docker service, not AI providers to avoid consuming API quota
    this.dockerHealthMonitor = healthMonitorFactory.get('docker-service', {
      checkInterval: 60000, // 1 minute instead of 30 seconds
      maxConsecutiveFailures: 3,
      recoveryStrategies: [
        this.dockerRecoveryStrategy.bind(this)
      ]
    });

    // AI service health monitoring disabled to prevent API quota consumption
    // this.aiServiceHealthMonitor = healthMonitorFactory.get('ai-service', {
    //   checkInterval: 300000, // 5 minutes
    //   maxConsecutiveFailures: 5,
    //   recoveryStrategies: [
    //     this.aiServiceRecoveryStrategy.bind(this)
    //   ]
    // });

    logger.info('Enhanced error handler initialized');
  }

  /**
   * Main error handling middleware
   */
  handle() {
    return (error, req, res, next) => {
      const enhancedError = this.enhanceError(error, req);
      this.trackError(enhancedError, req);

      const errorResponse = this.buildErrorResponse(enhancedError, req);

      // Log error with context
      this.logError(enhancedError, req, errorResponse);

      // Send error response
      res.status(errorResponse.status).json(errorResponse.body);

      // Trigger recovery mechanisms if needed
      this.triggerRecoveryIfNeeded(enhancedError);
    };
  }

  /**
   * Enhance error with additional context
   * @param {Error} error - Original error
   * @param {Object} req - Express request object
   * @returns {Object} Enhanced error
   */
  enhanceError(error, req) {
    const enhanced = {
      originalError: error,
      message: error.message || 'Internal Server Error',
      code: error.code || 'INTERNAL_ERROR',
      category: this.categorizeError(error),
      severity: this.determineSeverity(error),
      timestamp: new Date().toISOString(),
      requestId: req.id || req.headers['x-request-id'],
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      recoverable: this.isRecoverable(error),
      recoverySuggestions: this.getRecoverySuggestions(error),
      context: {
        headers: this.sanitizeHeaders(req.headers),
        query: req.query,
        params: req.params
      }
    };

    // Add stack trace in development
    if (this.enableDetailedErrors && error.stack) {
      enhanced.stack = error.stack;
    }

    // Add service-specific information
    if (error.service) {
      enhanced.service = error.service;
    }

    // Add retry information
    if (error.attempts !== undefined) {
      enhanced.attempts = error.attempts;
      enhanced.maxRetries = error.maxRetries;
    }

    return enhanced;
  }

  /**
   * Categorize error based on type and message
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message ? error.message.toLowerCase() : '';
    const code = error.code || '';

    // Docker errors
    if (code === 'DOCKER_IN_BACKOFF' || message.includes('docker') || message.includes('container')) {
      return ErrorCategory.DOCKER_ERROR;
    }

    // AI service errors
    if (message.includes('gemini') || message.includes('anthropic') || message.includes('openai') ||
        code.includes('ai') || code.includes('model') || message.includes('generatecontent')) {
      return ErrorCategory.AI_SERVICE_ERROR;
    }

    // Authentication errors
    if (code === 'AUTH_ERROR' || message.includes('authentication') || message.includes('unauthorized')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Authorization errors
    if (code === 'FORBIDDEN' || message.includes('authorization') || message.includes('permission')) {
      return ErrorCategory.AUTHORIZATION;
    }

    // Rate limit errors
    if (code === 'RATE_LIMIT' || message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }

    // Validation errors
    if (code === 'VALIDATION_ERROR' || message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    // Network errors
    if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' ||
        message.includes('network') || message.includes('connection')) {
      return ErrorCategory.NETWORK_ERROR;
    }

    // Timeout errors
    if (code === 'TIMEOUT' || message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }

    // Circuit breaker errors
    if (code === 'CIRCUIT_OPEN' || message.includes('circuit breaker')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    // Retry exhausted errors
    if (code === 'RETRY_EXHAUSTED' || message.includes('retry')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    return ErrorCategory.INTERNAL_ERROR;
  }

  /**
   * Determine error severity
   * @param {Error} error - Error to assess
   * @returns {string} Error severity
   */
  determineSeverity(error) {
    const category = this.categorizeError(error);

    switch (category) {
      case ErrorCategory.DOCKER_ERROR:
      case ErrorCategory.AI_SERVICE_ERROR:
      case ErrorCategory.EXTERNAL_SERVICE:
        return 'high';

      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.RATE_LIMIT:
        return 'medium';

      case ErrorCategory.VALIDATION:
      case ErrorCategory.NETWORK_ERROR:
      case ErrorCategory.TIMEOUT:
        return 'medium';

      case ErrorCategory.INTERNAL_ERROR:
        return 'critical';

      default:
        return 'medium';
    }
  }

  /**
   * Check if error is recoverable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is recoverable
   */
  isRecoverable(error) {
    const category = this.categorizeError(error);
    const recoverableCategories = [
      ErrorCategory.DOCKER_ERROR,
      ErrorCategory.AI_SERVICE_ERROR,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.NETWORK_ERROR,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RATE_LIMIT
    ];

    return recoverableCategories.includes(category);
  }

  /**
   * Get recovery suggestions for error
   * @param {Error} error - Error to get suggestions for
   * @returns {Array} Recovery suggestions
   */
  getRecoverySuggestions(error) {
    const suggestions = [];
    const category = this.categorizeError(error);

    switch (category) {
      case ErrorCategory.DOCKER_ERROR:
        suggestions.push({
          action: 'check_docker',
          description: 'Verify Docker Desktop is running and accessible',
          priority: 'high'
        });
        suggestions.push({
          action: 'restart_docker',
          description: 'Restart Docker Desktop if issues persist',
          priority: 'medium'
        });
        break;

      case ErrorCategory.AI_SERVICE_ERROR:
        suggestions.push({
          action: 'check_api_key',
          description: 'Verify AI service API keys are valid',
          priority: 'high'
        });
        suggestions.push({
          action: 'check_model_availability',
          description: 'Verify AI model is available and not deprecated',
          priority: 'high'
        });
        suggestions.push({
          action: 'retry_later',
          description: 'Try again in a few minutes',
          priority: 'medium'
        });
        break;

      case ErrorCategory.RATE_LIMIT:
        suggestions.push({
          action: 'wait_and_retry',
          description: 'Wait before making another request',
          priority: 'high'
        });
        break;

      case ErrorCategory.NETWORK_ERROR:
        suggestions.push({
          action: 'check_connection',
          description: 'Verify network connectivity',
          priority: 'high'
        });
        suggestions.push({
          action: 'retry_later',
          description: 'Try again when network is stable',
          priority: 'medium'
        });
        break;

      case ErrorCategory.TIMEOUT:
        suggestions.push({
          action: 'retry_later',
          description: 'Try again with a shorter timeout',
          priority: 'medium'
        });
        break;
    }

    return suggestions;
  }

  /**
   * Build error response object
   * @param {Object} enhancedError - Enhanced error object
   * @param {Object} req - Express request object
   * @returns {Object} Error response
   */
  buildErrorResponse(enhancedError, req) {
    const status = this.getHttpStatusCode(enhancedError);
    const body = {
      success: false,
      error: {
        code: enhancedError.code,
        message: enhancedError.message,
        category: enhancedError.category,
        severity: enhancedError.severity,
        timestamp: enhancedError.timestamp
      }
    };

    // Add request ID if available
    if (enhancedError.requestId) {
      body.error.requestId = enhancedError.requestId;
    }

    // Add recovery suggestions if enabled
    if (this.enableRecoverySuggestions && enhancedError.recoverable && enhancedError.recoverySuggestions.length > 0) {
      body.error.recoverySuggestions = enhancedError.recoverySuggestions;
    }

    // Add detailed information in development
    if (this.enableDetailedErrors) {
      body.error.context = enhancedError.context;
      body.error.recoverable = enhancedError.recoverable;

      if (enhancedError.stack) {
        body.error.stack = enhancedError.stack;
      }
    }

    return { status, body };
  }

  /**
   * Get appropriate HTTP status code for error
   * @param {Object} enhancedError - Enhanced error object
   * @returns {number} HTTP status code
   */
  getHttpStatusCode(enhancedError) {
    const category = enhancedError.category;

    switch (category) {
      case ErrorCategory.VALIDATION:
        return 400;

      case ErrorCategory.AUTHENTICATION:
        return 401;

      case ErrorCategory.AUTHORIZATION:
        return 403;

      case ErrorCategory.RATE_LIMIT:
        return 429;

      case ErrorCategory.DOCKER_ERROR:
      case ErrorCategory.AI_SERVICE_ERROR:
      case ErrorCategory.EXTERNAL_SERVICE:
        return 503;

      case ErrorCategory.TIMEOUT:
        return 408;

      case ErrorCategory.NETWORK_ERROR:
        return 502;

      case ErrorCategory.INTERNAL_ERROR:
        return 500;

      default:
        return 500;
    }
  }

  /**
   * Log error with context
   * @param {Object} enhancedError - Enhanced error object
   * @param {Object} req - Express request object
   * @param {Object} errorResponse - Error response object
   */
  logError(enhancedError, req, errorResponse) {
    const logLevel = enhancedError.severity === 'critical' ? 'error' :
                    enhancedError.severity === 'high' ? 'error' : 'warn';

    logger[logLevel](`Error in ${req.method} ${req.path}`, {
      error: enhancedError.message,
      code: enhancedError.code,
      category: enhancedError.category,
      severity: enhancedError.severity,
      status: errorResponse.status,
      requestId: enhancedError.requestId,
      path: req.path,
      method: req.method,
      ip: enhancedError.ip,
      userAgent: enhancedError.userAgent,
      recoverable: enhancedError.recoverable
    });
  }

  /**
   * Track error metrics
   * @param {Object} enhancedError - Enhanced error object
   * @param {Object} req - Express request object
   */
  trackError(enhancedError, req) {
    if (!this.enableMetrics) return;

    this.errorMetrics.totalErrors++;

    // Track by category
    if (!this.errorMetrics.errorsByCategory[enhancedError.category]) {
      this.errorMetrics.errorsByCategory[enhancedError.category] = 0;
    }
    this.errorMetrics.errorsByCategory[enhancedError.category]++;

    // Track by code
    if (!this.errorMetrics.errorsByCode[enhancedError.code]) {
      this.errorMetrics.errorsByCode[enhancedError.code] = 0;
    }
    this.errorMetrics.errorsByCode[enhancedError.code]++;

    // Track recent errors (keep last 100)
    this.errorMetrics.recentErrors.push({
      timestamp: enhancedError.timestamp,
      category: enhancedError.category,
      code: enhancedError.code,
      message: enhancedError.message,
      path: req.path,
      method: req.method
    });

    if (this.errorMetrics.recentErrors.length > 100) {
      this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.slice(-100);
    }
  }

  /**
   * Trigger recovery mechanisms if needed
   * @param {Object} enhancedError - Enhanced error object
   */
  triggerRecoveryIfNeeded(enhancedError) {
    if (!enhancedError.recoverable) return;

    const category = enhancedError.category;

    switch (category) {
      case ErrorCategory.DOCKER_ERROR:
        // Docker health monitor will handle recovery
        break;

      case ErrorCategory.AI_SERVICE_ERROR:
        // AI service health monitor will handle recovery
        break;

      case ErrorCategory.EXTERNAL_SERVICE:
        // Reset circuit breakers for external services
        const { circuitBreakerFactory } = require('../ai/circuit-breaker');
        circuitBreakerFactory.resetAll();
        break;
    }
  }

  /**
   * Docker recovery strategy
   * @param {Object} monitor - Health monitor instance
   * @param {Array} results - Health check results
   */
  async dockerRecoveryStrategy(monitor, results) {
    logger.info('Executing Docker recovery strategy');

    try {
      // Reset Docker service connection state
      const DockerService = require('../services/dockerService');
      const dockerService = new DockerService();

      // Force reset connection state
      dockerService.connectionState.isAvailable = null;
      dockerService.connectionState.consecutiveFailures = 0;
      dockerService.connectionState.backoffMs = 500;

      logger.info('Docker service connection state reset');
    } catch (error) {
      logger.error('Docker recovery strategy failed', { error: error.message });
      throw error;
    }
  }

  /**
   * AI service recovery strategy
   * @param {Object} monitor - Health monitor instance
   * @param {Array} results - Health check results
   */
  async aiServiceRecoveryStrategy(monitor, results) {
    logger.info('Executing AI service recovery strategy');

    try {
      // Reset circuit breakers
      const { circuitBreakerFactory } = require('../ai/circuit-breaker');
      circuitBreakerFactory.resetAll();

      // Reinitialize AI providers if needed
      const AIChatController = require('../controllers/aiChatController');
      // Note: This would need to be implemented in the AIChatController
      logger.info('AI service circuit breakers reset');
    } catch (error) {
      logger.error('AI service recovery strategy failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Sanitize headers for logging
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get error metrics
   * @returns {Object} Error metrics
   */
  getErrorMetrics() {
    return { ...this.errorMetrics };
  }

  /**
   * Reset error metrics
   */
  resetErrorMetrics() {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsByCode: {},
      recentErrors: []
    };
  }
}

// Global enhanced error handler instance
const enhancedErrorHandler = new EnhancedErrorHandler();

module.exports = {
  EnhancedErrorHandler,
  ErrorCategory,
  enhancedErrorHandler
};