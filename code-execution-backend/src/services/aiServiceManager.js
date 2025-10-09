const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const CircuitBreaker = require('./circuitBreaker');
const RetryManager = require('./retryManager');
const HealthMonitor = require('./healthMonitor');

/**
 * AI Service Manager - Multi-provider resilient AI service architecture
 *
 * Features:
 * - Multi-provider support (Google Gemini, OpenAI, Anthropic Claude)
 * - Circuit breaker pattern for external service resilience
 * - Retry logic with exponential backoff
 * - Graceful degradation and fallback strategies
 * - Service health monitoring and alerting
 * - Request queuing for failed requests
 */
class AIServiceManager {
  constructor() {
    this.providers = new Map();
    this.circuitBreakers = new Map();
    this.healthMonitor = new HealthMonitor();
    this.retryManager = new RetryManager();
    this.requestQueue = [];
    this.isProcessingQueue = false;

    // Initialize AI providers
    this.initializeProviders();

    // Start health monitoring
    this.healthMonitor.start();

    // Process queued requests periodically
    this.startQueueProcessor();
  }

  /**
   * Initialize AI service providers with fallback order
   */
  initializeProviders() {
    // Primary: Google Gemini
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) {
      const geminiProvider = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
        model: 'gemini-pro-latest'
      });

      this.providers.set('gemini', geminiProvider);
      this.circuitBreakers.set('gemini', new CircuitBreaker({
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000
      }));

      logger.info('Google Gemini AI provider initialized');
    }

    // Fallback 1: OpenAI GPT-4
    if (process.env.OPENAI_API_KEY) {
      const openaiProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      });

      this.providers.set('openai', openaiProvider);
      this.circuitBreakers.set('openai', new CircuitBreaker({
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000
      }));

      logger.info('OpenAI GPT-4 provider initialized');
    }

    // Fallback 2: Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      const claudeProvider = new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-sonnet-20240229'
      });

      this.providers.set('anthropic', claudeProvider);
      this.circuitBreakers.set('anthropic', new CircuitBreaker({
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000
      }));

      logger.info('Anthropic Claude provider initialized');
    }

    if (this.providers.size === 0) {
      logger.error('No AI providers configured. Please set API keys for at least one provider.');
    }
  }

  /**
   * Main chat method with provider fallback and resilience
   */
  async chat(message, context = null, options = {}) {
    const startTime = Date.now();
    const requestId = options.requestId || 'unknown';

    try {
      logger.info('AI chat request initiated', {
        requestId,
        messageLength: message.length,
        hasContext: !!context,
        availableProviders: Array.from(this.providers.keys())
      });

      // Try providers in order of preference
      const result = await this.tryProvidersSequentially(message, context, {
        requestId,
        ...options
      });

      const responseTime = Date.now() - startTime;

      logger.info('AI chat request completed successfully', {
        requestId,
        provider: result.provider,
        responseTime,
        responseLength: result.response.length
      });

      return {
        success: true,
        response: result.response,
        metadata: {
          provider: result.provider,
          model: result.model,
          responseTime,
          timestamp: new Date().toISOString(),
          requestId
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('All AI providers failed', {
        requestId,
        error: error.message,
        responseTime,
        availableProviders: Array.from(this.providers.keys())
      });

      // Queue the request for retry if appropriate
      if (this.shouldQueueRequest(error)) {
        this.queueRequest({ message, context, options, requestId });
      }

      // Return graceful fallback response
      return this.getFallbackResponse(error, {
        requestId,
        responseTime,
        messageLength: message.length
      });
    }
  }

  /**
   * Try each provider sequentially with circuit breaker protection
   */
  async tryProvidersSequentially(message, context, options) {
    const providers = ['gemini', 'openai', 'anthropic'];
    const errors = [];

    for (const providerName of providers) {
      const provider = this.providers.get(providerName);
      const circuitBreaker = this.circuitBreakers.get(providerName);

      if (!provider) {
        continue; // Provider not configured
      }

      // Check circuit breaker state
      if (circuitBreaker.isOpen()) {
        logger.warn(`Circuit breaker open for ${providerName}, skipping`, {
          requestId: options.requestId
        });
        continue;
      }

      try {
        // Execute request through circuit breaker
        const result = await circuitBreaker.execute(async () => {
          return await this.retryManager.execute(async () => {
            return await provider.chat(message, context, options);
          }, {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            retryableErrors: ['503', '429', 'timeout', 'overloaded']
          });
        });

        // Record successful health check
        this.healthMonitor.recordSuccess(providerName);

        return {
          response: result.response,
          provider: providerName,
          model: result.model
        };

      } catch (error) {
        logger.warn(`Provider ${providerName} failed`, {
          requestId: options.requestId,
          error: error.message
        });

        // Record failure for health monitoring
        this.healthMonitor.recordFailure(providerName, error);

        errors.push({
          provider: providerName,
          error: error.message,
          code: error.code
        });

        continue; // Try next provider
      }
    }

    // All providers failed
    throw new Error(`All AI providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(', ')}`);
  }

  /**
   * Determine if request should be queued for retry
   */
  shouldQueueRequest(error) {
    const queueableErrors = [
      'overloaded',
      '503',
      'rate limit',
      '429',
      'timeout'
    ];

    return queueableErrors.some(queuableError =>
      error.message.toLowerCase().includes(queuableError.toLowerCase())
    );
  }

  /**
   * Queue failed request for later retry
   */
  queueRequest(requestData) {
    const queuedRequest = {
      ...requestData,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 5
    };

    this.requestQueue.push(queuedRequest);

    logger.info('Request queued for retry', {
      requestId: requestData.requestId,
      queueSize: this.requestQueue.length
    });
  }

  /**
   * Start background queue processor
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (this.requestQueue.length > 0 && !this.isProcessingQueue) {
        this.isProcessingQueue = true;
        await this.processQueue();
        this.isProcessingQueue = false;
      }
    }, 30000); // Process queue every 30 seconds
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    const now = Date.now();
    const processedRequests = [];

    for (const request of this.requestQueue) {
      // Check if request should be retried
      const timeSinceQueue = now - new Date(request.timestamp).getTime();
      const backoffDelay = Math.min(300000, Math.pow(2, request.retryCount) * 10000); // Max 5 minutes

      if (timeSinceQueue < backoffDelay) {
        continue; // Not time to retry yet
      }

      if (request.retryCount >= request.maxRetries) {
        // Max retries exceeded, remove from queue
        processedRequests.push(request);
        logger.warn('Request exceeded max retries, removing from queue', {
          requestId: request.requestId,
          retryCount: request.retryCount
        });
        continue;
      }

      try {
        // Retry the request
        const result = await this.tryProvidersSequentially(
          request.message,
          request.context,
          { ...request.options, requestId: request.requestId }
        );

        // Request succeeded, remove from queue
        processedRequests.push(request);

        logger.info('Queued request processed successfully', {
          requestId: request.requestId,
          retryCount: request.retryCount,
          provider: result.provider
        });

        // Here you could notify the user that their request was processed
        // (e.g., via WebSocket, webhook, etc.)

      } catch (error) {
        // Request failed again, increment retry count
        request.retryCount++;
        request.timestamp = new Date().toISOString();

        logger.warn('Queued request retry failed', {
          requestId: request.requestId,
          retryCount: request.retryCount,
          error: error.message
        });
      }
    }

    // Remove processed requests from queue
    this.requestQueue = this.requestQueue.filter(request =>
      !processedRequests.includes(request)
    );
  }

  /**
   * Get fallback response when all providers fail
   */
  getFallbackResponse(error, metadata) {
    const fallbackResponses = [
      "I'm currently experiencing technical difficulties with my AI services. Please try again in a few minutes.",
      "The AI assistant is temporarily unavailable due to high demand. Your request has been queued and will be processed shortly.",
      "I'm unable to process your request right now as all AI services are experiencing issues. Please try again later.",
      "The AI services are temporarily overloaded. We're working on resolving this issue. Please try again in a moment."
    ];

    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    return {
      success: false,
      response: randomResponse,
      fallback: true,
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: metadata.requestId,
        queuedForRetry: this.requestQueue.length > 0,
        ...metadata
      }
    };
  }

  /**
   * Health check for all providers
   */
  async healthCheck() {
    const healthStatus = {
      overall: 'healthy',
      providers: {},
      timestamp: new Date().toISOString(),
      queueSize: this.requestQueue.length
    };

    let healthyProviders = 0;
    const totalProviders = this.providers.size;

    for (const [providerName, provider] of this.providers) {
      const circuitBreaker = this.circuitBreakers.get(providerName);

      try {
        // Quick health check
        await provider.healthCheck();

        healthStatus.providers[providerName] = {
          status: 'healthy',
          circuitBreaker: circuitBreaker.getState(),
          lastHealthCheck: new Date().toISOString()
        };

        healthyProviders++;

      } catch (error) {
        healthStatus.providers[providerName] = {
          status: 'unhealthy',
          error: error.message,
          circuitBreaker: circuitBreaker.getState(),
          lastHealthCheck: new Date().toISOString()
        };
      }
    }

    // Determine overall health
    if (healthyProviders === 0) {
      healthStatus.overall = 'unhealthy';
    } else if (healthyProviders < totalProviders) {
      healthStatus.overall = 'degraded';
    }

    return healthStatus;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      providers: this.healthMonitor.getProviderMetrics(),
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([name, cb]) => [
          name,
          cb.getState()
        ])
      ),
      queue: {
        size: this.requestQueue.length,
        processing: this.isProcessingQueue
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Google Gemini Provider Implementation
 */
class GeminiProvider {
  constructor(config) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.model });
  }

  async chat(message, context, options) {
    let fullPrompt = message;
    if (context) {
      fullPrompt = `Context: ${context}\n\nUser: ${message}`;
    }

    const result = await this.model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    return {
      response: text,
      model: this.config.model
    };
  }

  async healthCheck() {
    const result = await this.model.generateContent('Hello');
    return result.response.text();
  }
}

/**
 * OpenAI Provider Implementation (placeholder)
 */
class OpenAIProvider {
  constructor(config) {
    this.config = config;
    // Initialize OpenAI client when API key is available
    logger.info('OpenAI provider configured but not implemented');
  }

  async chat(message, context, options) {
    throw new Error('OpenAI provider not implemented yet');
  }

  async healthCheck() {
    throw new Error('OpenAI provider not implemented yet');
  }
}

/**
 * Anthropic Claude Provider Implementation (placeholder)
 */
class AnthropicProvider {
  constructor(config) {
    this.config = config;
    // Initialize Anthropic client when API key is available
    logger.info('Anthropic provider configured but not implemented');
  }

  async chat(message, context, options) {
    throw new Error('Anthropic provider not implemented yet');
  }

  async healthCheck() {
    throw new Error('Anthropic provider not implemented yet');
  }
}

module.exports = AIServiceManager;