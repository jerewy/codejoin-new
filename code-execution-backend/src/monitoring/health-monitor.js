/**
 * Health Monitoring System
 *
 * Comprehensive health monitoring for all backend services with
 * intelligent alerting, recovery mechanisms, and metrics collection.
 */

const logger = require('../utils/logger');
const { circuitBreakerFactory } = require('../ai/circuit-breaker');
const { retryManagerFactory } = require('../ai/retry-manager');

/**
 * Health Monitor for different service types
 */
class HealthMonitor {
  constructor(name, options = {}) {
    this.name = name;
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.timeout = options.timeout || 10000; // 10 seconds
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 5;
    this.lastCheckTime = null;
    this.lastHealthyTime = null;
    this.isHealthy = null; // null = unknown, true = healthy, false = unhealthy
    this.healthChecks = [];
    this.alerts = [];
    this.metrics = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      uptime: 0,
      downtime: 0,
      lastUptimeStart: Date.now()
    };

    // Recovery mechanisms
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = options.maxRecoveryAttempts || 3;
    this.recoveryStrategies = options.recoveryStrategies || [];
    this.isRecovering = false;

    // Alert thresholds
    this.alertThresholds = {
      failureRate: options.failureRate || 0.5, // 50% failure rate triggers alert
      responseTime: options.responseTime || 5000, // 5 second response time triggers alert
      consecutiveFailures: options.consecutiveFailures || 3
    };

    // Event handlers
    this.onHealthChange = options.onHealthChange || (() => {});
    this.onAlert = options.onAlert || (() => {});
    this.onRecovery = options.onRecovery || (() => {});

