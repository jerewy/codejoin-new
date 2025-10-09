"use client";

import { useEffect, useState } from "react";
import { useDockerConnection } from "@/lib/docker-connection-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Clock,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DockerStatusIndicatorProps {
  className?: string;
  showRetryButton?: boolean;
  compact?: boolean;
}

export function DockerStatusIndicator({
  className = "",
  showRetryButton = true,
  compact = false
}: DockerStatusIndicatorProps) {
  const { status, checkDockerAvailability, resetRetryCount, getTimeUntilRetry } = useDockerConnection();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = async () => {
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
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }

    switch (status.isAvailable) {
      case true:
        return <CheckCircle className="h-3 w-3" />;
      case false:
        if (status.isRateLimited) {
          return <Clock className="h-3 w-3" />;
        }
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getStatusVariant = () => {
    if (status.isAvailable === true) return "default";
    if (status.isAvailable === false) return "destructive";
    return "secondary";
  };

  const getStatusText = () => {
    if (compact) {
      if (isChecking) return "Checking...";
      if (status.isAvailable === true) return "Docker Ready";
      if (status.isAvailable === false) return "Docker Unavailable";
      return "Checking...";
    }

    if (isChecking) return "Checking Docker...";
    if (status.isAvailable === true) return "Docker Connected";
    if (status.isAvailable === false) {
      if (status.isRateLimited) {
        const timeUntilRetry = Math.ceil(getTimeUntilRetry() / 1000);
        return `Retry in ${timeUntilRetry}s`;
      }
      return "Docker Unavailable";
    }
    return "Checking Docker...";
  };

  const getErrorMessage = () => {
    if (!status.errorMessage) return null;

    // Don't show generic error messages in compact mode
    if (compact) return null;

    return (
      <div className="text-xs text-muted-foreground mt-1 max-w-xs">
        {status.errorMessage}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant={getStatusVariant()} className="flex items-center gap-1">
          {getStatusIcon()}
          <span className="text-xs">{getStatusText()}</span>
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant={getStatusVariant()} className="flex items-center gap-1">
          {getStatusIcon()}
          <span className="text-xs">{getStatusText()}</span>
        </Badge>

        {showRetryButton && status.isAvailable === false && !status.isRateLimited && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isChecking}
            className="h-6 px-2 text-xs"
          >
            {isChecking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="ml-1">Retry</span>
          </Button>
        )}
      </div>

      {getErrorMessage()}

      {status.isRateLimited && (
        <div className="text-xs text-muted-foreground">
          Too many failed attempts. Please wait before retrying.
        </div>
      )}

      {status.consecutiveFailures > 0 && status.consecutiveFailures < 3 && (
        <div className="text-xs text-muted-foreground">
          Connection attempts remaining: {MAX_CONSECUTIVE_FAILURES - status.consecutiveFailures}
        </div>
      )}
    </div>
  );
}

// Constants that match the manager
const MAX_CONSECUTIVE_FAILURES = 3;