/**
 * AI Monitoring Service
 *
 * Comprehensive monitoring, health checks, and performance analytics
 * for the entire AI system with real-time alerts and reporting.
 */

const { circuitBreakerFactory } = require('./circuit-breaker');
const logger = require('../utils/logger');
const EventEmitter = require('events');

class AIMonitoringService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      enableRealTimeMonitoring: options.enableRealTimeMonitoring !== false,
      enableHealthChecks: options.enableHealthChecks !== false,
      enablePerformanceTracking: options.enablePerformanceTracking !== false,
      enableAlerts: options.enableAlerts !== false,
      healthCheckInterval: options.healthCheckInterval || 30000,
      metricsRetentionPeriod: options.metricsRetentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        errorRate: options.alertThresholds?.errorRate || 0.1, // 10%
        averageLatency: options.alertThresholds?.averageLatency || 5000, // 5 seconds
        failureThreshold: options.alertThresholds?.failureThreshold || 5, // 5 consecutive failures
        costThreshold: options.alertThresholds?.costThreshold || 1.0, // $1 per hour
        ...options.alertThresholds
      },
      ...options
    };

    // Monitoring data storage
    this.metrics = {
      requests: new Map(),
      providers: new Map(),
      system: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalLatency: 0,
        totalCost: 0,
        startTime: Date.now()
      },
      performance: {
        responseTimeHistory: [],
        errorRateHistory: [],
        costHistory: [],
        providerUsageHistory: []
      }
    };

    // Health status
    this.healthStatus = {
      overall: 'healthy',
      providers: new Map(),
      system: {
        uptime: 0,
        lastHealthCheck: null,
        consecutiveFailures: 0,
        issues: []
      },
      alerts: []
    };

    // Performance tracking
    this.performanceTracker = {
      currentWindow: [],
      windows: [],
      windowSize: options.windowSize || 1000, // requests per window
      windowDuration: options.windowDuration || 60000 // 1 minute windows
    };

    // Start monitoring services
    if (this.options.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }

    if (this.options.enableHealthChecks) {
      this.startHealthChecks();
    }

    if (this.options.enablePerformanceTracking) {
      this.startPerformanceTracking();
    }

    logger.info('AI Monitoring Service initialized', {
      realTimeMonitoring: this.options.enableRealTimeMonitoring,
      healthChecks: this.options.enableHealthChecks,
      performanceTracking: this.options.enablePerformanceTracking,
      alerts: this.options.enableAlerts,
      healthCheckInterval: this.options.healthCheckInterval
    });
  }

  /**
   * Record AI request metrics
   * @param {Object} requestData - Request data
   * @param {Object} responseData - Response data
   * @param {Object} errorData - Error data if request failed
   */
  recordRequest(requestData, responseData = null, errorData = null) {
    const timestamp = Date.now();
    const requestId = requestData.requestId || this.generateRequestId();

    const metrics = {
      requestId,
      timestamp,
      duration: responseData?.metadata?.processingTime || 0,
      provider: responseData?.provider || 'unknown',
      model: responseData?.model || 'unknown',
      success: !!responseData && !errorData,
      tokensUsed: responseData?.tokensUsed || 0,
      cost: responseData?.cost || 0,
      promptLength: requestData.prompt?.length || 0,
      contextSize: JSON.stringify(requestData.context || {}).length,
      error: errorData?.message || null,
      features: responseData?.metadata?.features || {},
      fallback: responseData?.metadata?.fallback || null
    };

    // Store individual request metrics
    this.metrics.requests.set(requestId, metrics);

    // Update system metrics
    this.updateSystemMetrics(metrics);

    // Update provider metrics
    this.updateProviderMetrics(metrics);

    // Update performance tracking
    this.updatePerformanceTracking(metrics);

    // Check for alerts
    if (this.options.enableAlerts) {
      this.checkAlerts(metrics);
    }

    // Emit event for real-time monitoring
    this.emit('requestRecorded', metrics);

    // Clean old metrics
    this.cleanupOldMetrics();

    logger.debug('Request metrics recorded', {
      requestId,
      provider: metrics.provider,
      success: metrics.success,
      duration: metrics.duration
    });
  }

  /**
   * Update system-wide metrics
   * @param {Object} metrics - Request metrics
   */
  updateSystemMetrics(metrics) {
    const system = this.metrics.system;

    system.totalRequests++;

    if (metrics.success) {
      system.successfulRequests++;
    } else {
      system.failedRequests++;
    }

    system.totalLatency += metrics.duration;
    system.totalCost += metrics.cost;
  }

  /**
   * Update provider-specific metrics
   * @param {Object} metrics - Request metrics
   */
  updateProviderMetrics(metrics) {
    const providerName = metrics.provider;

    if (!this.metrics.providers.has(providerName)) {
      this.metrics.providers.set(providerName, {
        name: providerName,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalLatency: 0,
        totalCost: 0,
        totalTokens: 0,
        errors: [],
        lastUsed: null,
        firstUsed: Date.now()
      });
    }

    const provider = this.metrics.providers.get(providerName);

    provider.totalRequests++;
    provider.totalLatency += metrics.duration;
    provider.totalCost += metrics.cost;
    provider.totalTokens += metrics.tokensUsed;
    provider.lastUsed = metrics.timestamp;

    if (metrics.success) {
      provider.successfulRequests++;
    } else {
      provider.failedRequests++;
      if (metrics.error) {
        provider.errors.push({
          timestamp: metrics.timestamp,
          error: metrics.error,
          requestId: metrics.requestId
        });

        // Keep only last 50 errors
        if (provider.errors.length > 50) {
          provider.errors.shift();
        }
      }
    }
  }

  /**
   * Update performance tracking
   * @param {Object} metrics - Request metrics
   */
  updatePerformanceTracking(metrics) {
    const performance = this.metrics.performance;

    // Add to current window
    this.performanceTracker.currentWindow.push(metrics);

    // Check if window is full
    if (this.performanceTracker.currentWindow.length >= this.performanceTracker.windowSize) {
      this.processPerformanceWindow();
    }

    // Update history arrays (keep last 1000 entries)
    performance.responseTimeHistory.push({
      timestamp: metrics.timestamp,
      value: metrics.duration
    });

    if (performance.responseTimeHistory.length > 1000) {
      performance.responseTimeHistory.shift();
    }

    // Calculate current error rate
    const recentRequests = Array.from(this.metrics.requests.values())
      .filter(m => metrics.timestamp - m.timestamp < 300000); // Last 5 minutes

    if (recentRequests.length > 0) {
      const errorRate = recentRequests.filter(m => !m.success).length / recentRequests.length;
      performance.errorRateHistory.push({
        timestamp: metrics.timestamp,
        value: errorRate
      });

      if (performance.errorRateHistory.length > 1000) {
        performance.errorRateHistory.shift();
      }
    }

    // Track cost over time
    performance.costHistory.push({
      timestamp: metrics.timestamp,
      value: metrics.cost
    });

    if (performance.costHistory.length > 1000) {
      performance.costHistory.shift();
    }
  }

  /**
   * Process performance window and generate analytics
   */
  processPerformanceWindow() {
    const window = this.performanceTracker.currentWindow;
    const windowStart = Date.now();

    const windowMetrics = {
      timestamp: windowStart,
      duration: this.performanceTracker.windowDuration,
      requestCount: window.length,
      successCount: window.filter(m => m.success).length,
      errorCount: window.filter(m => !m.success).length,
      totalLatency: window.reduce((sum, m) => sum + m.duration, 0),
      totalCost: window.reduce((sum, m) => sum + m.cost, 0),
      totalTokens: window.reduce((sum, m) => sum + m.tokensUsed, 0),
      providerBreakdown: {}
    };

    // Calculate provider breakdown
    window.forEach(metrics => {
      const provider = metrics.provider;
      if (!windowMetrics.providerBreakdown[provider]) {
        windowMetrics.providerBreakdown[provider] = {
          count: 0,
          successCount: 0,
          totalLatency: 0,
          totalCost: 0
        };
      }

      const breakdown = windowMetrics.providerBreakdown[provider];
      breakdown.count++;
      breakdown.totalLatency += metrics.duration;
      breakdown.totalCost += metrics.cost;

      if (metrics.success) {
        breakdown.successCount++;
      }
    });

    // Store processed window
    this.performanceTracker.windows.push(windowMetrics);
    this.performanceTracker.currentWindow = [];

    // Keep only last 100 windows
    if (this.performanceTracker.windows.length > 100) {
      this.performanceTracker.windows.shift();
    }

    // Emit window processed event
    this.emit('windowProcessed', windowMetrics);

    logger.debug('Performance window processed', {
      requestCount: windowMetrics.requestCount,
      successRate: windowMetrics.successCount / windowMetrics.requestCount,
      averageLatency: windowMetrics.totalLatency / windowMetrics.requestCount
    });
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    setInterval(() => {
      this.collectRealTimeMetrics();
    }, 5000); // Every 5 seconds

    logger.info('Real-time monitoring started');
  }

  /**
   * Start automated health checks
   */
  startHealthChecks() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);

    // Initial health check
    this.performHealthCheck();

    logger.info('Health checks started', {
      interval: this.options.healthCheckInterval
    });
  }

  /**
   * Start performance tracking
   */
  startPerformanceTracking() {
    setInterval(() => {
      this.analyzePerformanceTrends();
    }, 60000); // Every minute

    logger.info('Performance tracking started');
  }

  /**
   * Collect real-time metrics
   */
  collectRealTimeMetrics() {
    const now = Date.now();
    const realTimeMetrics = {
      timestamp: now,
      system: {
        uptime: now - this.metrics.system.startTime,
        totalRequests: this.metrics.system.totalRequests,
        successRate: this.calculateCurrentSuccessRate(),
        averageLatency: this.calculateCurrentAverageLatency(),
        errorRate: this.calculateCurrentErrorRate(),
        requestsPerMinute: this.calculateRequestsPerMinute()
      },
      memory: process.memoryUsage(),
      providers: this.getProviderStatus()
    };

    this.emit('realTimeMetrics', realTimeMetrics);
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const healthCheck = {
      timestamp: startTime,
      overall: 'healthy',
      providers: {},
      system: {},
      issues: []
    };

    try {
      // Check system health
      healthCheck.system = {
        uptime: startTime - this.metrics.system.startTime,
        memoryUsage: process.memoryUsage(),
        activeConnections: this.metrics.requests.size,
        consecutiveFailures: this.healthStatus.system.consecutiveFailures
      };

      // Check provider health
      for (const [providerName, providerMetrics] of this.metrics.providers) {
        const providerHealth = await this.checkProviderHealth(providerName, providerMetrics);
        healthCheck.providers[providerName] = providerHealth;
      }

      // Check circuit breakers
      const circuitBreakerStatus = circuitBreakerFactory.getHealthStatus();
      healthCheck.circuitBreakers = circuitBreakerStatus;

      // Determine overall health
      const unhealthyProviders = Object.values(healthCheck.providers).filter(p => p.status !== 'healthy');
      const failedCircuitBreakers = Object.values(circuitBreakerStatus).filter(cb => !cb.isHealthy);

      if (unhealthyProviders.length > 0 || failedCircuitBreakers.length > 0) {
        healthCheck.overall = 'degraded';
        healthCheck.issues.push(`Some providers or circuit breakers are unhealthy`);
      }

      // Check system-level thresholds
      const errorRate = this.calculateCurrentErrorRate();
      const avgLatency = this.calculateCurrentAverageLatency();

      if (errorRate > this.options.alertThresholds.errorRate) {
        healthCheck.overall = 'unhealthy';
        healthCheck.issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
      }

      if (avgLatency > this.options.alertThresholds.averageLatency) {
        healthCheck.overall = 'degraded';
        healthCheck.issues.push(`High latency: ${avgLatency.toFixed(0)}ms`);
      }

      // Update health status
      this.healthStatus = {
        overall: healthCheck.overall,
        providers: new Map(Object.entries(healthCheck.providers)),
        system: healthCheck.system,
        alerts: this.healthStatus.alerts,
        lastHealthCheck: startTime
      };

      // Reset consecutive failures on successful health check
      if (healthCheck.overall === 'healthy') {
        this.healthStatus.system.consecutiveFailures = 0;
      } else {
        this.healthStatus.system.consecutiveFailures++;
      }

      const duration = Date.now() - startTime;
      logger.info('Health check completed', {
        overall: healthCheck.overall,
        duration,
        issues: healthCheck.issues.length
      });

      this.emit('healthCheckCompleted', healthCheck);

    } catch (error) {
      logger.error('Health check failed', {
        error: error.message,
        duration: Date.now() - startTime
      });

      healthCheck.overall = 'unhealthy';
      healthCheck.issues.push(`Health check failed: ${error.message}`);

      this.emit('healthCheckFailed', { error: error.message, healthCheck });
    }
  }

  /**
   * Check individual provider health
   * @param {string} providerName - Provider name
   * @param {Object} providerMetrics - Provider metrics
   * @returns {Object} Provider health status
   */
  async checkProviderHealth(providerName, providerMetrics) {
    const health = {
      status: 'healthy',
      metrics: {
        lastUsed: providerMetrics.lastUsed,
        successRate: providerMetrics.totalRequests > 0
          ? providerMetrics.successfulRequests / providerMetrics.totalRequests
          : 0,
        averageLatency: providerMetrics.totalRequests > 0
          ? providerMetrics.totalLatency / providerMetrics.totalRequests
          : 0,
        errorCount: providerMetrics.failedRequests,
        recentErrors: providerMetrics.errors.slice(-5)
      },
      issues: []
    };

    // Check if provider has been used recently
    const timeSinceLastUse = Date.now() - (providerMetrics.lastUsed || 0);
    if (timeSinceLastUse > 300000) { // 5 minutes
      health.status = 'unknown';
      health.issues.push('Provider not used recently');
    }

    // Check error rate
    if (health.metrics.successRate < 0.8) { // Less than 80% success rate
      health.status = 'degraded';
      health.issues.push(`Low success rate: ${(health.metrics.successRate * 100).toFixed(2)}%`);
    }

    // Check latency
    if (health.metrics.averageLatency > 10000) { // More than 10 seconds
      health.status = 'degraded';
      health.issues.push(`High latency: ${health.metrics.averageLatency.toFixed(0)}ms`);
    }

    // Check recent errors
    const recentErrors = providerMetrics.errors.filter(e => Date.now() - e.timestamp < 300000);
    if (recentErrors.length >= 3) {
      health.status = 'unhealthy';
      health.issues.push(`Multiple recent errors: ${recentErrors.length} in last 5 minutes`);
    }

    return health;
  }

  /**
   * Analyze performance trends
   */
  analyzePerformanceTrends() {
    const now = Date.now();
    const trends = {
      timestamp: now,
      period: '1_hour',
      responseTime: this.analyzeTrend(this.metrics.performance.responseTimeHistory, 3600000),
      errorRate: this.analyzeTrend(this.metrics.performance.errorRateHistory, 3600000),
      cost: this.analyzeTrend(this.metrics.performance.costHistory, 3600000)
    };

    this.emit('performanceTrends', trends);

    // Check for performance degradation
    if (trends.responseTime.trend === 'increasing' && trends.responseTime.confidence > 0.7) {
      this.createAlert('performance_degradation', 'Response times are trending upward', {
        trend: trends.responseTime,
        severity: 'warning'
      });
    }

    if (trends.errorRate.trend === 'increasing' && trends.errorRate.confidence > 0.7) {
      this.createAlert('error_rate_increase', 'Error rates are trending upward', {
        trend: trends.errorRate,
        severity: 'critical'
      });
    }
  }

  /**
   * Analyze trend in historical data
   * @param {Array} data - Historical data points
   * @param {number} periodMs - Period to analyze in milliseconds
   * @returns {Object} Trend analysis
   */
  analyzeTrend(data, periodMs) {
    const now = Date.now();
    const recentData = data.filter(d => now - d.timestamp <= periodMs);

    if (recentData.length < 10) {
      return { trend: 'insufficient_data', confidence: 0 };
    }

    // Simple linear regression to determine trend
    const n = recentData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    recentData.forEach((point, index) => {
      const x = index;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const confidence = Math.min(Math.abs(slope) / (Math.max(...recentData.map(d => d.value)) + 0.001), 1);

    let trend = 'stable';
    if (slope > 0.01) trend = 'increasing';
    else if (slope < -0.01) trend = 'decreasing';

    return {
      trend,
      confidence,
      slope,
      dataPoints: n,
      period: periodMs
    };
  }

  /**
   * Check for alert conditions
   * @param {Object} metrics - Request metrics
   */
  checkAlerts(metrics) {
    // Check error rate threshold
    const recentErrorRate = this.calculateCurrentErrorRate();
    if (recentErrorRate > this.options.alertThresholds.errorRate) {
      this.createAlert('high_error_rate', `Error rate ${(recentErrorRate * 100).toFixed(2)}% exceeds threshold`, {
        current: recentErrorRate,
        threshold: this.options.alertThresholds.errorRate,
        severity: 'critical'
      });
    }

    // Check latency threshold
    const recentLatency = this.calculateCurrentAverageLatency();
    if (recentLatency > this.options.alertThresholds.averageLatency) {
      this.createAlert('high_latency', `Average latency ${recentLatency.toFixed(0)}ms exceeds threshold`, {
        current: recentLatency,
        threshold: this.options.alertThresholds.averageLatency,
        severity: 'warning'
      });
    }

    // Check consecutive failures
    if (this.healthStatus.system.consecutiveFailures >= this.options.alertThresholds.failureThreshold) {
      this.createAlert('consecutive_failures', `${this.healthStatus.system.consecutiveFailures} consecutive failures`, {
        count: this.healthStatus.system.consecutiveFailures,
        threshold: this.options.alertThresholds.failureThreshold,
        severity: 'critical'
      });
    }

    // Check cost threshold
    const hourlyCost = this.calculateHourlyCost();
    if (hourlyCost > this.options.alertThresholds.costThreshold) {
      this.createAlert('high_cost', `Hourly cost $${hourlyCost.toFixed(4)} exceeds threshold`, {
        current: hourlyCost,
        threshold: this.options.alertThresholds.costThreshold,
        severity: 'warning'
      });
    }
  }

  /**
   * Create and manage alerts
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {Object} data - Additional alert data
   */
  createAlert(type, message, data = {}) {
    const alert = {
      id: this.generateAlertId(),
      type,
      message,
      timestamp: Date.now(),
      severity: data.severity || 'info',
      data,
      resolved: false
    };

    this.healthStatus.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.healthStatus.alerts.length > 100) {
      this.healthStatus.alerts.shift();
    }

    logger.warn('AI System Alert', {
      type,
      message,
      severity: alert.severity,
      data
    });

    this.emit('alert', alert);

    // Auto-resolve some alerts after time
    if (type === 'high_latency' && alert.severity === 'warning') {
      setTimeout(() => this.resolveAlert(alert.id), 300000); // 5 minutes
    }
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID to resolve
   */
  resolveAlert(alertId) {
    const alert = this.healthStatus.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();

      logger.info('Alert resolved', {
        alertId,
        type: alert.type,
        duration: alert.resolvedAt - alert.timestamp
      });

      this.emit('alertResolved', alert);
    }
  }

  /**
   * Calculate current success rate
   * @returns {number} Success rate (0-1)
   */
  calculateCurrentSuccessRate() {
    const recentRequests = Array.from(this.metrics.requests.values())
      .filter(m => Date.now() - m.timestamp < 300000); // Last 5 minutes

    if (recentRequests.length === 0) return 1.0;

    const successCount = recentRequests.filter(m => m.success).length;
    return successCount / recentRequests.length;
  }

  /**
   * Calculate current average latency
   * @returns {number} Average latency in milliseconds
   */
  calculateCurrentAverageLatency() {
    const recentRequests = Array.from(this.metrics.requests.values())
      .filter(m => Date.now() - m.timestamp < 300000); // Last 5 minutes

    if (recentRequests.length === 0) return 0;

    const totalLatency = recentRequests.reduce((sum, m) => sum + m.duration, 0);
    return totalLatency / recentRequests.length;
  }

  /**
   * Calculate current error rate
   * @returns {number} Error rate (0-1)
   */
  calculateCurrentErrorRate() {
    return 1.0 - this.calculateCurrentSuccessRate();
  }

  /**
   * Calculate requests per minute
   * @returns {number} Requests per minute
   */
  calculateRequestsPerMinute() {
    const recentRequests = Array.from(this.metrics.requests.values())
      .filter(m => Date.now() - m.timestamp < 60000); // Last 1 minute

    return recentRequests.length;
  }

  /**
   * Calculate hourly cost
   * @returns {number} Cost in USD per hour
   */
  calculateHourlyCost() {
    const recentCosts = this.metrics.performance.costHistory
      .filter(c => Date.now() - c.timestamp < 3600000) // Last 1 hour
      .map(c => c.value);

    if (recentCosts.length === 0) return 0;

    return recentCosts.reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Get provider status summary
   * @returns {Object} Provider status
   */
  getProviderStatus() {
    const status = {};

    for (const [providerName, metrics] of this.metrics.providers) {
      status[providerName] = {
        requests: metrics.totalRequests,
        successRate: metrics.totalRequests > 0
          ? metrics.successfulRequests / metrics.totalRequests
          : 0,
        averageLatency: metrics.totalRequests > 0
          ? metrics.totalLatency / metrics.totalRequests
          : 0,
        totalCost: metrics.totalCost,
        lastUsed: metrics.lastUsed
      };
    }

    return status;
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - this.options.metricsRetentionPeriod;

    // Clean old request metrics
    for (const [requestId, metrics] of this.metrics.requests) {
      if (metrics.timestamp < cutoffTime) {
        this.metrics.requests.delete(requestId);
      }
    }

    // Clean old performance windows
    this.performanceTracker.windows = this.performanceTracker.windows.filter(
      window => window.timestamp > cutoffTime
    );

    // Clean old alerts
    this.healthStatus.alerts = this.healthStatus.alerts.filter(
      alert => alert.timestamp > cutoffTime
    );
  }

  /**
   * Get comprehensive monitoring dashboard data
   * @returns {Object} Dashboard data
   */
  getDashboardData() {
    const now = Date.now();

    return {
      timestamp: now,
      system: {
        uptime: now - this.metrics.system.startTime,
        totalRequests: this.metrics.system.totalRequests,
        successfulRequests: this.metrics.system.successfulRequests,
        failedRequests: this.metrics.system.failedRequests,
        successRate: this.metrics.system.totalRequests > 0
          ? this.metrics.system.successfulRequests / this.metrics.system.totalRequests
          : 0,
        averageLatency: this.metrics.system.totalRequests > 0
          ? this.metrics.system.totalLatency / this.metrics.system.totalRequests
          : 0,
        totalCost: this.metrics.system.totalCost
      },
      health: this.healthStatus,
      providers: this.getProviderStatus(),
      performance: {
        requestsPerMinute: this.calculateRequestsPerMinute(),
        currentErrorRate: this.calculateCurrentErrorRate(),
        currentLatency: this.calculateCurrentAverageLatency(),
        hourlyCost: this.calculateHourlyCost()
      },
      alerts: this.healthStatus.alerts.filter(a => !a.resolved).slice(-10), // Last 10 unresolved
      recentActivity: Array.from(this.metrics.requests.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20) // Last 20 requests
    };
  }

  /**
   * Generate unique IDs
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gracefully shutdown monitoring service
   */
  shutdown() {
    this.removeAllListeners();
    logger.info('AI Monitoring Service shutdown completed');
  }
}

// Singleton instance
let monitoringService = null;

/**
 * Get or create monitoring service instance
 * @param {Object} options - Configuration options
 * @returns {AIMonitoringService} Monitoring service instance
 */
function getMonitoringService(options = {}) {
  if (!monitoringService) {
    monitoringService = new AIMonitoringService(options);
  }
  return monitoringService;
}

module.exports = {
  AIMonitoringService,
  getMonitoringService
};