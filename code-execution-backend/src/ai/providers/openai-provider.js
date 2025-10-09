/**
 * OpenAI GPT Provider
 *
 * Implementation of OpenAI API with resilience patterns
 * and comprehensive error handling.
 */

const { AIProvider, AIResponse, ProviderConfig } = require('../provider-interface');
const logger = require('../../utils/logger');

class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super('openai', config);

    this.config = new ProviderConfig({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-3.5-turbo',
      baseURL: config.baseURL || 'https://api.openai.com/v1',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      organization: config.organization || process.env.OPENAI_ORGANIZATION,
      ...config
    });

    this.config.validate();

    // Set up headers
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };

    if (this.config.organization) {
      this.headers['OpenAI-Organization'] = this.config.organization;
    }

    logger.info('OpenAI provider initialized', {
      model: this.config.model,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout
    });
  }

  /**
   * Generate response from OpenAI
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.debug(`OpenAI request started: ${requestId}`, {
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
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        ...options.additionalParams
      };

      // Make API request
      const response = await this.makeAPIRequest('chat/completions', requestBody);
      const data = await response.json();

      if (!response.ok) {
        throw new OpenAIError(data.error?.message || 'OpenAI API error', data.error?.code);
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
          systemFingerprint: data.system_fingerprint
        }
      });

      // Update metrics
      this.updateMetrics(true, responseTime);

      logger.debug(`OpenAI request completed: ${requestId}`, {
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

      // Handle specific OpenAI errors
      const enhancedError = this.handleOpenAIError(error, requestId, prompt, context);

      logger.error(`OpenAI request failed: ${requestId}`, {
        error: enhancedError.message,
        code: enhancedError.code,
        responseTime,
        originalError: error.message
      });

      throw enhancedError;
    }
  }

  /**
   * Check if OpenAI service is healthy
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
      logger.warn('OpenAI health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Make API request to OpenAI
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
    // OpenAI GPT-3.5-turbo pricing (as of 2024)
    // Input: $0.0015 per 1K tokens
    // Output: $0.002 per 1K tokens
    const inputCostPerToken = 0.0000015;
    const outputCostPerToken = 0.000002;

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

    // GPT-3.5-turbo pricing
    const inputCostPerToken = 0.0000015;
    const outputCostPerToken = 0.000002;

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
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Handle OpenAI-specific errors
   * @param {Error} error - Original error
   * @param {string} requestId - Request ID
   * @param {string} prompt - Original prompt
   * @param {Object} context - Original context
   * @returns {Error} Enhanced error
   */
  handleOpenAIError(error, requestId, prompt, context) {
    let enhancedError = error;
    const message = error.message.toLowerCase();

    // API key errors
    if (message.includes('invalid api key') || message.includes('authentication') || message.includes('unauthorized')) {
      enhancedError = new Error('OpenAI API authentication failed');
      enhancedError.code = 'OPENAI_AUTH_ERROR';
      enhancedError.retryable = false;
    }

    // Quota/Rate limit errors
    else if (message.includes('rate limit') || message.includes('too many requests') || error.code === 'rate_limit_exceeded') {
      enhancedError = new Error('OpenAI API rate limit exceeded');
      enhancedError.code = 'OPENAI_RATE_LIMIT';
      enhancedError.retryable = true;
    }

    // Insufficient quota
    else if (message.includes('insufficient quota') || message.includes('exceeded current quota') || error.code === 'insufficient_quota') {
      enhancedError = new Error('OpenAI API quota exceeded');
      enhancedError.code = 'OPENAI_QUOTA_ERROR';
      enhancedError.retryable = false;
    }

    // Model not found
    else if (message.includes('not found') || message.includes('does not exist') || error.code === 'model_not_found') {
      enhancedError = new Error('OpenAI model not found');
      enhancedError.code = 'OPENAI_MODEL_ERROR';
      enhancedError.retryable = false;
    }

    // Content policy violations
    else if (message.includes('content policy') || message.includes('safety') || error.code === 'content_policy_violation') {
      enhancedError = new Error('Content blocked by OpenAI policy');
      enhancedError.code = 'OPENAI_SAFETY_ERROR';
      enhancedError.retryable = false;
    }

    // Server overloaded
    else if (message.includes('overloaded') || message.includes('server error') || error.code === 'server_overloaded') {
      enhancedError = new Error('OpenAI server is overloaded');
      enhancedError.code = 'OPENAI_OVERLOADED';
      enhancedError.retryable = true;
    }

    // Network errors
    else if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      enhancedError = new Error('OpenAI API network error');
      enhancedError.code = 'OPENAI_NETWORK_ERROR';
      enhancedError.retryable = true;
    }

    // Content too long
    else if (message.includes('too long') || message.includes('maximum') || error.code === 'context_length_exceeded') {
      enhancedError = new Error('Content exceeds OpenAI context length limit');
      enhancedError.code = 'OPENAI_LENGTH_ERROR';
      enhancedError.retryable = false;
    }

    // Generic API errors
    else {
      enhancedError = new Error('OpenAI API error');
      enhancedError.code = 'OPENAI_API_ERROR';
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
    return `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      organization: this.config.organization,
      baseURL: this.config.baseURL,
      config: {
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      }
    };
  }
}

/**
 * OpenAI-specific error class
 */
class OpenAIError extends Error {
  constructor(message, code = 'OPENAI_ERROR') {
    super(message);
    this.name = 'OpenAIError';
    this.code = code;
    this.isProviderError = true;
  }
}

module.exports = OpenAIProvider;