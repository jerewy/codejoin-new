"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Brain, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAIConversations } from "@/hooks/use-ai-conversations";
import { AIMessage } from "@/lib/ai-conversation-service";
import { aiChatService } from "@/lib/ai-chat-service";
import CleanAIMessage from "./clean-ai-message";
import PromptHelper from "./prompt-helper";

interface SimpleAIChatProps {
  projectId?: string;
  userId?: string;
}

export default function SimpleAIChat({ projectId, userId }: SimpleAIChatProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Use existing AI conversations hook
  const {
    messages,
    loading,
    error,
    getOrCreateConversation,
    addMessage,
  } = useAIConversations({
    projectId,
    userId,
    autoLoad: true,
  });

  // Initialize conversation
  useEffect(() => {
    if (projectId && userId) {
      getOrCreateConversation("AI Assistant Chat");
    }
  }, [projectId, userId, getOrCreateConversation]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || !projectId) return;

    setIsSending(true);
    setMessage("");

    try {
      // Get current conversation or create new one
      const conversation = await getOrCreateConversation("AI Assistant Chat");
      if (!conversation) {
        throw new Error("Failed to create conversation");
      }

      // Add user message
      await addMessage(conversation.id, {
        role: "user",
        content: trimmed,
        metadata: {
          ai_request: true,
        },
      });

      // Generate AI response
      try {
        const aiResponse = await aiChatService.sendMessage(trimmed, {
          projectId,
          conversationId: conversation.id
        });

        if (aiResponse.success && aiResponse.response) {
          await addMessage(conversation.id, {
            role: "assistant",
            content: aiResponse.response,
            metadata: {
              ai_model: "gemini-pro-2.5",
              ai_response_time_ms: 1500,
            },
          });
        } else {
          // Use fallback response if backend is unavailable
          const fallbackResponse = aiChatService.generateFallbackResponse(trimmed);
          await addMessage(conversation.id, {
            role: "assistant",
            content: fallbackResponse,
            metadata: {
              ai_model: "fallback",
              ai_response_time_ms: 0,
              fallback: true
            },
          });

          // Show toast about fallback mode
          if (aiResponse.fallback) {
            setIsUsingFallback(true);
            toast({
              title: "Using Offline Mode",
              description: "AI service is temporarily unavailable. Using basic responses.",
              variant: "default",
            });
          } else {
            toast({
              title: "AI Response Error",
              description: aiResponse.error || "Failed to get AI response. Please try again.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Failed to generate AI response:", error);

        // Use fallback response as last resort
        const fallbackResponse = aiChatService.generateFallbackResponse(trimmed);
        await addMessage(conversation.id, {
          role: "assistant",
          content: fallbackResponse,
          metadata: {
            ai_model: "fallback",
            ai_response_time_ms: 0,
            fallback: true
          },
        });

        setIsUsingFallback(true);
        toast({
          title: "Connection Issue",
          description: "Using offline mode. Some features may be limited.",
          variant: "default",
        });
      }

    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setMessage(prompt);
  };

  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">AI Assistant</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary text-xs py-0.5">
              <Brain className="h-3 w-3 mr-1" />
              Gemini Pro 2.5
            </Badge>
            {isUsingFallback && (
              <Badge variant="secondary" className="text-xs py-0.5">
                <AlertCircle className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            {error && (
              <Badge variant="destructive" className="text-xs py-0.5">
                Error
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area - More compact */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading conversation...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">AI Assistant</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-md">
                Ask me anything about coding, debugging, or learning.
              </p>
              <PromptHelper onPromptSelect={handlePromptSelect} />
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <CleanAIMessage key={msg.id || index} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Compact Input Area */}
      <div className="border-t bg-background">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Ask me anything about coding..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending || loading}
                className="h-10 resize-none"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending || loading}
              size="sm"
              className="h-10 px-4"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Show prompt helper when message is empty */}
          {!message && messages.length > 0 && (
            <div className="mt-2">
              <PromptHelper onPromptSelect={handlePromptSelect} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}