"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  ChevronDown,
  Settings,
  Brain,
  Cloud,
  Monitor,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Activity,
  Clock,
  Zap as ZapIcon,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AIModelConfig,
  AIModelStatus,
  AIModelSettings,
  MODEL_PROVIDER_INFO,
  DEFAULT_MODELS,
} from "@/types/ai-model";
import { aiModelStatusService } from "@/lib/ai-model-status-service";
import { aiModelSettingsService } from "@/lib/ai-model-settings-service";
import { aiModelAvailabilityService } from "@/lib/ai-model-availability-service";
import { useToast } from "@/hooks/use-toast";

interface AIModelSelectorProps {
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
  models?: AIModelConfig[];
  compact?: boolean;
  showStatus?: boolean;
  showAdvanced?: boolean;
  className?: string;
}

export default function AIModelSelector({
  currentModel,
  onModelChange,
  models = DEFAULT_MODELS,
  compact = false,
  showStatus = true,
  showAdvanced = false,
  className,
}: AIModelSelectorProps) {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>(
    currentModel || "hybrid-smart"
  );
  const [modelStatuses, setModelStatuses] = useState<
    Record<string, AIModelStatus>
  >({});
  const [settings, setSettings] = useState<AIModelSettings>(
    aiModelSettingsService.getSettings()
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHealthCheckRunning, setIsHealthCheckRunning] = useState(false);

  // Initialize models and status monitoring
  useEffect(() => {
    // Load initial settings
    const initialSettings = aiModelSettingsService.getSettings();
    setSettings(initialSettings);

    if (!currentModel) {
      setSelectedModel(initialSettings.preferredModel);
    }

    // Start health monitoring for all models
    aiModelStatusService.startHealthChecks(models, 30000); // Check every 30 seconds

    // Listen for status updates
    const unsubscribe = aiModelStatusService.addStatusListener((statuses) => {
      setModelStatuses(statuses);

      // Update availability based on new statuses
      Object.entries(statuses).forEach(([modelId, status]) => {
        aiModelAvailabilityService.updateModelAvailability(modelId, status);
      });
    });

    // Get initial statuses
    setModelStatuses(aiModelStatusService.getAllStatuses());

    // Listen for availability updates
    const unsubscribeAvailability =
      aiModelAvailabilityService.addAvailabilityListener(
        (availabilityRules) => {
          // Force re-render when availability changes
          setModelStatuses((prev) => ({ ...prev }));
        }
      );

    // Initialize availability with current statuses
    const initialStatuses = aiModelStatusService.getAllStatuses();
    Object.entries(initialStatuses).forEach(([modelId, status]) => {
      aiModelAvailabilityService.updateModelAvailability(modelId, status);
    });

    // Listen for settings changes
    const unsubscribeSettings = aiModelSettingsService.addSettingsListener(
      (newSettings) => {
        setSettings(newSettings);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeSettings();
      unsubscribeAvailability();
    };
  }, [models, currentModel]);

  // Get current model configuration
  const currentModelConfig = useMemo(() => {
    return models.find((model) => model.id === selectedModel) || models[0];
  }, [selectedModel, models]);

  // Get current model status
  const currentModelStatus = useMemo(() => {
    return modelStatuses[selectedModel];
  }, [modelStatuses, selectedModel]);

  // Handle model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    aiModelSettingsService.setPreferredModel(modelId);
    onModelChange?.(modelId);

    toast({
      title: "Model Changed",
      description: `Switched to ${
        models.find((m) => m.id === modelId)?.name || modelId
      }`,
    });
  };

  // Run health check on all models
  const runHealthCheck = async () => {
    setIsHealthCheckRunning(true);
    try {
      const promises = models.map((model) =>
        aiModelStatusService.checkModelHealth(model)
      );
      await Promise.all(promises);

      toast({
        title: "Health Check Complete",
        description: "All model statuses have been updated.",
      });
    } catch (error) {
      toast({
        title: "Health Check Failed",
        description: "Failed to check model statuses.",
        variant: "destructive",
      });
    } finally {
      setIsHealthCheckRunning(false);
    }
  };

  // Update settings
  const updateSettings = (updates: Partial<AIModelSettings>) => {
    aiModelSettingsService.updateSettings(updates);
  };

  // Get status icon
  const getStatusIcon = (status: AIModelStatus) => {
    switch (status.status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "offline":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "loading":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get provider icon
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "local":
        return <Monitor className="h-4 w-4" />;
      case "cloud":
        return <Cloud className="h-4 w-4" />;
      case "hybrid":
        return <Zap className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  // Compact view for headers/panels
  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-2", className)}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {getProviderIcon(currentModelConfig.provider)}
                <span className="hidden sm:inline">
                  {currentModelConfig.name}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <div className="p-2">
                <div className="text-sm font-medium mb-2">Select AI Model</div>
                {models.map((model) => {
                  const status = modelStatuses[model.id];
                  const isSelected = model.id === selectedModel;

                  return (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {getProviderIcon(model.provider)}
                        {isSelected && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{model.name}</div>
                      </div>
                      {showStatus && status && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(status)}
                          {status.responseTime && (
                            <span className="text-xs text-muted-foreground">
                              {status.responseTime}ms
                            </span>
                          )}
                        </div>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </div>
              <Separator />
              <div className="p-2">
                <DropdownMenuItem
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  <span>Model Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={runHealthCheck}
                  disabled={isHealthCheckRunning}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Activity className="h-4 w-4" />
                  <span>Check Status</span>
                  {isHealthCheckRunning && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {showStatus && currentModelStatus && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1">
                  {getStatusIcon(currentModelStatus)}
                  {currentModelStatus.responseTime && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {currentModelStatus.responseTime}ms
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Model Status: {currentModelStatus.status}</p>
                {currentModelStatus.responseTime && (
                  <p>Response Time: {currentModelStatus.responseTime}ms</p>
                )}
                {currentModelStatus.errorMessage && (
                  <p className="text-red-500">
                    {currentModelStatus.errorMessage}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Settings Dialog */}
        <AIModelSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          settings={settings}
          onSettingsChange={updateSettings}
          models={models}
        />
      </TooltipProvider>
    );
  }

  // Full view for dedicated settings pages
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Model Selection
          {showStatus && currentModelStatus && (
            <Badge variant="outline" className="ml-auto">
              <div className="flex items-center gap-1">
                {getStatusIcon(currentModelStatus)}
                <span>{currentModelStatus.status}</span>
              </div>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select AI Model</Label>
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => {
                const status = modelStatuses[model.id];
                const availability =
                  aiModelAvailabilityService.getModelAvailability(model.id);
                const providerInfo = MODEL_PROVIDER_INFO[model.provider];

                return (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    disabled={availability?.isAvailable === false}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{providerInfo.icon}</span>
                        {getProviderIcon(model.provider)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{model.name}</div>
                        {availability?.isAvailable === false && (
                          <div className="text-xs text-red-500">
                            {availability.reason}
                          </div>
                        )}
                      </div>
                      {status && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(status)}
                          {status.responseTime && (
                            <span className="text-xs text-muted-foreground">
                              {status.responseTime}ms
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Current Model Info */}
        {currentModelConfig && (
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">
                {MODEL_PROVIDER_INFO[currentModelConfig.provider].icon}
              </span>
              <div>
                <h4 className="font-medium">{currentModelConfig.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {currentModelConfig.description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Provider:</span>
                <div className="text-muted-foreground">
                  {MODEL_PROVIDER_INFO[currentModelConfig.provider].name}
                </div>
              </div>
              <div>
                <span className="font-medium">Capabilities:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentModelConfig.capabilities
                    .slice(0, 3)
                    .map((capability) => (
                      <Badge
                        key={capability}
                        variant="secondary"
                        className="text-xs"
                      >
                        {capability}
                      </Badge>
                    ))}
                  {currentModelConfig.capabilities.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{currentModelConfig.capabilities.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              {currentModelConfig.contextWindow && (
                <div>
                  <span className="font-medium">Context Window:</span>
                  <div className="text-muted-foreground">
                    {currentModelConfig.contextWindow.toLocaleString()} tokens
                  </div>
                </div>
              )}
              {currentModelStatus?.responseTime && (
                <div>
                  <span className="font-medium">Response Time:</span>
                  <div className="text-muted-foreground">
                    {currentModelStatus.responseTime}ms
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-3" />

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span>
                  {MODEL_PROVIDER_INFO[currentModelConfig.provider].benefits[0]}
                </span>
              </div>
              {currentModelStatus?.status === "online" && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Available</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={runHealthCheck}
            disabled={isHealthCheckRunning}
            className="flex-1"
          >
            <Activity className="h-4 w-4 mr-2" />
            {isHealthCheckRunning ? "Checking..." : "Check Model Status"}
          </Button>
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Advanced Settings
          </Button>
        </div>

        {/* Settings Dialog */}
        <AIModelSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          settings={settings}
          onSettingsChange={updateSettings}
          models={models}
        />
      </CardContent>
    </Card>
  );
}

// Settings Dialog Component
interface AIModelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AIModelSettings;
  onSettingsChange: (updates: Partial<AIModelSettings>) => void;
  models: AIModelConfig[];
}

function AIModelSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  models,
}: AIModelSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Model Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI model preferences and behavior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preferred Model */}
          <div className="space-y-2">
            <Label htmlFor="preferred-model">Preferred Model</Label>
            <Select
              value={settings.preferredModel}
              onValueChange={(value) =>
                onSettingsChange({ preferredModel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fallback Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Fallback</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically switch to backup model if preferred model fails
                </p>
              </div>
              <Switch
                checked={settings.fallbackEnabled}
                onCheckedChange={(checked) =>
                  onSettingsChange({ fallbackEnabled: checked })
                }
              />
            </div>

            {settings.fallbackEnabled && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label htmlFor="fallback-model">Fallback Model</Label>
                <Select
                  value={settings.fallbackModel || ""}
                  onValueChange={(value) =>
                    onSettingsChange({ fallbackModel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fallback model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models
                      .filter((model) => model.id !== settings.preferredModel)
                      .map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Auto Switch on Error */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Switch on Error</Label>
              <p className="text-sm text-muted-foreground">
                Automatically switch models when errors occur
              </p>
            </div>
            <Switch
              checked={settings.autoSwitchOnError}
              onCheckedChange={(checked) =>
                onSettingsChange({ autoSwitchOnError: checked })
              }
            />
          </div>

          {/* Response Time Threshold */}
          <div className="space-y-2">
            <Label htmlFor="response-threshold">
              Response Time Threshold: {settings.responseTimeThreshold}ms
            </Label>
            <p className="text-sm text-muted-foreground">
              Switch models if response takes longer than this
            </p>
            <input
              type="range"
              id="response-threshold"
              min="1000"
              max="30000"
              step="1000"
              value={settings.responseTimeThreshold}
              onChange={(e) =>
                onSettingsChange({
                  responseTimeThreshold: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1s</span>
              <span>15s</span>
              <span>30s</span>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Model Info</Label>
                <p className="text-sm text-muted-foreground">
                  Display model information in chat interface
                </p>
              </div>
              <Switch
                checked={settings.showModelInfo}
                onCheckedChange={(checked) =>
                  onSettingsChange({ showModelInfo: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hybrid Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use intelligent model selection based on request type
                </p>
              </div>
              <Switch
                checked={settings.enableHybridMode}
                onCheckedChange={(checked) =>
                  onSettingsChange({ enableHybridMode: checked })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
