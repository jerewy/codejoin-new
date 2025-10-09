const express = require('express');
const path = require('path');
const logger = require('../utils/logger');

/**
 * AI Service Monitoring Dashboard
 *
 * Provides real-time monitoring and alerting for AI services with:
 * - Health status visualization
 * - Performance metrics tracking
 * - Circuit breaker state monitoring
 * - Alert management
 * - Historical data analysis
 */
class MonitoringDashboard {
  constructor(aiServiceManager) {
    this.aiServiceManager = aiServiceManager;
    this.app = express();
    this.alertHistory = [];
    this.metricsHistory = [];
    this.isRunning = false;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.startDataCollection();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Add CORS for API endpoints
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    logger.info('Monitoring dashboard middleware configured');
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Main dashboard page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API endpoints for real-time data
    this.app.get('/api/status', async (req, res) => {
      try {
        const healthStatus = await this.aiServiceManager.healthCheck();
        const metrics = this.aiServiceManager.getMetrics();

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          health: healthStatus,
          metrics: metrics,
          alerts: this.getActiveAlerts(),
          uptime: process.uptime()
        });
      } catch (error) {
        logger.error('Dashboard status API error', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get detailed metrics
    this.app.get('/api/metrics', (req, res) => {
      try {
        const metrics = this.aiServiceManager.getMetrics();
        const historicalData = this.getHistoricalMetrics();

        res.json({
          success: true,
          metrics,
          historicalData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get alerts
    this.app.get('/api/alerts', (req, res) => {
      try {
        const alerts = {
          active: this.getActiveAlerts(),
          history: this.alertHistory.slice(-50), // Last 50 alerts
          summary: this.getAlertSummary()
        };

        res.json({
          success: true,
          alerts,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get performance data
    this.app.get('/api/performance', (req, res) => {
      try {
        const performance = {
          responseTimes: this.getResponseTimeHistory(),
          errorRates: this.getErrorRateHistory(),
          throughput: this.getThroughputHistory(),
          providerComparison: this.getProviderComparison()
        };

        res.json({
          success: true,
          performance,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Test endpoint
    this.app.post('/api/test', async (req, res) => {
      try {
        const { message = 'Test message from dashboard' } = req.body;

        const result = await this.aiServiceManager.chat(message, null, {
          source: 'dashboard-test'
        });

        res.json({
          success: true,
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Force circuit breaker state (for testing)
    this.app.post('/api/circuit-breaker/:provider/:action', (req, res) => {
      try {
        const { provider, action } = req.params;
        const circuitBreaker = this.aiServiceManager.circuitBreakers.get(provider);

        if (!circuitBreaker) {
          return res.status(404).json({
            success: false,
            error: 'Provider not found'
          });
        }

        if (action === 'open') {
          circuitBreaker.forceOpen();
        } else if (action === 'close') {
          circuitBreaker.forceClose();
        } else {
          return res.status(400).json({
            success: false,
            error: 'Invalid action. Use "open" or "close"'
          });
        }

        res.json({
          success: true,
          message: `Circuit breaker for ${provider} ${action}ed`,
          state: circuitBreaker.getState()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    logger.info('Monitoring dashboard routes configured');
  }

  /**
   * Setup WebSocket for real-time updates
   */
  setupWebSocket() {
    // This would typically use socket.io or ws library
    // For simplicity, we'll use Server-Sent Events
    this.app.get('/api/events', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial data
      this.sendEvent(res, 'initial', {
        timestamp: new Date().toISOString()
      });

      // Set up periodic updates
      const interval = setInterval(() => {
        try {
          const data = {
            timestamp: new Date().toISOString(),
            health: this.aiServiceManager.healthMonitor.getHealthStatus(),
            metrics: this.aiServiceManager.getMetrics()
          };
          this.sendEvent(res, 'update', data);
        } catch (error) {
          logger.error('Dashboard event stream error', { error: error.message });
        }
      }, 5000); // Update every 5 seconds

      // Clean up on disconnect
      req.on('close', () => {
        clearInterval(interval);
      });
    });

    logger.info('WebSocket/SSE endpoints configured');
  }

  /**
   * Send Server-Sent Event
   */
  sendEvent(res, type, data) {
    try {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      // Client disconnected, ignore
    }
  }

  /**
   * Start collecting metrics data
   */
  startDataCollection() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      try {
        const metrics = {
          timestamp: new Date().toISOString(),
          health: this.aiServiceManager.healthMonitor.getHealthStatus(),
          serviceMetrics: this.aiServiceManager.getMetrics(),
          performance: this.collectPerformanceMetrics()
        };

        this.metricsHistory.push(metrics);

        // Keep only last 100 data points
        if (this.metricsHistory.length > 100) {
          this.metricsHistory = this.metricsHistory.slice(-100);
        }

        // Check for alerts
        this.checkForAlerts(metrics);

      } catch (error) {
        logger.error('Dashboard data collection error', { error: error.message });
      }
    }, 30000);

    logger.info('Dashboard data collection started');
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics() {
    const providerMetrics = this.aiServiceManager.healthMonitor.getProviderMetrics();
    const performance = {};

    for (const [provider, metrics] of Object.entries(providerMetrics)) {
      performance[provider] = {
        avgResponseTime: metrics.response_time?.average || 0,
        errorRate: this.calculateErrorRate(provider),
        requestCount: metrics.response_time?.count || 0,
        successRate: this.calculateSuccessRate(provider)
      };
    }

    return performance;
  }

  /**
   * Calculate error rate for a provider
   */
  calculateErrorRate(provider) {
    const providerData = this.aiServiceManager.healthMonitor.providers.get(provider);
    if (!providerData || providerData.totalChecks === 0) {
      return 0;
    }
    return providerData.failedChecks / providerData.totalChecks;
  }

  /**
   * Calculate success rate for a provider
   */
  calculateSuccessRate(provider) {
    const errorRate = this.calculateErrorRate(provider);
    return 1 - errorRate;
  }

  /**
   * Check for alert conditions
   */
  checkForAlerts(metrics) {
    const alerts = [];

    for (const [provider, performance] of Object.entries(metrics.performance)) {
      // High error rate alert
      if (performance.errorRate > 0.5) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'high_error_rate',
          provider,
          severity: 'high',
          message: `${provider} error rate is ${(performance.errorRate * 100).toFixed(1)}%`,
          value: performance.errorRate,
          threshold: 0.5,
          timestamp: new Date().toISOString()
        });
      }

      // High response time alert
      if (performance.avgResponseTime > 10000) {
        alerts.push({
          id: this.generateAlertId(),
          type: 'high_response_time',
          provider,
          severity: 'medium',
          message: `${provider} average response time is ${performance.avgResponseTime}ms`,
          value: performance.avgResponseTime,
          threshold: 10000,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Store alerts
    alerts.forEach(alert => {
      this.alertHistory.push(alert);
      logger.warn('Dashboard alert generated', alert);
    });

    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alertHistory.filter(alert => {
      const age = Date.now() - new Date(alert.timestamp).getTime();
      return age < 300000; // Alerts active for 5 minutes
    });
  }

  /**
   * Get alert summary
   */
  getAlertSummary() {
    const activeAlerts = this.getActiveAlerts();
    const last24h = this.alertHistory.filter(alert => {
      const age = Date.now() - new Date(alert.timestamp).getTime();
      return age < 86400000; // Last 24 hours
    });

    return {
      active: activeAlerts.length,
      last24h: last24h.length,
      bySeverity: {
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length
      },
      byType: {
        high_error_rate: activeAlerts.filter(a => a.type === 'high_error_rate').length,
        high_response_time: activeAlerts.filter(a => a.type === 'high_response_time').length,
        consecutive_failures: activeAlerts.filter(a => a.type === 'consecutive_failures').length
      }
    };
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics() {
    return {
      dataPoints: this.metricsHistory.length,
      timeRange: this.metricsHistory.length > 0 ? {
        start: this.metricsHistory[0].timestamp,
        end: this.metricsHistory[this.metricsHistory.length - 1].timestamp
      } : null,
      metrics: this.metricsHistory.slice(-20) // Last 20 data points
    };
  }

  /**
   * Get response time history
   */
  getResponseTimeHistory() {
    return this.metricsHistory.map(data => ({
      timestamp: data.timestamp,
      ...data.performance
    }));
  }

  /**
   * Get error rate history
   */
  getErrorRateHistory() {
    return this.metricsHistory.map(data => ({
      timestamp: data.timestamp,
      errorRates: Object.fromEntries(
        Object.entries(data.performance).map(([provider, perf]) => [
          provider,
          perf.errorRate
        ])
      )
    }));
  }

  /**
   * Get throughput history
   */
  getThroughputHistory() {
    // This would require tracking request counts over time
    return this.metricsHistory.map(data => ({
      timestamp: data.timestamp,
      totalRequests: Object.values(data.performance).reduce((sum, perf) => sum + perf.requestCount, 0)
    }));
  }

  /**
   * Get provider comparison
   */
  getProviderComparison() {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latestMetrics) {
      return {};
    }

    return {
      performance: latestMetrics.performance,
      health: latestMetrics.health.providers,
      circuitBreakers: latestMetrics.serviceMetrics.circuitBreakers
    };
  }

  /**
   * Start the monitoring dashboard
   */
  start(port = 3002) {
    if (this.isRunning) {
      logger.warn('Monitoring dashboard is already running');
      return;
    }

    this.server = this.app.listen(port, () => {
      this.isRunning = true;
      logger.info(`AI Service Monitoring Dashboard started on port ${port}`);
      logger.info(`Dashboard URL: http://localhost:${port}`);
      logger.info(`API Events: http://localhost:${port}/api/events`);
    });

    this.server.on('error', (error) => {
      logger.error('Dashboard server error', { error: error.message });
    });
  }

  /**
   * Stop the monitoring dashboard
   */
  stop() {
    if (!this.isRunning || !this.server) {
      return;
    }

    this.server.close(() => {
      this.isRunning = false;
      logger.info('AI Service Monitoring Dashboard stopped');
    });
  }
}

module.exports = MonitoringDashboard;