"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Mic, MicOff, Brain } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ChatPanelProps {
  collaborators: Array<{
    id: number
    name: string
    avatar: string
  }>
}

export default function ChatPanel({ collaborators }: ChatPanelProps) {
  const [message, setMessage] = useState("")
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState<Array<{
    id: number;
    user: string;
    message: string;
    time: string;
    avatar: string;
    isAI: boolean;
  }>>([])
  // Chat starts empty - messages will be added as users communicate

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        user: isAskingAI ? "You → AI" : "You",
        message: message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        avatar: "/placeholder.svg?height=32&width=32",
        isAI: false,
      }
      setMessages([...messages, newMessage])
      setMessage("")

      // If asking AI, simulate AI response
      if (isAskingAI) {
        setTimeout(() => {
          const aiResponse = {
            id: messages.length + 2,
            user: "AI Assistant",
            message: "I'm analyzing your request. Let me help you with that...",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            avatar: "/placeholder.svg?height=32&width=32",
            isAI: true,
          }
          setMessages((prev) => [...prev, aiResponse])
          setIsAskingAI(false)
        }, 1000)
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Send className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium mb-1">No messages yet</p>
            <p className="text-xs">Start a conversation with your team</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              {msg.isAI ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <img src={msg.avatar || "/placeholder.svg"} alt={msg.user} className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-medium ${msg.isAI ? "text-primary" : ""}`}>{msg.user}</span>
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                </div>
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isAskingAI ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsAskingAI(!isAskingAI)}
                >
                  <Brain className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isAskingAI ? "Cancel AI query" : "Ask AI Assistant"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Input
            placeholder={isAskingAI ? "Ask AI a question..." : "Type a message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className={isAskingAI ? "border-primary" : ""}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsRecording(!isRecording)}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRecording ? "Stop recording" : "Voice message"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button size="icon" className="h-8 w-8" onClick={handleSendMessage} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isAskingAI && (
          <p className="text-xs text-primary mt-1">Asking AI Assistant - Your question will be shared with the team</p>
        )}
        {isRecording && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
            <span className="text-xs">Recording... (0:05)</span>
          </div>
        )}
      </div>
    </div>
  )
}
