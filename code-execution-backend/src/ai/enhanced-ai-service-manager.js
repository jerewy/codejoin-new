/**
 * Enhanced AI Service Manager
 *
 * Advanced orchestration layer with intelligent provider selection,
 * prompt engineering, context management, and comprehensive monitoring.
 */

const { AIServiceManager, SelectionStrategy } = require('./ai-service-manager');
const { circuitBreakerFactory } = require('./circuit-breaker');
const { retryManagerFactory } = require('./retry-manager');
const PromptEngineer = require('./prompt-engineer');
const HuggingFaceProvider = require('./providers/huggingface-provider');
const GeminiProvider = require('./providers/gemini-provider');
const FallbackProvider = require('./providers/fallback-provider');
const logger = require('../utils/logger');

class EnhancedAIServiceManager extends AIServiceManager {
  constructor(options = {}) {
    super({
      ...options,
      enableCaching: true,
      enableFallbacks: true
    });

    // Enhanced configuration
    this.config = {
      enablePromptEngineering: options.enablePromptEngineering !== false,
      enableContextPersistence: options.enableContextPersistence !== false,
      enableAdvancedMonitoring: options.enableAdvancedMonitoring !== false,
      enableCostOptimization: options.enableCostOptimization !== false,
      enableQualityScoring: options.enableQualityScoring !== false,
      maxRetries: options.maxRetries || 3,
      healthCheckInterval: options.healthCheckInterval || 30000,
      ...options
    };

    // Initialize prompt engineer
    this.promptEngineer = new PromptEngineer({
      enableContextOptimization: this.config.enablePromptEngineering,
      enableDynamicTemplates: this.config.enablePromptEngineering,
      enableCodeAnalysis: this.config.enablePromptEngineering
    });

    // Context persistence
    this.contextStore = new Map();
    this.conversationSessions = new Map();

    // Quality and performance tracking
    this.qualityTracker = new Map();
    this.performanceTracker = new Map();
    this.costTracker = new Map();

    // Initialize providers with enhanced configuration
    this.initializeEnhancedProviders();

    // Start background health monitoring
    if (this.config.enableAdvancedMonitoring) {
      this.startHealthMonitoring();
    }

    logger.info('Enhanced AI Service Manager initialized', {
      enablePromptEngineering: this.config.enablePromptEngineering,
      enableContextPersistence: this.config.enableContextPersistence,
      enableAdvancedMonitoring: this.config.enableAdvancedMonitoring,
      providerCount: this.providers.size
    });
  }

  /**
   * Initialize enhanced AI providers
   */
  initializeEnhancedProviders() {
    try {
      // Hugging Face provider (primary)
      const hfProvider = new HuggingFaceProvider({
        apiKey: process.env.HUGGINGFACE_API_KEY,
        timeout: 30000,
        maxRetries: 3
      });
      this.registerProvider(hfProvider, {
        priority: 1,
        weight: 3,
        quality: 0.9,
        costPerToken: 0.0000001,
        enabled: true
      });

      // Gemini provider (secondary)
      const geminiProvider = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        timeout: 30000,
        maxRetries: 3
      });
      this.registerProvider(geminiProvider, {
        priority: 2,
        weight: 2,
        quality: 0.85,
        costPerToken: 0.00000025,
        enabled: !!process.env.GEMINI_API_KEY
      });

      // Fallback provider (always available)
      const fallbackProvider = new FallbackProvider({
        enableTemplates: true,
        enableCache: true,
        enableGuidance: true
      });
      this.registerProvider(fallbackProvider, {
        priority: 10,
        weight: 1,
        quality: 0.5,
        costPerToken: 0,
        enabled: true
      });

