"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  className?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Ask me anything about coding...",
  minRows = 1,
  maxRows = 8,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [rowCount, setRowCount] = useState(1);

  // Auto-resize functionality
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the natural scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height based on content
    const newHeight = Math.max(
      textarea.scrollHeight,
      minRows * 24, // Approximate line height
      Math.min(maxRows * 24, textarea.scrollHeight)
    );

    textarea.style.height = `${newHeight}px`;

    // Update row count for visual feedback
    const lines = Math.max(1, Math.ceil(textarea.scrollHeight / 24));
    setRowCount(Math.min(lines, maxRows));
  }, [minRows, maxRows]);

  // Handle value change and auto-resize
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !isLoading) {
        onSend();
      }
    }

    // Allow escape to blur the input
    if (e.key === "Escape") {
      e.preventDefault();
      textareaRef.current?.blur();
      setIsFocused(false);
    }
  };

  // Focus and blur handlers
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // Adjust height on mount and when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div
      className={cn(
        "relative flex items-end gap-2 w-full transition-all duration-200",
        isFocused && "scale-[1.01]",
        className
      )}
    >
      {/* Multi-line textarea container */}
      <div className="relative flex-1 min-w-0">
        <div
          className={cn(
            "relative border rounded-lg overflow-hidden transition-all duration-200",
            "bg-background/50 backdrop-blur-sm",
            "border-border/50 hover:border-border/70",
            isFocused && "border-primary/50 shadow-lg shadow-primary/5",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Visual indicator for multi-line support */}
          {rowCount > 1 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse"></div>
                <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse delay-75"></div>
                <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse delay-150"></div>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className={cn(
              // Base textarea styles
              "w-full px-4 py-3 bg-transparent border-0 outline-none resize-none",
              "text-base placeholder:text-muted-foreground/70",
              "transition-all duration-200",

              // Scrollbar styling
              "scrollbar-thin scrollbar-thumb-border/20 scrollbar-track-transparent",
              "hover:scrollbar-thumb-border/30",

              // Focus states
              "focus:ring-0 focus:outline-none",

              // Disabled states
              "disabled:cursor-not-allowed disabled:opacity-50",

              // Text area specific
              "field-sizing-content min-h-[48px]",
              "leading-relaxed"
            )}
            style={{
              minHeight: `${minRows * 24}px`,
              maxHeight: `${maxRows * 24}px`,
            }}
          />

          {/* Character count for long messages */}
          {value.length > 100 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50">
              {value.length}
            </div>
          )}

          {/* Keyboard shortcut hint */}
          {isFocused && value.length === 0 && (
            <div className="absolute bottom-2 left-2 text-xs text-muted-foreground/50">
              <span className="inline-flex items-center gap-1">
                Press <kbd className="px-1 py-0.5 text-xs bg-muted/50 rounded">Enter</kbd> to send
                <span className="mx-1">•</span>
                <kbd className="px-1 py-0.5 text-xs bg-muted/50 rounded">Shift+Enter</kbd> for new line
              </span>
            </div>
          )}
        </div>

        {/* Visual feedback for content overflow */}
        {rowCount >= maxRows && (
          <div className="mt-1 text-xs text-muted-foreground/60 text-right">
            Scroll for more lines • Press <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Enter</kbd> to send
          </div>
        )}
      </div>

      {/* Send button */}
      <Button
        onClick={onSend}
        disabled={!value.trim() || disabled || isLoading}
        size="sm"
        className={cn(
          "h-12 px-4 transition-all duration-200",
          "shrink-0",
          value.trim() && !disabled && !isLoading && "hover:scale-105"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}