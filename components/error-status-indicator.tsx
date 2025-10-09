"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Info } from "lucide-react";
import { useGlobalErrorHandler } from "@/components/global-error-handler";

interface ErrorStatus {
  healthy: boolean;
  lastError?: {
    message: string;
    timestamp: number;
    type: "module-call" | "generic" | "chunk-load" | "network";
  };
  errorCount: number;
  lastCheck: number;
}

export function ErrorStatusIndicator() {
  const { reportError } = useGlobalErrorHandler();
  const [status, setStatus] = useState<ErrorStatus>({
    healthy: true,
    errorCount: 0,
    lastCheck: Date.now(),
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Monitor for errors and update status
    const handleStatusCheck = () => {
      const now = Date.now();
      const timeSinceLastCheck = now - status.lastCheck;

      // Consider healthy if no errors in the last 30 seconds
      const isHealthy = !status.lastError || (now - status.lastError.timestamp > 30000);

      setStatus(prev => ({
        ...prev,
        healthy: isHealthy,
        lastCheck: now,
      }));
    };

    // Check status every 10 seconds
    const interval = setInterval(handleStatusCheck, 10000);

    return () => clearInterval(interval);
  }, [status.lastCheck, status.lastError]);

  useEffect(() => {
    // Listen for errors to update status
    const handleError = (event: ErrorEvent) => {
      const isModuleCallError = event.message?.includes("Cannot read properties of undefined") &&
                                event.message?.includes("reading 'call'");

      const errorType = isModuleCallError ? "module-call" :
                       event.message?.includes("Loading chunk") ? "chunk-load" :
                       event.message?.includes("fetch") ? "network" : "generic";

      setStatus(prev => ({
        healthy: false,
        lastError: {
          message: event.message || "Unknown error",
          timestamp: Date.now(),
          type: errorType,
        },
        errorCount: prev.errorCount + 1,
        lastCheck: Date.now(),
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError({
        message: event.reason?.message || "Unhandled promise rejection",
        error: event.reason,
      } as ErrorEvent);
    });

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const getStatusIcon = () => {
    if (status.healthy) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    if (status.lastError?.type === "module-call") {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }

    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (status.healthy) {
      return "bg-green-100 text-green-800 border-green-200";
    }

    if (status.lastError?.type === "module-call") {
      return "bg-orange-100 text-orange-800 border-orange-200";
    }

    return "bg-red-100 text-red-800 border-red-200";
  };

  const getStatusText = () => {
    if (status.healthy) {
      return "Healthy";
    }

    switch (status.lastError?.type) {
      case "module-call":
        return "Update Needed";
      case "chunk-load":
        return "Loading Issue";
      case "network":
        return "Network Error";
      default:
        return "Error Detected";
    }
  };

  const handleManualRefresh = () => {
    window.location.reload();
  };

  const handleHealthCheck = () => {
    // Trigger a manual health check
    try {
      // Test a simple operation
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);
      document.body.removeChild(testElement);

      setStatus(prev => ({
        ...prev,
        healthy: true,
        lastCheck: Date.now(),
      }));

      reportError(new Error("Manual health check completed successfully"));
    } catch (error) {
      reportError(error as Error);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Badge className={getStatusColor()}>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="text-xs">{getStatusText()}</span>
            </div>
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Application Status
          </DialogTitle>
          <DialogDescription>
            Current health and error status of the application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Status:</span>
                <Badge className={getStatusColor()}>
                  {getStatusText()}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Errors:</span>
                <span className="text-sm font-mono">{status.errorCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Last Check:</span>
                <span className="text-sm">
                  {new Date(status.lastCheck).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Last Error Details */}
          {status.lastError && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Last Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs">
                  <div className="font-medium mb-1">Message:</div>
                  <div className="font-mono p-2 bg-gray-50 rounded border break-all text-xs">
                    {status.lastError.message}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Type: {status.lastError.type}</span>
                  <span>{new Date(status.lastError.timestamp).toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {!status.healthy && (
              <Button
                onClick={handleManualRefresh}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Application
              </Button>
            )}

            <Button
              onClick={handleHealthCheck}
              className="w-full"
              variant="outline"
            >
              <Info className="mr-2 h-4 w-4" />
              Run Health Check
            </Button>
          </div>

          {/* Info Message */}
          <div className="text-xs text-gray-500 text-center">
            <p>If you're experiencing issues, try refreshing the page or reporting the error.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}