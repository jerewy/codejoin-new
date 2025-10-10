/**
 * Google Gemini AI Provider
 *
 * Implementation of Google Gemini API with resilience patterns
 * and comprehensive error handling.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AIProvider, AIResponse, ProviderConfig } = require('../provider-interface');
const logger = require('../../utils/logger');

class GeminiProvider extends AIProvider {
  constructor(config = {}) {
    super('gemini', config);

    // Add debug logging
    logger.info('Gemini provider constructor called', {
      configModel: config.model,
      envModel: process.env.GEMINI_MODEL,
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY ? 'present' : 'missing'
    });

    this.config = new ProviderConfig({
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
      model: config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash', // Updated to newer model
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      ...config
    });

    // Validate configuration more gracefully
    try {
      this.config.validate();
    } catch (error) {
      logger.error('Gemini provider configuration validation failed:', error.message);
      throw new Error(`Gemini provider configuration error: ${error.message}`);
    }

    // Add debug logging
    logger.info('Gemini provider config created', {
      finalModel: this.config.model,
      apiKeyValid: !!this.config.apiKey,
      apiKeyPrefix: this.config.apiKey ? this.config.apiKey.substring(0, 8) + '...' : 'none'
    });

    try {
      // Initialize Gemini client
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);

      // Add debug logging before model creation
      logger.info('About to create Gemini model', {
        modelToUse: this.config.model
      });

      this.model = this.genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });

      // Note: Model availability testing moved to async initialization
      logger.info('Gemini provider initialization completed', {
        model: this.config.model,
        timeout: this.config.timeout
      });

    } catch (error) {
      logger.error('Failed to initialize Gemini provider:', {
        error: error.message,
        model: this.config.model,
        apiKeyPresent: !!this.config.apiKey
      });

      // Check for specific model not found error
      if (error.message.includes('404') || error.message.includes('not found')) {
        logger.error(`Gemini model ${this.config.model} is not available. Please update to a valid model name.`);
        throw new Error(`Gemini model ${this.config.model} not found. Update GEMINI_MODEL environment variable to a valid model like 'gemini-1.5-flash' or 'gemini-1.5-pro'.`);
      }

      throw new Error(`Gemini provider initialization failed: ${error.message}`);
    }
  }

  /**
   * Async initialization to test model availability
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (!this.model) {
        logger.warn('Gemini model not initialized, skipping availability test');
        return;
      }

      // Test model availability with a simple request
      logger.info('Testing Gemini model availability', {
        model: this.config.model
      });

      const testResult = await this.model.generateContent('Hello');
      const testResponse = testResult.response;
      const testText = testResponse.text();

      if (!testText || testText.length === 0) {
        throw new Error(`Gemini model ${this.config.model} returned empty response`);
      }

      logger.info('Gemini provider async initialization completed successfully', {
        model: this.config.model,
        timeout: this.config.timeout
      });

    } catch (error) {
      logger.error('Gemini async initialization failed', {
        error: error.message,
        model: this.config.model
      });

      // Don't throw here - let the health check handle it
      // This allows the provider to be registered but marked as unhealthy
    }
  }

  /**
   * Generate response from Gemini
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.debug(`Gemini request started: ${requestId}`, {
        promptLength: prompt.length,
        model: this.config.model
      });

      // Build the full prompt with context
      let fullPrompt = prompt;
      if (context && Object.keys(context).length > 0) {
        fullPrompt = this.buildPromptWithContext(prompt, context);
      }

      // Configure generation options
      const generationConfig = {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 2048,
        ...options.generationConfig
      };

      // Generate content
      const result = await Promise.race([
        this.model.generateContent(fullPrompt, generationConfig),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
        )
      ]);

      const response = result.response;
      const text = response.text();

      // Estimate tokens and cost
      const tokensUsed = this.estimateTokens(fullPrompt + text);
      const cost = this.calculateCost(tokensUsed);

      const responseTime = Date.now() - startTime;

      // Create AI response
      const aiResponse = new AIResponse(text, {
        provider: this.name,
        model: this.config.model,
        tokensUsed,
        cost,
        latency: responseTime,
        requestId,
        metadata: {
          generationConfig,
          promptLength: fullPrompt.length,
          responseLength: text.length,
          finishReason: response.candidates?.[0]?.finishReason
        }
      });

      // Update metrics
      this.updateMetrics(true, responseTime);

      logger.debug(`Gemini request completed: ${requestId}`, {
        responseTime,
        tokensUsed,
        cost,
        responseLength: text.length
      });

      return aiResponse;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(false, responseTime, error);

      // Handle specific Gemini errors
      const enhancedError = this.handleGeminiError(error, requestId, prompt, context);

      logger.error(`Gemini request failed: ${requestId}`, {
        error: enhancedError.message,
        code: enhancedError.code,
        responseTime,
        originalError: error.message
      });

      throw enhancedError;
    }
  }

  /**
   * Check if Gemini service is healthy
   * @returns {Promise<boolean>} True if healthy
   */
  async isHealthy() {
    try {
      const testPrompt = 'Hello';
      const result = await Promise.race([
        this.model.generateContent(testPrompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ]);

      const response = result.response;
      const text = response.text();

      return text && text.length > 0;

    } catch (error) {
      logger.warn('Gemini health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get cost estimate for tokens
   * @param {number} tokens - Number of tokens
   * @returns {number} Estimated cost in USD
   */
  getCostEstimate(tokens) {
    // Gemini Pro pricing (as of 2024)
    // Input: $0.00025 per 1K tokens
    // Output: $0.0005 per 1K tokens
    const inputCostPerToken = 0.00000025;
    const outputCostPerToken = 0.0000005;

    // Assume 50/50 split between input and output
    const estimatedInputTokens = tokens * 0.5;
    const estimatedOutputTokens = tokens * 0.5;

    return (estimatedInputTokens * inputCostPerToken) + (estimatedOutputTokens * outputCostPerToken);
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate actual cost based on token usage
   * @param {number} tokensUsed - Number of tokens used
   * @returns {number} Actual cost in USD
   */
  calculateCost(tokensUsed) {
    return this.getCostEstimate(tokensUsed);
  }

  /**
   * Build prompt with context
   * @param {string} prompt - Original prompt
   * @param {Object} context - Context object
   * @returns {string} Enhanced prompt
   */
  buildPromptWithContext(prompt, context) {
    if (!context || typeof context === 'string') {
      return context ? `Context: ${context}\n\nUser: ${prompt}` : prompt;
    }

    let contextString = '';
    for (const [key, value] of Object.entries(context)) {
      if (value) {
        contextString += `${key}: ${value}\n`;
      }
    }

    return contextString ? `${contextString}\nUser: ${prompt}` : prompt;
  }

  /**
   * Handle Gemini-specific errors
   * @param {Error} error - Original error
   * @param {string} requestId - Request ID
   * @param {string} prompt - Original prompt
   * @param {Object} context - Original context
   * @returns {Error} Enhanced error
   */
  handleGeminiError(error, requestId, prompt, context) {
    const message = error.message.toLowerCase();
    let enhancedError = error;

    // API key errors
    if (message.includes('api key') || message.includes('authentication')) {
      enhancedError = new Error('Gemini API authentication failed');
      enhancedError.code = 'GEMINI_AUTH_ERROR';
      enhancedError.retryable = false;
    }

    // Quota/Rate limit errors
    else if (message.includes('quota') || message.includes('rate limit') || message.includes('too many requests')) {
      enhancedError = new Error('Gemini API quota exceeded');
      enhancedError.code = 'GEMINI_QUOTA_ERROR';
      enhancedError.retryable = true;
    }

    // Safety filter errors
    else if (message.includes('safety') || message.includes('blocked') || message.includes('policy')) {
      enhancedError = new Error('Content blocked by Gemini safety filters');
      enhancedError.code = 'GEMINI_SAFETY_ERROR';
      enhancedError.retryable = false;
    }

    // Model overloaded errors
    else if (message.includes('overloaded') || message.includes('try again later') || message.includes('503')) {
      enhancedError = new Error('Gemini model is overloaded');
      enhancedError.code = 'GEMINI_OVERLOADED';
      enhancedError.retryable = true;
    }

    // Network errors
    else if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      enhancedError = new Error('Gemini API network error');
      enhancedError.code = 'GEMINI_NETWORK_ERROR';
      enhancedError.retryable = true;
    }

    // Content too long
    else if (message.includes('too long') || message.includes('limit') || message.includes('maximum')) {
      enhancedError = new Error('Content exceeds Gemini length limit');
      enhancedError.code = 'GEMINI_LENGTH_ERROR';
      enhancedError.retryable = false;
    }

    // Generic API errors
    else {
      enhancedError = new Error('Gemini API error');
      enhancedError.code = 'GEMINI_API_ERROR';
      enhancedError.retryable = true;
    }

    // Add additional context
    enhancedError.provider = this.name;
    enhancedError.requestId = requestId;
    enhancedError.prompt = prompt;
    enhancedError.context = context;
    enhancedError.model = this.config.model;
    enhancedError.timestamp = new Date().toISOString();

    return enhancedError;
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get provider-specific metrics
   * @returns {Object} Provider metrics
   */
  getDetailedMetrics() {
    const baseMetrics = this.getMetrics();
    return {
      ...baseMetrics,
      model: this.config.model,
      apiKeyConfigured: !!this.config.apiKey,
      estimatedCost: baseMetrics.totalLatency * 0.00000025, // Rough cost estimate
      averageTokensPerRequest: baseMetrics.requestCount > 0 ? 1000 : 0, // Estimate
      config: {
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      }
    };
  }
}

module.exports = GeminiProvider;