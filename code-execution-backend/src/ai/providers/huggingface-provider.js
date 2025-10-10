/**
 * Hugging Face AI Provider
 *
 * Enhanced implementation with support for multiple models,
 * intelligent model selection, and robust error handling.
 */

const { AIProvider, AIResponse, ProviderConfig } = require('../provider-interface');
const logger = require('../../utils/logger');

class HuggingFaceProvider extends AIProvider {
  constructor(config = {}) {
    super('huggingface', config);

    this.config = new ProviderConfig({
      apiKey: config.apiKey || process.env.HUGGINGFACE_API_KEY,
      baseURL: 'https://api-inference.huggingface.co',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      ...config
    });

    // Available models with priorities
    this.models = [
      {
        name: 'microsoft/Phi-3-mini-4k-instruct',
        displayName: 'Phi-3 Mini',
        priority: 1,
        quality: 0.9,
        costPerToken: 0.0000001,
        contextLength: 4000,
        capabilities: ['chat', 'code', 'reasoning']
      },
      {
        name: 'google/gemma-2b-it',
        displayName: 'Gemma 2B',
        priority: 2,
        quality: 0.85,
        costPerToken: 0.00000008,
        contextLength: 8000,
        capabilities: ['chat', 'code', 'instruction']
      },
      {
        name: 'mistralai/Mistral-7B-Instruct-v0.2',
        displayName: 'Mistral 7B',
        priority: 3,
        quality: 0.88,
        costPerToken: 0.00000012,
        contextLength: 32000,
        capabilities: ['chat', 'code', 'reasoning', 'instruction']
      },
      {
        name: 'meta-llama/Llama-2-7b-chat-hf',
        displayName: 'Llama 2 7B',
        priority: 4,
        quality: 0.87,
        costPerToken: 0.00000015,
        contextLength: 4096,
        capabilities: ['chat', 'instruction']
      },
      {
        name: 'tiiuae/falcon-7b-instruct',
        displayName: 'Falcon 7B',
        priority: 5,
        quality: 0.82,
        costPerToken: 0.00000009,
        contextLength: 2048,
        capabilities: ['chat', 'instruction']
      }
    ];

    this.currentModelIndex = 0;
    this.modelHealth = new Map();

    // Initialize model health tracking
    this.models.forEach(model => {
      this.modelHealth.set(model.name, {
        healthy: true,
        lastCheck: null,
        consecutiveFailures: 0,
        lastError: null
      });
    });

    logger.info('Hugging Face provider initialized', {
      modelCount: this.models.length,
      apiKeyConfigured: !!this.config.apiKey,
      baseURL: this.config.baseURL
    });
  }

  /**
   * Generate response from Hugging Face model
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.debug(`Hugging Face request started: ${requestId}`, {
        promptLength: prompt.length,
        hasContext: !!context
      });

      // Select best model for this request
      const selectedModel = await this.selectBestModel(prompt, context, options);

      if (!selectedModel) {
        throw new Error('No healthy models available');
      }

      logger.debug(`Selected model for request: ${requestId}`, {
        model: selectedModel.name,
        displayName: selectedModel.displayName
      });

      // Build the request payload
      const payload = this.buildPayload(prompt, context, options, selectedModel);

      // Make the API request
      const response = await this.makeAPIRequest(selectedModel, payload, requestId);

      // Process response
      const processedResponse = this.processResponse(response, selectedModel);

      const responseTime = Date.now() - startTime;

      // Create AI response
      const aiResponse = new AIResponse(processedResponse.content, {
        provider: this.name,
        model: selectedModel.displayName,
        tokensUsed: processedResponse.tokensUsed,
        cost: this.calculateCost(processedResponse.tokensUsed, selectedModel),
        latency: responseTime,
        requestId,
        metadata: {
          modelId: selectedModel.name,
          originalModel: selectedModel.name,
          payload: {
            temperature: payload.parameters?.temperature,
            maxTokens: payload.parameters?.max_new_tokens
          },
          responseMetadata: processedResponse.metadata
        }
      });

      // Update metrics and model health
      this.updateMetrics(true, responseTime);
      this.updateModelHealth(selectedModel.name, true);

      logger.debug(`Hugging Face request completed: ${requestId}`, {
        model: selectedModel.displayName,
        responseTime,
        tokensUsed: processedResponse.tokensUsed,
        cost: aiResponse.cost
      });

      return aiResponse;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime, error);

      logger.error(`Hugging Face request failed: ${requestId}`, {
        error: error.message,
        responseTime,
        stack: error.stack
      });

      // Try next model if available
      if (this.shouldTryNextModel(error)) {
        return await this.tryNextModel(prompt, context, options, requestId);
      }

      throw this.enhanceError(error, requestId, prompt, context);
    }
  }

  /**
   * Select the best model for the request
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<Object|null>} Selected model or null
   */
  async selectBestModel(prompt, context, options) {
    // Filter healthy models
    const healthyModels = this.models.filter(model => {
      const health = this.modelHealth.get(model.name);
      return health && health.healthy;
    });

    if (healthyModels.length === 0) {
      logger.warn('No healthy models available, checking all models');
      // If no healthy models, try to refresh health status
      await this.checkAllModelsHealth();
      return this.models[0]; // Return first model as last resort
    }

    // Prioritize models based on request type
    const requestType = this.classifyRequest(prompt, context);

    let prioritizedModels = healthyModels;

    if (requestType === 'code') {
      // Prioritize models good at coding
      prioritizedModels = healthyModels.sort((a, b) => {
        if (a.capabilities.includes('code') && !b.capabilities.includes('code')) return -1;
        if (!a.capabilities.includes('code') && b.capabilities.includes('code')) return 1;
        return a.priority - b.priority;
      });
    } else if (requestType === 'reasoning') {
      // Prioritize models good at reasoning
      prioritizedModels = healthyModels.sort((a, b) => {
        if (a.capabilities.includes('reasoning') && !b.capabilities.includes('reasoning')) return -1;
        if (!a.capabilities.includes('reasoning') && b.capabilities.includes('reasoning')) return 1;
        return a.quality - b.quality;
      });
    } else {
      // Sort by priority
      prioritizedModels = healthyModels.sort((a, b) => a.priority - b.priority);
    }

    return prioritizedModels[0];
  }

