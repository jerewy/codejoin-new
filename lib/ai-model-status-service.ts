import { AIModelConfig, AIModelStatus, AIModelStats } from '@/types/ai-model';

export class AIModelStatusService {
  private static instance: AIModelStatusService;
  private statusCache: Map<string, AIModelStatus> = new Map();
  private statsCache: Map<string, AIModelStats> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(statuses: Record<string, AIModelStatus>) => void> = new Set();

  private constructor() {}

  static getInstance(): AIModelStatusService {
    if (!AIModelStatusService.instance) {
      AIModelStatusService.instance = new AIModelStatusService();
    }
    return AIModelStatusService.instance;
  }

  // Add status change listener
  addStatusListener(listener: (statuses: Record<string, AIModelStatus>) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of status changes
  private notifyListeners() {
    const statuses: Record<string, AIModelStatus> = {};
    this.statusCache.forEach((status, modelId) => {
      statuses[modelId] = status;
    });
    this.listeners.forEach(listener => listener(statuses));
  }

  // Check model health status
  async checkModelHealth(model: AIModelConfig): Promise<AIModelStatus> {
    const startTime = Date.now();
    let status: AIModelStatus = 'loading';
    let errorMessage: string | undefined;

    try {
      const response = await fetch(model.endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        status = 'online';

        // Update stats if response includes usage data
        if (data.stats) {
          this.updateModelStats(model.id, {
            ...data.stats,
            totalRequests: (this.statsCache.get(model.id)?.totalRequests || 0) + 1,
            successfulRequests: (this.statsCache.get(model.id)?.successfulRequests || 0) + 1,
            averageResponseTime: responseTime,
            totalTokensUsed: data.stats.tokensUsed || 0,
            lastRequestTime: new Date(),
          });
        }
      } else {
        status = 'error';
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      status = 'offline';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update failed request stats
      const currentStats = this.statsCache.get(model.id) || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalTokensUsed: 0,
      };

      this.updateModelStats(model.id, {
        ...currentStats,
        totalRequests: currentStats.totalRequests + 1,
        failedRequests: currentStats.failedRequests + 1,
      });
    }

    const modelStatus: AIModelStatus = {
      modelId: model.id,
      status,
      responseTime: Date.now() - startTime,
      lastChecked: new Date(),
      errorMessage,
      ...this.statsCache.get(model.id),
    };

    // Update cache
    this.statusCache.set(model.id, modelStatus);
    this.notifyListeners();

    return modelStatus;
  }

  // Get cached status for a model
  getModelStatus(modelId: string): AIModelStatus | undefined {
    return this.statusCache.get(modelId);
  }

  // Get all cached statuses
  getAllStatuses(): Record<string, AIModelStatus> {
    const statuses: Record<string, AIModelStatus> = {};
    this.statusCache.forEach((status, modelId) => {
      statuses[modelId] = status;
    });
    return statuses;
  }

  // Get model statistics
  getModelStats(modelId: string): AIModelStats | undefined {
    return this.statsCache.get(modelId);
  }

  // Update model statistics
  private updateModelStats(modelId: string, stats: Partial<AIModelStats>) {
    const currentStats = this.statsCache.get(modelId) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
    };

    const updatedStats = {
      ...currentStats,
      ...stats,
    };

    // Calculate success rate
    if (updatedStats.totalRequests > 0) {
      updatedStats.successfulRequests = stats.successfulRequests || currentStats.successfulRequests;
      updatedStats.failedRequests = stats.failedRequests || currentStats.failedRequests;
    }

    this.statsCache.set(modelId, updatedStats);
  }

  // Record a model request
  recordModelRequest(modelId: string, success: boolean, responseTime: number, tokensUsed?: number) {
    const currentStats = this.statsCache.get(modelId) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
    };

    const updatedStats = {
      totalRequests: currentStats.totalRequests + 1,
      successfulRequests: currentStats.successfulRequests + (success ? 1 : 0),
      failedRequests: currentStats.failedRequests + (success ? 0 : 1),
      averageResponseTime: (currentStats.averageResponseTime * currentStats.totalRequests + responseTime) / (currentStats.totalRequests + 1),
      totalTokensUsed: currentStats.totalTokensUsed + (tokensUsed || 0),
      lastRequestTime: new Date(),
    };

    this.statsCache.set(modelId, updatedStats);

    // Update status cache with new stats
    const currentStatus = this.statusCache.get(modelId);
    if (currentStatus) {
      this.statusCache.set(modelId, {
        ...currentStatus,
        ...updatedStats,
        lastChecked: new Date(),
      });
      this.notifyListeners();
    }
  }

  // Start periodic health checks for a model
  startHealthCheck(model: AIModelConfig, intervalMs: number = 30000) {
    // Clear existing interval if any
    this.stopHealthCheck(model.id);

    // Initial check
    this.checkModelHealth(model);

    // Set up periodic checks
    const interval = setInterval(() => {
      this.checkModelHealth(model);
    }, intervalMs);

    this.checkIntervals.set(model.id, interval);
  }

  // Stop health checks for a model
  stopHealthCheck(modelId: string) {
    const interval = this.checkIntervals.get(modelId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(modelId);
    }
  }

  // Start health checks for multiple models
  startHealthChecks(models: AIModelConfig[], intervalMs: number = 30000) {
    models.forEach(model => {
      this.startHealthCheck(model, intervalMs);
    });
  }

  // Stop all health checks
  stopAllHealthChecks() {
    this.checkIntervals.forEach((interval, modelId) => {
      clearInterval(interval);
    });
    this.checkIntervals.clear();
  }

  // Clear all caches
  clearCache() {
    this.statusCache.clear();
    this.statsCache.clear();
    this.notifyListeners();
  }

  // Get health summary
  getHealthSummary(): {
    totalModels: number;
    onlineModels: number;
    offlineModels: number;
    errorModels: number;
    averageResponseTime: number;
  } {
    const statuses = Array.from(this.statusCache.values());
    const onlineModels = statuses.filter(s => s.status === 'online').length;
    const offlineModels = statuses.filter(s => s.status === 'offline').length;
    const errorModels = statuses.filter(s => s.status === 'error').length;

    const responseTimes = statuses
      .filter(s => s.responseTime !== undefined)
      .map(s => s.responseTime!);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      totalModels: statuses.length,
      onlineModels,
      offlineModels,
      errorModels,
      averageResponseTime,
    };
  }

  // Cleanup on unmount
  destroy() {
    this.stopAllHealthChecks();
    this.listeners.clear();
    this.clearCache();
  }
}

// Export singleton instance
export const aiModelStatusService = AIModelStatusService.getInstance();