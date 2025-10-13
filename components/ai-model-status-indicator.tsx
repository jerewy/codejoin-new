"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Activity,
  Clock,
  Zap,
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIModelConfig, AIModelStatus } from '@/types/ai-model';
import { aiModelStatusService } from '@/lib/ai-model-status-service';
import { useToast } from '@/hooks/use-toast';

interface AIModelStatusIndicatorProps {
  model: AIModelConfig;
  status?: AIModelStatus;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export default function AIModelStatusIndicator({
  model,
  status,
  showDetails = false,
  compact = false,
  className
}: AIModelStatusIndicatorProps) {
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState<AIModelStatus | undefined>(status);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (status) {
      setCurrentStatus(status);
    }

    // Listen for status updates
    const unsubscribe = aiModelStatusService.addStatusListener((statuses) => {
      setCurrentStatus(statuses[model.id]);
    });

    return () => unsubscribe();
  }, [model.id, status]);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const newStatus = await aiModelStatusService.checkModelHealth(model);
      setCurrentStatus(newStatus);
      toast({
        title: "Status Updated",
        description: `${model.name} status has been refreshed.`,
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh model status.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!currentStatus) {
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking...
      </Badge>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'offline':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'loading':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-3 w-3" />;
      case 'offline':
        return <XCircle className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      case 'loading':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      case 'loading':
        return 'Loading';
      default:
        return 'Unknown';
    }
  };

  const getResponseTimeColor = (responseTime?: number) => {
    if (!responseTime) return 'text-gray-500';
    if (responseTime < 1000) return 'text-green-600';
    if (responseTime < 3000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRate = (stats?: { successfulRequests?: number; totalRequests?: number }) => {
    if (!stats?.totalRequests) return 0;
    return Math.round((stats.successfulRequests || 0) / stats.totalRequests * 100);
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Compact version - just a badge
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn("gap-1 cursor-pointer", getStatusColor(currentStatus.status), className)}
              onClick={refreshStatus}
            >
              {getStatusIcon(currentStatus.status)}
              <span>{getStatusText(currentStatus.status)}</span>
              {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{model.name}</p>
              <p className="text-sm">Status: {getStatusText(currentStatus.status)}</p>
              {currentStatus.responseTime && (
                <p className="text-sm">Response: {currentStatus.responseTime}ms</p>
              )}
              {currentStatus.errorMessage && (
                <p className="text-sm text-red-500">{currentStatus.errorMessage}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Standard version
  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1", getStatusColor(currentStatus.status))}
          >
            {getStatusIcon(currentStatus.status)}
            <span>{getStatusText(currentStatus.status)}</span>
          </Badge>

          {currentStatus.responseTime && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              <span className={getResponseTimeColor(currentStatus.responseTime)}>
                {currentStatus.responseTime}ms
              </span>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          </Button>

          {showDetails && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Info className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {model.name} - Detailed Status
                  </DialogTitle>
                  <DialogDescription>
                    Comprehensive health and performance metrics for this AI model
                  </DialogDescription>
                </DialogHeader>

                <ModelStatusDetails model={model} status={currentStatus} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {currentStatus.errorMessage && (
          <p className="text-xs text-red-600">{currentStatus.errorMessage}</p>
        )}
      </div>
    </TooltipProvider>
  );
}

// Detailed status component for dialog
interface ModelStatusDetailsProps {
  model: AIModelConfig;
  status: AIModelStatus;
}

function ModelStatusDetails({ model, status }: ModelStatusDetailsProps) {
  const successRate = status.totalRequests > 0
    ? Math.round((status.successfulRequests || 0) / status.totalRequests * 100)
    : 0;

  const getTrendIcon = (current?: number, previous?: number) => {
    if (!current || !previous) return <Minus className="h-4 w-4 text-gray-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Connection Status</h4>
              <div className="flex items-center gap-2">
                {status.status === 'online' ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <span className="capitalize">{status.status}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Last Checked</h4>
              <p className="text-sm text-muted-foreground">
                {new Date(status.lastChecked).toLocaleString()}
              </p>
            </div>

            {status.responseTime && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Response Time</h4>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-2xl font-bold">{status.responseTime}ms</span>
                </div>
                <Progress
                  value={Math.max(0, Math.min(100, (10000 - status.responseTime) / 100))}
                  className="h-2"
                />
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Success Rate</h4>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{successRate}%</div>
                {getTrendIcon()}
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-xl font-semibold">{status.totalRequests || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-xl font-semibold text-green-600">
                {status.successfulRequests || 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-xl font-semibold text-red-600">
                {status.failedRequests || 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tokens Used</p>
              <p className="text-xl font-semibold">{status.tokensUsed?.toLocaleString() || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Model Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Model ID</span>
              <span className="text-sm font-mono">{model.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Provider</span>
              <span className="text-sm capitalize">{model.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Endpoint</span>
              <span className="text-sm font-mono">{model.endpoint}</span>
            </div>
            {model.maxTokens && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Max Tokens</span>
                <span className="text-sm">{model.maxTokens.toLocaleString()}</span>
              </div>
            )}
            {model.contextWindow && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Context Window</span>
                <span className="text-sm">{model.contextWindow.toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Capabilities</h3>
          <div className="flex flex-wrap gap-2">
            {model.capabilities.map((capability) => (
              <Badge key={capability} variant="secondary">
                {capability}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {status.errorMessage && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2 text-red-600">Error Details</h3>
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {status.errorMessage}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Health summary component for dashboard view
interface AIModelHealthSummaryProps {
  models: AIModelConfig[];
  className?: string;
}

export function AIModelHealthSummary({ models, className }: AIModelHealthSummaryProps) {
  const [summary, setSummary] = useState(aiModelStatusService.getHealthSummary());

  useEffect(() => {
    const unsubscribe = aiModelStatusService.addStatusListener(() => {
      setSummary(aiModelStatusService.getHealthSummary());
    });

    setSummary(aiModelStatusService.getHealthSummary());
    return () => unsubscribe();
  }, []);

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5" />
          <h3 className="font-medium">AI Model Health</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.onlineModels}</div>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.offlineModels}</div>
            <p className="text-sm text-muted-foreground">Offline</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.errorModels}</div>
            <p className="text-sm text-muted-foreground">Errors</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {summary.averageResponseTime > 0 ? `${Math.round(summary.averageResponseTime)}ms` : '-'}
            </div>
            <p className="text-sm text-muted-foreground">Avg Response</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}