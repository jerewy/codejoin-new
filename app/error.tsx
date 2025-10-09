"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isModuleCallError, setIsModuleCallError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check if this is the specific "Cannot read properties of undefined (reading 'call')" error
    const isTargetError = error.message?.includes("Cannot read properties of undefined") &&
                          error.message?.includes("reading 'call'");

    setIsModuleCallError(isTargetError);

    // Log error for debugging
    console.error("Application error:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      isModuleCallError,
      timestamp: new Date().toISOString(),
    });

    // If it's the module call error, force a hard refresh after retries are exhausted
    if (isTargetError && retryCount >= 2) {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [error, retryCount]);

  const handleReset = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      reset();
    } else {
      // Force hard refresh if retries are exhausted
      window.location.reload();
    }
  };

  const handleHardRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">
            {isModuleCallError ? "Application Update Required" : "Something went wrong"}
          </CardTitle>
          <CardDescription>
            {isModuleCallError
              ? "The application has been updated. Please refresh to get the latest version."
              : "An unexpected error occurred. We're working to fix this."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isModuleCallError ? (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">This usually happens when:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>The application was recently updated</li>
                <li>Your browser has cached an older version</li>
                <li>A network interruption occurred</li>
              </ul>
              <p className="text-xs mt-2 text-blue-600">
                {retryCount < 3
                  ? `Attempting to recover... (${retryCount + 1}/3)`
                  : "Refreshing page automatically..."
                }
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-mono text-xs break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs mt-2 text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={handleReset}
            className="w-full"
            disabled={retryCount >= 3}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${retryCount >= 3 ? 'animate-spin' : ''}`} />
            {retryCount >= 3 ? "Refreshing..." : "Try Again"}
          </Button>

          {isModuleCallError && (
            <Button
              onClick={handleHardRefresh}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Force Refresh
            </Button>
          )}

          <Button
            onClick={handleGoHome}
            variant="ghost"
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}