import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  aiConversationService,
  type AIConversation,
  type AIMessage
} from '@/lib/ai-conversation-service';

interface UseAIConversationsOptions {
  projectId?: string;
  userId?: string;
  autoLoad?: boolean;
}

export function useAIConversations(options: UseAIConversationsOptions = {}) {
  const { projectId, userId, autoLoad = true } = options;
  const { toast } = useToast();

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project conversations
  const loadConversations = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await aiConversationService.getProjectConversations(projectId);
      setConversations(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

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

    // Authentication check - userId is sufficient if service layer has user
    if (!userId) {
      console.log('DEBUG: No userId provided to createConversation');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create conversations.',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const conversation = await aiConversationService.createConversation(projectId, userId, title);
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
      let errorMessage = 'Failed to create conversation';
      let isUsingFallback = false;

      if (err instanceof Error) {
        // Check if it's a database connection error
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('connection')) {
          errorMessage = 'Connection issue - using offline mode';
          isUsingFallback = true;
        } else if (err.message.includes('permission') || err.message.includes('unauthorized')) {
          errorMessage = 'Permission denied - please sign in again';
        } else if (err.message.includes('constraint') || err.message.includes('duplicate')) {
          errorMessage = 'Conversation already exists';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      toast({
        title: isUsingFallback ? 'Using Offline Mode' : 'Error',
        description: errorMessage,
        variant: isUsingFallback ? 'default' : 'destructive',
      });
    } finally {
      setLoading(false);
    }

    return null;
  }, [projectId, userId, toast]);

  // Add message to conversation
  const addMessage = useCallback(async (
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ) => {
    setLoading(true);
    setError(null);

    // Create optimistic message for immediate UI update
    const optimisticMessage: AIMessage = {
      id: `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

    // Immediately add to UI for better UX
    setMessages(prev => [...prev, optimisticMessage]);

    // Update conversation in list to reflect new message
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, updated_at: new Date().toISOString() }
        : conv
    ));

    try {
      console.log('Adding message to conversation:', { conversationId, role: message.role });
      const savedMessage = await aiConversationService.addMessage(conversationId, message);
      if (savedMessage) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessage.id ? savedMessage : msg
        ));

        console.log('Message added successfully:', { messageId: savedMessage.id, role: savedMessage.role });
        return savedMessage;
      } else {
        throw new Error('Failed to add message: No message returned from service');
      }
      } catch (err) {
      let errorMessage = 'Failed to add message';
      let isUsingFallback = false;

      if (err instanceof Error) {
        console.error('Message add error details:', {
          message: err.message,
          stack: err.stack,
          conversationId,
          messageRole: message.role
        });

        // Check if it's a database connection error
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('connection') || err.message.includes('Database error')) {
          errorMessage = 'Message saved offline - will sync when online';
          isUsingFallback = true;
        } else if (err.message.includes('permission') || err.message.includes('unauthorized')) {
          errorMessage = 'Permission denied - please sign in again';
        } else if (err.message.includes('constraint') || err.message.includes('foreign_key')) {
          errorMessage = 'Conversation not found - please try again';
        } else {
          errorMessage = err.message;
        }
      } else {
        console.error('Non-Error object thrown:', err);
      }

      // Remove optimistic message if save failed
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));

      setError(errorMessage);

      // Only show toast for non-fallback errors to avoid spamming users
      if (!isUsingFallback) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      // Re-throw the error so the calling function can handle it
      // But only if it's not a database error (which should be handled silently)
      if (!isUsingFallback) {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const success = await aiConversationService.deleteConversation(conversationId);
      if (success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
        toast({
          title: 'Success',
          description: 'Conversation deleted',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentConversation, toast]);

  // Get or create conversation for current project
  const getOrCreateConversation = useCallback(async (title?: string) => {
    if (!projectId) {
      console.error('DEBUG: getOrCreateConversation called without projectId');
      return null;
    }

    // Authentication check - userId is sufficient if service layer has user
    if (!userId) {
      console.log('DEBUG: getOrCreateConversation called without userId');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to use the AI Assistant.',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('DEBUG: Hook getOrCreateConversation called:', { projectId, userId, title });
      const conversation = await aiConversationService.getOrCreateConversation(projectId, userId, title);

      if (conversation) {
        console.log('DEBUG: Conversation created/retrieved successfully:', conversation.id);
        setCurrentConversation(conversation);

        // Load messages if conversation has them
        if (conversation.messages) {
          setMessages(conversation.messages);
          console.log('DEBUG: Set messages from conversation:', {
            conversationId: conversation.id,
            messageCount: conversation.messages.length
          });
        } else {
          // For local conversations, try to load messages explicitly
          if (conversation.id.startsWith('local_')) {
            console.log('DEBUG: Local conversation has no messages, attempting to load from storage');
            const loadedConversation = await aiConversationService.getConversation(conversation.id, true);
            if (loadedConversation && loadedConversation.messages) {
              setMessages(loadedConversation.messages);
              console.log('DEBUG: Loaded messages for local conversation:', {
                conversationId: conversation.id,
                messageCount: loadedConversation.messages.length
              });
            } else {
              setMessages([]);
              console.log('DEBUG: No messages found for local conversation');
            }
          } else {
            setMessages([]);
          }
        }

        // Update conversations list if this is a new conversation
        setConversations(prev => {
          const exists = prev.some(conv => conv.id === conversation.id);
          if (!exists) {
            return [conversation, ...prev];
          }
          return prev;
        });

        // Show success message for new conversations
        if (conversation.id.startsWith('local_')) {
          toast({
            title: 'Offline Mode',
            description: 'Working offline. Your conversation will sync when you reconnect.',
            variant: 'default',
          });
        }

        return conversation;
      } else {
        console.error('DEBUG: getOrCreateConversation returned null');
        throw new Error('Failed to create or retrieve conversation');
      }
    } catch (err) {
      console.error('DEBUG: Hook getOrCreateConversation error:', err);

      let errorMessage = 'Failed to get conversation';
      let isUsingFallback = false;

      if (err instanceof Error) {
        errorMessage = err.message;

        // Check if it's a database connection error
        if (err.message.includes('connection') || err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Working offline - your conversations will sync when you reconnect';
          isUsingFallback = true;
        } else if (err.message.includes('permission') || err.message.includes('unauthorized') || err.message.includes('authentication')) {
          errorMessage = 'Please sign in again to continue';
        } else if (err.message.includes('access') || err.message.includes('project')) {
          errorMessage = 'You do not have access to this project';
        }
      }

      setError(errorMessage);

      if (!isUsingFallback) {
        toast({
          title: 'Conversation Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }

    return null;
  }, [projectId, userId, toast]);

  // Reload messages for current conversation
  const reloadCurrentConversationMessages = useCallback(async () => {
    if (!currentConversation) {
      console.log('DEBUG: No current conversation to reload messages for');
      return;
    }

    console.log('DEBUG: Reloading messages for current conversation:', currentConversation.id);

    try {
      const updatedConversation = await aiConversationService.getConversation(currentConversation.id, true);
      if (updatedConversation && updatedConversation.messages) {
        setMessages(updatedConversation.messages);
        console.log('DEBUG: Reloaded messages for current conversation:', {
          conversationId: currentConversation.id,
          messageCount: updatedConversation.messages.length
        });
      } else {
        setMessages([]);
        console.log('DEBUG: No messages found when reloading current conversation');
      }
    } catch (error) {
      console.error('DEBUG: Error reloading current conversation messages:', error);
    }
  }, [currentConversation]);

  // Clear current conversation
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  // Auto-load conversations when projectId or userId changes
  useEffect(() => {
    if (autoLoad && projectId) {
      loadConversations();
    }
  }, [projectId, userId, autoLoad, loadConversations]);

  // Track previous userId to detect user switches
  const previousUserId = useRef<string | undefined>();

  // Clear current conversation when userId changes to prevent cross-user data leakage
  useEffect(() => {
    // Only clear if we're switching between different authenticated users
    // (not just going from undefined to defined during authentication)
    if (previousUserId.current && previousUserId.current !== userId) {
      setCurrentConversation(null);
      setMessages([]);
      setError(null);
    }
    previousUserId.current = userId;
  }, [userId]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading,
    error,

    // Actions
    loadConversations,
    loadConversation,
    createConversation,
    addMessage,
    deleteConversation,
    getOrCreateConversation,
    clearCurrentConversation,
    reloadCurrentConversationMessages,
  };
}