/**
 * AI Provider Interface
 *
 * Defines the contract for all AI providers in the system.
 * Each provider must implement these methods to ensure
 * consistent behavior across different AI services.
 */

/**
 * Base interface for all AI providers
 */
class AIProvider {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalLatency: 0,
      lastUsed: null,
      lastError: null,
      isHealthy: true
    };
  }

  /**
   * Generate a response from the AI model
   * @param {string} prompt - The input prompt
   * @param {Object} context - Additional context for the request
   * @param {Object} options - Provider-specific options
   * @returns {Promise<AIResponse>} The AI response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    throw new Error('generateResponse method must be implemented by provider');
  }

  /**
   * Check if the provider is healthy and available
   * @returns {Promise<boolean>} True if provider is healthy
   */
  async isHealthy() {
    throw new Error('isHealthy method must be implemented by provider');
  }

  /**
   * Get estimated cost for this request
   * @param {number} tokens - Number of tokens
   * @returns {number} Estimated cost in USD
   */
  getCostEstimate(tokens) {
    throw new Error('getCostEstimate method must be implemented by provider');
  }

  /**
   * Get current provider metrics
   * @returns {Object} Provider metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageLatency: this.metrics.requestCount > 0
        ? this.metrics.totalLatency / this.metrics.requestCount
        : 0,
      successRate: this.metrics.requestCount > 0
        ? this.metrics.successCount / this.metrics.requestCount
        : 0
    };
  }

  /**
   * Reset provider metrics
   */
  resetMetrics() {
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalLatency: 0,
      lastUsed: null,
      lastError: null,
      isHealthy: true
    };
  }

  /**
   * Update metrics after a request
   * @param {boolean} success - Whether the request was successful
   * @param {number} latency - Request latency in milliseconds
   * @param {Error|null} error - Error if request failed
   */
  updateMetrics(success, latency, error = null) {
    this.metrics.requestCount++;
    this.metrics.totalLatency += latency;
    this.metrics.lastUsed = new Date();

    if (success) {
      this.metrics.successCount++;
      this.metrics.isHealthy = true;
    } else {
      this.metrics.errorCount++;
      this.metrics.lastError = error;

      // Mark as unhealthy after consecutive failures
      if (this.metrics.errorCount >= 3) {
        this.metrics.isHealthy = false;
      }
    }
  }
}

/**
 * AI Response object structure
 */
class AIResponse {
  constructor(content, metadata = {}) {
    this.content = content;
    this.provider = metadata.provider || 'unknown';
    this.model = metadata.model || 'unknown';
    this.tokensUsed = metadata.tokensUsed || 0;
    this.cost = metadata.cost || 0;
    this.latency = metadata.latency || 0;
    this.timestamp = new Date().toISOString();
    this.requestId = metadata.requestId || this.generateRequestId();
    this.isCached = metadata.isCached || false;
    this.confidence = metadata.confidence || 1.0;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      content: this.content,
      provider: this.provider,
      model: this.model,
      tokensUsed: this.tokensUsed,
      cost: this.cost,
      latency: this.latency,
      timestamp: this.timestamp,
      requestId: this.requestId,
      isCached: this.isCached,
      confidence: this.confidence
    };
  }
}

/**
 * Provider Configuration
 */
class ProviderConfig {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.rateLimit = config.rateLimit || {
      requests: 60,
      window: 60000 // 1 minute
    };
    this.priority = config.priority || 1; // 1 = highest priority
    this.enabled = config.enabled !== false;
    this.options = config.options || {};
  }

  validate() {
    if (!this.apiKey) {
      throw new Error(`${this.constructor.name}: API key is required`);
    }
    return true;
  }
}

module.exports = {
  AIProvider,
  AIResponse,
  ProviderConfig
};