/**
 * Provider Health Monitoring and Performance Tracking
 *
 * Monitors AI provider health, tracks performance metrics,
 * and provides automated health checks and alerts.
 */

const logger = require('../utils/logger');

/**
 * Health Status Levels
 */
const HealthStatus = {
  HEALTHY: 'healthy',       // Provider is functioning normally
  DEGRADED: 'degraded',     // Provider has performance issues
  UNHEALTHY: 'unhealthy',   // Provider is failing
  UNKNOWN: 'unknown'        // Health status is unknown
};

/**
 * Provider Health Monitor
 */
class ProviderHealthMonitor {
  constructor(options = {}) {
    this.providers = new Map();
    this.checkInterval = options.checkInterval || 60000; // 1 minute
    this.timeout = options.timeout || 10000;             // 10 seconds
    this.failureThreshold = options.failureThreshold || 3; // Failures before marking unhealthy
    this.recoveryThreshold = options.recoveryThreshold || 2; // Successes before marking healthy

    // Health check interval
    this.healthCheckInterval = null;
    this.isMonitoring = false;

    // Global metrics
    this.globalMetrics = {
      totalHealthChecks: 0,
      totalFailures: 0,
      totalRecoveries: 0,
      lastHealthCheck: null,
      monitoringStartTime: null
    };

    logger.info('Provider Health Monitor initialized', {
      checkInterval: this.checkInterval,
      timeout: this.timeout,
      failureThreshold: this.failureThreshold,
      recoveryThreshold: this.recoveryThreshold
    });
  }

  /**
   * Register a provider for monitoring
   * @param {string} name - Provider name
   * @param {AIProvider} provider - Provider instance
   * @param {Object} options - Monitoring options
   */
  registerProvider(name, provider, options = {}) {
    const config = {
      enabled: options.enabled !== false,
      customHealthCheck: options.customHealthCheck,
      expectedLatency: options.expectedLatency || 2000, // 2 seconds
      maxErrorRate: options.maxErrorRate || 0.1, // 10%
      checkInterval: options.checkInterval || this.checkInterval,
      alertThreshold: options.alertThreshold || 5, // Alert after 5 failures
      ...options
    };

    this.providers.set(name, {
      name,
      provider,
      config,
      status: HealthStatus.UNKNOWN,
      metrics: {
        healthChecks: 0,
        successes: 0,
        failures: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        averageLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        lastHealthCheck: null,
        lastSuccess: null,
        lastFailure: null,
        totalLatency: 0,
        errorRate: 0,
        uptime: 0,
        downtime: 0,
        lastStatusChange: null,
        statusChanges: 0
      },
      alerts: [],
      isHealthy: false,
      lastCheckResult: null
    });

    logger.info(`Provider registered for monitoring: ${name}`, {
      enabled: config.enabled,
      expectedLatency: config.expectedLatency,
      maxErrorRate: config.maxErrorRate
    });
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.globalMetrics.monitoringStartTime = Date.now();

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);

