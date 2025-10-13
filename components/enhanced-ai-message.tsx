"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Brain, User, Copy, Check, Bot, Loader2, Clock, Zap } from "lucide-react";
import { AIMessage } from "@/lib/ai-conversation-service";
import { useState, useEffect } from "react";

interface EnhancedAIMessageProps {
  message: AIMessage;
  isTyping?: boolean;
}

export default function EnhancedAIMessage({ message, isTyping = false }: EnhancedAIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [displayedContent, setDisplayedContent] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Ensure message has valid timestamp
  const validatedMessage = validateMessageTimestamp(message);
  const isAI = validatedMessage.role === "assistant";
  const isUser = validatedMessage.role === "user";

  // Typing animation effect for AI messages
  useEffect(() => {
    if (isAI && !isTyping && validatedMessage.content) {
      setIsAnimating(true);
      setDisplayedContent("");

      let currentIndex = 0;
      const content = validatedMessage.content;

      const typeWriter = () => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.substring(0, currentIndex + 1));
          currentIndex++;
          setTimeout(typeWriter, 20); // Adjust typing speed here
        } else {
          setIsAnimating(false);
        }
      };

      typeWriter();
    } else if (!isAI) {
      setDisplayedContent(validatedMessage.content);
    }
  }, [isAI, isTyping, validatedMessage.content]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(validatedMessage.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const formatContent = (content: string) => {
    // Enhanced code block detection and formatting
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: "code",
        language: match[1] || "text",
        content: match[2],
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }

    // If no code blocks found, return entire content as text
    if (parts.length === 0) {
      parts.push({
        type: "text",
        content,
      });
    }

    return parts;
  };

  const contentParts = formatContent(isTyping ? "" : displayedContent);
  const shouldShowCursor = isAnimating && isAI;

  // AI thinking indicator component
  const ThinkingIndicator = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
      </div>
      <span className="italic">AI is thinking...</span>
    </div>
  );

  if (isTyping) {
    return (
      <div className="flex gap-4 flex-row">
        {/* AI Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Thinking Indicator */}
        <div className="flex-1 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">AI Assistant</span>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              <Brain className="h-3 w-3 mr-1" />
              Gemini
            </Badge>
            </div>

          <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <ThinkingIndicator />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${isAI ? "flex-row" : "flex-row-reverse"} mb-6`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-105",
          isAI
            ? "bg-gradient-to-br from-blue-500 to-purple-600"
            : "bg-gradient-to-br from-gray-400 to-gray-600"
        )}>
          {isAI ? (
            <Bot className="h-5 w-5 text-white" />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-4xl ${isUser ? "text-right" : ""}`}>
        {/* Message Header */}
        <div className={`flex items-center gap-2 mb-2 ${isUser ? "justify-end" : ""}`}>
          <span className="text-sm font-semibold text-foreground">
            {isAI ? "AI Assistant" : "You"}
          </span>

          {isAI && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              <Brain className="h-3 w-3 mr-1" />
              {message.metadata?.ai_model || "Gemini"}
            </Badge>
          )}

  
          {message.metadata?.ai_response_time_ms && (
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
              <Clock className="h-3 w-3 mr-1" />
              {Math.round(message.metadata.ai_response_time_ms / 1000)}s
            </Badge>
          )}

          {message.metadata?.ai_tokens_used && (
            <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800">
              <Zap className="h-3 w-3 mr-1" />
              {message.metadata.ai_tokens_used} tokens
            </Badge>
          )}

          {message.metadata?.fallback && (
            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
              <Clock className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>

        {/* Message Bubble */}
        <Card className={cn(
          "p-4 shadow-sm border transition-all duration-200 hover:shadow-md",
          isAI
            ? "bg-card border-border rounded-2xl rounded-tl-sm"
            : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary rounded-2xl rounded-tr-sm"
        )}>
          <div className="space-y-3">
            {contentParts.map((part, index) => (
              <div key={index}>
                {part.type === "text" ? (
                  <div className={cn(
                    "whitespace-pre-wrap leading-relaxed text-sm",
                    isAI ? "text-card-foreground" : "text-primary-foreground"
                  )}>
                    {part.content}
                    {shouldShowCursor && index === contentParts.length - 1 && (
                      <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                    )}
                  </div>
                ) : (
                  <div className={cn(
                    "rounded-lg p-3 border",
                    isAI
                      ? "bg-muted border-border"
                      : "bg-primary/10 border-primary/30"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={isAI ? "outline" : "secondary"} className="text-xs">
                        {part.language}
                      </Badge>
                      <button
                        onClick={copyToClipboard}
                        className={cn(
                          "text-xs hover:transition-colors flex items-center gap-1",
                          isAI
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-primary-foreground/80 hover:text-primary-foreground"
                        )}
                      >
                        {copied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <pre className={cn(
                      "text-sm overflow-x-auto",
                      isAI ? "text-card-foreground" : "text-foreground"
                    )}>
                      <code>{part.content}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Message Actions */}
        <div className={`flex gap-3 mt-2 ${isUser ? "justify-end" : ""}`}>
          <button
            onClick={copyToClipboard}
            className={cn(
              "text-xs hover:transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-muted",
              isAI
                ? "text-muted-foreground hover:text-foreground"
                : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/20"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>

          {isAI && message.metadata?.ai_response_time_ms && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {message.metadata.ai_response_time_ms}ms
            </div>
          )}
        </div>
      </div>
    </div>
  );
}