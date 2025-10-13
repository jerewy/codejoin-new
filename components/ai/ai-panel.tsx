/**
 * AI Panel Component
 * Extracted from project-workspace.tsx to improve code organization
 */

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
} from "lucide-react";
import { useAIConversations } from "@/hooks/use-ai-conversations";
import { useUser } from "@/hooks/use-user";
import SimpleAIChat from "@/components/simple-ai-chat";

interface AIPanelProps {
  projectId: string;
  conversationId: string | null;
  initialMessages: any[];
  className?: string;
}

export default function AIPanel({
  projectId,
  conversationId,
  initialMessages,
  className
}: AIPanelProps) {
  const { user } = useUser();
  const userId = user?.id;

  // AI state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isAIVoiceActive, setIsAIVoiceActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // AI Conversation hook
  const {
    conversations,
    currentConversation,
    messages: aiMessages,
    loading: isAILoading,
    error: aiError,
    getOrCreateConversation,
    addMessage,
    loadConversation,
    clearCurrentConversation,
    createConversation,
  } = useAIConversations({
    projectId,
    userId,
    autoLoad: true,
  });

  const handleSendMessage = async () => {
    if (!aiMessage.trim() || isAIThinking || !userId) return;

    const messageContent = aiMessage.trim();
    setAiMessage("");
    setIsAIThinking(true);

    try {
      // Ensure we have a conversation
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await getOrCreateConversation({
          title: "AI Assistant",
          projectId,
        });
      }

      // Add user message
      await addMessage({
        conversationId: conversation.id,
        content: messageContent,
        role: "user",
      });

    } catch (error) {
      console.error("Failed to send AI message:", error);
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleVoiceToggle = () => {
    setIsMicOn(!isMicOn);
    // TODO: Implement voice functionality
  };

  const handleSpeakerToggle = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // TODO: Implement speaker functionality
  };

  const handleClearConversation = () => {
    clearCurrentConversation();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`h-full flex flex-col bg-background border-l ${className}`}>
      {/* AI Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="text-sm font-medium">AI Assistant</span>
          {isAIThinking && (
            <Badge variant="secondary" className="text-xs">
              Thinking...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceToggle}
            className="h-6 w-6 p-0"
            title={isMicOn ? "Mute microphone" : "Unmute microphone"}
          >
            {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSpeakerToggle}
            className="h-6 w-6 p-0"
            title={isSpeakerOn ? "Mute speaker" : "Unmute speaker"}
          >
            {isSpeakerOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearConversation}
            className="h-6 w-6 p-0"
            title="Clear conversation"
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* AI Messages */}
      <div className="flex-1 overflow-hidden">
        <SimpleAIChat
          messages={aiMessages}
          onSendMessage={handleSendMessage}
          isLoading={isAIThinking || isAILoading}
          className="h-full"
        />
      </div>

      {/* AI Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI anything about your code..."
            disabled={isAIThinking || isAILoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!aiMessage.trim() || isAIThinking || isAILoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {aiError && (
        <div className="p-3 border-t bg-destructive/10">
          <p className="text-sm text-destructive">
            AI Error: {aiError.message}
          </p>
        </div>
      )}
    </div>
  );
}