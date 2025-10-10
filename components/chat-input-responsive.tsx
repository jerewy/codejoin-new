"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Mic, Paperclip } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  showAttachmentButton?: boolean;
  showVoiceButton?: boolean;
  onAttachmentClick?: () => void;
  onVoiceClick?: () => void;
}

export default function ResponsiveChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = "Ask me anything about coding...",
  className,
  showAttachmentButton = false,
  showVoiceButton = false,
  onAttachmentClick,
  onVoiceClick,
}: ResponsiveChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [rowCount, setRowCount] = useState(1);

  // Responsive design breakpoints
  const isMobile = useIsMobile();
  const isTablet = false; // Placeholder for future tablet detection

  // Responsive sizing
  const minRows = isMobile ? 1 : 1;
  const maxRows = isMobile ? 4 : 8;
  const baseHeight = isMobile ? 44 : 48;

  // Auto-resize functionality
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto
    textarea.style.height = 'auto';

    // Calculate new height based on content and device
    const lineHeight = isMobile ? 20 : 24;
    const padding = isMobile ? 32 : 36; // Top and bottom padding
    const newHeight = Math.max(
      baseHeight,
      Math.min(
        Math.max(textarea.scrollHeight, baseHeight),
        (maxRows * lineHeight) + padding
      )
    );

    textarea.style.height = `${newHeight}px`;

    // Update row count
    const lines = Math.max(1, Math.ceil(textarea.scrollHeight / lineHeight));
    setRowCount(Math.min(lines, maxRows));
  }, [isMobile, baseHeight, maxRows]);

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  // Enhanced keyboard handling with mobile support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle IME composition for mobile keyboards
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      if (value.trim() && !disabled && !isLoading) {
        onSend();
      }
    }

    // Escape to blur (desktop only)
    if (!isMobile && e.key === "Escape") {
      e.preventDefault();
      textareaRef.current?.blur();
      setIsFocused(false);
    }
  };

  // IME composition handling for mobile input
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  // Focus handlers with mobile optimization
  const handleFocus = () => {
    setIsFocused(true);
    // On mobile, scroll input into view
    if (isMobile && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  };

  const handleBlur = () => setIsFocused(false);

  // Adjust height on mount and value change
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Auto-focus behavior
  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isMobile]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onSend();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          "relative flex items-end gap-2 w-full transition-all duration-200",
          isFocused && !isMobile && "scale-[1.01]",
          isMobile && "py-1",
          className
        )}
      >
      {/* Mobile-optimized input container */}
      <div className="relative flex-1 min-w-0">
        <div
          className={cn(
            "relative border rounded-xl overflow-hidden transition-all duration-200",
            "bg-background/80 backdrop-blur-md",
            "border-border/50 hover:border-border/70",
            isFocused && "border-primary/50 shadow-lg shadow-primary/5",
            disabled && "opacity-50 cursor-not-allowed",
            isMobile && "rounded-lg border-border/30"
          )}
        >
          {/* Mobile action buttons */}
          {isMobile && (showAttachmentButton || showVoiceButton) && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
              {showAttachmentButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted/50"
                  onClick={onAttachmentClick}
                  disabled={disabled}
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              {showVoiceButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted/50"
                  onClick={onVoiceClick}
                  disabled={disabled}
                >
                  <Mic className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}

          {/* Visual indicator for multi-line content */}
          {rowCount > 1 && (
            <div className={cn(
              "absolute top-2 z-10",
              isMobile ? "right-2" : "right-2"
            )}>
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
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            role="textbox"
            aria-label="Chat input, type your message here"
            aria-describedby={value.length === 0 ? "input-help" : undefined}
            aria-multiline="true"
            aria-invalid={false}
            aria-expanded={rowCount > 1}
            className={cn(
              // Base textarea styles
              "w-full bg-transparent border-0 outline-none resize-none",
              "transition-all duration-200",
              "placeholder:text-muted-foreground/60",

              // Responsive text sizing
              isMobile ? "text-base px-10 py-3" : "text-base px-4 py-3",

              // Line height and spacing
              "leading-relaxed",

              // Focus states
              "focus:ring-0 focus:outline-none",

              // Disabled states
              "disabled:cursor-not-allowed disabled:opacity-50",

              // Scrollbar styling
              "scrollbar-thin scrollbar-thumb-border/20 scrollbar-track-transparent",
              "hover:scrollbar-thumb-border/30",

              // Mobile-specific optimizations
              isMobile && "touch-manipulation"
            )}
            style={{
              minHeight: `${baseHeight}px`,
              maxHeight: `${maxRows * (isMobile ? 20 : 24) + (isMobile ? 32 : 36)}px`,
            }}
          />

          {/* Responsive helper text */}
          {!isMobile && isFocused && value.length === 0 && (
            <div
              id="input-help"
              className="absolute bottom-2 left-2 text-xs text-muted-foreground/40"
            >
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1 py-0.5 text-xs bg-muted/50 rounded">Enter</kbd>
                to send
                <span className="mx-1">•</span>
                <kbd className="px-1 py-0.5 text-xs bg-muted/50 rounded">Shift+Enter</kbd>
                for new line
              </span>
            </div>
          )}

          {/* Mobile character count */}
          {isMobile && value.length > 50 && (
            <div className="absolute bottom-1 right-2 text-xs text-muted-foreground/40">
              {value.length}
            </div>
          )}

          {/* Desktop character count */}
          {!isMobile && value.length > 100 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/40">
              {value.length}
            </div>
          )}
        </div>

        {/* Responsive overflow indicator */}
        {rowCount >= maxRows && (
          <div className={cn(
            "mt-1 text-xs text-muted-foreground/50 text-right",
            isMobile ? "text-[11px]" : "text-xs"
          )}>
            {isMobile ? (
              "Scroll for more"
            ) : (
              <span>
                Scroll for more lines • Press <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[10px]">Enter</kbd> to send
              </span>
            )}
          </div>
        )}
      </div>

      {/* Desktop action buttons */}
      {!isMobile && (showAttachmentButton || showVoiceButton) && (
        <div className="flex items-center gap-1">
          {showAttachmentButton && (
            <Button
              variant="outline"
              size="sm"
              className="h-12 w-12 p-0 border-border/30 hover:border-border/50"
              onClick={onAttachmentClick}
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
          {showVoiceButton && (
            <Button
              variant="outline"
              size="sm"
              className="h-12 w-12 p-0 border-border/30 hover:border-border/50"
              onClick={onVoiceClick}
              disabled={disabled}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Responsive send button */}
      <Button
        onClick={onSend}
        disabled={!value.trim() || disabled || isLoading}
        size={isMobile ? "sm" : "sm"}
        type="submit"
        aria-label="Send message"
        aria-busy={isLoading}
        className={cn(
          "shrink-0 transition-all duration-200",
          isMobile ? "h-10 w-10 p-0" : "h-12 px-4",
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
    </form>
  );
}