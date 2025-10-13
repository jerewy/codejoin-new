"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

// Global Error Handler Disabled - Removed component error popup nuisance
// All toast notifications have been disabled to eliminate unwanted error notifications.
// Error logging to console is preserved for debugging purposes.

interface ErrorEvent {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}

interface PromiseRejectionEvent {
  reason: any;
  promise: Promise<any>;
}

export function GlobalErrorHandler() {
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(0);
  const [lastToastTime, setLastToastTime] = useState(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const isHandlerActiveRef = useRef(false);
  const errorTypesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Prevent multiple handler instances
    if (isHandlerActiveRef.current) {
      return;
    }
    isHandlerActiveRef.current = true;

    const handleError = (event: ErrorEvent) => {
      // Validate and filter empty error objects
      if (!event || (typeof event === 'object' && Object.keys(event).length === 0)) {
        console.warn("Ignoring empty error object:", event);
        return;
      }

      // Normalize error data to handle empty objects
      const errorMessage = event.message ||
                          (event.error && typeof event.error === 'object' ? event.error.message : undefined) ||
                          (typeof event.error === 'string' ? event.error : undefined) ||
                          'Unknown error occurred';

      // Skip if we can't extract a meaningful error message
      if (!errorMessage || errorMessage === 'Unknown error occurred') {
        console.warn("Skipping error without meaningful message:", event);
        return;
      }

      const errorFilename = event.filename || 'unknown';
      const errorLineno = event.lineno || 0;
      const errorColno = event.colno || 0;
      const errorStack = event.error?.stack ||
                        (event.error && typeof event.error === 'object' ? event.error.stack : undefined);

      const isModuleCallError = errorMessage?.includes("Cannot read properties of undefined") &&
                                errorMessage?.includes("reading 'call'");

      const isChunkLoadError = errorMessage?.includes("Loading chunk") ||
                               errorMessage?.includes("ChunkLoadError");

      const isDimensionsError = errorMessage?.includes("Cannot read properties of undefined") &&
                                errorMessage?.includes("reading 'dimensions'");

      const isReloadLoop = errorMessage?.includes("reload") ||
                          errorFilename?.includes("global-error-handler") ||
                          window.location.search.includes('reloaded=true');

      const now = Date.now();

      // Create error signature for deduplication
      const errorSignature = `${errorMessage.substring(0, 50)}_${errorFilename}`;
      const isDuplicateError = errorTypesRef.current.has(errorSignature);

      // Prevent error floods with stricter rate limiting
      if (now - lastErrorTime < 1000) {
        console.warn("Error rate limited:", errorMessage);
        return;
      }

      // Prevent showing too many toasts for the same error type
      if (isDuplicateError && now - lastToastTime < 10000) {
        console.warn("Duplicate error suppressed:", errorMessage);
        return;
      }

      // Prevent infinite refresh loops
      if (errorCount >= 3 && isReloadLoop) {
        console.error("Detected reload loop, stopping automatic refresh");
        return;
      }

      setLastErrorTime(now);
      setErrorCount(prev => prev + 1);
      setConsecutiveErrors(prev => prev + 1);

      // Track error types
      errorTypesRef.current.add(errorSignature);

      // Reset consecutive errors after 5 seconds of no errors
      setTimeout(() => {
        setConsecutiveErrors(0);
      }, 5000);

      // Log error details with better serialization
      console.error("Global error handler caught:", {
        message: errorMessage,
        filename: errorFilename,
        lineno: errorLineno,
        colno: errorColno,
        stack: errorStack,
        isModuleCallError,
        isChunkLoadError,
        isDimensionsError,
        isReloadLoop,
        errorCount: errorCount + 1,
        timestamp: new Date().toISOString(),
        rawEvent: {
          hasMessage: !!event.message,
          hasError: !!event.error,
          errorType: typeof event.error,
          errorKeys: event.error && typeof event.error === 'object' ? Object.keys(event.error) : []
        }
      });

      // Handle specific error types
      if (isModuleCallError) {
        handleModuleCallError(isDuplicateError);
      } else if (isChunkLoadError) {
        handleChunkLoadError();
      } else if (isDimensionsError) {
        handleDimensionsError();
      } else {
        handleGenericError(errorMessage, isDuplicateError);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Validate and filter empty rejection objects
      if (!event || !event.reason) {
        console.warn("Ignoring empty promise rejection:", event);
        return;
      }

      // Normalize reason data to handle empty objects
      const reasonMessage = event.reason?.message ||
                          (event.reason && typeof event.reason === 'object' && event.reason.message) ||
                          (typeof event.reason === 'string' ? event.reason : undefined) ||
                          'Unhandled promise rejection';

      // Skip if we can't extract a meaningful error message
      if (!reasonMessage || reasonMessage === 'Unhandled promise rejection') {
        console.warn("Skipping promise rejection without meaningful message:", event.reason);
        return;
      }

      const reasonStack = event.reason?.stack ||
                        (event.reason && typeof event.reason === 'object' ? event.reason.stack : undefined);

      const isModuleCallError = reasonMessage?.includes("Cannot read properties of undefined") &&
                                reasonMessage?.includes("reading 'call'");

      const isDimensionsError = reasonMessage?.includes("Cannot read properties of undefined") &&
                                reasonMessage?.includes("reading 'dimensions'");

      const isReloadLoop = reasonMessage?.includes("reload") ||
                          window.location.search.includes('reloaded=true');

      const now = Date.now();

      // Create error signature for deduplication
      const errorSignature = `${reasonMessage.substring(0, 50)}_promise_rejection`;
      const isDuplicateError = errorTypesRef.current.has(errorSignature);

      // Prevent error floods with stricter rate limiting
      if (now - lastErrorTime < 1000) {
        console.warn("Promise rejection rate limited:", reasonMessage);
        return;
      }

      // Prevent showing too many toasts for the same error type
      if (isDuplicateError && now - lastToastTime < 10000) {
        console.warn("Duplicate promise rejection suppressed:", reasonMessage);
        return;
      }

      // Prevent infinite refresh loops
      if (errorCount >= 3 && isReloadLoop) {
        console.error("Detected reload loop in promise rejection, stopping automatic refresh");
        return;
      }

      setLastErrorTime(now);
      setErrorCount(prev => prev + 1);
      setConsecutiveErrors(prev => prev + 1);

      // Track error types
      errorTypesRef.current.add(errorSignature);

      // Reset consecutive errors after 5 seconds of no errors
      setTimeout(() => {
        setConsecutiveErrors(0);
      }, 5000);

      console.error("Unhandled promise rejection:", {
        reason: event.reason,
        message: reasonMessage,
        stack: reasonStack,
        isModuleCallError,
        isDimensionsError,
        isReloadLoop,
        errorCount: errorCount + 1,
        timestamp: new Date().toISOString(),
        reasonType: typeof event.reason,
        reasonKeys: event.reason && typeof event.reason === 'object' ? Object.keys(event.reason) : []
      });

      if (isModuleCallError) {
        handleModuleCallError(isDuplicateError);
      } else if (isDimensionsError) {
        handleDimensionsError();
      } else {
        handleGenericError(reasonMessage, isDuplicateError);
      }
    };

    const handleModuleCallError = (isDuplicateError: boolean = false) => {
      // DISABLED - All toast notifications removed to eliminate popup nuisance
      // Console logging preserved for debugging purposes
      const currentTime = Date.now();
      const timeSinceLastToast = currentTime - lastToastTime;

      // Check if we're already in a reload loop
      const isAlreadyReloaded = window.location.search.includes('reloaded=true');

      if (isAlreadyReloaded || errorCount >= 3) {
        console.debug('Module call error detected but toast notification disabled:', {
          errorCount,
          isAlreadyReloaded,
          timeSinceLastToast
        });
        return;
      }

      console.debug('Module call error detected but toast notification disabled:', {
        isDuplicateError,
        timeSinceLastToast
      });

      // Auto-refresh logic preserved but without user notifications
      setTimeout(() => {
        if (errorCount >= 2 && !isAlreadyReloaded) {
          console.debug('Auto-refreshing due to repeated module errors');
          window.location.search = 'reloaded=true';
          window.location.reload();
        }
      }, 3000);
    };

    const handleChunkLoadError = () => {
      // DISABLED - All toast notifications removed to eliminate popup nuisance
      // Console logging preserved for debugging purposes
      const currentTime = Date.now();
      const timeSinceLastToast = currentTime - lastToastTime;

      console.debug('Chunk load error detected but toast notification disabled:', {
        timeSinceLastToast
      });

      // For chunk load errors, try a gentle refresh first (without notification)
      setTimeout(() => {
        console.debug('Auto-refreshing due to chunk load error');
        window.location.reload();
      }, 2000);
    };

    const handleDimensionsError = () => {
      // DISABLED - All toast notifications removed to eliminate popup nuisance
      // Console logging preserved for debugging purposes
      const currentTime = Date.now();
      const timeSinceLastToast = currentTime - lastToastTime;

      console.debug('Dimensions error detected but toast notification disabled:', {
        timeSinceLastToast
      });
    };

    const handleGenericError = (message: string, isDuplicateError: boolean = false) => {
      // DISABLED - All toast notifications removed to eliminate popup nuisance
      // Console logging preserved for debugging purposes
      const currentTime = Date.now();
      const timeSinceLastToast = currentTime - lastToastTime;

      console.debug('Generic error detected but toast notification disabled:', {
        message,
        isDuplicateError,
        timeSinceLastToast
      });
    };

    // Set up global error listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup listeners and reset handler state
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      isHandlerActiveRef.current = false;
      // Clear error types to prevent memory leaks
      errorTypesRef.current.clear();
    };
  }, [errorCount, lastErrorTime, lastToastTime]);

  // This component doesn't render anything
  return null;
}

