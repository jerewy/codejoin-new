"use client";

import { useState } from "react";
import { useDockerConnection } from "@/lib/docker-connection-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Container,
  AlertTriangle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DockerStatusPanelProps {
  className?: string;
  compact?: boolean;
}

export function DockerStatusPanel({ className = "", compact = false }: DockerStatusPanelProps) {
  const {
    status,
    checkDockerAvailability,
    resetRetryCount,
    canAttemptConnection,
    reportConnectionFailure,
    getTimeUntilRetry
  } = useDockerConnection();

  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const handleManualRetry = async () => {
    setIsChecking(true);
    resetRetryCount();

    try {
      const isAvailable = await checkDockerAvailability();

      toast({
        title: isAvailable ? "Docker Connected" : "Docker Unavailable",
        description: isAvailable
          ? "Docker connection is working properly."
          : "Docker is still unavailable. Please ensure Docker Desktop is running.",
        variant: isAvailable ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Connection Check Failed",
        description: "Failed to check Docker connection status.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-5 w-5 animate-spin" />;
    }

    switch (status.isAvailable) {
      case true:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case false:
        if (status.isRateLimited) {
          return <Clock className="h-5 w-5 text-yellow-500" />;
        }
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (isChecking) return "Checking...";
    if (status.isAvailable === true) return "Connected";
    if (status.isAvailable === false) return "Unavailable";
    return "Unknown";
  };

  const getStatusColor = () => {
    if (status.isAvailable === true) return "text-green-600";
    if (status.isAvailable === false) return "text-red-600";
    return "text-gray-600";
  };

  const getRetryProgress = () => {
    if (!status.nextRetryTime) return 0;

    const now = new Date();
    const totalWaitTime = status.nextRetryTime.getTime() - (status.lastChecked?.getTime() || now.getTime());
    const elapsed = now.getTime() - (status.lastChecked?.getTime() || now.getTime());

    return Math.min(100, (elapsed / totalWaitTime) * 100);
  };

  const getTimeUntilRetryDisplay = () => {
    const timeUntilRetry = getTimeUntilRetry();
    if (timeUntilRetry <= 0) return "Ready to retry";

    const seconds = Math.ceil(timeUntilRetry / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <div className={`font-medium ${getStatusColor()}`}>
                  Docker {getStatusText()}
                </div>
                {status.errorMessage && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {status.errorMessage}
                  </div>
                )}
              </div>
            </div>

            {status.isAvailable === false && !status.isRateLimited && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRetry}
                disabled={isChecking || !canAttemptConnection()}
              >
                {isChecking ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Retry"
                )}
              </Button>
            )}
          </div>

          {status.isRateLimited && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Retry in {getTimeUntilRetryDisplay()}</span>
                <span>{Math.round(getRetryProgress())}%</span>
              </div>
              <Progress value={getRetryProgress()} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Container className="h-5 w-5" />
            <CardTitle className="text-lg">Docker Connection</CardTitle>
            {getStatusIcon()}
          </div>
          <Badge variant={status.isAvailable === true ? "default" : "destructive"}>
            {getStatusText()}
          </Badge>
        </div>
        {status.lastChecked && (
          <CardDescription>
            Last checked: {status.lastChecked.toLocaleTimeString()}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status:</span>
            <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Failed Attempts:</span>
            <span className="text-sm">{status.consecutiveFailures} / 3</span>
          </div>

          {status.errorMessage && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{status.errorMessage}</span>
            </div>
          )}
        </div>

        {/* Rate Limiting Status */}
        {status.isRateLimited && (
          <div className="space-y-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Rate Limited</span>
            </div>
            <p className="text-xs text-yellow-700">
              Too many failed attempts. Please wait before retrying.
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-yellow-600">
                <span>Retry in: {getTimeUntilRetryDisplay()}</span>
                <span>{Math.round(getRetryProgress())}%</span>
              </div>
              <Progress value={getRetryProgress()} className="h-2" />
            </div>
          </div>
        )}

        {/* Success State */}
        {status.isAvailable === true && (
          <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Connected</span>
            </div>
            <p className="text-xs text-green-700">
              Docker is running and ready for container operations.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRetry}
            disabled={isChecking || (status.isAvailable === false && !canAttemptConnection())}
            className="flex-1"
          >
            {isChecking ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Connection
              </>
            )}
          </Button>

          {status.consecutiveFailures > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetRetryCount}
              className="flex-1"
            >
              Reset Counter
            </Button>
          )}
        </div>

        {/* Help Text */}
        {status.isAvailable === false && (
          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Troubleshooting</span>
            </div>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Ensure Docker Desktop is running</li>
              <li>• Check if Docker service is started</li>
              <li>• Verify Docker socket permissions</li>
              <li>• Restart Docker Desktop if needed</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}