// Monitoring and logging utilities for production deployment

export interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    frontend: boolean;
    backend: boolean;
    socket: boolean;
    database: boolean;
  };
  responseTime: {
    frontend: number;
    backend: number;
    socket: number;
  };
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  service: "frontend" | "backend" | "socket";
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetrics {
  timestamp: string;
  metrics: {
    pageLoad: number;
    apiResponse: number;
    socketLatency: number;
    memoryUsage: number;
    errorRate: number;
  };
}

class MonitoringService {
  private static instance: MonitoringService;
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetrics[] = [];
  private maxLogs = 1000;
  private maxMetrics = 100;

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Logging methods
  log(
    level: LogEntry["level"],
    service: LogEntry["service"],
    message: string,
    metadata?: Record<string, any>
  ) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      metadata,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
    };

    this.logs.push(logEntry);

    // Keep only the latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === "production") {
      this.sendToLogService(logEntry);
    }

    // Console output for development
    console.log(`[${level.toUpperCase()}] ${service}: ${message}`, metadata);
  }

  info(
    service: LogEntry["service"],
    message: string,
    metadata?: Record<string, any>
  ) {
    this.log("info", service, message, metadata);
  }

  warn(
    service: LogEntry["service"],
    message: string,
    metadata?: Record<string, any>
  ) {
    this.log("warn", service, message, metadata);
  }

  error(
    service: LogEntry["service"],
    message: string,
    metadata?: Record<string, any>
  ) {
    this.log("error", service, message, metadata);
  }

  debug(
    service: LogEntry["service"],
    message: string,
    metadata?: Record<string, any>
  ) {
    this.log("debug", service, message, metadata);
  }

  // Performance monitoring
  recordPerformanceMetrics(metrics: Omit<PerformanceMetrics, "timestamp">) {
    const performanceEntry: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      ...metrics,
    };

    this.metrics.push(performanceEntry);

    // Keep only the latest metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      this.sendToMonitoringService(performanceEntry);
    }
  }

  // Health checks
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    const checks = {
      frontend: await this.checkFrontendHealth(),
      backend: await this.checkBackendHealth(),
      socket: await this.checkSocketHealth(),
      database: await this.checkDatabaseHealth(),
    };

    const responseTime = {
      frontend: Date.now() - startTime,
      backend: 0,
      socket: 0,
    };

    const allHealthy = Object.values(checks).every((check) => check);

    const result: HealthCheckResult = {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: checks,
      responseTime,
    };

    this.info("frontend", "Health check completed", { result });

    return result;
  }

  // Private health check methods
  private async checkFrontendHealth(): Promise<boolean> {
    try {
      // Check if frontend is accessible
      const response = await fetch("/health", {
        method: "GET",
        cache: "no-cache",
      });
      return response.ok;
    } catch (error) {
      this.error("frontend", "Frontend health check failed", { error });
      return false;
    }
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/health`,
        {
          method: "GET",
          cache: "no-cache",
        }
      );
      return response.ok;
    } catch (error) {
      this.error("frontend", "Backend health check failed", { error });
      return false;
    }
  }

  private async checkSocketHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SOCKET_URL}/health`,
        {
          method: "GET",
          cache: "no-cache",
        }
      );
      return response.ok;
    } catch (error) {
      this.error("frontend", "Socket health check failed", { error });
      return false;
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Simple database check - you can implement a specific health check endpoint
      const response = await fetch("/api/health/database", {
        method: "GET",
        cache: "no-cache",
      });
      return response.ok;
    } catch (error) {
      this.error("frontend", "Database health check failed", { error });
      return false;
    }
  }

  // Getters for logs and metrics
  getLogs(
    level?: LogEntry["level"],
    service?: LogEntry["service"]
  ): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level);
    }

    if (service) {
      filteredLogs = filteredLogs.filter((log) => log.service === service);
    }

    return filteredLogs;
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  // Error tracking
  trackError(error: Error, context?: Record<string, any>) {
    this.error("frontend", error.message, {
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Send to error tracking service in production
    if (process.env.NODE_ENV === "production") {
      this.sendToErrorService(error, context);
    }
  }

  // Private helper methods
  private getCurrentUserId(): string | undefined {
    // Get user ID from your auth context
    return typeof window !== "undefined"
      ? (window as any).__USER_ID__
      : undefined;
  }

  private getCurrentSessionId(): string | undefined {
    // Get session ID from your session management
    return typeof window !== "undefined"
      ? (window as any).__SESSION_ID__
      : undefined;
  }

  // External service integrations (implement these based on your monitoring tools)
  private async sendToLogService(logEntry: LogEntry) {
    // Send to your logging service (e.g., LogRocket, Sentry, etc.)
    try {
      // Example: await fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) })
    } catch (error) {
      console.error("Failed to send log to external service:", error);
    }
  }

  private async sendToMonitoringService(metrics: PerformanceMetrics) {
    // Send to your monitoring service (e.g., DataDog, New Relic, etc.)
    try {
      // Example: await fetch('/api/metrics', { method: 'POST', body: JSON.stringify(metrics) })
    } catch (error) {
      console.error("Failed to send metrics to external service:", error);
    }
  }

  private async sendToErrorService(
    error: Error,
    context?: Record<string, any>
  ) {
    // Send to your error tracking service (e.g., Sentry)
    try {
      // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify({ error, context }) })
    } catch (err) {
      console.error("Failed to send error to external service:", err);
    }
  }
}

// Export singleton instance
export const monitoring = MonitoringService.getInstance();

// React hook for monitoring
export function useMonitoring() {
  const logInfo = (message: string, metadata?: Record<string, any>) => {
    monitoring.info("frontend", message, metadata);
  };

  const logError = (message: string, metadata?: Record<string, any>) => {
    monitoring.error("frontend", message, metadata);
  };

  const trackPerformance = (metrics: Omit<PerformanceMetrics, "timestamp">) => {
    monitoring.recordPerformanceMetrics(metrics);
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    monitoring.trackError(error, context);
  };

  return {
    logInfo,
    logError,
    trackPerformance,
    trackError,
    getLogs: monitoring.getLogs.bind(monitoring),
    getMetrics: monitoring.getMetrics.bind(monitoring),
    performHealthCheck: monitoring.performHealthCheck.bind(monitoring),
  };
}

// Performance monitoring utilities
export function measurePageLoad(
  callback: (metrics: PerformanceMetrics) => void
) {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    const navigation = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming;

    const metrics: Omit<PerformanceMetrics, "timestamp"> = {
      metrics: {
        pageLoad: navigation.loadEventEnd - navigation.fetchStart,
        apiResponse: 0, // Will be updated as API calls are made
        socketLatency: 0, // Will be updated as socket events occur
        memoryUsage: (performance as any).memory
          ? (performance as any).memory.usedJSHeapSize
          : 0,
        errorRate: 0, // Will be calculated based on errors
      },
    };

    callback({
      timestamp: new Date().toISOString(),
      ...metrics,
    });
  });
}

export function measureApiCall(url: string, startTime: number) {
  const endTime = performance.now();
  const duration = endTime - startTime;

  monitoring.recordPerformanceMetrics({
    metrics: {
      pageLoad: 0,
      apiResponse: duration,
      socketLatency: 0,
      memoryUsage: (performance as any).memory
        ? (performance as any).memory.usedJSHeapSize
        : 0,
      errorRate: 0,
    },
  });

  monitoring.info("frontend", `API call completed`, { url, duration });
}
