"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Brain, Loader2, AlertCircle, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAIConversations } from "@/hooks/use-ai-conversations";
import { AIMessage } from "@/lib/ai-conversation-service";
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
  }) => void;
}

export default function SimpleAIChat({ projectId: initialProjectId, userId, onStatusChange }: SimpleAIChatProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [showThinkingIndicator, setShowThinkingIndicator] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [showProjectWarning, setShowProjectWarning] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Initialize chat shortcuts
  const { shortcuts, handleShortcut } = useChatShortcuts([
    {
      keys: ['Esc'],
      description: 'Clear input',
      action: () => setMessage(""),
      category: 'Navigation',
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
    reloadCurrentConversationMessages,
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

  // Debug: Log message changes to help with debugging
  useEffect(() => {
    console.log('DEBUG: Messages updated in chat component:', {
      messageCount: messages.length,
      messageIds: messages.map(m => m.id),
      projectId,
      userId
    });
  }, [messages, projectId, userId]);

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

  // Notify parent component of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        showProjectWarning,
        isUsingFallback,
        error,
      });
    }
  }, [showProjectWarning, isUsingFallback, error, onStatusChange]);

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
      console.log('DEBUG: No projectId provided, using default');
      setProjectId(actualProjectId);
      toast({
        title: "Using Default Project",
        description: "No project selected. Using default project for AI Assistant.",
        variant: "default",
      });
    }

    if (!userId) {
      console.error('DEBUG: No userId provided for message sending');
      toast({
        title: "Sign In Required",
        description: "Please sign in to use the AI Assistant.",
        variant: "destructive",
      });
      return;
    }

    console.log('DEBUG: Starting message send:', {
      actualProjectId,
      userId,
      messageLength: trimmed.length
    });

    setIsSending(true);
    setShowThinkingIndicator(true);
    setMessage("");

    let conversation;
    try {
      // Get current conversation or create new one
      console.log('DEBUG: Attempting to get/create conversation...');
      conversation = await getOrCreateConversation("AI Assistant Chat");

      if (!conversation) {
        console.error('DEBUG: Failed to get/create conversation');
        throw new Error("Failed to create conversation");
      }

      console.log('DEBUG: Conversation ready:', {
        conversationId: conversation.id,
        isLocal: conversation.id.startsWith('local_')
      });

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
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setMessage(prompt);
  };

  
  // Enhanced send message handler with shortcuts
  const handleEnhancedSendMessage = () => {
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area - More compact */}
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
            disabled={isSending || loading}
            isLoading={isSending}
            placeholder="Ask me anything about coding... Press Shift+Enter for new lines"
            showAttachmentButton={false}
            showVoiceButton={false}
            className="transition-all duration-200"
          />

          {/* Show prompt helper when message is empty */}
          {!message && messages.length > 0 && (
            <div className="mt-3 flex justify-center">
              <p className="text-muted-foreground text-xs">
                Click the sparkles button in the bottom-right to access prompt templates.
              </p>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          {message.length === 0 && messages.length === 0 && (
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