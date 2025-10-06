import { useState, useEffect, useCallback } from 'react';
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
  }, [projectId, toast]);

  // Add message to conversation
  const addMessage = useCallback(async (
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const newMessage = await aiConversationService.addMessage(conversationId, message);
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
      let errorMessage = 'Failed to add message';
      let isUsingFallback = false;

      if (err instanceof Error) {
        // Check if it's a database connection error
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('connection')) {
          errorMessage = 'Message saved offline - will sync when online';
          isUsingFallback = true;
        } else if (err.message.includes('permission') || err.message.includes('unauthorized')) {
          errorMessage = 'Permission denied - please sign in again';
        } else if (err.message.includes('constraint') || err.message.includes('foreign_key')) {
          errorMessage = 'Conversation not found - please try again';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      toast({
        title: isUsingFallback ? 'Offline Mode' : 'Error',
        description: errorMessage,
        variant: isUsingFallback ? 'default' : 'destructive',
      });
    } finally {
      setLoading(false);
    }

    return null;
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
    if (!projectId) return null;

    setLoading(true);
    setError(null);

    try {
      const conversation = await aiConversationService.getOrCreateConversation(projectId, userId || '', title);
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to get conversation';
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
  }, [projectId, toast]);

  // Clear current conversation
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  // Auto-load conversations when projectId changes
  useEffect(() => {
    if (autoLoad && projectId) {
      loadConversations();
    }
  }, [projectId, autoLoad, loadConversations]);

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
  };
}