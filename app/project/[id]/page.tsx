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

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [activeFile, setActiveFile] = useState("index.html");
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("html");
  const [isAIVoiceActive, setIsAIVoiceActive] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  const [collaborators] = useState([
    {
      id: 1,
      name: "Sarah Chen",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "online",
      cursor: { line: 15, ch: 8 },
    },
    {
      id: 2,
      name: "Mike Rodriguez",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "online",
      cursor: { line: 23, ch: 12 },
    },
    {
      id: 3,
      name: "Alex Kim",
      avatar: "/placeholder.svg?height=32&width=32",
      status: "away",
      cursor: null,
    },
  ]);

  const [files] = useState([
    {
      name: "index.html",
      type: "file",
      language: "html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeJoin Project</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to CodeJoin</h1>
        <p>Real-time collaborative coding platform</p>
        <button onclick="showMessage()">Click me!</button>
        <div id="output"></div>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
    },
    {
      name: "styles.css",
      type: "file",
      language: "css",
      content: `body {
    font-family: 'Arial', sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 50px 20px;
}

h1 {
    font-size: 3rem;
    margin-bottom: 20px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

p {
    font-size: 1.2rem;
    margin-bottom: 30px;
    opacity: 0.9;
}

button {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 1.1rem;
    border-radius: 25px;
    cursor: pointer;
    transition: transform 0.2s;
}

button:hover {
    transform: translateY(-2px);
}

#output {
    margin-top: 20px;
    padding: 20px;
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    min-height: 50px;
}`,
    },
    {
      name: "script.js",
      type: "file",
      language: "javascript",
      content: `function showMessage() {
    const output = document.getElementById('output');
    const messages = [
        'Hello from CodeJoin!',
        'Collaborative coding is awesome!',
        'Real-time updates are working!',
        'AI suggestions coming soon...'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    output.innerHTML = '<h3>' + randomMessage + '</h3>';
    
    // Add some animation
    output.style.transform = 'scale(0.95)';
    setTimeout(() => {
        output.style.transform = 'scale(1)';
    }, 100);
}

// Simulate real-time collaboration
setInterval(() => {
    console.log('Checking for updates...');
}, 5000);`,
    },
    {
      name: "app.py",
      type: "file",
      language: "python",
      content: `from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/data', methods=['GET'])
def get_data():
    data = {
        'message': 'Hello from Python backend!',
        'status': 'success',
        'code': 200
    }
    return jsonify(data)

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    # This would typically fetch from a database
    user = {
        'id': user_id,
        'name': 'Example User',
        'email': 'user@example.com'
    }
    return jsonify(user)

if __name__ == '__main__':
    app.run(debug=True)`,
    },
    {
      name: "schema.sql",
      type: "file",
      language: "sql",
      content: `CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collaborators (
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(20) NOT NULL,
    PRIMARY KEY (project_id, user_id)
);

-- Insert sample data
INSERT INTO users (username, email, password_hash) 
VALUES ('johndoe', 'john@example.com', 'hashed_password_here');`,
    },
  ]);

  const [extensions] = useState([
    {
      id: "prettier",
      name: "Prettier",
      description: "Code formatter",
      author: "Prettier",
      version: "2.8.4",
      rating: 4.9,
      downloads: 15000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: true,
      enabled: true,
    },
    {
      id: "eslint",
      name: "ESLint",
      description: "Linting utility",
      author: "ESLint Team",
      version: "8.36.0",
      rating: 4.8,
      downloads: 12000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: true,
      enabled: true,
    },
    {
      id: "python",
      name: "Python",
      description: "Python language support",
      author: "Microsoft",
      version: "2023.6.0",
      rating: 4.7,
      downloads: 8000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: true,
      enabled: true,
    },
    {
      id: "go",
      name: "Go",
      description: "Go language support",
      author: "Go Team",
      version: "0.37.1",
      rating: 4.6,
      downloads: 3000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
    },
    {
      id: "docker",
      name: "Docker",
      description: "Docker support",
      author: "Microsoft",
      version: "1.25.1",
      rating: 4.5,
      downloads: 5000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
    },
    {
      id: "gitlens",
      name: "GitLens",
      description: "Git supercharged",
      author: "GitKraken",
      version: "13.5.0",
      rating: 4.9,
      downloads: 7000000,
      icon: "/placeholder.svg?height=40&width=40",
      installed: false,
      enabled: false,
    },
  ]);

  const languageOptions = [
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "csharp", label: "C#" },
    { value: "php", label: "PHP" },
    { value: "ruby", label: "Ruby" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "sql", label: "SQL" },
  ];

  const handleSendAIMessage = () => {
    if (aiMessage.trim()) {
      // In a real app, you would send this to your AI service
      console.log("Sending to AI:", aiMessage);
      setAiMessage("");
    }
  };

  const currentFile = files.find((f) => f.name === activeFile);
  const currentLanguage = currentFile?.language || selectedLanguage;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>

          {/* Logo and Brand */}
          <div className="flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2"
            >
              <path
                d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
                fill="#FF5722"
              />
              <path
                d="M14 10L18 14M18 10L14 14"
                stroke="#0D47A1"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M14 18L18 22M18 18L14 22"
                stroke="#0D47A1"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xl font-bold text-primary">CodeJoin</span>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Project Info */}
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">My Awesome Project</h1>
            <Badge variant="outline" className="text-xs">
              Multi-language
            </Badge>
          </div>

          <Separator orientation="vertical" className="h-6" />
          <CollaboratorsList collaborators={collaborators} />
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <Select value={currentLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Video Call Controls */}
          <div className="flex items-center gap-1 mr-4">
            <Button
              variant={isCameraOn ? "default" : "destructive"}
              size="sm"
              onClick={() => setIsCameraOn(!isCameraOn)}
            >
              {isCameraOn ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant={isMicOn ? "default" : "destructive"}
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
              variant={isVideoCallActive ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsVideoCallActive(!isVideoCallActive)}
            >
              {isVideoCallActive ? (
                <Phone className="h-4 w-4" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              {isVideoCallActive ? "End Call" : "Start Call"}
            </Button>
          </div>

          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <div className="w-64 border-r bg-muted/30 flex flex-col">
          <Tabs defaultValue="files" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="extensions">Extensions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="files" className="flex-1 p-0">
              <FileExplorer
                files={files}
                activeFile={activeFile}
                onFileSelect={setActiveFile}
              />
            </TabsContent>
            <TabsContent value="extensions" className="flex-1 p-0">
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
            <TabsContent value="settings" className="flex-1 p-0">
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
          <div className="h-48 border-t">
            <Tabs defaultValue="console" className="h-full">
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
              <TabsContent value="console" className="h-full p-0">
                <ConsoleOutput />
              </TabsContent>
              <TabsContent value="terminal" className="h-full p-4">
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
              <TabsContent value="problems" className="h-full p-4">
                <div className="text-sm text-muted-foreground">
                  No problems detected
                </div>
              </TabsContent>
              <TabsContent value="ai" className="h-full p-0">
                <div className="flex h-full">
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-auto p-3 space-y-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Brain className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 bg-muted/50 rounded-lg p-3">
                          <p className="text-sm">
                            I'm your AI coding assistant. I can help with code
                            suggestions, debugging, and answering questions
                            about your project. What can I help you with today?
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <div className="flex-1 max-w-[80%] bg-primary text-primary-foreground rounded-lg p-3">
                          <p className="text-sm">
                            Can you explain how the showMessage function works
                            in script.js?
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
                  <div className="w-64 border-l p-3 space-y-3">
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
                {collaborators.filter((c) => c.status === "online").length}{" "}
                online
              </Badge>
            </div>
            <ChatPanel collaborators={collaborators} />
          </div>
        </div>
      </div>
    </div>
  );
}
