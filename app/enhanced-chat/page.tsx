import EnhancedAIChat from "@/components/enhanced-ai-chat"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Enhanced AI Chat Demo",
  description: "AI chat interface with automatic code formatting and syntax highlighting.",
}

export default function EnhancedChatPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Enhanced AI Chat Demo</h1>
          <p className="text-muted-foreground">
            Experience the power of automatic code formatting in AI conversations
          </p>
        </div>
        <EnhancedAIChat />
      </div>
    </div>
  )
}