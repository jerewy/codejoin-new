/**
 * Gemini-Only AI Service Manager
 *
 * Streamlined service manager that uses only Google Gemini AI provider
 * with optimized configuration for single-provider architecture.
 */

const { AIServiceManager, SelectionStrategy } = require('../ai/ai-service-manager');
const { ProviderHealthMonitor } = require('../ai/provider-health-monitor');
const { ResponseCache } = require('../ai/response-cache');
const GeminiProvider = require('../ai/providers/gemini-provider');
const FallbackProvider = require('../ai/providers/fallback-provider');
const logger = require('../utils/logger');

class GeminiOnlyAIServiceManager {
  constructor(options = {}) {
    this.options = {
      enableHealthMonitoring: options.enableHealthMonitoring !== false,
      enableResponseCache: options.enableResponseCache !== false,
      enableFallbackProvider: options.enableFallbackProvider !== false,
      healthCheckInterval: options.healthCheckInterval || 30000, // Reduced for single provider
      cacheSize: options.cacheSize || 500, // Reduced cache for focused usage
      ...options
    };

    // Initialize core components with Gemini-optimized settings
    this.aiServiceManager = new AIServiceManager({
      selectionStrategy: SelectionStrategy.PRIORITY, // Fixed for single provider
      enableCaching: this.options.enableResponseCache,
      enableFallbacks: this.options.enableFallbackProvider,
      defaultTimeout: 25000 // Reduced timeout for better responsiveness
    });

    // Initialize health monitor
    this.healthMonitor = new ProviderHealthMonitor({
      checkInterval: this.options.healthCheckInterval,
      failureThreshold: 2, // Lower threshold for faster detection
      recoveryThreshold: 1 // Faster recovery
    });

    // Initialize response cache
    this.responseCache = new ResponseCache({
      maxSize: this.options.cacheSize,
      ttl: 1800000 // 30 minutes cache
    });

    // Initialize providers
    this.providers = new Map();
    this.fallbackProvider = null;

    // Metrics
    this.metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbackResponses: 0,
      averageResponseTime: 0
    };

    // Initialize Gemini-only provider setup
    this.initializeGeminiProvider();

