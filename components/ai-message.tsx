"use client"

import React from "react"
import { Brain, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { parseMessageContent, renderMessageParts, countCodeBlocks } from "@/lib/message-parser"
import { useToast } from "@/hooks/use-toast"

interface AIMessageProps {
  /** The message content */
  content: string
  /** Whether the message is pending (sending) */
  isPending?: boolean
  /** Whether the message is from an AI assistant */
  isAI?: boolean
  /** Author information */
  authorName?: string
  authorAvatar?: string
  /** Additional metadata */
  metadata?: Record<string, unknown> | null
  /** Callback for copy action */
  onCopy?: () => void
  /** Callback for feedback actions */
  onThumbsUp?: () => void
  onThumbsDown?: () => void
  /** Custom className */
  className?: string
}

/**
 * Enhanced AI Message Component with automatic code formatting
 */
export function AIMessage({
  content,
  isPending = false,
  isAI = false,
  authorName = "AI Assistant",
  authorAvatar,
  metadata,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  className
}: AIMessageProps) {
  const { toast } = useToast()
  const [isCopied, setIsCopied] = React.useState(false)

  // Parse the message content to detect code blocks
  const parsedParts = React.useMemo(() => {
    return parseMessageContent(content)
  }, [content])

  // Count code blocks for badge
  const codeBlockCount = React.useMemo(() => {
    return countCodeBlocks(content)
  }, [content])

  // Handle copy entire message
  const handleCopyMessage = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      toast({
        title: "Message copied",
        description: "The entire message has been copied to your clipboard.",
      })
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy message:", err)
      toast({
        title: "Copy failed",
        description: "Unable to copy message to clipboard.",
        variant: "destructive"
      })
    }
  }, [content, toast])

  return (
    <div
      className={`flex gap-3 items-start ${isPending ? "opacity-70" : ""} ${className}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-primary">
            {authorName}
          </span>
          {isPending && (
            <span className="text-xs text-muted-foreground">
              Sending…
            </span>
          )}
          {isAI && codeBlockCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {codeBlockCount} code block{codeBlockCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Message Body */}
        <div className="space-y-3">
          {renderMessageParts(parsedParts)}
        </div>

        {/* Action Buttons */}
        {isAI && !isPending && (
          <div className="flex items-center gap-1 mt-3 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyMessage}
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={isCopied ? "Copied!" : "Copy message"}
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>

            {onThumbsUp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onThumbsUp}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Thumbs up"
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
            )}

            {onThumbsDown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onThumbsDown}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Thumbs down"
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AIMessage