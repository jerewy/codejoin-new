"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useSocket } from "@/lib/socket";

type FitAddonLike = {
  onDidFit?: (
    callback: (dimensions: { cols?: number; rows?: number }) => void
  ) => { dispose?: () => void } | void;
  dispose?: () => void;
} | null;

type FitDimensions = {
  cols?: number;
  rows?: number;
};

export interface TerminalSurfaceHandle {
  getContainerElement: () => HTMLDivElement | null;
  registerFitAddon: (addon: FitAddonLike) => void;
  reportFit: (dimensions: FitDimensions) => void;
}

interface TerminalSurfaceProps {
  sessionId?: string | null;
  className?: string;
  fitAddon?: FitAddonLike;
}

const TerminalSurface = forwardRef<TerminalSurfaceHandle, TerminalSurfaceProps>(
  ({ sessionId = null, className, fitAddon = null }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sessionIdRef = useRef<string | null>(sessionId);
    const fitAddonRef = useRef<FitAddonLike>(null);
    const fitListenerCleanupRef = useRef<(() => void) | null>(null);
    const lastDimensionsRef = useRef<{ cols: number; rows: number } | null>(null);
    const { emitTerminalResize } = useSocket();

    useEffect(() => {
      sessionIdRef.current = sessionId ?? null;
      lastDimensionsRef.current = null;
    }, [sessionId]);

    const teardownFitListener = useCallback(() => {
      if (fitListenerCleanupRef.current) {
        try {
          fitListenerCleanupRef.current();
        } finally {
          fitListenerCleanupRef.current = null;
        }
      }
    }, []);

    const handleFitDimensions = useCallback(
      (dimensions: FitDimensions | undefined) => {
        if (!dimensions) {
          return;
        }

        const cols = Number(dimensions.cols);
        const rows = Number(dimensions.rows);

        if (!Number.isFinite(cols) || !Number.isFinite(rows)) {
          return;
        }

        if (cols <= 0 || rows <= 0) {
          return;
        }

        const previous = lastDimensionsRef.current;
        if (previous && previous.cols === cols && previous.rows === rows) {
          return;
        }

        lastDimensionsRef.current = { cols, rows };

        const activeSessionId = sessionIdRef.current;
        if (!activeSessionId) {
          return;
        }

        emitTerminalResize({
          sessionId: activeSessionId,
          cols,
          rows,
        });
      },
      [emitTerminalResize]
    );

    const registerFitAddon = useCallback(
      (addon: FitAddonLike) => {
        teardownFitListener();
        fitAddonRef.current = addon;

        if (!addon || typeof addon.onDidFit !== "function") {
          return;
        }

        const disposable = addon.onDidFit((size) => {
          handleFitDimensions(size);
        });

        fitListenerCleanupRef.current = () => {
          if (disposable && typeof (disposable as any).dispose === "function") {
            (disposable as { dispose: () => void }).dispose();
          }
        };
      },
      [handleFitDimensions, teardownFitListener]
    );

    useEffect(() => {
      if (fitAddon) {
        registerFitAddon(fitAddon);
      }
    }, [fitAddon, registerFitAddon]);

    useImperativeHandle(
      ref,
      () => ({
        getContainerElement: () => containerRef.current,
        registerFitAddon,
        reportFit: (dimensions: FitDimensions) => {
          handleFitDimensions(dimensions);
        },
      }),
      [handleFitDimensions, registerFitAddon]
    );

    useEffect(() => {
      return () => {
        teardownFitListener();
        if (fitAddonRef.current && typeof fitAddonRef.current?.dispose === "function") {
          try {
            fitAddonRef.current.dispose();
          } catch (error) {
            console.warn("Failed to dispose fit addon", error);
          }
        }
        fitAddonRef.current = null;
      };
    }, [teardownFitListener]);

    return (
      <div
        ref={containerRef}
        className={className}
        data-testid="terminal-surface"
        data-terminal-surface
      />
    );
  }
);

TerminalSurface.displayName = "TerminalSurface";

export default TerminalSurface;
