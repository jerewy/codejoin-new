"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, User, Copy, Check, Bot, Loader2, Clock, Zap, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { AIMessage } from "@/lib/ai-conversation-service";
import { useState, useEffect } from "react";

interface EnhancedAIMessageProps {
  message: AIMessage;
  isTyping?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
}

export default function EnhancedAIMessageImproved({
  message,
  isTyping = false,
  onRegenerate,
  onFeedback
}: EnhancedAIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [displayedContent, setDisplayedContent] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

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
          setTimeout(typeWriter, 15); // Slightly faster typing
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

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    onFeedback?.(type);
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
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        {/* Thinking Indicator */}
        <div className="flex-1 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-foreground">AI Assistant</span>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              <Brain className="h-3 w-3 mr-1" />
              Gemini
            </Badge>
            </div>

          <Card className="p-4 bg-muted/30 border-border">
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
            ? "bg-gradient-to-br from-primary to-primary/80"
            : "bg-gradient-to-br from-muted to-muted/60"
        )}>
          {isAI ? (
            <Bot className="h-5 w-5 text-primary-foreground" />
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
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
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
              <Clock className="h-3 w-3 mr-1" />
              {Math.round(message.metadata.ai_response_time_ms / 1000)}s
            </Badge>
          )}

          {message.metadata?.ai_tokens_used && (
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
              <Zap className="h-3 w-3 mr-1" />
              {message.metadata.ai_tokens_used} tokens
            </Badge>
          )}

          {message.metadata?.fallback && (
            <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
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
            : "bg-primary text-primary-foreground border-primary rounded-2xl rounded-tr-sm"
        )}>
          <div className="space-y-3">
            {contentParts.map((part, index) => (
              <div key={index}>
                {part.type === "text" ? (
                  <div className={cn(
                    "whitespace-pre-wrap leading-relaxed text-sm",
                    isAI ? "text-foreground" : "text-primary-foreground"
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
                      ? "bg-muted/50 border-border"
                      : "bg-primary/20 border-primary/40"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={isAI ? "secondary" : "outline"} className="text-xs">
                        {part.language}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        className={cn(
                          "h-6 w-6 p-0 hover:bg-transparent",
                          isAI
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-primary-foreground/70 hover:text-primary-foreground"
                        )}
                      >
                        {copied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <pre className={cn(
                      "text-sm overflow-x-auto",
                      isAI ? "text-foreground" : "text-primary-foreground"
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
        <div className={`flex gap-2 mt-2 ${isUser ? "justify-end" : ""}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className={cn(
              "h-8 px-2 text-xs hover:bg-muted/50 transition-colors",
              isAI
                ? "text-muted-foreground hover:text-foreground"
                : "text-primary-foreground/70 hover:text-primary-foreground"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>

          {isAI && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback('positive')}
                className={cn(
                  "h-8 px-2 text-xs hover:bg-muted/50 transition-colors",
                  feedback === 'positive'
                    ? "text-green-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Good
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback('negative')}
                className={cn(
                  "h-8 px-2 text-xs hover:bg-muted/50 transition-colors",
                  feedback === 'negative'
                    ? "text-red-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Bad
              </Button>

              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}