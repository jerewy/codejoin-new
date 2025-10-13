const GeminiOnlyAIServiceManager = require('../services/gemini-only-ai-service-manager');
const logger = require('../utils/logger');

class GeminiOnlyAIChatController {
  constructor() {
    // Initialize Gemini-Only AI Service Manager
    this.aiServiceManager = new GeminiOnlyAIServiceManager({
      enableHealthMonitoring: true,
      enableResponseCache: true,
      enableFallbackProvider: true,
      healthCheckInterval: 30000, // Faster health checks for single provider
      cacheSize: 500
    });

    logger.info('Gemini-Only AI Chat Controller initialized');
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

      logger.info('Gemini-only AI chat request received', {
        requestId: req.id,
        messageLength: message.length,
        hasContext: !!context,
        userAgent: req.get('User-Agent')
      });

      // Use Gemini-Only AI Service Manager for processing
      const result = await this.aiServiceManager.chat(message, context, {
        requestId: req.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      const responseTime = Date.now() - startTime;

      logger.info('Gemini-only AI chat request completed', {
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

      logger.error('Unexpected Gemini-only AI chat error', {
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
          code: 'GEMINI_SERVICE_ERROR',
          message: 'An unexpected error occurred with Gemini AI service',
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
        // Allow structured context (object) for enhanced Gemini support
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
      // Use Gemini-Only AI Service Manager for health check
      const healthStatus = await this.aiServiceManager.healthCheck();

      logger.info('Gemini-only AI health check completed', {
        overall: healthStatus.overall,
        primaryProvider: healthStatus.primaryProvider,
        features: healthStatus.features
      });

      // Return appropriate status code based on overall health
      const statusCode = healthStatus.overall === 'healthy' ? 200 :
                        healthStatus.overall === 'degraded' ? 206 : 503;

      res.status(statusCode).json({
        success: healthStatus.overall !== 'unhealthy',
        ...healthStatus
      });

    } catch (error) {
      logger.error('Gemini-only AI health check failed', { error: error.message });

      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Gemini AI health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get detailed metrics for monitoring
   */
  async getMetrics(req, res) {
    try {
      const metrics = this.aiServiceManager.getMetrics();

      logger.info('Gemini-only AI metrics retrieved', {
        primaryProvider: metrics.providers?.primary,
        providerType: metrics.features?.providerType
      });

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to retrieve Gemini-only AI metrics', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Gemini AI metrics',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get service status and configuration
   */
  async getStatus(req, res) {
    try {
      const healthStatus = await this.aiServiceManager.healthCheck();
      const metrics = this.aiServiceManager.getMetrics();

      const status = {
        service: 'gemini-only-ai-chat',
        version: '3.0.0',
        status: healthStatus.overall,
        primaryProvider: 'gemini',
        features: {
          providerType: 'gemini-only',
          circuitBreaker: true,
          retryLogic: true,
          gracefulDegradation: true,
          healthMonitoring: true,
          responseCache: true,
          fallbackProvider: true,
          optimizedForSingleProvider: true
        },
        providers: {
          primary: healthStatus.primaryProvider,
          count: metrics.providers?.count || 0,
          healthy: healthStatus.providers?.gemini?.healthy ? 1 : 0
        },
        cache: metrics.cache,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        status
      });

    } catch (error) {
      logger.error('Failed to get Gemini-only AI service status', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Gemini AI service status'
      });
    }
  }

  /**
   * Reset service metrics (admin endpoint)
   */
  async resetMetrics(req, res) {
    try {
      // Only allow in non-production environments or with admin key
      if (process.env.NODE_ENV === 'production' && !req.headers['x-admin-key']) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      this.aiServiceManager.metrics = {
        startTime: Date.now(),
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        fallbackResponses: 0,
        averageResponseTime: 0
      };

      logger.info('Gemini-only AI service metrics reset');

      res.json({
        success: true,
        message: 'Gemini AI metrics reset successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to reset Gemini AI metrics', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to reset Gemini AI metrics'
      });
    }
  }

  /**
   * Force provider health check (admin endpoint)
   */
  async forceHealthCheck(req, res) {
    try {
      // Only allow in non-production environments or with admin key
      if (process.env.NODE_ENV === 'production' && !req.headers['x-admin-key']) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const healthStatus = await this.aiServiceManager.healthCheck();

      logger.info('Forced Gemini-only health check completed');

      res.json({
        success: true,
        health: healthStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Forced Gemini-only health check failed', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Gemini AI health check failed'
      });
    }
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown() {
    try {
      logger.info('Shutting down Gemini-Only AI Chat Controller');

      if (this.aiServiceManager) {
        await this.aiServiceManager.shutdown();
      }

      logger.info('Gemini-Only AI Chat Controller shutdown completed');

    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }
}

module.exports = GeminiOnlyAIChatController;