    logger.info('Gemini-Only AI Service Manager initialized', {
      enableHealthMonitoring: this.options.enableHealthMonitoring,
      enableResponseCache: this.options.enableResponseCache,
      enableFallbackProvider: this.options.enableFallbackProvider,
      healthCheckInterval: this.options.healthCheckInterval
    });
  }

  /**
   * Initialize Gemini provider only
   */
  initializeGeminiProvider() {
    try {
      // Initialize Gemini provider with optimized configuration
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
        const geminiProvider = new GeminiProvider({
          model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
          timeout: 25000, // Optimized timeout
          maxRetries: 2 // Reduced retries for faster failover
        });

        // Register Gemini with highest priority
        this.aiServiceManager.registerProvider(geminiProvider, {
          priority: 1, // Highest and only priority
          weight: 1,
          costPerToken: 0.00000025, // Gemini pricing
          quality: 0.9,
          maxConcurrency: 15, // Increased for single provider
          rateLimit: {
            requests: 100,
            window: 60000
          }
        });

        // Register for health monitoring
        this.healthMonitor.registerProvider('gemini', geminiProvider, {
          expectedLatency: 1500, // Optimized expectation
          maxErrorRate: 0.05 // Lower threshold for better reliability
        });

        this.providers.set('gemini', geminiProvider);
        logger.info('Gemini provider initialized successfully', {
          model: geminiProvider.config.model,
          timeout: geminiProvider.config.timeout
        });
      } else {
        logger.error('GEMINI_API_KEY not configured');
        throw new Error('GEMINI_API_KEY environment variable is required');
      }

      // Initialize fallback provider if enabled
      if (this.options.enableFallbackProvider) {
        this.fallbackProvider = new FallbackProvider({
          enableTemplates: true,
          enableCache: false, // Disabled to avoid conflicts
          enableGuidance: true
        });

        this.aiServiceManager.registerProvider(this.fallbackProvider, {
          priority: 10, // Emergency fallback only
          weight: 0,
          costPerToken: 0,
          quality: 0.3 // Lower quality to encourage primary usage
        });

        logger.info('Fallback provider initialized for emergency use');
      }

      // Start health monitoring if enabled
      if (this.options.enableHealthMonitoring) {
        this.healthMonitor.startMonitoring();
      }

      logger.info('Gemini-only initialization completed', {
        primaryProvider: 'gemini',
        fallbackEnabled: !!this.fallbackProvider,
        healthMonitoringEnabled: this.options.enableHealthMonitoring
      });

    } catch (error) {
      logger.error('Failed to initialize Gemini-only provider setup', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process chat request with Gemini-optimized flow
   * @param {string} message - User message
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async chat(message, context = {}, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.metrics.totalRequests++;

      logger.info(`Gemini-only AI request: ${requestId}`, {
        messageLength: message.length,
        hasContext: !!context,
        options
      });

      // Check cache first if enabled
      if (this.options.enableResponseCache) {
        const cachedResponse = await this.responseCache.get(message, context);
        if (cachedResponse) {
          const responseTime = Date.now() - startTime;

          logger.debug(`Cache hit for request: ${requestId}`, {
            responseTime,
            provider: cachedResponse.provider
          });

          return this.formatResponse(cachedResponse, {
            success: true,
            cached: true,
            responseTime,
            requestId
          });
        }
      }

      // Process through AI service manager (will use Gemini)
      const aiResponse = await this.aiServiceManager.generateResponse(message, context, options);
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.metrics.successfulRequests++;
      this.updateAverageResponseTime(responseTime);

      // Cache response if enabled and not from fallback
      if (this.options.enableResponseCache && !aiResponse.isFallback && !aiResponse.isCached) {
        await this.responseCache.set(message, context, aiResponse);
      }

      // Check if fallback was used
      if (aiResponse.isFallback) {
        this.metrics.fallbackResponses++;
        logger.warn(`Fallback response used for request: ${requestId}`, {
          fallbackReason: aiResponse.fallbackType
        });
      }

      logger.info(`Gemini-only AI request completed: ${requestId}`, {
        provider: aiResponse.provider,
        responseTime,
        isFallback: aiResponse.isFallback,
        tokensUsed: aiResponse.tokensUsed
      });

      return this.formatResponse(aiResponse, {
        success: true,
        cached: aiResponse.isCached,
        fallback: aiResponse.isFallback,
        responseTime,
        requestId
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.failedRequests++;

      logger.error(`Gemini-only AI request failed: ${requestId}`, {
        error: error.message,
        responseTime,
        code: error.code
      });

      // Try fallback provider if available and not already used
      if (this.fallbackProvider && !error.isFallbackError) {
        try {
          logger.info(`Attempting fallback response: ${requestId}`);
          const fallbackResponse = await this.fallbackProvider.generateResponse(message, context, options);

          this.metrics.fallbackResponses++;

          return this.formatResponse(fallbackResponse, {
            success: true,
            fallback: true,
            fallbackReason: error.message,
            responseTime,
            requestId
          });

        } catch (fallbackError) {
          logger.error(`Fallback response failed: ${requestId}`, {
            error: fallbackError.message
          });
        }
      }

      // Return error response
      return this.formatErrorResponse(error, {
        responseTime,
        requestId,
        message: message.substring(0, 100) + '...'
      });
    }
  }

  /**
   * Get health status focused on Gemini provider
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const healthStatus = await this.healthMonitor.getHealthStatus();
      const serviceMetrics = this.aiServiceManager.getMetrics();
      const cacheStats = this.responseCache.getStats();

      const overall = this.determineOverallHealth(healthStatus);

      return {
        overall,
        providers: healthStatus.providers,
        primaryProvider: 'gemini',
        features: {
          providerType: 'gemini-only',
          healthMonitoring: this.options.enableHealthMonitoring,
          responseCache: this.options.enableResponseCache,
          fallbackProvider: !!this.fallbackProvider,
          optimizedForSingleProvider: true
        },
        metrics: {
          ...this.metrics,
          uptime: Date.now() - this.metrics.startTime,
          successRate: this.metrics.totalRequests > 0
            ? this.metrics.successfulRequests / this.metrics.totalRequests
            : 0,
          fallbackRate: this.metrics.totalRequests > 0
            ? this.metrics.fallbackResponses / this.metrics.totalRequests
            : 0,
          averageResponseTime: this.metrics.averageResponseTime
        },
        cache: cacheStats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Gemini-only health check failed', { error: error.message });

      return {
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get detailed metrics for Gemini-only setup
   * @returns {Object} Detailed metrics
   */
  getMetrics() {
    const healthMetrics = this.healthMonitor.getMetrics();
    const serviceMetrics = this.aiServiceManager.getMetrics();
    const cacheMetrics = this.responseCache.getStats();

    return {
      service: {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime,
        successRate: this.metrics.totalRequests > 0
          ? this.metrics.successfulRequests / this.metrics.totalRequests
          : 0,
        fallbackRate: this.metrics.totalRequests > 0
          ? this.metrics.fallbackResponses / this.metrics.totalRequests
          : 0
      },
      providers: {
        primary: 'gemini',
        count: this.providers.size,
        health: healthMetrics,
        performance: serviceMetrics
      },
      cache: cacheMetrics,
      features: {
        providerType: 'gemini-only',
        healthMonitoring: this.options.enableHealthMonitoring,
        responseCache: this.options.enableResponseCache,
        fallbackProvider: !!this.fallbackProvider,
        optimizedForSingleProvider: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format successful response
   * @param {AIResponse} aiResponse - AI response
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Formatted response
   */
  formatResponse(aiResponse, metadata = {}) {
    return {
      success: true,
      response: aiResponse.content,
      metadata: {
        provider: aiResponse.provider,
        model: aiResponse.model,
        tokensUsed: aiResponse.tokensUsed,
        cost: aiResponse.cost,
        latency: aiResponse.latency,
        requestId: aiResponse.requestId,
        timestamp: aiResponse.timestamp,
        isCached: aiResponse.isCached,
        isFallback: aiResponse.isFallback,
        fallbackType: aiResponse.fallbackType,
        confidence: aiResponse.confidence,
        ...metadata
      }
    };
  }

  /**
   * Format error response
   * @param {Error} error - Error object
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Formatted error response
   */
  formatErrorResponse(error, metadata = {}) {
    return {
      success: false,
      response: this.getErrorMessage(error),
      fallback: true,
      error: {
        code: error.code || 'GEMINI_SERVICE_ERROR',
        message: error.message,
        provider: error.provider || 'gemini',
        retryable: error.retryable !== false,
        timestamp: new Date().toISOString(),
        ...metadata
      },
      metadata: {
        responseTime: metadata.responseTime || 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error) {
    switch (error.code) {
      case 'GEMINI_OVERLOADED':
        return "I'm experiencing high demand right now. Please try again in a moment.";

      case 'GEMINI_QUOTA_ERROR':
        return "I've reached my usage limit for now. Please try again later.";

      case 'GEMINI_SAFETY_ERROR':
        return "I can't process that request due to content guidelines. Please try rephrasing your question.";

      case 'GEMINI_AUTH_ERROR':
        return "There's an authentication issue. Please contact support.";

      case 'GEMINI_MODEL_ERROR':
        return "The AI model is currently unavailable. Please try again later.";

      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return "I'm having trouble connecting right now. Please check your connection and try again.";

      default:
        return "I'm experiencing technical difficulties. Please try again later.";
    }
  }

  /**
   * Determine overall health status
   * @param {Object} healthStatus - Provider health status
   * @returns {string} Overall health status
   */
  determineOverallHealth(healthStatus) {
    const geminiHealth = healthStatus.providers?.gemini?.healthy;

    if (geminiHealth === true) {
      return 'healthy';
    } else if (geminiHealth === false) {
      return this.fallbackProvider ? 'degraded' : 'unhealthy';
    }

    return 'unknown';
  }

  /**
   * Update average response time
   * @param {number} responseTime - Response time in milliseconds
   */
  updateAverageResponseTime(responseTime) {
    const total = this.metrics.successfulRequests;
    const current = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = ((current * (total - 1)) + responseTime) / total;
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown() {
    logger.info('Shutting down Gemini-Only AI Service Manager');

    try {
      // Stop health monitoring
      if (this.options.enableHealthMonitoring) {
        this.healthMonitor.stopMonitoring();
      }

      // Destroy response cache
      this.responseCache.destroy();

      logger.info('Gemini-Only AI Service Manager shutdown completed');

    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }
}

module.exports = GeminiOnlyAIServiceManager;