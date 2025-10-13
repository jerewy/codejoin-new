"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Brain, Loader2, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAIConversations } from "@/hooks/use-unified-ai-conversations";
import { useChatKeyboardShortcuts, defaultChatShortcuts } from "@/hooks/use-chat-keyboard-shortcuts";
import { AIMessage } from "@/lib/ai-conversation-service";
import EnhancedAIMessage from "./enhanced-ai-message";
import FABPromptHelper from "./fab-prompt-helper";
import ResponsiveChatInput from "./chat-input-responsive";
import ChatControls from "./chat-controls";
import ConnectionStatusIndicator from "./connection-status";

interface SimpleAIChatUnifiedProps {
  projectId?: string;
  userId?: string;
  onStatusChange?: (status: {
    connectionStatus: any;
    error: any;
  }) => void;
}

export default function SimpleAIChatUnified({
  projectId: initialProjectId,
  userId,
  onStatusChange
}: SimpleAIChatUnifiedProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [showThinkingIndicator, setShowThinkingIndicator] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Use the unified conversations hook
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    connectionStatus,
    loadConversations,
    loadConversation,
    createConversation,
    sendMessage,
    clearConversation,
    archiveConversation,
    clearAllConversations,
    archiveAllConversations,
    hasConversations,
    currentMessageCount,
    isOnline,
    isLimited,
    isOffline,
  } = useUnifiedAIConversations({
    projectId,
    userId,
    autoLoad: true,
  });

  // Initialize keyboard shortcuts
  const { shortcuts } = useChatKeyboardShortcuts([
    {
      keys: ['Esc'],
      description: 'Clear input',
      action: () => setMessage(""),
      category: 'editing'
    },
    {
      keys: ['Ctrl', 'l'],
      description: 'Clear current conversation',
      action: () => {
        if (currentMessageCount > 0) {
          clearConversation();
        }
      },
      category: 'conversation'
    },
    {
      keys: ['Ctrl', 'n'],
      description: 'New conversation',
      action: () => createConversation("AI Assistant Chat"),
      category: 'navigation'
    },
    {
      keys: ['Ctrl', 'Enter'],
      description: 'Send message',
      action: () => {
        if (message.trim()) {
          handleSendMessage();
        }
      },
      category: 'editing'
    }
  ]);

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

  // Auto-create conversation when we have projectId and userId
  useEffect(() => {
    if (projectId && userId && !currentConversation && !loading) {
      createConversation("AI Assistant Chat");
    }
  }, [projectId, userId, currentConversation, loading, createConversation]);

  // Notify parent component of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        connectionStatus,
        error,
      });
    }
  }, [connectionStatus, error, onStatusChange]);

  // Enhanced scroll to bottom functionality
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (messagesContainerRef.current) {
      // Fallback: scroll container to bottom
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }

    // Hide scroll to bottom button when scrolling to bottom
    if (force) {
      setShowScrollToBottom(false);
    }
  }, []);

  // Handle scroll detection to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      setShowScrollToBottom(!isAtBottom && messages.length > 0);
    }
  }, [messages.length]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    // Add a small delay to ensure content has rendered
    const timeoutId = setTimeout(() => {
      scrollToBottom(true); // Force scroll and hide button
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Scroll when thinking indicator appears/disappears
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom(true);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [showThinkingIndicator, scrollToBottom]);

  // Scroll to bottom when chat loads (for existing conversations)
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        scrollToBottom(true);
      }, 300); // Longer delay for initial load

      return () => clearTimeout(timeoutId);
    }
  }, [loading, messages.length, scrollToBottom]);

  // Add scroll event listener for scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initial scroll check
      handleScroll();

      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

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

    if (!userId) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to use the AI Assistant.",
        variant: "destructive",
      });
      return;
    }

    setShowThinkingIndicator(true);
    setMessage("");

    try {
      const result = await sendMessage(trimmed);
      if (!result) {
        toast({
          title: "Send Failed",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Send Error",
        description: "An error occurred while sending your message.",
        variant: "destructive",
      });
    } finally {
      setShowThinkingIndicator(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setMessage(prompt);
  };

  const handleNewChat = async () => {
    await createConversation("AI Assistant Chat");
  };

  const handleExportChat = () => {
    const chatData = {
      exportDate: new Date().toISOString(),
      conversationId: currentConversation?.id,
      messageCount: messages.length,
      isOnline,
      connectionStatus: connectionStatus.status,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        aiModel: msg.ai_model,
        responseTime: msg.ai_response_time_ms
      }))
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${currentConversation?.id || 'unknown'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Chat exported",
      description: "Chat data has been exported successfully.",
    });
  };

  // Enhanced send message handler with shortcuts
  const handleEnhancedSendMessage = () => {
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with connection status and controls */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">AI Assistant</h1>
              </div>

              {/* Connection Status */}
              <ConnectionStatusIndicator
                status={connectionStatus}
                showLabel={true}
                size="sm"
              />

              {/* Message count badge */}
              {currentMessageCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {currentMessageCount} messages
                </Badge>
              )}
            </div>

            {/* Chat Controls */}
            <ChatControls
              onClearCurrent={clearConversation}
              onArchiveCurrent={archiveConversation}
              onClearAll={clearAllConversations}
              onArchiveAll={archiveAllConversations}
              onNewChat={handleNewChat}
              messageCount={currentMessageCount}
              isOnline={isOnline}
              disabled={loading}
            />
          </div>

          {/* Status message */}
          {isLimited && (
            <div className="mt-2 text-xs text-muted-foreground">
              💡 Limited mode - messages will sync when connection is restored
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading conversation...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-lg">
                Ask me anything about coding, debugging, or learning.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ConnectionStatusIndicator status={connectionStatus} size="sm" />
                <span>•</span>
                <span>Press Ctrl+L to clear chat</span>
                <span>•</span>
                <span>Press Ctrl+N for new chat</span>
              </div>
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

      {/* Enhanced Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ResponsiveChatInput
            value={message}
            onChange={setMessage}
            onSend={handleEnhancedSendMessage}
            disabled={loading || !connectionStatus.capabilities.canSendMessage}
            isLoading={loading || showThinkingIndicator}
            placeholder={
              connectionStatus.capabilities.canUseFullAI
                ? "Ask me anything about coding... Press Ctrl+Enter to send"
                : "Type your message (offline mode)... Press Ctrl+Enter to send"
            }
            showAttachmentButton={false}
            showVoiceButton={false}
            className="transition-all duration-200"
          />

          {/* Keyboard shortcuts hint */}
          {message.length === 0 && messages.length === 0 && (
            <div className="mt-3 flex justify-center">
              <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Ctrl+Enter</kbd>
                  Send
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Esc</kbd>
                  Clear
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Ctrl+L</kbd>
                  Clear Chat
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Ctrl+N</kbd>
                  New Chat
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <div className="fixed bottom-24 right-8 z-40">
          <Button
            onClick={() => scrollToBottom(true)}
            size="sm"
            className="rounded-full w-10 h-10 p-0 shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
            title="Scroll to latest message"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* FAB Prompt Helper */}
      <FABPromptHelper onPromptSelect={handlePromptSelect} />
    </div>
  );
}