// Hook for manual error handling with rate limiting - TOASTS DISABLED
export function useGlobalErrorHandler() {
  const lastManualToastTime = useRef(0);
  const manualErrorTypesRef = useRef<Set<string>>(new Set());

  const reportError = (error: Error, context?: string) => {
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorStack = error?.stack;
    const currentTime = Date.now();
    const timeSinceLastToast = currentTime - lastManualToastTime.current;

    // Create error signature for deduplication
    const errorSignature = `${errorMessage.substring(0, 50)}_manual`;
    const isDuplicateError = manualErrorTypesRef.current.has(errorSignature);

    const isModuleCallError = errorMessage?.includes("Cannot read properties of undefined") &&
                              errorMessage?.includes("reading 'call'");

    const isDimensionsError = errorMessage?.includes("Cannot read properties of undefined") &&
                              errorMessage?.includes("reading 'dimensions'");

    console.error("Manual error report:", {
      error: errorMessage,
      stack: errorStack,
      context,
      isModuleCallError,
      isDimensionsError,
      timestamp: new Date().toISOString(),
    });

    // Track error types
    manualErrorTypesRef.current.add(errorSignature);

    // DISABLED - All toast notifications removed to eliminate popup nuisance
    console.debug('Manual error report received but toast notification disabled:', {
      errorMessage,
      context,
      isModuleCallError,
      isDimensionsError,
      isDuplicateError,
      timeSinceLastToast
    });

    // Auto-refresh logic preserved for critical errors but without notifications
    if (isModuleCallError) {
      setTimeout(() => {
        console.debug('Auto-refreshing due to manual module error report');
        window.location.reload();
      }, 2000);
    }
  };

  return { reportError };
}