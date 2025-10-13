const GeminiOnlyAIServiceManager = require('../services/gemini-only-ai-service-manager');
const logger = require('../utils/logger');

class LocalAIChatController {
  constructor() {
    // Initialize Gemini as fallback
    this.geminiServiceManager = new GeminiOnlyAIServiceManager({
      enableHealthMonitoring: true,
      enableResponseCache: true,
      enableFallbackProvider: true,
      healthCheckInterval: 30000,
      cacheSize: 500
    });

    // Ollama configuration
    this.ollamaUrl = 'http://localhost:11434';
    this.ollamaModel = 'deepseek-coder:6.7b';

    logger.info('Local AI Chat Controller initialized with Ollama + Gemini fallback');
  }

  async chat(req, res) {
    const startTime = Date.now();

    try {
      const { message, context } = req.body;

      // Enhanced input validation
      const validationError = this.validateInput(message, context);
      if (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError,
          type: 'validation_error'
        });
      }

      logger.info('Local AI chat request received', {
        requestId: req.id,
        messageLength: message.length,
        hasContext: !!context,
        userAgent: req.get('User-Agent')
      });

      // Try local Ollama first
      const result = await this.processWithLocalAI(message, context, {
        requestId: req.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      const responseTime = Date.now() - startTime;

      logger.info('Local AI chat request completed', {
        requestId: req.id,
        success: result.success,
        provider: result.metadata?.provider,
        responseTime,
        fallback: result.fallback,
        cached: result.metadata?.cached
      });

      // Return appropriate status based on result
      const statusCode = result.success ? 200 : (result.fallback ? 503 : 500);

      res.status(statusCode).json(result);

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Unexpected Local AI chat error', {
        requestId: req.id,
        error: error.message,
        stack: error.stack,
        responseTime
      });

