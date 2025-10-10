"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Brain, Loader2, ArrowDown, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSimpleChat } from "@/hooks/use-simple-chat";
import ResponsiveChatInput from "./chat-input-responsive";
import FABPromptHelper from "./fab-prompt-helper";

interface SimpleChatProps {
  projectId?: string;
  userId?: string;
}

export default function SimpleChat({ projectId, userId }: SimpleChatProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Use the simple chat hook
  const {
    messages,
    isLoading,
    currentTitle,
    sendMessage,
    clearConversation,
    createNewConversation,
    hasMessages,
    messageCount
  } = useSimpleChat(projectId);

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

  // Scroll to bottom when chat loads (for existing conversations)
  useEffect(() => {
    if (hasMessages) {
      const timeoutId = setTimeout(() => {
        scrollToBottom(true);
      }, 300); // Longer delay for initial load

      return () => clearTimeout(timeoutId);
    }
  }, [hasMessages, scrollToBottom]);

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

    setMessage("");
    await sendMessage(trimmed);
  };

  const handlePromptSelect = (prompt: string) => {
    setMessage(prompt);
  };

  const handleClearChat = () => {
    clearConversation();
  };

  const handleNewChat = () => {
    createNewConversation();
    setMessage("");
  };

  // Enhanced send message handler with keyboard shortcuts
  const handleEnhancedSendMessage = () => {
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">{currentTitle}</h1>
              </div>

              {/* Message count badge */}
              {messageCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {messageCount} messages
                </Badge>
              )}
            </div>

            {/* Chat Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                New Chat
              </Button>

              {messageCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearChat}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {messages.length === 0 ? (
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>• Press Enter to send</span>
                <span>• Press Shift+Enter for new lines</span>
                <span>• Press Ctrl+L to clear chat</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    {msg.metadata && (
                      <div className="text-xs opacity-70 mt-1">
                        {msg.metadata.model && (
                          <span>{msg.metadata.model}</span>
                        )}
                        {msg.metadata.responseTime && (
                          <span className="ml-2">{msg.metadata.responseTime}ms</span>
                        )}
                        {msg.metadata.fallback && (
                          <span className="ml-2 text-yellow-500">⚠️ Offline</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
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
            disabled={isLoading}
            isLoading={isLoading}
            placeholder="Ask me anything about coding... Press Shift+Enter for new lines"
            showAttachmentButton={false}
            showVoiceButton={false}
            className="transition-all duration-200"
          />

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