"use client";

import "xterm/css/xterm.css";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Terminal, type IDisposable } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { useSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

export interface TerminalSurfaceHandle {
  focus: () => void;
  write: (data: string) => void;
  sendData: (input: string, options?: { sessionId?: string }) => void;
  fit: () => void;
  dispose: () => void;
}

interface TerminalSurfaceProps {
  className?: string;
  onReady?: (payload: { sessionId: string }) => void;
  onData?: (payload: {
    sessionId: string;
    chunk: string;
  }) => string | void | null;
  onInput?: (payload: {
    sessionId: string;
    input: string;
  }) => string | void | null;
  onError?: (payload: { sessionId?: string; message: string }) => void;
  onExit?: (payload: {
    sessionId: string;
    code?: number | null;
    reason?: string;
  }) => void;
  onUserInput?: (data: string) => void;
}

const TerminalSurface = forwardRef<TerminalSurfaceHandle, TerminalSurfaceProps>(
  (
    { className, onReady, onData, onInput, onError, onExit, onUserInput },
    ref
  ) => {
    const { socket, sendTerminalInput, emitTerminalResize } = useSocket();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const activeSessionIdRef = useRef<string | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const inputListenerRef = useRef<IDisposable | null>(null);
    const onInputRef = useRef<TerminalSurfaceProps["onInput"] | null>(
      onInput ?? null
    );
    const sendTerminalInputRef = useRef(sendTerminalInput);
    const emitTerminalResizeRef = useRef(emitTerminalResize);
    const pendingFitFrameRef = useRef<number | null>(null);
    const lastMeasuredDimensionsRef = useRef<{
      width: number;
      height: number;
    } | null>(null);
    const lastKnownGeometryRef = useRef<{
      cols: number;
      rows: number;
    } | null>(null);

    const runFitAndEmit = useCallback(() => {
      pendingFitFrameRef.current = null;

      const container = containerRef.current;
      const fitAddon = fitAddonRef.current;
      const terminal = terminalRef.current;

      if (!container || !fitAddon || !terminal) {
        console.debug("Cannot fit terminal: missing container, fitAddon, or terminal");
        return;
      }

      // Check if container has dimensions
      const width = container.clientWidth || 0;
      const height = container.clientHeight || 0;

      if (width === 0 || height === 0) {
        console.debug("Cannot fit terminal: container has no dimensions", { width, height });
        return;
      }

      // Additional safety check for terminal element
      if (!terminal.element) {
        console.debug("Cannot fit terminal: terminal.element is not available");
        return;
      }

      try {
        fitAddon.fit();
        console.debug("Terminal fitted successfully", { cols: terminal.cols, rows: terminal.rows });
      } catch (error) {
        console.warn("Failed to fit terminal dimensions", error);
        // Try to set fallback dimensions
        try {
          terminal.resize(80, 24);
          console.debug("Applied fallback terminal dimensions (80x24)");
        } catch (fallbackError) {
          console.error("Failed to apply fallback terminal dimensions", fallbackError);
        }
        return;
      }

      lastMeasuredDimensionsRef.current = { width, height };

      const cols = terminal.cols || 80;
      const rows = terminal.rows || 24;

      const lastGeometry = lastKnownGeometryRef.current;
      if (
        lastGeometry &&
        lastGeometry.cols === cols &&
        lastGeometry.rows === rows
      ) {
        return;
      }

      lastKnownGeometryRef.current = { cols, rows };

      const sessionId = activeSessionIdRef.current;
      const emit = emitTerminalResizeRef.current;

      if (!sessionId || !emit) {
        return;
      }

      emit({ sessionId, cols, rows });
    }, []);

    // In TerminalSurface.tsx, modify the scheduleFitAndEmit function:
    const scheduleFitAndEmit = useCallback(() => {
      if (pendingFitFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFitFrameRef.current);
      }

      // Add debouncing for smoother resizing
      pendingFitFrameRef.current = window.requestAnimationFrame(() => {
        setTimeout(() => {
          runFitAndEmit();
        }, 100); // Small delay to let ResizablePanel finish its animation
      });
    }, [runFitAndEmit]);

    useEffect(() => {
      onInputRef.current = onInput ?? null;
    }, [onInput]);

    useEffect(() => {
      sendTerminalInputRef.current = sendTerminalInput;
    }, [sendTerminalInput]);

    useEffect(() => {
      emitTerminalResizeRef.current = emitTerminalResize;
    }, [emitTerminalResize]);

    useEffect(() => {
      if (!containerRef.current || !fitAddonRef.current) return;

      const resizeObserver = new ResizeObserver(() => {
        fitAddonRef.current!.fit();
      });

      // Observe terminal container
      resizeObserver.observe(containerRef.current);

      // Also observe terminal container's parent to catch panel resizing
      const parentElement = containerRef.current.parentElement;
      if (parentElement) {
        resizeObserver.observe(parentElement);
      }

      // Cleanup on unmount
      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    useEffect(() => {
      const terminal = new Terminal({
        convertEol: true,
        allowTransparency: true,
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: 13,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        theme: {
          background: "#1e1e1e",
          foreground: "#cccccc",
          cursor: "#4ec9b0",
          selectionBackground: "rgba(78, 201, 176, 0.3)",
        },
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const clipboardAddon = new ClipboardAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(clipboardAddon);

      const resizeObserver = new ResizeObserver((entries) => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        let shouldSchedule = false;
        for (const entry of entries) {
          if (
            entry.target !== container &&
            entry.target !== container.parentElement
          ) {
            continue;
          }

          if (entry.target === container) {
            const boxSize = Array.isArray(entry.contentBoxSize)
              ? entry.contentBoxSize[0]
              : entry.contentBoxSize;
            const width =
              typeof boxSize?.inlineSize === "number"
                ? boxSize.inlineSize
                : entry.contentRect.width;
            const height =
              typeof boxSize?.blockSize === "number"
                ? boxSize.blockSize
                : entry.contentRect.height;

            if (typeof width === "number" && typeof height === "number") {
              const last = lastMeasuredDimensionsRef.current;
              if (last && last.width === width && last.height === height) {
                continue;
              }
              lastMeasuredDimensionsRef.current = { width, height };
            }
          }

          shouldSchedule = true;
        }

        if (shouldSchedule) {
          scheduleFitAndEmit();
        }
      });
      const handleWindowResize = () => {
        scheduleFitAndEmit();
      };
      if (typeof window !== "undefined") {
        window.addEventListener("resize", handleWindowResize);
      }

      let dataDisposable: IDisposable | undefined;
      let binaryDisposable: IDisposable | undefined;

      const handleInput = (input: string) => {
        const terminalInstance = terminalRef.current;

        if (terminalInstance && input) {
          let pendingEcho = "";
          let inEscapeSequence = false;

          for (let index = 0; index < input.length; index += 1) {
            const char = input[index];
            const code = char.charCodeAt(0);

            if (inEscapeSequence) {
              if (code >= 64 && code <= 126) {
                inEscapeSequence = false;
              }
              continue;
            }

            if (char === "\x1b") {
              if (pendingEcho.length > 0) {
                terminalInstance.write(pendingEcho);
                pendingEcho = "";
              }
              inEscapeSequence = true;
              continue;
            }

            if (char === "\r" || char === "\n") {
              if (pendingEcho.length > 0) {
                terminalInstance.write(pendingEcho);
                pendingEcho = "";
              }
              terminalInstance.write("\r\n");
              continue;
            }

            if (char === "\u007f" || char === "\b" || code === 127) {
              if (pendingEcho.length > 0) {
                terminalInstance.write(pendingEcho);
                pendingEcho = "";
              }
              terminalInstance.write("\b \b");
              continue;
            }

            if (code < 32 && char !== "\t") {
              continue;
            }

            pendingEcho += char;
          }

          if (pendingEcho.length > 0) {
            terminalInstance.write(pendingEcho);
          }
        }

        const sessionId = activeSessionIdRef.current;
        if (!sessionId) {
          return;
        }

        const processed = onInputRef.current?.({ sessionId, input });

        if (processed === null) {
          return;
        }

        const outbound = typeof processed === "string" ? processed : input;

        if (!outbound) {
          return;
        }

        sendTerminalInputRef.current?.({ sessionId, input: outbound });
      };

      if (containerRef.current) {
        try {
          terminal.open(containerRef.current);
          dataDisposable = terminal.onData(handleInput);
          binaryDisposable = terminal.onBinary?.(handleInput);
          terminal.focus();

          // Add delay to ensure container is properly mounted and has dimensions
          setTimeout(() => {
            queueMicrotask(() => {
              try {
                scheduleFitAndEmit();
              } catch (error) {
                console.warn("Failed to fit terminal on mount", error);
              }
            });
          }, 100);

          resizeObserver.observe(containerRef.current);
          const parentElement = containerRef.current.parentElement;
          if (parentElement) {
            resizeObserver.observe(parentElement);
          }
        } catch (error) {
          console.error("Failed to initialize terminal", error);
        }
      }

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      resizeObserverRef.current = resizeObserver;

      return () => {
        dataDisposable?.dispose();
        binaryDisposable?.dispose();
        resizeObserver.disconnect();
        if (typeof window !== "undefined") {
          window.removeEventListener("resize", handleWindowResize);
        }
        if (pendingFitFrameRef.current !== null) {
          if (typeof window !== "undefined" && window.cancelAnimationFrame) {
            window.cancelAnimationFrame(pendingFitFrameRef.current);
          }
          pendingFitFrameRef.current = null;
        }
        lastMeasuredDimensionsRef.current = null;
        lastKnownGeometryRef.current = null;
        clipboardAddon.dispose?.();
        webLinksAddon.dispose?.();
        inputListenerRef.current?.dispose();
        inputListenerRef.current = null;
        terminal.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
        resizeObserverRef.current = null;
      };
    }, [scheduleFitAndEmit]);

    useEffect(() => {
      if (!terminalRef.current) {
        return;
      }

      inputListenerRef.current?.dispose();
      inputListenerRef.current = null;

      if (!onUserInput) {
        return;
      }

      const disposable = terminalRef.current.onData((data) => {
        onUserInput(data);
      });

      inputListenerRef.current = disposable;

      return () => {
        disposable.dispose();
        if (inputListenerRef.current === disposable) {
          inputListenerRef.current = null;
        }
      };
    }, [onUserInput]);

    useEffect(() => {
      if (!socket) {
        return;
      }

      const handleReady = (payload: { sessionId: string }) => {
        activeSessionIdRef.current = payload.sessionId;
        lastKnownGeometryRef.current = null;
        queueMicrotask(() => {
          scheduleFitAndEmit();
        });
        onReady?.(payload);
      };

      const handleData = (payload: { sessionId: string; chunk: string }) => {
        if (
          activeSessionIdRef.current &&
          payload.sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        const processed = onData ? onData(payload) : payload.chunk;
        if (typeof processed === "string" && processed.length > 0) {
          terminalRef.current?.write(processed);
        }
      };

      const handleError = (payload: {
        sessionId?: string;
        message: string;
      }) => {
        if (
          payload.sessionId &&
          activeSessionIdRef.current &&
          payload.sessionId !== activeSessionIdRef.current
        ) {
          return;
        }
        onError?.(payload);
      };

      const handleExit = (payload: {
        sessionId: string;
        code?: number | null;
        reason?: string;
      }) => {
        if (
          activeSessionIdRef.current &&
          payload.sessionId !== activeSessionIdRef.current
        ) {
          return;
        }
        activeSessionIdRef.current = null;
        lastKnownGeometryRef.current = null;
        onExit?.(payload);
      };

      socket.on("terminal:ready", handleReady);
      socket.on("terminal:data", handleData);
      socket.on("terminal:error", handleError);
      socket.on("terminal:exit", handleExit);

      return () => {
        socket.off("terminal:ready", handleReady);
        socket.off("terminal:data", handleData);
        socket.off("terminal:error", handleError);
        socket.off("terminal:exit", handleExit);
      };
    }, [socket, onReady, onData, onError, onExit, scheduleFitAndEmit]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          terminalRef.current?.focus();
        },
        write: (data: string) => {
          if (!data) return;
          terminalRef.current?.write(data);
        },
        sendData: (
          input: string,
          options?: {
            sessionId?: string;
          }
        ) => {
          const sessionId = options?.sessionId ?? activeSessionIdRef.current;
          if (!sessionId || !input) return;
          sendTerminalInput({ sessionId, input });
        },
        fit: () => {
          runFitAndEmit();
        },
        dispose: () => {
          resizeObserverRef.current?.disconnect();
          inputListenerRef.current?.dispose();
          inputListenerRef.current = null;
          terminalRef.current?.dispose();
          terminalRef.current = null;
          fitAddonRef.current = null;
        },
      }),
      [runFitAndEmit, sendTerminalInput]
    );

    const handleContainerInteraction = useCallback(() => {
      terminalRef.current?.focus();
    }, []);

    return (
      <div
        ref={containerRef}
        className={cn("h-full w-full", className)}
        role="presentation"
        tabIndex={0}
        onClick={handleContainerInteraction}
        onFocus={handleContainerInteraction}
      />
    );
  }
);

TerminalSurface.displayName = "TerminalSurface";

export default TerminalSurface;
