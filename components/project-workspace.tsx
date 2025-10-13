"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSocket, useFileCollaboration } from "@/lib/socket";
import { useDockerConnection } from "@/lib/docker-connection-manager";
import { useAIConversations } from "@/hooks/use-ai-conversations";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import TerminalSurface, {
  type TerminalSurfaceHandle,
} from "@/components/terminal/TerminalSurface";
import { DockerStatusIndicator } from "@/components/docker-status-indicator";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  MessageSquare,
  Play,
  Save,
  Share2,
  Settings,
  FileText,
  X,
  Maximize2,
  Minimize2,
  Brain,
  Volume2,
  VolumeX,
  Download,
  Search,
  Code,
  Zap,
  RefreshCw,
  Send,
  PhoneOff,
  ArrowLeft,
  ArrowRight,
  Lock,
  Eye,
  Terminal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Trash2,
  Copy,
  History,
  PanelLeftClose,
  PanelLeft,
  Square,
  Plus,
  Timer,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CodeEditor from "@/components/code-editor";
import LivePreview from "@/components/live-preview";
import VideoCall from "@/components/video-call";
import ChatPanel from "@/components/chat-panel";
import ExecutionHistory from "@/components/execution-history";
import FileExplorer from "@/components/file-explorer";
import ConsoleOutput from "@/components/console-output";
import BackendStatus from "@/components/backend-status";
import AIModelSelector from "@/components/ai-model-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { type ProjectNode } from "@/app/project/[id]/page";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type {
  Collaborator,
  ProjectChatMessageWithAuthor,
  ProjectNodeFromDB,
} from "@/lib/types";
import { Input } from "@/components/ui/input";

// Define execution result interface
interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number | null;
  executionTime: number;
  success?: boolean;
}

// Define problem interface
interface Problem {
  id: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  source: string;
}

interface ProjectWorkspaceProps {
  initialNodes: ProjectNodeFromDB[];
  projectId: string;
  conversationId: string | null;
  initialChatMessages: ProjectChatMessageWithAuthor[];
  teamMembers: Collaborator[];
}

type AutosaveState = "idle" | "saving" | "saved" | "error";

const LOCAL_STORAGE_PREFIX = "codejoin:project";

