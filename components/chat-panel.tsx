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
import { getSupabaseClient, createRealtimeChannel, checkAuthentication, verifyProjectAccess, cleanupChannel as cleanupSupabaseChannel, isChannelActive } from "@/lib/supabaseClient";
import { SafeImage } from "@/components/ui/safe-image";
import type { Collaborator, ProjectChatMessageWithAuthor } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/lib/socket";

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
  projectId: string;
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
  role: string | null;
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
  role?: string | null;
  user_full_name?: string | null;
  user_avatar?: string | null;
  user_id?: string | null;
  conversation_id?: string | null;
} & Record<string, unknown>;

type MessageLike = {
  user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  role?: string | null;
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
  projectId,
  conversationId,
  initialMessages,
  teamMembers,
  collaborators,
  selfIdentity,
}: ChatPanelProps) {
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const { socket, emitChatMessage } = useSocket();
  const [message, setMessage] = useState("");
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProjectAccess, setHasProjectAccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const channelNameRef = useRef<string | null>(null);
  const isSubscribingRef = useRef<boolean>(false);

  // Helper function to properly cleanup existing channels
  const cleanupChannel = useCallback(async () => {
    if (channelNameRef.current) {
      try {
        console.log(`DEBUG: Cleaning up channel: ${channelNameRef.current}`);
        await cleanupSupabaseChannel(channelNameRef.current);
        channelRef.current = null;
        channelNameRef.current = null;
        isSubscribingRef.current = false;
        console.log('DEBUG: Channel cleaned up successfully');
      } catch (error) {
        console.warn('DEBUG: Error cleaning up channel:', error);
        channelRef.current = null;
        channelNameRef.current = null;
        isSubscribingRef.current = false;
      }
    }
  }, [cleanupSupabaseChannel]);

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
      const resolvedRole =
        pickString(record.role) ?? metadataString(record.metadata, "role") ?? null;

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
        role: resolvedRole,
        authorName: author.name,
        authorAvatar: author.avatar ?? fallbackAvatar ?? null,
        metadata: record.metadata ?? null,
        isAI:
          resolvedRole === "assistant" ||
          metadataBoolean(record.metadata, "is_ai") ||
          author.name === "AI Assistant",
        isPending: false,
      };
    },
    [resolveAuthor]
  );

  const createSocketRecord = useCallback(
    (details: {
      id: string;
      content: string;
      createdAt: string;
      role: string;
      metadata?: Record<string, unknown> | null;
      userId?: string | null;
      authorName?: string | null;
      authorAvatar?: string | null;
    }): MessageRecord => {
      return {
        id: details.id,
        content: details.content,
        created_at: details.createdAt,
        role: details.role,
        metadata: details.metadata ?? null,
        user_id: details.userId ?? null,
        user_full_name: details.authorName ?? null,
        user_avatar: details.authorAvatar ?? null,
        conversation_id: conversationId,
      } satisfies MessageRecord;
    },
    [conversationId]
  );

  const formattedInitialMessages = useMemo(
    () => initialMessages.map((record) => formatMessage(record)),
    [initialMessages, formatMessage]
  );

  useEffect(() => {
    setMessages((previous) => {
      if (previous.length === 0) {
        return formattedInitialMessages;
      }

      const previousById = new Map(previous.map((msg) => [msg.id, msg]));
      const next: DisplayMessage[] = [];
      const seen = new Set<string>();

      for (const formatted of formattedInitialMessages) {
        const clientRef =
          metadataString(formatted.metadata, "client_ref") ??
          metadataString(formatted.metadata, "clientRef");

        let existing = previousById.get(formatted.id);
        if (!existing && clientRef) {
          existing = previousById.get(clientRef);
        }

        if (existing) {
          seen.add(existing.id);
        }

        seen.add(formatted.id);

        next.push({
          ...formatted,
          isPending:
            existing?.isPending && formatted.isPending ? true : formatted.isPending,
        });
      }

      for (const existing of previous) {
        if (seen.has(existing.id)) {
          continue;
        }

        const resolvedAuthor = resolveAuthor(
          existing.userId,
          existing.authorName,
          existing.authorAvatar,
          existing.metadata
        );

        next.push({
          ...existing,
          authorName: resolvedAuthor.name,
          authorAvatar:
            resolvedAuthor.avatar ?? existing.authorAvatar ?? null,
        });
      }

      return next;
    });
  }, [formattedInitialMessages, resolveAuthor]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleChatMessage = (payload: {
      projectId?: string;
      conversationId?: string | null;
      message?: MessageRecord;
    }) => {
      if (!payload || payload.projectId !== projectId) {
        return;
      }

      if (
        conversationId &&
        payload.conversationId &&
        payload.conversationId !== conversationId
      ) {
        return;
      }

      const record = payload.message;
      if (!record) {
        return;
      }

      setMessages((prev) => {
        const formatted = formatMessage(record);
        const clientRef =
          metadataString(record.metadata, "client_ref") ??
          metadataString(record.metadata, "clientRef");
        const nextMessage = { ...formatted, isPending: false };

        const existingIndex = prev.findIndex(
          (msg) =>
            msg.id === nextMessage.id ||
            (clientRef && msg.id === clientRef)
        );

        if (existingIndex === -1) {
          return [...prev, nextMessage];
        }

        const next = [...prev];
        next[existingIndex] = nextMessage;
        return next;
      });
    };

    socket.on("chat:message", handleChatMessage);

    return () => {
      socket.off("chat:message", handleChatMessage);
    };
  }, [socket, projectId, conversationId, formatMessage]);

  // Removed duplicate channel creation useEffect - now handled by the unified realtime subscription effect

  // Authentication and access verification
  useEffect(() => {
    const initializeConnection = async () => {
      if (!supabase) {
        setConnectionStatus('error');
        return;
      }

      setConnectionStatus('connecting');

      // Check authentication
      const authenticated = await checkAuthentication(supabase);
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        setConnectionStatus('error');
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to access team chat.",
        });
        return;
      }

      // Verify project access
      const access = await verifyProjectAccess(supabase, projectId);
      setHasProjectAccess(access);

      if (!access) {
        setConnectionStatus('error');
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to access this team chat.",
        });
        return;
      }

      setConnectionStatus('connected');
    };

    initializeConnection();
  }, [supabase, projectId, toast]);

  // Unified real-time subscription with robust channel management
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupChannel = async () => {
      // Prevent multiple simultaneous subscriptions
      if (isSubscribingRef.current || !supabase || !conversationId || connectionStatus !== 'connected') {
        return;
      }

      const channelName = `project-chat-${conversationId}`;

      // Check if channel is already active globally
      if (isChannelActive(channelName)) {
        console.log(`DEBUG: Channel ${channelName} is already active globally, skipping creation`);
        return;
      }

      // Check if we already have a channel for this conversation locally
      if (channelRef.current && channelNameRef.current === channelName) {
        console.log(`DEBUG: Channel ${channelName} already exists locally, skipping creation`);
        return;
      }

      // Clean up any existing channel before creating a new one
      await cleanupChannel();

      // Prevent subscription if component unmounted during cleanup
      if (!isMounted) return;

      isSubscribingRef.current = true;
      console.log(`DEBUG: Setting up realtime subscription for conversation: ${conversationId}`);

      try {
        const channel = createRealtimeChannel(
          supabase,
          channelName,
          {
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
            event: 'INSERT'
          }
        );

        if (!channel) {
          console.error('DEBUG: Failed to create realtime channel');
          if (isMounted) {
            setConnectionStatus('error');
            isSubscribingRef.current = false;
          }
          return;
        }

        // Store channel reference
        channelRef.current = channel;
        channelNameRef.current = channelName;

        // Set up the message handler
        const messageHandler = (payload: any) => {
          console.log('DEBUG: Received realtime message:', payload);

          if (!isMounted) return;

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
        };

        // Subscribe to the channel with our custom handler
        channel.on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        }, messageHandler);

        // Subscribe and handle status
        channel.subscribe((status) => {
          console.log(`DEBUG: Channel ${channelName} subscription status: ${status}`);

          if (!isMounted) return;

          if (status === 'SUBSCRIBED') {
            console.log(`DEBUG: Successfully subscribed to channel: ${channelName}`);
            setConnectionStatus('connected');
            isSubscribingRef.current = false;
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`DEBUG: Channel error for ${channelName}`);
            setConnectionStatus('error');
            isSubscribingRef.current = false;
            toast({
              variant: "destructive",
              title: "Connection Error",
              description: "Failed to connect to team chat. Messages may not update in real-time.",
            });
          } else if (status === 'TIMED_OUT') {
            console.warn(`DEBUG: Channel subscription timed out for ${channelName}`);
            setConnectionStatus('error');
            isSubscribingRef.current = false;
            toast({
              variant: "destructive",
              title: "Connection Timeout",
              description: "Team chat connection timed out. Retrying...",
            });

            // Implement retry logic for timeouts
            if (isMounted && retryTimeout === null) {
              retryTimeout = setTimeout(() => {
                retryTimeout = null;
                setupChannel();
              }, 3000);
            }
          }
        });

      } catch (error) {
        console.error(`DEBUG: Error setting up channel ${channelName}:`, error);
        if (isMounted) {
          setConnectionStatus('error');
          isSubscribingRef.current = false;
        }
      }
    };

    setupChannel();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      cleanupChannel();
    };
  }, [supabase, conversationId, connectionStatus, formatMessage, toast, cleanupChannel]);

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

      const optimisticMetadata: Record<string, unknown> = {
        client_ref: localId,
        is_ai: false,
        project_id: projectId,
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

      const localMessage: DisplayMessage = {
        id: localId,
        content: trimmed,
        createdAt: timestamp,
        userId: selfIdentity?.userId ?? null,
        role: "user",
        authorName: isAskingAI ? `${displayName} → AI` : displayName,
        authorAvatar: selfIdentity?.userAvatar ?? null,
        metadata: optimisticMetadata,
        isAI: false,
        isPending: false,
      };

      setMessages((prev) => [...prev, localMessage]);
      setMessage("");

      emitChatMessage({
        projectId,
        conversationId,
        message: createSocketRecord({
          id: localId,
          content: trimmed,
          createdAt: timestamp,
          role: "user",
          metadata: optimisticMetadata,
          userId: selfIdentity?.userId ?? null,
          authorName: selfIdentity?.userName ?? displayName,
          authorAvatar: selfIdentity?.userAvatar ?? null,
        }),
      });

      if (isAskingAI) {
        setTimeout(() => {
          const aiTimestamp = new Date().toISOString();
          const aiId = `${localId}-ai`;
          const aiMetadata: Record<string, unknown> = {
            is_ai: true,
            client_ref: aiId,
            project_id: projectId,
          };

          const aiMessage: DisplayMessage = {
            id: aiId,
            content: "I'm analyzing your request. Let me help you with that...",
            createdAt: aiTimestamp,
            userId: null,
            role: "assistant",
            authorName: "AI Assistant",
            authorAvatar: null,
            metadata: aiMetadata,
            isAI: true,
            isPending: false,
          };

          setMessages((prev) => [...prev, aiMessage]);
          emitChatMessage({
            projectId,
            conversationId,
            message: createSocketRecord({
              id: aiId,
              content: aiMessage.content,
              createdAt: aiTimestamp,
              role: "assistant",
              metadata: aiMetadata,
              userId: null,
              authorName: aiMessage.authorName,
              authorAvatar: null,
            }),
          });
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
      project_id: projectId,
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
      role: "user",
      authorName: selfIdentity?.userName ?? "You",
      authorAvatar: selfIdentity?.userAvatar ?? null,
      metadata: optimisticMetadata,
      isAI: false,
      isPending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setMessage("");
    setIsSending(true);

    const messageMetadata: Record<string, unknown> = {
      ...optimisticMetadata,
      ai_request: isAskingAI || undefined,
    };

    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      content: trimmed,
      role: "user",
      metadata: messageMetadata,
    };

    if (selfIdentity?.userId) {
      payload.author_id = selfIdentity.userId;
    }

    const { data: insertedMessage, error } = await supabase
      .from("messages")
      .insert(payload)
      .select(`
        id,
        conversation_id,
        author_id,
        role,
        content,
        metadata,
        created_at,
        ai_model,
        ai_response_time_ms,
        ai_tokens_used
      `)
      .single();

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

    const record: MessageRecord = insertedMessage
      ? (insertedMessage as MessageRecord)
      : createSocketRecord({
          id: clientRef,
          content: trimmed,
          createdAt: timestamp,
          role: "user",
          metadata: messageMetadata,
          userId: selfIdentity?.userId ?? null,
          authorName: selfIdentity?.userName ?? optimistic.authorName,
          authorAvatar: selfIdentity?.userAvatar ?? null,
        });

    if (!record.metadata) {
      record.metadata = messageMetadata;
    }

    const formattedRecord = formatMessage(record);

    setMessages((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex((msg) => msg.id === clientRef);

      if (existingIndex !== -1) {
        next[existingIndex] = { ...formattedRecord, isPending: false };
        return next;
      }

      return [...next, { ...formattedRecord, isPending: false }];
    });

    emitChatMessage({
      projectId,
      conversationId,
      message: record,
    });
    setIsSending(false);
    setIsAskingAI(false);
  }, [
    supabase,
    conversationId,
    message,
    selfIdentity,
    isAskingAI,
    toast,
    projectId,
    emitChatMessage,
    createSocketRecord,
    formatMessage,
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
                <SafeImage
                  src={msg.authorAvatar}
                  alt={msg.authorName}
                  className="w-8 h-8 rounded-full object-cover"
                  width={32}
                  height={32}
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
