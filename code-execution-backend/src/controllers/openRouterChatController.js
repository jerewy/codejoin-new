/**
 * OpenRouter Chat Controller
 * Handles chat requests using OpenRouter API with Qwen Coder and other models
 */

const OpenRouterProvider = require('../providers/openRouterProvider');
const logger = require('../utils/logger');
const { CircuitBreaker, CircuitState } = require('../ai/circuit-breaker');
const { RetryManager } = require('../ai/retry-manager');
const { EventEmitter } = require('events');

class OpenRouterChatController extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      enableCaching: config.enableCaching !== false,
      enableHealthChecks: config.enableHealthChecks !== false,
      healthCheckInterval: config.healthCheckInterval || 30000,
      ...config
    };

    // Initialize components
    this.retryManager = new RetryManager(this.config);

    // Initialize OpenRouter provider
    try {
      this.openRouterProvider = new OpenRouterProvider({
        model: config.model || process.env.OPENROUTER_MODEL,
        apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
        timeout: this.config.timeout
      });
      console.log('🚀 OpenRouter provider initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OpenRouter provider:', error.message);
      this.openRouterProvider = null;
    }

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker('openrouter-provider', {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringEnabled: this.config.enableHealthChecks
    });

    // Health monitoring
    this.healthStatus = {
      healthy: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      lastError: null
    };

    // Response cache (simple in-memory)
    this.responseCache = new Map();
    this.maxCacheSize = 100;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Start health monitoring
    if (this.config.enableHealthChecks) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Main chat endpoint handler
   */
  async chat(req, res) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      console.log('🤖 OpenRouter chat request received', {
        requestId,
        hasMessage: !!req.body.message,
        messageLength: req.body.message?.length || 0,
        hasContext: !!req.body.context,
        userAgent: req.get('User-Agent')
      });

      // Validate request
      if (!req.body.message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
          requestId
        });
      }

      // Check if provider is available
      if (!this.openRouterProvider) {
        return res.status(503).json({
          success: false,
          error: 'OpenRouter provider is not initialized. Please check API key configuration.',
          requestId,
          metadata: { provider: 'openrouter', available: false }
        });
      }

      // Check circuit breaker
      if (!this.circuitBreaker.isHealthy()) {
        return res.status(503).json({
          success: false,
          error: 'OpenRouter service is temporarily unavailable due to failures',
          requestId,
          metadata: {
            provider: 'openrouter',
            circuitBreakerOpen: true,
            retryAfter: this.circuitBreaker.getNextAttemptTime()
          }
        });
      }

      // Check cache if enabled
      let cacheKey = null;
      if (this.config.enableCaching) {
        cacheKey = this.generateCacheKey(req.body.message, req.body.context);
        const cachedResponse = this.responseCache.get(cacheKey);
        if (cachedResponse) {
          this.metrics.cacheHits++;
          console.log('💾 Cache hit for request', { requestId, cacheKey });
          return res.json({
            success: true,
            response: cachedResponse.content,
            metadata: {
              ...cachedResponse.metadata,
              cached: true,
              requestId,
              responseTime: Date.now() - startTime
            }
          });
        }
        this.metrics.cacheMisses++;
      }

      // Process request
      const result = await this.processWithOpenRouter(req.body.message, req.body.context, {
        requestId,
        ...req.body.options
      });

      // Update metrics
      this.metrics.totalRequests++;
      this.metrics.successfulRequests++;
      this.updateAverageResponseTime(Date.now() - startTime);

      // Cache response if enabled
      if (this.config.enableCaching && cacheKey) {
        this.cacheResponse(cacheKey, result);
      }

      // Reset circuit breaker on success
      this.circuitBreaker.recordSuccess();

      console.log('✅ OpenRouter chat request completed', {
        requestId,
        responseTime: Date.now() - startTime,
        provider: result.metadata?.provider,
        model: result.metadata?.model,
        cached: false
      });

      res.json({
        success: true,
        response: result.content,
        metadata: {
          ...result.metadata,
          requestId,
          responseTime: Date.now() - startTime,
          cached: false
        }
      });

    } catch (error) {
      // Update metrics
      this.metrics.totalRequests++;
      this.metrics.failedRequests++;

      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure();

      // Log error
      logger.error('OpenRouter chat request failed', {
        error: error.message,
        stack: error.stack,
        requestId,
        responseTime: Date.now() - startTime
      });

      console.error('❌ OpenRouter chat request failed', {
        requestId,
        error: error.message,
        responseTime: Date.now() - startTime
      });

      // Let the enhanced error middleware handle the response
      // DO NOT send a response here - let the error bubble up
      throw error;
    }
  }

  /**
   * Process chat request with OpenRouter
   */
  async processWithOpenRouter(message, context, metadata = {}) {
    const startTime = Date.now();

    try {
      // Build conversation with context
      const messages = this.buildConversation(message, context);

      // Add system message for coding assistance
      if (context) {
        messages.unshift({
          role: 'system',
          content: `You are an expert programming assistant using the ${this.openRouterProvider.model} model. You have access to the following code context:\n\n${context}\n\nPlease provide helpful, detailed coding assistance. Feel free to write code, explain concepts, debug issues, and suggest improvements. Be conversational and natural in your responses.`
        });
      } else {
        messages.unshift({
          role: 'system',
          content: `You are an expert programming assistant using the ${this.openRouterProvider.model} model. Please provide helpful, detailed coding assistance. Feel free to write code, explain concepts, debug issues, and suggest improvements. Be conversational and natural in your responses.`
        });
      }

      // Make API request with retry logic
      const result = await this.retryManager.executeWithRetry(
        async () => {
          return await this.openRouterProvider.chat(messages, {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 0.95
          });
        },
        {
          operation: `openrouter-chat-${metadata.requestId}`,
          maxRetries: this.config.maxRetries
        }
      );

      return {
        content: result.content,
        metadata: {
          provider: 'openrouter',
          model: result.model,
          usage: result.usage,
          responseTime: result.responseTime,
          finishReason: result.metadata?.finishReason,
          tokenUsage: result.metadata?.tokenUsage
        }
      };

    } catch (error) {
      // Create enhanced error with proper structure for the error middleware
      const enhancedError = new Error(`OpenRouter processing failed: ${error.message}`);

      // Add enhanced error properties
      enhancedError.category = 'AI_SERVICE_ERROR';
      enhancedError.severity = 'high';
      enhancedError.service = 'openrouter';
      enhancedError.operation = `openrouter-chat-${metadata.requestId}`;
      enhancedError.context = {
        message: message.substring(0, 100), // First 100 chars for context
        model: this.openRouterProvider.model,
        requestId: metadata.requestId
      };

      // Parse specific error types for better handling
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        enhancedError.type = 'RATE_LIMIT_ERROR';
        enhancedError.statusCode = 429;
        enhancedError.retryAfter = this.extractRetryAfter(error.message) || 60;
        enhancedError.recoverySuggestions = [
          'Wait for the rate limit to reset',
          'Try switching to a different AI model',
          'Use Smart Hybrid Mode for automatic fallback'
        ];
      } else if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
        enhancedError.type = 'QUOTA_EXCEEDED_ERROR';
        enhancedError.statusCode = 429;
        enhancedError.retryAfter = this.extractRetryAfter(error.message) || 300;
        enhancedError.recoverySuggestions = [
          'Wait for quota to reset (usually daily)',
          'Switch to a different AI provider',
          'Consider upgrading your API plan'
        ];
      } else if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        enhancedError.type = 'AUTHENTICATION_ERROR';
        enhancedError.statusCode = 401;
        enhancedError.recoverySuggestions = [
          'Check your OpenRouter API key configuration',
          'Verify the API key is valid and active',
          'Contact support if the issue persists'
        ];
      } else if (errorMessage.includes('credits') || errorMessage.includes('payment')) {
        enhancedError.type = 'PAYMENT_ERROR';
        enhancedError.statusCode = 402;
        enhancedError.recoverySuggestions = [
          'Add credits to your OpenRouter account',
          'Check your billing information',
          'Contact OpenRouter support'
        ];
      } else if (errorMessage.includes('timeout')) {
        enhancedError.type = 'TIMEOUT_ERROR';
        enhancedError.statusCode = 408;
        enhancedError.retryAfter = 30;
        enhancedError.recoverySuggestions = [
          'Try again with a shorter message',
          'Check your network connection',
          'Use a different AI provider'
        ];
      } else {
        enhancedError.type = 'UNKNOWN_ERROR';
        enhancedError.statusCode = 500;
        enhancedError.retryAfter = 60;
        enhancedError.recoverySuggestions = [
          'Try again in a few moments',
          'Switch to a different AI model',
          'Contact support if the issue persists'
        ];
      }

      throw enhancedError;
    }
  }

  /**
   * Extract retry after time from error message
   */
  extractRetryAfter(errorMessage) {
    const retryMatch = errorMessage.match(/retry in (\d+)/i) || errorMessage.match(/(\d+)s/);
    return retryMatch ? parseInt(retryMatch[1]) : null;
  }

  /**
   * Build conversation array from message and context
   */
  buildConversation(message, context) {
    const messages = [];

    if (context) {
      messages.push({
        role: 'system',
        content: `Code context:\n${context}`
      });
    }

    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      const health = await this.getHealthStatus();
      const statusCode = health.healthy ? 200 : 503;
      res.status(statusCode).json({
        success: health.healthy,
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus() {
    if (!this.openRouterProvider) {
      return {
        healthy: false,
        error: 'OpenRouter provider not initialized',
        provider: 'openrouter'
      };
    }

    try {
      const providerHealth = await this.openRouterProvider.healthCheck();
      const circuitBreakerHealth = {
        open: this.circuitBreaker.state === CircuitState.OPEN,
        failureCount: this.circuitBreaker.getStatus().failureCount,
        timeToReset: this.circuitBreaker.getNextAttemptTime()
      };

      const overallHealth = providerHealth.healthy && !circuitBreakerHealth.open;

      this.healthStatus = {
        healthy: overallHealth,
        provider: providerHealth,
        circuitBreaker: circuitBreakerHealth,
        metrics: this.metrics,
        lastCheck: new Date(),
        consecutiveFailures: overallHealth ? 0 : this.healthStatus.consecutiveFailures + 1
      };

      return this.healthStatus;

    } catch (error) {
      this.healthStatus = {
        healthy: false,
        error: error.message,
        provider: 'openrouter',
        lastCheck: new Date(),
        consecutiveFailures: this.healthStatus.consecutiveFailures + 1,
        lastError: error.message
      };

      return this.healthStatus;
    }
  }

  /**
   * Get status endpoint
   */
  async getStatus(req, res) {
    try {
      const info = this.openRouterProvider?.getInfo() || {};
      const health = await this.getHealthStatus();

      res.json({
        success: true,
        status: {
          service: 'openrouter-chat',
          version: '1.0.0',
          status: health.healthy ? 'healthy' : 'unhealthy',
          ...info,
          health,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      try {
        await this.getHealthStatus();
      } catch (error) {
        console.error('Health check failed:', error.message);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Generate cache key
   */
  generateCacheKey(message, context) {
    const combined = `${message}:${context || ''}`;
    return Buffer.from(combined).toString('base64').substring(0, 32);
  }

  /**
   * Cache response
   */
  cacheResponse(key, response) {
    if (this.responseCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
    this.responseCache.set(key, response);
  }

  /**
   * Update average response time
   */
  updateAverageResponseTime(responseTime) {
    const totalSuccessful = this.metrics.successfulRequests;
    if (totalSuccessful === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (totalSuccessful - 1) + responseTime) / totalSuccessful;
    }
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get appropriate error status code
   */
  getErrorStatusCode(error) {
    if (error.message.includes('API key')) return 401;
    if (error.message.includes('rate limit')) return 429;
    if (error.message.includes('credits')) return 402;
    if (error.message.includes('timeout')) return 408;
    return 500;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down OpenRouter Chat Controller...');
    this.responseCache.clear();
    this.removeAllListeners();
    console.log('✅ OpenRouter Chat Controller shut down complete');
  }
}

module.exports = OpenRouterChatController;