const createClientId = () => {
  if (
    typeof globalThis !== "undefined" &&
    "crypto" in globalThis &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Math.random().toString(36).slice(2, 11)}`;
};

const mergeNodesWithLocalState = (
  initialNodes: ProjectNodeFromDB[],
  persistedNodes: ProjectNodeFromDB[]
) => {
  if (!persistedNodes.length) {
    return initialNodes;
  }

  const persistedById = new Map<string, ProjectNodeFromDB>();
  persistedNodes.forEach((node) => {
    persistedById.set(node.id, node);
  });

  const merged: ProjectNodeFromDB[] = initialNodes.map((node) => {
    const persisted = persistedById.get(node.id);
    return persisted ? { ...node, ...persisted } : node;
  });

  persistedNodes.forEach((node) => {
    if (!merged.some((existing) => existing.id === node.id)) {
      merged.push(node);
    }
  });

  return merged;
};

// Language extension mapping
const getFileExtension = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : "";
};

const stripCommentsAndStrings = (code: string): string => {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/#.*$/gm, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " ")
    .replace(/`(?:\\.|[^`\\])*`/g, " ");
};

const shouldUseInteractiveExecution = (
  fileName: string,
  codeContent: string
): boolean => {
  const extension = getFileExtension(fileName).toLowerCase();
  const normalizedSource = stripCommentsAndStrings(codeContent);

  if (!normalizedSource.trim()) {
    return false;
  }

  const interactivePatterns: RegExp[] = [
    /\bscanf\s*\(/,
    /\bgets\s*\(/,
    /\bfgets\s*\(/,
    /\binput\s*\(/,
    /\bnew\s+Scanner\b/,
    /\bnext(?:Int|Line|Double|Float)\s*\(/,
    /\bcin\s*>>/,
    /\breadline\s*\(/,
  ];

  const interactiveExtensions = new Set([
    ".c",
    ".cpp",
    ".cc",
    ".cxx",
    ".py",
    ".java",
    ".js",
    ".ts",
    ".tsx",
    ".mjs",
    ".jsx",
    ".rb",
    ".go",
    ".sh",
  ]);

  if (!interactiveExtensions.has(extension)) {
    return false;
  }

  return interactivePatterns.some((pattern) => pattern.test(normalizedSource));
};

const SAFE_TERMINAL_LANGUAGE_FALLBACKS: string[] = [
  "javascript",
  "python",
  "java",
  "go",
  "rust",
  "c",
  "cpp",
  "csharp",
  "typescript",
];

const getTrackingLanguageKey = (language?: string | null): string => {
  if (!language) {
    return "default";
  }

  const normalized = language.toLowerCase();
  return normalized === "javascript" ? "default" : normalized;
};

// VS Code-style Terminal component
function TerminalPanel({
  projectId,
  userId,
  executionOutputs = [],
  onClearExecutions = () => {},
  inputBuffer,
  onInputUpdate,
  onExecuteInTerminal,
  terminalSurfaceRef: externalTerminalSurfaceRef,
}: {
  projectId: string;
  userId: string;
  executionOutputs?: ExecutionResult[];
  onClearExecutions?: () => void;
  inputBuffer: string;
  onInputUpdate: (value: string) => void;
  onExecuteInTerminal?: React.MutableRefObject<
    ((file: ProjectNodeFromDB) => Promise<boolean>) | null
  >;
  terminalSurfaceRef?: React.MutableRefObject<TerminalSurfaceHandle | null>;
}) {
  const {
    socket,
    isConnected,
    startTerminalSession,
    stopTerminalSession,
    resumeTerminalSession,
  } = useSocket();
  const {
    status: dockerStatus,
    canAttemptConnection,
    reportConnectionFailure,
    reportConnectionSuccess
  } = useDockerConnection();
  const { toast } = useToast();

  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const localTerminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null);
  const terminalSurfaceRef =
    externalTerminalSurfaceRef ?? localTerminalSurfaceRef;
  const sessionIdRef = useRef<string | null>(null);
  const isTerminalReadyRef = useRef(false);
  const activeLanguageRef = useRef<string | null>(null);
  const pendingLanguageRef = useRef<string | null>(null);
  const attemptedInitialStart = useRef(false);
  const hasShownConnectionMessage = useRef(false);
  const pendingResumeRef = useRef(false);
  const rawOutputBufferRef = useRef("");
  const displayEndsWithNewlineRef = useRef(true);
  const commandBufferRef = useRef("");
  const commandHistoryRef = useRef<string[]>([]);
  type CodeExecutionModule = typeof import("@/lib/api/codeExecution");
  const codeExecutionModuleRef = useRef<CodeExecutionModule | null>(null);
  const supportedLanguageKeysRef = useRef<Set<string> | null>(null);

  const INPUT_READY_MARKER = "__CODEJOIN_INPUT_READY__";

  const isWindowsEnvironment =
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("windows");

  type TerminalMarkerWatcher = {
    id: number;
    successMarker: string;
    failureMarker?: string;
    startIndex: number;
    resolve: (value: boolean) => void;
    reject: (error: Error) => void;
    resolved?: boolean;
  };

  const markerWatchersRef = useRef<TerminalMarkerWatcher[]>([]);
  const markerWatcherIdRef = useRef(0);
  const hiddenMarkersRef = useRef<Set<string>>(new Set());

  const totalExecutionCountRef = useRef(0);

  const processMarkerWatchers = useCallback(() => {
    if (!markerWatchersRef.current.length) return;

    const buffer = rawOutputBufferRef.current;
    markerWatchersRef.current.forEach((watcher) => {
      if (watcher.resolved) return;

      const slice = buffer.slice(watcher.startIndex);
      if (slice.includes(watcher.successMarker)) {
        watcher.resolved = true;
        watcher.resolve(true);
      } else if (
        watcher.failureMarker &&
        slice.includes(watcher.failureMarker)
      ) {
        watcher.resolved = true;
        watcher.resolve(false);
      }
    });

    markerWatchersRef.current = markerWatchersRef.current.filter(
      (watcher) => !watcher.resolved
    );
  }, []);

  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const sanitizeChunk = useCallback((chunk: string) => {
    if (hiddenMarkersRef.current.size === 0) {
      return chunk;
    }

    let sanitized = chunk;
    hiddenMarkersRef.current.forEach((marker) => {
      const pattern = new RegExp(`^.*${escapeRegExp(marker)}.*$`, "gm");
      sanitized = sanitized.replace(pattern, "");
    });
    return sanitized;
  }, []);

  const updateDisplayTail = useCallback((value: string) => {
    if (!value) {
      return;
    }

    if (value.includes("\x1bc")) {
      displayEndsWithNewlineRef.current = true;
      return;
    }

    displayEndsWithNewlineRef.current = /\r?\n$/.test(value);
  }, []);

  const writeToTerminal = useCallback(
    (value: string) => {
      if (!value) {
        return;
      }

      updateDisplayTail(value);
      const normalized = value.replace(/\r?\n/g, "\r\n");
      terminalSurfaceRef.current?.write(normalized);
    },
    [updateDisplayTail]
  );

  const appendRawOutput = useCallback(
    (chunk: string) => {
      rawOutputBufferRef.current += chunk;
      const sanitizedChunk = sanitizeChunk(chunk);

      processMarkerWatchers();

      if (sanitizedChunk.length === 0) {
        return "";
      }

      updateDisplayTail(sanitizedChunk);
      return sanitizedChunk.replace(/\r?\n/g, "\r\n");
    },
    [processMarkerWatchers, sanitizeChunk, updateDisplayTail]
  );

  const appendStatusLine = useCallback(
    (message: string) => {
      const needsPrefixNewline = !displayEndsWithNewlineRef.current;
      const suffix = message.endsWith("\n") ? "" : "\n";
      const payload = `${needsPrefixNewline ? "\n" : ""}${message}${suffix}`;
      writeToTerminal(payload);
      processMarkerWatchers();
    },
    [processMarkerWatchers, writeToTerminal]
  );

  const clearTerminalOutput = useCallback(() => {
    const clearedLength = rawOutputBufferRef.current.length;
    rawOutputBufferRef.current = "";
    markerWatchersRef.current = markerWatchersRef.current.map((watcher) => ({
      ...watcher,
      startIndex: Math.max(0, watcher.startIndex - clearedLength),
    }));
    writeToTerminal("\x1bc");
    displayEndsWithNewlineRef.current = true;
  }, [writeToTerminal]);

  const waitForTerminalMarker = useCallback(
    (
      successMarker: string,
      failureMarker?: string,
      options: { timeoutMs?: number; startIndex?: number } = {}
    ) => {
      const { timeoutMs = 4000, startIndex } = options;
      hiddenMarkersRef.current.add(successMarker);
      if (failureMarker) {
        hiddenMarkersRef.current.add(failureMarker);
      }

      return new Promise<boolean>((resolve, reject) => {
        const watcherId = markerWatcherIdRef.current++;
        const resolvedStartIndex =
          typeof startIndex === "number"
            ? Math.max(
                0,
                Math.min(startIndex, rawOutputBufferRef.current.length)
              )
            : rawOutputBufferRef.current.length;
        let timeoutId: number | null = null;

        const cleanup = () => {
          hiddenMarkersRef.current.delete(successMarker);
          if (failureMarker) {
            hiddenMarkersRef.current.delete(failureMarker);
          }
          markerWatchersRef.current = markerWatchersRef.current.filter(
            (watcher) => watcher.id !== watcherId
          );
        };

        const resolveAndCleanup = (value: boolean) => {
          if (typeof timeoutId === "number") {
            window.clearTimeout(timeoutId);
          }
          cleanup();
          resolve(value);
        };

        const rejectAndCleanup = (error: Error) => {
          if (typeof timeoutId === "number") {
            window.clearTimeout(timeoutId);
          }
          cleanup();
          reject(error);
        };

        const existingSlice =
          rawOutputBufferRef.current.slice(resolvedStartIndex);
        if (existingSlice.includes(successMarker)) {
          resolveAndCleanup(true);
          return;
        }
        if (failureMarker && existingSlice.includes(failureMarker)) {
          resolveAndCleanup(false);
          return;
        }

        const watcher: TerminalMarkerWatcher = {
          id: watcherId,
          successMarker,
          failureMarker,
          startIndex: resolvedStartIndex,
          resolve: resolveAndCleanup,
          reject: rejectAndCleanup,
        };

        markerWatchersRef.current.push(watcher);

        timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error("Marker wait timed out"));
        }, timeoutMs);
      });
    },
    []
  );

  type CommandAvailability = "available" | "missing" | "unknown";

  const sendTerminalData = useCallback(
    (payload: string, options?: { sessionId?: string }) => {
      if (!isConnected) {
        return;
      }

      const targetSessionId =
        options?.sessionId ?? sessionIdRef.current ?? undefined;
      if (!targetSessionId) {
        return;
      }

      terminalSurfaceRef.current?.sendData(payload, {
        sessionId: targetSessionId,
      });
    },
    [isConnected, terminalSurfaceRef]
  );

  const verifyCommandAvailability = useCallback(
    async (
      sessionId: string,
      commandName: string
    ): Promise<CommandAvailability> => {
      const upperName = commandName.toUpperCase();
      const successMarker = `__CODEJOIN_${upperName}_OK__`;
      const failureMarker = `__CODEJOIN_${upperName}_MISSING__`;

      const markerStartIndex = rawOutputBufferRef.current.length;

      sendTerminalData(
        `if command -v ${commandName} >/dev/null 2>&1; then echo '${successMarker}'; else echo '${failureMarker}'; fi\r`,
        { sessionId }
      );

      try {
        const result = await waitForTerminalMarker(
          successMarker,
          failureMarker,
          { startIndex: markerStartIndex }
        );
        return result ? "available" : "missing";
      } catch (error) {
        appendStatusLine(
          `[warn] Timed out while checking for ${commandName}. We'll try to run the program anyway.`
        );
        return "unknown";
      }
    },
    [appendStatusLine, sendTerminalData, waitForTerminalMarker]
  );

  type LanguageSupportResult = {
    status: CommandAvailability;
    command?: string;
    reason?: string;
  };

  const ensureLanguageSupport = useCallback(
    async (
      sessionId: string,
      language: string
    ): Promise<LanguageSupportResult> => {
      switch (language) {
        case "c": {
          const gccStatus = await verifyCommandAvailability(sessionId, "gcc");
          if (gccStatus === "missing") {
            const reason =
              "The interactive sandbox does not have GCC installed.";
            appendStatusLine(
              "C compiler not available in this sandbox. Falling back to standard execution."
            );
            return { status: gccStatus, command: "gcc", reason };
          }
          if (gccStatus === "unknown") {
            const reason =
              "Could not confirm GCC availability in the interactive sandbox.";
            appendStatusLine(
              "[warn] Could not confirm GCC availability in the interactive sandbox."
            );
            return { status: gccStatus, command: "gcc", reason };
          }
          return { status: gccStatus, command: "gcc" };
        }
        case "cpp": {
          const gppStatus = await verifyCommandAvailability(sessionId, "g++");
          if (gppStatus === "missing") {
            const reason =
              "The interactive sandbox does not have G++ installed.";
            appendStatusLine(
              "C++ compiler not available in this sandbox. Falling back to standard execution."
            );
            return { status: gppStatus, command: "g++", reason };
          }
          if (gppStatus === "unknown") {
            const reason =
              "Could not confirm G++ availability in the interactive sandbox.";
            appendStatusLine(
              "[warn] Could not confirm G++ availability in the interactive sandbox."
            );
            return { status: gppStatus, command: "g++", reason };
          }
          return { status: gppStatus, command: "g++" };
        }
        case "java": {
          const javacStatus = await verifyCommandAvailability(
            sessionId,
            "javac"
          );
          if (javacStatus === "missing") {
            const reason =
              "The interactive sandbox does not have the Java compiler installed.";
            appendStatusLine(
              "Java compiler not available in this sandbox. Falling back to standard execution."
            );
            return { status: "missing", command: "javac", reason };
          }
          if (javacStatus === "unknown") {
            const reason =
              "Could not confirm the Java compiler in the interactive sandbox.";
            appendStatusLine(
              "[warn] Could not confirm the Java compiler in the interactive sandbox."
            );
            return { status: "unknown", command: "javac", reason };
          }

          const javaStatus =
            javacStatus === "available"
              ? await verifyCommandAvailability(sessionId, "java")
              : javacStatus;

          if (javaStatus === "missing") {
            const reason =
              "The interactive sandbox does not have the Java runtime installed.";
            appendStatusLine(
              "Java runtime not available in this sandbox. Falling back to standard execution."
            );
            return { status: javaStatus, command: "java", reason };
          }
          if (javaStatus === "unknown") {
            const reason =
              "Could not confirm the Java runtime in the interactive sandbox.";
            appendStatusLine(
              "[warn] Could not confirm the Java runtime in the interactive sandbox."
            );
            return { status: javaStatus, command: "java", reason };
          }

          return { status: javaStatus, command: "javac" };
        }
        default:
          return { status: "available" };
      }
    },
    [appendStatusLine, verifyCommandAvailability]
  );

  const initializeSession = useCallback(
    (language?: string) => {
      if (
        !socket ||
        !projectId ||
        !userId ||
        sessionIdRef.current ||
        isStarting
      ) {
        return;
      }

      // Check Docker connection availability before attempting to start session
      if (!canAttemptConnection()) {
        if (dockerStatus.isRateLimited) {
          appendStatusLine(`Docker connection rate limited. Please wait before retrying.`);
          toast({
            title: "Docker Connection Rate Limited",
            description: dockerStatus.errorMessage || "Too many failed attempts. Please wait before retrying.",
            variant: "destructive",
          });
        } else if (dockerStatus.consecutiveFailures >= 3) {
          appendStatusLine(`Docker connection failed too many times. Please check Docker and try again later.`);
          toast({
            title: "Docker Unavailable",
            description: "Docker connection has failed multiple times. Please ensure Docker Desktop is running and retry.",
            variant: "destructive",
          });
        } else {
          appendStatusLine(`Docker connection unavailable: ${dockerStatus.errorMessage || 'Unknown error'}`);
        }
        return;
      }

      setIsStarting(true);
      setIsStopping(false);
      if (!hasShownConnectionMessage.current) {
        appendStatusLine("Connecting to CodeJoin sandbox...");
        hasShownConnectionMessage.current = true;
      }
      pendingLanguageRef.current = getTrackingLanguageKey(language);
      attemptedInitialStart.current = true;
      pendingResumeRef.current = false;
      startTerminalSession({ projectId, userId, language });
    },
    [
      appendStatusLine,
      isStarting,
      projectId,
      socket,
      startTerminalSession,
      userId,
      canAttemptConnection,
      dockerStatus,
      toast,
    ]
  );

  useEffect(() => {
    const handleFocusRequest = () => {
      if (!isTerminalReady) return;
      terminalSurfaceRef.current?.focus();
    };

    window.addEventListener("terminalFocusInput", handleFocusRequest);
    return () => {
      window.removeEventListener("terminalFocusInput", handleFocusRequest);
    };
  }, [isTerminalReady]);

  // Manage terminal session lifecycle across socket reconnects
  useEffect(() => {
    if (!socket) {
      return;
    }

    if (!isConnected) {
      if (sessionIdRef.current) {
        if (!pendingResumeRef.current) {
          appendStatusLine(
            "Lost connection to sandbox session. Attempting to reconnect..."
          );
        }
        pendingResumeRef.current = true;
        setIsTerminalReady(false);
        isTerminalReadyRef.current = false;
        setIsStarting(false);
        setIsStopping(false);
      } else {
        attemptedInitialStart.current = false;
      }
      return;
    }

    hasShownConnectionMessage.current = true;

    if (
      pendingResumeRef.current &&
      sessionIdRef.current &&
      projectId &&
      userId
    ) {
      setIsStarting(true);
      setIsStopping(false);
      appendStatusLine("Reconnecting to sandbox session...");
      resumeTerminalSession({
        sessionId: sessionIdRef.current,
        projectId,
        userId,
      });
      pendingResumeRef.current = false;
      return;
    }

    if (!sessionIdRef.current && !attemptedInitialStart.current) {
      initializeSession();
    }
  }, [
    appendStatusLine,
    initializeSession,
    isConnected,
    projectId,
    resumeTerminalSession,
    socket,
    userId,
  ]);

  // Focus input when terminal body is clicked
  const handleTerminalClick = () => {
    if (!isTerminalReady) return;
    terminalSurfaceRef.current?.focus();
  };

  const handleStopSession = useCallback(() => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId) return;

    setIsTerminalReady(false);
    isTerminalReadyRef.current = false;
    setIsStopping(true);
    appendStatusLine("Stopping terminal session...");
    stopTerminalSession({ sessionId: activeSessionId });
    activeLanguageRef.current = null;
    pendingLanguageRef.current = null;
    commandBufferRef.current = "";
    commandHistoryRef.current = [];
    pendingResumeRef.current = false;
  }, [appendStatusLine, stopTerminalSession]);

  const handleTerminalReady = useCallback(
    ({ sessionId: readySessionId }: { sessionId: string }) => {
      sessionIdRef.current = readySessionId;
      setSessionId(readySessionId);
      setIsTerminalReady(true);
      isTerminalReadyRef.current = true;
      activeLanguageRef.current = pendingLanguageRef.current;
      pendingLanguageRef.current = null;
      attemptedInitialStart.current = true;
      pendingResumeRef.current = false;
      setIsStarting(false);
      setIsStopping(false);

      // Report successful Docker connection
      reportConnectionSuccess();

      if (hasShownConnectionMessage.current) {
        appendStatusLine("Connected to sandbox session.");
      }
    },
    [appendStatusLine, reportConnectionSuccess]
  );

  const handleTerminalData = useCallback(
    ({
      sessionId: incomingSessionId,
      chunk,
    }: {
      sessionId: string;
      chunk: string;
    }) => {
      if (!sessionIdRef.current || incomingSessionId !== sessionIdRef.current) {
        return "";
      }

      return appendRawOutput(chunk);
    },
    [appendRawOutput]
  );

  const resetSessionState = useCallback((reason?: string) => {
    markerWatchersRef.current.forEach((watcher) =>
      watcher.reject(new Error(reason || "Terminal session ended"))
    );
    markerWatchersRef.current = [];
    hiddenMarkersRef.current.clear();
    sessionIdRef.current = null;
    setSessionId(null);
    setIsTerminalReady(false);
    isTerminalReadyRef.current = false;
    setIsStarting(false);
    setIsStopping(false);
    activeLanguageRef.current = null;
    pendingLanguageRef.current = null;
    commandBufferRef.current = "";
    commandHistoryRef.current = [];
    attemptedInitialStart.current = false;
    pendingResumeRef.current = false;
  }, []);

  const handleTerminalError = useCallback(
    ({
      sessionId: errorSessionId,
      message,
    }: {
      sessionId?: string;
      message: string;
    }) => {
      if (
        errorSessionId &&
        sessionIdRef.current &&
        errorSessionId !== sessionIdRef.current
      ) {
        return;
      }

      // Check if this is a Docker-related error
      const isDockerError = message.toLowerCase().includes('docker') ||
                           message.toLowerCase().includes('container') ||
                           message.toLowerCase().includes('unavailable');

      if (isDockerError) {
        reportConnectionFailure(message);
      }

      appendStatusLine(`Error: ${message}`);
      toast({
        title: "Terminal error",
        description: message,
        variant: "destructive",
      });
      resetSessionState(message);
    },
    [appendStatusLine, resetSessionState, toast, reportConnectionFailure]
  );

  const handleTerminalExit = useCallback(
    ({
      sessionId: exitSessionId,
      code,
      reason,
    }: {
      sessionId: string;
      code?: number | null;
      reason?: string;
    }) => {
      if (!sessionIdRef.current || exitSessionId !== sessionIdRef.current) {
        return;
      }

      const exitMessageParts = ["Terminal session ended"];
      if (typeof code === "number") {
        exitMessageParts.push(`(exit code ${code})`);
      }
      if (reason) {
        exitMessageParts.push(`- ${reason}`);
      }

      appendStatusLine(exitMessageParts.join(" "));
      resetSessionState(reason);
    },
    [appendStatusLine, resetSessionState]
  );

  useEffect(() => {
    if (!socket) {
      return;
    }

    hasShownConnectionMessage.current = true;
  }, [socket]);

  // Cleanup active session when component unmounts
  useEffect(() => {
    return () => {
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        stopTerminalSession({ sessionId: activeSessionId });
      }
    };
  }, [stopTerminalSession]);

  // Execute code directly in the interactive terminal session
  const flushBufferedInput = useCallback(
    (options?: { markerStartIndex?: number }) => {
      if (!isConnected || !sessionIdRef.current) return;
      const pendingInput = inputBuffer.replace(/\r/g, "");
      if (!pendingInput.trim()) return;

      const lines = pendingInput.split(/\n/);
      const lineCount = lines.length;
      appendStatusLine(
        `[input] Sending ${lineCount} line${
          lineCount === 1 ? "" : "s"
        } of buffered input...`
      );

      const deliverInput = async () => {
        const startIndex =
          typeof options?.markerStartIndex === "number"
            ? options.markerStartIndex
            : rawOutputBufferRef.current.length;

        try {
          await waitForTerminalMarker(INPUT_READY_MARKER, undefined, {
            startIndex,
            timeoutMs: 8000,
          });
        } catch (error) {
          console.warn(
            "Input readiness marker not observed; sending buffered input immediately.",
            error
          );
        }

        lines.forEach((line, index) => {
          setTimeout(() => {
            if (!isConnected || !sessionIdRef.current) return;
            const payload = line.length > 0 ? `${line}\r` : "\r";
            sendTerminalData(payload);
          }, 50 + index * 20);
        });
      };

      void deliverInput().finally(() => {
        onInputUpdate("");
      });
    },
    [
      appendStatusLine,
      inputBuffer,
      isConnected,
      onInputUpdate,
      sendTerminalData,
      waitForTerminalMarker,
    ]
  );
  const waitForTerminalReady = useCallback(async (timeoutMs = 10000) => {
    if (isTerminalReadyRef.current && sessionIdRef.current) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const interval = window.setInterval(() => {
        if (isTerminalReadyRef.current && sessionIdRef.current) {
          window.clearInterval(interval);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          window.clearInterval(interval);
          reject(new Error("Terminal session timeout"));
        }
      }, 120);
    });
  }, []);

  const waitForSessionToClose = useCallback(async (timeoutMs = 5000) => {
    if (!sessionIdRef.current) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const interval = window.setInterval(() => {
        if (!sessionIdRef.current) {
          window.clearInterval(interval);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          window.clearInterval(interval);
          reject(new Error("Terminal session stop timeout"));
        }
      }, 150);
    });
  }, []);

  const loadCodeExecutionModule =
    useCallback(async (): Promise<CodeExecutionModule> => {
      if (!codeExecutionModuleRef.current) {
        codeExecutionModuleRef.current = await import(
          "@/lib/api/codeExecution"
        );
      }

      return codeExecutionModuleRef.current as CodeExecutionModule;
    }, []);

  const ensureSupportedLanguageKeys = useCallback(
    async (module?: CodeExecutionModule): Promise<Set<string>> => {
      if (supportedLanguageKeysRef.current) {
        return supportedLanguageKeysRef.current;
      }

      try {
        const resolvedModule = module ?? (await loadCodeExecutionModule());
        const response =
          await resolvedModule.codeExecutionAPI.getSupportedLanguages();
        const keys = new Set<string>();
        let hasCatalogEntries = false;

        if (response.success && Array.isArray(response.languages)) {
          response.languages.forEach((languageConfig) => {
            if (languageConfig?.id) {
              keys.add(languageConfig.id.toLowerCase());
              hasCatalogEntries = true;
            }
          });
        }

        if (hasCatalogEntries) {
          // Always treat JavaScript as the default fallback runtime.
          keys.add("javascript");
          supportedLanguageKeysRef.current = keys;
        } else {
          supportedLanguageKeysRef.current = new Set(
            SAFE_TERMINAL_LANGUAGE_FALLBACKS
          );
        }
      } catch (error) {
        console.warn("Failed to load supported terminal languages", error);
        supportedLanguageKeysRef.current = new Set(
          SAFE_TERMINAL_LANGUAGE_FALLBACKS
        );
      }

      return supportedLanguageKeysRef.current;
    },
    [loadCodeExecutionModule]
  );

  const ensureTerminalSession = useCallback(
    async (language: string | null) => {
      const desiredLanguageKey = getTrackingLanguageKey(language);
      const hasReadySession =
        Boolean(sessionIdRef.current) && isTerminalReadyRef.current;
      const languageMismatch =
        activeLanguageRef.current !== null &&
        activeLanguageRef.current !== desiredLanguageKey;

      if (languageMismatch && sessionIdRef.current) {
        const languageLabel =
          desiredLanguageKey === "default"
            ? "default JavaScript"
            : desiredLanguageKey.toUpperCase();
        appendStatusLine(
          `Switching terminal to ${languageLabel} environment...`
        );
        handleStopSession();
        try {
          await waitForSessionToClose();
        } catch (error) {
          console.warn("Timed out waiting for terminal session to stop", error);
        }
      }

      if (!hasReadySession || languageMismatch) {
        initializeSession(language ?? undefined);
      }

      await waitForTerminalReady();
    },
    [
      appendStatusLine,
      handleStopSession,
      initializeSession,
      waitForSessionToClose,
      waitForTerminalReady,
    ]
  );

  const executeCodeInTerminal = useCallback(
    async (file: ProjectNodeFromDB): Promise<boolean> => {
      try {
        // Detect language first
        const codeExecutionModule = await loadCodeExecutionModule();
        const detectedLanguage =
          codeExecutionModule.codeExecutionAPI.detectLanguageFromFileName(
            file.name
          );
        const normalizedLanguage = detectedLanguage.toLowerCase();
        const supportedLanguageKeys = await ensureSupportedLanguageKeys(
          codeExecutionModule
        );
        const hasLanguageConfig = supportedLanguageKeys.has(normalizedLanguage);
        const shouldOmitLanguage =
          normalizedLanguage === "javascript" && !hasLanguageConfig;
        const targetLanguage = hasLanguageConfig
          ? shouldOmitLanguage
            ? null
            : normalizedLanguage
          : null;
        const requiresRuntimeVerification =
          !isWindowsEnvironment &&
          (normalizedLanguage === "c" ||
            normalizedLanguage === "cpp" ||
            normalizedLanguage === "java");

        const trackedTargetLanguage = getTrackingLanguageKey(targetLanguage);

        if (
          targetLanguage &&
          trackedTargetLanguage !== "default" &&
          activeLanguageRef.current !== trackedTargetLanguage
        ) {
          appendStatusLine(
            `Preparing ${targetLanguage.toUpperCase()} execution environment...`
          );
        }

        if (
          (targetLanguage === "javascript" || !targetLanguage) &&
          activeLanguageRef.current &&
          activeLanguageRef.current !== "default" &&
          isTerminalReadyRef.current
        ) {
          appendStatusLine(
            "Preparing default JavaScript execution environment..."
          );
        }

        await ensureTerminalSession(targetLanguage);

        const activeSessionId = sessionIdRef.current;
        if (!activeSessionId) {
          throw new Error("TERMINAL_NOT_READY");
        }

        if (requiresRuntimeVerification) {
          const languageSupport = await ensureLanguageSupport(
            activeSessionId,
            detectedLanguage
          );

          if (languageSupport.status === "missing") {
            const runtimeError = new Error("TERMINAL_RUNTIME_UNAVAILABLE");
            (
              runtimeError as Error & {
                context?: Record<string, unknown>;
              }
            ).context = {
              language: detectedLanguage,
              command: languageSupport.command,
              reason: languageSupport.reason,
              status: languageSupport.status,
            };
            throw runtimeError;
          }

          if (languageSupport.status === "unknown") {
            appendStatusLine(
              languageSupport.command
                ? `[warn] Proceeding without confirming ${languageSupport.command} availability.`
                : "[warn] Proceeding without confirming required runtime availability."
            );
          }
        }

        // Save the file content to a temp file in the terminal
        const filename = file.name;
        const content = file.content ?? "";

        // Create the file in the terminal using a heredoc so special characters are preserved
        const lines = content.split("\n");

        const directoryPath = filename.includes("/")
          ? filename.split("/").slice(0, -1).join("/")
          : null;

        if (directoryPath) {
          sendTerminalData(`mkdir -p ${directoryPath}\r`, {
            sessionId: activeSessionId,
          });
        }

        sendTerminalData(`cat <<'__CODEJOIN__' > ${filename}\r`, {
          sessionId: activeSessionId,
        });

        lines.forEach((line) => {
          const sanitizedLine = line.replace(/\r/g, "");
          sendTerminalData(`${sanitizedLine}\r`, {
            sessionId: activeSessionId,
          });
        });

        sendTerminalData(`__CODEJOIN__\r`, {
          sessionId: activeSessionId,
        });

        // Run the appropriate command based on language
        let runCommand = "";
        switch (detectedLanguage) {
          case "python":
            runCommand = `{ printf "${INPUT_READY_MARKER}\n"; python3 ${filename} 2>/dev/null || python ${filename}; }`;
            break;
          case "javascript":
            runCommand = `{ printf "${INPUT_READY_MARKER}\n"; node ${filename}; }`;
            break;
          case "c":
            runCommand = `gcc -o program ${filename} 2>/dev/null && { printf "${INPUT_READY_MARKER}\n"; ./program; }`;
            break;
          case "cpp":
            runCommand = `g++ -o program ${filename} 2>/dev/null && { printf "${INPUT_READY_MARKER}\n"; ./program; }`;
            break;
          case "java":
            {
              const className = filename.replace(/\.java$/, "");
              runCommand = `javac ${filename} 2>/dev/null && { printf "${INPUT_READY_MARKER}\n"; java ${className}; }`;
            }
            break;
          case "shell":
          case "sh":
            runCommand = `chmod +x ${filename} && { printf "${INPUT_READY_MARKER}\n"; ./${filename}; }`;
            break;
          default:
            runCommand = `echo "Language ${detectedLanguage} not directly supported in terminal. File created as ${filename}"`;
        }

        appendStatusLine(`[run] ${runCommand}`);

        const markerStartIndex = rawOutputBufferRef.current.length;

        sendTerminalData(`${runCommand}\r`, {
          sessionId: activeSessionId,
        });

        flushBufferedInput({ markerStartIndex });

        return true;
      } catch (error: any) {
        if (
          error?.message === "TERMINAL_NOT_READY" ||
          error?.message === "TERMINAL_RUNTIME_UNAVAILABLE"
        ) {
          throw error;
        }

        toast({
          title: "Execution failed",
          description: error?.message || "Failed to execute code in terminal",
          variant: "destructive",
        });
        throw error;
      }
    },
    [
      toast,
      appendStatusLine,
      flushBufferedInput,
      ensureTerminalSession,
      ensureLanguageSupport,
      ensureSupportedLanguageKeys,
      loadCodeExecutionModule,
      sendTerminalData,
    ]
  );

  // Register the execution callback
  useEffect(() => {
    if (!onExecuteInTerminal) {
      return;
    }

    console.log("Registering terminal execution callback");
    onExecuteInTerminal.current = executeCodeInTerminal;

    return () => {
      onExecuteInTerminal.current = null;
    };
  }, [onExecuteInTerminal, executeCodeInTerminal]);

  const handleTerminalInput = useCallback(
    ({
      sessionId: inputSessionId,
      input: chunk,
    }: {
      sessionId: string;
      input: string;
    }) => {
      if (!sessionIdRef.current || inputSessionId !== sessionIdRef.current) {
        return null;
      }

      let forwardBuffer = "";
      let aggregated = "";

      const flushForwardBuffer = () => {
        if (forwardBuffer.length === 0) {
          return;
        }

        aggregated += forwardBuffer;
        forwardBuffer = "";
      };

      for (let index = 0; index < chunk.length; index += 1) {
        const char = chunk[index];

        if (char === "\r") {
          const command = commandBufferRef.current;
          commandBufferRef.current = "";

          const trimmedCommand = command.trim();
          if (trimmedCommand.length > 0) {
            commandHistoryRef.current.push(command);
          }

          const [commandKeyword, ...restTokens] = trimmedCommand.split(/\s+/);
          const isInputCommand = commandKeyword?.toLowerCase() === "input";

          if (isInputCommand) {
            const argumentStartIndex = command.indexOf(" ");
            const hasArgument = argumentStartIndex !== -1;
            const rawValue = hasArgument
              ? command.slice(argumentStartIndex + 1)
              : "";
            const normalizedValue = rawValue.trim();
            const argumentKeyword = normalizedValue
              .split(/\s+/)[0]
              ?.toLowerCase();

            writeToTerminal("\r\n");

            if (!hasArgument || normalizedValue.length === 0) {
              appendStatusLine(
                "[input] Provide a value or use `input clear` to reset the buffer."
              );
            } else if (argumentKeyword === "clear" && restTokens.length === 1) {
              onInputUpdate("");
              appendStatusLine("[input] Execution input buffer cleared.");
            } else {
              onInputUpdate(rawValue);
              appendStatusLine(
                `[input] Execution input buffer set (${rawValue.length} characters).`
              );
            }

            forwardBuffer = "";
            continue;
          }

          forwardBuffer += char;
          continue;
        }

        if (char === "\x03") {
          commandBufferRef.current = "";
          forwardBuffer += char;
          continue;
        }

        if (char === "\x7f" || char === "\b") {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          forwardBuffer += char;
          continue;
        }

        if (char === "\x1b") {
          let sequence = char;
          while (index + 1 < chunk.length) {
            const nextChar = chunk[index + 1];
            sequence += nextChar;
            index += 1;
            if (
              (nextChar >= "A" && nextChar <= "Z") ||
              (nextChar >= "a" && nextChar <= "z")
            ) {
              break;
            }
          }
          forwardBuffer += sequence;
          continue;
        }

        if (char >= " " || char === "\t") {
          commandBufferRef.current += char;
        }

        forwardBuffer += char;
      }

      flushForwardBuffer();

      return aggregated;
    },
    [appendStatusLine, onInputUpdate, writeToTerminal]
  );

  const formatExecutionTime = useCallback((ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }, []);

  useEffect(() => {
    if (!executionOutputs.length) {
      return;
    }

    const segments = executionOutputs.map((execution) => {
      totalExecutionCountRef.current += 1;
      const ordinal = totalExecutionCountRef.current;
      const exitLabel =
        typeof execution.exitCode === "number" ? execution.exitCode : "-";
      const statusLabel =
        execution.success === false ||
        (typeof execution.exitCode === "number" && execution.exitCode !== 0)
          ? "error"
          : "ok";
      const timeLabel = formatExecutionTime(execution.executionTime);
      const lines: string[] = [
        `[run #${ordinal}] ${statusLabel} | exit ${exitLabel} | duration ${timeLabel}`,
      ];

      if (execution.output && execution.output.trim().length > 0) {
        lines.push(execution.output.trimEnd());
      }

      if (execution.error && execution.error.trim().length > 0) {
        lines.push(`[stderr]\n${execution.error.trimEnd()}`);
      }

      return lines.join("\n");
    });

    const block = segments.join("\n\n");
    const needsPrefixNewline = !displayEndsWithNewlineRef.current;
    const suffix = block.endsWith("\n") ? "" : "\n";
    const payload = `${needsPrefixNewline ? "\n" : ""}${block}${suffix}`;
    writeToTerminal(payload);

    onClearExecutions();
  }, [
    executionOutputs,
    formatExecutionTime,
    onClearExecutions,
    writeToTerminal,
  ]);

  const getStatusIcon = (exitCode: number | null, success?: boolean) => {
    if (success === true || exitCode === 0) {
      return <CheckCircle className="h-3 w-3 text-green-400" />;
    }

    if (success === false || (typeof exitCode === "number" && exitCode !== 0)) {
      return <XCircle className="h-3 w-3 text-red-400" />;
    }
    if (exitCode === null) {
      return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
    }

    return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
  };

  const terminalStatus = isTerminalReady
    ? "Connected"
    : isStarting
    ? "Starting..."
    : isStopping
    ? "Stopping..."
    : isConnected
    ? "Stopped"
    : "Offline";

  const statusColor = isTerminalReady
    ? "text-[#4ec9b0]"
    : isStarting || isStopping
    ? "text-yellow-300"
    : isConnected
    ? "text-zinc-400"
    : "text-[#f48771]";

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#1e1e1e] text-[#cccccc] font-mono text-sm">
      {/* Terminal Header - VS Code style */}
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
            onClick={() =>
              (sessionId ? handleStopSession : initializeSession)()
            }
            className="h-6 w-6 p-0 text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            title={
              sessionId ? "Stop terminal session" : "Start terminal session"
            }
            disabled={sessionId ? isStopping : isStarting || !isConnected}
          >
            {sessionId ? (
              <Square className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTerminalOutput}
            className="h-6 w-6 p-0 text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            title="Clear terminal"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        className="flex-1 flex flex-col min-h-0"
        onClick={handleTerminalClick}
      >
        <div className="flex-1 min-h-0 overflow-hidden p-3">
          <TerminalSurface
            ref={terminalSurfaceRef}
            className="h-full w-full"
            onReady={handleTerminalReady}
            onData={handleTerminalData}
            onInput={handleTerminalInput}
            onError={handleTerminalError}
            onExit={handleTerminalExit}
          />
        </div>
      </div>
    </div>
  );
}

