"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Copy, ThumbsUp, ThumbsDown, Code, Lightbulb } from "lucide-react"
import AIMessageParser from "@/components/ai-message-parser"

export default function AIChat() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content:
        "Hello! I'm your AI coding assistant. I can help you with code generation, debugging, optimization, and explanations. What would you like to work on today?",
      timestamp: "2:30 PM",
    },
    {
      id: 2,
      type: "user",
      content: "Can you help me create a React component for a user profile card?",
      timestamp: "2:31 PM",
    },
    {
      id: 3,
      type: "ai",
      content: `I'll help you create a React user profile card component. Here's a clean, modern implementation:

\`\`\`jsx
import React from 'react';

const UserProfileCard = ({ user }) => {
  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="md:flex">
        <div className="md:shrink-0">
          <img 
            className="h-48 w-full object-cover md:h-full md:w-48" 
            src={user.avatar || "/placeholder.svg"} 
            alt={user.name}
          />
        </div>
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
            {user.role}
          </div>
          <h2 className="block mt-1 text-lg leading-tight font-medium text-black">
            {user.name}
          </h2>
          <p className="mt-2 text-slate-500">{user.bio}</p>
          <div className="mt-4">
            <button className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
\`\`\`

This component includes:
- Responsive design with Tailwind CSS
- Image display with proper aspect ratio
- User information display (name, role, bio)
- Interactive button
- Clean, modern styling

Would you like me to add any specific features or modify the styling?`,
      timestamp: "2:32 PM",
      codeBlocks: 1,
    },
  ])

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: "user" as const,
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages([...messages, newMessage])
      setMessage("")

      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: messages.length + 2,
          type: "ai" as const,
          content: "I understand your request. Let me help you with that...",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setMessages((prev) => [...prev, aiResponse])
      }, 1000)
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted border"
              }`}
            >
              {msg.type === "ai" && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Code className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-medium">AI Assistant</span>
                  {msg.codeBlocks && (
                    <Badge variant="secondary" className="text-xs">
                      {msg.codeBlocks} code block{msg.codeBlocks > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              )}
              {msg.type === "ai" ? (
                <AIMessageParser
                  content={msg.content}
                  codeSnippetProps={{
                    showLineNumbers: true,
                    copyable: true,
                    collapsible: true
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              )}
              {msg.type === "ai" && (
                <div className="flex gap-1 mt-2 justify-end">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Suggestions */}
      <div className="p-4 border-t">
        <div className="flex gap-2 mb-3 overflow-x-auto">
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <Code className="h-3 w-3 mr-1" />
            Generate code
          </Button>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <Lightbulb className="h-3 w-3 mr-1" />
            Explain code
          </Button>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            Debug error
          </Button>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            Optimize performance
          </Button>
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything about coding..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
