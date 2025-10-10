import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  aiConversationService,
  type AIConversation,
  type AIMessage
} from '@/lib/ai-conversation-service';
import { aiChatService } from '@/lib/ai-chat-service';

export interface ConnectionStatus {
  status: 'connected' | 'limited' | 'offline' | 'error';
  message: string;
  capabilities: {
    canUseFullAI: boolean;
    canUseCache: boolean;
    canUseTemplates: boolean;
    canSendMessage: boolean;
  };
}

export interface UseUnifiedAIConversationsOptions {
  projectId?: string;
  userId?: string;
  autoLoad?: boolean;
}

export function useUnifiedAIConversations(options: UseUnifiedAIConversationsOptions = {}) {
  const { projectId, userId, autoLoad = true } = options;
  const { toast } = useToast();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'connected',
    message: 'All features available',
    capabilities: {
      canUseFullAI: true,
      canUseCache: true,
      canUseTemplates: true,
      canSendMessage: true
    }
  });

  // Check connection status and capabilities
  const checkConnectionStatus = useCallback(async (): Promise<ConnectionStatus> => {
    try {
      // Try to validate database connection
      const hasConnection = await aiConversationService.validateDatabaseConnection();
      const hasUser = await aiConversationService.getCurrentUser();

      if (!hasUser) {
        return {
          status: 'offline',
          message: 'Authentication required',
          capabilities: {
            canUseFullAI: false,
            canUseCache: false,
            canUseTemplates: true,
            canSendMessage: false
          }
        };
      }

      if (!hasConnection) {
        return {
          status: 'limited',
          message: 'Using offline mode - changes will sync when connection is restored',
          capabilities: {
            canUseFullAI: false,
            canUseCache: true,
            canUseTemplates: true,
            canSendMessage: true
          }
        };
      }

      return {
        status: 'connected',
        message: 'All features available',
        capabilities: {
          canUseFullAI: true,
          canUseCache: true,
          canUseTemplates: true,
          canSendMessage: true
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Connection error - using offline mode',
        capabilities: {
          canUseFullAI: false,
          canUseCache: true,
          canUseTemplates: true,
          canSendMessage: true
        }
      };
    }
  }, []);

  // Update connection status periodically
  useEffect(() => {
    const updateStatus = async () => {
      const status = await checkConnectionStatus();
      setConnectionStatus(status);
    };

    // Initial check
    updateStatus();

    // Check status every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, [checkConnectionStatus]);

  // Load project conversations
  const loadConversations = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await aiConversationService.getProjectConversations(projectId);
      setConversations(result);

      // Filter out archived conversations for normal display
      const activeConversations = result.filter(conv =>
        !conv.metadata?.archived
      );

      if (activeConversations.length > 0 && !currentConversation) {
        // Auto-select the most recent active conversation
        const mostRecent = activeConversations[0];
        await loadConversation(mostRecent.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);

      // Update connection status based on error
      setConnectionStatus({
        status: 'limited',
        message: 'Using offline mode - changes will sync when connection is restored',
        capabilities: {
          canUseFullAI: false,
          canUseCache: true,
          canUseTemplates: true,
          canSendMessage: true
        }
      });

      toast({
        title: 'Connection Issue',
        description: 'Using offline mode - your chats will sync when connection is restored',
        variant: 'default',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, currentConversation, toast]);

  // Load specific conversation with messages
  const loadConversation = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const conversation = await aiConversationService.getConversation(conversationId, true);
      if (conversation) {
        setCurrentConversation(conversation);
        setMessages(conversation.messages || []);
      } else {
        setError('Conversation not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create new conversation
  const createConversation = useCallback(async (title?: string) => {
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'Project ID is required',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const conversation = await aiConversationService.createConversation(projectId, userId || '', title);
      if (conversation) {
        setConversations(prev => [conversation, ...prev]);
        setCurrentConversation(conversation);
        setMessages([]);

        toast({
          title: 'Success',
          description: connectionStatus.status === 'connected'
            ? 'New conversation created'
            : 'New conversation created locally (will sync when online)',
        });
        return conversation;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return null;
  }, [projectId, userId, toast, connectionStatus.status]);

  // Send message (unified handling of online/offline)
  const sendMessage = useCallback(async (content: string) => {
    if (!currentConversation || !connectionStatus.capabilities.canSendMessage) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Add user message
      const userMessage: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'> = {
        role: 'user',
        content,
        metadata: {}
      };

      const savedUserMessage = await aiConversationService.addMessage(
        currentConversation.id,
        userMessage
      );

      if (savedUserMessage) {
        setMessages(prev => [...prev, savedUserMessage]);
      }

      // Get AI response based on connection status
      let aiResponse: AIMessage | null = null;

      if (connectionStatus.capabilities.canUseFullAI) {
        // Try to get full AI response
        try {
          aiResponse = await aiChatService.sendMessage(content, {
            conversationId: currentConversation.id,
            model: 'phi-3-mini'
          });
        } catch (error) {
          console.log('Full AI failed, falling back to templates:', error);
        }
      }

      if (!aiResponse && connectionStatus.capabilities.canUseTemplates) {
        // Use template fallback
        aiResponse = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: `I understand you're asking about: "${content}". I'm currently in offline mode, but I've saved your message and will provide a full response when the connection is restored.`,
          metadata: {
            isOffline: true,
            willRetry: true
          },
          created_at: new Date().toISOString(),
          author_id: null,
        };
      }

      if (aiResponse) {
        const savedAiMessage = await aiConversationService.addMessage(
          currentConversation.id,
          aiResponse
        );

        if (savedAiMessage) {
          setMessages(prev => [...prev, savedAiMessage]);
        }

        return savedAiMessage;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return null;
  }, [currentConversation, connectionStatus.capabilities, toast]);

  // Clear conversation
  const clearConversation = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || currentConversation?.id;
    if (!targetId) return false;

    setLoading(true);
    try {
      const success = await aiConversationService.clearConversation(targetId);
      if (success) {
        if (targetId === currentConversation?.id) {
          setMessages([]);
        }

        toast({
          title: 'Success',
          description: 'Conversation cleared',
        });
        return true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear conversation';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return false;
  }, [currentConversation, toast]);

  // Archive conversation
  const archiveConversation = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || currentConversation?.id;
    if (!targetId) return false;

    setLoading(true);
    try {
      const success = await aiConversationService.archiveConversation(targetId);
      if (success) {
        setConversations(prev => prev.filter(conv => conv.id !== targetId));

        if (targetId === currentConversation?.id) {
          setCurrentConversation(null);
          setMessages([]);
        }

        toast({
          title: 'Success',
          description: 'Conversation archived',
        });
        return true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive conversation';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return false;
  }, [currentConversation, toast]);

  // Clear all project conversations
  const clearAllConversations = useCallback(async () => {
    if (!projectId) return false;

    setLoading(true);
    try {
      const success = await aiConversationService.clearAllProjectConversations(projectId);
      if (success) {
        setMessages([]);

        toast({
          title: 'Success',
          description: 'All conversations cleared',
        });
        return true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear all conversations';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return false;
  }, [projectId, toast]);

  // Archive all project conversations
  const archiveAllConversations = useCallback(async () => {
    if (!projectId) return false;

    setLoading(true);
    try {
      const success = await aiConversationService.archiveAllProjectConversations(projectId);
      if (success) {
        setConversations([]);
        setCurrentConversation(null);
        setMessages([]);

        toast({
          title: 'Success',
          description: 'All conversations archived',
        });
        return true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive all conversations';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return false;
  }, [projectId, toast]);

  // Auto-load conversations on mount
  useEffect(() => {
    if (autoLoad && projectId) {
      loadConversations();
    }
  }, [autoLoad, projectId, loadConversations]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    connectionStatus,

    // Actions
    loadConversations,
    loadConversation,
    createConversation,
    sendMessage,
    clearConversation,
    archiveConversation,
    clearAllConversations,
    archiveAllConversations,

    // Computed
    hasConversations: conversations.length > 0,
    currentMessageCount: messages.length,
    isOnline: connectionStatus.status === 'connected',
    isLimited: connectionStatus.status === 'limited',
    isOffline: connectionStatus.status === 'offline' || connectionStatus.status === 'error',
  };
}