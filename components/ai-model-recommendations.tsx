"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Zap,
  Monitor,
  Cloud,
  Brain,
  Info,
  TrendingUp,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AIModelConfig,
  AIModelStatus,
  DEFAULT_MODELS,
  MODEL_PROVIDER_INFO,
} from "@/types/ai-model";
import {
  aiModelAvailabilityService,
  ModelRecommendation,
} from "@/lib/ai-model-availability-service";
import { aiModelStatusService } from "@/lib/ai-model-status-service";
import { useToast } from "@/hooks/use-toast";

interface AIModelRecommendationsProps {
  models?: AIModelConfig[];
  requestType?: "code" | "general" | "creative";
  onSelectModel?: (modelId: string) => void;
  className?: string;
}

export default function AIModelRecommendations({
  models = DEFAULT_MODELS,
  requestType = "general",
  onSelectModel,
  className,
}: AIModelRecommendationsProps) {
  const { toast } = useToast();
  const [modelStatuses, setModelStatuses] = useState<
    Record<string, AIModelStatus>
  >({});
  const [recommendations, setRecommendations] = useState<ModelRecommendation[]>(
    []
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize status monitoring
  useEffect(() => {
    // Get initial statuses
    const initialStatuses = aiModelStatusService.getAllStatuses();
    setModelStatuses(initialStatuses);

    // Listen for status updates
    const unsubscribe = aiModelStatusService.addStatusListener((statuses) => {
      setModelStatuses(statuses);
      updateRecommendations(statuses);
    });

    // Listen for availability updates
    const unsubscribeAvailability =
      aiModelAvailabilityService.addAvailabilityListener(() => {
        const currentStatuses = aiModelStatusService.getAllStatuses();
        updateRecommendations(currentStatuses);
      });

    // Initial recommendations
    updateRecommendations(initialStatuses);

    return () => {
      unsubscribe();
      unsubscribeAvailability();
    };
  }, [models, requestType]);

  // Update recommendations based on current statuses
  const updateRecommendations = (statuses: Record<string, AIModelStatus>) => {
    const recs = aiModelAvailabilityService.getModelRecommendations(
      models,
      statuses,
      requestType
    );
    setRecommendations(recs);
  };

  // Refresh recommendations
  const refreshRecommendations = async () => {
    setIsRefreshing(true);
    try {
      // Run health check on all models
      const promises = models.map((model) =>
        aiModelStatusService.checkModelHealth(model)
      );
      await Promise.all(promises);

      toast({
        title: "Recommendations Updated",
        description: "Model availability and performance data refreshed.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to update model recommendations.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
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
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
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

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  // Get score background
  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    if (score >= 40) return "bg-orange-100";
    return "bg-red-100";
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Model Recommendations
              <Badge variant="outline" className="ml-2">
                {requestType}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshRecommendations}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Info className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No model recommendations available</p>
              <p className="text-sm">Try refreshing the data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => {
                const model = models.find(
                  (m) => m.id === recommendation.modelId
                );
                const status = modelStatuses[recommendation.modelId];
                const providerInfo = model
                  ? MODEL_PROVIDER_INFO[model.provider]
                  : null;

                if (!model || !providerInfo) return null;

                return (
                  <div
                    key={recommendation.modelId}
                    className={cn(
                      "p-4 rounded-lg border transition-all hover:shadow-md",
                      index === 0 && "border-green-200 bg-green-50/50",
                      recommendation.isCurrentlyAvailable === false &&
                        "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{providerInfo.icon}</span>
                          {getProviderIcon(model.provider)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{model.name}</h4>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                            {recommendation.isCurrentlyAvailable === false && (
                              <Badge variant="destructive" className="text-xs">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {providerInfo.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div
                            className={cn(
                              "text-2xl font-bold",
                              getScoreColor(recommendation.score)
                            )}
                          >
                            {recommendation.score}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Score
                          </div>
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
                    </div>

                    {/* Score Progress Bar */}
                    <div className="mb-3">
                      <Progress
                        value={recommendation.score}
                        className="h-2"
                        // @ts-ignore
                        style={{
                          backgroundColor: "#f3f4f6",
                        }}
                      />
                    </div>

                    {/* Reasons */}
                    {recommendation.reasons.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs font-medium">
                            Strengths:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {recommendation.reasons.map((reason, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs bg-green-100 text-green-800"
                            >
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {recommendation.warnings.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1 mb-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs font-medium">Warnings:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {recommendation.warnings.map((warning, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs bg-yellow-100 text-yellow-800"
                            >
                              {warning}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">
                          {providerInfo.benefits[0]}
                        </span>
                      </div>

                      {onSelectModel && (
                        <Button
                          size="sm"
                          onClick={() => onSelectModel(recommendation.modelId)}
                          disabled={
                            recommendation.isCurrentlyAvailable === false
                          }
                          className="ml-auto"
                        >
                          {recommendation.isCurrentlyAvailable
                            ? "Select Model"
                            : "Unavailable"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {recommendations.length > 0 && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h5 className="font-medium mb-2">Summary</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Available Models:</span>
                  <div className="text-muted-foreground">
                    {
                      recommendations.filter((r) => r.isCurrentlyAvailable)
                        .length
                    }{" "}
                    of {recommendations.length}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Top Score:</span>
                  <div className="text-muted-foreground">
                    {recommendations[0]?.score || 0}/100
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
