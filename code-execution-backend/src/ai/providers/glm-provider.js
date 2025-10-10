/**
 * GLM (General Language Model) Provider
 *
 * Implementation of GLM API with resilience patterns
 * and comprehensive error handling.
 */

const { AIProvider, AIResponse, ProviderConfig } = require('../provider-interface');
const logger = require('../../utils/logger');

class GLMProvider extends AIProvider {
  constructor(config = {}) {
    super('glm', config);

    this.config = new ProviderConfig({
      apiKey: config.apiKey || process.env.GLM_API_KEY,
      model: config.model || 'glm-4.6',
      baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      ...config
    });

    this.config.validate();

    // Set up headers
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };

    logger.info('GLM provider initialized', {
      model: this.config.model,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      apiKeyPresent: !!this.config.apiKey
    });
  }

  /**
   * Generate response from GLM
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.debug(`GLM request started: ${requestId}`, {
        promptLength: prompt.length,
        model: this.config.model
      });

      // Build messages array
      const messages = this.buildMessages(prompt, context);

      // Configure request body
      const requestBody = {
        model: this.config.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
        top_p: options.topP || 0.9,
        stream: false,
        ...options.additionalParams
      };

      // Make API request
      const response = await this.makeAPIRequest('chat/completions', requestBody);
      const data = await response.json();

      if (!response.ok) {
        throw new GLMError(data.error?.message || 'GLM API error', data.error?.code);
      }

      const choice = data.choices[0];
      const text = choice.message.content;

      // Calculate tokens and cost
      const tokensUsed = data.usage?.total_tokens || this.estimateTokens(prompt + text);
      const cost = this.calculateCost(data.usage);

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
          finishReason: choice.finish_reason,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          modelUsed: data.model,
          index: choice.index
        }
      });

      // Update metrics
      this.updateMetrics(true, responseTime);

      logger.debug(`GLM request completed: ${requestId}`, {
        responseTime,
        tokensUsed,
        cost,
        finishReason: choice.finish_reason
      });

      return aiResponse;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(false, responseTime, error);

      // Handle specific GLM errors
      const enhancedError = this.handleGLMError(error, requestId, prompt, context);

      logger.error(`GLM request failed: ${requestId}`, {
        error: enhancedError.message,
        code: enhancedError.code,
        responseTime,
        originalError: error.message
      });

      throw enhancedError;
    }
  }

  /**
   * Check if GLM service is healthy
   * @returns {Promise<boolean>} True if healthy
   */
  async isHealthy() {
    try {
      const testMessages = [
        { role: 'user', content: 'Hello' }
      ];

      const requestBody = {
        model: this.config.model,
        messages: testMessages,
        max_tokens: 10
      };

      const response = await Promise.race([
        this.makeAPIRequest('chat/completions', requestBody),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ]);

      const data = await response.json();

      return response.ok && data.choices && data.choices.length > 0;

    } catch (error) {
      logger.warn('GLM health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Make API request to GLM
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @returns {Promise<Response>} HTTP response
   */
  async makeAPIRequest(endpoint, body) {
    const url = `${this.config.baseURL}/${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Build messages array from prompt and context
   * @param {string} prompt - Main prompt
   * @param {Object} context - Additional context
   * @returns {Array} Messages array
   */
  buildMessages(prompt, context) {
    const messages = [];

    // Add system message if context has system prompt
    if (context && context.system) {
      messages.push({ role: 'system', content: context.system });
    }

    // Add context as user message if provided
    if (context && context.context) {
      messages.push({ role: 'user', content: context.context });
    }

    // Add main prompt
    messages.push({ role: 'user', content: prompt });

    return messages;
  }

  /**
   * Get cost estimate for tokens
   * @param {number} tokens - Number of tokens
   * @returns {number} Estimated cost in USD
   */
  getCostEstimate(tokens) {
    // GLM-4.6 pricing (estimated)
    // Input: ~$0.01 per 1K tokens
    // Output: ~$0.03 per 1K tokens
    const inputCostPerToken = 0.00001;
    const outputCostPerToken = 0.00003;

    // Assume 50/50 split between input and output
    const estimatedInputTokens = tokens * 0.5;
    const estimatedOutputTokens = tokens * 0.5;

    return (estimatedInputTokens * inputCostPerToken) + (estimatedOutputTokens * outputCostPerToken);
  }

  /**
   * Calculate actual cost based on token usage
   * @param {Object} usage - Token usage from API response
   * @returns {number} Actual cost in USD
   */
  calculateCost(usage) {
    if (!usage) {
      return this.getCostEstimate(1000); // Fallback estimate
    }

    // GLM-4.6 pricing
    const inputCostPerToken = 0.00001;
    const outputCostPerToken = 0.00003;

    const inputCost = (usage.prompt_tokens || 0) * inputCostPerToken;
    const outputCost = (usage.completion_tokens || 0) * outputCostPerToken;

    return inputCost + outputCost;
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token for English/Chinese mix
    return Math.ceil(text.length / 4);
  }

  /**
   * Handle GLM-specific errors
   * @param {Error} error - Original error
   * @param {string} requestId - Request ID
   * @param {string} prompt - Original prompt
   * @param {Object} context - Original context
   * @returns {Error} Enhanced error
   */
  handleGLMError(error, requestId, prompt, context) {
    let enhancedError = error;
    const message = error.message.toLowerCase();

    // API key errors
    if (message.includes('invalid api key') || message.includes('authentication') || message.includes('unauthorized')) {
      enhancedError = new Error('GLM API authentication failed');
      enhancedError.code = 'GLM_AUTH_ERROR';
      enhancedError.retryable = false;
    }

    // Quota/Rate limit errors
    else if (message.includes('rate limit') || message.includes('too many requests') || message.includes('frequency')) {
      enhancedError = new Error('GLM API rate limit exceeded');
      enhancedError.code = 'GLM_RATE_LIMIT';
      enhancedError.retryable = true;
    }

    // Insufficient quota
    else if (message.includes('insufficient quota') || message.includes('balance') || message.includes('credit')) {
      enhancedError = new Error('GLM API quota exceeded');
      enhancedError.code = 'GLM_QUOTA_ERROR';
      enhancedError.retryable = false;
    }

    // Model not found
    else if (message.includes('not found') || message.includes('does not exist') || message.includes('model')) {
      enhancedError = new Error('GLM model not found');
      enhancedError.code = 'GLM_MODEL_ERROR';
      enhancedError.retryable = false;
    }

    // Content policy violations
    else if (message.includes('content policy') || message.includes('safety') || message.includes('violation')) {
      enhancedError = new Error('Content blocked by GLM policy');
      enhancedError.code = 'GLM_SAFETY_ERROR';
      enhancedError.retryable = false;
    }

    // Server overloaded
    else if (message.includes('overloaded') || message.includes('server error') || message.includes('busy')) {
      enhancedError = new Error('GLM server is overloaded');
      enhancedError.code = 'GLM_OVERLOADED';
      enhancedError.retryable = true;
    }

    // Network errors
    else if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      enhancedError = new Error('GLM API network error');
      enhancedError.code = 'GLM_NETWORK_ERROR';
      enhancedError.retryable = true;
    }

    // Content too long
    else if (message.includes('too long') || message.includes('maximum') || message.includes('length')) {
      enhancedError = new Error('Content exceeds GLM context length limit');
      enhancedError.code = 'GLM_LENGTH_ERROR';
      enhancedError.retryable = false;
    }

    // Generic API errors
    else {
      enhancedError = new Error('GLM API error');
      enhancedError.code = 'GLM_API_ERROR';
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
    return `glm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      baseURL: this.config.baseURL,
      config: {
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      }
    };
  }
}

/**
 * GLM-specific error class
 */
class GLMError extends Error {
  constructor(message, code = 'GLM_ERROR') {
    super(message);
    this.name = 'GLMError';
    this.code = code;
    this.isProviderError = true;
  }
}

module.exports = GLMProvider;