  /**
   * Classify the type of request
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {string} Request type
   */
  classifyRequest(prompt, context) {
    const promptLower = prompt.toLowerCase();

    // Code-related indicators
    const codeIndicators = [
      'code', 'function', 'class', 'variable', 'algorithm',
      'implement', 'programming', 'debug', 'syntax', 'api',
      'database', 'framework', 'library', 'script', 'application',
      '```', 'def ', 'class ', 'function ', 'import ', 'const ', 'let '
    ];

    // Reasoning indicators
    const reasoningIndicators = [
      'why', 'how does', 'explain', 'what if', 'compare',
      'analyze', 'evaluate', 'reasoning', 'logic', 'solve'
    ];

    if (codeIndicators.some(indicator => promptLower.includes(indicator))) {
      return 'code';
    } else if (reasoningIndicators.some(indicator => promptLower.includes(indicator))) {
      return 'reasoning';
    } else {
      return 'general';
    }
  }

  /**
   * Build API request payload
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @param {Object} model - Selected model
   * @returns {Object} API payload
   */
  buildPayload(prompt, context, options, model) {
    // Build conversation messages
    const messages = this.buildMessages(prompt, context, model);

    // Base parameters
    const parameters = {
      temperature: options.temperature || 0.7,
      max_new_tokens: options.maxTokens || 1000,
      top_p: options.topP || 0.9,
      top_k: options.topK || 50,
      repetition_penalty: options.repetitionPenalty || 1.1,
      stop: options.stopSequences || [],
      ...options.parameters
    };

    // Different payload formats for different model types
    if (model.name.includes('Phi-3') || model.name.includes('gemma')) {
      // Chat completion format
      return {
        model: model.name,
        messages,
        parameters,
        stream: false
      };
    } else {
      // Text generation format
      const fullPrompt = this.formatPromptForGeneration(messages, model);
      return {
        model: model.name,
        inputs: fullPrompt,
        parameters,
        stream: false
      };
    }
  }

  /**
   * Build conversation messages
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} model - Selected model
   * @returns {Array} Messages array
   */
  buildMessages(prompt, context, model) {
    const messages = [];

    // System message
    const systemMessage = this.buildSystemMessage(context, model);
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }

    // Context messages
    if (context && context.conversationHistory) {
      messages.push(...context.conversationHistory);
    }

    // User message
    messages.push({ role: 'user', content: prompt });