    logger.info('Provider health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      logger.warn('Health monitoring is not running');
      return;
    }

    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Provider health monitoring stopped');
  }

  /**
   * Perform health checks on all registered providers
   */
  async performHealthChecks() {
    const checkPromises = [];

    for (const [name, providerInfo] of this.providers) {
      if (providerInfo.config.enabled) {
        checkPromises.push(this.checkProviderHealth(name));
      }
    }

    try {
      await Promise.allSettled(checkPromises);
      this.globalMetrics.totalHealthChecks++;
      this.globalMetrics.lastHealthCheck = Date.now();
    } catch (error) {
      logger.error('Error during health checks', {
        error: error.message
      });
    }
  }

  /**
   * Check health of a specific provider
   * @param {string} providerName - Provider name
   * @returns {Promise<Object>} Health check result
   */
  async checkProviderHealth(providerName) {
    const providerInfo = this.providers.get(providerName);
    if (!providerInfo) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const startTime = Date.now();
    let result = {
      providerName,
      timestamp: startTime,
      status: HealthStatus.UNKNOWN,
      latency: 0,
      error: null,
      details: {}
    };

    try {
      // Perform health check
      const healthResult = await this.performProviderHealthCheck(providerInfo);
      const latency = Date.now() - startTime;

      result.latency = latency;
      result.status = healthResult.isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY;
      result.details = healthResult.details || {};

      // Update metrics
      this.updateProviderMetrics(providerName, result);

      // Check for status changes
      this.checkStatusChange(providerName, result);

      // Generate alerts if needed
      this.checkAlerts(providerName, result);

      logger.debug(`Health check completed: ${providerName}`, {
        status: result.status,
        latency,
        isHealthy: healthResult.isHealthy
      });

    } catch (error) {
      const latency = Date.now() - startTime;

      result.latency = latency;
      result.status = HealthStatus.UNHEALTHY;
      result.error = error.message;

      // Update metrics
      this.updateProviderMetrics(providerName, result);

      // Check for status changes
      this.checkStatusChange(providerName, result);

      // Generate alerts
      this.checkAlerts(providerName, result);

      logger.warn(`Health check failed: ${providerName}`, {
        error: error.message,
        latency
      });
    }

    providerInfo.lastCheckResult = result;
    return result;
  }

  /**
   * Perform actual health check on provider
   * @param {Object} providerInfo - Provider information
   * @returns {Promise<Object>} Health check result
   */
  async performProviderHealthCheck(providerInfo) {
    const { provider, config } = providerInfo;

    // Use custom health check if provided
    if (config.customHealthCheck) {
      return await config.customHealthCheck(provider);
    }

    // Default health check: try provider's isHealthy method
    const isHealthy = await Promise.race([
      provider.isHealthy(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
      )
    ]);

    return { isHealthy };
  }

  /**
   * Update provider metrics after health check
   * @param {string} providerName - Provider name
   * @param {Object} result - Health check result
   */
  updateProviderMetrics(providerName, result) {
    const providerInfo = this.providers.get(providerName);
    if (!providerInfo) return;

    const metrics = providerInfo.metrics;
    metrics.healthChecks++;
    metrics.lastHealthCheck = result.timestamp;

    if (result.status === HealthStatus.HEALTHY) {
      metrics.successes++;
      metrics.consecutiveSuccesses++;
      metrics.consecutiveFailures = 0;
      metrics.lastSuccess = result.timestamp;

      // Update latency metrics
      if (result.latency > 0) {
        metrics.totalLatency += result.latency;
        metrics.averageLatency = metrics.totalLatency / metrics.successes;
        metrics.minLatency = Math.min(metrics.minLatency, result.latency);
        metrics.maxLatency = Math.max(metrics.maxLatency, result.latency);
      }

      // Update uptime
      if (metrics.lastFailure) {
        metrics.uptime += result.timestamp - metrics.lastFailure;
      }

    } else {
      metrics.failures++;
      metrics.consecutiveFailures++;
      metrics.consecutiveSuccesses = 0;
      metrics.lastFailure = result.timestamp;

      // Update downtime
      if (metrics.lastSuccess) {
        metrics.downtime += result.timestamp - metrics.lastSuccess;
      }

      this.globalMetrics.totalFailures++;
    }

    // Calculate error rate
    metrics.errorRate = metrics.failures / metrics.healthChecks;

    // Update global recovery count
    if (result.status === HealthStatus.HEALTHY && metrics.consecutiveSuccesses === 1) {
      this.globalMetrics.totalRecoveries++;
    }
  }

  /**
   * Check for status changes and update provider status
   * @param {string} providerName - Provider name
   * @param {Object} result - Health check result
   */
  checkStatusChange(providerName, result) {
    const providerInfo = this.providers.get(providerName);
    if (!providerInfo) return;

    const { metrics, config } = providerInfo;
    let newStatus = providerInfo.status;
    let statusChanged = false;

    // Determine new status based on health check results
    if (result.status === HealthStatus.HEALTHY) {
      if (metrics.consecutiveSuccesses >= this.recoveryThreshold) {
        newStatus = HealthStatus.HEALTHY;
      } else if (providerInfo.status === HealthStatus.UNHEALTHY) {
        newStatus = HealthStatus.DEGRADED;
      }
    } else {
      if (metrics.consecutiveFailures >= this.failureThreshold) {
        newStatus = HealthStatus.UNHEALTHY;
      } else if (providerInfo.status === HealthStatus.HEALTHY) {
        newStatus = HealthStatus.DEGRADED;
      }
    }

    // Check for performance degradation
    if (newStatus === HealthStatus.HEALTHY && result.latency > config.expectedLatency * 2) {
      newStatus = HealthStatus.DEGRADED;
    }

    if (newStatus === HealthStatus.HEALTHY && metrics.errorRate > config.maxErrorRate) {
      newStatus = HealthStatus.DEGRADED;
    }

    // Update status if changed
    if (newStatus !== providerInfo.status) {
      const oldStatus = providerInfo.status;
      providerInfo.status = newStatus;
      providerInfo.isHealthy = newStatus === HealthStatus.HEALTHY;
      providerInfo.metrics.lastStatusChange = result.timestamp;
      providerInfo.metrics.statusChanges++;

      logger.info(`Provider status changed: ${providerName}`, {
        from: oldStatus,
        to: newStatus,
        consecutiveFailures: metrics.consecutiveFailures,
        consecutiveSuccesses: metrics.consecutiveSuccesses,
        latency: result.latency,
        errorRate: metrics.errorRate
      });

      statusChanged = true;
    }

    return statusChanged;
  }

  /**
   * Check for alerts and generate them if needed
   * @param {string} providerName - Provider name
   * @param {Object} result - Health check result
   */
  checkAlerts(providerName, result) {
    const providerInfo = this.providers.get(providerName);
    if (!providerInfo) return;

    const { metrics, config, alerts } = providerInfo;

    // Check for consecutive failures alert
    if (metrics.consecutiveFailures >= config.alertThreshold) {
      const alert = {
        type: 'consecutive_failures',
        severity: 'high',
        message: `Provider ${providerName} has ${metrics.consecutiveFailures} consecutive failures`,
        timestamp: result.timestamp,
        metrics: { consecutiveFailures: metrics.consecutiveFailures }
      };

      if (!this.hasRecentAlert(alerts, alert.type, 300000)) { // 5 minutes
        alerts.push(alert);
        this.sendAlert(providerName, alert);
      }
    }

    // Check for high latency alert
    if (result.latency > config.expectedLatency * 3) {
      const alert = {
        type: 'high_latency',
        severity: 'medium',
        message: `Provider ${providerName} has high latency: ${result.latency}ms`,
        timestamp: result.timestamp,
        metrics: { latency: result.latency, expectedLatency: config.expectedLatency }
      };

      if (!this.hasRecentAlert(alerts, alert.type, 600000)) { // 10 minutes
        alerts.push(alert);
        this.sendAlert(providerName, alert);
      }
    }

    // Check for status change alert
    if (metrics.statusChanges > 0 && metrics.statusChanges % 5 === 0) {
      const alert = {
        type: 'frequent_status_changes',
        severity: 'medium',
        message: `Provider ${providerName} has changed status ${metrics.statusChanges} times`,
        timestamp: result.timestamp,
        metrics: { statusChanges: metrics.statusChanges }
      };

      if (!this.hasRecentAlert(alerts, alert.type, 1800000)) { // 30 minutes
        alerts.push(alert);
        this.sendAlert(providerName, alert);
      }
    }

    // Clean old alerts (keep last 50)
    if (alerts.length > 50) {
      providerInfo.alerts = alerts.slice(-50);
    }
  }

  /**
   * Check if there's a recent alert of the same type
   * @param {Array} alerts - Existing alerts
   * @param {string} type - Alert type
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {boolean} True if recent alert exists
   */
  hasRecentAlert(alerts, type, timeWindow) {
    const now = Date.now();
    return alerts.some(alert =>
      alert.type === type && (now - alert.timestamp) < timeWindow
    );
  }

  /**
   * Send alert (placeholder implementation)
   * @param {string} providerName - Provider name
   * @param {Object} alert - Alert details
   */
  sendAlert(providerName, alert) {
    logger.warn('Provider health alert', {
      provider: providerName,
      alert: alert.message,
      severity: alert.severity,
      timestamp: alert.timestamp
    });

    // TODO: Implement actual alerting (email, Slack, etc.)
  }

  /**
   * Get health status of all providers
   * @returns {Object} Health status summary
   */
  getHealthStatus() {
    const status = {
      overall: HealthStatus.HEALTHY,
      providers: {},
      summary: {
        total: this.providers.size,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0
      },
      globalMetrics: { ...this.globalMetrics },
      monitoringActive: this.isMonitoring
    };

    let healthyCount = 0;

    for (const [name, providerInfo] of this.providers) {
      const providerStatus = {
        name,
        status: providerInfo.status,
        isHealthy: providerInfo.isHealthy,
        enabled: providerInfo.config.enabled,
        metrics: { ...providerInfo.metrics },
        alerts: [...providerInfo.alerts],
        lastCheck: providerInfo.lastCheckResult
      };

      status.providers[name] = providerStatus;

      // Update summary
      status.summary[providerInfo.status]++;

      if (providerInfo.isHealthy) {
        healthyCount++;
      }
    }

    // Determine overall status
    if (healthyCount === 0) {
      status.overall = HealthStatus.UNHEALTHY;
    } else if (healthyCount < this.providers.size) {
      status.overall = HealthStatus.DEGRADED;
    }

    return status;
  }

  /**
   * Get provider metrics
   * @param {string} providerName - Provider name (optional)
   * @returns {Object} Provider metrics
   */
  getMetrics(providerName = null) {
    if (providerName) {
      const providerInfo = this.providers.get(providerName);
      return providerInfo ? { ...providerInfo.metrics } : null;
    }

    const metrics = {
      global: { ...this.globalMetrics },
      providers: {}
    };

    for (const [name, providerInfo] of this.providers) {
      metrics.providers[name] = { ...providerInfo.metrics };
    }

    return metrics;
  }

  /**
   * Reset provider metrics
   * @param {string} providerName - Provider name (optional)
   */
  resetMetrics(providerName = null) {
    if (providerName) {
      const providerInfo = this.providers.get(providerName);
      if (providerInfo) {
        providerInfo.metrics = {
          healthChecks: 0,
          successes: 0,
          failures: 0,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
          averageLatency: 0,
          minLatency: Infinity,
          maxLatency: 0,
          lastHealthCheck: null,
          lastSuccess: null,
          lastFailure: null,
          totalLatency: 0,
          errorRate: 0,
          uptime: 0,
          downtime: 0,
          lastStatusChange: null,
          statusChanges: 0
        };
        providerInfo.alerts = [];
      }
    } else {
      // Reset all providers
      for (const providerInfo of this.providers.values()) {
        providerInfo.metrics = {
          healthChecks: 0,
          successes: 0,
          failures: 0,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
          averageLatency: 0,
          minLatency: Infinity,
          maxLatency: 0,
          lastHealthCheck: null,
          lastSuccess: null,
          lastFailure: null,
          totalLatency: 0,
          errorRate: 0,
          uptime: 0,
          downtime: 0,
          lastStatusChange: null,
          statusChanges: 0
        };
        providerInfo.alerts = [];
      }

      // Reset global metrics
      this.globalMetrics = {
        totalHealthChecks: 0,
        totalFailures: 0,
        totalRecoveries: 0,
        lastHealthCheck: null,
        monitoringStartTime: this.isMonitoring ? Date.now() : null
      };
    }

    logger.info(`Metrics reset${providerName ? ` for provider: ${providerName}` : ' for all providers'}`);
  }

  /**
   * Remove a provider from monitoring
   * @param {string} providerName - Provider name
   */
  removeProvider(providerName) {
    if (this.providers.has(providerName)) {
      this.providers.delete(providerName);
      logger.info(`Provider removed from monitoring: ${providerName}`);
    }
  }

  /**
   * Destroy the health monitor
   */
  destroy() {
    this.stopMonitoring();
    this.providers.clear();
    logger.info('Provider Health Monitor destroyed');
  }
}

module.exports = {
  ProviderHealthMonitor,
  HealthStatus
};