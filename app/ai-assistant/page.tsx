"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Brain } from "lucide-react"
import SimpleAIChat from "@/components/simple-ai-chat"
import { useAuthStatus } from "@/hooks/useAuthStatus"

export default function AIAssistantPage() {
  const { user } = useAuthStatus();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Compact page header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">AI Assistant</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary text-xs py-0.5">
              <Brain className="h-3 w-3 mr-1" />
              Gemini Pro 2.5
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <SimpleAIChat
          projectId={user?.user_metadata?.current_project_id || undefined}
          userId={user?.id || undefined}
        />
      </div>
    </div>
  );
}