      logger.info('Enhanced providers initialized', {
        huggingFace: !!process.env.HUGGINGFACE_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        fallback: true
      });

    } catch (error) {
      logger.error('Failed to initialize enhanced providers', {
        error: error.message
      });
    }
  }

  /**
   * Generate AI response with enhanced features
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} Enhanced AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      logger.info(`Enhanced AI request started: ${requestId}`, {
        promptLength: prompt.length,
        hasContext: !!context,
        options
      });

      // Store context if persistence is enabled
      let enhancedContext = context;
      if (this.config.enableContextPersistence) {
        enhancedContext = await this.persistContext(requestId, prompt, context, options);
      }

      // Apply prompt engineering if enabled
      let optimizedPrompt = prompt;
      let promptAnalysis = null;
      if (this.config.enablePromptEngineering) {
        const promptResult = await this.promptEngineer.generateOptimizedPrompt(prompt, enhancedContext, options);
        optimizedPrompt = promptResult.optimizedPrompt;
        promptAnalysis = promptResult.analysis;
        enhancedContext = promptResult.context;
      }

      // Generate response using enhanced provider selection
      const response = await this.generateEnhancedResponse(optimizedPrompt, enhancedContext, {
        ...options,
        requestId,
        originalPrompt: prompt,
        promptAnalysis
      });

      // Enhance response with metadata
      const enhancedResponse = this.enhanceResponse(response, {
        requestId,
        prompt,
        optimizedPrompt,
        promptAnalysis,
        context: enhancedContext,
        processingTime: Date.now() - startTime
      });

      // Track quality and performance
      if (this.config.enableQualityScoring) {
        await this.trackResponseQuality(enhancedResponse, promptAnalysis);
      }

      if (this.config.enableCostOptimization) {
        this.trackCosts(enhancedResponse);
      }

      // Update metrics
      this.updateEnhancedMetrics(enhancedResponse, Date.now() - startTime);

      logger.info(`Enhanced AI request completed: ${requestId}`, {
        provider: enhancedResponse.provider,
        responseTime: enhancedResponse.metadata.processingTime,
        tokensUsed: enhancedResponse.tokensUsed,
        cost: enhancedResponse.cost,
        quality: enhancedResponse.metadata.qualityScore
      });

      return enhancedResponse;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.failedRequests++;

      logger.error(`Enhanced AI request failed: ${requestId}`, {
        error: error.message,
        responseTime,
        stack: error.stack
      });

      // Enhanced error handling with fallback strategies
      const fallbackResponse = await this.handleEnhancedFailure(error, prompt, context, options, requestId);
      if (fallbackResponse) {
        return fallbackResponse;
      }

      throw this.enhanceError(error, requestId, prompt, context);
    }
  }

  /**
   * Generate response with enhanced provider selection
   * @param {string} prompt - Optimized prompt
   * @param {Object} context - Enhanced context
   * @param {Object} options - Request options with metadata
   * @returns {Promise<AIResponse>} AI response
   */
  async generateEnhancedResponse(prompt, context, options) {
    const selectedProviders = this.selectProvidersWithIntelligence(prompt, context, options);
    let lastError = null;

    for (const { provider, config, score } of selectedProviders) {
      if (!config.enabled) {
        continue;
      }

      try {
        // Check provider health with context
        const isHealthy = await this.checkProviderHealth(provider, context);
        if (!isHealthy) {
          logger.warn(`Provider ${provider.name} is unhealthy for this context, skipping`);
          continue;
        }

        // Execute request with enhanced retry logic
        const response = await this.executeWithEnhancedRetry(provider, prompt, context, {
          ...options,
          providerScore: score
        });

        // Update provider stats with enhanced metrics
        this.updateEnhancedProviderStats(provider.name, response, true, {
          context: context,
          promptAnalysis: options.promptAnalysis,
          providerScore: score
        });

        return response;

      } catch (error) {
        lastError = error;
        logger.warn(`Provider ${provider.name} failed`, {
          error: error.message,
          providerScore: score
        });

        // Update provider error stats
        this.updateEnhancedProviderStats(provider.name, null, false, error);

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Select providers with intelligent scoring
   * @param {string} prompt - Input prompt
   * @param {Object} context - Request context
   * @param {Object} options - Request options
   * @returns {Array} Sorted list of providers with scores
   */
  selectProvidersWithIntelligence(prompt, context, options) {
    const providers = Array.from(this.providers.values());

    // Calculate scores for each provider
    const scoredProviders = providers.map(({ provider, config, stats }) => {
      let score = 0;

      // Base score from priority
      score += (10 - config.priority) * 10;

      // Health score
      const healthBonus = provider.metrics.isHealthy ? 20 : -50;
      score += healthBonus;

      // Performance score
      const performanceScore = this.calculatePerformanceScore(provider.name, stats);
      score += performanceScore;

      // Context matching score
      const contextScore = this.calculateContextScore(provider.name, prompt, context);
      score += contextScore;

      // Cost optimization score
      if (this.config.enableCostOptimization) {
        const costScore = this.calculateCostScore(provider.name, config);
        score += costScore;
      }

      // Quality score
      if (this.config.enableQualityScoring) {
        const qualityScore = this.calculateQualityScore(provider.name, config);
        score += qualityScore;
      }

      return {
        provider,
        config,
        stats,
        score: Math.max(0, score)
      };
    });

    // Sort by score (highest first)
    return scoredProviders.sort((a, b) => b.score - a.score);
  }

  /**
   * Check provider health with context consideration
   * @param {AIProvider} provider - Provider to check
   * @param {Object} context - Request context
   * @returns {Promise<boolean>} True if healthy for this context
   */
  async checkProviderHealth(provider, context) {
    // Basic health check
    const basicHealth = await provider.isHealthy();
    if (!basicHealth) {
      return false;
    }

    // Context-specific health checks
    if (context && context.languages) {
      // Check if provider supports the required languages
      const providerCapabilities = this.getProviderCapabilities(provider.name);
      const canHandleLanguages = context.languages.some(lang =>
        providerCapabilities.languages.includes(lang) || providerCapabilities.languages.includes('all')
      );

      if (!canHandleLanguages) {
        logger.debug(`Provider ${provider.name} doesn't support required languages`, {
          providerLanguages: providerCapabilities.languages,
          requiredLanguages: context.languages
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Execute request with enhanced retry logic
   * @param {AIProvider} provider - Provider to use
   * @param {string} prompt - Input prompt
   * @param {Object} context - Request context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async executeWithEnhancedRetry(provider, prompt, context, options) {
    const maxRetries = this.config.maxRetries;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add attempt-specific options
        const attemptOptions = {
          ...options,
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          timeout: this.config.timeout * (1 + attempt * 0.5) // Progressive timeout
        };

        const response = await provider.generateResponse(prompt, context, attemptOptions);

        // Check response quality
        if (this.config.enableQualityScoring && !this.isResponseAcceptable(response)) {
          throw new Error('Response quality below threshold');
        }

        return response;

      } catch (error) {
        lastError = error;

        logger.warn(`Provider ${provider.name} attempt ${attempt + 1} failed`, {
          error: error.message,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1
        });

        // Don't retry on certain errors
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 10000);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Enhance response with additional metadata
   * @param {AIResponse} response - Original response
   * @param {Object} metadata - Enhancement metadata
   * @returns {AIResponse} Enhanced response
   */
  enhanceResponse(response, metadata) {
    const enhanced = { ...response };

    enhanced.metadata = {
      ...response.metadata,
      ...metadata,
      enhanced: true,
      managerVersion: '2.0',
      timestamp: new Date().toISOString()
    };

    // Add quality score if available
    if (this.config.enableQualityScoring) {
      enhanced.metadata.qualityScore = this.calculateResponseQuality(response, metadata.promptAnalysis);
    }

    // Add cost optimization info
    if (this.config.enableCostOptimization) {
      enhanced.metadata.costOptimization = this.getCostOptimizationInfo(response);
    }

    return enhanced;
  }

  /**
   * Handle enhanced failure with multiple fallback strategies
   * @param {Error} error - Original error
   * @param {string} prompt - Original prompt
   * @param {Object} context - Request context
   * @param {Object} options - Request options
   * @param {string} requestId - Request ID
   * @returns {Promise<AIResponse|null>} Fallback response or null
   */
  async handleEnhancedFailure(error, prompt, context, options, requestId) {
    logger.info(`Attempting enhanced fallback strategies for request: ${requestId}`);

    // Try fallback provider first
    const fallbackProvider = this.providers.get('fallback');
    if (fallbackProvider && fallbackProvider.config.enabled) {
      try {
        const fallbackResponse = await fallbackProvider.provider.generateResponse(prompt, context, {
          ...options,
          isFallback: true,
          originalError: error.message
        });

        fallbackResponse.metadata.isFallback = true;
        fallbackResponse.metadata.fallbackReason = error.message;
        fallbackResponse.metadata.requestId = requestId;

        this.metrics.fallbacksUsed++;
        return fallbackResponse;

      } catch (fallbackError) {
        logger.error('Fallback provider also failed', {
          error: fallbackError.message
        });
      }
    }

    // Try cached response if available
    if (this.config.enableCaching) {
      const cachedResponse = await this.checkCache(prompt, context);
      if (cachedResponse) {
        cachedResponse.metadata.isCached = true;
        cachedResponse.metadata.fallbackReason = 'cache';
        cachedResponse.metadata.requestId = requestId;
        return cachedResponse;
      }
    }

    // Try simplified prompt
    if (prompt.length > 200) {
      try {
        const simplifiedPrompt = prompt.substring(0, 200) + '...';
        const simpleResponse = await this.generateResponse(simplifiedPrompt, {
          ...context,
          simplified: true
        }, {
          ...options,
          simplified: true
        });

        simpleResponse.metadata.isSimplified = true;
        simpleResponse.metadata.requestId = requestId;
        return simpleResponse;

      } catch (simpleError) {
        logger.error('Simplified prompt also failed', {
          error: simpleError.message
        });
      }
    }

    return null;
  }

  /**
   * Start background health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', {
          error: error.message
        });
      }
    }, this.config.healthCheckInterval);

    logger.info('Enhanced health monitoring started', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const healthStatus = await this.getHealthStatus();

    // Update provider health based on checks
    for (const [name, providerInfo] of this.providers) {
      try {
        const isHealthy = await providerInfo.provider.isHealthy();

        if (!isHealthy && providerInfo.provider.metrics.isHealthy) {
          logger.warn(`Provider ${name} became unhealthy`);
          this.triggerProviderRecovery(name);
        }

      } catch (error) {
        logger.error(`Health check failed for provider ${name}`, {
          error: error.message
        });
      }
    }

    // Log overall health status
    const healthyCount = Object.values(healthStatus.providers).filter(p => p.healthy).length;
    const totalCount = Object.keys(healthStatus.providers).length;

    if (healthyCount < totalCount) {
      logger.warn('Some providers are unhealthy', {
        healthy: healthyCount,
        total: totalCount,
        unhealthyProviders: Object.entries(healthStatus.providers)
          .filter(([_, info]) => !info.healthy)
          .map(([name, _]) => name)
      });
    }
  }

  /**
   * Trigger provider recovery procedures
   * @param {string} providerName - Name of provider to recover
   */
  async triggerProviderRecovery(providerName) {
    logger.info(`Triggering recovery for provider: ${providerName}`);

    const providerInfo = this.providers.get(providerName);
    if (!providerInfo) return;

    try {
      // Reset provider metrics
      providerInfo.provider.resetMetrics();

      // Reset circuit breaker for this provider
      const providerCircuitBreaker = circuitBreakerFactory.get(providerName);
      if (providerCircuitBreaker) {
        providerCircuitBreaker.forceReset();
      }

      // Attempt warm-up request
      await providerInfo.provider.isHealthy();

      logger.info(`Provider ${providerName} recovery completed`);

    } catch (error) {
      logger.error(`Provider ${providerName} recovery failed`, {
        error: error.message
      });
    }
  }

  /**
   * Persist context for conversation continuity
   * @param {string} requestId - Request ID
   * @param {string} prompt - User prompt
   * @param {Object} context - Original context
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Enhanced context
   */
  async persistContext(requestId, prompt, context, options) {
    const sessionId = context.sessionId || this.generateSessionId();
    const timestamp = Date.now();

    // Store in context store
    this.contextStore.set(requestId, {
      sessionId,
      prompt,
      context,
      options,
      timestamp
    });

    // Update conversation session
    if (!this.conversationSessions.has(sessionId)) {
      this.conversationSessions.set(sessionId, {
        messages: [],
        startTime: timestamp,
        lastActivity: timestamp
      });
    }

    const session = this.conversationSessions.get(sessionId);
    session.messages.push({
      role: 'user',
      content: prompt,
      timestamp,
      requestId
    });

    session.lastActivity = timestamp;

    // Add conversation history to context
    const enhancedContext = {
      ...context,
      sessionId,
      conversationHistory: session.messages.slice(-10), // Last 10 messages
      contextStore: {
        size: this.contextStore.size,
        sessionCount: this.conversationSessions.size
      }
    };

    // Clean old contexts
    await this.cleanupOldContexts();

    return enhancedContext;
  }

  /**
   * Clean up old contexts and sessions
   */
  async cleanupOldContexts() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean old context entries
    for (const [requestId, entry] of this.contextStore.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.contextStore.delete(requestId);
      }
    }

    // Clean old sessions
    for (const [sessionId, session] of this.conversationSessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.conversationSessions.delete(sessionId);
      }
    }
  }

  // Helper methods for scoring and optimization
  calculatePerformanceScore(providerName, stats) {
    const baseScore = 20;
    if (!stats || stats.requestCount === 0) return baseScore;

    const successRate = stats.successCount / stats.requestCount;
    const avgLatency = stats.averageLatency || 0;

    const successScore = successRate * 15;
    const latencyScore = Math.max(0, 10 - (avgLatency / 1000));

    return baseScore + successScore + latencyScore;
  }

  calculateContextScore(providerName, prompt, context) {
    // Context-specific scoring logic
    return 10; // Placeholder
  }

  calculateCostScore(providerName, config) {
    // Cost optimization scoring
    return 5; // Placeholder
  }

  calculateQualityScore(providerName, config) {
    // Quality-based scoring
    return config.quality ? config.quality * 10 : 5;
  }

  getProviderCapabilities(providerName) {
    const capabilities = {
      'huggingface': {
        languages: ['javascript', 'python', 'java', 'cpp', 'all'],
        maxTokens: 4000,
        supportsCode: true,
        supportsStreaming: false
      },
      'gemini': {
        languages: ['javascript', 'python', 'java', 'all'],
        maxTokens: 8000,
        supportsCode: true,
        supportsStreaming: true
      },
      'fallback': {
        languages: ['all'],
        maxTokens: 1000,
        supportsCode: false,
        supportsStreaming: false
      }
    };

    return capabilities[providerName] || capabilities.fallback;
  }

  isRetryableError(error) {
    const nonRetryableErrors = [
      'authentication',
      'authorization',
      'invalid api key',
      'permission denied',
      'content blocked',
      'safety'
    ];

    const message = error.message.toLowerCase();
    return !nonRetryableErrors.some(pattern => message.includes(pattern));
  }

  isResponseAcceptable(response) {
    // Basic response quality checks
    return response.content &&
           response.content.length > 10 &&
           response.content.length < 10000;
  }

  calculateResponseQuality(response, promptAnalysis) {
    let quality = 0.5; // Base quality

    // Length-based quality
    if (response.content.length > 50) quality += 0.1;
    if (response.content.length > 200) quality += 0.1;
    if (response.content.length < 2000) quality += 0.1;

    // Content-based quality
    if (response.content.includes('```')) quality += 0.1; // Has code
    if (response.content.split('\n').length > 3) quality += 0.1; // Multi-line

    return Math.min(1.0, quality);
  }

  getCostOptimizationInfo(response) {
    return {
      costPerToken: response.cost / response.tokensUsed,
      totalCost: response.cost,
      savings: 0 // Placeholder for actual savings calculation
    };
  }

  updateEnhancedMetrics(response, responseTime) {
    this.metrics.successfulRequests++;
    this.metrics.totalLatency += responseTime;
    this.metrics.totalCost += response.cost || 0;
  }

  updateEnhancedProviderStats(providerName, response, success, error = null) {
    this.updateProviderStats(providerName, response, success, error);
  }

  async trackResponseQuality(response, promptAnalysis) {
    // Quality tracking implementation
  }

  trackCosts(response) {
    // Cost tracking implementation
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRequestId() {
    return `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get enhanced health status
   * @returns {Promise<Object>} Comprehensive health status
   */
  async getEnhancedHealthStatus() {
    const baseHealth = await this.getHealthStatus();

    return {
      ...baseHealth,
      enhanced: true,
      contextStore: {
        size: this.contextStore.size,
        sessions: this.conversationSessions.size
      },
      promptEngineer: {
        enabled: this.config.enablePromptEngineering,
        templateCount: Object.keys(this.promptEngineer.templates).length
      },
      features: {
        promptEngineering: this.config.enablePromptEngineering,
        contextPersistence: this.config.enableContextPersistence,
        advancedMonitoring: this.config.enableAdvancedMonitoring,
        costOptimization: this.config.enableCostOptimization,
        qualityScoring: this.config.enableQualityScoring
      }
    };
  }
}

module.exports = EnhancedAIServiceManager;