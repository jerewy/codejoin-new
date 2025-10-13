"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Code, Lightbulb, Brain } from "lucide-react"
import AIMessage from "@/components/ai-message"
import { parseMessageContent, countCodeBlocks } from "@/lib/message-parser"

interface Message {
  id: number
  type: "user" | "ai"
  content: string
  timestamp: string
  codeBlocks?: number
}

export default function EnhancedAIChat() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "ai",
      content: `Hello! I'm your AI coding assistant. I can help you with code generation, debugging, optimization, and explanations. Here's a quick example:

\`\`\`javascript
// Welcome message
const greeting = "Welcome to AI Assistant!";
console.log(greeting);
\`\`\`

Feel free to ask me anything about coding!`,
      timestamp: "2:30 PM",
      codeBlocks: 1,
    },
    {
      id: 2,
      type: "user",
      content: "Can you help me create a React component with TypeScript?",
      timestamp: "2:31 PM",
    },
    {
      id: 3,
      type: "ai",
      content: `I'll help you create a comprehensive React component with TypeScript. Here's a modern implementation:

\`\`\`typescript
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
}

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdate,
  className
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(\`/api/users/\${userId}\`);
        const userData: User = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading user data...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className={className}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span className="badge">{user.role}</span>
    </div>
  );
};

export default UserProfile;
\`\`\`

This component includes:

- **TypeScript interfaces** for type safety
- **Async data fetching** with proper error handling
- **Loading states** and conditional rendering
- **Customizable props** and styling
- **React hooks** for state management

You can use it like this:

\`\`\`tsx
import UserProfile from './UserProfile';

function App() {
  return (
    <UserProfile
      userId="user123"
      onUpdate={(user) => console.log('Updated:', user)}
      className="user-card"
    />
  );
}
\`\`\`

Would you like me to add any specific features or modify the styling?`,
      timestamp: "2:32 PM",
      codeBlocks: 2,
    },
  ])

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        type: "user",
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages([...messages, newMessage])
      setMessage("")

      // Simulate AI response with code
      setTimeout(() => {
        const aiResponse: Message = {
          id: messages.length + 2,
          type: "ai",
          content: generateAIResponse(message),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          codeBlocks: countCodeBlocks(generateAIResponse(message)),
        }
        setMessages((prev) => [...prev, aiResponse])
      }, 1000)
    }
  }

  const generateAIResponse = (userMessage: string): string => {
    const responses = [
      `Here's how you can implement that:

\`\`\`typescript
const solution = () => {
  console.log("Solution for: ${userMessage}");
  return "Success!";
};
\`\`\`

This should solve your problem. Let me know if you need any clarification!`,

      `I can help you with "${userMessage}". Here's a Python example:

\`\`\`python
def handle_request():
    """Handle the user request"""
    response = process_input("${userMessage}")
    return response

if __name__ == "__main__":
    result = handle_request()
    print(result)
\`\`\`

The function processes your input and returns a result.`,

      `For "${userMessage}", you might want to use this approach:

\`\`\`javascript
// Modern JavaScript solution
const handleTask = async (input) => {
  try {
    const result = await processData(input);
    console.log('Success:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
\`\`\`

This uses async/await for better error handling.`,
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handleThumbsUp = (messageId: number) => {
    console.log('Thumbs up for message:', messageId)
    // Implement feedback logic
  }

  const handleThumbsDown = (messageId: number) => {
    console.log('Thumbs down for message:', messageId)
    // Implement feedback logic
  }

  return (
    <Card className="h-[700px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Coding Assistant</h2>
          <Badge variant="secondary" className="text-xs">
            Enhanced with Code Snippets
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Automatic code formatting and syntax highlighting
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="group">
            {msg.type === "ai" ? (
              <AIMessage
                content={msg.content}
                isAI={true}
                authorName="AI Assistant"
                onThumbsUp={() => handleThumbsUp(msg.id)}
                onThumbsDown={() => handleThumbsDown(msg.id)}
              />
            ) : (
              <div className="flex gap-3 items-start justify-end">
                <div className="flex-1 min-w-0 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-1 justify-end">
                    <span className="text-sm font-medium">You</span>
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Suggestions */}
      <div className="p-4 border-t">
        <div className="flex gap-2 mb-3 overflow-x-auto">
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setMessage("Show me a React hook example")}
          >
            <Code className="h-3 w-3 mr-1" />
            React Hooks
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setMessage("Generate TypeScript types")}
          >
            TypeScript
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setMessage("Help me debug this error")}
          >
            Debug error
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setMessage("Optimize this function")}
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            Optimize
          </Button>
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything about coding..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}