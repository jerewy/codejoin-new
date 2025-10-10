/**
 * AI Service Manager
 *
 * Central orchestration layer for AI providers with intelligent
 * failover, load balancing, and provider selection strategies.
 */

const { AIProvider, AIResponse, ProviderConfig } = require('./provider-interface');
const { circuitBreakerFactory } = require('./circuit-breaker');
const { retryManagerFactory } = require('./retry-manager');
const logger = require('../utils/logger');

/**
 * Provider Selection Strategies
 */
const SelectionStrategy = {
  PRIORITY: 'priority',           // Use highest priority healthy provider
  ROUND_ROBIN: 'round_robin',     // Rotate through healthy providers
  WEIGHTED: 'weighted',           // Use weights for provider selection
  LEAST_LATENCY: 'least_latency', // Use provider with lowest latency
  LEAST_COST: 'least_cost',       // Use provider with lowest cost
  BEST_QUALITY: 'best_quality'    // Use provider with best quality score
};

/**
 * AI Service Manager
 */
class AIServiceManager {
  constructor(options = {}) {
    this.providers = new Map();
    this.selectionStrategy = options.selectionStrategy || SelectionStrategy.PRIORITY;
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.enableCaching = options.enableCaching !== false;
    this.enableFallbacks = options.enableFallbacks !== false;

    // Circuit breaker and retry manager (less aggressive configuration)
    this.circuitBreaker = circuitBreakerFactory.get('ai-service-manager', {
      failureThreshold: 8, // Increased from 3 to 8
      resetTimeout: 30000  // Reduced from 60s to 30s
    });

    this.retryManager = retryManagerFactory.get('ai-service-manager', {
      maxRetries: 5, // Increased from 3 to 5
      strategy: 'exp_jitter'
    });

    // Provider rotation for round-robin
    this.roundRobinIndex = 0;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbacksUsed: 0,
      cacheHits: 0,
      totalCost: 0,
      totalLatency: 0
    };

