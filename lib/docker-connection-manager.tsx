"use client";

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";

interface DockerConnectionStatus {
  isAvailable: boolean | null; // null = unknown, true = available, false = unavailable
  lastChecked: Date | null;
  consecutiveFailures: number;
  errorMessage: string | null;
  isRateLimited: boolean;
  nextRetryTime: Date | null;
}

interface DockerConnectionManagerType {
  status: DockerConnectionStatus;
  checkDockerAvailability: () => Promise<boolean>;
  resetRetryCount: () => void;
  canAttemptConnection: () => boolean;
  reportConnectionFailure: (error: string) => void;
  reportConnectionSuccess: () => void;
  getTimeUntilRetry: () => number; // Returns milliseconds until next retry
}

const DockerConnectionContext = createContext<DockerConnectionManagerType>({
  status: {
    isAvailable: null,
    lastChecked: null,
    consecutiveFailures: 0,
    errorMessage: null,
    isRateLimited: false,
    nextRetryTime: null,
  },
  checkDockerAvailability: async () => false,
  resetRetryCount: () => {},
  canAttemptConnection: () => false,
  reportConnectionFailure: () => {},
  reportConnectionSuccess: () => {},
  getTimeUntilRetry: () => 0,
});

const MAX_CONSECUTIVE_FAILURES = 3;
const BASE_RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes
const RATE_LIMIT_RESET_TIME_MS = 60000; // 1 minute
const DOCKER_UNAVAILABLE_COOLDOWN_MS = 30000; // 30 seconds

export const useDockerConnection = () => {
  const context = useContext(DockerConnectionContext);
  if (!context) {
    throw new Error("useDockerConnection must be used within a DockerConnectionProvider");
  }
  return context;
};

interface DockerConnectionProviderProps {
  children: ReactNode;
}

export const DockerConnectionProvider = ({ children }: DockerConnectionProviderProps) => {
  const [status, setStatus] = useState<DockerConnectionStatus>({
    isAvailable: null,
    lastChecked: null,
    consecutiveFailures: 0,
    errorMessage: null,
    isRateLimited: false,
    nextRetryTime: null,
  });

  const calculateRetryDelay = useCallback((failures: number): number => {
    // Exponential backoff with jitter
    const baseDelay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, failures - 1), MAX_RETRY_DELAY_MS);
    const jitter = Math.random() * 0.2 * baseDelay; // Add 20% jitter
    return Math.floor(baseDelay + jitter);
  }, []);

  const updateStatus = useCallback((updates: Partial<DockerConnectionStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const checkDockerAvailability = useCallback(async (): Promise<boolean> => {
    // If we're rate limited, don't check
    if (status.isRateLimited && status.nextRetryTime && new Date() < status.nextRetryTime) {
      return false;
    }

    try {
      // Make a simple health check to the backend
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const isAvailable = response.ok;

      updateStatus({
        isAvailable,
        lastChecked: new Date(),
        errorMessage: isAvailable ? null : 'Backend service is unavailable',
        isRateLimited: false,
        nextRetryTime: null,
      });

      if (isAvailable) {
        updateStatus({ consecutiveFailures: 0 });
      }

      return isAvailable;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      updateStatus({
        isAvailable: false,
        lastChecked: new Date(),
        errorMessage,
      });

      return false;
    }
  }, [status.isRateLimited, status.nextRetryTime, updateStatus]);

  const canAttemptConnection = useCallback((): boolean => {
    // Don't attempt if we're currently rate limited
    if (status.isRateLimited && status.nextRetryTime && new Date() < status.nextRetryTime) {
      return false;
    }

    // Don't attempt if we've exceeded max consecutive failures
    if (status.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      return false;
    }

    return true;
  }, [status]);

  const reportConnectionFailure = useCallback((error: string) => {
    const newFailureCount = status.consecutiveFailures + 1;
    const isNowRateLimited = newFailureCount >= MAX_CONSECUTIVE_FAILURES;

    updateStatus({
      isAvailable: false,
      lastChecked: new Date(),
      consecutiveFailures: newFailureCount,
      errorMessage: error,
      isRateLimited: isNowRateLimited,
      nextRetryTime: isNowRateLimited ? new Date(Date.now() + calculateRetryDelay(newFailureCount)) : null,
    });
  }, [status.consecutiveFailures, calculateRetryDelay, updateStatus]);

  const reportConnectionSuccess = useCallback(() => {
    updateStatus({
      isAvailable: true,
      lastChecked: new Date(),
      consecutiveFailures: 0,
      errorMessage: null,
      isRateLimited: false,
      nextRetryTime: null,
    });
  }, [updateStatus]);

  const resetRetryCount = useCallback(() => {
    updateStatus({
      consecutiveFailures: 0,
      isRateLimited: false,
      nextRetryTime: null,
      errorMessage: null,
    });
  }, [updateStatus]);

  const getTimeUntilRetry = useCallback((): number => {
    if (!status.nextRetryTime) {
      return 0;
    }

    const now = new Date();
    const diff = status.nextRetryTime.getTime() - now.getTime();
    return Math.max(0, diff);
  }, [status.nextRetryTime]);

  // Auto-check Docker availability when status changes
  useEffect(() => {
    if (status.consecutiveFailures > 0 && status.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      const timer = setTimeout(() => {
        checkDockerAvailability();
      }, calculateRetryDelay(status.consecutiveFailures));

      return () => clearTimeout(timer);
    }
  }, [status.consecutiveFailures, checkDockerAvailability, calculateRetryDelay]);

  // Reset rate limiting after cooldown
  useEffect(() => {
    if (status.isRateLimited && status.nextRetryTime) {
      const timer = setTimeout(() => {
        updateStatus({
          isRateLimited: false,
          nextRetryTime: null,
          consecutiveFailures: Math.max(0, status.consecutiveFailures - 1),
        });
      }, status.nextRetryTime.getTime() - Date.now());

      return () => clearTimeout(timer);
    }
  }, [status.isRateLimited, status.nextRetryTime, status.consecutiveFailures, updateStatus]);

  const value: DockerConnectionManagerType = {
    status,
    checkDockerAvailability,
    resetRetryCount,
    canAttemptConnection,
    reportConnectionFailure,
    reportConnectionSuccess,
    getTimeUntilRetry,
  };

  return (
    <DockerConnectionContext.Provider value={value}>
      {children}
    </DockerConnectionContext.Provider>
  );
};