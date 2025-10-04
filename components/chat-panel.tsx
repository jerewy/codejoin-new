"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Brain } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { Collaborator, ProjectChatMessageWithAuthor } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface LiveCollaborator {
  userId: string;
  userName: string;
  userAvatar?: string;
  socketId: string;
  lastActivity: Date;
}

interface Identity {
  userId: string;
  userName: string;
  userAvatar?: string;
}

interface ChatPanelProps {
  conversationId: string | null;
  initialMessages: ProjectChatMessageWithAuthor[];
  teamMembers: Collaborator[];
  collaborators: LiveCollaborator[];
  selfIdentity: Identity | null;
}

type DisplayMessage = {
  id: string;
  content: string;
  createdAt: string;
  userId: string | null;
  authorName: string;
  authorAvatar: string | null;
  metadata: Record<string, unknown> | null;
  isAI: boolean;
  isPending: boolean;
};

type MessageRecord = {
  id: string;
  content: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  user_full_name?: string | null;
  user_avatar?: string | null;
  user_id?: string | null;
} & Record<string, unknown>;

type MessageLike = {
  user_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

const pickString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const metadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = metadata?.[key];
  return pickString(value);
};

const metadataBoolean = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : false;
};

const metadataUserId = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata) {
    return null;
  }

  const candidateKeys = [
    "author_id",
    "authorId",
    "user_id",
    "userId",
    "profile_id",
    "profileId",
  ];

  for (const key of candidateKeys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

const resolveRecordUserId = (record: MessageLike) => {
  const directId = record.user_id;
  if (typeof directId === "string" && directId.trim().length > 0) {
    return directId;
  }

  return metadataUserId(record.metadata);
};

export default function ChatPanel({
  conversationId,
  initialMessages,
  teamMembers,
  collaborators,
  selfIdentity,
}: ChatPanelProps) {
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const teamMemberMap = useMemo(() => {
    const map = new Map<string, Collaborator>();
    for (const member of teamMembers ?? []) {
      if (member.user_id) {
        map.set(member.user_id, member);
      }
    }
    return map;
  }, [teamMembers]);

  const liveCollaboratorMap = useMemo(() => {
    const map = new Map<string, LiveCollaborator>();
    for (const collaborator of collaborators ?? []) {
      if (collaborator.userId) {
        map.set(collaborator.userId, collaborator);
      }
    }
    return map;
  }, [collaborators]);

  const resolveAuthor = useCallback(
    (
      userId: string | null,
      fallbackName: string,
      fallbackAvatar: string | null,
      metadata: Record<string, unknown> | null | undefined
    ) => {
      if (!userId) {
        return {
          name:
            metadataString(metadata, "author_name") ??
            fallbackName ??
            "System",
          avatar: metadataString(metadata, "avatar") ?? fallbackAvatar,
        };
      }

      if (selfIdentity && selfIdentity.userId === userId) {
        return {
          name: selfIdentity.userName,
          avatar: selfIdentity.userAvatar ?? fallbackAvatar,
        };
      }

      const teammate = teamMemberMap.get(userId);
      if (teammate) {
        return {
          name: teammate.full_name ?? fallbackName ?? "Teammate",
          avatar: teammate.user_avatar ?? fallbackAvatar,
        };
      }

      const live = liveCollaboratorMap.get(userId);
      if (live) {
        return {
          name: live.userName,
          avatar: live.userAvatar ?? fallbackAvatar,
        };
      }

      return {
        name: fallbackName || "Teammate",
        avatar: fallbackAvatar,
      };
    },
    [teamMemberMap, liveCollaboratorMap, selfIdentity]
  );

  const formatMessage = useCallback(
    (record: ProjectChatMessageWithAuthor | MessageRecord): DisplayMessage => {
      const fallbackName =
        pickString(record.user_full_name) ??
        metadataString(record.metadata, "author_name") ??
        "Teammate";
      const fallbackAvatar =
        pickString(record.user_avatar) ??
        metadataString(record.metadata, "avatar");

      const resolvedUserId = resolveRecordUserId(record);

      const author = resolveAuthor(
        resolvedUserId ?? null,
        fallbackName,
        fallbackAvatar,
        record.metadata
      );

      return {
        id: record.id,
        content: pickString(record.content) ?? record.content?.toString() ?? "",
        createdAt: record.created_at ?? new Date().toISOString(),
        userId: resolvedUserId ?? null,
        authorName: author.name,
        authorAvatar: author.avatar ?? fallbackAvatar ?? null,
        metadata: record.metadata ?? null,
        isAI:
          metadataBoolean(record.metadata, "is_ai") ||
          author.name === "AI Assistant",
        isPending: false,
      };
    },
    [resolveAuthor]
  );

  useEffect(() => {
    setMessages(initialMessages.map((record) => formatMessage(record)));
  }, [initialMessages, formatMessage]);

  useEffect(() => {
    if (!supabase || !conversationId) {
      return;
    }

    const channel = supabase
      .channel(`project-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const record = payload.new as MessageRecord;
          setMessages((prev) => {
            const formatted = formatMessage(record);
            const clientRef = metadataString(record.metadata, "client_ref");
            const existingIndex = prev.findIndex(
              (msg) =>
                msg.id === formatted.id ||
                (clientRef && msg.id === clientRef)
            );

            if (existingIndex !== -1) {
              const next = [...prev];
              next[existingIndex] = { ...formatted, isPending: false };
              return next;
            }

            return [...prev, formatted];
          });
        }
      )
      .subscribe();

    return () => {
      channel
        .unsubscribe()
        .catch((error) =>
          console.warn("Failed to unsubscribe chat channel", error)
        );
    };
  }, [supabase, conversationId, formatMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const timestamp = new Date().toISOString();

    if (!supabase || !conversationId) {
      const localId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `local-${Date.now()}`;

      const displayName = selfIdentity?.userName ?? "You";

      const localMessage: DisplayMessage = {
        id: localId,
        content: trimmed,
        createdAt: timestamp,
        userId: selfIdentity?.userId ?? null,
        authorName: isAskingAI ? `${displayName} → AI` : displayName,
        authorAvatar: selfIdentity?.userAvatar ?? null,
        metadata: null,
        isAI: false,
        isPending: false,
      };

      setMessages((prev) => [...prev, localMessage]);
      setMessage("");

      if (isAskingAI) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `${localId}-ai`,
              content: "I'm analyzing your request. Let me help you with that...",
              createdAt: new Date().toISOString(),
              userId: null,
              authorName: "AI Assistant",
              authorAvatar: null,
              metadata: { is_ai: true },
              isAI: true,
              isPending: false,
            },
          ]);
          setIsAskingAI(false);
        }, 1000);
      }

      return;
    }

    const clientRef =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `client-${Date.now()}`;

    const optimisticMetadata: Record<string, unknown> = {
      client_ref: clientRef,
      is_ai: false,
    };

    if (selfIdentity?.userName) {
      optimisticMetadata.author_name = selfIdentity.userName;
    }
    if (selfIdentity?.userAvatar) {
      optimisticMetadata.avatar = selfIdentity.userAvatar;
    }

    if (selfIdentity?.userId) {
      optimisticMetadata.author_id = selfIdentity.userId;
    }

    const optimistic: DisplayMessage = {
      id: clientRef,
      content: trimmed,
      createdAt: timestamp,
      userId: selfIdentity?.userId ?? null,
      authorName: selfIdentity?.userName ?? "You",
      authorAvatar: selfIdentity?.userAvatar ?? null,
      metadata: optimisticMetadata,
      isAI: false,
      isPending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setMessage("");
    setIsSending(true);

    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      content: trimmed,
      metadata: {
        ...optimisticMetadata,
        ai_request: isAskingAI || undefined,
      },
    };

    const { error } = await supabase.from("messages").insert(payload);

    if (error) {
      console.warn("Failed to send chat message", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== clientRef));
      toast({
        variant: "destructive",
        title: "Unable to send message",
        description: error.message,
      });
      setIsSending(false);
      return;
    }

    setIsSending(false);
    setIsAskingAI(false);
  }, [
    supabase,
    conversationId,
    message,
    selfIdentity,
    isAskingAI,
    toast,
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Send className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium mb-1">No messages yet</p>
            <p className="text-xs">Start a conversation with your team</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${
                msg.isPending ? "opacity-70" : ""
              }`}
            >
              {msg.isAI ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <img
                  src={msg.authorAvatar || "/placeholder.svg"}
                  alt={msg.authorName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-sm font-medium ${
                      msg.isAI ? "text-primary" : ""
                    }`}
                  >
                    {msg.authorName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.isPending ? " • Sending…" : ""}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isAskingAI ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsAskingAI(!isAskingAI)}
                  disabled={isSending}
                >
                  <Brain className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isAskingAI ? "Cancel AI query" : "Ask AI Assistant"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Input
            placeholder={
              isAskingAI ? "Ask AI a question..." : "Type a message..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            className={isAskingAI ? "border-primary" : ""}
            disabled={isSending}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsRecording(!isRecording)}
                  disabled={isSending}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRecording ? "Stop recording" : "Voice message"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            size="icon"
            className="h-8 w-8"
            onClick={() => void handleSendMessage()}
            disabled={!message.trim() || isSending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isAskingAI && (
          <p className="text-xs text-primary mt-1">
            Asking AI Assistant - Your question will be shared with the team
          </p>
        )}
        {isRecording && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-xs">Recording... (0:05)</span>
          </div>
        )}
      </div>
    </div>
  );
}
