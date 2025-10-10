import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  improvedAiConversationService,
  type AIConversation,
  type AIMessage,
  ConversationServiceError,
  DatabaseConnectionError,
  RLSPermissionError,
  ValidationError
} from '@/lib/ai-conversation-service-improved';

interface UseAIConversationsOptions {
  projectId?: string;
  userId?: string;
  autoLoad?: boolean;
  onConversationCreated?: (conversation: AIConversation) => void;
  onMessageAdded?: (message: AIMessage) => void;
  onError?: (error: Error) => void;
}

interface ConversationState {
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  messages: AIMessage[];
  loading: boolean;
  error: string | null;
  isUsingFallback: boolean;
  lastOperation: string | null;
}

export function useImprovedAIConversations(options: UseAIConversationsOptions = {}) {
  const {
    projectId,
    userId,
    autoLoad = true,
    onConversationCreated,
    onMessageAdded,
    onError
  } = options;

  const { toast } = useToast();
  const isInitializedRef = useRef(false);
  const operationQueueRef = useRef<Array<() => void>>([]);

  const [state, setState] = useState<ConversationState>({
    conversations: [],
    currentConversation: null,
    messages: [],
    loading: false,
    error: null,
    isUsingFallback: false,
    lastOperation: null
  });

  const updateState = useCallback((updates: Partial<ConversationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback((error: Error, operation: string) => {
    console.error(`Error in ${operation}:`, error);

    let errorMessage = 'An unexpected error occurred';
    let isRecoverable = true;
    let shouldShowToast = true;

    if (error instanceof ValidationError) {
      errorMessage = error.message;
      isRecoverable = false;
      shouldShowToast = true;
    } else if (error instanceof RLSPermissionError) {
      errorMessage = 'Permission denied. Please sign in again.';
      isRecoverable = false;
      shouldShowToast = true;
    } else if (error instanceof DatabaseConnectionError) {
      errorMessage = 'Connection issue - using offline mode';
      isRecoverable = true;
      shouldShowToast = false; // Don't spam users with connection errors
    } else if (error instanceof ConversationServiceError) {
      errorMessage = error.message;
      isRecoverable = error.isRecoverable;
      shouldShowToast = !error.isRecoverable;
    }

    updateState({
      error: errorMessage,
      isUsingFallback: error instanceof DatabaseConnectionError,
      lastOperation: operation
    });

    if (shouldShowToast) {
      toast({
        title: error instanceof RLSPermissionError ? 'Authentication Required' : 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }

    onError?.(error);

    return isRecoverable;
  }, [toast, onError, updateState]);

  const processQueue = useCallback(() => {
    if (operationQueueRef.current.length > 0 && !state.loading) {
      const operation = operationQueueRef.current.shift();
      operation?.();
    }
  }, [state.loading]);

  const queueOperation = useCallback((operation: () => void) => {
    operationQueueRef.current.push(operation);
    processQueue();
  }, [processQueue]);

  // Load project conversations
  const loadConversations = useCallback(async () => {
    if (!projectId) {
      updateState({ error: 'Project ID is required', loading: false });
      return;
    }

    updateState({ loading: true, error: null, lastOperation: 'loadConversations' });

    try {
      const result = await improvedAiConversationService.getProjectConversations(projectId);
      updateState({
        conversations: result,
        loading: false,
        error: null,
        isUsingFallback: false
      });
    } catch (error) {
      const isRecoverable = handleError(error as Error, 'loadConversations');
      updateState({ loading: false, conversations: [] });

      // If it's recoverable, the fallback service should have provided data
      if (!isRecoverable) {
        updateState({ conversations: [] });
      }
    }
  }, [projectId, handleError, updateState]);

  // Load specific conversation with messages
  const loadConversation = useCallback(async (conversationId: string) => {
    updateState({ loading: true, error: null, lastOperation: 'loadConversation' });

    try {
      const conversation = await improvedAiConversationService.getConversation(conversationId, true);
      if (conversation) {
        updateState({
          currentConversation: conversation,
          messages: conversation.messages || [],
          loading: false,
          error: null,
          isUsingFallback: false
        });
      } else {
        updateState({
          error: 'Conversation not found',
          loading: false,
          currentConversation: null,
          messages: []
        });
      }
    } catch (error) {
      const isRecoverable = handleError(error as Error, 'loadConversation');
      updateState({
        loading: false,
        currentConversation: null,
        messages: []
      });
    }
  }, [handleError, updateState]);

  // Create new conversation
  const createConversation = useCallback(async (title?: string) => {
    if (!projectId || !userId) {
      const error = new ValidationError('Project ID and User ID are required');
      handleError(error, 'createConversation');
      return null;
    }

    updateState({ loading: true, error: null, lastOperation: 'createConversation' });

    try {
      const conversation = await improvedAiConversationService.createConversation(
        projectId,
        userId,
        title
      );

      if (conversation) {
        updateState(prev => ({
          conversations: [conversation, ...prev.conversations],
          currentConversation: conversation,
          messages: [],
          loading: false,
          error: null,
          isUsingFallback: conversation.id.startsWith('local_')
        }));

        onConversationCreated?.(conversation);

        toast({
          title: 'Success',
          description: conversation.id.startsWith('local_')
            ? 'New conversation created (offline mode)'
            : 'New conversation created',
        });

        return conversation;
      }
    } catch (error) {
      handleError(error as Error, 'createConversation');
      updateState({ loading: false });
    }

    return null;
  }, [projectId, userId, handleError, updateState, onConversationCreated, toast]);

  // Add message to conversation
  const addMessage = useCallback(async (
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ) => {
    updateState({ loading: true, error: null, lastOperation: 'addMessage' });

    try {
      console.log('Adding message to conversation:', { conversationId, role: message.role });
      const newMessage = await improvedAiConversationService.addMessage(conversationId, message);

      if (newMessage) {
        updateState(prev => {
          const updatedMessages = [...prev.messages, newMessage];
          const updatedConversations = prev.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, updated_at: new Date().toISOString() }
              : conv
          );

          return {
            messages: updatedMessages,
            conversations: updatedConversations,
            loading: false,
            error: null,
            isUsingFallback: newMessage.id.startsWith('local_')
          };
        });

        console.log('Message added successfully:', {
          messageId: newMessage.id,
          role: newMessage.role,
          isLocal: newMessage.id.startsWith('local_')
        });

        onMessageAdded?.(newMessage);
        return newMessage;
      } else {
        throw new Error('Failed to add message: No message returned from service');
      }
    } catch (error) {
      const isRecoverable = handleError(error as Error, 'addMessage');
      updateState({ loading: false });

      // If it's not recoverable, re-throw the error
      if (!isRecoverable) {
        throw error;
      }

      return null;
    }
  }, [handleError, updateState, onMessageAdded]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    updateState({ loading: true, error: null, lastOperation: 'deleteConversation' });

    try {
      // Note: deleteConversation method not implemented in improved service yet
      // This would need to be added if required
      const success = false; // Placeholder

      if (success) {
        updateState(prev => ({
          conversations: prev.conversations.filter(conv => conv.id !== conversationId),
          currentConversation: prev.currentConversation?.id === conversationId ? null : prev.currentConversation,
          messages: prev.currentConversation?.id === conversationId ? [] : prev.messages,
          loading: false,
          error: null
        }));

        toast({
          title: 'Success',
          description: 'Conversation deleted',
        });
      }
    } catch (error) {
      handleError(error as Error, 'deleteConversation');
    } finally {
      updateState({ loading: false });
    }
  }, [handleError, updateState, toast]);

  // Get or create conversation for current project
  const getOrCreateConversation = useCallback(async (title?: string) => {
    if (!projectId || !userId) {
      const error = new ValidationError('Project ID and User ID are required');
      handleError(error, 'getOrCreateConversation');
      return null;
    }

    updateState({ loading: true, error: null, lastOperation: 'getOrCreateConversation' });

    try {
      const conversation = await improvedAiConversationService.getOrCreateConversation(
        projectId,
        userId,
        title
      );

      if (conversation) {
        updateState(prev => {
          const updatedConversations = prev.conversations.some(conv => conv.id === conversation.id)
            ? prev.conversations
            : [conversation, ...prev.conversations];

          return {
            currentConversation: conversation,
            conversations: updatedConversations,
            messages: conversation.messages || [],
            loading: false,
            error: null,
            isUsingFallback: conversation.id.startsWith('local_')
          };
        });

        return conversation;
      }
    } catch (error) {
      handleError(error as Error, 'getOrCreateConversation');
      updateState({ loading: false });
    }

    return null;
  }, [projectId, userId, handleError, updateState]);

  // Clear current conversation
  const clearCurrentConversation = useCallback(() => {
    updateState({
      currentConversation: null,
      messages: [],
      error: null,
      lastOperation: 'clearCurrentConversation'
    });
  }, [updateState]);

  // Retry failed operations
  const retryLastOperation = useCallback(async () => {
    const lastOperation = state.lastOperation;
    if (!lastOperation) return;

    switch (lastOperation) {
      case 'loadConversations':
        await loadConversations();
        break;
      case 'loadConversation':
        if (state.currentConversation?.id) {
          await loadConversation(state.currentConversation.id);
        }
        break;
      case 'createConversation':
        await createConversation();
        break;
      case 'getOrCreateConversation':
        await getOrCreateConversation();
        break;
      default:
        console.warn('Unknown operation to retry:', lastOperation);
    }
  }, [state.lastOperation, state.currentConversation?.id, loadConversations, loadConversation, createConversation, getOrCreateConversation]);

  // Auto-load conversations when projectId changes
  useEffect(() => {
    if (autoLoad && projectId && !isInitializedRef.current) {
      isInitializedRef.current = true;
      queueOperation(() => loadConversations());
    }
  }, [projectId, autoLoad, loadConversations, queueOperation]);

  // Process operation queue
  useEffect(() => {
    processQueue();
  }, [processQueue]);

  return {
    // State
    ...state,

    // Actions
    loadConversations,
    loadConversation,
    createConversation,
    addMessage,
    deleteConversation,
    getOrCreateConversation,
    clearCurrentConversation,
    retryLastOperation,

    // Utilities
    isInitialized: isInitializedRef.current,
    hasActiveConversation: !!state.currentConversation,
    hasMessages: state.messages.length > 0,
    isOffline: state.isUsingFallback,
  };
}