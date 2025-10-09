const logger = require('../utils/logger');
const EventEmitter = require('events');

/**
 * Health Monitor for External Services
 *
 * Provides comprehensive health monitoring for AI providers with:
 * - Real-time health status tracking
 * - Performance metrics collection
 * - Anomaly detection
 * - Automated alerting
 * - Historical data analysis
 */
class HealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
      metricsRetentionPeriod: options.metricsRetentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        errorRate: options.alertThresholds?.errorRate || 0.5, // 50% error rate
        responseTime: options.alertThresholds?.responseTime || 10000, // 10 seconds
        consecutiveFailures: options.alertThresholds?.consecutiveFailures || 5
      },
      ...options
    };

    this.providers = new Map();
    this.metrics = new Map();
    this.alerts = [];
    this.isRunning = false;
    this.healthCheckTimer = null;

    logger.info('Health monitor initialized', {
      healthCheckInterval: this.options.healthCheckInterval,
      alertThresholds: this.options.alertThresholds
    });
  }

  /**
   * Start health monitoring
   */
  start() {
    if (this.isRunning) {
      logger.warn('Health monitor is already running');
      return;
    }

    this.isRunning = true;
    this.startHealthCheckLoop();

    logger.info('Health monitor started');
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    logger.info('Health monitor stopped');
  }

  /**
   * Register a provider for monitoring
   */
  registerProvider(name, provider) {
    if (this.providers.has(name)) {
      logger.warn('Provider already registered', { name });
      return;
    }

    const providerData = {
      name,
      provider,
      status: 'unknown',
      lastCheck: null,
      consecutiveFailures: 0,
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      lastError: null,
      lastSuccess: null
    };

    this.providers.set(name, providerData);
    this.metrics.set(name, new Map());

    logger.info('Provider registered for health monitoring', { name });
  }

  /**
   * Record successful interaction
   */
  recordSuccess(providerName, responseTime = null) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return;
    }

    const now = new Date();
    provider.status = 'healthy';
    provider.lastSuccess = now.toISOString();
    provider.consecutiveFailures = 0;
    provider.successfulChecks++;

    // Record metrics
    this.recordMetric(providerName, 'success', 1);
    if (responseTime) {
      this.recordMetric(providerName, 'response_time', responseTime);
    }

    // Check if we need to clear any alerts
    this.checkAlertResolution(providerName);

    logger.debug('Provider success recorded', {
      provider: providerName,
      responseTime,
      status: provider.status
    });
  }

  /**
   * Record failed interaction
   */
  recordFailure(providerName, error, responseTime = null) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return;
    }

    const now = new Date();
    provider.status = 'unhealthy';
    provider.lastError = {
      message: error.message,
      code: error.code,
      timestamp: now.toISOString()
    };
    provider.consecutiveFailures++;
    provider.failedChecks++;

    // Record metrics
    this.recordMetric(providerName, 'failure', 1);
    if (responseTime) {
      this.recordMetric(providerName, 'response_time', responseTime);
    }

    // Check if we need to raise an alert
    this.checkAlertConditions(providerName, error);

    logger.warn('Provider failure recorded', {
      provider: providerName,
      error: error.message,
      consecutiveFailures: provider.consecutiveFailures,
      status: provider.status
    });
  }

  /**
   * Record a metric point
   */
  recordMetric(providerName, metricName, value) {
    const providerMetrics = this.metrics.get(providerName);
    if (!providerMetrics) {
      return;
    }

    const metric = providerMetrics.get(metricName) || {
      values: [],
      sum: 0,
      count: 0,
      min: Infinity,
      max: -Infinity
    };

    // Add new value
    metric.values.push({
      value,
      timestamp: new Date().toISOString()
    });
    metric.sum += value;
    metric.count += 1;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);

    // Clean old values based on retention period
    const cutoffTime = new Date(Date.now() - this.options.metricsRetentionPeriod);
    metric.values = metric.values.filter(v => new Date(v.timestamp) > cutoffTime);

    providerMetrics.set(metricName, metric);
  }

  /**
   * Start periodic health checks
   */
  startHealthCheckLoop() {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.options.healthCheckInterval);

    // Perform initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks for all registered providers
   */
  async performHealthChecks() {
    const healthCheckPromises = Array.from(this.providers.entries()).map(
      async ([name, providerData]) => {
        try {
          await this.checkProviderHealth(name, providerData);
        } catch (error) {
          logger.error('Health check failed for provider', {
            provider: name,
            error: error.message
          });
        }
      }
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(name, providerData) {
    const startTime = Date.now();

    try {
      // Perform health check
      await providerData.provider.healthCheck();

      const responseTime = Date.now() - startTime;
      providerData.status = 'healthy';
      providerData.lastCheck = new Date().toISOString();
      providerData.consecutiveFailures = 0;
      providerData.successfulChecks++;
      providerData.totalChecks++;

      this.recordMetric(name, 'health_check_success', 1);
      this.recordMetric(name, 'health_check_response_time', responseTime);

      logger.debug('Health check passed', {
        provider: name,
        responseTime,
        totalChecks: providerData.totalChecks
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      providerData.status = 'unhealthy';
      providerData.lastCheck = new Date().toISOString();
      providerData.lastError = {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      };
      providerData.consecutiveFailures++;
      providerData.failedChecks++;
      providerData.totalChecks++;

      this.recordMetric(name, 'health_check_failure', 1);
      this.recordMetric(name, 'health_check_response_time', responseTime);

      logger.warn('Health check failed', {
        provider: name,
        error: error.message,
        consecutiveFailures: providerData.consecutiveFailures
      });

      this.checkAlertConditions(name, error);
    }
  }

  /**
   * Check if alert conditions are met
   */
  checkAlertConditions(providerName, error) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return;
    }

    const alerts = [];

    // Check consecutive failures
    if (provider.consecutiveFailures >= this.options.alertThresholds.consecutiveFailures) {
      alerts.push({
        type: 'consecutive_failures',
        provider: providerName,
        severity: 'high',
        message: `Provider ${providerName} has ${provider.consecutiveFailures} consecutive failures`,
        data: {
          consecutiveFailures: provider.consecutiveFailures,
          lastError: provider.lastError
        }
      });
    }

    // Check error rate
    const errorRate = this.calculateErrorRate(providerName);
    if (errorRate >= this.options.alertThresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        provider: providerName,
        severity: 'medium',
        message: `Provider ${providerName} has ${(errorRate * 100).toFixed(1)}% error rate`,
        data: {
          errorRate,
          threshold: this.options.alertThresholds.errorRate
        }
      });
    }

    // Check response time
    const avgResponseTime = this.calculateAverageResponseTime(providerName);
    if (avgResponseTime >= this.options.alertThresholds.responseTime) {
      alerts.push({
        type: 'high_response_time',
        provider: providerName,
        severity: 'medium',
        message: `Provider ${providerName} has ${avgResponseTime}ms average response time`,
        data: {
          avgResponseTime,
          threshold: this.options.alertThresholds.responseTime
        }
      });
    }

    // Raise alerts
    alerts.forEach(alert => this.raiseAlert(alert));
  }

  /**
   * Check if alerts should be resolved
   */
  checkAlertResolution(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return;
    }

    // Resolve alerts for this provider if conditions are back to normal
    this.alerts = this.alerts.filter(alert => {
      if (alert.provider !== providerName) {
        return true; // Keep alerts for other providers
      }

      // Check if alert should be resolved
      let shouldResolve = false;

      switch (alert.type) {
        case 'consecutive_failures':
          shouldResolve = provider.consecutiveFailures === 0;
          break;
        case 'high_error_rate':
          const errorRate = this.calculateErrorRate(providerName);
          shouldResolve = errorRate < this.options.alertThresholds.errorRate / 2;
          break;
        case 'high_response_time':
          const avgResponseTime = this.calculateAverageResponseTime(providerName);
          shouldResolve = avgResponseTime < this.options.alertThresholds.responseTime / 2;
          break;
      }

      if (shouldResolve) {
        this.resolveAlert(alert);
        return false; // Remove from active alerts
      }

      return true; // Keep alert
    });
  }

  /**
   * Raise an alert
   */
  raiseAlert(alert) {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a =>
      a.provider === alert.provider &&
      a.type === alert.type &&
      !a.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.lastTriggered = new Date().toISOString();
      existingAlert.count = (existingAlert.count || 1) + 1;
    } else {
      // Create new alert
      const newAlert = {
        id: this.generateAlertId(),
        ...alert,
        triggeredAt: new Date().toISOString(),
        lastTriggered: new Date().toISOString(),
        count: 1,
        resolved: false
      };

      this.alerts.push(newAlert);

      logger.warn('Alert raised', {
        alertId: newAlert.id,
        type: newAlert.type,
        provider: newAlert.provider,
        severity: newAlert.severity,
        message: newAlert.message
      });

      // Emit alert event
      this.emit('alert', newAlert);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alert) {
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();

    logger.info('Alert resolved', {
      alertId: alert.id,
      type: alert.type,
      provider: alert.provider,
      duration: alert.resolvedAt - alert.triggeredAt
    });

    // Emit alert resolved event
    this.emit('alert_resolved', alert);
  }

  /**
   * Calculate error rate for a provider
   */
  calculateErrorRate(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider || provider.totalChecks === 0) {
      return 0;
    }

    return provider.failedChecks / provider.totalChecks;
  }

  /**
   * Calculate average response time for a provider
   */
  calculateAverageResponseTime(providerName) {
    const providerMetrics = this.metrics.get(providerName);
    if (!providerMetrics) {
      return 0;
    }

    const responseTimeMetric = providerMetrics.get('response_time');
    if (!responseTimeMetric || responseTimeMetric.count === 0) {
      return 0;
    }

    return Math.round(responseTimeMetric.sum / responseTimeMetric.count);
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus() {
    const providers = {};
    let overallStatus = 'healthy';
    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const [name, provider] of this.providers) {
      const errorRate = this.calculateErrorRate(name);
      const avgResponseTime = this.calculateAverageResponseTime(name);

      providers[name] = {
        status: provider.status,
        lastCheck: provider.lastCheck,
        consecutiveFailures: provider.consecutiveFailures,
        totalChecks: provider.totalChecks,
        errorRate: errorRate,
        avgResponseTime: avgResponseTime,
        lastError: provider.lastError,
        lastSuccess: provider.lastSuccess
      };

      if (provider.status === 'healthy') {
        healthyCount++;
      } else {
        unhealthyCount++;
      }
    }

    // Determine overall status
    if (unhealthyCount === 0) {
      overallStatus = 'healthy';
    } else if (healthyCount === 0) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      overall: overallStatus,
      providers,
      alerts: this.alerts.filter(a => !a.resolved),
      timestamp: new Date().toISOString(),
      monitoring: {
        isRunning: this.isRunning,
        healthCheckInterval: this.options.healthCheckInterval,
        registeredProviders: this.providers.size
      }
    };
  }

  /**
   * Get detailed metrics for all providers
   */
  getProviderMetrics() {
    const metrics = {};

    for (const [name, providerMetrics] of this.metrics) {
      metrics[name] = {};
      for (const [metricName, metric] of providerMetrics) {
        metrics[name][metricName] = {
          current: metric.values[metric.values.length - 1]?.value || 0,
          average: metric.count > 0 ? metric.sum / metric.count : 0,
          min: metric.min,
          max: metric.max,
          count: metric.count,
          dataPoints: metric.values.length
        };
      }
    }

    return metrics;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts() {
    return [...this.alerts];
  }
}

module.exports = HealthMonitor;