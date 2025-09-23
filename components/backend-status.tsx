"use client";

import { useState, useEffect } from "react";
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

export default function BackendStatus({ className, showRefresh = true }: BackendStatusProps) {
  const [status, setStatus] = useState<BackendStatus>("unknown");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkBackendStatus = async () => {
    setIsChecking(true);
    setStatus("checking");

    try {
      const { codeExecutionAPI } = await import('@/lib/api/codeExecution');
      const isAvailable = await codeExecutionAPI.isBackendAvailable();

      setStatus(isAvailable ? "online" : "offline");
      setLastChecked(new Date());
    } catch (error) {
      setStatus("offline");
      setLastChecked(new Date());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();

    // Check status every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
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
        return "Backend Online";
      case "offline":
        return "Backend Offline";
      case "checking":
        return "Checking...";
      default:
        return "Unknown";
    }
  };

  const getTooltipText = () => {
    const statusText = getStatusText();
    const lastCheckedText = lastChecked ?
      `Last checked: ${lastChecked.toLocaleTimeString()}` :
      "Never checked";

    if (status === "offline") {
      return `${statusText}\n${lastCheckedText}\n\nMake sure Docker is running and start the backend:\ncd code-execution-backend && npm run dev`;
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
                <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
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