      // Return graceful error response
      res.status(500).json({
        success: false,
        response: "I'm experiencing unexpected technical difficulties. Please try again later.",
        fallback: true,
        error: {
          code: 'LOCAL_AI_SERVICE_ERROR',
          message: 'An unexpected error occurred with Local AI service',
          timestamp: new Date().toISOString(),
          requestId: req.id
        },
        metadata: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async processWithLocalAI(message, context, metadata) {
    try {
      // Try local Ollama first
      const localResponse = await this.callLocalOllama(message, context);

      return {
        success: true,
        response: localResponse,
        metadata: {
          provider: 'ollama',
          model: this.ollamaModel,
          cached: false,
          responseTime: Date.now(),
          timestamp: new Date().toISOString()
        }
      };

    } catch (localError) {
      logger.warn('Local Ollama failed, falling back to Gemini', {
        requestId: metadata.requestId,
        error: localError.message
      });

      // Fallback to Gemini
      try {
        const geminiResult = await this.geminiServiceManager.chat(message, context, metadata);

        return {
          ...geminiResult,
          fallback: true,
          metadata: {
            ...geminiResult.metadata,
            provider: 'gemini-fallback',
            localError: localError.message
          }
        };

      } catch (geminiError) {
        logger.error('Both Local AI and Gemini failed', {
          requestId: metadata.requestId,
          localError: localError.message,
          geminiError: geminiError.message
        });

        return {
          success: false,
          response: "I'm having trouble accessing AI services right now. Please try again in a moment.",
          fallback: true,
          error: {
            code: 'ALL_PROVIDERS_FAILED',
            message: 'Both local and Gemini AI services are unavailable',
            localError: localError.message,
            geminiError: geminiError.message
          },
          metadata: {
            responseTime: Date.now(),
            timestamp: new Date().toISOString()
          }
        };
      }
    }
  }

  async callLocalOllama(message, context) {
    // Create a more flexible and natural system prompt
    let systemPrompt = `You are DeepSeek Coder, an expert programming assistant. You're helpful, knowledgeable, and provide practical solutions.

${context ? `Current code context:\n${context}\n\n` : ''}The user is asking: ${message}

Please provide a helpful, detailed response. Feel free to:
- Write and explain code examples
- Suggest improvements and best practices
- Debug issues and explain solutions
- Answer technical questions thoroughly
- Use code blocks when helpful
- Be conversational and natural in your responses`;

    // Adjust parameters for more natural responses
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.ollamaModel,
        prompt: systemPrompt,
        stream: false,
        options: {
          temperature: 0.7,        // Increased for more creativity
          top_p: 0.95,             // Increased for diverse responses
          max_tokens: 4000,        // Increased for longer responses
          repeat_penalty: 1.15,    // Increased to reduce repetition
          top_k: 40,               // Added for better word choice
          // Removed stop sequence to allow complete responses
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response?.trim() || '';

  }

  /**
   * Enhanced input validation
   */
  validateInput(message, context) {
    if (!message || typeof message !== 'string') {
      return 'Message is required and must be a string';
    }

    if (message.trim().length === 0) {
      return 'Message cannot be empty';
    }

    if (message.length > 10000) {
      return 'Message too long (max 10000 characters)';
    }

    // Check for potentially harmful content
    const harmfulPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(message)) {
        return 'Message contains potentially harmful content';
      }
    }

    // Validate context if provided
    if (context) {
      if (typeof context === 'string') {
        if (context.length > 5000) {
          return 'Context too long (max 5000 characters)';
        }
      } else if (typeof context === 'object') {
        const contextStr = JSON.stringify(context);
        if (contextStr.length > 10000) {
          return 'Context too large (max 10000 characters when serialized)';
        }
      } else {
        return 'Context must be a string or object';
      }
    }

    return null;
  }

  async healthCheck(req, res) {
    try {
      const healthStatus = {
        overall: 'healthy',
        providers: {
          ollama: { healthy: false, error: null },
          gemini: { healthy: false, error: null }
        },
        features: {
          localAI: true,
          geminiFallback: true,
          hybridMode: true
        }
      };

      // Check Ollama health
      try {
        const ollamaResponse = await fetch(`${this.ollamaUrl}/api/tags`);
        healthStatus.providers.ollama.healthy = ollamaResponse.ok;
        if (!ollamaResponse.ok) {
          healthStatus.providers.ollama.error = 'Ollama API not accessible';
        }
      } catch (ollamaError) {
        healthStatus.providers.ollama.error = ollamaError.message;
        if (healthStatus.providers.gemini.healthy) {
          healthStatus.overall = 'degraded'; // Gemini fallback available
        } else {
          healthStatus.overall = 'unhealthy';
        }
      }

      // Check Gemini health
      try {
        const geminiHealth = await this.geminiServiceManager.healthCheck();
        healthStatus.providers.gemini.healthy = geminiHealth.overall === 'healthy';
        if (!healthStatus.providers.ollama.healthy && !healthStatus.providers.gemini.healthy) {
          healthStatus.overall = 'unhealthy';
        }
      } catch (geminiError) {
        healthStatus.providers.gemini.error = geminiError.message;
        if (!healthStatus.providers.ollama.healthy) {
          healthStatus.overall = 'unhealthy';
        }
      }

      const statusCode = healthStatus.overall === 'healthy' ? 200 :
                        healthStatus.overall === 'degraded' ? 206 : 503;

      logger.info('Local AI health check completed', {
        overall: healthStatus.overall,
        ollamaHealthy: healthStatus.providers.ollama.healthy,
        geminiHealthy: healthStatus.providers.gemini.healthy
      });

      res.status(statusCode).json({
        success: healthStatus.overall !== 'unhealthy',
        ...healthStatus
      });

    } catch (error) {
      logger.error('Local AI health check failed', { error: error.message });

      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Local AI health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get service status and configuration
   */
  async getStatus(req, res) {
    try {
      const healthStatus = await this.geminiServiceManager.healthCheck();

      // Check Ollama models
      let availableModels = [];
      try {
        const modelsResponse = await fetch(`${this.ollamaUrl}/api/tags`);
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          availableModels = modelsData.models?.map(model => model.name) || [];
        }
      } catch (error) {
        logger.warn('Failed to fetch Ollama models:', error.message);
      }

      const status = {
        service: 'local-ai-chat',
        version: '1.0.0',
        status: healthStatus.overall,
        providers: {
          primary: 'ollama',
          fallback: 'gemini',
          available: {
            ollama: availableModels,
            gemini: healthStatus.providers?.gemini?.healthy || false
          }
        },
        features: {
          localAI: true,
          geminiFallback: true,
          hybridMode: true,
          gpuAcceleration: true,
          rtx4060Compatible: true
        },
        model: {
          current: this.ollamaModel,
          available: availableModels
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        status
      });

    } catch (error) {
      logger.error('Failed to get Local AI service status', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Local AI service status'
      });
    }
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown() {
    try {
      logger.info('Shutting down Local AI Chat Controller');

      if (this.geminiServiceManager) {
        await this.geminiServiceManager.shutdown();
      }

      logger.info('Local AI Chat Controller shutdown completed');

    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }
}

module.exports = LocalAIChatController;