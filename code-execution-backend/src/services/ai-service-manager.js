/**
 * Comprehensive AI Service Manager
 *
 * Main service that orchestrates all AI providers with resilience patterns,
 * intelligent failover, and graceful degradation.
 */

const { AIServiceManager, SelectionStrategy } = require('../ai/ai-service-manager');
const { ProviderHealthMonitor, HealthStatus } = require('../ai/provider-health-monitor');
const { ResponseCache } = require('../ai/response-cache');
const GeminiProvider = require('../ai/providers/gemini-provider');
const OpenAIProvider = require('../ai/providers/openai-provider');
const AnthropicProvider = require('../ai/providers/anthropic-provider');
const GLMProvider = require('../ai/providers/glm-provider');
const FallbackProvider = require('../ai/providers/fallback-provider');
const logger = require('../utils/logger');

class ComprehensiveAIServiceManager {
  constructor(options = {}) {
    this.options = {
      enableHealthMonitoring: options.enableHealthMonitoring !== false,
      enableResponseCache: options.enableResponseCache !== false,
      enableFallbackProvider: options.enableFallbackProvider !== false,
      healthCheckInterval: options.healthCheckInterval || 60000,
      cacheSize: options.cacheSize || 1000,
      ...options
    };

    // Initialize core components
    this.aiServiceManager = new AIServiceManager({
      selectionStrategy: options.selectionStrategy || SelectionStrategy.PRIORITY,
      enableCaching: this.options.enableResponseCache,
      enableFallbacks: this.options.enableFallbackProvider
    });

    // Initialize health monitor
    this.healthMonitor = new ProviderHealthMonitor({
      checkInterval: this.options.healthCheckInterval
    });

    // Initialize response cache
    this.responseCache = new ResponseCache({
      maxSize: this.options.cacheSize
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

    // Initialize providers
    this.initializeProviders();

    logger.info('Comprehensive AI Service Manager initialized', {
      enableHealthMonitoring: this.options.enableHealthMonitoring,
      enableResponseCache: this.options.enableResponseCache,
      enableFallbackProvider: this.options.enableFallbackProvider,
      providerCount: this.providers.size
    });
  }

  /**
   * Initialize all available providers
   */
  initializeProviders() {
    try {
      // Initialize Gemini provider
      if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
        const geminiProvider = new GeminiProvider({
          model: process.env.GEMINI_MODEL || 'gemini-pro',
          timeout: 30000
        });

        this.aiServiceManager.registerProvider(geminiProvider, {
          priority: 1,
          weight: 3,
          costPerToken: 0.00000025,
          quality: 0.9
        });

        this.healthMonitor.registerProvider('gemini', geminiProvider, {
          expectedLatency: 2000,
          maxErrorRate: 0.1
        });

        this.providers.set('gemini', geminiProvider);
        logger.info('Gemini provider initialized');
      }

      // Initialize OpenAI provider
      if (process.env.OPENAI_API_KEY) {
        const openaiProvider = new OpenAIProvider({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          timeout: 30000
        });

        this.aiServiceManager.registerProvider(openaiProvider, {
          priority: 2,
          weight: 2,
          costPerToken: 0.000002,
          quality: 0.85
        });

        this.healthMonitor.registerProvider('openai', openaiProvider, {
          expectedLatency: 1500,
          maxErrorRate: 0.05
        });

        this.providers.set('openai', openaiProvider);
        logger.info('OpenAI provider initialized');
      }

      // Initialize Anthropic provider
      if (process.env.ANTHROPIC_API_KEY) {
        const anthropicProvider = new AnthropicProvider({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
          timeout: 30000
        });

        this.aiServiceManager.registerProvider(anthropicProvider, {
          priority: 3,
          weight: 1,
          costPerToken: 0.000015,
          quality: 0.95
        });

        this.healthMonitor.registerProvider('anthropic', anthropicProvider, {
          expectedLatency: 2500,
          maxErrorRate: 0.05
        });

        this.providers.set('anthropic', anthropicProvider);
        logger.info('Anthropic provider initialized');
      }

      // Initialize GLM provider
      if (process.env.GLM_API_KEY) {
        const glmProvider = new GLMProvider({
          model: process.env.GLM_MODEL || 'glm-4.6',
          timeout: 30000
        });

        this.aiServiceManager.registerProvider(glmProvider, {
          priority: 1.5, // High priority for GLM 4.6
          weight: 2.5,
          costPerToken: 0.00002,
          quality: 0.92
        });

        this.healthMonitor.registerProvider('glm', glmProvider, {
          expectedLatency: 1800,
          maxErrorRate: 0.08
        });

        this.providers.set('glm', glmProvider);
        logger.info('GLM provider initialized');
      }

      // Initialize fallback provider
      if (this.options.enableFallbackProvider) {
        this.fallbackProvider = new FallbackProvider({
          enableTemplates: true,
          enableCache: true,
          enableGuidance: true
        });

        this.aiServiceManager.registerProvider(this.fallbackProvider, {
          priority: 10, // Lowest priority
          weight: 0,
          costPerToken: 0,
          quality: 0.5
        });

        logger.info('Fallback provider initialized');
      }

      // Start health monitoring if enabled
      if (this.options.enableHealthMonitoring) {
        this.healthMonitor.startMonitoring();
      }

      logger.info('Provider initialization completed', {
        activeProviders: this.providers.size,
        fallbackEnabled: !!this.fallbackProvider
      });

    } catch (error) {
      logger.error('Failed to initialize providers', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Process chat request with comprehensive resilience
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

      logger.info(`AI chat request: ${requestId}`, {
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

      // Process through AI service manager
      const aiResponse = await this.aiServiceManager.generateResponse(message, context, options);
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.metrics.successfulRequests++;
      this.updateAverageResponseTime(responseTime);

      // Cache response if enabled
      if (this.options.enableResponseCache && !aiResponse.isCached) {
        await this.responseCache.set(message, context, aiResponse);
      }

      // Check if fallback was used
      if (aiResponse.isFallback) {
        this.metrics.fallbackResponses++;
      }

      logger.info(`AI chat completed: ${requestId}`, {
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

      logger.error(`AI chat failed: ${requestId}`, {
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
   * Get comprehensive health status
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
        queue: {
          size: 0, // No queue in current implementation
          processing: 0
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
        features: {
          multiProvider: this.providers.size > 1,
          healthMonitoring: this.options.enableHealthMonitoring,
          responseCache: this.options.enableResponseCache,
          fallbackProvider: !!this.fallbackProvider
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Health check failed', { error: error.message });

      return {
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get detailed metrics
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
        configured: this.providers.size,
        health: healthMetrics,
        performance: serviceMetrics
      },
      cache: cacheMetrics,
      features: {
        multiProvider: this.providers.size > 1,
        healthMonitoring: this.options.enableHealthMonitoring,
        responseCache: this.options.enableResponseCache,
        fallbackProvider: !!this.fallbackProvider
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
        code: error.code || 'AI_SERVICE_ERROR',
        message: error.message,
        provider: error.provider,
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
      case 'OPENAI_OVERLOADED':
      case 'ANTHROPIC_OVERLOADED':
        return "I'm experiencing high demand right now. Please try again in a moment.";

      case 'GEMINI_QUOTA_ERROR':
      case 'OPENAI_QUOTA_ERROR':
      case 'ANTHROPIC_RATE_LIMIT':
        return "I've reached my usage limit for now. Please try again later.";

      case 'GEMINI_SAFETY_ERROR':
      case 'OPENAI_SAFETY_ERROR':
      case 'ANTHROPIC_SAFETY_ERROR':
        return "I can't process that request due to content guidelines. Please try rephrasing your question.";

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
    const healthyCount = healthStatus.summary.healthy;
    const totalCount = healthStatus.summary.total;

    if (totalCount === 0) {
      return 'unhealthy';
    }

    if (healthyCount === totalCount) {
      return 'healthy';
    }

    if (healthyCount > 0) {
      return 'degraded';
    }

    return 'unhealthy';
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
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown() {
    logger.info('Shutting down AI Service Manager');

    try {
      // Stop health monitoring
      if (this.options.enableHealthMonitoring) {
        this.healthMonitor.stopMonitoring();
      }

      // Destroy response cache
      this.responseCache.destroy();

      logger.info('AI Service Manager shutdown completed');

    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }
}

module.exports = ComprehensiveAIServiceManager;