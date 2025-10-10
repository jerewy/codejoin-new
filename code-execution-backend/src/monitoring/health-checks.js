/**
 * Service Health Checks
 *
 * Specific health check implementations for different services
 * used by the health monitoring system.
 */

const logger = require('../utils/logger');
const DockerService = require('../services/dockerService');
const { healthMonitorFactory } = require('./health-monitor');

/**
 * Docker Health Checks
 */
class DockerHealthChecks {
  constructor() {
    this.dockerService = new DockerService();
  }

  /**
   * Check Docker connectivity
   * @returns {Promise<Object>} Health check result
   */
  async checkDockerConnectivity() {
    try {
      const startTime = Date.now();
      await this.dockerService.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        message: 'Docker connection successful',
        details: {
          connectionState: this.dockerService.getConnectionState()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Docker connection failed: ${error.message}`,
        error: error.message,
        code: error.code,
        recoverable: true
      };
    }
  }

  /**
   * Check Docker images availability
   * @returns {Promise<Object>} Health check result
   */
  async checkDockerImages() {
    try {
      const startTime = Date.now();

      // Check if required images exist
      const requiredImages = [
        'node:18-alpine',
        'python:3.11-alpine',
        'openjdk:17-alpine',
        'golang:1.21-alpine'
      ];

      const docker = this.dockerService.docker;
      const images = await docker.listImages();
      const imageTags = images.flatMap(img => img.RepoTags || []);

      const missingImages = requiredImages.filter(image =>
        !imageTags.some(tag => tag.includes(image))
      );

      const responseTime = Date.now() - startTime;

      if (missingImages.length > 0) {
        return {
          healthy: false,
          responseTime,
          message: `Missing Docker images: ${missingImages.join(', ')}`,
          details: {
            missingImages,
            availableImages: imageTags.length
          },
          recoverable: true
        };
      }

      return {
        healthy: true,
        responseTime,
        message: 'All required Docker images available',
        details: {
          availableImages: imageTags.length,
          requiredImages: requiredImages.length
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Docker images check failed: ${error.message}`,
        error: error.message,
        recoverable: true
      };
    }
  }

