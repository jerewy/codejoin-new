/**
 * Clean Terminal Panel Component
 * Extracted from project-workspace.tsx to improve code organization
 */

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useSocket } from "@/lib/socket";
import { useDockerConnection } from "@/lib/docker-connection-manager";
import { useToast } from "@/hooks/use-toast";
import TerminalSurface, { type TerminalSurfaceHandle } from "./TerminalSurface";
import { DockerStatusIndicator } from "@/components/docker-status-indicator";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  Play,
  Square,
  X,
} from "lucide-react";

interface TerminalPanelProps {
  projectId: string;
  userId: string;
  className?: string;
}

interface TerminalSessionState {
  sessionId: string | null;
  isReady: boolean;
  isStarting: boolean;
  isStopping: boolean;
  activeLanguage: string | null;
}

interface TerminalOutput {
  chunk: string;
  timestamp: Date;
}

export default function TerminalPanel({ projectId, userId, className }: TerminalPanelProps) {
  const { socket, isConnected, startTerminalSession, stopTerminalSession, resumeTerminalSession } = useSocket();
  const { canAttemptConnection, reportConnectionFailure, reportConnectionSuccess } = useDockerConnection();
  const { toast } = useToast();

  const [sessionState, setSessionState] = useState<TerminalSessionState>({
    sessionId: null,
    isReady: false,
    isStarting: false,
    isStopping: false,
    activeLanguage: null,
  });

  const [outputs, setOutputs] = useState<TerminalOutput[]>([]);
  const terminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null);
  const sessionStateRef = useRef(sessionState);
  const rawOutputBufferRef = useRef<string>("");

  // Update ref when state changes
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  const appendOutput = useCallback((chunk: string) => {
    const output: TerminalOutput = {
      chunk,
      timestamp: new Date(),
    };
    setOutputs(prev => [...prev, output]);
    rawOutputBufferRef.current += chunk;

    // Write to terminal surface
    terminalSurfaceRef.current?.write(chunk);
  }, []);

  const appendStatusLine = useCallback((message: string) => {
    const formattedMessage = `\n${message}\n`;
    appendOutput(formattedMessage);
    console.log(`[Terminal] ${message}`);
  }, [appendOutput]);

  const clearTerminal = useCallback(() => {
    rawOutputBufferRef.current = "";
    setOutputs([]);
    terminalSurfaceRef.current?.write("\x1bc"); // Clear terminal ANSI escape sequence
  }, []);

  const initializeSession = useCallback(async (language?: string) => {
    if (!socket || !projectId || !userId || sessionStateRef.current.sessionId || sessionStateRef.current.isStarting) {
      return;
    }

    // Check Docker connection availability
    if (!canAttemptConnection()) {
      appendStatusLine("Docker connection unavailable. Please check Docker and try again.");
      toast({
        title: "Docker Unavailable",
        description: "Docker connection is not available. Please ensure Docker Desktop is running.",
        variant: "destructive",
      });
      return;
    }

    setSessionState(prev => ({ ...prev, isStarting: true }));
    appendStatusLine("Connecting to CodeJoin sandbox...");

    try {
      await startTerminalSession({ projectId, userId, language });
      reportConnectionSuccess();
    } catch (error) {
      console.error("Failed to start terminal session:", error);
      appendStatusLine(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSessionState(prev => ({ ...prev, isStarting: false }));
      reportConnectionFailure(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [socket, projectId, userId, canAttemptConnection, startTerminalSession, appendStatusLine, toast, reportConnectionSuccess, reportConnectionFailure]);

  const handleStopSession = useCallback(() => {
    const { sessionId } = sessionStateRef.current;
    if (!sessionId) return;

    setSessionState(prev => ({ ...prev, isStopping: true }));
    appendStatusLine("Stopping terminal session...");
    stopTerminalSession({ sessionId });
  }, [stopTerminalSession, appendStatusLine]);

  const handleTerminalReady = useCallback(({ sessionId }: { sessionId: string }) => {
    console.log("[Terminal] Session ready:", sessionId);
    setSessionState({
      sessionId,
      isReady: true,
      isStarting: false,
      isStopping: false,
      activeLanguage: null,
    });
    appendStatusLine("Connected to sandbox session.");
    appendStatusLine(`Session ID: ${sessionId.substring(0, 8)}...`);
  }, [appendStatusLine]);

  const handleTerminalData = useCallback(({ chunk }: { chunk: string }) => {
    appendOutput(chunk);
  }, [appendOutput]);

  const handleTerminalError = useCallback(({ message }: { message: string }) => {
    appendStatusLine(`Error: ${message}`);
    toast({
      title: "Terminal error",
      description: message,
      variant: "destructive",
    });

    // Reset session state on error
    setSessionState({
      sessionId: null,
      isReady: false,
      isStarting: false,
      isStopping: false,
      activeLanguage: null,
    });
  }, [appendStatusLine, toast]);

  const handleTerminalExit = useCallback(({ code, reason }: { code?: number | null; reason?: string }) => {
    const exitMessageParts = ["Terminal session ended"];
    if (typeof code === "number") {
      exitMessageParts.push(`(exit code ${code})`);
    }
    if (reason) {
      exitMessageParts.push(`- ${reason}`);
    }

    appendStatusLine(exitMessageParts.join(" "));
    setSessionState({
      sessionId: null,
      isReady: false,
      isStarting: false,
      isStopping: false,
      activeLanguage: null,
    });
  }, [appendStatusLine]);

  // Handle socket connection state
  useEffect(() => {
    if (!socket) return;

    if (!isConnected && sessionStateRef.current.sessionId) {
      appendStatusLine("Lost connection to sandbox session. Attempting to reconnect...");
      setSessionState(prev => ({ ...prev, isReady: false }));
    } else if (isConnected && !sessionStateRef.current.sessionId && !sessionStateRef.current.isStarting) {
      initializeSession();
    }
  }, [socket, isConnected, initializeSession, appendStatusLine]);

  // Focus terminal when clicked
  const handleTerminalClick = useCallback(() => {
    if (sessionState.isReady) {
      terminalSurfaceRef.current?.focus();
    }
  }, [sessionState.isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const { sessionId } = sessionStateRef.current;
      if (sessionId && socket) {
        stopTerminalSession({ sessionId });
      }
    };
  }, [socket, stopTerminalSession]);

  const terminalStatus = sessionState.isReady
    ? "Connected"
    : sessionState.isStarting
    ? "Starting..."
    : sessionState.isStopping
    ? "Stopping..."
    : isConnected
    ? "Stopped"
    : "Offline";

  const statusColor = sessionState.isReady
    ? "text-[#4ec9b0]"
    : sessionState.isStarting || sessionState.isStopping
    ? "text-yellow-300"
    : isConnected
    ? "text-zinc-400"
    : "text-[#f48771]";

  return (
    <div className={`h-full min-h-0 flex flex-col bg-[#1e1e1e] text-[#cccccc] font-mono text-sm ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d30] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#cccccc]" />
          <span className="text-sm text-[#cccccc]">Terminal</span>
          <span className={`text-xs ${statusColor}`}>{terminalStatus}</span>
          <DockerStatusIndicator compact={true} className="ml-2" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (sessionState.sessionId ? handleStopSession : initializeSession)()}
            className="h-6 w-6 p-0 text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            title={sessionState.sessionId ? "Stop terminal session" : "Start terminal session"}
            disabled={sessionState.sessionId ? sessionState.isStopping : sessionState.isStarting || !isConnected}
          >
            {sessionState.sessionId ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminal}
            className="h-6 w-6 p-0 text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            title="Clear terminal"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 flex flex-col min-h-0" onClick={handleTerminalClick}>
        <div className="flex-1 min-h-0 overflow-hidden p-3">
          <TerminalSurface
            ref={terminalSurfaceRef}
            className="h-full w-full"
            onReady={handleTerminalReady}
            onData={handleTerminalData}
            onError={handleTerminalError}
            onExit={handleTerminalExit}
          />
        </div>
      </div>
    </div>
  );
}