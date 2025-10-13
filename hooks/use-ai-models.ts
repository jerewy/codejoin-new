import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AIModelConfig,
  AIModelStatus,
  AIModelSettings,
  DEFAULT_MODELS,
  DEFAULT_MODEL_SETTINGS,
} from '@/types/ai-model';
import { aiModelStatusService } from '@/lib/ai-model-status-service';
import { aiModelSettingsService } from '@/lib/ai-model-settings-service';

interface UseAIModelsOptions {
  autoStartMonitoring?: boolean;
  healthCheckInterval?: number;
  models?: AIModelConfig[];
}

interface UseAIModelsReturn {
  // Current state
  currentModel: string;
  modelStatuses: Record<string, AIModelStatus>;
  settings: AIModelSettings;
  models: AIModelConfig[];
  isMonitoring: boolean;

  // Model management
  switchModel: (modelId: string) => void;
  refreshModelStatus: (modelId?: string) => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;

  // Settings management
  updateSettings: (updates: Partial<AIModelSettings>) => void;
  resetSettings: () => void;

  // Model utilities
  getModelConfig: (modelId: string) => AIModelConfig | undefined;
  getModelStatus: (modelId: string) => AIModelStatus | undefined;
  isModelOnline: (modelId: string) => boolean;
  getBestAvailableModel: () => string | null;
  getHealthSummary: () => {
    totalModels: number;
    onlineModels: number;
    offlineModels: number;
    errorModels: number;
    averageResponseTime: number;
  };

  // Advanced features
  enableAutoFallback: () => void;
  disableAutoFallback: () => void;
  setResponseTimeThreshold: (thresholdMs: number) => void;
  testModel: (modelId: string, testMessage?: string) => Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
  }>;
}

