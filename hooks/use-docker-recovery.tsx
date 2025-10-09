"use client";

import { useEffect, useCallback } from "react";
import { useDockerConnection } from "@/lib/docker-connection-manager";

interface UseDockerRecoveryOptions {
  enabled?: boolean;
  checkInterval?: number; // in milliseconds
  maxRetries?: number;
  onRecovery?: () => void;
  onFailedAttempt?: (error: string) => void;
}

export const useDockerRecovery = ({
  enabled = true,
  checkInterval = 30000, // 30 seconds
  maxRetries = 10,
  onRecovery,
  onFailedAttempt,
}: UseDockerRecoveryOptions = {}) => {
  const {
    status,
    checkDockerAvailability,
    canAttemptConnection,
    reportConnectionFailure,
    reportConnectionSuccess,
  } = useDockerConnection();

  const attemptRecovery = useCallback(async () => {
    if (!enabled || !canAttemptConnection()) {
      return false;
    }

    try {
      const isAvailable = await checkDockerAvailability();

      if (isAvailable) {
        reportConnectionSuccess();
        onRecovery?.();
        return true;
      } else {
        reportConnectionFailure("Auto-recovery attempt failed");
        onFailedAttempt?.("Auto-recovery attempt failed");
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reportConnectionFailure(errorMessage);
      onFailedAttempt?.(errorMessage);
      return false;
    }
  }, [
    enabled,
    canAttemptConnection,
    checkDockerAvailability,
    reportConnectionFailure,
    reportConnectionSuccess,
    onRecovery,
    onFailedAttempt,
  ]);

  // Set up automatic recovery attempts
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Only attempt recovery if Docker is unavailable and we haven't exceeded max retries
    if (
      status.isAvailable === false &&
      !status.isRateLimited &&
      status.consecutiveFailures < maxRetries
    ) {
      const interval = setInterval(() => {
        attemptRecovery();
      }, checkInterval);

      return () => clearInterval(interval);
    }
  }, [
    enabled,
    status.isAvailable,
    status.isRateLimited,
    status.consecutiveFailures,
    maxRetries,
    checkInterval,
    attemptRecovery,
  ]);

  // Also attempt recovery when the window becomes visible again
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        status.isAvailable === false &&
        canAttemptConnection()
      ) {
        attemptRecovery();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    enabled,
    status.isAvailable,
    canAttemptConnection,
    attemptRecovery,
  ]);

  // Attempt recovery when the network connection is restored
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleOnline = () => {
      if (status.isAvailable === false && canAttemptConnection()) {
        attemptRecovery();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [
    enabled,
    status.isAvailable,
    canAttemptConnection,
    attemptRecovery,
  ]);

  return {
    isRecovering: status.isAvailable === false && canAttemptConnection(),
    attemptRecovery,
    recoveryAttempts: status.consecutiveFailures,
    canAttemptRecovery: canAttemptConnection(),
    lastAttempt: status.lastChecked,
  };
};