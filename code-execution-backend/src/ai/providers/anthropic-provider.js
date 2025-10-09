/**
 * Anthropic Claude Provider
 *
 * Implementation of Anthropic Claude API with resilience patterns
 * and comprehensive error handling.
 */

const { AIProvider, AIResponse, ProviderConfig } = require('../provider-interface');
const logger = require('../../utils/logger');

class AnthropicProvider extends AIProvider {
  constructor(config = {}) {
    super('anthropic', config);

    this.config = new ProviderConfig({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      model: config.model || 'claude-3-sonnet-20240229',
      baseURL: config.baseURL || 'https://api.anthropic.com/v1',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      version: config.version || '2023-06-01',
      ...config
    });

    this.config.validate();

    // Set up headers
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': this.config.version
    };

    logger.info('Anthropic provider initialized', {
      model: this.config.model,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      version: this.config.version
    });
  }

  /**
   * Generate response from Anthropic Claude
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.debug(`Anthropic request started: ${requestId}`, {
        promptLength: prompt.length,
        model: this.config.model
      });

      // Build messages array
      const messages = this.buildMessages(prompt, context);

      // Configure request body
      const requestBody = {
        model: this.config.model,
        max_tokens: options.maxTokens || 2048,
        messages,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        top_k: options.topK || -1,
        ...options.additionalParams
      };

      // Add system message if provided
      if (context && context.system) {
        requestBody.system = context.system;
      }

      // Make API request
      const response = await this.makeAPIRequest('messages', requestBody);
      const data = await response.json();

      if (!response.ok) {
        throw new AnthropicError(data.error?.message || 'Anthropic API error', data.error?.type);
      }

      const text = data.content[0]?.text || '';

      // Calculate tokens and cost
      const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || this.estimateTokens(prompt + text);
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
          stopReason: data.stop_reason,
          stopSequence: data.stop_sequence,
          inputTokens: data.usage?.input_tokens,
          outputTokens: data.usage?.output_tokens,
          modelUsed: data.model
        }
      });

      // Update metrics
      this.updateMetrics(true, responseTime);

      logger.debug(`Anthropic request completed: ${requestId}`, {
        responseTime,
        tokensUsed,
        cost,
        stopReason: data.stop_reason
      });

      return aiResponse;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(false, responseTime, error);

      // Handle specific Anthropic errors
      const enhancedError = this.handleAnthropicError(error, requestId, prompt, context);

      logger.error(`Anthropic request failed: ${requestId}`, {
        error: enhancedError.message,
        code: enhancedError.code,
        responseTime,
        originalError: error.message
      });

      throw enhancedError;
    }
  }

  /**
   * Check if Anthropic service is healthy
   * @returns {Promise<boolean>} True if healthy
   */
  async isHealthy() {
    try {
      const messages = [
        { role: 'user', content: 'Hello' }
      ];

      const requestBody = {
        model: this.config.model,
        max_tokens: 10,
        messages
      };

      const response = await Promise.race([
        this.makeAPIRequest('messages', requestBody),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ]);

      const data = await response.json();

      return response.ok && data.content && data.content.length > 0;

    } catch (error) {
      logger.warn('Anthropic health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Make API request to Anthropic
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

    // Add context as user message if provided (but not system message)
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
    // Claude 3 Sonnet pricing (as of 2024)
    // Input: $3.00 per 1M tokens
    // Output: $15.00 per 1M tokens
    const inputCostPerToken = 0.000003;
    const outputCostPerToken = 0.000015;

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

    // Claude 3 Sonnet pricing
    const inputCostPerToken = 0.000003;
    const outputCostPerToken = 0.000015;

    const inputCost = (usage.input_tokens || 0) * inputCostPerToken;
    const outputCost = (usage.output_tokens || 0) * outputCostPerToken;

    return inputCost + outputCost;
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
   * Handle Anthropic-specific errors
   * @param {Error} error - Original error
   * @param {string} requestId - Request ID
   * @param {string} prompt - Original prompt
   * @param {Object} context - Original context
   * @returns {Error} Enhanced error
   */
  handleAnthropicError(error, requestId, prompt, context) {
    let enhancedError = error;
    const message = error.message.toLowerCase();

    // API key errors
    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('invalid api key')) {
      enhancedError = new Error('Anthropic API authentication failed');
      enhancedError.code = 'ANTHROPIC_AUTH_ERROR';
      enhancedError.retryable = false;
    }

    // Rate limit errors
    else if (message.includes('rate limit') || message.includes('too many requests') || error.type === 'rate_limit_error') {
      enhancedError = new Error('Anthropic API rate limit exceeded');
      enhancedError.code = 'ANTHROPIC_RATE_LIMIT';
      enhancedError.retryable = true;
    }

    // Model not available
    else if (message.includes('model not found') || message.includes('invalid model') || error.type === 'invalid_request_error') {
      enhancedError = new Error('Anthropic model not available');
      enhancedError.code = 'ANTHROPIC_MODEL_ERROR';
      enhancedError.retryable = false;
    }

    // Content policy violations
    else if (message.includes('content policy') || message.includes('safety') || error.type === 'content_policy_error') {
      enhancedError = new Error('Content blocked by Anthropic policy');
      enhancedError.code = 'ANTHROPIC_SAFETY_ERROR';
      enhancedError.retryable = false;
    }

    // Server overloaded
    else if (message.includes('overloaded') || message.includes('server error') || error.type === 'overloaded_error') {
      enhancedError = new Error('Anthropic server is overloaded');
      enhancedError.code = 'ANTHROPIC_OVERLOADED';
      enhancedError.retryable = true;
    }

    // Network errors
    else if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      enhancedError = new Error('Anthropic API network error');
      enhancedError.code = 'ANTHROPIC_NETWORK_ERROR';
      enhancedError.retryable = true;
    }

    // Content too long
    else if (message.includes('too long') || message.includes('maximum') || message.includes('context length')) {
      enhancedError = new Error('Content exceeds Anthropic context length limit');
      enhancedError.code = 'ANTHROPIC_LENGTH_ERROR';
      enhancedError.retryable = false;
    }

    // Generic API errors
    else {
      enhancedError = new Error('Anthropic API error');
      enhancedError.code = 'ANTHROPIC_API_ERROR';
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
    return `anthropic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      version: this.config.version,
      config: {
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      }
    };
  }
}

/**
 * Anthropic-specific error class
 */
class AnthropicError extends Error {
  constructor(message, type = 'api_error') {
    super(message);
    this.name = 'AnthropicError';
    this.code = type;
    this.isProviderError = true;
  }
}

module.exports = AnthropicProvider;