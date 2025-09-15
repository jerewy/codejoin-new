"use client";

import { useState } from "react";
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
} from "lucide-react";
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

// Define the props it will receive
interface ProjectWorkspaceProps {
  initialNodes: ProjectNode[];
}

// Rename the function and accept props
export default function ProjectWorkspace({
  initialNodes,
}: ProjectWorkspaceProps) {
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("html");
  const [isAIVoiceActive, setIsAIVoiceActive] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  // 👇 Use the data passed in via props instead of hardcoded data
  const [files, setFiles] = useState(initialNodes);
  const [activeFile, setActiveFile] = useState(initialNodes[0]?.name || "");

  const [collaborators] = useState<Collaborator[]>(mockCollaborators);
  const [extensions] = useState<Extension[]>(mockExtensions);
  const [languageOptions] = useState<LanguageOption[]>(mockLanguageOptions);

  const currentFile = files.find((f) => f.name === activeFile);
  const currentLanguage = currentFile?.language || selectedLanguage;

  const handleSendAIMessage = () => {
    if (aiMessage.trim()) {
      // In a real app, you would send this to your AI service
      console.log("Sending to AI:", aiMessage);
      setAiMessage("");
    }
  };

  // 👇 The return statement should now start with the main 3-panel div
  //    (because the <header> is now in layout.tsx)
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - File Explorer */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <Tabs defaultValue="files" className="flex-1 flex flex-col">
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex flex-1">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-2 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{activeFile}</span>
                <Badge variant="secondary" className="text-xs">
                  {currentLanguage.toUpperCase()}
                </Badge>
              </div>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CodeEditor
              file={files.find((f) => f.name === activeFile)}
              collaborators={collaborators}
            />
          </div>

          {/* Live Preview */}
          <div
            className={`${
              isPreviewMaximized ? "flex-1" : "w-1/2"
            } flex flex-col border-l`}
          >
            <div className="flex items-center justify-between p-2 border-b bg-muted/50">
              <span className="text-sm font-medium">Live Preview</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPreviewMaximized(!isPreviewMaximized)}
                >
                  {isPreviewMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <LivePreview files={files} />
          </div>
        </div>

        {/* Bottom Panel - Console/Terminal */}
        <div className="h-48 border-t flex flex-col">
          <Tabs defaultValue="console" className="h-full flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="console">Console</TabsTrigger>
              <TabsTrigger value="terminal">Terminal</TabsTrigger>
              <TabsTrigger value="problems">Problems</TabsTrigger>
              <TabsTrigger
                value="ai"
                onClick={() => setIsAIAssistantOpen(true)}
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Assistant
              </TabsTrigger>
            </TabsList>
            <TabsContent value="console" className="flex-1 overflow-y-auto p-0">
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
            <TabsContent
              value="ai"
              className="flex-1 flex flex-col min-h-0 p-0"
            >
              <div className="flex h-full">
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-auto p-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">
                          I'm your AI coding assistant. I can help with code
                          suggestions, debugging, and answering questions about
                          your project. What can I help you with today?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="flex-1 max-w-[80%] bg-primary text-primary-foreground rounded-lg p-3">
                        <p className="text-sm">
                          Can you explain how the showMessage function works in
                          script.js?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">
                          The <code>showMessage()</code> function in script.js:
                        </p>
                        <ol className="text-sm list-decimal pl-5 mt-2 space-y-1">
                          <li>
                            Gets the element with ID 'output' from the DOM
                          </li>
                          <li>Creates an array of possible messages</li>
                          <li>Selects a random message from the array</li>
                          <li>
                            Sets the innerHTML of the output element to display
                            the message
                          </li>
                          <li>
                            Adds a subtle animation by temporarily scaling the
                            element down to 95% and then back to 100%
                          </li>
                        </ol>
                        <p className="text-sm mt-2">
                          The function is triggered when the user clicks the
                          button in the HTML file.
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
                                isAIVoiceActive ? "destructive" : "outline"
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
                        <span className="font-medium text-green-500">Good</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Sidebar - Video Call & Chat */}
      <div className="w-80 border-l flex flex-col">
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
      </div>
    </div>
  );
}
