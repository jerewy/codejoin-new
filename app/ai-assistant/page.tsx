"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Code,
  Bug,
  Lightbulb,
  FileText,
  Zap,
  Brain,
  MessageSquare,
  Phone,
  PhoneOff,
} from "lucide-react"
import AIChat from "@/components/ai-chat"
import VoiceAssistant from "@/components/voice-assistant"
import CodeAnalyzer from "@/components/code-analyzer"
import AITemplates from "@/components/ai-templates"

export default function AIAssistantPage() {
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [activeTab, setActiveTab] = useState("chat")

  const aiCapabilities = [
    {
      icon: Code,
      title: "Code Generation",
      description: "Generate code from natural language descriptions",
      example: "Create a React component for user authentication",
    },
    {
      icon: Bug,
      title: "Bug Detection",
      description: "Find and fix bugs in your code automatically",
      example: "Debug this JavaScript function that's not working",
    },
    {
      icon: Lightbulb,
      title: "Code Optimization",
      description: "Improve performance and code quality",
      example: "Optimize this SQL query for better performance",
    },
    {
      icon: FileText,
      title: "Documentation",
      description: "Generate comprehensive documentation",
      example: "Create API documentation for this endpoint",
    },
    {
      icon: Zap,
      title: "Code Explanation",
      description: "Understand complex code with AI explanations",
      example: "Explain how this algorithm works step by step",
    },
    {
      icon: Brain,
      title: "Learning Assistant",
      description: "Get personalized coding tutorials and tips",
      example: "Teach me about React hooks with examples",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">AI Assistant</h1>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                Powered by GPT-4 & ElevenLabs
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isVoiceActive ? "destructive" : "default"}
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              className="gap-2"
            >
              {isVoiceActive ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              {isVoiceActive ? "End Voice Call" : "Start Voice Call"}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsMicOn(!isMicOn)}>
              {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsSpeakerOn(!isSpeakerOn)}>
              {isSpeakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main AI Interface */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="voice">
                  <Phone className="h-4 w-4 mr-2" />
                  Voice
                </TabsTrigger>
                <TabsTrigger value="analyzer">
                  <Code className="h-4 w-4 mr-2" />
                  Code Analyzer
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-6">
                <AIChat />
              </TabsContent>

              <TabsContent value="voice" className="mt-6">
                <VoiceAssistant
                  isActive={isVoiceActive}
                  isMicOn={isMicOn}
                  isSpeakerOn={isSpeakerOn}
                  onToggleVoice={setIsVoiceActive}
                  onToggleMic={setIsMicOn}
                  onToggleSpeaker={setIsSpeakerOn}
                />
              </TabsContent>

              <TabsContent value="analyzer" className="mt-6">
                <CodeAnalyzer />
              </TabsContent>

              <TabsContent value="templates" className="mt-6">
                <AITemplates />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiCapabilities.map((capability, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <capability.icon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{capability.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{capability.description}</p>
                    <div className="bg-muted/50 p-2 rounded text-xs italic">"{capability.example}"</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Code className="h-4 w-4 mr-2" />
                  Analyze Current Project
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Bug className="h-4 w-4 mr-2" />
                  Find Bugs
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Docs
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize Code
                </Button>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">AI Queries</span>
                  <Badge variant="secondary">24/100</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Voice Minutes</span>
                  <Badge variant="secondary">12/60</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Code Analysis</span>
                  <Badge variant="secondary">8/20</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: "24%" }}></div>
                </div>
                <p className="text-xs text-muted-foreground">24% of daily limit used</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
