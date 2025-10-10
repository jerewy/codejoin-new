"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, AlertTriangle, Loader2 } from "lucide-react";
import type { ConnectionStatus } from "@/hooks/use-unified-ai-conversations";

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ConnectionStatusIndicator({
  status,
  showLabel = false,
  size = "md"
}: ConnectionStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'connected':
        return <Wifi className="h-4 w-4" />;
      case 'limited':
        return <AlertTriangle className="h-4 w-4" />;
      case 'offline':
      case 'error':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'connected':
        return "default";
      case 'limited':
        return "secondary";
      case 'offline':
      case 'error':
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'connected':
        return "Online";
      case 'limited':
        return "Limited";
      case 'offline':
        return "Offline";
      case 'error':
        return "Error";
      default:
        return "Checking...";
    }
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  }[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getStatusColor()} className="gap-1 cursor-help">
            <div className={iconSize}>
              {getStatusIcon()}
            </div>
            {showLabel && (
              <span className="text-xs">
                {getStatusText()}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={iconSize}>
                {getStatusIcon()}
              </div>
              <span className="font-medium">{getStatusText()}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {status.message}
            </p>

            {/* Capabilities */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Available features:</p>
              <ul className="text-xs space-y-1">
                {status.capabilities.canUseFullAI && (
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Full AI responses
                  </li>
                )}
                {status.capabilities.canUseCache && (
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Cached responses
                  </li>
                )}
                {status.capabilities.canUseTemplates && (
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    Template responses
                  </li>
                )}
                {status.capabilities.canSendMessage && (
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    Send messages
                  </li>
                )}
              </ul>
            </div>

            {/* Status-specific help */}
            {status.status === 'limited' && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                <p className="text-blue-800 dark:text-blue-200">
                  💡 Your messages will sync when connection is restored
                </p>
              </div>
            )}

            {status.status === 'offline' && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs">
                <p className="text-yellow-800 dark:text-yellow-200">
                  ⚠️ Check your internet connection or try refreshing
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}