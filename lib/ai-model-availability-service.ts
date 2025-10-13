import { AIModelConfig, AIModelStatus } from "@/types/ai-model";

export interface ModelAvailabilityRule {
  modelId: string;
  isAvailable: boolean;
  reason?: string;
  lastUpdated: Date;
  conditions?: {
    maxFailureRate?: number; // percentage
    maxConsecutiveFailures?: number;
    minUptime?: number; // percentage
    maxResponseTime?: number; // milliseconds
  };
}

export interface ModelRecommendation {
  modelId: string;
  score: number; // 0-100
  reasons: string[];
  warnings: string[];
  isCurrentlyAvailable: boolean;
}

export class AIModelAvailabilityService {
  private static instance: AIModelAvailabilityService;
  private availabilityRules: Map<string, ModelAvailabilityRule> = new Map();
  private listeners: Set<(rules: Map<string, ModelAvailabilityRule>) => void> =
    new Set();

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): AIModelAvailabilityService {
    if (!AIModelAvailabilityService.instance) {
      AIModelAvailabilityService.instance = new AIModelAvailabilityService();
    }
    return AIModelAvailabilityService.instance;
  }

  private initializeDefaultRules(): void {
    // Default availability rules based on observed performance
    const defaultRules: ModelAvailabilityRule[] = [
      {
        modelId: "deepseek-coder-6.7b",
        isAvailable: true, // Available when Docker is running
        reason: "Local model - requires Docker Desktop",
        lastUpdated: new Date(),
        conditions: {
          maxFailureRate: 20,
          maxConsecutiveFailures: 3,
          minUptime: 80,
          maxResponseTime: 5000,
        },
      },
      {
        modelId: "gemini-pro",
        isAvailable: true,
        reason: "Generally reliable with good performance",
        lastUpdated: new Date(),
        conditions: {
          maxFailureRate: 30,
          maxConsecutiveFailures: 5,
          minUptime: 70,
          maxResponseTime: 15000,
        },
      },
      {
        modelId: "hybrid-smart",
        isAvailable: true,
        reason: "Smart fallback system - always available",
        lastUpdated: new Date(),
        conditions: {
          maxFailureRate: 10,
          maxConsecutiveFailures: 2,
          minUptime: 90,
          maxResponseTime: 20000,
        },
      },
    ];

    defaultRules.forEach((rule) => {
      this.availabilityRules.set(rule.modelId, rule);
    });
  }

  // Update model availability based on current status
  updateModelAvailability(modelId: string, status: AIModelStatus): void {
    const rule = this.availabilityRules.get(modelId);
    if (!rule) return;

    const conditions = rule.conditions;
    if (!conditions) return;

    let isAvailable = true;
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check failure rate
    if (status.uptime !== undefined && status.uptime < conditions.minUptime!) {
      isAvailable = false;
      reasons.push(
        `Low uptime: ${status.uptime}% (min: ${conditions.minUptime}%)`
      );
    }

    // Check response time
    if (
      status.responseTime &&
      status.responseTime > conditions.maxResponseTime!
    ) {
      warnings.push(
        `High response time: ${status.responseTime}ms (max: ${conditions.maxResponseTime}ms)`
      );
      if (status.responseTime > conditions.maxResponseTime! * 2) {
        isAvailable = false;
        reasons.push(`Very high response time: ${status.responseTime}ms`);
      }
    }

    // Check error status
    if (status.status === "error") {
      isAvailable = false;
      reasons.push(`Model error: ${status.errorMessage || "Unknown error"}`);
    }

    // Check offline status
    if (status.status === "offline") {
      isAvailable = false;
      reasons.push("Model is offline");
    }

    // Special handling for specific models
    if (modelId === "deepseek-coder-6.7b" && status.status === "offline") {
      reasons.push("Docker Desktop is not running");
    }

    if (
      modelId === "gemini-pro" &&
      status.errorMessage?.includes("overloaded")
    ) {
      warnings.push("Gemini Pro is currently overloaded");
      if (status.uptime && status.uptime < 50) {
        isAvailable = false;
        reasons.push("Gemini Pro consistently overloaded");
      }
    }

    // Update rule
    const updatedRule: ModelAvailabilityRule = {
      ...rule,
      isAvailable,
      reason: reasons.length > 0 ? reasons.join("; ") : rule.reason,
      lastUpdated: new Date(),
    };

    this.availabilityRules.set(modelId, updatedRule);
    this.notifyListeners();
  }

  // Get availability for a specific model
  getModelAvailability(modelId: string): ModelAvailabilityRule | undefined {
    return this.availabilityRules.get(modelId);
  }

  // Get all availability rules
  getAllAvailability(): Map<string, ModelAvailabilityRule> {
    return new Map(this.availabilityRules);
  }

  // Get available models only
  getAvailableModels(models: AIModelConfig[]): AIModelConfig[] {
    return models.filter((model) => {
      const availability = this.availabilityRules.get(model.id);
      return availability?.isAvailable !== false;
    });
  }

  // Get model recommendations based on current conditions
  getModelRecommendations(
    models: AIModelConfig[],
    modelStatuses: Record<string, AIModelStatus>,
    requestType?: "code" | "general" | "creative"
  ): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = [];

    models.forEach((model) => {
      const status = modelStatuses[model.id];
      const availability = this.availabilityRules.get(model.id);

      if (!availability) return;

      let score = 50; // Base score
      const reasons: string[] = [];
      const warnings: string[] = [];

      // Availability bonus/penalty
      if (availability.isAvailable) {
        score += 30;
        reasons.push("Currently available");
      } else {
        score -= 50;
        reasons.push("Currently unavailable");
      }

      // Status-based scoring
      if (status) {
        switch (status.status) {
          case "online":
            score += 20;
            reasons.push("Online and responsive");
            break;
          case "loading":
            score += 5;
            warnings.push("Currently loading");
            break;
          case "error":
            score -= 30;
            warnings.push("Experiencing errors");
            break;
          case "offline":
            score -= 40;
            warnings.push("Currently offline");
            break;
        }

        // Response time scoring
        if (status.responseTime) {
          if (status.responseTime < 2000) {
            score += 15;
            reasons.push("Fast response time");
          } else if (status.responseTime > 10000) {
            score -= 15;
            warnings.push("Slow response time");
          }
        }

        // Uptime scoring
        if (status.uptime) {
          if (status.uptime > 90) {
            score += 10;
            reasons.push("High uptime");
          } else if (status.uptime < 70) {
            score -= 10;
            warnings.push("Low uptime");
          }
        }
      }

      // Request type preferences
      if (requestType) {
        if (requestType === "code" && model.id === "deepseek-coder-6.7b") {
          score += 20;
          reasons.push("Optimized for code generation");
        } else if (requestType === "general" && model.id === "gemini-pro") {
          score += 15;
          reasons.push("Strong general knowledge");
        } else if (model.id === "hybrid-smart") {
          score += 10;
          reasons.push("Intelligent selection");
        }
      }

      // Provider preferences
      if (model.provider === "hybrid") {
        score += 10;
        reasons.push("Automatic fallback capability");
      } else if (model.provider === "local") {
        score += 5;
        reasons.push("Privacy and cost benefits");
      }

      recommendations.push({
        modelId: model.id,
        score: Math.max(0, Math.min(100, score)),
        reasons,
        warnings,
        isCurrentlyAvailable: availability.isAvailable,
      });
    });

    // Sort by score (descending)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  // Get best model recommendation
  getBestModel(
    models: AIModelConfig[],
    modelStatuses: Record<string, AIModelStatus>,
    requestType?: "code" | "general" | "creative"
  ): ModelRecommendation | null {
    const recommendations = this.getModelRecommendations(
      models,
      modelStatuses,
      requestType
    );
    return recommendations.length > 0 ? recommendations[0] : null;
  }

  // Manually set model availability
  setModelAvailability(
    modelId: string,
    isAvailable: boolean,
    reason?: string
  ): void {
    const existingRule = this.availabilityRules.get(modelId);
    if (existingRule) {
      const updatedRule: ModelAvailabilityRule = {
        ...existingRule,
        isAvailable,
        reason: reason || existingRule.reason,
        lastUpdated: new Date(),
      };
      this.availabilityRules.set(modelId, updatedRule);
      this.notifyListeners();
    }
  }

  // Add availability change listener
  addAvailabilityListener(
    listener: (rules: Map<string, ModelAvailabilityRule>) => void
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach((listener) =>
      listener(new Map(this.availabilityRules))
    );
  }

  // Export availability rules
  exportRules(): string {
    const rules = Array.from(this.availabilityRules.entries()).map(
      ([modelId, rule]) => ({
        modelId,
        isAvailable: rule.isAvailable,
        reason: rule.reason,
        lastUpdated: rule.lastUpdated,
        conditions: rule.conditions,
      })
    );
    return JSON.stringify(rules, null, 2);
  }

  // Import availability rules
  importRules(jsonString: string): { success: boolean; error?: string } {
    try {
      const importedRules = JSON.parse(jsonString);
      if (Array.isArray(importedRules)) {
        importedRules.forEach((rule: ModelAvailabilityRule) => {
          if (rule.modelId) {
            this.availabilityRules.set(rule.modelId, {
              ...rule,
              lastUpdated: new Date(rule.lastUpdated),
            });
          }
        });
        this.notifyListeners();
        return { success: true };
      }
      return { success: false, error: "Invalid format: expected array" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton instance
export const aiModelAvailabilityService =
  AIModelAvailabilityService.getInstance();