    logger.info('AI Service Manager initialized', {
      selectionStrategy: this.selectionStrategy,
      defaultTimeout: this.defaultTimeout,
      enableCaching: this.enableCaching,
      enableFallbacks: this.enableFallbacks
    });
  }

  /**
   * Register an AI provider
   * @param {AIProvider} provider - Provider instance
   * @param {Object} options - Provider options
   */
  registerProvider(provider, options = {}) {
    const config = {
      enabled: options.enabled !== false,
      priority: options.priority || 1,
      weight: options.weight || 1,
      costPerToken: options.costPerToken || 0.001,
      maxConcurrency: options.maxConcurrency || 10,
      rateLimit: options.rateLimit || { requests: 60, window: 60000 },
      quality: options.quality || 0.9,
      ...options
    };

    this.providers.set(provider.name, {
      provider,
      config,
      stats: {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageLatency: 0,
        totalCost: 0,
        lastUsed: null
      }
    });

    logger.info(`AI provider registered: ${provider.name}`, {
      priority: config.priority,
      weight: config.weight,
      enabled: config.enabled
    });
  }

  /**
   * Remove a provider
   * @param {string} providerName - Name of provider to remove
   */
  removeProvider(providerName) {
    if (this.providers.has(providerName)) {
      this.providers.delete(providerName);
      logger.info(`AI provider removed: ${providerName}`);
    }
  }

  /**
   * Generate AI response with intelligent provider selection
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    this.metrics.totalRequests++;

    logger.info(`AI request started: ${requestId}`, {
      promptLength: prompt.length,
      context: Object.keys(context),
      options
    });

    try {
      // Check cache first if enabled
      if (this.enableCaching) {
        const cachedResponse = await this.checkCache(prompt, context);
        if (cachedResponse) {
          this.metrics.cacheHits++;
          logger.debug(`Cache hit for request: ${requestId}`);
          return cachedResponse;
        }
      }

      // Execute with circuit breaker and retry logic
      const response = await this.circuitBreaker.execute(
        () => this.executeWithFailover(prompt, context, options),
        { requestId, prompt: prompt.substring(0, 100) }
      );

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(response, responseTime);

      // Cache response if enabled
      if (this.enableCaching && response) {
        await this.cacheResponse(prompt, context, response);
      }

      logger.info(`AI request completed: ${requestId}`, {
        provider: response.provider,
        responseTime,
        tokensUsed: response.tokensUsed,
        cost: response.cost
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.failedRequests++;

      logger.error(`AI request failed: ${requestId}`, {
        error: error.message,
        responseTime,
        stack: error.stack
      });

      // Try fallback responses if enabled
      if (this.enableFallbacks) {
        const fallbackResponse = await this.getFallbackResponse(prompt, context, error);
        if (fallbackResponse) {
          this.metrics.fallbacksUsed++;
          logger.info(`Fallback response used for request: ${requestId}`);
          return fallbackResponse;
        }
      }

      throw this.enhanceError(error, requestId, prompt, context);
    }
  }

  /**
   * Execute request with automatic failover
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async executeWithFailover(prompt, context, options) {
    const selectedProviders = this.selectProviders();
    let lastError = null;

    for (const { provider, config } of selectedProviders) {
      if (!config.enabled) {
        continue;
      }

      try {
        // Check if provider is healthy
        const isHealthy = await provider.isHealthy();
        if (!isHealthy) {
          logger.warn(`Provider ${provider.name} is unhealthy, skipping`);
          continue;
        }

        // Execute request with retry logic
        const response = await this.retryManager.executeWithRetry(
          () => this.executeProvider(provider, prompt, context, options),
          { provider: provider.name, prompt: prompt.substring(0, 100) }
        );

        // Update provider stats
        this.updateProviderStats(provider.name, response, true);

        return response;

      } catch (error) {
        lastError = error;
        logger.warn(`Provider ${provider.name} failed`, {
          error: error.message
        });

        // Update provider error stats
        this.updateProviderStats(provider.name, null, false, error);

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Execute request on specific provider
   * @param {AIProvider} provider - Provider to use
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async executeProvider(provider, prompt, context, options) {
    const startTime = Date.now();

    try {
      const response = await provider.generateResponse(prompt, context, {
        timeout: this.defaultTimeout,
        ...options
      });

      const responseTime = Date.now() - startTime;

      // Enhance response with metadata
      response.latency = responseTime;
      response.provider = provider.name;

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Enhance error with provider information
      error.provider = provider.name;
      error.responseTime = responseTime;

      throw error;
    }
  }

  /**
   * Select providers based on strategy
   * @returns {Array} Sorted list of providers
   */
  selectProviders() {
    const providers = Array.from(this.providers.values());

    switch (this.selectionStrategy) {
      case SelectionStrategy.PRIORITY:
        return providers
          .filter(p => p.config.enabled)
          .sort((a, b) => a.config.priority - b.config.priority);

      case SelectionStrategy.ROUND_ROBIN:
        const enabledProviders = providers.filter(p => p.config.enabled);
        const index = this.roundRobinIndex % enabledProviders.length;
        this.roundRobinIndex++;
        return [
          enabledProviders[index],
          ...enabledProviders.filter((_, i) => i !== index)
        ];

      case SelectionStrategy.WEIGHTED:
        return providers
          .filter(p => p.config.enabled)
          .sort((a, b) => b.config.weight - a.config.weight);

      case SelectionStrategy.LEAST_LATENCY:
        return providers
          .filter(p => p.config.enabled)
          .sort((a, b) => a.stats.averageLatency - b.stats.averageLatency);

      case SelectionStrategy.LEAST_COST:
        return providers
          .filter(p => p.config.enabled)
          .sort((a, b) => a.config.costPerToken - b.config.costPerToken);

      case SelectionStrategy.BEST_QUALITY:
        return providers
          .filter(p => p.config.enabled)
          .sort((a, b) => b.config.quality - a.config.quality);

      default:
        return providers.filter(p => p.config.enabled);
    }
  }

  /**
   * Update provider statistics
   * @param {string} providerName - Provider name
   * @param {AIResponse} response - Response (null if failed)
   * @param {boolean} success - Whether request was successful
   * @param {Error} error - Error if failed
   */
  updateProviderStats(providerName, response, success, error = null) {
    const providerInfo = this.providers.get(providerName);
    if (!providerInfo) return;

    const stats = providerInfo.stats;
    stats.requestCount++;

    if (success && response) {
      stats.successCount++;
      stats.totalCost += response.cost || 0;

      // Update average latency
      if (response.latency) {
        stats.averageLatency = (stats.averageLatency * (stats.successCount - 1) + response.latency) / stats.successCount;
      }
    } else {
      stats.errorCount++;
    }

    stats.lastUsed = new Date();
  }

  /**
   * Update service metrics
   * @param {AIResponse} response - AI response
   * @param {number} responseTime - Response time
   */
  updateMetrics(response, responseTime) {
    this.metrics.successfulRequests++;
    this.metrics.totalLatency += responseTime;
    this.metrics.totalCost += response.cost || 0;
  }

  /**
   * Check cache for existing response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Promise<AIResponse|null>} Cached response or null
   */
  async checkCache(prompt, context) {
    // TODO: Implement actual caching
    // This would integrate with the response cache system
    return null;
  }

  /**
   * Cache a response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {AIResponse} response - Response to cache
   */
  async cacheResponse(prompt, context, response) {
    // TODO: Implement actual caching
    // This would integrate with the response cache system
  }

  /**
   * Get fallback response when all providers fail
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Error} error - Original error
   * @returns {Promise<AIResponse|null>} Fallback response
   */
  async getFallbackResponse(prompt, context, error) {
    // TODO: Implement fallback responses
    // This would integrate with the graceful degradation system
    return null;
  }

  /**
   * Enhance error with additional context
   * @param {Error} error - Original error
   * @param {string} requestId - Request ID
   * @param {string} prompt - Original prompt
   * @param {Object} context - Original context
   * @returns {Error} Enhanced error
   */
  enhanceError(error, requestId, prompt, context) {
    const enhancedError = new Error(`AI service error: ${error.message}`);
    enhancedError.name = 'AIServiceError';
    enhancedError.originalError = error;
    enhancedError.requestId = requestId;
    enhancedError.prompt = prompt;
    enhancedError.context = context;
    enhancedError.providers = Array.from(this.providers.keys());
    enhancedError.code = error.code || 'AI_SERVICE_ERROR';

    return enhancedError;
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get health status of all providers
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    const health = {
      overall: 'healthy',
      providers: {},
      circuitBreaker: this.circuitBreaker.getStatus(),
      metrics: this.getMetrics()
    };

    let healthyProviders = 0;
    let totalProviders = 0;

    for (const [name, { provider, config, stats }] of this.providers) {
      totalProviders++;
      const isHealthy = config.enabled && await provider.isHealthy();

      if (isHealthy) {
        healthyProviders++;
      }

      health.providers[name] = {
        enabled: config.enabled,
        healthy: isHealthy,
        priority: config.priority,
        stats,
        metrics: provider.getMetrics()
      };
    }

    health.overall = healthyProviders > 0 ? 'healthy' : 'unhealthy';
    health.healthyProviders = healthyProviders;
    health.totalProviders = totalProviders;

    return health;
  }

  /**
   * Get service metrics
   * @returns {Object} Service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageLatency: this.metrics.successfulRequests > 0
        ? this.metrics.totalLatency / this.metrics.successfulRequests
        : 0,
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 0,
      cacheHitRate: this.metrics.totalRequests > 0
        ? this.metrics.cacheHits / this.metrics.totalRequests
        : 0,
      averageCost: this.metrics.successfulRequests > 0
        ? this.metrics.totalCost / this.metrics.successfulRequests
        : 0
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbacksUsed: 0,
      cacheHits: 0,
      totalCost: 0,
      totalLatency: 0
    };

    // Reset provider stats
    for (const { stats } of this.providers.values()) {
      Object.assign(stats, {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageLatency: 0,
        totalCost: 0,
        lastUsed: null
      });
    }
  }
}

module.exports = {
  AIServiceManager,
  SelectionStrategy
};