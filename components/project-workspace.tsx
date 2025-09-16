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
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
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
      // In a real app, you would send this to your AI service
      console.log("Sending to AI:", aiMessage);
      setAiMessage("");
    }
  };

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
      // placeholder: could copy link or open share dialog
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
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - File Explorer */}
      <aside className="w-64">
        <Tabs
          defaultValue="files"
          className="flex-1 flex flex-col"
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
                  <Input placeholder="Search extensions..." className="pl-10" />
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
          <TabsContent value="settings" className="flex-1 overflow-y-auto p-0">
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
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">AI Assistant</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Code Suggestions</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-Complete</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Voice Assistant</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <PanelGroup direction="vertical">
          <Panel defaultSize={70} minSize={20} className="flex flex-col">
            {/* The New Combined Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-2 border-b bg-muted/50">
              {/* The header content will now be dynamic */}
              {viewMode === "code" ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{activeFile}</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentLanguage?.toUpperCase()}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Your browser-like controls for the preview */}
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

              {/* The New View Switcher Toggle (replaces Maximize/Minimize) */}
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
            </div>

            {/* The Content Area - Renders one view at a time */}
            <div className="flex-1 flex flex-col">
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
          </Panel>

          <PanelResizeHandle className="h-2 bg-muted/50 data-[resize-handle-state=drag]:bg-primary transition-colors" />
          <Panel
            defaultSize={30}
            minSize={5}
            collapsible={true}
            collapsedSize={5} // Keeps the tab bar visible when collapsed
          >
            {/* Bottom Panel - Console/Terminal */}
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

                <TabsContent value="console" className="flex-1 overflow-y-auto">
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
                    <div className="flex flex-1 min-h-0">
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-auto p-3 space-y-3">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Brain className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 bg-muted/50 rounded-lg p-3">
                              <p className="text-sm">
                                I'm your AI coding assistant. I can help with
                                code suggestions, debugging, and answering
                                questions about your project. What can I help
                                you with today?
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3 justify-end">
                            <div className="flex-1 max-w-[80%] bg-primary text-primary-foreground rounded-lg p-3">
                              <p className="text-sm">
                                Can you explain how the showMessage function
                                works in script.js?
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Brain className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 bg-muted/50 rounded-lg p-3">
                              <p className="text-sm">
                                The <code>showMessage()</code> function in
                                script.js:
                              </p>
                              <ol className="text-sm list-decimal pl-5 mt-2 space-y-1">
                                <li>
                                  Gets the element with ID 'output' from the DOM
                                </li>
                                <li>Creates an array of possible messages</li>
                                <li>Selects a random message from the array</li>
                                <li>
                                  Sets the innerHTML of the output element to
                                  display the message
                                </li>
                                <li>
                                  Adds a subtle animation by temporarily scaling
                                  the element down to 95% and then back to 100%
                                </li>
                              </ol>
                              <p className="text-sm mt-2">
                                The function is triggered when the user clicks
                                the button in the HTML file.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="border-t p-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ask AI about your code..."
                              value={aiMessage}
                              onChange={(e) => setAiMessage(e.target.value)}
                              onKeyPress={(e) =>
                                e.key === "Enter" && handleSendAIMessage()
                              }
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={handleSendAIMessage}
                                    disabled={!aiMessage.trim()}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send message</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={
                                      isAIVoiceActive
                                        ? "destructive"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      setIsAIVoiceActive(!isAIVoiceActive)
                                    }
                                  >
                                    {isAIVoiceActive ? (
                                      <PhoneOff className="h-4 w-4" />
                                    ) : (
                                      <Phone className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isAIVoiceActive
                                    ? "End voice call"
                                    : "Start voice call"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {isAIVoiceActive && (
                            <div className="flex items-center justify-between mt-3 p-2 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium">
                                  Voice Call Active
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsMicOn(!isMicOn)}
                                >
                                  {isMicOn ? (
                                    <Mic className="h-4 w-4" />
                                  ) : (
                                    <MicOff className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                >
                                  {isSpeakerOn ? (
                                    <Volume2 className="h-4 w-4" />
                                  ) : (
                                    <VolumeX className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-64 border-l p-3 space-y-3 overflow-y-auto">
                        <h3 className="text-sm font-medium">AI Suggestions</h3>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs"
                          >
                            <Zap className="h-3 w-3 mr-2" />
                            Optimize this function
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs"
                          >
                            <Code className="h-3 w-3 mr-2" />
                            Add error handling
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs"
                          >
                            <FileText className="h-3 w-3 mr-2" />
                            Generate documentation
                          </Button>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="text-xs font-medium mb-2">
                            Current File Analysis
                          </h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Complexity:</span>
                              <span className="font-medium">Low</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Issues:</span>
                              <span className="font-medium text-yellow-500">
                                2 warnings
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Performance:</span>
                              <span className="font-medium text-green-500">
                                Good
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Right Sidebar - Video Call & Chat */}
      <aside className="w-80">
        {/* Video Call Area */}
        {isVideoCallActive && (
          <div className="h-64 border-b">
            <VideoCall
              collaborators={collaborators}
              isCameraOn={isCameraOn}
              isMicOn={isMicOn}
            />
          </div>
        )}

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Team Chat</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {collaborators.filter((c) => c.status === "online").length} online
            </Badge>
          </div>
          <ChatPanel collaborators={collaborators} />
        </div>
      </aside>
    </div>
  );
}
