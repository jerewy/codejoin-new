import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  aiConversationServiceV2,
  type AIConversation,
  type AIMessage,
  DatabaseConnectionError,
  ValidationError,
  ConversationNotFoundError,
  PermissionDeniedError
} from '@/lib/ai-conversation-service-v2';

interface UseAIConversationsV2Options {
  projectId?: string;
  userId?: string;
  autoLoad?: boolean;
  enableHealthCheck?: boolean;
}

interface ServiceHealth {
  database: boolean;
  localStorage: boolean;
  circuitBreaker: string;
  lastChecked: string;
}

export function useAIConversationsV2(options: UseAIConversationsV2Options = {}) {
  const { projectId, userId, autoLoad = true, enableHealthCheck = false } = options;
  const { toast } = useToast();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Health check function
  const checkServiceHealth = useCallback(async () => {
    try {
      const health = await aiConversationServiceV2.healthCheck();
      setServiceHealth({
        ...health,
        lastChecked: new Date().toISOString()
      });
      return health;
    } catch (err) {
      console.error('Health check failed:', err);
      return null;
    }
  }, []);

  // Enhanced error handling with user-friendly messages
  const handleError = useCallback((error: unknown, operation: string) => {
    let errorMessage = 'An unexpected error occurred';
    let isUsingFallback = false;
    let severity: 'default' | 'destructive' = 'destructive';

    if (error instanceof ValidationError) {
      errorMessage = `Validation error: ${error.message}`;
      severity = 'destructive';
    } else if (error instanceof ConversationNotFoundError) {
      errorMessage = 'Conversation not found';
      severity = 'destructive';
    } else if (error instanceof PermissionDeniedError) {
      errorMessage = 'Permission denied. Please sign in again.';
      severity = 'destructive';
    } else if (error instanceof DatabaseConnectionError) {
      errorMessage = 'Connection issue - using offline mode';
      isUsingFallback = true;
      severity = 'default';
    } else if (error instanceof Error) {
      if (error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('connection')) {
        errorMessage = 'Network issue - working offline';
        isUsingFallback = true;
        severity = 'default';
      } else {
        errorMessage = error.message;
      }
    }

    setError(errorMessage);

    // Only show toast for non-fallback errors to avoid spamming users
    if (!isUsingFallback) {
      toast({
        title: isUsingFallback ? 'Using Offline Mode' : 'Error',
        description: errorMessage,
        variant: severity,
      });
    }

    return { errorMessage, isUsingFallback, severity };
  }, [toast]);

  // Load project conversations
  const loadConversations = useCallback(async () => {
    if (!projectId) {
      console.warn('loadConversations called without projectId');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await aiConversationServiceV2.getProjectConversations(projectId);
      setConversations(result);

      // Clear current conversation if it's not in the loaded list
      if (currentConversation && !result.find(c => c.id === currentConversation.id)) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      handleError(err, 'loadConversations');
    } finally {
      setLoading(false);
    }
  }, [projectId, currentConversation, handleError]);

  // Load specific conversation with messages
  const loadConversation = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const conversation = await aiConversationServiceV2.getConversation(conversationId, true);
      if (conversation) {
        setCurrentConversation(conversation);
        setMessages(conversation.messages || []);
      } else {
        handleError(new ConversationNotFoundError(conversationId), 'loadConversation');
      }
    } catch (err) {
      handleError(err, 'loadConversation');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Create new conversation
  const createConversation = useCallback(async (title?: string) => {
    if (!projectId || !userId) {
      toast({
        title: 'Error',
        description: 'Project ID and User ID are required',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const conversation = await aiConversationServiceV2.createConversation(projectId, userId, title);
      if (conversation) {
        setConversations(prev => [conversation, ...prev]);
        setCurrentConversation(conversation);
        setMessages([]);

        toast({
          title: 'Success',
          description: 'New conversation created',
        });

        return conversation;
      }
    } catch (err) {
      const { errorMessage, isUsingFallback } = handleError(err, 'createConversation');

      // If using fallback, still return the conversation if it was created locally
      if (isUsingFallback) {
        // Try to get the fallback conversation from local storage
        const fallbackConversations = await aiConversationServiceV2.getProjectConversations(projectId);
        if (fallbackConversations.length > 0) {
          const newConversation = fallbackConversations[0];
          setConversations(prev => [newConversation, ...prev]);
          setCurrentConversation(newConversation);
          setMessages([]);
          return newConversation;
        }
      }
    } finally {
      setLoading(false);
    }

    return null;
  }, [projectId, userId, toast, handleError]);

  // Add message to conversation
  const addMessage = useCallback(async (
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ) => {
    if (!conversationId) {
      toast({
        title: 'Error',
        description: 'Conversation ID is required',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const newMessage = await aiConversationServiceV2.addMessage(conversationId, message);
      if (newMessage) {
        setMessages(prev => [...prev, newMessage]);

        // Update conversation in list to reflect new message
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, updated_at: new Date().toISOString() }
            : conv
        ));

        return newMessage;
      }
    } catch (err) {
      const { errorMessage, isUsingFallback } = handleError(err, 'addMessage');

      // If using fallback, still try to add the message locally
      if (isUsingFallback) {
        // Create a fallback message and add it to the local state
        const fallbackMessage: AIMessage = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
          created_at: new Date().toISOString(),
          ai_model: message.ai_model,
          ai_response_time_ms: message.ai_response_time_ms,
          ai_tokens_used: message.ai_tokens_used,
          author_id: message.author_id,
        };

        setMessages(prev => [...prev, fallbackMessage]);

        // Update conversation in list
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, updated_at: new Date().toISOString() }
            : conv
        ));

        return fallbackMessage;
      }

      // Re-throw non-fallback errors so calling code can handle them
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast, handleError]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return false;

    setLoading(true);
    setError(null);

    try {
      // Note: The V2 service doesn't have deleteConversation implemented yet
      // For now, we'll just remove it from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      toast({
        title: 'Success',
        description: 'Conversation removed from view',
      });

      return true;
    } catch (err) {
      handleError(err, 'deleteConversation');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentConversation, toast, handleError]);

  // Get or create conversation for current project
  const getOrCreateConversation = useCallback(async (title?: string) => {
    if (!projectId || !userId) {
      toast({
        title: 'Error',
        description: 'Project ID and User ID are required',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const conversation = await aiConversationServiceV2.getOrCreateConversation(projectId, userId, title);
      if (conversation) {
        setCurrentConversation(conversation);

        // Load messages if conversation has them
        if (conversation.messages) {
          setMessages(conversation.messages);
        } else {
          setMessages([]);
        }

        // Update conversations list if this is a new conversation
        setConversations(prev => {
          const exists = prev.some(conv => conv.id === conversation.id);
          if (!exists) {
            return [conversation, ...prev];
          }
          return prev;
        });

        return conversation;
      }
    } catch (err) {
      handleError(err, 'getOrCreateConversation');
    } finally {
      setLoading(false);
    }

    return null;
  }, [projectId, userId, toast, handleError]);

  // Clear current conversation
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  // Retry failed operation
  const retryOperation = useCallback(async (operation: () => Promise<any>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();

      toast({
        title: 'Success',
        description: 'Operation completed successfully',
      });

      return result;
    } catch (err) {
      handleError(err, 'retryOperation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast, handleError]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-load conversations when projectId changes
  useEffect(() => {
    if (autoLoad && projectId) {
      loadConversations();
    }
  }, [projectId, autoLoad, loadConversations]);

  // Periodic health check (if enabled)
  useEffect(() => {
    if (!enableHealthCheck) return;

    const interval = setInterval(() => {
      checkServiceHealth();
    }, 30000); // Check every 30 seconds

    // Initial health check
    checkServiceHealth();

    return () => clearInterval(interval);
  }, [enableHealthCheck, checkServiceHealth]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    serviceHealth,
    isOnline,

    // Actions
    loadConversations,
    loadConversation,
    createConversation,
    addMessage,
    deleteConversation,
    getOrCreateConversation,
    clearCurrentConversation,
    retryOperation,
    checkServiceHealth,

    // Utilities
    hasActiveConversation: !!currentConversation,
    conversationCount: conversations.length,
    messageCount: messages.length,
    isUsingFallback: serviceHealth?.database === false,
  };
}