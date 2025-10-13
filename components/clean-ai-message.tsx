"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Brain, User, Copy, Check } from "lucide-react";
import { AIMessage } from "@/lib/ai-conversation-service";
import { useState } from "react";

interface CleanAIMessageProps {
  message: AIMessage;
}

export default function CleanAIMessage({ message }: CleanAIMessageProps) {
  const [copied, setCopied] = useState(false);

  // Ensure message has valid timestamp
  const validatedMessage = validateMessageTimestamp(message);
  const isAI = validatedMessage.role === "assistant";
  const isUser = validatedMessage.role === "user";

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
    // Simple code block detection and formatting
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
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

  const contentParts = formatContent(validatedMessage.content);

  return (
    <div className={`flex gap-4 ${isAI ? "flex-row" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isAI
            ? "bg-primary/10"
            : "bg-muted"
        )}>
          {isAI ? (
            <Brain className="h-4 w-4 text-primary" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? "text-right" : ""}`}>
        {/* Message Header */}
        <div className={`flex items-center gap-2 mb-2 ${isUser ? "justify-end" : ""}`}>
          <span className="text-sm font-medium">
            {isAI ? "AI Assistant" : "You"}
          </span>
          {isAI && message.metadata?.ai_model && (
            <Badge variant="outline" className="text-xs">
              {message.metadata.ai_model}
            </Badge>
          )}
            {message.metadata?.ai_response_time_ms && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(message.metadata.ai_response_time_ms / 1000)}s
            </Badge>
          )}
        </div>

        {/* Message Body */}
        <Card className={`p-4 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
          <div className="space-y-3">
            {contentParts.map((part, index) => (
              <div key={index}>
                {part.type === "text" ? (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {part.content}
                  </div>
                ) : (
                  <div className="bg-background rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {part.language}
                      </Badge>
                      <button
                        onClick={copyToClipboard}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code>{part.content}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Copy button for entire message */}
        <div className={`flex gap-2 mt-2 ${isUser ? "justify-end" : ""}`}>
          <button
            onClick={copyToClipboard}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}