    return messages;
  }

  /**
   * Build system message based on context and model
   * @param {Object} context - Additional context
   * @param {Object} model - Selected model
   * @returns {string|null} System message or null
   */
  buildSystemMessage(context, model) {
    const requestType = this.classifyRequest(context?.prompt || '', context);

    let systemPrompt = 'You are a helpful AI assistant';

    if (requestType === 'code') {
      systemPrompt += ' specializing in coding, debugging, and software development';
    } else if (requestType === 'reasoning') {
      systemPrompt += ' skilled in logical reasoning and analysis';
    }

    systemPrompt += '. Provide clear, accurate, and helpful responses.';

    // Add model-specific instructions
    if (model.name.includes('Phi-3')) {
      systemPrompt += ' Use the chat format effectively and provide detailed explanations.';
    } else if (model.name.includes('gemma')) {
      systemPrompt += ' Be concise but thorough in your responses.';
    }

    return systemPrompt;
  }

  /**
   * Format prompt for text generation models
   * @param {Array} messages - Conversation messages
   * @param {Object} model - Selected model
   * @returns {string} Formatted prompt
   */
  formatPromptForGeneration(messages, model) {
    if (model.name.includes('llama') || model.name.includes('falcon')) {
      // LLaMA/Falcon format
      let prompt = '<s>';

      for (const message of messages) {
        if (message.role === 'system') {
          prompt += `[INST] <<SYS>>\n${message.content}\n<</SYS>>\n\n`;
        } else if (message.role === 'user') {
          prompt += `[INST] ${message.content} [/INST]`;
        } else if (message.role === 'assistant') {
          prompt += ` ${message.content}</s>`;
        }
      }

      return prompt;
    } else {
      // Default format
      return messages.map(m => `${m.role}: ${m.content}`).join('\n');
    }
  }

  /**
   * Make API request to Hugging Face
   * @param {Object} model - Selected model
   * @param {Object} payload - Request payload
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} API response
   */
  async makeAPIRequest(model, payload, requestId) {
    const url = `${this.config.baseURL}/models/${model.name}/v1/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CodeJoin/1.0'
    };

    // Add API key if available (optional for free tier)
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      logger.debug(`Making Hugging Face API request: ${requestId}`, {
        url,
        model: model.name,
        hasApiKey: !!this.config.apiKey
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      logger.debug(`Hugging Face API response received: ${requestId}`, {
        status: response.status,
        hasChoices: !!data.choices,
        choicesCount: data.choices?.length
      });

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Process API response
   * @param {Object} response - Raw API response
   * @param {Object} model - Selected model
   * @returns {Object} Processed response
   */
  processResponse(response, model) {
    try {
      let content = '';
      let tokensUsed = 0;
      let metadata = {};

      if (response.choices && response.choices.length > 0) {
        const choice = response.choices[0];

        if (choice.message) {
          content = choice.message.content || '';
        } else if (choice.text) {
          content = choice.text || '';
        }

        metadata = {
          finishReason: choice.finish_reason,
          index: choice.index
        };
      } else if (response.generated_text) {
        content = response.generated_text;
      } else {
        throw new Error('Invalid response format');
      }

      // Extract token usage if available
      if (response.usage) {
        tokensUsed = response.usage.total_tokens || 0;
      } else {
        // Estimate tokens
        tokensUsed = this.estimateTokens(content);
      }

      return {
        content: content.trim(),
        tokensUsed,
        metadata
      };

    } catch (error) {
      logger.error('Failed to process Hugging Face response', {
        error: error.message,
        response
      });
      throw new Error(`Response processing failed: ${error.message}`);
    }
  }

  /**
   * Check if we should try the next model
   * @param {Error} error - The error that occurred
   * @returns {boolean} True if we should try next model
   */
  shouldTryNextModel(error) {
    const message = error.message.toLowerCase();

    // Don't retry on certain errors
    const nonRetryableErrors = [
      'authentication',
      'authorization',
      'invalid api key',
      'permission denied'
    ];

    if (nonRetryableErrors.some(pattern => message.includes(pattern))) {
      return false;
    }

    // Retry on rate limiting, server errors, model loading, etc.
    const retryableErrors = [
      'rate limit',
      'too many requests',
      'internal server error',
      'service unavailable',
      'model is currently loading',
      'timeout',
      'connection'
    ];

    return retryableErrors.some(pattern => message.includes(pattern));
  }

  /**
   * Try the next available model
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @param {string} requestId - Request ID
   * @returns {Promise<AIResponse>} AI response from next model
   */
  async tryNextModel(prompt, context, options, requestId) {
    logger.info(`Trying next model for request: ${requestId}`);

    // Mark current model as unhealthy
    if (this.models[this.currentModelIndex]) {
      this.updateModelHealth(this.models[this.currentModelIndex].name, false);
    }

    // Move to next model
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;

    // Try again with new model (but limit retries)
    if (this.currentModelIndex < this.models.length) {
      return await this.generateResponse(prompt, context, options);
    } else {
      throw new Error('All models failed');
    }
  }

  /**
   * Update model health status
   * @param {string} modelName - Model name
   * @param {boolean} success - Whether request was successful
   */
  updateModelHealth(modelName, success) {
    const health = this.modelHealth.get(modelName);
    if (!health) return;

    health.lastCheck = Date.now();

    if (success) {
      health.healthy = true;
      health.consecutiveFailures = 0;
      health.lastError = null;
    } else {
      health.consecutiveFailures++;
      if (health.consecutiveFailures >= 3) {
        health.healthy = false;
      }
    }
  }

  /**
   * Check health of all models
   */
  async checkAllModelsHealth() {
    logger.info('Checking health of all Hugging Face models');

    for (const model of this.models) {
      try {
        // Simple health check with minimal payload
        const healthPayload = {
          model: model.name,
          messages: [{ role: 'user', content: 'Hello' }],
          parameters: { max_new_tokens: 10 },
          stream: false
        };

        await this.makeAPIRequest(model, healthPayload, 'health-check');
        this.updateModelHealth(model.name, true);

      } catch (error) {
        logger.warn(`Health check failed for model ${model.name}`, {
          error: error.message
        });
        this.updateModelHealth(model.name, false);
      }
    }
  }

  /**
   * Check if provider is healthy
   * @returns {Promise<boolean>} True if healthy
   */
  async isHealthy() {
    const healthyModels = this.models.filter(model => {
      const health = this.modelHealth.get(model.name);
      return health && health.healthy;
    });

    return healthyModels.length > 0;
  }

  /**
   * Get cost estimate for tokens
   * @param {number} tokens - Number of tokens
   * @param {Object} model - Model to use for cost calculation
   * @returns {number} Estimated cost in USD
   */
  getCostEstimate(tokens, model = null) {
    if (model) {
      return tokens * model.costPerToken;
    }

    // Use average cost if no model specified
    const avgCostPerToken = this.models.reduce((sum, m) => sum + m.costPerToken, 0) / this.models.length;
    return tokens * avgCostPerToken;
  }

  /**
   * Calculate actual cost based on token usage and model
   * @param {number} tokensUsed - Number of tokens used
   * @param {Object} model - Model that was used
   * @returns {number} Actual cost in USD
   */
  calculateCost(tokensUsed, model) {
    return this.getCostEstimate(tokensUsed, model);
  }

  /**
   * Estimate token count
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
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
    const enhancedError = new Error(`Hugging Face API error: ${error.message}`);
    enhancedError.name = 'HuggingFaceError';
    enhancedError.originalError = error;
    enhancedError.requestId = requestId;
    enhancedError.prompt = prompt.substring(0, 100) + '...';
    enhancedError.context = context;
    enhancedError.provider = this.name;
    enhancedError.timestamp = new Date().toISOString();

    // Add error classification
    const message = error.message.toLowerCase();
    if (message.includes('rate limit') || message.includes('too many requests')) {
      enhancedError.code = 'HUGGINGFACE_RATE_LIMIT';
      enhancedError.retryable = true;
    } else if (message.includes('model is currently loading')) {
      enhancedError.code = 'HUGGINGFACE_MODEL_LOADING';
      enhancedError.retryable = true;
    } else if (message.includes('timeout')) {
      enhancedError.code = 'HUGGINGFACE_TIMEOUT';
      enhancedError.retryable = true;
    } else {
      enhancedError.code = 'HUGGINGFACE_API_ERROR';
      enhancedError.retryable = true;
    }

    return enhancedError;
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `hf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get detailed provider metrics
   * @returns {Object} Provider metrics
   */
  getDetailedMetrics() {
    const baseMetrics = this.getMetrics();
    const modelMetrics = {};

    this.models.forEach(model => {
      const health = this.modelHealth.get(model.name);
      modelMetrics[model.name] = {
        displayName: model.displayName,
        priority: model.priority,
        quality: model.quality,
        costPerToken: model.costPerToken,
        capabilities: model.capabilities,
        healthy: health?.healthy || false,
        consecutiveFailures: health?.consecutiveFailures || 0,
        lastCheck: health?.lastCheck
      };
    });

    return {
      ...baseMetrics,
      modelCount: this.models.length,
      healthyModels: this.models.filter(m => {
        const health = this.modelHealth.get(m.name);
        return health?.healthy;
      }).length,
      currentModelIndex: this.currentModelIndex,
      modelMetrics,
      config: {
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        hasApiKey: !!this.config.apiKey
      }
    };
  }
}

module.exports = HuggingFaceProvider;