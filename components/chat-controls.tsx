"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Archive, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatControlsProps {
  onClearCurrent?: () => Promise<boolean>;
  onArchiveCurrent?: () => Promise<boolean>;
  onClearAll?: () => Promise<boolean>;
  onArchiveAll?: () => Promise<boolean>;
  onNewChat?: () => void;
  messageCount?: number;
  isOnline?: boolean;
  disabled?: boolean;
}

export default function ChatControls({
  onClearCurrent,
  onArchiveCurrent,
  onClearAll,
  onArchiveAll,
  onNewChat,
  messageCount = 0,
  isOnline = true,
  disabled = false
}: ChatControlsProps) {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleClearCurrent = async () => {
    if (!onClearCurrent) return;

    setIsClearing(true);
    try {
      const success = await onClearCurrent();
      if (success) {
        toast({
          title: "Chat cleared",
          description: "Current conversation has been cleared.",
        });
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleArchiveCurrent = async () => {
    if (!onArchiveCurrent) return;

    setIsArchiving(true);
    try {
      const success = await onArchiveCurrent();
      if (success) {
        toast({
          title: "Chat archived",
          description: "Current conversation has been archived.",
        });
        onNewChat?.();
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleClearAll = async () => {
    if (!onClearAll) return;

    setIsClearing(true);
    try {
      const success = await onClearAll();
      if (success) {
        toast({
          title: "All chats cleared",
          description: "All conversations have been cleared.",
        });
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleArchiveAll = async () => {
    if (!onArchiveAll) return;

    setIsArchiving(true);
    try {
      const success = await onArchiveAll();
      if (success) {
        toast({
          title: "All chats archived",
          description: "All conversations have been archived.",
        });
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportChat = () => {
    // Simple export functionality
    const chatData = {
      exportDate: new Date().toISOString(),
      messageCount,
      isOnline,
      status: isOnline ? "online" : "offline"
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Chat exported",
      description: "Chat data has been exported successfully.",
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* New Chat Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onNewChat}
        disabled={disabled}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        New Chat
      </Button>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Clear Current Conversation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                disabled={disabled || messageCount === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Current Chat
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear current conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all messages from the current conversation.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearCurrent}
                  disabled={isClearing}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isClearing ? "Clearing..." : "Clear Chat"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Archive Current Conversation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                disabled={disabled || messageCount === 0}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Current Chat
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive current conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive the current conversation. You can restore it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleArchiveCurrent}
                  disabled={isArchiving}
                >
                  {isArchiving ? "Archiving..." : "Archive Chat"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DropdownMenuSeparator />

          {/* Clear All Conversations */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                disabled={disabled}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Chats
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all messages from all conversations in this project.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isClearing ? "Clearing..." : "Clear All"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Archive All Conversations */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                disabled={disabled}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive All Chats
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive all conversations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive all conversations in this project.
                  You can restore them later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleArchiveAll}
                  disabled={isArchiving}
                >
                  {isArchiving ? "Archiving..." : "Archive All"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DropdownMenuSeparator />

          {/* Export Chat */}
          <DropdownMenuItem onClick={handleExportChat} disabled={disabled}>
            <Download className="h-4 w-4 mr-2" />
            Export Chat Data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}