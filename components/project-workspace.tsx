"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CodeEditor from "@/components/code-editor";
import LivePreview from "@/components/live-preview";
import VideoCall from "@/components/video-call";
import ChatPanel from "@/components/chat-panel";
import FileExplorer from "@/components/file-explorer";
import CollaboratorsList from "@/components/collaborators-list";
import ConsoleOutput from "@/components/console-output";
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


// Terminal component
function TerminalPanel() {
  const [commands, setCommands] = useState<string[]>([
    "Welcome to CodeJoin Terminal",
    "Type 'help' for available commands",
  ]);
  const [currentCommand, setCurrentCommand] = useState("");

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    setCommands((prev) => [...prev, `$ ${trimmed}`]);

    switch (trimmed.toLowerCase()) {
      case "help":
        setCommands((prev) => [
          ...prev,
          "Available commands:",
          "  clear - Clear terminal",
          "  npm start - Start development server",
          "  npm install - Install dependencies",
        ]);
        break;
      case "clear":
        setCommands(["Welcome to CodeJoin Terminal"]);
        break;
      case "npm start":
        setCommands((prev) => [
          ...prev,
          "Starting development server...",
          "Server running on http://localhost:3000",
        ]);
        break;
      case "npm install":
        setCommands((prev) => [
          ...prev,
          "Installing dependencies...",
          "Dependencies installed successfully",
        ]);
        break;
      default:
        if (trimmed) {
          setCommands((prev) => [...prev, `Command not found: ${trimmed}`]);
        }
    }
    setCurrentCommand("");
  };

  return (
    <div className="h-full flex flex-col bg-black text-green-400">
      <div className="flex items-center justify-between p-2 border-b border-muted">
        <span className="text-sm font-medium">Terminal</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCommands(["Welcome to CodeJoin Terminal"])}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-sm">
        {commands.map((cmd, index) => (
          <div key={index} className="mb-1">
            {cmd}
          </div>
        ))}
        <div className="flex items-center">
          <span className="mr-2">$</span>
          <Input
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCommand(currentCommand);
              }
            }}
            className="bg-transparent border-none p-0 text-green-400 focus-visible:ring-0"
            placeholder="Enter command..."
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
}: ProjectWorkspaceProps) {
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

  // dynamic collaborators count for header badge
  const [membersCount, setMembersCount] = useState<number>(0);

  const [nodes, setNodes] = useState(initialNodes);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(
    initialNodes.find((n) => n.type === "file")?.id || null
  );

  const [collaborators] = useState<Collaborator[]>(mockCollaborators);
  const [extensions] = useState<Extension[]>(mockExtensions);
  const [languageOptions] = useState<LanguageOption[]>(mockLanguageOptions);

  const currentFile = nodes.find((f) => f.name === activeNodeId);
  const currentLanguage = currentFile?.language || selectedLanguage;

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

  // Enhanced run functionality with proper Python execution simulation
  const handleRun = async () => {
    if (!currentFile) return;

    setIsExecuting(true);
    setActiveBottomTab("terminal");

    try {
      // Auto-save before running
      if (hasUnsavedChanges) {
        await handleSave();
      }

      const ext = getFileExtension(currentFile.name);
      const code = currentFile.content || "";

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

      // Simulate code execution based on file type
      let result: ExecutionResult;

      if (ext === ".py") {
        result = await simulatePythonExecution(code, currentFile.name);
      } else if (ext === ".js") {
        result = await simulateJavaScriptExecution(code);
      } else {
        result = {
          output: `Running ${currentFile.name}...\nFile type ${ext} execution simulated.`,
          exitCode: 0,
          executionTime: Math.floor(Math.random() * 500) + 100,
        };
      }

      setConsoleOutputs((prev) => [...prev, result]);

      if (result.error) {
        const newProblem: Problem = {
          id: Date.now().toString(),
          file: currentFile.name,
          line: 1,
          column: 1,
          message: result.error,
          severity: "error",
          source: "runtime",
        };
        setProblems((prev) => [...prev, newProblem]);
      }
    } catch (error) {
      setConsoleOutputs((prev) => [
        ...prev,
        {
          output: "",
          error: `Execution failed: ${error}`,
          exitCode: 1,
          executionTime: 0,
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
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

  // Simulate Python execution
  const simulatePythonExecution = async (
    code: string,
    filename: string
  ): Promise<ExecutionResult> => {
    // Check for syntax errors first
    const syntaxProblems = detectPythonSyntaxError(code);
    if (syntaxProblems.some((p) => p.severity === "error")) {
      return {
        output: "",
        error:
          syntaxProblems.find((p) => p.severity === "error")?.message ||
          "Syntax error",
        exitCode: 1,
        executionTime: 10,
      };
    }

    // Simulate print statement execution
    const lines = code.split("\n");
    const outputs: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("print(")) {
        // Extract content between print parentheses
        const match = trimmedLine.match(/print\s*\(\s*["'](.*)["']\s*\)/);
        if (match) {
          outputs.push(match[1]);
        } else {
          // Handle more complex print statements
          const content = trimmedLine
            .replace(/print\s*\(\s*/, "")
            .replace(/\s*\).*$/, "");
          outputs.push(content.replace(/["']/g, ""));
        }
      }
    }

    return {
      output:
        outputs.length > 0
          ? outputs.join("\n")
          : "Python script executed successfully (no output)",
      exitCode: 0,
      executionTime: Math.floor(Math.random() * 300) + 50,
    };
  };

  // Simulate JavaScript execution
  const simulateJavaScriptExecution = async (
    code: string
  ): Promise<ExecutionResult> => {
    try {
      const outputs: string[] = [];
      const mockConsole = {
        log: (...args: any[]) =>
          outputs.push(args.map((arg) => String(arg)).join(" ")),
        error: (...args: any[]) =>
          outputs.push("ERROR: " + args.map((arg) => String(arg)).join(" ")),
        warn: (...args: any[]) =>
          outputs.push("WARNING: " + args.map((arg) => String(arg)).join(" ")),
      };

      // Create a safe execution environment
      const func = new Function("console", code);
      func(mockConsole);

      return {
        output:
          outputs.length > 0
            ? outputs.join("\n")
            : "JavaScript executed successfully (no output)",
        exitCode: 0,
        executionTime: Math.floor(Math.random() * 200) + 30,
      };
    } catch (error: any) {
      return {
        output: "",
        error: error.message,
        exitCode: 1,
        executionTime: 10,
      };
    }
  };

  // Fetch collaborators count
  useEffect(() => {
    const fetchCount = async () => {
      const { data, error } = await supabase
        .from("collaborators")
        .select("user_id", { count: "exact", head: true })
        .eq("project_id", projectId);
      if (!error) {
        setMembersCount(data ? (data as any).length ?? 0 : 0);
      }
    };
    fetchCount();
  }, [projectId]);

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
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleRun]);

  // Supabase wiring
  const updateNodeContent = async (nodeId: string, content: string) => {
    await supabase.from("project_nodes").update({ content }).eq("id", nodeId);
  };

  const createFile = async (name: string, parentId: string | null = null) => {
    const { data, error } = await supabase
      .from("project_nodes")
      .insert({
        name,
        type: "file",
        content: "",
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
    <div className="h-screen w-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Sidebar - File Explorer */}
        <ResizablePanel
          defaultSize={16}
          minSize={10}
          maxSize={80}
          collapsible={true}
        >
          <div className="h-full min-w-0">
            <Tabs defaultValue="files" className="flex-1 flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="extensions">Extensions</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="files" className="flex-1 overflow-y-auto p-0">
                <FileExplorer
                  files={nodes}
                  activeFile={activeNodeId}
                  onFileSelect={setActiveNodeId}
                  onCreateFile={createFile}
                  onCreateFolder={createFolder}
                  onRename={renameNode}
                  onDelete={deleteNode}
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
        </ResizablePanel>

        <ResizableHandle className="w-2 bg-muted/50 data-[resize-handle-state=drag]:bg-primary transition-colors" />

        {/* Center/Main + Right sidebar in a nested vertical layout */}
        <ResizablePanel
          defaultSize={showChat ? 54 : 84}
          minSize={40}
          className="flex flex-col min-w-0 h-full"
        >
          {/* Main Content Area */}
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70} className="flex flex-col">
              <div className="flex-shrink-0 flex items-center justify-between p-2 border-b bg-muted/50">
                {viewMode === "code" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{activeNodeId}</span>
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

                <div className="flex items-center gap-2">
                  {/* Save and Run buttons */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSave}
                          disabled={!currentFile || !hasUnsavedChanges}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
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
                        >
                          {isExecuting ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-1" />
                          )}
                          Run
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
                    <ToggleGroupItem value="code" aria-label="Code view">
                      <Code className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="preview" aria-label="Preview view">
                      <Eye className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowChat(!showChat)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {showChat ? "Hide chat" : "Show chat"}
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
              collapsedSize={4}
              defaultSize={30}
              minSize={9}
            >
              <div className="h-full border-t flex flex-col">
                <Tabs
                  value={activeBottomTab}
                  onValueChange={setActiveBottomTab}
                  className="flex flex-col flex-1 min-h-0 h-full"
                >
                  <TabsList className={`grid w-full ${isAIAssistantOpen ? 'grid-cols-3' : 'grid-cols-2'} bg-muted/50 rounded-none border-b`}>
                    <TabsTrigger value="terminal" className="gap-2">
                      <Terminal className="h-4 w-4" />
                      Terminal
                    </TabsTrigger>
                    <TabsTrigger value="problems" className="relative gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Problems
                      {problems.length > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-1 h-4 px-1 text-xs"
                        >
                          {problems.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    {isAIAssistantOpen && (
                      <TabsTrigger value="ai" className="gap-2">
                        <Brain className="h-4 w-4" />
                        AI Assistant
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
            <ResizablePanel defaultSize={20} maxSize={40}>
              <aside className="h-full flex flex-col border-l">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Team Chat</span>
                    <Badge variant="secondary" className="text-xs">
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
                  <ChatPanel collaborators={collaborators} />
                </div>
              </aside>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
