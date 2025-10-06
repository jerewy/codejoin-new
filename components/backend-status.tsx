"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type BackendStatus = "online" | "offline" | "checking" | "unknown";

interface BackendStatusProps {
  className?: string;
  showRefresh?: boolean;
}

export default function BackendStatus({
  className,
  showRefresh = true,
}: BackendStatusProps) {
  const [status, setStatus] = useState<BackendStatus>("unknown");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef(0);

  const getAdaptivePollingInterval = (failures: number): number => {
    // Adaptive polling: 30s, 60s, 2m, 5m, 10m (max)
    const intervals = [30000, 60000, 120000, 300000, 600000];
    const index = Math.min(failures, intervals.length - 1);
    return intervals[index];
  };

  const scheduleNextCheck = (failures: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const interval = getAdaptivePollingInterval(failures);
    intervalRef.current = setTimeout(() => {
      checkBackendStatus();
    }, interval);
  };

  const checkBackendStatus = async () => {
    setIsChecking(true);
    setStatus("checking");

    try {
      const { codeExecutionAPI } = await import("@/lib/api/codeExecution");
      const isAvailable = await codeExecutionAPI.isBackendAvailable();

      setStatus(isAvailable ? "online" : "offline");
      setLastChecked(new Date());

      if (isAvailable) {
        // Reset failures on success
        setConsecutiveFailures(0);
        consecutiveFailuresRef.current = 0;
        scheduleNextCheck(0);
      } else {
        // Increment failures and adapt polling
        const newFailures = consecutiveFailuresRef.current + 1;
        setConsecutiveFailures(newFailures);
        consecutiveFailuresRef.current = newFailures;
        scheduleNextCheck(newFailures);
      }
    } catch (error) {
      setStatus("offline");
      setLastChecked(new Date());

      // Increment failures and adapt polling
      const newFailures = consecutiveFailuresRef.current + 1;
      setConsecutiveFailures(newFailures);
      consecutiveFailuresRef.current = newFailures;
      scheduleNextCheck(newFailures);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-red-500";
      case "checking":
        return "bg-yellow-500 animate-pulse";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-3 w-3" />;
      case "offline":
        return <XCircle className="h-3 w-3" />;
      case "checking":
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "online":
        return "System Online";
      case "offline":
        return "System Offline";
      case "checking":
        return "Checking...";
      default:
        return "Unknown";
    }
  };

  const getTooltipText = () => {
    const statusText = getStatusText();
    const lastCheckedText = lastChecked
      ? `Last checked: ${lastChecked.toLocaleTimeString()}`
      : "Never checked";

    const nextCheckIn = intervalRef.current && consecutiveFailures > 0
      ? `\nNext check in: ${Math.round(getAdaptivePollingInterval(consecutiveFailures) / 1000 / 60)} minutes`
      : '';

    if (status === "offline") {
      let tooltipText = `${statusText}\n${lastCheckedText}${nextCheckIn}\n\nMake sure Docker is running and start the backend:\ncd code-execution-backend && npm run dev`;

      if (consecutiveFailures > 0) {
        tooltipText += `\n\nAdaptive polling enabled: ${consecutiveFailures} consecutive failures`;
      }

      return tooltipText;
    }

    return `${statusText}\n${lastCheckedText}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <Badge
                variant={status === "online" ? "default" : "secondary"}
                className="text-xs flex items-center gap-1"
              >
                {getStatusIcon()}
                {getStatusText()}
              </Badge>
            </div>

            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={checkBackendStatus}
                disabled={isChecking}
                className="h-6 w-6 p-0"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`}
                />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <pre className="text-xs whitespace-pre-wrap">{getTooltipText()}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
