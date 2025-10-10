import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SimpleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    provider?: string;
    tokensUsed?: number;
    responseTime?: number;
    backend?: boolean;
    fallback?: boolean;
  };
}

interface SimpleConversation {
  id: string;
  title: string;
  messages: SimpleMessage[];
  createdAt: string;
  updatedAt: string;
}

export function useSimpleChat(projectId?: string) {
  const { toast } = useToast();

  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string>('AI Assistant Chat');

  // Generate conversation ID
  const generateConversationId = useCallback(() => {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Get storage key for conversation
  const getStorageKey = useCallback((convId: string) => {
    return `simple_chat_${projectId || 'default'}_${convId}`;
  }, [projectId]);

  // Save conversation to localStorage
  const saveConversation = useCallback((convId: string, convMessages: SimpleMessage[]) => {
    try {
      const conversation: SimpleConversation = {
        id: convId,
        title: currentTitle,
        messages: convMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const storageKey = getStorageKey(convId);
      localStorage.setItem(storageKey, JSON.stringify(conversation));

      // Save conversation ID to active conversations list
      const activeKey = `simple_chat_active_${projectId || 'default'}`;
      const activeConversations = JSON.parse(localStorage.getItem(activeKey) || '[]');
      if (!activeConversations.includes(convId)) {
        activeConversations.unshift(convId);
        localStorage.setItem(activeKey, JSON.stringify(activeConversations));
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }, [currentTitle, getStorageKey, projectId]);

  // Load conversation from localStorage
  const loadConversation = useCallback((convId: string) => {
    try {
      const storageKey = getStorageKey(convId);
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const conversation: SimpleConversation = JSON.parse(stored);
        setMessages(conversation.messages || []);
        setConversationId(convId);
        setCurrentTitle(conversation.title);
        return true;
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
    return false;
  }, [getStorageKey]);

  // Create new conversation
  const createNewConversation = useCallback(() => {
    const newConvId = generateConversationId();
    setConversationId(newConvId);
    setMessages([]);
    setCurrentTitle('AI Assistant Chat');

    // Save empty conversation
    saveConversation(newConvId, []);

    toast({
      title: "New Chat",
      description: "Started a new conversation",
    });
  }, [generateConversationId, saveConversation, toast]);

  // Clear current conversation
  const clearConversation = useCallback(() => {
    if (conversationId) {
      setMessages([]);
      saveConversation(conversationId, []);

      toast({
        title: "Chat Cleared",
        description: "Current conversation has been cleared",
      });
    }
  }, [conversationId, saveConversation, toast]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Create conversation if none exists
    if (!conversationId) {
      createNewConversation();
    }

    const userMessage: SimpleMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveConversation(conversationId!, updatedMessages);

    setIsLoading(true);

    try {
      // Call the frontend API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          context: 'AI Assistant Chat',
          conversationId: conversationId,
          projectId
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: SimpleMessage = {
          id: `msg_${Date.now()}_assistant`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          metadata: {
            model: data.metadata?.model,
            provider: data.metadata?.provider,
            tokensUsed: data.metadata?.tokensUsed,
            responseTime: data.metadata?.responseTime,
            backend: data.metadata?.backend,
            fallback: data.metadata?.fallback
          }
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        saveConversation(conversationId!, finalMessages);

      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // Add error message
      const errorMessage: SimpleMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        metadata: {
          error: true,
          fallback: true
        }
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveConversation(conversationId!, finalMessages);

      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, createNewConversation, saveConversation, projectId, toast]);

  // Load the most recent conversation on mount
  useEffect(() => {
    if (projectId) {
      try {
        const activeKey = `simple_chat_active_${projectId}`;
        const activeConversations = JSON.parse(localStorage.getItem(activeKey) || '[]');

        if (activeConversations.length > 0) {
          loadConversation(activeConversations[0]);
        } else {
          // Create new conversation if none exists
          createNewConversation();
        }
      } catch (error) {
        console.error('Failed to load active conversations:', error);
        createNewConversation();
      }
    }
  }, [projectId, loadConversation, createNewConversation]);

  // Update conversation title based on first user message
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'user') {
      const firstMessage = messages[0].content;
      const title = firstMessage.length > 30
        ? firstMessage.substring(0, 30) + '...'
        : firstMessage;

      setCurrentTitle(title);

      if (conversationId) {
        const storageKey = getStorageKey(conversationId);
        const stored = localStorage.getItem(storageKey);

        if (stored) {
          const conversation: SimpleConversation = JSON.parse(stored);
          conversation.title = title;
          localStorage.setItem(storageKey, JSON.stringify(conversation));
        }
      }
    }
  }, [messages, conversationId, getStorageKey]);

  return {
    messages,
    isLoading,
    conversationId,
    currentTitle,
    sendMessage,
    clearConversation,
    createNewConversation,
    hasMessages: messages.length > 0,
    messageCount: messages.length
  };
}