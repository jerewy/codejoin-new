"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Brain, Loader2, AlertCircle, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useImprovedAIConversations } from "@/hooks/use-ai-conversations-improved";
import { AIMessage } from "@/lib/ai-conversation-service-improved";
import { aiChatService } from "@/lib/ai-chat-service";
import EnhancedAIMessage from "./enhanced-ai-message";
import FABPromptHelper from "./fab-prompt-helper";
import ResponsiveChatInput from "./chat-input-responsive";
import { defaultChatShortcuts, useChatShortcuts } from "./chat-input-shortcuts";

interface SimpleAIChatProps {
  projectId?: string;
  userId?: string;
  onStatusChange?: (status: {
    showProjectWarning: boolean;
    isUsingFallback: boolean;
    error: any;
    hasActiveConversation: boolean;
    messageCount: number;
  }) => void;
  enableRetry?: boolean;
  showConnectionStatus?: boolean;
}

export default function SimpleAIChatFixed({
  projectId: initialProjectId,
  userId,
  onStatusChange,
  enableRetry = true,
  showConnectionStatus = true
}: SimpleAIChatProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showThinkingIndicator, setShowThinkingIndicator] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [showProjectWarning, setShowProjectWarning] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize chat shortcuts
  const { shortcuts, handleShortcut } = useChatShortcuts([
    {
      keys: ['Esc'],
      description: 'Clear input',
      action: () => setMessage(""),
      category: 'Navigation',
    },
    {
      keys: ['Ctrl+Enter', 'Cmd+Enter'],
      description: 'Send message',
      action: () => handleSendMessage(),
      category: 'Actions',
    }
  ]);

  // Initialize conversation hook with improved error handling
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    isUsingFallback,
    isInitialized,
    hasActiveConversation,
    hasMessages,
    isOffline,
    getOrCreateConversation,
    addMessage,
    retryLastOperation
  } = useImprovedAIConversations({
    projectId,
    userId,
    autoLoad: true,
    onConversationCreated: (conversation) => {
      console.log('Conversation created:', conversation.id);
      if (onStatusChange) {
        onStatusChange({
          showProjectWarning,
          isUsingFallback: conversation.id.startsWith('local_'),
          error: null,
          hasActiveConversation: true,
          messageCount: 0
        });
      }
    },
    onMessageAdded: (message) => {
      console.log('Message added:', message.id);
      if (onStatusChange) {
        onStatusChange({
          showProjectWarning,
          isUsingFallback,
          error: null,
          hasActiveConversation: true,
          messageCount: messages.length + 1
        });
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      if (onStatusChange) {
        onStatusChange({
          showProjectWarning,
          isUsingFallback,
          error,
          hasActiveConversation,
          messageCount: messages.length
        });
      }
    }
  });

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

  // Initialize conversation when ready
  useEffect(() => {
    if (isInitialized && projectId && userId && !hasActiveConversation && !loading) {
      // Only create conversation if we don't have one
      const initializeConversation = async () => {
        try {
          await getOrCreateConversation("AI Assistant Chat");
        } catch (error) {
          console.error('Failed to initialize conversation:', error);
        }
      };
      initializeConversation();
    }
  }, [isInitialized, projectId, userId, hasActiveConversation, loading, getOrCreateConversation]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Notify parent component of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        showProjectWarning,
        isUsingFallback,
        error,
        hasActiveConversation,
        messageCount: messages.length
      });
    }
  }, [showProjectWarning, isUsingFallback, error, hasActiveConversation, messages.length, onStatusChange]);

  const handleSendMessage = useCallback(async () => {
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

    if (!currentConversation) {
      toast({
        title: "No Active Conversation",
        description: "Creating a new conversation...",
        variant: "default",
      });
      return;
    }

    setIsSending(true);
    setShowThinkingIndicator(true);
    setMessage("");
    setRetryCount(0);

    try {
      // Add user message to conversation
      await addMessage(currentConversation.id, {
        role: "user",
        content: trimmed,
        author_id: userId,
        metadata: {
          ai_request: true,
          timestamp: new Date().toISOString()
        },
      });

      // Call the AI backend API
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
          conversationId: currentConversation.id
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.success) {
        setShowThinkingIndicator(false);
        // Add AI response to conversation with metadata
        await addMessage(currentConversation.id, {
          role: "assistant",
          content: data.response,
          author_id: null,
          metadata: {
            ai_model: data.metadata?.model || "phi-3-mini-4k-instruct",
            ai_response_time_ms: responseTime,
            ai_tokens_used: data.metadata?.tokensUsed,
            provider: data.metadata?.provider || "Hugging Face"
          },
        });

        // Clear any existing errors on successful message
        if (error) {
          retryLastOperation?.();
        }
      } else {
        setShowThinkingIndicator(false);
        // Use fallback response if backend is unavailable
        const fallbackResponse = aiChatService.generateFallbackResponse(trimmed);
        await addMessage(currentConversation.id, {
          role: "assistant",
          content: fallbackResponse,
          author_id: null,
          metadata: {
            ai_model: "fallback",
            ai_response_time_ms: 0,
            fallback: true,
            error: data.error
          },
        });

        // Show appropriate toast message
        if (data.fallback) {
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

      // Use fallback response as last resort
      const fallbackResponse = aiChatService.generateFallbackResponse(message.trim());
      try {
        await addMessage(currentConversation.id, {
          role: "assistant",
          content: fallbackResponse,
          author_id: null,
          metadata: {
            ai_model: "fallback",
            ai_response_time_ms: 0,
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
        });
      } catch (fallbackError) {
        console.error('Failed to add fallback message:', fallbackError);
      }

      toast({
        title: "Connection Issue",
        description: "Using offline mode. Some features may be limited.",
        variant: "default",
      });
    } finally {
      setIsSending(false);
      setShowThinkingIndicator(false);
    }
  }, [
    message,
    projectId,
    userId,
    currentConversation,
    addMessage,
    toast,
    error,
    retryLastOperation
  ]);

  const handlePromptSelect = useCallback((prompt: string) => {
    setMessage(prompt);
  }, []);

  const handleRetry = useCallback(async () => {
    if (!currentConversation || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      setRetryCount(prev => prev + 1);

      // Remove the last failed assistant message if it exists
      const filteredMessages = messages.filter((msg, index) =>
        !(index === messages.length - 1 && msg.role === 'assistant')
      );

      // Resend the last user message
      setMessage(lastMessage.content);
      setTimeout(() => handleSendMessage(), 100);
    }
  }, [currentConversation, messages, handleSendMessage]);

  const handleRetryConnection = useCallback(() => {
    retryLastOperation?.();
    setRetryCount(0);
  }, [retryLastOperation]);

  // Enhanced send message handler with shortcuts
  const handleEnhancedSendMessage = useCallback(() => {
    if (!isSending) {
      handleSendMessage();
    }
  }, [isSending, handleSendMessage]);

  const canRetry = enableRetry && hasMessages && retryCount < 3 && !isSending;
  const showConnectionIndicator = showConnectionStatus && (isOffline || error);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Connection Status Indicator */}
      {showConnectionIndicator && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
          {isOffline ? (
            <>
              <WifiOff className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-600 dark:text-orange-400">
                Offline Mode - Changes saved locally
              </span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">
                Connection Error
              </span>
              {enableRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryConnection}
                  className="ml-auto h-6 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {loading && !hasMessages ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading conversation...</span>
              </div>
            </div>
          ) : !hasMessages ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-lg">
                Ask me anything about coding, debugging, or learning.
              </p>
              {showProjectWarning && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    No project selected. Using default project for this conversation.
                  </p>
                </div>
              )}
              <p className="text-muted-foreground text-xs mb-4">
                Click the sparkles button in the bottom-right to access prompt templates.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <EnhancedAIMessage key={msg.id || index} message={msg} />
              ))}
              {showThinkingIndicator && (
                <EnhancedAIMessage
                  message={{
                    id: 'thinking',
                    role: 'assistant',
                    content: '',
                    created_at: new Date().toISOString(),
                    conversation_id: currentConversation?.id || '',
                    author_id: null,
                    metadata: {}
                  }}
                  isTyping={true}
                />
              )}
              {canRetry && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry Last Message
                  </Button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ResponsiveChatInput
            value={message}
            onChange={setMessage}
            onSend={handleEnhancedSendMessage}
            disabled={isSending || loading}
            isLoading={isSending}
            placeholder="Ask me anything about coding... Press Shift+Enter for new lines"
            showAttachmentButton={false}
            showVoiceButton={false}
            className="transition-all duration-200"
          />

          {/* Show prompt helper when message is empty */}
          {!message && hasMessages && (
            <div className="mt-3 flex justify-center">
              <p className="text-muted-foreground text-xs">
                Click the sparkles button in the bottom-right to access prompt templates.
              </p>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          {message.length === 0 && !hasMessages && (
            <div className="mt-3 flex justify-center">
              <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Enter</kbd>
                  Send
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Shift+Enter</kbd>
                  New line
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Esc</kbd>
                  Clear
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAB Prompt Helper */}
      <FABPromptHelper onPromptSelect={handlePromptSelect} />
    </div>
  );
}