export function useAIModels(options: UseAIModelsOptions = {}): UseAIModelsReturn {
  const {
    autoStartMonitoring = true,
    healthCheckInterval = 30000,
    models = DEFAULT_MODELS,
  } = options;

  const { toast } = useToast();
  const [currentModel, setCurrentModel] = useState<string>(DEFAULT_MODEL_SETTINGS.preferredModel);
  const [modelStatuses, setModelStatuses] = useState<Record<string, AIModelStatus>>({});
  const [settings, setSettings] = useState<AIModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Initialize services and state
  useEffect(() => {
    // Load initial settings
    const initialSettings = aiModelSettingsService.getSettings();
    setSettings(initialSettings);
    setCurrentModel(initialSettings.preferredModel);

    // Get initial statuses
    const initialStatuses = aiModelStatusService.getAllStatuses();
    setModelStatuses(initialStatuses);

    // Set up listeners
    const unsubscribeStatus = aiModelStatusService.addStatusListener((statuses) => {
      setModelStatuses(statuses);
    });

    const unsubscribeSettings = aiModelSettingsService.addSettingsListener((newSettings) => {
      setSettings(newSettings);
      setCurrentModel(newSettings.preferredModel);
    });

    // Auto-start monitoring if enabled
    if (autoStartMonitoring) {
      startMonitoring();
    }

    return () => {
      unsubscribeStatus();
      unsubscribeSettings();
      if (autoStartMonitoring) {
        stopMonitoring();
      }
    };
  }, [autoStartMonitoring, healthCheckInterval, models]);

  // Switch to a different model
  const switchModel = useCallback((modelId: string) => {
    const modelConfig = models.find(m => m.id === modelId);
    if (!modelConfig) {
      toast({
        title: "Invalid Model",
        description: "The selected model is not available.",
        variant: "destructive",
      });
      return;
    }

    setCurrentModel(modelId);
    aiModelSettingsService.setPreferredModel(modelId);

    toast({
      title: "Model Changed",
      description: `Switched to ${modelConfig.name}`,
    });
  }, [models, toast]);

  // Refresh model status
  const refreshModelStatus = useCallback(async (modelId?: string) => {
    try {
      if (modelId) {
        const modelConfig = models.find(m => m.id === modelId);
        if (modelConfig) {
          await aiModelStatusService.checkModelHealth(modelConfig);
        }
      } else {
        // Refresh all models
        const promises = models.map(model => aiModelStatusService.checkModelHealth(model));
        await Promise.all(promises);
      }

      toast({
        title: "Status Refreshed",
        description: modelId ? `Model ${modelId} status updated.` : "All model statuses updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh model status.",
        variant: "destructive",
      });
    }
  }, [models, toast]);

  // Start health monitoring
  const startMonitoring = useCallback(() => {
    aiModelStatusService.startHealthChecks(models, healthCheckInterval);
    setIsMonitoring(true);
  }, [models, healthCheckInterval]);

  // Stop health monitoring
  const stopMonitoring = useCallback(() => {
    aiModelStatusService.stopAllHealthChecks();
    setIsMonitoring(false);
  }, []);

  // Update settings
  const updateSettings = useCallback((updates: Partial<AIModelSettings>) => {
    aiModelSettingsService.updateSettings(updates);
  }, []);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    aiModelSettingsService.resetToDefaults();
    toast({
      title: "Settings Reset",
      description: "AI model settings have been reset to defaults.",
    });
  }, [toast]);

  // Get model configuration
  const getModelConfig = useCallback((modelId: string): AIModelConfig | undefined => {
    return models.find(m => m.id === modelId);
  }, [models]);

  // Get model status
  const getModelStatus = useCallback((modelId: string): AIModelStatus | undefined => {
    return modelStatuses[modelId];
  }, [modelStatuses]);

  // Check if model is online
  const isModelOnline = useCallback((modelId: string): boolean => {
    const status = modelStatuses[modelId];
    return status?.status === 'online';
  }, [modelStatuses]);

  // Get best available model
  const getBestAvailableModel = useCallback((): string | null => {
    // If current model is online, use it
    if (isModelOnline(currentModel)) {
      return currentModel;
    }

    // Try fallback model if enabled and online
    if (settings.fallbackEnabled && settings.fallbackModel && isModelOnline(settings.fallbackModel)) {
      return settings.fallbackModel;
    }

    // Find any online model
    for (const model of models) {
      if (isModelOnline(model.id)) {
        return model.id;
      }
    }

    return null;
  }, [currentModel, settings, models, isModelOnline]);

  // Get health summary
  const getHealthSummary = useCallback(() => {
    return aiModelStatusService.getHealthSummary();
  }, []);

  // Enable auto fallback
  const enableAutoFallback = useCallback(() => {
    updateSettings({ fallbackEnabled: true });
    toast({
      title: "Auto Fallback Enabled",
      description: "Models will automatically switch to fallback on errors.",
    });
  }, [updateSettings, toast]);

  // Disable auto fallback
  const disableAutoFallback = useCallback(() => {
    updateSettings({ fallbackEnabled: false });
    toast({
      title: "Auto Fallback Disabled",
      description: "Models will not automatically switch on errors.",
    });
  }, [updateSettings, toast]);

  // Set response time threshold
  const setResponseTimeThreshold = useCallback((thresholdMs: number) => {
    updateSettings({ responseTimeThreshold: thresholdMs });
  }, [updateSettings]);

  // Test a model with a simple request
  const testModel = useCallback(async (modelId: string, testMessage = "Hello, respond with 'OK' if you can understand this message."): Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
  }> => {
    const modelConfig = models.find(m => m.id === modelId);
    if (!modelConfig) {
      return {
        success: false,
        error: "Model not found",
      };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(modelConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          context: {
            test: true,
            timestamp: new Date().toISOString(),
          }
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();

        // Record the test request
        aiModelStatusService.recordModelRequest(modelId, true, responseTime);

        return {
          success: true,
          responseTime,
        };
      } else {
        const errorText = await response.text();

        // Record the failed test request
        aiModelStatusService.recordModelRequest(modelId, false, 0);

        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }
    } catch (error) {
      // Record the failed test request
      aiModelStatusService.recordModelRequest(modelId, false, 0);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [models]);

  return {
    // Current state
    currentModel,
    modelStatuses,
    settings,
    models,
    isMonitoring,

    // Model management
    switchModel,
    refreshModelStatus,
    startMonitoring,
    stopMonitoring,

    // Settings management
    updateSettings,
    resetSettings,

    // Model utilities
    getModelConfig,
    getModelStatus,
    isModelOnline,
    getBestAvailableModel,
    getHealthSummary,

    // Advanced features
    enableAutoFallback,
    disableAutoFallback,
    setResponseTimeThreshold,
    testModel,
  };
}