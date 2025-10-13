"use client";

import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertCircle } from "lucide-react";
import SimpleChat from "@/components/simple-chat";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useUser } from "@/hooks/use-user";

export default function AIAssistantPage() {
  const { isLoggedIn } = useAuthStatus();
  const { user, loading: userLoading } = useUser();

  // State for AI Assistant status
  const [aiStatus, setAiStatus] = useState({
    connectionStatus: null,
    error: null,
  });

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center px-2 py-1 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading user data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if user is not authenticated
  if (!isLoggedIn || !user) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center px-2 py-1 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h2 className="text-xl font-semibold mb-2">
              Please Sign In
            </h2>
            <p className="text-muted-foreground mb-4">
              You need to be signed in to use the AI Assistant.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Extract projectId and userId
  const projectId = user?.user_metadata?.current_project_id;
  const userId = user?.id;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Simplified page header */}
      <div className="flex items-center px-3 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger />
        <h1 className="text-base sm:text-lg font-semibold ml-3">AI Assistant</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <SimpleChat
          projectId={projectId}
          userId={userId}
        />
      </div>
    </div>
  );
}
