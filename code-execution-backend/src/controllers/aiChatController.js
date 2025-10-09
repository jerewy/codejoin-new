const ComprehensiveAIServiceManager = require('../services/ai-service-manager');
const logger = require('../utils/logger');

class AIChatController {
  constructor() {
    // Initialize Comprehensive AI Service Manager with full resilience features
    this.aiServiceManager = new ComprehensiveAIServiceManager({
      enableHealthMonitoring: true,
      enableResponseCache: true,
      enableFallbackProvider: true,
      selectionStrategy: 'priority',
      healthCheckInterval: 60000,
      cacheSize: 1000
    });

    logger.info('AI Chat Controller initialized with comprehensive resilience architecture');
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

      logger.info('AI chat request received', {
        requestId: req.id,
        messageLength: message.length,
        hasContext: !!context,
        userAgent: req.get('User-Agent')
      });

      // Use AI Service Manager for resilient processing
      const result = await this.aiServiceManager.chat(message, context, {
        requestId: req.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      const responseTime = Date.now() - startTime;

      logger.info('AI chat request completed', {
        requestId: req.id,
        success: result.success,
        provider: result.metadata?.provider,
        responseTime,
        fallback: result.fallback
      });

      // Return appropriate status based on result
      const statusCode = result.success ? 200 : (result.fallback ? 503 : 500);

      res.status(statusCode).json(result);

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Unexpected AI chat error', {
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
          code: 'UNEXPECTED_ERROR',
          message: 'An unexpected error occurred',
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
        // Allow structured context (object) for enhanced provider support
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
      // Use AI Service Manager for comprehensive health check
      const healthStatus = await this.aiServiceManager.healthCheck();

      logger.info('AI health check completed', {
        overall: healthStatus.overall,
        providers: Object.keys(healthStatus.providers).length,
        queueSize: healthStatus.queueSize
      });

      // Return appropriate status code based on overall health
      const statusCode = healthStatus.overall === 'healthy' ? 200 :
                        healthStatus.overall === 'degraded' ? 206 : 503;

      res.status(statusCode).json({
        success: healthStatus.overall !== 'unhealthy',
        ...healthStatus
      });

    } catch (error) {
      logger.error('AI health check failed', { error: error.message });

      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
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

      logger.info('AI metrics retrieved', {
        providers: Object.keys(metrics.providers).length,
        circuitBreakers: Object.keys(metrics.circuitBreakers).length
      });

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to retrieve AI metrics', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
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
        service: 'ai-chat',
        version: '2.0.0',
        status: healthStatus.overall,
        features: {
          multiProvider: true,
          circuitBreaker: true,
          retryLogic: true,
          gracefulDegradation: true,
          requestQueueing: true,
          healthMonitoring: true
        },
        providers: {
          configured: Object.keys(healthStatus.providers).length,
          healthy: Object.values(healthStatus.providers).filter(p => p.status === 'healthy').length
        },
        queue: {
          size: metrics.queue.size,
          processing: metrics.queue.processing
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        status
      });

    } catch (error) {
      logger.error('Failed to get AI service status', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service status'
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

      logger.info('AI service metrics reset');

      res.json({
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to reset metrics', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to reset metrics'
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

      logger.info('Forced health check completed');

      res.json({
        success: true,
        health: healthStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Forced health check failed', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown() {
    try {
      logger.info('Shutting down AI Chat Controller');

      if (this.aiServiceManager) {
        await this.aiServiceManager.shutdown();
      }

      logger.info('AI Chat Controller shutdown completed');

    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }
}

module.exports = AIChatController;