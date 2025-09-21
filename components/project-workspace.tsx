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
  mockCollaborators, // Keep mock data for now
  mockExtensions,
  mockLanguageOptions,
} from "@/lib/mock-data";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { supabase } from "@/lib/supabaseClient";

// Define the props it will receive
interface ProjectWorkspaceProps {
  initialNodes: ProjectNode[];
  projectId: string;
}

// Rename the function and accept props
export default function ProjectWorkspace({
  initialNodes,
  projectId,
}: ProjectWorkspaceProps) {
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("html");
  const [isAIVoiceActive, setIsAIVoiceActive] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [viewMode, setViewMode] = useState("code");

  // show/hide Team Chat panel
  const [showChat, setShowChat] = useState(false);

  // dynamic collaborators count for header badge
  const [membersCount, setMembersCount] = useState<number>(0);

  // 👇 Use the data passed in via props instead of hardcoded data
  const [files, setFiles] = useState(initialNodes);
  const [activeFile, setActiveFile] = useState(initialNodes[0]?.name || "");

  const [collaborators] = useState<Collaborator[]>(mockCollaborators);
  const [extensions] = useState<Extension[]>(mockExtensions);
  const [languageOptions] = useState<LanguageOption[]>(mockLanguageOptions);

  const currentFile = files.find((f) => f.name === activeFile);
  const currentLanguage = currentFile?.language || selectedLanguage;

  const [activeBottomTab, setActiveBottomTab] = useState("console");

  const handleSendAIMessage = () => {
    if (aiMessage.trim()) {
      console.log("Sending to AI:", aiMessage);
      setAiMessage("");
    }
  };

  // Fetch collaborators count (non-hardcoded)
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
    const onSave = () => {
      if (currentFile?.id)
        updateNodeContent(currentFile.id, currentFile.content ?? "");
    };
    const onRun = () => {
      setViewMode("preview");
    };
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
  }, [currentFile, viewMode]);

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
      setFiles((prev) => [...prev, data as any]);
      setActiveFile(name);
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
      setFiles((prev) => [...prev, data as any]);
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

    if (files.some((f) => f.name === newName)) {
      return false;
    }
    if (!error) {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
      );
      if (activeFile === _old) setActiveFile(newName);
    }
  };

  const deleteNode = async (id: string | undefined) => {
    if (!id) return;
    await supabase.from("project_nodes").delete().eq("id", id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (currentFile?.id === id) setActiveFile("");
  };

  return (
    <ResizablePanelGroup direction="horizontal">
      {/* Left Sidebar - File Explorer (resizable) */}
      <ResizablePanel
        defaultSize={16}
        minSize={12}
        maxSize={80}
        className="min-w-[200px]"
      >
        <div className="h-full min-w-0">
          <Tabs
            defaultValue="files"
            className="flex-1 flex flex-col h-full"
            onValueChange={(newValue) => {
              if (newValue === "ai") {
                console.log("AI Assistant tab clicked");
                setIsAIAssistantOpen(true);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="extensions">Extensions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="files" className="flex-1 overflow-y-auto p-0">
              <FileExplorer
                files={files}
                activeFile={activeFile}
                onFileSelect={setActiveFile}
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
                            <h4 className="text-sm font-medium">{ext.name}</h4>
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
                        <span>{ext.downloads.toLocaleString()} downloads</span>
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
                  <h3 className="text-sm font-medium mb-2">Editor Settings</h3>
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
        className="flex h-full overflow-hidden min-w-0"
      >
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel
              defaultSize={70}
              minSize={20}
              className="flex flex-col"
            >
              <div className="flex-shrink-0 flex items-center justify-between p-2 border-b bg-muted/50">
                {viewMode === "code" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{activeFile}</span>
                    <Badge variant="secondary" className="text-xs">
                      {currentLanguage?.toUpperCase()}
                    </Badge>
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

              <div className="flex-1 flex flex-col min-w-0">
                {viewMode === "code" ? (
                  <CodeEditor
                    file={files.find((f) => f.name === activeFile) as any}
                    collaborators={collaborators}
                    onChange={(newContent) => {
                      if (!currentFile) return;
                      setFiles((prev) =>
                        prev.map((f) =>
                          f.name === currentFile.name
                            ? { ...f, content: newContent }
                            : f
                        )
                      );
                    }}
                    onSave={async () => {
                      if (!currentFile?.id) return;
                      await updateNodeContent(
                        currentFile.id,
                        currentFile.content ?? ""
                      );
                    }}
                  />
                ) : (
                  <LivePreview files={files as any} />
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle className="h-2 bg-muted/50 data-[resize-handle-state=drag]:bg-primary transition-colors" />
            <ResizablePanel
              defaultSize={30}
              minSize={5}
              collapsible={true}
              collapsedSize={5}
            >
              <div className="h-full border-t flex flex-col bg-zinc-900">
                <Tabs
                  value={activeBottomTab}
                  onValueChange={setActiveBottomTab}
                  className="flex flex-col flex-1 min-h-0"
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="console">Console</TabsTrigger>
                    <TabsTrigger value="terminal">Terminal</TabsTrigger>
                    <TabsTrigger value="problems">Problems</TabsTrigger>
                    <TabsTrigger value="ai">
                      <Brain className="h-4 w-4 mr-2" />
                      AI Assistant
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="console"
                    className="flex-1 overflow-y-auto"
                  >
                    <ConsoleOutput />
                  </TabsContent>

                  <TabsContent
                    value="terminal"
                    className="flex-1 overflow-y-auto p-4"
                  >
                    <div className="font-mono text-sm">
                      <div className="text-green-500">$ npm start</div>
                      <div className="text-muted-foreground">
                        Starting development server...
                      </div>
                      <div className="text-muted-foreground">
                        Server running on http://localhost:3000
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="problems"
                    className="flex-1 overflow-y-auto p-4"
                  >
                    <div className="text-sm text-muted-foreground">
                      No problems detected
                    </div>
                  </TabsContent>

                  {activeBottomTab === "ai" && (
                    <TabsContent
                      value="ai"
                      className="flex-1 flex flex-col min-h-0"
                    >
                      <div className="flex-1" />
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
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
  );
}
