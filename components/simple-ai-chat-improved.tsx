"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Brain, Loader2, AlertCircle, Settings, History, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAIConversations } from "@/hooks/use-ai-conversations";
import { AIMessage } from "@/lib/ai-conversation-service";
import { aiChatService } from "@/lib/ai-chat-service";
import EnhancedAIMessageImproved from "./enhanced-ai-message-improved";
import EnhancedPromptHelperImproved from "./enhanced-prompt-helper-improved";

interface SimpleAIChatProps {
  projectId?: string;
  userId?: string;
  className?: string;
}

export default function SimpleAIChatImproved({
  projectId: initialProjectId,
  userId,
  className
}: SimpleAIChatProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [showThinkingIndicator, setShowThinkingIndicator] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [showProjectWarning, setShowProjectWarning] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // Initialize projectId from props
  useEffect(() => {
    setProjectId(initialProjectId || null);
  }, [initialProjectId]);

  // Try to get projectId from localStorage if not provided
  useEffect(() => {
    if (!projectId && typeof window !== 'undefined') {
      try {
        const currentProject = localStorage.getItem('current_project_id');
        if (currentProject) {
          setProjectId(currentProject);
        }
      } catch (error) {
        // Silently handle localStorage access errors
      }
    }
  }, [projectId]);

  // Check for missing projectId
  useEffect(() => {
    if (!projectId && userId) {
      setShowProjectWarning(true);
    } else {
      setShowProjectWarning(false);
    }
  }, [projectId, userId]);

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

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    const trimmed = message.trim();

    if (!trimmed) {
      toast({
        title: "Empty Message",
        description: "Please enter a message before sending.",
        variant: "destructive",
      });
      return;
    }

    // Use fallback projectId if needed
    const actualProjectId = projectId || "default-project";

    if (!projectId) {
      // Try to use a default project ID or continue without one
      setProjectId(actualProjectId);
      toast({
        title: "Using Default Project",
        description: "No project selected. Using default project for AI Assistant.",
        variant: "default",
      });
    }

    if (!userId) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to use the AI Assistant.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setShowThinkingIndicator(true);
    setMessage("");

    let conversation;
    try {
      // Get current conversation or create new one
      conversation = await getOrCreateConversation("AI Assistant Chat");
      if (!conversation) {
        throw new Error("Failed to create conversation");
      }

      // Add user message to database
      await addMessage(conversation.id, {
        role: "user",
        content: trimmed,
        author_id: userId,
        metadata: {
          ai_request: true,
        },
      });

      // Call the AI backend API directly (same approach as project workspace)
      const startTime = Date.now();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          context: "AI Assistant Chat",
          projectId: actualProjectId,
          conversationId: conversation.id
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.success) {
        setShowThinkingIndicator(false);
        // Add AI response to database with metadata
        await addMessage(conversation.id, {
          role: "assistant",
          content: data.response,
          author_id: null,
          metadata: {
            ai_model: data.metadata?.model || "gemini-1.5-flash",
            ai_response_time_ms: responseTime,
            ai_tokens_used: data.metadata?.tokensUsed,
          },
        });
      } else {
        setShowThinkingIndicator(false);
        // Use fallback response if backend is unavailable
        const fallbackResponse = aiChatService.generateFallbackResponse(trimmed);
        await addMessage(conversation.id, {
          role: "assistant",
          content: fallbackResponse,
          author_id: null,
          metadata: {
            ai_model: "fallback",
            ai_response_time_ms: 0,
            fallback: true
          },
        });

        // Show toast about fallback mode
        if (data.fallback) {
          setIsUsingFallback(true);
          toast({
            title: "Using Offline Mode",
            description: "AI service is temporarily unavailable. Using basic responses.",
            variant: "default",
          });
        } else {
          toast({
            title: "AI Response Error",
            description: data.error || "Failed to get AI response. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setShowThinkingIndicator(false);

      // Try to get or create conversation if not available
      if (!conversation) {
        conversation = await getOrCreateConversation("AI Assistant Chat");
      }

      // Use fallback response as last resort
      const fallbackResponse = aiChatService.generateFallbackResponse(message.trim());
      if (conversation) {
        await addMessage(conversation.id, {
          role: "assistant",
          content: fallbackResponse,
          author_id: null,
          metadata: {
            ai_model: "fallback",
            ai_response_time_ms: 0,
            fallback: true
          },
        });
      }

      setIsUsingFallback(true);
      toast({
        title: "Connection Issue",
        description: "Using offline mode. Some features may be limited.",
        variant: "default",
      });
    } finally {
      setIsSending(false);
      setShowThinkingIndicator(false);
      // Refocus input after sending
      inputRef.current?.focus();
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setMessage(prompt);
    inputRef.current?.focus();
  };

  const handlePromptSend = (prompt: string) => {
    setMessage(prompt);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRegenerateResponse = async () => {
    // Find the last user message
    const lastUserMessage = messages.slice().reverse().find(msg => msg.role === "user");
    if (lastUserMessage) {
      setMessage(lastUserMessage.content);
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    toast({
      title: "Feedback Recorded",
      description: `Thank you for your ${type} feedback!`,
      variant: "default",
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Compact Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">AI Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary text-xs py-0.5 border-primary/20">
              Gemini Pro 2.5
            </Badge>
            {showProjectWarning && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs py-0.5">
                <AlertCircle className="h-3 w-3 mr-1" />
                Default Project
              </Badge>
            )}
            {isUsingFallback && (
              <Badge variant="secondary" className="text-xs py-0.5 bg-muted">
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading conversation...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI Assistant</h3>
              <p className="text-muted-foreground text-sm mb-8 max-w-md">
                Ask me anything about coding, debugging, or learning. I'm here to help you write better code.
              </p>

              {/* Quick Start Suggestions */}
              <div className="w-full max-w-lg">
                <Card className="p-4 bg-muted/30 border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium text-foreground">Quick Start</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePromptSend("Explain this React component: [paste your code here]")}
                      className="justify-start h-auto p-3 text-left border-border hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-medium">📖 Explain Code</span>
                      <span className="text-xs text-muted-foreground block mt-1">
                        Get detailed explanations of code functionality
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePromptSend("Help me debug this error: [describe your issue]")}
                      className="justify-start h-auto p-3 text-left border-border hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-medium">🐛 Debug Issue</span>
                      <span className="text-xs text-muted-foreground block mt-1">
                        Identify and fix bugs in your code
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePromptSend("Optimize this code for better performance: [paste your code]")}
                      className="justify-start h-auto p-3 text-left border-border hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-medium">⚡ Optimize Performance</span>
                      <span className="text-xs text-muted-foreground block mt-1">
                        Improve code efficiency and speed
                      </span>
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <EnhancedAIMessageImproved
                  key={msg.id || index}
                  message={msg}
                  onRegenerate={index === messages.length - 1 ? handleRegenerateResponse : undefined}
                  onFeedback={handleFeedback}
                />
              ))}
              {showThinkingIndicator && (
                <EnhancedAIMessageImproved
                  message={{
                    id: 'thinking',
                    role: 'assistant',
                    content: '',
                    created_at: new Date().toISOString(),
                    conversation_id: '',
                    author_id: null,
                    metadata: {}
                  }}
                  isTyping={true}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                ref={inputRef}
                placeholder="Ask me anything about coding..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                disabled={isSending || loading}
                className="h-10 resize-none bg-background border-border focus:border-primary"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending || loading}
              size="sm"
              className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Helper text when message is empty */}
          {!message && messages.length > 0 && (
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send,
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs ml-1">Shift+Enter</kbd> for new line
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Quick Use Button */}
      <EnhancedPromptHelperImproved
        onPromptSelect={handlePromptSelect}
        onPromptSend={handlePromptSend}
      />
    </div>
  );
}