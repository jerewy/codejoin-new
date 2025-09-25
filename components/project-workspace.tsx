"use client";

import React, { useEffect, useState, useRef } from "react";
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
import { supabase } from "@/lib/supabaseClient";
import { ProjectNodeFromDB } from "@/lib/types";

// Define execution result interface
interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
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
  executionOutputs = [],
  onClearExecutions = () => {},
}: {
  executionOutputs?: ExecutionResult[];
  onClearExecutions?: () => void;
}) {
  const [commands, setCommands] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new execution results arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [executionOutputs, commands]);

  // Focus input when terminal is clicked
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add command with user@codejoin prompt
    setCommands((prev) => [...prev, `user@codejoin:~$ ${trimmed}`]);

    switch (trimmed.toLowerCase()) {
      case "help":
        setCommands((prev) => [
          ...prev,
          "",
          "CodeJoin Terminal Commands:",
          "  help            Show this help message",
          "  clear           Clear terminal history",
          "  executions      Show execution outputs",
          "  executions clear Clear execution outputs",
          "  npm start       Start development server",
          "  npm install     Install dependencies",
          "  docker ps       Show running containers",
          "",
        ]);
        break;
      case "clear":
        setCommands([]);
        break;
      case "executions":
        if (executionOutputs.length === 0) {
          setCommands((prev) => [
            ...prev,
            "No code executions yet. Run some code to see results!",
            "",
          ]);
        } else {
          setCommands((prev) => [
            ...prev,
            `Found ${executionOutputs.length} execution result(s). Check the output panel above.`,
            "",
          ]);
        }
        break;
      case "executions clear":
        onClearExecutions();
        setCommands((prev) => [...prev, "Execution outputs cleared", ""]);
        break;
      case "npm start":
        setCommands((prev) => [
          ...prev,
          "Starting CodeJoin development server...",
          "> next dev",
          "",
          "  ▲ Next.js 15.5.2",
          "  - Local:        http://localhost:3000",
          "  - Network:      http://192.168.1.100:3000",
          "",
          "✓ Ready in 1.2s",
          "",
        ]);
        break;
      case "npm install":
        setCommands((prev) => [
          ...prev,
          "Installing dependencies...",
          "",
          "added 847 packages, and audited 848 packages in 12s",
          "",
          "109 packages are looking for funding",
          "  run `npm fund` for details",
          "",
          "found 0 vulnerabilities",
          "",
        ]);
        break;
      case "docker ps":
        setCommands((prev) => [
          ...prev,
          "CONTAINER ID   IMAGE                    COMMAND       CREATED       STATUS       PORTS     NAMES",
          'a1b2c3d4e5f6   python:3.11-alpine      "python"     2 min ago     Up 2 min               code-exec-python',
          'f6e5d4c3b2a1   node:18-alpine          "node"       5 min ago     Up 5 min               code-exec-node',
          "",
        ]);
        break;
      case "ls":
      case "ls -la":
        setCommands((prev) => [
          ...prev,
          "total 48",
          "drwxr-xr-x  12 user  staff   384 Sep 23 20:30 .",
          "drwxr-xr-x   3 user  staff    96 Sep 23 18:00 ..",
          "-rw-r--r--   1 user  staff   314 Sep 23 19:41 .gitignore",
          "-rw-r--r--   1 user  staff  2430 Sep 23 20:15 package.json",
          "drwxr-xr-x   8 user  staff   256 Sep 23 20:00 app/",
          "drwxr-xr-x  15 user  staff   480 Sep 23 20:30 components/",
          "drwxr-xr-x   4 user  staff   128 Sep 23 19:45 lib/",
          "",
        ]);
        break;
      case "pwd":
        setCommands((prev) => [...prev, "/workspace/codejoin", ""]);
        break;
      default:
        setCommands((prev) => [
          ...prev,
          `bash: ${trimmed}: command not found`,
          "",
        ]);
    }
    setCurrentCommand("");
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (exitCode: number) => {
    return exitCode === 0 ? (
      <CheckCircle className="h-3 w-3 text-green-400" />
    ) : (
      <XCircle className="h-3 w-3 text-red-400" />
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] font-mono text-sm">
      {/* Terminal Header - VS Code style */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d30] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#cccccc]" />
          <span className="text-sm text-[#cccccc]">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
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
            onClick={() => setCommands([])}
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
              {getStatusIcon(execution.exitCode)}
              <span className="text-xs text-[#4ec9b0]">
                [Execution {index + 1}]
              </span>
              <span className="text-xs text-[#cccccc]">
                {formatExecutionTime(execution.executionTime)} • Exit{" "}
                {execution.exitCode}
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

        {/* Terminal command history */}
        <div className="space-y-1">
          {commands.map((cmd, index) => (
            <div key={`cmd-${index}`} className="leading-relaxed">
              {cmd.startsWith("user@codejoin:~$") ? (
                <div className="text-[#4ec9b0]">{cmd}</div>
              ) : (
                <div className="text-[#cccccc] pl-0">{cmd}</div>
              )}
            </div>
          ))}
        </div>

        {/* Current command input line */}
        <div className="flex items-center mt-2">
          <span className="text-[#4ec9b0] mr-2 select-none">
            user@codejoin:~$
          </span>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCommand(currentCommand);
                } else if (e.key === "Tab") {
                  e.preventDefault();
                  // Simple tab completion
                  const commands = [
                    "help",
                    "clear",
                    "executions",
                    "npm",
                    "docker",
                    "ls",
                    "pwd",
                  ];
                  const matches = commands.filter((cmd) =>
                    cmd.startsWith(currentCommand)
                  );
                  if (matches.length === 1) {
                    setCurrentCommand(matches[0]);
                  }
                }
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              className="w-full bg-transparent border-none outline-none text-[#cccccc] font-mono text-sm"
              placeholder="Type a command..."
              autoFocus
            />
            {/* Cursor simulation */}
            {isInputFocused && (
              <div
                className="absolute top-0 h-4 w-0.5 bg-[#cccccc] animate-pulse"
                style={{ left: `${currentCommand.length * 0.6}em` }}
              />
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

    // For all code files, trigger the CodeEditor execution which uses real backend
    // This will be handled by the CodeEditor component's executeCode function
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
  const handleExecutionResult = (result: ExecutionResult) => {
    setConsoleOutputs((prev) => [...prev, result]);
    setActiveBottomTab("terminal");

    // Show user feedback based on execution result
    if (result.exitCode === 0) {
      // Success feedback
      if (result.output) {
        // Code executed successfully with output
        console.log(
          `✓ Code executed successfully in ${result.executionTime}ms`
        );
      } else {
        // Code executed successfully but no output
        console.log(
          `✓ Code executed successfully (no output) in ${result.executionTime}ms`
        );
      }
    } else {
      // Error feedback
      console.error(`✗ Execution failed (exit code ${result.exitCode})`);
    }

    // Add syntax errors to problems panel
    if (result.error) {
      const newProblem: Problem = {
        id: Date.now().toString(),
        file: currentFile?.name || "unknown",
        line: 1,
        column: 1,
        message: result.error,
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
                      executionOutputs={consoleOutputs}
                      onClearExecutions={() => setConsoleOutputs([])}
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
