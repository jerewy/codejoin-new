"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSocket, useFileCollaboration } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CodeEditor from "@/components/code-editor";
import LivePreview from "@/components/live-preview";
import VideoCall from "@/components/video-call";
import ChatPanel from "@/components/chat-panel";
import ExecutionHistory from "@/components/execution-history";
import FileExplorer from "@/components/file-explorer";
import CollaboratorsList from "@/components/collaborators-list";
import ConsoleOutput from "@/components/console-output";
import BackendStatus from "@/components/backend-status";
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
  type Collaborator,
  type Extension,
  type LanguageOption,
  mockCollaborators,
  mockExtensions,
  mockLanguageOptions,
} from "@/lib/mock-data";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { ProjectNodeFromDB } from "@/lib/types";

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
}

// Language extension mapping
const getFileExtension = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : "";
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
}) {
  const {
    socket,
    isConnected,
    startTerminalSession,
    sendTerminalInput,
    stopTerminalSession,
  } = useSocket();
  const { toast } = useToast();

  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [currentCommand, setCurrentCommand] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const attemptedInitialStart = useRef(false);
  const hasShownConnectionMessage = useRef(false);

  const appendRawOutput = useCallback((chunk: string) => {
    setTerminalOutput((prev) => prev + chunk);
  }, []);

  const appendStatusLine = useCallback((message: string) => {
    setTerminalOutput((prev) => {
      const needsPrefixNewline = prev.length > 0 && !prev.endsWith("\n");
      const suffix = message.endsWith("\n") ? "" : "\n";
      return `${prev}${needsPrefixNewline ? "\n" : ""}${message}${suffix}`;
    });
  }, []);

  const initializeSession = useCallback((language?: string) => {
    if (
      !socket ||
      !projectId ||
      !userId ||
      sessionIdRef.current ||
      isStarting
    ) {
      return;
    }

    setIsStarting(true);
    setIsStopping(false);
    if (!hasShownConnectionMessage.current) {
      appendStatusLine("Connecting to CodeJoin sandbox...");
      hasShownConnectionMessage.current = true;
    }
    startTerminalSession({ projectId, userId, language });
  }, [
    appendStatusLine,
    isStarting,
    projectId,
    socket,
    startTerminalSession,
    userId,
  ]);

  // Auto-scroll when execution output or terminal output changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [executionOutputs, terminalOutput]);

  useEffect(() => {
    const handleFocusRequest = () => {
      if (!isTerminalReady) return;
      inputRef.current?.focus();
    };

    window.addEventListener("terminalFocusInput", handleFocusRequest);
    return () => {
      window.removeEventListener("terminalFocusInput", handleFocusRequest);
    };
  }, [isTerminalReady]);

  // Start session on initial mount when socket is ready
  useEffect(() => {
    if (!socket || !isConnected) return;
    if (!attemptedInitialStart.current) {
      attemptedInitialStart.current = true;
      initializeSession();
    }
  }, [initializeSession, isConnected, socket]);

  // Focus input when terminal body is clicked
  const handleTerminalClick = () => {
    if (!isTerminalReady) return;
    inputRef.current?.focus();
  };

  const handleStopSession = useCallback(() => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId) return;

    setIsTerminalReady(false);
    setIsStopping(true);
    appendStatusLine("Stopping terminal session...");
    stopTerminalSession({ sessionId: activeSessionId });
  }, [appendStatusLine, stopTerminalSession]);

  const handleCommandSubmit = useCallback(() => {
    const trimmedCommand = currentCommand.trim();
    const [commandKeyword, ...restTokens] = trimmedCommand.split(/\s+/);
    const isInputCommand = commandKeyword?.toLowerCase() === "input";

    if (isInputCommand) {
      const argumentStartIndex = currentCommand.indexOf(" ");
      const hasArgument = argumentStartIndex !== -1;
      const rawValue = hasArgument ? currentCommand.slice(argumentStartIndex + 1) : "";
      const normalizedValue = rawValue.trim();
      const argumentKeyword = normalizedValue.split(/\s+/)[0]?.toLowerCase();

      if (!hasArgument || normalizedValue.length === 0) {
        appendStatusLine("[input] Provide a value or use `input clear` to reset the buffer.");
      } else if (argumentKeyword === "clear" && restTokens.length === 1) {
        onInputUpdate("");
        appendStatusLine("[input] Execution input buffer cleared.");
      } else {
        onInputUpdate(rawValue);
        appendStatusLine(`[input] Execution input buffer set (${rawValue.length} characters).`);
      }

      if (trimmedCommand.length > 0) {
        setCommandHistory((prev) => [...prev, currentCommand]);
      }

      setCurrentCommand("");
      setHistoryIndex(null);
      return;
    }

    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId) return;

    const payload = currentCommand.length > 0 ? `${currentCommand}\r` : "\r";
    console.log('Sending terminal input:', { sessionId: activeSessionId, input: payload, raw: currentCommand });
    sendTerminalInput({ sessionId: activeSessionId, input: payload });

    if (trimmedCommand.length > 0) {
      setCommandHistory((prev) => [...prev, currentCommand]);
    }

    setCurrentCommand("");
    setHistoryIndex(null);
  }, [
    appendStatusLine,
    currentCommand,
    onInputUpdate,
    sendTerminalInput,
  ]);

  const handleHistoryNavigation = useCallback(
    (direction: "up" | "down") => {
      if (commandHistory.length === 0) return;

      if (direction === "up") {
        const newIndex =
          historyIndex === null
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex] ?? "");
      } else {
        if (historyIndex === null) return;
        const newIndex = Math.min(commandHistory.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex] ?? "");
      }
    },
    [commandHistory, historyIndex]
  );

  useEffect(() => {
    if (!socket) return;

    const handleTerminalReady = ({
      sessionId: readySessionId,
    }: {
      sessionId: string;
    }) => {
      sessionIdRef.current = readySessionId;
      setSessionId(readySessionId);
      setIsTerminalReady(true);
      setIsStarting(false);
      setIsStopping(false);
      if (hasShownConnectionMessage.current) {
        appendStatusLine("Connected to sandbox session.");
      }
    };

    const handleTerminalData = ({
      sessionId: incomingSessionId,
      chunk,
    }: {
      sessionId: string;
      chunk: string;
    }) => {
      if (!sessionIdRef.current || incomingSessionId !== sessionIdRef.current)
        return;
      console.log('Received terminal data:', { sessionId: incomingSessionId, chunk, length: chunk.length });
      appendRawOutput(chunk);
    };

    const handleTerminalError = ({
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
      )
        return;
      appendStatusLine(`Error: ${message}`);
      toast({
        title: "Terminal error",
        description: message,
        variant: "destructive",
      });
      setIsTerminalReady(false);
      setIsStarting(false);
      setIsStopping(false);
      sessionIdRef.current = null;
      setSessionId(null);
    };

    const handleTerminalExit = ({
      sessionId: exitSessionId,
      code,
      reason,
    }: {
      sessionId: string;
      code?: number | null;
      reason?: string;
    }) => {
      if (!sessionIdRef.current || exitSessionId !== sessionIdRef.current)
        return;

      const exitMessageParts = ["Terminal session ended"];
      if (typeof code === "number") {
        exitMessageParts.push(`(exit code ${code})`);
      }
      if (reason) {
        exitMessageParts.push(`- ${reason}`);
      }

      appendStatusLine(exitMessageParts.join(" "));
      sessionIdRef.current = null;
      setSessionId(null);
      setIsTerminalReady(false);
      setIsStarting(false);
      setIsStopping(false);
    };

    socket.on("terminal:ready", handleTerminalReady);
    socket.on("terminal:data", handleTerminalData);
    socket.on("terminal:error", handleTerminalError);
    socket.on("terminal:exit", handleTerminalExit);

    return () => {
      socket.off("terminal:ready", handleTerminalReady);
      socket.off("terminal:data", handleTerminalData);
      socket.off("terminal:error", handleTerminalError);
      socket.off("terminal:exit", handleTerminalExit);
    };
  }, [appendRawOutput, appendStatusLine, socket, toast]);

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
  const executeCodeInTerminal = useCallback(
    async (file: ProjectNodeFromDB): Promise<boolean> => {
      try {
        // Detect language first
        const { codeExecutionAPI } = await import("@/lib/api/codeExecution");
        const detectedLanguage =
          codeExecutionAPI.detectLanguageFromFileName(file.name);

        // Check if we need to start a session with specific language support
        const needsSpecificContainer =
          detectedLanguage === "c" ||
          detectedLanguage === "cpp" ||
          detectedLanguage === "java";

        if (needsSpecificContainer && (!isTerminalReady || !sessionIdRef.current)) {
          // Start a new terminal session with the appropriate language
          appendStatusLine(`Starting ${detectedLanguage.toUpperCase()} environment...`);
          initializeSession(detectedLanguage);

          // Wait for the session to be ready
          const maxWaitTime = 10000; // 10 seconds
          const startTime = Date.now();

          const waitForTerminal = () => {
            return new Promise<void>((resolve, reject) => {
              const checkReady = () => {
                if (isTerminalReady && sessionIdRef.current) {
                  resolve();
                } else if (Date.now() - startTime > maxWaitTime) {
                  reject(new Error("Terminal session timeout"));
                } else {
                  setTimeout(checkReady, 500);
                }
              };
              checkReady();
            });
          };

          await waitForTerminal();
        } else if (!isTerminalReady || !sessionIdRef.current) {
          throw new Error("TERMINAL_NOT_READY");
        }

        // Clear any existing command
        setCurrentCommand("");

        // Save the file content to a temp file in the terminal
        const filename = file.name;
        const content = file.content ?? "";

        // Create the file in the terminal using a simpler method
        const lines = content.split("\n");

        // Clear the file first
        sendTerminalInput({
          sessionId: sessionIdRef.current,
          input: `> ${filename}\r`,
        });

        // Add content line by line to avoid issues with special characters
        lines.forEach((line, index) => {
          setTimeout(() => {
            if (!sessionIdRef.current) return;
            const escapedLine = line.replace(/'/g, "'\"'\"'"); // Escape single quotes
            sendTerminalInput({
              sessionId: sessionIdRef.current,
              input: `echo '${escapedLine}' >> ${filename}\r`,
            });

            // Run the program after the last line is added
            if (index === lines.length - 1) {
              setTimeout(() => {
                if (!sessionIdRef.current) return;

                // Run the appropriate command based on language
                let runCommand = "";
                switch (detectedLanguage) {
                  case "python":
                    runCommand = `python3 ${filename} 2>/dev/null || python ${filename}`;
                    break;
                  case "javascript":
                    runCommand = `node ${filename}`;
                    break;
                  case "c":
                    runCommand =
                      `gcc -o program ${filename} 2>/dev/null && ./program || echo "C compiler not available in this container"`;
                    break;
                  case "cpp":
                    runCommand =
                      `g++ -o program ${filename} 2>/dev/null && ./program || echo "C++ compiler not available in this container"`;
                    break;
                  case "java":
                    const className = filename.replace(".java", "");
                    runCommand =
                      `javac ${filename} 2>/dev/null && java ${className} || echo "Java compiler not available in this container"`;
                    break;
                  case "shell":
                  case "sh":
                    runCommand = `chmod +x ${filename} && ./${filename}`;
                    break;
                  default:
                    runCommand = `echo "Language ${detectedLanguage} not directly supported in terminal. File created as ${filename}"`;
                }

                sendTerminalInput({
                  sessionId: sessionIdRef.current,
                  input: `${runCommand}\r`,
                });
              }, 200);
            }
          }, index * 10); // Small delay between lines
        });

        return true;
      } catch (error: any) {
        if (error?.message === "TERMINAL_NOT_READY") {
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
      isTerminalReady,
      sendTerminalInput,
      toast,
      appendStatusLine,
      initializeSession,
    ]
  );

  // Register the execution callback
  useEffect(() => {
    if (onExecuteInTerminal) {
      console.log("Registering terminal execution callback");
      onExecuteInTerminal.current = executeCodeInTerminal;
    }
  }, [onExecuteInTerminal, executeCodeInTerminal]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isTerminalReady) return;

    // Handle copy/paste functionality
    if (event.ctrlKey && event.key.toLowerCase() === "v") {
      // Allow default paste behavior
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "c") {
      // If there's selected text, allow copy
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return; // Allow default copy behavior
      }

      // Otherwise, send interrupt signal to terminal
      event.preventDefault();
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        sendTerminalInput({ sessionId: activeSessionId, input: "\u0003" });
      }
      setCurrentCommand("");
      setHistoryIndex(null);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleCommandSubmit();
      return;
    }

    // Only send arrow keys for command history if there's no active program waiting for input
    // We can detect this by checking if the current command is empty and we're at a prompt
    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleHistoryNavigation("up");
      // Don't send arrow key sequences to the terminal to avoid interfering with programs
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleHistoryNavigation("down");
      // Don't send arrow key sequences to the terminal to avoid interfering with programs
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const availableCommands = [
        "help",
        "clear",
        "executions",
        "npm",
        "docker",
        "ls",
        "pwd",
        "input",
      ];
      const matches = availableCommands.filter((cmd) =>
        cmd.startsWith(currentCommand)
      );
      if (matches.length === 1) {
        setCurrentCommand(matches[0]);
      }
    }
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

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
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] font-mono text-sm">
      {/* Terminal Header - VS Code style */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d30] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#cccccc]" />
          <span className="text-sm text-[#cccccc]">Terminal</span>
          <span className={`text-xs ${statusColor}`}>{terminalStatus}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={sessionId ? handleStopSession : initializeSession}
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
          {executionOutputs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearExecutions}
              className="h-6 w-6 p-0 text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
              title="Clear execution outputs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTerminalOutput("")}
            className="h-6 w-6 p-0 text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            title="Clear terminal"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-3 cursor-text"
        onClick={handleTerminalClick}
      >
        {/* Execution outputs with VS Code styling */}
        {executionOutputs.map((execution, index) => (
          <div key={`exec-${index}`} className="mb-4">
            {/* Execution header */}
            <div className="flex items-center gap-2 mb-2 text-[#569cd6]">
              {getStatusIcon(execution.exitCode, execution.success)}
              <span className="text-xs text-[#4ec9b0]">
                [Execution {index + 1}]
              </span>
              <span className="text-xs text-[#cccccc]">
                {formatExecutionTime(execution.executionTime)} • Exit{" "}
                {execution.success === true && execution.exitCode === null
                  ? "—"
                  : execution.exitCode ?? "—"}
              </span>
            </div>

            {/* Standard output */}
            {execution.output && (
              <div className="mb-2">
                <pre className="text-[#cccccc] whitespace-pre-wrap leading-relaxed">
                  {execution.output}
                </pre>
              </div>
            )}

            {/* Error output */}
            {execution.error && (
              <div className="mb-2">
                <pre className="text-[#f48771] whitespace-pre-wrap leading-relaxed bg-[#5a1d1d]/20 p-2 rounded border-l-2 border-[#f48771]">
                  {execution.error}
                </pre>
              </div>
            )}
          </div>
        ))}

        {/* Terminal output stream */}
        <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {terminalOutput ? (
            <pre className="text-[#cccccc] whitespace-pre-wrap leading-relaxed font-mono text-sm select-text cursor-text user-select-text"
                 style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                 onMouseDown={(e) => e.stopPropagation()}
                 onMouseUp={(e) => e.stopPropagation()}>
              {terminalOutput}
            </pre>
          ) : (
            <div className="text-xs text-zinc-400 italic font-mono">
              {isTerminalReady
                ? "Session ready. Type a command to begin."
                : "Terminal output will appear here once the sandbox is ready."}
            </div>
          )}
        </div>

        {/* Current command input line */}
        <div className="flex items-center mt-2 border-t border-zinc-700 pt-2">
          <span className="text-[#4ec9b0] mr-2 select-none font-mono text-sm">
            user@codejoin:~$
          </span>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onPaste={(e) => {
                // Allow paste to work normally
                const pastedText = e.clipboardData.getData('text');
                setCurrentCommand(prev => prev + pastedText);
                e.preventDefault();
              }}
              disabled={!isTerminalReady || isStarting || isStopping}
              className="w-full bg-transparent border-none outline-none text-[#cccccc] font-mono text-sm caret-[#4ec9b0]"
              placeholder=""
              autoFocus={isTerminalReady}
            />
            {isTerminalReady && isInputFocused && (
              <div
                className="absolute top-0 w-2 h-5 bg-[#4ec9b0] pointer-events-none animate-blink"
                style={{
                  left: `${currentCommand.length * 8.4}px`
                }}
              />
            )}
            {!isTerminalReady && (
              <div className="text-xs text-zinc-500 font-mono">
                {isStarting
                  ? "Starting sandbox..."
                  : "Connect the terminal to start issuing commands"}
              </div>
            )}
          </div>
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
}: ProjectWorkspaceProps) {
  // Socket integration for real-time collaboration
  const { joinProject, isConnected, collaborators } = useSocket();
  const { toast } = useToast();

  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("html");
  const [isAIVoiceActive, setIsAIVoiceActive] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [viewMode, setViewMode] = useState("code");

  // Execution and output states
  const [consoleOutputs, setConsoleOutputs] = useState<ExecutionResult[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalExecuteCallbackRef =
    useRef<((file: ProjectNodeFromDB) => Promise<boolean>) | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [inputBuffer, setInputBuffer] = useState("");

  // show/hide Team Chat panel
  const [showChat, setShowChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Get dynamic collaborators count from real-time data
  const membersCount = collaborators.length;

  const [nodes, setNodes] = useState(initialNodes);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(
    initialNodes.find((n) => n.type === "file")?.id || null
  );

  const [mockCollaboratorsList] = useState<Collaborator[]>(mockCollaborators);
  const [extensions] = useState<Extension[]>(mockExtensions);
  const [languageOptions] = useState<LanguageOption[]>(mockLanguageOptions);

  const currentFile = nodes.find((f) => f.id === activeNodeId);

  const supabase = getSupabaseClient();

  if (!supabase) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center">
        <div>
          <h2 className="text-lg font-semibold">Authentication unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Supabase environment variables are not configured. Configure them to access the project workspace.
          </p>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log("Active Node ID:", activeNodeId);
  console.log("Current File:", currentFile);
  console.log("Initial Nodes:", initialNodes);
  const currentLanguage = currentFile?.language || selectedLanguage;

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
    if (!currentFile) return;

    try {
      await updateNodeContent(currentFile.id, currentFile.content ?? "");
      setHasUnsavedChanges(false);

      // Add success message to console
      setConsoleOutputs((prev) => [
        ...prev,
        {
          output: `✓ Saved ${currentFile.name}`,
          exitCode: 0,
          executionTime: 0,
        },
      ]);
    } catch (error) {
      setConsoleOutputs((prev) => [
        ...prev,
        {
          output: "",
          error: `Failed to save ${currentFile.name}: ${error}`,
          exitCode: 1,
          executionTime: 0,
        },
      ]);
    }
  };

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
    const needsInteractiveInput =
      codeContent.includes("scanf") ||
      codeContent.includes("input(") ||
      codeContent.includes("Scanner") ||
      codeContent.includes("nextInt()") ||
      codeContent.includes("cin >>") ||
      codeContent.includes("readline()");

    if (needsInteractiveInput) {
      if (!inputBuffer.trim()) {
        toast({
          title: "Program expects input",
          description:
            "Provide input via the terminal using `input <value>` or run anyway to execute without preset input.",
        });
      } else {
        toast({
          title: "Using saved execution input",
          description:
            "The buffered value will be passed to the program during execution.",
        });
      }

      const notifyTerminalUnavailable = () => {
        toast({
          title: "Terminal not ready",
          description:
            "Open the terminal tab and start a session to run interactive programs.",
          variant: "destructive",
        });
      };

      const terminalExecutor = terminalExecuteCallbackRef.current;
      let shouldFallbackToNonInteractive = false;

      if (terminalExecutor) {
        setActiveBottomTab("terminal");
        try {
          const executed = await terminalExecutor(currentFile);

          if (executed !== false) {
            window.setTimeout(() => {
              window.dispatchEvent(new CustomEvent("terminalFocusInput"));
            }, 0);
            return;
          }

          shouldFallbackToNonInteractive = true;
        } catch (error) {
          if ((error as Error)?.message === "TERMINAL_NOT_READY") {
            shouldFallbackToNonInteractive = true;
          } else {
            console.error("Failed to execute code in terminal", error);
            return;
          }
        }
      } else {
        setActiveBottomTab("terminal");
        shouldFallbackToNonInteractive = true;
      }

      if (shouldFallbackToNonInteractive) {
        notifyTerminalUnavailable();
      } else {
        return;
      }
    }

    const event = new CustomEvent("codeEditorExecute");
    window.dispatchEvent(event);
  };

  const handleSendAIMessage = () => {
    if (aiMessage.trim()) {
      console.log("Sending to AI:", aiMessage);
      setAiMessage("");
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
    if (isConnected && projectId) {
      // Mock user data - in production, get from auth context
      joinProject(projectId, {
        userId: "user-id-placeholder",
        userName: "Anonymous User",
        userAvatar: "/placeholder.svg",
      });
    }
  }, [isConnected, projectId, joinProject]);

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

  // Supabase wiring
  const updateNodeContent = async (nodeId: string, content: string) => {
    await supabase.from("project_nodes").update({ content }).eq("id", nodeId);
  };

  const createFile = async (
    name: string,
    parentId: string | null = null,
    content: string = ""
  ) => {
    const { data, error } = await supabase
      .from("project_nodes")
      .insert({
        name,
        type: "file",
        content: content,
        project_id: projectId,
        parent_id: parentId,
      })
      .select()
      .single();
    if (!error && data) {
      setNodes((prev) => [...prev, data as any]);
      setActiveNodeId(name);
    }
  };

  const createFolder = async (name: string, parentId: string | null = null) => {
    const { data, error } = await supabase
      .from("project_nodes")
      .insert({
        name,
        type: "folder",
        project_id: projectId,
        parent_id: parentId,
      })
      .select()
      .single();
    if (!error && data) {
      setNodes((prev) => [...prev, data as any]);
    }
  };

  const renameNode = async (
    id: string | undefined,
    _old: string,
    newName: string
  ) => {
    if (!id) return;
    const { error } = await supabase
      .from("project_nodes")
      .update({ name: newName })
      .eq("id", id);

    if (nodes.some((f) => f.name === newName)) {
      return false;
    }
    if (!error) {
      setNodes((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
      );
      if (activeNodeId === _old) setActiveNodeId(newName);
    }
  };

  const deleteNode = async (id: string | undefined) => {
    if (!id) return;
    await supabase.from("project_nodes").delete().eq("id", id);
    setNodes((prev) => prev.filter((f) => f.id !== id));
    if (currentFile?.id === id) setActiveNodeId("");
  };

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
              <Tabs
                defaultValue="files"
                className="flex-1 flex flex-col h-full"
              >
                <TabsList className="grid w-full grid-cols-3 text-xs">
                  <TabsTrigger value="files" className="text-xs px-2">
                    <span className="hidden sm:inline">Files</span>
                    <FileText className="h-4 w-4 sm:hidden" />
                  </TabsTrigger>
                  <TabsTrigger value="extensions" className="text-xs px-2">
                    <span className="hidden sm:inline">Extensions</span>
                    <Zap className="h-4 w-4 sm:hidden" />
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs px-2">
                    <span className="hidden sm:inline">Settings</span>
                    <Settings className="h-4 w-4 sm:hidden" />
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="files"
                  className="flex-1 overflow-y-auto p-0"
                >
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
                </TabsContent>
                <TabsContent
                  value="extensions"
                  className="flex-1 overflow-y-auto p-0"
                >
                  <div className="h-full flex flex-col">
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Extensions</h3>
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search extensions..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                      {extensions.map((ext) => (
                        <div
                          key={ext.id}
                          className="flex flex-col border rounded-md p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={ext.icon || "/placeholder.svg"}
                                alt={ext.name}
                                className="w-6 h-6 rounded"
                              />
                              <div>
                                <h4 className="text-sm font-medium">
                                  {ext.name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {ext.author}
                                </p>
                              </div>
                            </div>
                            <Switch checked={ext.installed && ext.enabled} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {ext.description}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>v{ext.version}</span>
                            <span>
                              {ext.downloads.toLocaleString()} downloads
                            </span>
                          </div>
                          {!ext.installed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Install
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent
                  value="settings"
                  className="flex-1 overflow-y-auto p-0"
                >
                  <div className="h-full overflow-auto p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        Editor Settings
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Font Size</span>
                          <Select defaultValue="14">
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12px</SelectItem>
                              <SelectItem value="14">14px</SelectItem>
                              <SelectItem value="16">16px</SelectItem>
                              <SelectItem value="18">18px</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Tab Size</span>
                          <Select defaultValue="2">
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="8">8</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Word Wrap</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Line Numbers</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto Save</span>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
            <ResizablePanel collapsible={true} defaultSize={30} minSize={9}>
              <div className="h-full border-t flex flex-col">
                <Tabs
                  value={activeBottomTab}
                  onValueChange={setActiveBottomTab}
                  className="flex flex-col flex-1 min-h-0 h-full"
                >
                  <TabsList
                    className={`grid w-full ${
                      isAIAssistantOpen ? "grid-cols-4" : "grid-cols-3"
                    } bg-muted/50 rounded-none border-b`}
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
                      value="history"
                      className="gap-1 sm:gap-2 px-2 sm:px-4"
                    >
                      <History className="h-4 w-4" />
                      <span className="hidden sm:inline">History</span>
                    </TabsTrigger>
                    {isAIAssistantOpen && (
                      <TabsTrigger
                        value="ai"
                        className="gap-1 sm:gap-2 px-2 sm:px-4"
                      >
                        <Brain className="h-4 w-4" />
                        <span className="hidden sm:inline">AI Assistant</span>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent
                    value="terminal"
                    className="flex-1 overflow-hidden p-0 m-0 h-full"
                  >
                    <TerminalPanel
                      projectId={projectId}
                      userId="user-id-placeholder"
                      executionOutputs={consoleOutputs}
                      onClearExecutions={() => setConsoleOutputs([])}
                      inputBuffer={inputBuffer}
                      onInputUpdate={setInputBuffer}
                      onExecuteInTerminal={terminalExecuteCallbackRef}
                    />
                  </TabsContent>

                  <TabsContent
                    value="problems"
                    className="flex-1 overflow-hidden p-0 m-0 h-full"
                  >
                    <ProblemsPanel
                      problems={problems}
                      onClear={() => setProblems([])}
                    />
                  </TabsContent>

                  <TabsContent
                    value="history"
                    className="flex-1 overflow-hidden p-0 m-0 h-full"
                  >
                    <div className="p-4 h-full flex items-center justify-center">
                      <ExecutionHistory
                        projectId={projectId}
                        onReplayExecution={(record) => {
                          // Handle replay execution
                          if (record.fileName) {
                            setActiveBottomTab("terminal");
                          }
                        }}
                      />
                    </div>
                  </TabsContent>

                  {isAIAssistantOpen && (
                    <TabsContent
                      value="ai"
                      className="flex-1 flex flex-col min-h-0 p-0 m-0 h-full"
                    >
                      <div className="flex-1 flex flex-col h-full bg-background">
                        <div className="flex-1 overflow-auto p-4">
                          <div className="text-sm text-muted-foreground text-center py-8">
                            AI Assistant integration coming soon...
                          </div>
                        </div>
                        <div className="flex-shrink-0 border-t p-4">
                          <div className="flex gap-2">
                            <Input
                              value={aiMessage}
                              onChange={(e) => setAiMessage(e.target.value)}
                              placeholder="Ask AI assistant..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendAIMessage();
                                }
                              }}
                            />
                            <Button onClick={handleSendAIMessage} size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={() => setShowChat(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Chat Panel Component */}
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    collaborators={collaborators.map((collab, index) => ({
                      id: index + 1,
                      name: collab.userName,
                      avatar:
                        collab.userAvatar ||
                        "/placeholder.svg?height=32&width=32",
                    }))}
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
