/**
 * Fallback Provider
 *
 * Provides intelligent fallback responses when all other AI providers
 * are unavailable. Includes template responses, cached responses,
 * and helpful guidance.
 */

const { AIProvider, AIResponse, ProviderConfig } = require('../provider-interface');
const logger = require('../../utils/logger');

class FallbackProvider extends AIProvider {
  constructor(config = {}) {
    super('fallback', config);

    this.config = new ProviderConfig({
      enableTemplates: config.enableTemplates !== false,
      enableCache: config.enableCache !== false,
      enableGuidance: config.enableGuidance !== false,
      templatePath: config.templatePath || './templates/fallback-responses.json',
      ...config
    });

    // Initialize template responses
    this.templates = this.initializeTemplates();

    // Response cache for offline mode
    this.responseCache = new Map();
    this.cacheMaxSize = 100;

    logger.info('Fallback provider initialized', {
      enableTemplates: this.config.enableTemplates,
      enableCache: this.config.enableCache,
      enableGuidance: this.config.enableGuidance,
      templateCount: Object.keys(this.templates).length
    });
  }

  /**
   * Generate fallback response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} options - Request options
   * @returns {Promise<AIResponse>} Fallback response
   */
  async generateResponse(prompt, context = {}, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      logger.debug(`Fallback response generation started: ${requestId}`, {
        promptLength: prompt.length,
        hasContext: !!context
      });

      let response = null;
      let responseType = 'fallback';

      // Try different fallback strategies in order
      if (this.config.enableCache) {
        response = this.getCachedResponse(prompt, context);
        if (response) {
          responseType = 'cached';
        }
      }

      if (!response && this.config.enableTemplates) {
        response = this.getTemplateResponse(prompt, context);
        if (response) {
          responseType = 'template';
        }
      }

      if (!response && this.config.enableGuidance) {
        response = this.getGuidanceResponse(prompt, context);
        responseType = 'guidance';
      }

      if (!response) {
        response = this.getDefaultResponse(prompt, context);
        responseType = 'default';
      }

      const responseTime = Date.now() - startTime;

      // Create AI response
      const aiResponse = new AIResponse(response.content, {
        provider: this.name,
        model: 'fallback-v1.0',
        tokensUsed: this.estimateTokens(response.content),
        cost: 0, // Fallback responses are free
        latency: responseTime,
        requestId,
        isFallback: true,
        fallbackType: responseType,
        metadata: {
          ...response.metadata,
          responseType,
          originalPrompt: prompt.substring(0, 100) + '...'
        }
      });

      // Update metrics
      this.updateMetrics(true, responseTime);

      // Cache the response for future use
      if (this.config.enableCache && responseType !== 'cached') {
        this.cacheResponse(prompt, context, response);
      }

      logger.debug(`Fallback response generated: ${requestId}`, {
        responseType,
        responseTime,
        contentLength: response.content.length
      });

      return aiResponse;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(false, responseTime, error);

      logger.error(`Fallback response generation failed: ${requestId}`, {
        error: error.message,
        responseTime
      });

      // Even fallback can fail, return a very basic response
      const basicResponse = this.getEmergencyResponse(prompt, context);

      return new AIResponse(basicResponse.content, {
        provider: this.name,
        model: 'fallback-emergency',
        tokensUsed: this.estimateTokens(basicResponse.content),
        cost: 0,
        latency: responseTime,
        requestId,
        isFallback: true,
        fallbackType: 'emergency',
        metadata: {
          ...basicResponse.metadata,
          responseType: 'emergency',
          originalError: error.message
        }
      });
    }
  }

  /**
   * Check if fallback provider is healthy (always true)
   * @returns {Promise<boolean>} Always true
   */
  async isHealthy() {
    return true; // Fallback provider is always available
  }

  /**
   * Get cost estimate (always 0 for fallback)
   * @param {number} tokens - Number of tokens
   * @returns {number} Always 0
   */
  getCostEstimate(tokens) {
    return 0; // Fallback responses are free
  }

  /**
   * Get cached response if available
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object|null} Cached response or null
   */
  getCachedResponse(prompt, context) {
    const cacheKey = this.generateCacheKey(prompt, context);
    const cached = this.responseCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < 3600000) { // 1 hour cache
      logger.debug('Using cached fallback response');
      return cached.response;
    }

    return null;
  }

  /**
   * Get template response based on prompt content
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object|null} Template response or null
   */
  getTemplateResponse(prompt, context) {
    const promptLower = prompt.toLowerCase();

    // Check for code-related prompts
    if (this.isCodePrompt(promptLower)) {
      return this.getCodeTemplateResponse(prompt, context);
    }

    // Check for explanation prompts
    if (this.isExplanationPrompt(promptLower)) {
      return this.getExplanationTemplateResponse(prompt, context);
    }

    // Check for debugging prompts
    if (this.isDebuggingPrompt(promptLower)) {
      return this.getDebuggingTemplateResponse(prompt, context);
    }

    // Check for general help prompts
    if (this.isHelpPrompt(promptLower)) {
      return this.getHelpTemplateResponse(prompt, context);
    }

    return null;
  }

  /**
   * Get guidance response with helpful instructions
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object} Guidance response
   */
  getGuidanceResponse(prompt, context) {
    return {
      content: `I apologize, but I'm currently experiencing technical difficulties and cannot provide a complete AI response at this moment.

Here's what you can do:

**Immediate Alternatives:**
1. Try rephrasing your question and asking again
2. Check if there are any specific error messages you can share
3. Break down your question into smaller, more specific parts

**For Code Questions:**
- Search for similar solutions on Stack Overflow
- Check official documentation
- Try writing a simpler version first

**General Questions:**
- Search online for the topic
- Consult relevant documentation or guides
- Try asking in a different way

**Technical Support:**
- If this issue persists, please contact support
- Check the service status page for ongoing issues

I should be back to normal operation soon. Thank you for your patience!`,
      metadata: {
        type: 'guidance',
        category: 'technical_difficulties'
      }
    };
  }

  /**
   * Get default response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object} Default response
   */
  getDefaultResponse(prompt, context) {
    return {
      content: `I'm sorry, but I'm currently unavailable to provide a detailed response. This is due to temporary technical difficulties with our AI services.

Please try again in a few moments, or consider these alternatives:

- If you need coding help, try searching online documentation
- For general questions, try rephrasing your query
- Check back later when services are restored

Thank you for your understanding.`,
      metadata: {
        type: 'default',
        category: 'service_unavailable'
      }
    };
  }

  /**
   * Get emergency response (last resort)
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object} Emergency response
   */
  getEmergencyResponse(prompt, context) {
    return {
      content: `I'm currently experiencing technical difficulties. Please try again later.`,
      metadata: {
        type: 'emergency',
        category: 'critical_error'
      }
    };
  }

  /**
   * Get code-specific template response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object} Code template response
   */
  getCodeTemplateResponse(prompt, context) {
    return {
      content: `I can help you with coding questions, but I'm currently operating in limited mode.

For coding assistance, consider these resources:

**Documentation:**
- Official language/framework documentation
- API references and guides
- Code examples and tutorials

**Online Resources:**
- Stack Overflow for specific questions
- GitHub repositories for examples
- Developer forums and communities

**Best Practices:**
- Start with a simple implementation
- Test your code incrementally
- Use version control
- Follow coding standards and conventions

Try asking your question again when I'm fully operational, or search online for specific code examples related to your needs.`,
      metadata: {
        type: 'template',
        category: 'coding'
      }
    };
  }

  /**
   * Get explanation template response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object} Explanation template response
   */
  getExplanationTemplateResponse(prompt, context) {
    return {
      content: `I'd be happy to help explain concepts, but I'm currently in limited service mode.

For explanations and learning:

**Educational Resources:**
- Online documentation and tutorials
- Educational websites and courses
- Books and technical articles
- Video tutorials and lectures

**Learning Strategies:**
- Break complex topics into smaller parts
- Practice with examples
- Teach the concept to someone else
- Connect new information to what you already know

**Community Resources:**
- Developer forums and discussion boards
- Study groups and online communities
- Mentors and experienced practitioners

Please try your question again later when I can provide a more detailed explanation.`,
      metadata: {
        type: 'template',
        category: 'explanation'
      }
    };
  }

  /**
   * Get debugging template response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object} Debugging template response
   */
  getDebuggingTemplateResponse(prompt, context) {
    return {
      content: `I can help with debugging, but I'm currently operating with limited capabilities.

For debugging assistance:

**Systematic Approach:**
1. Identify the specific error or unexpected behavior
2. Reproduce the issue consistently
3. Check error messages and logs
4. Use debugging tools and breakpoints
5. Isolate the problematic code section

**Common Strategies:**
- Print/Log statements to trace execution
- Comment out sections to isolate issues
- Test with simplified inputs
- Check for recent changes that might have caused the issue
- Compare working vs. non-working versions

**Resources:**
- Language-specific debugging guides
- IDE debugging documentation
- Stack Overflow for specific error messages
- Developer communities and forums

Share the specific error message or unexpected behavior, and try asking again when I'm fully operational for more targeted help.`,
      metadata: {
        type: 'template',
        category: 'debugging'
      }
    };
  }

  /**
   * Get help template response
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {Object} Help template response
   */
  getHelpTemplateResponse(prompt, context) {
    return {
      content: `I'm here to help, but currently operating in limited service mode.

**How I Can Normally Help:**
- Answer questions about programming and technology
- Explain concepts and provide examples
- Help with debugging and troubleshooting
- Assist with code reviews and best practices
- Provide guidance on technical decisions

**While I'm in Limited Mode:**
- Try rephrasing your question
- Be as specific as possible
- Include relevant context or error messages
- Check back later for full functionality

**Alternative Resources:**
- Official documentation
- Developer communities (Stack Overflow, GitHub, forums)
- Online tutorials and guides
- Technical blogs and articles

I apologize for the inconvenience and should be back to full service soon!`,
      metadata: {
        type: 'template',
        category: 'general_help'
      }
    };
  }

  /**
   * Check if prompt is code-related
   * @param {string} prompt - Lowercase prompt
   * @returns {boolean} True if code-related
   */
  isCodePrompt(prompt) {
    const codeKeywords = [
      'code', 'function', 'class', 'variable', 'algorithm',
      'implement', 'programming', 'debug', 'syntax', 'api',
      'database', 'framework', 'library', 'script', 'application'
    ];

    return codeKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Check if prompt is asking for explanation
   * @param {string} prompt - Lowercase prompt
   * @returns {boolean} True if explanation request
   */
  isExplanationPrompt(prompt) {
    const explanationKeywords = [
      'explain', 'what is', 'how does', 'why', 'describe',
      'tell me about', 'meaning', 'definition', 'concept'
    ];

    return explanationKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Check if prompt is debugging-related
   * @param {string} prompt - Lowercase prompt
   * @returns {boolean} True if debugging request
   */
  isDebuggingPrompt(prompt) {
    const debuggingKeywords = [
      'error', 'bug', 'issue', 'problem', 'fix', 'debug',
      'not working', 'broken', 'fail', 'exception', 'crash'
    ];

    return debuggingKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Check if prompt is asking for help
   * @param {string} prompt - Lowercase prompt
   * @returns {boolean} True if help request
   */
  isHelpPrompt(prompt) {
    const helpKeywords = [
      'help', 'assist', 'guide', 'show me', 'how to',
      'can you', 'please', 'support', 'advice'
    ];

    return helpKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Initialize template responses
   * @returns {Object} Template responses
   */
  initializeTemplates() {
    // Templates are now generated dynamically based on prompt type
    return {};
  }

  /**
   * Cache a response for future use
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @param {Object} response - Response to cache
   */
  cacheResponse(prompt, context, response) {
    const cacheKey = this.generateCacheKey(prompt, context);

    // Remove oldest entry if cache is full
    if (this.responseCache.size >= this.cacheMaxSize) {
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }

    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Generate cache key
   * @param {string} prompt - Input prompt
   * @param {Object} context - Additional context
   * @returns {string} Cache key
   */
  generateCacheKey(prompt, context) {
    const crypto = require('crypto');
    const contextStr = JSON.stringify(context || {});
    const combined = `${prompt}:${contextStr}`;
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = FallbackProvider;