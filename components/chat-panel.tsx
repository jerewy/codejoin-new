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
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: "Sarah Chen",
      message: "Hey everyone! I just pushed the latest changes to the CSS file.",
      time: "2:30 PM",
      avatar: "/placeholder.svg?height=32&width=32",
      isAI: false,
    },
    {
      id: 2,
      user: "Mike Rodriguez",
      message: "Looks great! The animations are smooth now.",
      time: "2:32 PM",
      avatar: "/placeholder.svg?height=32&width=32",
      isAI: false,
    },
    {
      id: 3,
      user: "You",
      message: "Should we add error handling to the API calls?",
      time: "2:35 PM",
      avatar: "/placeholder.svg?height=32&width=32",
      isAI: false,
    },
    {
      id: 4,
      user: "AI Assistant",
      message:
        "That's a good idea! Error handling is important for robust applications. I can help you implement that if you'd like.",
      time: "2:36 PM",
      avatar: "/placeholder.svg?height=32&width=32",
      isAI: true,
    },
  ])

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
        {messages.map((msg) => (
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
        ))}
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