    logger.info(`Health monitor initialized: ${this.name}`, {
      checkInterval: this.checkInterval,
      timeout: this.timeout,
      maxConsecutiveFailures: this.maxConsecutiveFailures
    });
  }

  /**
   * Add a health check
   * @param {string} name - Health check name
   * @param {Function} checkFunction - Function that returns promise resolving to health status
   * @param {Object} options - Check options
   */
  addHealthCheck(name, checkFunction, options = {}) {
    const healthCheck = {
      name,
      checkFunction,
      timeout: options.timeout || this.timeout,
      critical: options.critical !== false, // Default to critical
      enabled: options.enabled !== false,
      metrics: {
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
        totalResponseTime: 0
      }
    };

    this.healthChecks.push(healthCheck);
    logger.info(`Health check added: ${this.name}.${name}`, {
      critical: healthCheck.critical,
      timeout: healthCheck.timeout
    });
  }

  /**
   * Remove a health check
   * @param {string} name - Health check name to remove
   */
  removeHealthCheck(name) {
    const index = this.healthChecks.findIndex(check => check.name === name);
    if (index !== -1) {
      this.healthChecks.splice(index, 1);
      logger.info(`Health check removed: ${this.name}.${name}`);
    }
  }

  /**
   * Start health monitoring
   */
  start() {
    if (this.intervalId) {
      logger.warn(`Health monitor already started: ${this.name}`);
      return;
    }

    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    // Perform initial health check
    this.performHealthCheck();

    logger.info(`Health monitor started: ${this.name}`, {
      checkInterval: this.checkInterval,
      healthChecksCount: this.healthChecks.length
    });
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info(`Health monitor stopped: ${this.name}`);
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    this.lastCheckTime = startTime;
    this.metrics.totalChecks++;

    const results = [];
    let overallHealthy = true;
    let hasCriticalFailure = false;

    for (const healthCheck of this.healthChecks) {
      if (!healthCheck.enabled) {
        continue;
      }

      const result = await this.performSingleHealthCheck(healthCheck);
      results.push(result);

      if (!result.healthy) {
        overallHealthy = false;
        if (healthCheck.critical) {
          hasCriticalFailure = true;
        }
      }
    }

    // Update overall health status
    const wasHealthy = this.isHealthy;
    this.isHealthy = overallHealthy && !hasCriticalFailure;

    const responseTime = Date.now() - startTime;
    this.updateMetrics(responseTime, this.isHealthy);

    // Handle health status changes
    if (wasHealthy !== this.isHealthy) {
      this.handleHealthChange(wasHealthy, this.isHealthy, results);
    }

    // Check for alerts
    this.checkForAlerts(results, responseTime);

    // Trigger recovery if needed
    if (!this.isHealthy && !this.isRecovering) {
      this.triggerRecovery(results);
    }

    logger.debug(`Health check completed: ${this.name}`, {
      healthy: this.isHealthy,
      responseTime,
      results: results.map(r => ({ name: r.name, healthy: r.healthy, responseTime: r.responseTime }))
    });

    return {
      healthy: this.isHealthy,
      responseTime,
      results,
      timestamp: startTime
    };
  }

  /**
   * Perform a single health check
   * @param {Object} healthCheck - Health check configuration
   * @returns {Promise<Object>} Health check result
   */
  async performSingleHealthCheck(healthCheck) {
    const startTime = Date.now();
    healthCheck.metrics.totalChecks++;

    try {
      const result = await Promise.race([
        healthCheck.checkFunction(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      const healthy = result && (result.healthy !== false);

      healthCheck.metrics.successfulChecks++;
      healthCheck.metrics.totalResponseTime += responseTime;
      healthCheck.metrics.averageResponseTime = healthCheck.metrics.totalResponseTime / healthCheck.metrics.successfulChecks;

      return {
        name: healthCheck.name,
        healthy,
        responseTime,
        result,
        error: null,
        critical: healthCheck.critical
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      healthCheck.metrics.failedChecks++;

      return {
        name: healthCheck.name,
        healthy: false,
        responseTime,
        result: null,
        error: error.message,
        critical: healthCheck.critical
      };
    }
  }

  /**
   * Update health metrics
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} healthy - Whether the service is healthy
   */
  updateMetrics(responseTime, healthy) {
    if (healthy) {
      this.metrics.successfulChecks++;
      this.metrics.totalResponseTime += responseTime;
      this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.successfulChecks;

      if (this.consecutiveFailures > 0) {
        this.consecutiveFailures = 0;
        this.lastHealthyTime = Date.now();
        this.metrics.uptime += Date.now() - this.metrics.lastUptimeStart;
      }
    } else {
      this.metrics.failedChecks++;
      this.consecutiveFailures++;

      if (this.consecutiveFailures === 1) {
        this.metrics.downtimeStart = Date.now();
        this.metrics.uptime += Date.now() - this.metrics.lastUptimeStart;
      }
    }
  }

  /**
   * Handle health status changes
   * @param {boolean} wasHealthy - Previous health status
   * @param {boolean} isHealthy - Current health status
   * @param {Array} results - Health check results
   */
  handleHealthChange(wasHealthy, isHealthy, results) {
    logger.info(`Health status changed: ${this.name}`, {
      from: wasHealthy,
      to: isHealthy,
      consecutiveFailures: this.consecutiveFailures,
      results: results.map(r => ({ name: r.name, healthy: r.healthy }))
    });

    if (!isHealthy) {
      this.triggerAlert('HEALTH_STATUS_CHANGE', `Service ${this.name} became unhealthy`, {
        severity: 'warning',
        consecutiveFailures: this.consecutiveFailures,
        results
      });
    } else {
      this.triggerAlert('HEALTH_RESTORED', `Service ${this.name} became healthy`, {
        severity: 'info',
        consecutiveFailures: this.consecutiveFailures,
        results
      });
    }

    this.onHealthChange(isHealthy, wasHealthy, results);
  }

  /**
   * Check for alert conditions
   * @param {Array} results - Health check results
   * @param {number} responseTime - Overall response time
   */
  checkForAlerts(results, responseTime) {
    // Check failure rate
    const failureRate = this.metrics.totalChecks > 0 ?
      this.metrics.failedChecks / this.metrics.totalChecks : 0;

    if (failureRate > this.alertThresholds.failureRate) {
      this.triggerAlert('HIGH_FAILURE_RATE', `High failure rate: ${(failureRate * 100).toFixed(1)}%`, {
        severity: 'warning',
        failureRate,
        threshold: this.alertThresholds.failureRate
      });
    }

    // Check response time
    if (responseTime > this.alertThresholds.responseTime) {
      this.triggerAlert('HIGH_RESPONSE_TIME', `High response time: ${responseTime}ms`, {
        severity: 'warning',
        responseTime,
        threshold: this.alertThresholds.responseTime
      });
    }

    // Check consecutive failures
    if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
      this.triggerAlert('CONSECUTIVE_FAILURES', `${this.consecutiveFailures} consecutive failures`, {
        severity: 'critical',
        consecutiveFailures: this.consecutiveFailures,
        threshold: this.alertThresholds.consecutiveFailures
      });
    }
  }

  /**
   * Trigger an alert
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {Object} details - Alert details
   */
  triggerAlert(type, message, details = {}) {
    const alert = {
      id: this.generateAlertId(),
      type,
      message,
      severity: details.severity || 'warning',
      timestamp: Date.now(),
      service: this.name,
      details,
      acknowledged: false,
      resolved: false
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn(`Health alert triggered: ${this.name}`, {
      type,
      message,
      severity: alert.severity,
      details
    });

    this.onAlert(alert);
  }

  /**
   * Trigger recovery mechanisms
   * @param {Array} results - Health check results
   */
  async triggerRecovery(results) {
    if (this.isRecovering || this.recoveryAttempts >= this.maxRecoveryAttempts) {
      return;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;

    logger.info(`Starting recovery for ${this.name}`, {
      attempt: this.recoveryAttempts,
      maxAttempts: this.maxRecoveryAttempts,
      consecutiveFailures: this.consecutiveFailures
    });

    try {
      for (const strategy of this.recoveryStrategies) {
        try {
          await strategy(this, results);
          logger.info(`Recovery strategy executed: ${strategy.name} for ${this.name}`);
        } catch (error) {
          logger.error(`Recovery strategy failed: ${strategy.name} for ${this.name}`, {
            error: error.message
          });
        }
      }

      // Reset circuit breakers as part of recovery
      circuitBreakerFactory.resetAll();

      // Wait a bit and check if recovery worked
      await new Promise(resolve => setTimeout(resolve, 5000));

      const recoveryResult = await this.performHealthCheck();
      if (recoveryResult.healthy) {
        this.recoveryAttempts = 0;
        this.triggerAlert('RECOVERY_SUCCESS', `Recovery successful for ${this.name}`, {
          severity: 'info',
          attempt: this.recoveryAttempts
        });
        this.onRecovery(true, recoveryResult);
      } else {
        this.triggerAlert('RECOVERY_FAILED', `Recovery failed for ${this.name}`, {
          severity: 'warning',
          attempt: this.recoveryAttempts
        });
        this.onRecovery(false, recoveryResult);
      }

    } catch (error) {
      logger.error(`Recovery process failed for ${this.name}`, {
        error: error.message,
        attempt: this.recoveryAttempts
      });
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Get comprehensive health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      name: this.name,
      healthy: this.isHealthy,
      lastCheckTime: this.lastCheckTime,
      lastHealthyTime: this.lastHealthyTime,
      consecutiveFailures: this.consecutiveFailures,
      isRecovering: this.isRecovering,
      recoveryAttempts: this.recoveryAttempts,
      metrics: { ...this.metrics },
      healthChecks: this.healthChecks.map(check => ({
        name: check.name,
        enabled: check.enabled,
        critical: check.critical,
        metrics: { ...check.metrics }
      })),
      recentAlerts: this.alerts.slice(-10),
      uptime: this.calculateUptime()
    };
  }

  /**
   * Calculate uptime percentage
   * @returns {number} Uptime percentage
   */
  calculateUptime() {
    const totalTime = this.metrics.uptime + this.metrics.downtime;
    if (totalTime === 0) {
      return this.isHealthy ? 100 : 0;
    }
    return (this.metrics.uptime / totalTime) * 100;
  }

  /**
   * Generate unique alert ID
   * @returns {string} Alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID to acknowledge
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      logger.info(`Alert acknowledged: ${this.name}.${alertId}`);
    }
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID to resolve
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      logger.info(`Alert resolved: ${this.name}.${alertId}`);
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      uptime: 0,
      downtime: 0,
      lastUptimeStart: Date.now()
    };

    this.healthChecks.forEach(check => {
      check.metrics = {
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
        totalResponseTime: 0
      };
    });

    this.alerts = [];
    this.consecutiveFailures = 0;
    this.recoveryAttempts = 0;

    logger.info(`Metrics reset for health monitor: ${this.name}`);
  }
}

/**
 * Health Monitor Factory
 */
class HealthMonitorFactory {
  constructor() {
    this.monitors = new Map();
  }

  /**
   * Get or create a health monitor
   * @param {string} name - Monitor name
   * @param {Object} options - Monitor options
   * @returns {HealthMonitor} Health monitor instance
   */
  get(name, options = {}) {
    if (!this.monitors.has(name)) {
      const monitor = new HealthMonitor(name, options);
      this.monitors.set(name, monitor);

      // Auto-start unless explicitly disabled
      if (options.autoStart !== false) {
        monitor.start();
      }
    }
    return this.monitors.get(name);
  }

  /**
   * Get all monitors
   * @returns {Map} All monitors
   */
  getAll() {
    return this.monitors;
  }

  /**
   * Get health status of all monitors
   * @returns {Object} Combined health status
   */
  getOverallHealth() {
    const status = {
      overall: 'healthy',
      monitors: {},
      summary: {
        totalMonitors: this.monitors.size,
        healthyMonitors: 0,
        unhealthyMonitors: 0,
        unknownMonitors: 0,
        totalAlerts: 0
      }
    };

    this.monitors.forEach((monitor, name) => {
      const monitorStatus = monitor.getHealthStatus();
      status.monitors[name] = monitorStatus;

      if (monitorStatus.healthy === true) {
        status.summary.healthyMonitors++;
      } else if (monitorStatus.healthy === false) {
        status.summary.unhealthyMonitors++;
      } else {
        status.summary.unknownMonitors++;
      }

      status.summary.totalAlerts += monitorStatus.recentAlerts.length;
    });

    if (status.summary.unhealthyMonitors > 0) {
      status.overall = 'degraded';
    }

    if (status.summary.healthyMonitors === 0 && status.summary.totalMonitors > 0) {
      status.overall = 'unhealthy';
    }

    return status;
  }

  /**
   * Start all monitors
   */
  startAll() {
    this.monitors.forEach(monitor => monitor.start());
  }

  /**
   * Stop all monitors
   */
  stopAll() {
    this.monitors.forEach(monitor => monitor.stop());
  }

  /**
   * Reset all monitors
   */
  resetAll() {
    this.monitors.forEach(monitor => monitor.resetMetrics());
  }
}

// Global health monitor factory
const healthMonitorFactory = new HealthMonitorFactory();

module.exports = {
  HealthMonitor,
  HealthMonitorFactory,
  healthMonitorFactory
};