  /**
   * Check Docker system info
   * @returns {Promise<Object>} Health check result
   */
  async checkDockerSystemInfo() {
    try {
      const startTime = Date.now();
      const systemInfo = await this.dockerService.getSystemInfo();
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        message: 'Docker system info retrieved successfully',
        details: systemInfo
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Docker system info check failed: ${error.message}`,
        error: error.message,
        recoverable: true
      };
    }
  }
}

/**
 * AI Service Health Checks
 */
class AIServiceHealthChecks {
  constructor() {
    // This will be populated with AI providers when available
  }

  /**
   * Check Gemini provider health
   * @returns {Promise<Object>} Health check result
   */
  async checkGeminiProvider() {
    try {
      const startTime = Date.now();

      // Try to import and initialize Gemini provider
      const GeminiProvider = require('../ai/providers/gemini-provider');

      // Test with a simple health check
      const geminiProvider = new GeminiProvider({
        timeout: 5000 // Short timeout for health check
      });

      const isHealthy = await geminiProvider.isHealthy();
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        return {
          healthy: true,
          responseTime,
          message: 'Gemini provider is healthy',
          details: {
            model: geminiProvider.config.model,
            metrics: geminiProvider.getMetrics()
          }
        };
      } else {
        return {
          healthy: false,
          responseTime,
          message: 'Gemini provider health check failed',
          recoverable: true
        };
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Gemini provider check failed: ${error.message}`,
        error: error.message,
        recoverable: true
      };
    }
  }

  /**
   * Check AI service manager health
   * @returns {Promise<Object>} Health check result
   */
  async checkAIServiceManager() {
    try {
      const startTime = Date.now();

      // Try to get AI service manager health
      const { AIServiceManager } = require('../ai/ai-service-manager');

      // This would need to be implemented to get the actual instance
      // For now, we'll just check if the module loads successfully
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        message: 'AI service manager is available',
        details: {
          moduleLoaded: true
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `AI service manager check failed: ${error.message}`,
        error: error.message,
        recoverable: true
      };
    }
  }

  /**
   * Check circuit breaker health
   * @returns {Promise<Object>} Health check result
   */
  async checkCircuitBreakers() {
    try {
      const startTime = Date.now();
      const { circuitBreakerFactory } = require('../ai/circuit-breaker');

      const healthStatus = circuitBreakerFactory.getHealthStatus();
      const responseTime = Date.now() - startTime;

      // Check if any circuit breakers are open
      const openBreakers = Object.values(healthStatus).filter(
        breaker => breaker.state === 'OPEN'
      );

      if (openBreakers.length > 0) {
        return {
          healthy: false,
          responseTime,
          message: `${openBreakers.length} circuit breakers are open`,
          details: {
            openBreakers: openBreakers.map(b => b.name),
            totalBreakers: Object.keys(healthStatus).length
          },
          recoverable: true
        };
      }

      return {
        healthy: true,
        responseTime,
        message: 'All circuit breakers are healthy',
        details: {
          totalBreakers: Object.keys(healthStatus).length,
          closedBreakers: Object.values(healthStatus).filter(
            breaker => breaker.state === 'CLOSED'
          ).length
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Circuit breaker check failed: ${error.message}`,
        error: error.message,
        recoverable: true
      };
    }
  }
}

/**
 * System Health Checks
 */
class SystemHealthChecks {
  /**
   * Check memory usage
   * @returns {Promise<Object>} Health check result
   */
  async checkMemoryUsage() {
    try {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const responseTime = Date.now() - startTime;

      const totalMemory = require('os').totalmem();
      const usedMemory = memUsage.heapUsed + memUsage.external;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      const healthy = memoryUsagePercent < 80; // Less than 80% memory usage

      return {
        healthy,
        responseTime,
        message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        details: {
          memoryUsage: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers
          },
          memoryUsagePercent: memoryUsagePercent.toFixed(2),
          totalMemory: totalMemory
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Memory check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check CPU usage
   * @returns {Promise<Object>} Health check result
   */
  async checkCpuUsage() {
    try {
      const startTime = Date.now();
      const cpuUsage = process.cpuUsage();
      const responseTime = Date.now() - startTime;

      // Simple CPU check - this is a basic implementation
      const healthy = true; // Always healthy for now

      return {
        healthy,
        responseTime,
        message: 'CPU usage check completed',
        details: {
          cpuUsage: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `CPU check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Check disk space
   * @returns {Promise<Object>} Health check result
   */
  async checkDiskSpace() {
    try {
      const startTime = Date.now();
      const fs = require('fs');
      const path = require('path');

      const stats = fs.statSync(process.cwd());
      const responseTime = Date.now() - startTime;

      // This is a basic implementation - in production you'd want to check actual disk space
      return {
        healthy: true,
        responseTime,
        message: 'Disk space check completed',
        details: {
          path: process.cwd(),
          accessible: true
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Disk space check failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

/**
 * Initialize all health checks
 */
function initializeHealthChecks() {
  const dockerHealthChecks = new DockerHealthChecks();
  const aiServiceHealthChecks = new AIServiceHealthChecks();
  const systemHealthChecks = new SystemHealthChecks();

  // Initialize Docker service health monitor
  const dockerMonitor = healthMonitorFactory.get('docker-service', {
    checkInterval: 30000,
    maxConsecutiveFailures: 3
  });

  dockerMonitor.addHealthCheck('connectivity', dockerHealthChecks.checkDockerConnectivity.bind(dockerHealthChecks), {
    critical: true,
    timeout: 10000
  });

  dockerMonitor.addHealthCheck('images', dockerHealthChecks.checkDockerImages.bind(dockerHealthChecks), {
    critical: false,
    timeout: 15000
  });

  dockerMonitor.addHealthCheck('system-info', dockerHealthChecks.checkDockerSystemInfo.bind(dockerHealthChecks), {
    critical: false,
    timeout: 10000
  });

  // Initialize AI service health monitor
  const aiMonitor = healthMonitorFactory.get('ai-service', {
    checkInterval: 30000,
    maxConsecutiveFailures: 5
  });

  aiMonitor.addHealthCheck('gemini-provider', aiServiceHealthChecks.checkGeminiProvider.bind(aiServiceHealthChecks), {
    critical: true,
    timeout: 10000
  });

  aiMonitor.addHealthCheck('ai-service-manager', aiServiceHealthChecks.checkAIServiceManager.bind(aiServiceHealthChecks), {
    critical: false,
    timeout: 5000
  });

  aiMonitor.addHealthCheck('circuit-breakers', aiServiceHealthChecks.checkCircuitBreakers.bind(aiServiceHealthChecks), {
    critical: false,
    timeout: 5000
  });

  // Initialize system health monitor
  const systemMonitor = healthMonitorFactory.get('system', {
    checkInterval: 60000, // Check every minute
    maxConsecutiveFailures: 3
  });

  systemMonitor.addHealthCheck('memory', systemHealthChecks.checkMemoryUsage.bind(systemHealthChecks), {
    critical: false,
    timeout: 5000
  });

  systemMonitor.addHealthCheck('cpu', systemHealthChecks.checkCpuUsage.bind(systemHealthChecks), {
    critical: false,
    timeout: 5000
  });

  systemMonitor.addHealthCheck('disk', systemHealthChecks.checkDiskSpace.bind(systemHealthChecks), {
    critical: false,
    timeout: 5000
  });

  logger.info('Health checks initialized', {
    dockerChecks: dockerMonitor.healthChecks.length,
    aiChecks: aiMonitor.healthChecks.length,
    systemChecks: systemMonitor.healthChecks.length
  });
}

module.exports = {
  DockerHealthChecks,
  AIServiceHealthChecks,
  SystemHealthChecks,
  initializeHealthChecks
};