"use client";

import "xterm/css/xterm.css";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
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
    const { socket, sendTerminalInput } = useSocket();

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

    useEffect(() => {
      onInputRef.current = onInput ?? null;
    }, [onInput]);

    useEffect(() => {
      sendTerminalInputRef.current = sendTerminalInput;
    }, [sendTerminalInput]);

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

      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch (error) {
          console.warn("Failed to fit terminal on resize", error);
        }
      });

      let dataDisposable: IDisposable | undefined;
      let binaryDisposable: IDisposable | undefined;

      const handleInput = (input: string) => {
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
        terminal.open(containerRef.current);
        dataDisposable = terminal.onData(handleInput);
        binaryDisposable = terminal.onBinary?.(handleInput);
        terminal.focus();
        queueMicrotask(() => {
          try {
            fitAddon.fit();
          } catch (error) {
            console.warn("Failed to fit terminal on mount", error);
          }
        });
        resizeObserver.observe(containerRef.current);
      }

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      resizeObserverRef.current = resizeObserver;

      return () => {
        dataDisposable?.dispose();
        binaryDisposable?.dispose();
        resizeObserver.disconnect();
        clipboardAddon.dispose?.();
        webLinksAddon.dispose?.();
        inputListenerRef.current?.dispose();
        inputListenerRef.current = null;
        terminal.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
        resizeObserverRef.current = null;
      };
    }, []);

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
        queueMicrotask(() => {
          try {
            fitAddonRef.current?.fit();
          } catch (error) {
            console.warn("Failed to fit terminal after ready", error);
          }
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
    }, [socket, onReady, onData, onError, onExit]);

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
        dispose: () => {
          resizeObserverRef.current?.disconnect();
          inputListenerRef.current?.dispose();
          inputListenerRef.current = null;
          terminalRef.current?.dispose();
          terminalRef.current = null;
          fitAddonRef.current = null;
        },
      }),
      [sendTerminalInput]
    );

    return (
      <div
        ref={containerRef}
        className={cn("h-full w-full", className)}
        role="presentation"
      />
    );
  }
);

TerminalSurface.displayName = "TerminalSurface";

export default TerminalSurface;