// Problems panel component
function ProblemsPanel({
  problems,
  onClear,
}: {
  problems: Problem[];
  onClear: () => void;
}) {
  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warningCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="flex items-center justify-between p-2 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Problems</span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorCount} errors
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {warningCount} warnings
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-zinc-400 hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {problems.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic">
            No problems detected
          </div>
        ) : (
          <div className="divide-y">
            {problems.map((problem) => (
              <div
                key={problem.id}
                className="p-2 hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  {problem.severity === "error" && (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                  {problem.severity === "warning" && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  )}
                  {problem.severity === "info" && (
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {problem.message}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {problem.file}:{problem.line}:{problem.column} -{" "}
                      {problem.source}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectWorkspace({
  initialNodes,
  projectId,
  conversationId,
  initialChatMessages,
  teamMembers,
}: ProjectWorkspaceProps) {
  // Socket integration for real-time collaboration
  const {
    joinProject,
    isConnected,
    collaborators: liveCollaborators,
  } = useSocket();
  const { toast } = useToast();
  const { user, loading: userLoading } = useUser();

  // Only initialize AI conversations when user is authenticated
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);

  useEffect(() => {
    // More robust authentication check - only require user.id
    // Email might not always be available during auth state changes or with certain providers
    const isAuthenticated = !userLoading && !!user?.id;
    setIsUserAuthenticated(isAuthenticated);

    // Debug authentication state
    console.log('Authentication state:', {
      userLoading,
      hasUserId: !!user?.id,
      hasUserEmail: !!user?.email,
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email
    });
  }, [user, userLoading]);

  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("html");
  const [isAIVoiceActive, setIsAIVoiceActive] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState<string>("hybrid-smart");

  // Rate limit tracking
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isRateLimited: boolean;
    retryAfter: number;
    errorType?: string;
    resetTime?: Date;
  }>({
    isRateLimited: false,
    retryAfter: 0
  });

  // AI Conversation hook for Supabase-backed persistence
  const {
    conversations,
    currentConversation,
    messages: aiMessages,
    loading: isAILoading,
    error: aiError,
    getOrCreateConversation,
    addMessage,
    loadConversation,
    clearCurrentConversation,
    createConversation,
  } = useAIConversations({
    projectId,
    userId: user?.id, // Pass userId directly, this will update when user changes
    autoLoad: isUserAuthenticated,
  });
  const [viewMode, setViewMode] = useState("code");

  // Execution and output states
  const [consoleOutputs, setConsoleOutputs] = useState<ExecutionResult[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalExecuteCallbackRef = useRef<
    ((file: ProjectNodeFromDB) => Promise<boolean>) | null
  >(null);
  const terminalExecutorWaitTimeoutRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedInitialMessages = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [inputBuffer, setInputBuffer] = useState("");
  const terminalSurfaceRef = useRef<TerminalSurfaceHandle | null>(null);

  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (terminalExecutorWaitTimeoutRef.current !== null) {
        window.clearTimeout(terminalExecutorWaitTimeoutRef.current);
        terminalExecutorWaitTimeoutRef.current = null;
      }
    };
  }, []);

  // show/hide Team Chat panel
  const [showChat, setShowChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Get dynamic collaborators count from real-time data
  const membersCount = liveCollaborators.length;

  const [nodes, setNodes] = useState(initialNodes);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(
    initialNodes.find((n) => n.type === "file")?.id || null
  );

  const supabase = getSupabaseClient();
  const fallbackCollaboratorRef = useRef({
    userId: createClientId(),
    userName: "Guest",
    userAvatar: "/placeholder.svg",
  });
  const [collaboratorIdentity, setCollaboratorIdentity] = useState<{
    userId: string;
    userName: string;
    userAvatar?: string;
  } | null>(null);
  const localPersistenceEnabled = !supabase;
  const localStorageKey = `${LOCAL_STORAGE_PREFIX}:${projectId}:nodes`;
  const [storageReady, setStorageReady] = useState(!localPersistenceEnabled);
  const hasLoadedLocalStateRef = useRef(false);

  const currentFile = nodes.find((f) => f.id === activeNodeId);

  // Debug logging
  console.log("Active Node ID:", activeNodeId);
  console.log("Current File:", currentFile);
  console.log("Initial Nodes:", initialNodes);
  const currentLanguage = currentFile?.language || selectedLanguage;

  const autosaveLabel =
    autosaveState === "saving"
      ? "Saving..."
      : autosaveState === "saved"
      ? localPersistenceEnabled
        ? "Saved locally"
        : "Saved"
      : autosaveState === "error"
      ? "Save failed"
      : localPersistenceEnabled
      ? "Local autosave"
      : "Autosave ready";

  const autosaveBadgeVariant =
    autosaveState === "error"
      ? "destructive"
      : autosaveState === "saving"
      ? "secondary"
      : "outline";

  useEffect(() => {
    if (!localPersistenceEnabled) {
      if (!storageReady) {
        setStorageReady(true);
      }
      return;
    }

    if (hasLoadedLocalStateRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      setStorageReady(true);
      return;
    }

    hasLoadedLocalStateRef.current = true;

    try {
      const raw = window.localStorage.getItem(localStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNodes((prev) => mergeNodesWithLocalState(prev, parsed));
        }
      }
    } catch (error) {
      console.warn("Failed to load local project state", error);
    } finally {
      setStorageReady(true);
    }
  }, [localPersistenceEnabled, localStorageKey, storageReady]);

  useEffect(() => {
    let isMounted = true;

    const pickString = (value: unknown) =>
      typeof value === "string" && value.trim().length > 0 ? value : null;

    const resolveCollaboratorIdentity = async () => {
      if (!supabase) {
        if (isMounted) {
          setCollaboratorIdentity(fallbackCollaboratorRef.current);
        }
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (authError) {
            console.warn("Failed to fetch authenticated user", authError);
          }
          if (isMounted) {
            setCollaboratorIdentity(fallbackCollaboratorRef.current);
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, user_avatar")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.warn("Failed to load collaborator profile", profileError);
        }

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

        const resolvedName =
          pickString(profile?.full_name) ??
          pickString(metadata["full_name"]) ??
          pickString(metadata["name"]) ??
          pickString(metadata["user_name"]) ??
          pickString(user.email) ??
          fallbackCollaboratorRef.current.userName;

        const resolvedAvatar =
          pickString(profile?.user_avatar) ??
          pickString(metadata["avatar_url"]) ??
          pickString(metadata["avatarUrl"]) ??
          pickString(metadata["picture"]) ??
          undefined;

        if (isMounted) {
          setCollaboratorIdentity({
            userId: user.id,
            userName: resolvedName,
            userAvatar: resolvedAvatar,
          });
        }
      } catch (error) {
        console.warn("Failed to resolve collaborator identity", error);
        if (isMounted) {
          setCollaboratorIdentity(fallbackCollaboratorRef.current);
        }
      }
    };

    resolveCollaboratorIdentity();

    return () => {
      isMounted = false;
    };
  }, [supabase, fallbackCollaboratorRef]);

  useEffect(() => {
    if (!localPersistenceEnabled || !storageReady) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(nodes));
    } catch (error) {
      console.warn("Failed to persist project state locally", error);
    }
  }, [localPersistenceEnabled, localStorageKey, nodes, storageReady]);

  const scheduleAutosaveReset = useCallback(() => {
    if (autosaveResetTimerRef.current) {
      window.clearTimeout(autosaveResetTimerRef.current);
    }

    autosaveResetTimerRef.current = window.setTimeout(() => {
      setAutosaveState("idle");
      autosaveResetTimerRef.current = null;
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      if (autosaveResetTimerRef.current) {
        window.clearTimeout(autosaveResetTimerRef.current);
        autosaveResetTimerRef.current = null;
      }
    };
  }, []);

  // Persistence helpers
  const updateNodeContent = useCallback(
    async (nodeId: string, content: string) => {
      if (supabase) {
        const { error } = await supabase
          .from("project_nodes")
          .update({ content })
          .eq("id", nodeId);

        if (error) {
          throw new Error(error.message);
        }
        return;
      }

      setNodes((prev) =>
        prev.map((node) => (node.id === nodeId ? { ...node, content } : node))
      );
    },
    [supabase]
  );

  const createFile = useCallback(
    async (
      name: string,
      parentId: string | null = null,
      content: string = ""
    ) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      if (supabase) {
        const { data, error } = await supabase
          .from("project_nodes")
          .insert({
            name: trimmedName,
            type: "file",
            project_id: projectId,
            parent_id: parentId,
            content,
          })
          .select()
          .single();

        if (error) {
          toast({
            variant: "destructive",
            title: "Could not create file",
            description: error.message,
          });
          return;
        }

        const created = data as ProjectNodeFromDB;
        setNodes((prev) => [...prev, created]);
        setActiveNodeId(created.id);
        return;
      }

      const newNode: ProjectNodeFromDB = {
        id: createClientId(),
        project_id: projectId,
        parent_id: parentId,
        name: trimmedName,
        type: "file",
        content,
        language: null,
      };

      setNodes((prev) => [...prev, newNode]);
      setActiveNodeId(newNode.id);
    },
    [projectId, supabase, toast]
  );

  const createFolder = useCallback(
    async (name: string, parentId: string | null = null) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      if (supabase) {
        const { data, error } = await supabase
          .from("project_nodes")
          .insert({
            name: trimmedName,
            type: "folder",
            project_id: projectId,
            parent_id: parentId,
          })
          .select()
          .single();

        if (error) {
          toast({
            variant: "destructive",
            title: "Could not create folder",
            description: error.message,
          });
          return;
        }

        const created = data as ProjectNodeFromDB;
        setNodes((prev) => [...prev, created]);
        return;
      }

      const newNode: ProjectNodeFromDB = {
        id: createClientId(),
        project_id: projectId,
        parent_id: parentId,
        name: trimmedName,
        type: "folder",
        content: null,
        language: null,
      };

      setNodes((prev) => [...prev, newNode]);
    },
    [projectId, supabase, toast]
  );

  const renameNode = useCallback(
    async (id: string | undefined, _old: string, newName: string) => {
      if (!id) {
        return false;
      }

      const trimmedName = newName.trim();
      if (!trimmedName) {
        return false;
      }

      if (supabase) {
        const { error } = await supabase
          .from("project_nodes")
          .update({ name: trimmedName })
          .eq("id", id);

        if (error) {
          toast({
            variant: "destructive",
            title: "Rename failed",
            description: error.message,
          });
          return false;
        }
      }

      setNodes((prev) =>
        prev.map((node) =>
          node.id === id ? { ...node, name: trimmedName } : node
        )
      );

      if (activeNodeId === id) {
        setActiveNodeId(id);
      }

      return true;
    },
    [activeNodeId, supabase, toast]
  );

  const deleteNode = useCallback(
    async (id: string | undefined) => {
      if (!id) {
        return;
      }

      if (supabase) {
        const { error } = await supabase
          .from("project_nodes")
          .delete()
          .eq("id", id);

        if (error) {
          toast({
            variant: "destructive",
            title: "Delete failed",
            description: error.message,
          });
          return;
        }
      }

      setNodes((prev) => prev.filter((node) => node.id !== id));
      if (activeNodeId === id) {
        const nextFile = nodes.find(
          (node) => node.id !== id && node.type === "file"
        );
        setActiveNodeId(nextFile?.id ?? null);
      }
    },
    [activeNodeId, nodes, supabase, toast]
  );
  useEffect(() => {
    if (!currentFile || !hasUnsavedChanges) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const contentToSave = currentFile.content ?? "";

    autosaveTimerRef.current = window.setTimeout(async () => {
      setAutosaveState("saving");
      try {
        await updateNodeContent(currentFile.id, contentToSave);
        setHasUnsavedChanges(false);
        setAutosaveState("saved");
        scheduleAutosaveReset();
      } catch (error) {
        console.warn("Autosave failed", error);
        setAutosaveState("error");
        toast({
          variant: "destructive",
          title: "Autosave failed",
          description:
            error instanceof Error
              ? error.message
              : "Unable to persist your changes.",
        });
      } finally {
        autosaveTimerRef.current = null;
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    currentFile?.content,
    currentFile?.id,
    hasUnsavedChanges,
    scheduleAutosaveReset,
    toast,
    updateNodeContent,
  ]);

  useEffect(() => {
    setAutosaveState("idle");
  }, [currentFile?.id]);

  // Real-time collaboration for the current file
  const {
    remoteChanges,
    handleContentChange,
    handleFileSelect,
    clearRemoteChanges,
  } = useFileCollaboration(
    projectId,
    currentFile?.id || "",
    "user-id-placeholder"
  );

  const [activeBottomTab, setActiveBottomTab] = useState("terminal");

  // Save functionality
  const handleSave = async () => {
    if (!currentFile) {
      return;
    }

    setAutosaveState("saving");

    try {
      await updateNodeContent(currentFile.id, currentFile.content ?? "");
      setHasUnsavedChanges(false);
      setAutosaveState("saved");
      scheduleAutosaveReset();

      setConsoleOutputs((prev) => [
        ...prev,
        {
          output: `[saved] Saved ${currentFile.name}`,
          exitCode: 0,
          executionTime: 0,
        },
      ]);
    } catch (error) {
      setAutosaveState("error");
      setConsoleOutputs((prev) => [
        ...prev,
        {
          output: "",
          error: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          executionTime: 0,
        },
      ]);
      toast({
        variant: "destructive",
        title: "Save failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while saving.",
      });
    }
  };

  const waitForTerminalExecutor = useCallback(
    (timeoutMs = 1500) => {
      if (typeof window === "undefined") {
        return Promise.resolve(terminalExecuteCallbackRef.current);
      }

      if (terminalExecuteCallbackRef.current) {
        return Promise.resolve(terminalExecuteCallbackRef.current);
      }

      return new Promise<
        ((file: ProjectNodeFromDB) => Promise<boolean>) | null
      >((resolve) => {
        const now = () =>
          typeof performance !== "undefined" &&
          typeof performance.now === "function"
            ? performance.now()
            : Date.now();

        const deadline = now() + timeoutMs;

        const cancelPendingTimer = () => {
          if (terminalExecutorWaitTimeoutRef.current !== null) {
            window.clearTimeout(terminalExecutorWaitTimeoutRef.current);
            terminalExecutorWaitTimeoutRef.current = null;
          }
        };

        const poll = () => {
          const executor = terminalExecuteCallbackRef.current;
          if (executor) {
            cancelPendingTimer();
            resolve(executor);
            return;
          }

          if (now() >= deadline) {
            cancelPendingTimer();
            resolve(null);
            return;
          }

          terminalExecutorWaitTimeoutRef.current = window.setTimeout(() => {
            terminalExecutorWaitTimeoutRef.current = null;
            poll();
          }, 40);
        };

        poll();
      });
    },
    [terminalExecuteCallbackRef, terminalExecutorWaitTimeoutRef]
  );

  // Enhanced run functionality - now delegates to CodeEditor for real backend execution
  const handleRun = async () => {
    if (!currentFile) return;

    // Auto-save before running
    if (hasUnsavedChanges) {
      await handleSave();
    }

    const ext = getFileExtension(currentFile.name);

    // Switch to preview mode for web files
    if ([".html", ".htm"].includes(ext)) {
      setViewMode("preview");
      setConsoleOutputs((prev) => [
        ...prev,
        {
          output: `✓ Rendered ${currentFile.name} in preview`,
          exitCode: 0,
          executionTime: 50,
        },
      ]);
      return;
    }

    // Check if we should use terminal execution for interactive programs
    const codeContent = currentFile.content ?? "";
    const needsInteractiveInput = shouldUseInteractiveExecution(
      currentFile.name,
      codeContent
    );

    const dispatchNonInteractiveExecution = () => {
      const event = new CustomEvent("codeEditorExecute");
      window.dispatchEvent(event);
    };

    if (needsInteractiveInput) {
      setActiveBottomTab("terminal");

      const showInteractiveToast = () => {
        toast({
          title: "Interactive run started",
          description: inputBuffer.trim()
            ? "Buffered input was sent and the terminal is focused for follow-up responses."
            : "The terminal is focused so you can respond when the program prompts for input.",
        });
      };

      const notifyTerminalUnavailable = (
        message?: string,
        context?: { language?: string | null; command?: string | undefined }
      ) => {
        const hasCustomMessage = Boolean(message);
        const contextualHint = context?.language
          ? `Queue the responses with the terminal \`input\` command or via the prompt before running ${context.language.toUpperCase()} code again.`
          : "If your program needs stdin, queue it with the terminal `input` command before running again.";
        toast({
          title: hasCustomMessage
            ? "Interactive sandbox unavailable"
            : "Terminal not ready",
          description: (message
            ? `${message} ${contextualHint}`
            : `Open the terminal tab and start a session to run interactive programs. ${contextualHint}`
          ).trim(),
          variant: "destructive",
        });
      };

      let terminalExecutor = terminalExecuteCallbackRef.current;
      if (!terminalExecutor) {
        terminalExecutor = await waitForTerminalExecutor();
      }

      let shouldFallbackToNonInteractive = false;
      let fallbackReason: string | undefined;
      let fallbackContext:
        | {
            language?: string | null;
            command?: string;
            reason?: string;
            status?: "available" | "missing" | "unknown";
          }
        | undefined;

      if (terminalExecutor) {
        try {
          const executed = await terminalExecutor(currentFile);

          if (executed !== false) {
            window.setTimeout(() => {
              window.dispatchEvent(new CustomEvent("terminalFocusInput"));
            }, 0);
            showInteractiveToast();
            return;
          }

          shouldFallbackToNonInteractive = true;
        } catch (error) {
          const errorMessage = (error as Error)?.message;
          if (errorMessage === "TERMINAL_NOT_READY") {
            shouldFallbackToNonInteractive = true;
            fallbackReason =
              "Terminal session is still preparing. Running with the standard executor instead.";
          } else if (errorMessage === "TERMINAL_RUNTIME_UNAVAILABLE") {
            shouldFallbackToNonInteractive = true;
            fallbackContext = (
              error as {
                context?: {
                  language?: string;
                  command?: string;
                  reason?: string;
                  status?: "available" | "missing" | "unknown";
                };
              }
            )?.context;
            const missingCommand = fallbackContext?.command;
            const languageLabel = fallbackContext?.language
              ? fallbackContext.language.toUpperCase()
              : undefined;
            const fallbackDetail = fallbackContext?.reason
              ? fallbackContext.reason
              : missingCommand
              ? `The interactive sandbox does not have ${missingCommand} installed${
                  languageLabel ? ` for ${languageLabel}` : ""
                }.`
              : "The interactive sandbox is missing the required compiler/runtime.";
            fallbackReason = `${fallbackDetail} Running with the standard executor instead.`;
          } else {
            console.error("Failed to execute code in terminal", error);
            return;
          }
        }
      } else {
        shouldFallbackToNonInteractive = true;
        fallbackReason =
          fallbackReason ??
          "Terminal session is still starting. Running with the standard executor instead.";
      }

      if (shouldFallbackToNonInteractive) {
        if (fallbackContext?.language && typeof window !== "undefined") {
          const promptMessage = [
            `The interactive ${fallbackContext.language.toUpperCase()} sandbox is unavailable.`,
            "Enter the stdin your program should read when we rerun it with the standard executor.",
            "Leave blank to continue without providing input.",
          ].join("\n\n");

          const userSuppliedInput = window.prompt(promptMessage, inputBuffer);
          if (typeof userSuppliedInput === "string") {
            setInputBuffer(userSuppliedInput);
          }
        }

        notifyTerminalUnavailable(fallbackReason, fallbackContext);
        dispatchNonInteractiveExecution();
        return;
      }

      showInteractiveToast();
      return;
    }

    dispatchNonInteractiveExecution();
  };

  const handleSendAIMessage = async () => {
    if (!aiMessage.trim()) return;

    if (!isUserAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to send messages to the AI Assistant.",
        variant: "destructive",
      });
      return;
    }

    const userMessage = aiMessage.trim();
    setAiMessage("");
    setIsAIThinking(true); // Start thinking animation

    try {
      // Ensure we have a conversation
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await getOrCreateConversation("AI Chat");
        if (!conversation) {
          toast({
            title: "Error",
            description: "Failed to create conversation",
            variant: "destructive",
          });
          setIsAIThinking(false);
          return;
        }
      }

      // Add user message to database
      try {
        await addMessage(conversation.id, {
          role: "user",
          content: userMessage,
          metadata: {},
          author_id: user?.id || null,
        });
      } catch (messageError) {
        console.error("Failed to save user message:", messageError);
        // Continue anyway - the user experience is more important than perfect persistence
      }

      // Get code context from current file
      const context = currentFile
        ? `Current file: ${currentFile.name}\nLanguage: ${
            currentFile.language || "unknown"
          }\n\n${currentFile.content?.substring(0, 2000) || ""}`
        : "No file selected";

      // Determine which API endpoint to use based on selected model
      let endpoint = '/api/ai/chat'; // Default cloud endpoint
      if (selectedAIModel === 'deepseek-coder-6.7b') {
        endpoint = '/api/local-ai/chat';
      } else if (selectedAIModel === 'qwen-coder-free') {
        endpoint = '/api/openrouter-ai/chat';
      } else if (selectedAIModel === 'hybrid-smart') {
        // Use default cloud endpoint for hybrid mode (it will handle routing)
        endpoint = '/api/ai/chat';
      }

      // Call the AI backend API
      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test123", // API key for backend authentication
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            fileContext: context,
            selectedModel: selectedAIModel,
            projectId: project?.id,
            conversationId: conversation.id,
            timestamp: new Date().toISOString()
          },
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.success) {
        // Clear rate limit state on successful response
        if (rateLimitInfo.isRateLimited) {
          setRateLimitInfo({
            isRateLimited: false,
            retryAfter: 0,
            errorType: undefined,
            resetTime: undefined
          });
        }

        // Add AI response to database with metadata
        try {
          await addMessage(conversation.id, {
            role: "assistant",
            content: data.response,
            metadata: data.metadata || {},
            author_id: null,
            ai_model: data.metadata?.model || "gemini-pro",
            ai_response_time_ms: responseTime,
            ai_tokens_used: data.metadata?.tokensUsed,
          });
        } catch (messageError) {
          console.error("Failed to save AI response:", messageError);
          // Show error in toast if saving fails - the UI will rely on the response already shown
          toast({
            title: "Warning",
            description: "AI response was received but couldn't be saved to conversation history.",
            variant: "default",
          });
        }
      } else {
        // Enhanced error handling with specific, actionable messages
        let errorMessage = data.error || "Failed to get AI response";
        let errorTitle = "AI Error";
        let userFriendlyMessage = errorMessage;
        let shouldRetry = false;
        let retryAfter = 0;

        // Handle specific error types with user-friendly messages
        switch (data.errorType) {
          case 'rate_limit':
            errorTitle = "Rate Limit Exceeded";
            userFriendlyMessage = "The AI service is temporarily busy. Please wait a moment before trying again.";
            shouldRetry = true;
            retryAfter = data.retryAfter || 60; // Default to 60 seconds if not provided
            // Set rate limit info for countdown timer
            setRateLimitInfo({
              isRateLimited: true,
              retryAfter,
              errorType: data.errorType,
              resetTime: new Date(Date.now() + retryAfter * 1000)
            });
            break;

          case 'quota_exceeded':
            errorTitle = "API Quota Exceeded";
            userFriendlyMessage = "The free AI service quota has been reached. You can try again later or switch to a different model.";
            shouldRetry = true;
            retryAfter = data.retryAfter || 300; // Default to 5 minutes
            // Set rate limit info for countdown timer
            setRateLimitInfo({
              isRateLimited: true,
              retryAfter,
              errorType: data.errorType,
              resetTime: new Date(Date.now() + retryAfter * 1000)
            });
            break;

          case 'authentication':
            errorTitle = "Authentication Error";
            userFriendlyMessage = "There's an issue with the AI service configuration. Please try again or contact support.";
            shouldRetry = false;
            break;

          case 'credits_insufficient':
            errorTitle = "Insufficient Credits";
            userFriendlyMessage = "The AI service has run out of credits. Please try again later or switch to a different model.";
            shouldRetry = true;
            retryAfter = data.retryAfter || 300;
            // Set rate limit info for countdown timer
            setRateLimitInfo({
              isRateLimited: true,
              retryAfter,
              errorType: data.errorType,
              resetTime: new Date(Date.now() + retryAfter * 1000)
            });
            break;

          case 'service_unavailable':
            errorTitle = "Service Temporarily Unavailable";
            userFriendlyMessage = "The AI service is temporarily down. Please try again in a few moments.";
            shouldRetry = true;
            retryAfter = data.retryAfter || 30;
            // Set rate limit info for countdown timer
            setRateLimitInfo({
              isRateLimited: true,
              retryAfter,
              errorType: data.errorType,
              resetTime: new Date(Date.now() + retryAfter * 1000)
            });
            break;

          case 'model_not_found':
            errorTitle = "Model Not Available";
            userFriendlyMessage = "The selected AI model is not currently available. Please try a different model.";
            shouldRetry = false;
            break;

          default:
            if (data.statusCode === 429) {
              errorTitle = "Too Many Requests";
              userFriendlyMessage = "You're sending requests too quickly. Please wait a moment before trying again.";
              shouldRetry = true;
              retryAfter = 60;
            } else if (data.statusCode >= 500) {
              errorTitle = "Service Error";
              userFriendlyMessage = "The AI service is experiencing issues. Please try again in a few moments.";
              shouldRetry = true;
              retryAfter = 30;
            } else if (data.statusCode >= 400) {
              errorTitle = "Request Error";
              userFriendlyMessage = "There was an issue with your request. Please try again or rephrase your message.";
              shouldRetry = true;
              retryAfter = 10;
            }
            break;
        }

        // Create enhanced error message with retry guidance and smart model suggestions
        let enhancedErrorMessage = `Error: ${userFriendlyMessage}`;
        if (shouldRetry && retryAfter > 0) {
          enhancedErrorMessage += `\n\nYou can try again in ${retryAfter} seconds.`;
        }

        // Smart model switching suggestions based on current model and error type
        const modelSuggestions = [];

        if (selectedAIModel === 'qwen-coder-free') {
          if (data.errorType === 'rate_limit' || data.errorType === 'quota_exceeded') {
            modelSuggestions.push('"Gemini Pro" (Google AI)');
            modelSuggestions.push('"Smart Hybrid Mode" (automatic fallback)');
          } else if (data.errorType === 'service_unavailable') {
            modelSuggestions.push('"Deepseek Coder" (local model)');
            modelSuggestions.push('"Smart Hybrid Mode" (automatic fallback)');
          }
        } else if (selectedAIModel === 'gemini-pro') {
          if (data.errorType === 'rate_limit' || data.errorType === 'quota_exceeded') {
            modelSuggestions.push('"Qwen Coder Free" (OpenRouter)');
            modelSuggestions.push('"Smart Hybrid Mode" (automatic fallback)');
          } else if (data.errorType === 'service_unavailable') {
            modelSuggestions.push('"Deepseek Coder" (local model)');
            modelSuggestions.push('"Smart Hybrid Mode" (automatic fallback)');
          }
        } else if (selectedAIModel === 'deepseek-coder-6.7b') {
          if (data.errorType === 'service_unavailable' || data.errorType === 'model_not_found') {
            modelSuggestions.push('"Qwen Coder Free" (cloud model)');
            modelSuggestions.push('"Gemini Pro" (Google AI)');
            modelSuggestions.push('"Smart Hybrid Mode" (automatic fallback)');
          }
        } else if (selectedAIModel === 'hybrid-smart') {
          if (data.errorType === 'rate_limit' || data.errorType === 'quota_exceeded') {
            modelSuggestions.push('"Deepseek Coder" (local model - no rate limits)');
          }
        }

        if (modelSuggestions.length > 0) {
          enhancedErrorMessage += `\n\n🔄 Suggested alternatives:\n${modelSuggestions.map(suggestion => `• ${suggestion}`).join('\n')}`;
        } else if (selectedAIModel !== 'hybrid-smart') {
          enhancedErrorMessage += `\n\n💡 Tip: Try "Smart Hybrid Mode" for automatic fallback to available models.`;
        }

        // Add enhanced error message to database
        try {
          await addMessage(conversation.id, {
            role: "assistant",
            content: enhancedErrorMessage,
            metadata: {
              type: 'error',
              errorType: data.errorType,
              statusCode: data.statusCode,
              shouldRetry,
              retryAfter,
              originalError: errorMessage
            },
            author_id: null,
          });
        } catch (messageError) {
          console.error("Failed to save error message:", messageError);
          // Show error in toast as fallback
          toast({
            title: errorTitle,
            description: userFriendlyMessage,
            variant: "destructive",
          });
        }

        // Also show toast notification for immediate feedback with quick action
        const shouldSuggestHybrid = selectedAIModel !== 'hybrid-smart' &&
          (data.errorType === 'rate_limit' || data.errorType === 'quota_exceeded' || data.errorType === 'service_unavailable');

        if (shouldSuggestHybrid) {
          toast({
            title: errorTitle,
            description: `${userFriendlyMessage}\n\nWould you like to switch to Smart Hybrid Mode for automatic fallback?`,
            action: (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedAIModel('hybrid-smart');
                  toast({
                    title: "Model Switched",
                    description: "Switched to Smart Hybrid Mode. It will automatically try alternative models if one fails.",
                    variant: "default",
                  });
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Switch to Hybrid
              </Button>
            ),
            variant: "destructive",
          });
        } else {
          toast({
            title: errorTitle,
            description: userFriendlyMessage,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("AI chat error:", error);

      // Try to save error message to database
      try {
        const conversation = currentConversation;
        if (conversation) {
          await addMessage(conversation.id, {
            role: "assistant",
            content: "Error: Failed to connect to AI service. Please try again.",
            metadata: { type: 'error' },
            author_id: null,
          });
        }
      } catch (messageError) {
        console.error("Failed to save error message:", messageError);
        // Show error in toast as last resort
        toast({
          title: "AI Connection Error",
          description: "Failed to connect to AI service. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAIThinking(false); // Stop thinking animation
    }
  };

  // Handle execution results from CodeEditor
  const handleExecutionResult = (rawResult: ExecutionResult) => {
    const hasNumericExitCode =
      typeof rawResult.exitCode === "number" &&
      Number.isFinite(rawResult.exitCode);
    const didSucceed =
      rawResult.success ?? (hasNumericExitCode && rawResult.exitCode === 0);
    const normalizedExitCode = hasNumericExitCode ? rawResult.exitCode : null;

    const normalizedResult: ExecutionResult = {
      ...rawResult,
      exitCode: normalizedExitCode,
      success: didSucceed,
    };

    setConsoleOutputs((prev) => [...prev, normalizedResult]);
    setActiveBottomTab("terminal");

    // Show user feedback based on execution result
    if (didSucceed) {
      const successMessage = normalizedResult.output
        ? `✓ Code executed successfully in ${normalizedResult.executionTime}ms`
        : `✓ Code executed successfully (no output) in ${normalizedResult.executionTime}ms`;
      console.log(successMessage);
    } else {
      const fallbackMessage =
        normalizedResult.error?.trim() ||
        (normalizedExitCode === null
          ? "Execution failed before an exit code was returned."
          : `Execution failed (exit code ${normalizedExitCode}).`);

      console.warn(`[Code Execution] ${fallbackMessage}`);
      toast({
        variant: "destructive",
        title: "Code execution failed",
        description: fallbackMessage,
      });
    }

    // Add syntax errors to problems panel only when execution fails
    if (!didSucceed && normalizedResult.error) {
      const newProblem: Problem = {
        id: Date.now().toString(),
        file: currentFile?.name || "unknown",
        line: 1,
        column: 1,
        message: normalizedResult.error,
        severity: "error",
        source: "runtime",
      };
      setProblems((prev) => [...prev, newProblem]);
    }
  };

  // Add Python syntax error detection
  const detectPythonSyntaxError = (code: string) => {
    const lines = code.split("\n");
    const newProblems: Problem[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      if (trimmedLine && !trimmedLine.startsWith("#")) {
        // Check for invalid syntax patterns
        if (trimmedLine.includes("print(") && !trimmedLine.includes(")")) {
          newProblems.push({
            id: `syntax-${lineNumber}`,
            file: currentFile?.name || "unknown",
            line: lineNumber,
            column: line.indexOf("print(") + 1,
            message: "Missing closing parenthesis",
            severity: "error",
            source: "syntax",
          });
        }

        // Check for missing colons after if, for, def, etc.
        if (
          /^(if|for|def|class|while|try|except|finally|with)\s.*[^:]$/.test(
            trimmedLine
          )
        ) {
          newProblems.push({
            id: `colon-${lineNumber}`,
            file: currentFile?.name || "unknown",
            line: lineNumber,
            column: line.length,
            message: "Missing colon (:) at end of statement",
            severity: "error",
            source: "syntax",
          });
        }

        // Check for indentation issues
        const currentIndent = line.length - line.trimStart().length;
        if (currentIndent % 4 !== 0 && currentIndent > 0) {
          newProblems.push({
            id: `indent-${lineNumber}`,
            file: currentFile?.name || "unknown",
            line: lineNumber,
            column: 1,
            message: "Indentation should be a multiple of 4 spaces",
            severity: "warning",
            source: "syntax",
          });
        }
      }
    });

    return newProblems;
  };

  // Join project for real-time collaboration
  useEffect(() => {
    if (isConnected && projectId && collaboratorIdentity) {
      joinProject(projectId, {
        userId: collaboratorIdentity.userId,
        userName: collaboratorIdentity.userName,
        userAvatar: collaboratorIdentity.userAvatar,
      });
    }
  }, [isConnected, projectId, joinProject, collaboratorIdentity]);

  // Handle remote file changes
  useEffect(() => {
    if (remoteChanges.length > 0) {
      const latestChange = remoteChanges[remoteChanges.length - 1];
      if (latestChange.fileId === currentFile?.id) {
        // Update the file content from remote change
        setNodes((prev) =>
          prev.map((node) =>
            node.id === latestChange.fileId
              ? { ...node, content: latestChange.content }
              : node
          )
        );
        clearRemoteChanges();
      }
    }
  }, [remoteChanges, currentFile?.id, clearRemoteChanges]);

  // Watch for file changes to detect syntax errors
  useEffect(() => {
    if (currentFile && currentFile.content) {
      const ext = getFileExtension(currentFile.name);

      // Clear previous syntax problems for this file
      setProblems((prev) =>
        prev.filter((p) => p.source !== "syntax" || p.file !== currentFile.name)
      );

      if (ext === ".py") {
        const syntaxProblems = detectPythonSyntaxError(currentFile.content);
        setProblems((prev) => [...prev, ...syntaxProblems]);
      }
    }
  }, [currentFile?.content, currentFile?.name]);

  // Collaborators count is now dynamic from real-time Socket.IO data

  // Listen to global header actions
  useEffect(() => {
    const onSave = () => handleSave();
    const onRun = () => handleRun();
    const onShare = () => {
      navigator.clipboard?.writeText(window.location.href);
    };

    const saveListener = () => onSave();
    const runListener = () => onRun();
    const shareListener = () => onShare();

    window.addEventListener("project:save", saveListener as any);
    window.addEventListener("project:run", runListener as any);
    window.addEventListener("project:share", shareListener as any);

    return () => {
      window.removeEventListener("project:save", saveListener as any);
      window.removeEventListener("project:run", runListener as any);
      window.removeEventListener("project:share", shareListener as any);
    };
  }, [currentFile, hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        handleRun();
      }
      // Toggle sidebar with Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setShowSidebar(!showSidebar);
      }
      // Toggle chat with Ctrl+Shift+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        setShowChat(!showChat);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleRun, showSidebar, showChat]);

  // Initialize AI conversation when AI Assistant is opened
  useEffect(() => {
    if (
      isAIAssistantOpen &&
      projectId &&
      !currentConversation &&
      !isAIThinking &&
      isUserAuthenticated
    ) {
      getOrCreateConversation("AI Chat");
    }
  }, [
    isAIAssistantOpen,
    projectId,
    currentConversation,
    isAIThinking,
    getOrCreateConversation,
    isUserAuthenticated,
  ]);

  // Chat scroll behavior - only scroll to bottom on new messages, not initial load
  useEffect(() => {
    if (!chatScrollRef.current) return;

    // Mark initial messages as loaded
    if (!hasLoadedInitialMessages.current && aiMessages.length > 0) {
      hasLoadedInitialMessages.current = true;
      return;
    }

    // Only scroll to bottom on new messages after initial load
    if (hasLoadedInitialMessages.current && aiMessages.length > 0) {
      const scrollContainer = chatScrollRef.current;
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 100;

      // Only auto-scroll if user is already near bottom or it's a new user message
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (isNearBottom || lastMessage?.role === 'user') {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [aiMessages]);

  // Synchronize activeBottomTab with isAIAssistantOpen state
  useEffect(() => {
    if (activeBottomTab === "ai") {
      setIsAIAssistantOpen(true);
    } else {
      setIsAIAssistantOpen(false);
    }
  }, [activeBottomTab]);

  // Rate limit countdown timer
  useEffect(() => {
    if (!rateLimitInfo.isRateLimited || rateLimitInfo.retryAfter <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRateLimitInfo(prev => {
        const newRetryAfter = Math.max(0, prev.retryAfter - 1);

        // Reset rate limit when countdown reaches zero
        if (newRetryAfter === 0) {
          return {
            isRateLimited: false,
            retryAfter: 0,
            errorType: undefined,
            resetTime: undefined
          };
        }

        return {
          ...prev,
          retryAfter: newRetryAfter
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitInfo.isRateLimited, rateLimitInfo.retryAfter]);

  if (localPersistenceEnabled && !storageReady) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Preparing workspace...
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Sidebar - File Explorer */}
        <ResizablePanel
          defaultSize={showSidebar ? 16 : 0}
          minSize={0}
          maxSize={30}
          collapsible={true}
          collapsedSize={0}
          onCollapse={() => setShowSidebar(false)}
          onExpand={() => setShowSidebar(true)}
          className={showSidebar ? "md:min-w-48 min-w-40" : ""}
        >
          {showSidebar && (
            <div className="h-full min-w-0">
              <FileExplorer
                files={nodes}
                activeFile={activeNodeId}
                onFileSelect={setActiveNodeId}
                onCreateFile={createFile}
                onCreateFolder={createFolder}
                onRename={renameNode}
                onDelete={deleteNode}
                projectId={projectId}
                onFilesUploaded={(uploadedFiles) => {
                  // Add uploaded files to the project
                  uploadedFiles.forEach((file) => {
                    if (file.content && file.status === "success") {
                      createFile(file.name, null, file.content);
                    }
                  });
                }}
              />
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle className="w-2 bg-muted/50 data-[resize-handle-state=drag]:bg-primary transition-colors" />

        {/* Center/Main + Right sidebar in a nested vertical layout */}
        <ResizablePanel
          defaultSize={showChat ? 54 : 84}
          minSize={35}
          className="flex flex-col min-w-0 h-full"
        >
          {/* Main Content Area */}
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70} className="flex flex-col">
              <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border-b bg-muted/50 gap-2 sm:gap-0">
                {viewMode === "code" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {currentFile ? currentFile.name : "No file selected"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {currentFile
                        ? getFileExtension(currentFile.name)
                        : currentLanguage?.toUpperCase()}
                    </Badge>
                    {hasUnsavedChanges && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 bg-background rounded-md px-3 py-1.5 flex items-center ml-2">
                      <Lock className="h-3 w-3 mr-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        localhost:3000
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto overflow-x-auto">
                  {/* Backend status */}
                  <div className="hidden lg:block">
                    <BackendStatus showRefresh={false} />
                  </div>

                  <div className="hidden sm:inline-flex">
                    <Badge variant={autosaveBadgeVariant}>
                      {autosaveLabel}
                    </Badge>
                  </div>

                  {/* Save and Run buttons */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSave}
                          disabled={!currentFile || !hasUnsavedChanges}
                          className="h-8 px-2 sm:px-3"
                        >
                          <Save className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Save</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save file (Ctrl+S)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleRun}
                          disabled={!currentFile || isExecuting}
                          className="h-8 px-2 sm:px-3"
                        >
                          {isExecuting ? (
                            <RefreshCw className="h-4 w-4 sm:mr-1 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 sm:mr-1" />
                          )}
                          <span className="hidden sm:inline">Run</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Run code (Ctrl+R)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(value) => {
                      if (value) setViewMode(value);
                    }}
                    className="h-8"
                  >
                    <ToggleGroupItem
                      value="code"
                      aria-label="Code view"
                      className="h-8 px-2"
                    >
                      <Code className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="preview"
                      aria-label="Preview view"
                      className="h-8 px-2"
                    >
                      <Eye className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={showChat ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowChat(!showChat)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {showChat
                          ? "Hide chat (Ctrl+Shift+C)"
                          : "Show chat (Ctrl+Shift+C)"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0 h-full">
                {viewMode === "code" ? (
                  <CodeEditor
                    file={currentFile}
                    onSave={handleSave}
                    onExecute={handleExecutionResult}
                    isExecuting={isExecuting}
                    onExecutionStart={() => setIsExecuting(true)}
                    onExecutionStop={() => setIsExecuting(false)}
                    executionInput={inputBuffer}
                    onChange={(newContent) => {
                      if (!currentFile) return;
                      // Mark as unsaved when content changes
                      setHasUnsavedChanges(true);
                      // Update local state when editor content changes
                      setNodes((prevNodes) =>
                        prevNodes.map((node) =>
                          node.id === currentFile.id
                            ? { ...node, content: newContent ?? null }
                            : node
                        )
                      );
                      // Emit real-time collaboration change
                      handleContentChange(newContent ?? "", "edit");
                    }}
                  />
                ) : (
                  <LivePreview nodes={nodes} />
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle className="!h-3 bg-muted/50 data-[resize-handle-state=drag]:bg-primary transition-colors" />
            <ResizablePanel
              collapsible={true}
              defaultSize={30}
              minSize={15} // Increase minimum size
              onResize={() => {
                // Allow the panel to finish resizing before fitting xterm
                setTimeout(() => {
                  terminalSurfaceRef.current?.fit();
                }, 50);
              }}
            >
              <div className="h-full border-t flex flex-col">
                <Tabs
                  value={activeBottomTab}
                  onValueChange={setActiveBottomTab}
                  className="flex flex-col flex-1 min-h-0 h-full"
                >
                  <TabsList
                    className={`grid w-full grid-cols-3 bg-muted/50 rounded-none border-b`}
                  >
                    <TabsTrigger
                      value="terminal"
                      className="gap-1 sm:gap-2 px-2 sm:px-4"
                    >
                      <Terminal className="h-4 w-4" />
                      <span className="hidden sm:inline">Terminal</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="problems"
                      className="relative gap-1 sm:gap-2 px-2 sm:px-4"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span className="hidden sm:inline">Problems</span>
                      {problems.length > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-1 h-4 px-1 text-xs"
                        >
                          {problems.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="ai"
                      className="gap-1 sm:gap-2 px-2 sm:px-4"
                    >
                      <Brain className="h-4 w-4" />
                      <span className="hidden sm:inline">AI Assistant</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="terminal"
                    className="flex-1 overflow-hidden p-0 m-0 h-full"
                    style={{ contain: 'strict' }}
                  >
                    <TerminalPanel
                      projectId={projectId}
                      userId="user-id-placeholder"
                      executionOutputs={consoleOutputs}
                      onClearExecutions={() => setConsoleOutputs([])}
                      inputBuffer={inputBuffer}
                      onInputUpdate={setInputBuffer}
                      onExecuteInTerminal={terminalExecuteCallbackRef}
                      terminalSurfaceRef={terminalSurfaceRef}
                    />
                  </TabsContent>

                  <TabsContent
                    value="problems"
                    className="flex-1 overflow-hidden p-0 m-0 h-full"
                    style={{ contain: 'strict' }}
                  >
                    <ProblemsPanel
                      problems={problems}
                      onClear={() => setProblems([])}
                    />
                  </TabsContent>

                  {isAIAssistantOpen && (
                    <TabsContent
                      value="ai"
                      className="flex-1 flex min-h-0 p-0 m-0 h-full"
                      style={{ contain: 'strict' }}
                    >
                      <div className="flex-1 flex flex-col h-full">
                        {/* Chat Header with Model Selector and New Chat Button */}
                        <div className="flex-shrink-0 border-b p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Brain className="h-5 w-5 text-primary" />
                              <h3 className="text-sm font-medium">AI Assistant</h3>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (!isUserAuthenticated) {
                                  toast({
                                    title: "Authentication Required",
                                    description: userLoading
                                      ? "Please wait while we verify your authentication..."
                                      : "Please sign in to create AI conversations.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                clearCurrentConversation();
                                createConversation("New AI Chat");
                              }}
                              disabled={userLoading}
                              className="h-8 px-3 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {userLoading ? "Loading..." : "New Chat"}
                            </Button>
                          </div>

                          {/* AI Model Selector */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Model:</span>
                            </div>
                            <AIModelSelector
                              currentModel={selectedAIModel}
                              onModelChange={setSelectedAIModel}
                              compact={true}
                              showStatus={true}
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div ref={chatScrollRef} className="flex-1 overflow-auto">
                            <div className="p-6 space-y-4">
                              {(() => {
                                const validMessages = aiMessages.filter(message => message.content && message.content.trim() !== '');
                                return validMessages.length === 0 ? (
                                <div className="text-center py-12">
                                  <div className="relative mb-6">
                                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-primary/20 to-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                      <Brain className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                                  </div>
                                  <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
                                  <p className="text-sm text-muted-foreground mb-6">
                                    Your intelligent coding companion is ready to help!
                                  </p>
                                  <div className="max-w-md mx-auto">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                      <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                                        <div className="font-medium mb-1">💡 Code Analysis</div>
                                        <div className="text-muted-foreground">Explain and optimize your code</div>
                                      </div>
                                      <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                                        <div className="font-medium mb-1">🐛 Debug Help</div>
                                        <div className="text-muted-foreground">Find and fix bugs quickly</div>
                                      </div>
                                      <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                                        <div className="font-medium mb-1">⚡ Performance</div>
                                        <div className="text-muted-foreground">Optimize for speed and efficiency</div>
                                      </div>
                                      <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                                        <div className="font-medium mb-1">📚 Learning</div>
                                        <div className="text-muted-foreground">Get answers to programming questions</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-8">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-xs text-primary">
                                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                      Ready to assist you
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                validMessages.map((message, index) => (
                                  <div
                                    key={message.id || `${message.role}-message-${index}`}
                                    className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${
                                      message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                    }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                  >
                                    {message.role === "assistant" && (
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                        <Brain className="h-5 w-5 text-primary" />
                                      </div>
                                    )}
                                    <div
                                      className={`max-w-[85%] rounded-lg px-4 py-3 shadow-sm transition-all hover:shadow-md ${
                                        message.role === "user"
                                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                          : message.content?.includes("Error:")
                                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                                          : "bg-muted hover:bg-muted/80"
                                      }`}
                                    >
                                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {message.content}
                                      </div>
                                      </div>
                                    {message.role === "user" && (
                                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <span className="text-primary-foreground text-sm font-medium">
                                          You
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))
                                )})()}

                              {/* Enhanced Loading indicator */}
                              {isAIThinking && (
                                <div className="flex gap-3 justify-start">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                    <Brain className="h-5 w-5 text-primary animate-pulse" />
                                  </div>
                                  <div className="max-w-[85%] rounded-lg px-4 py-3 bg-gradient-to-r from-primary/5 to-muted border border-primary/10 shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="flex gap-1">
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
                                        <div
                                          className="w-2.5 h-2.5 bg-primary/70 rounded-full animate-bounce"
                                          style={{ animationDelay: "0.1s" }}
                                        />
                                        <div
                                          className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-bounce"
                                          style={{ animationDelay: "0.2s" }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium text-primary">
                                        AI is thinking...
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Analyzing your request and generating response
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                        </div>
                        <div className={`flex-shrink-0 border-t p-4 transition-colors ${
                          isAIThinking ? 'bg-primary/5 border-primary/20' : 'bg-background'
                        }`}>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Input
                                value={aiMessage}
                                onChange={(e) => setAiMessage(e.target.value)}
                                placeholder={
                                  isAIThinking
                                    ? "AI is processing your request..."
                                    : rateLimitInfo.isRateLimited
                                      ? `Rate limited. Try again in ${rateLimitInfo.retryAfter}s...`
                                      : "Ask AI assistant..."
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey && !rateLimitInfo.isRateLimited) {
                                    e.preventDefault();
                                    handleSendAIMessage();
                                  }
                                }}
                                disabled={isAIThinking || rateLimitInfo.isRateLimited}
                                className={`pr-10 ${
                                  isAIThinking
                                    ? 'bg-muted/50 border-primary/30'
                                    : rateLimitInfo.isRateLimited
                                      ? 'bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-200'
                                      : ''
                                }`}
                              />
                              {(isAIThinking || rateLimitInfo.isRateLimited) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  {isAIThinking ? (
                                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                                  ) : (
                                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                      <Timer className="h-4 w-4" />
                                      <span className="text-xs font-mono">{rateLimitInfo.retryAfter}s</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={handleSendAIMessage}
                              size="sm"
                              disabled={!aiMessage.trim() || isAIThinking || rateLimitInfo.isRateLimited}
                              className={
                                isAIThinking
                                  ? 'bg-primary/20 border-primary/30 text-primary'
                                  : rateLimitInfo.isRateLimited
                                    ? 'bg-orange-100 border-orange-200 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300'
                                    : ''
                              }
                            >
                              {isAIThinking ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : rateLimitInfo.isRateLimited ? (
                                <Timer className="h-4 w-4" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {(isAIThinking || rateLimitInfo.isRateLimited) && (
                            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                              {isAIThinking ? (
                                <>
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                  <span>Generating response...</span>
                                </>
                              ) : (
                                <>
                                  <Timer className="h-3 w-3 text-orange-500" />
                                  <span className="text-orange-600 dark:text-orange-400">
                                    Rate limited. You can send another message in {rateLimitInfo.retryAfter} seconds.
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        {/* Right Sidebar - Team Chat (resizable) */}
        {showChat && (
          <>
            <ResizableHandle className="w-2 bg-muted/50 data-[resize-handle-state=drag]:bg-primary transition-colors" />
            <ResizablePanel
              defaultSize={25}
              minSize={15}
              maxSize={45}
              collapsible={true}
            >
              <aside className="h-full flex flex-col border-l">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-2 sm:p-3 border-b bg-muted/50">
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      Team Chat
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs hidden sm:inline-flex"
                    >
                      {membersCount} members
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Connection status will be handled by ChatPanel internally */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-muted"
                      onClick={() => setShowChat(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Chat Panel Component */}
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    projectId={projectId}
                    conversationId={conversationId}
                    initialMessages={initialChatMessages}
                    teamMembers={teamMembers}
                    collaborators={liveCollaborators}
                    selfIdentity={collaboratorIdentity}
                  />
                </div>
              </aside>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
