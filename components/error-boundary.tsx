"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Normalize error data
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorStack = error?.stack;

    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", {
      error: errorMessage,
      stack: errorStack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Check for specific error types
    const isModuleCallError = errorMessage?.includes("Cannot read properties of undefined") &&
                              errorMessage?.includes("reading 'call'");

    const isDimensionsError = errorMessage?.includes("Cannot read properties of undefined") &&
                              errorMessage?.includes("reading 'dimensions'");

    if (isModuleCallError) {
      console.warn("Module call error detected, will trigger refresh after retries");
    } else if (isDimensionsError) {
      console.warn("Dimensions error detected in component, will trigger refresh after retries");
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-refresh for module call errors after retries
    if ((isModuleCallError || isDimensionsError) && this.state.retryCount >= this.maxRetries - 1) {
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      // Force hard refresh if max retries reached
      window.location.reload();
    }
  };

  handleHardRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown error occurred';
      const isModuleCallError = errorMessage?.includes("Cannot read properties of undefined") &&
                                errorMessage?.includes("reading 'call'");
      const isDimensionsError = errorMessage?.includes("Cannot read properties of undefined") &&
                                errorMessage?.includes("reading 'dimensions'");

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const getErrorTitle = () => {
        if (isModuleCallError) return "Component Update Required";
        if (isDimensionsError) return "UI Component Error";
        return "Component Error";
      };

      const getErrorDescription = () => {
        if (isModuleCallError) return "This component needs to be refreshed after an update.";
        if (isDimensionsError) return "A UI component failed to load properly.";
        return "A component encountered an error and couldn't render.";
      };

      const getErrorContent = () => {
        if (isModuleCallError) {
          return (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">This happens when:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Application code was updated</li>
                <li>Component dependencies changed</li>
                <li>Module cache is stale</li>
              </ul>
              <p className="text-xs mt-2 text-blue-600">
                {this.state.retryCount < this.maxRetries
                  ? `Attempting recovery... (${this.state.retryCount + 1}/${this.maxRetries})`
                  : "Refreshing component..."
                }
              </p>
            </div>
          );
        }

        if (isDimensionsError) {
          return (
            <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
              <p className="font-medium mb-1">This happens when:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>A component's properties are undefined</li>
                <li>UI component failed to initialize</li>
                <li>Component dependencies are missing</li>
              </ul>
              <p className="text-xs mt-2 text-orange-600">
                {this.state.retryCount < this.maxRetries
                  ? `Attempting recovery... (${this.state.retryCount + 1}/${this.maxRetries})`
                  : "Refreshing component..."
                }
              </p>
            </div>
          );
        }

        return (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <p className="font-mono text-xs break-all">
              {errorMessage}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-gray-500">
                  Stack Trace
                </summary>
                <pre className="text-xs mt-1 whitespace-pre-wrap font-mono">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        );
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">
                {getErrorTitle()}
              </CardTitle>
              <CardDescription>
                {getErrorDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getErrorContent()}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                onClick={this.handleRetry}
                className="w-full"
                disabled={this.state.retryCount >= this.maxRetries}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${this.state.retryCount >= this.maxRetries ? 'animate-spin' : ''}`} />
                {this.state.retryCount >= this.maxRetries ? "Refreshing..." : "Retry"}
              </Button>

              {(isModuleCallError || isDimensionsError) && (
                <Button
                  onClick={this.handleHardRefresh}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Force Refresh
                </Button>
              )}

              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                className="w-full"
                size="sm"
              >
                <Bug className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function useErrorHandler() {
  const handleError = (error: Error) => {
    // Normalize error data
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorStack = error?.stack;

    // Check for specific error types
    const isModuleCallError = errorMessage?.includes("Cannot read properties of undefined") &&
                              errorMessage?.includes("reading 'call'");
    const isDimensionsError = errorMessage?.includes("Cannot read properties of undefined") &&
                              errorMessage?.includes("reading 'dimensions'");

    console.error("Error caught by useErrorHandler:", {
      error: errorMessage,
      stack: errorStack,
      isModuleCallError,
      isDimensionsError,
      timestamp: new Date().toISOString(),
    });

    if (isModuleCallError || isDimensionsError) {
      // For module call and dimensions errors, suggest a page refresh
      window.location.reload();
    } else {
      // For other errors, you might want to show a toast or other UI
      console.error("Application error:", error);
    }
  };

  return { handleError };
}