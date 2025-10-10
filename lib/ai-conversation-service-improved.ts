import { getSupabaseClient } from '@/lib/supabaseClient';
import { getServerSupabase } from '@/lib/supabaseServer';
import type { Database, Message, Conversation } from '@/types/database';
import { LocalStorageFallback } from '@/lib/local-storage-fallback';

// Enhanced type definitions with stricter validation
export interface AIMessage extends Omit<Message, 'id' | 'created_at' | 'conversation_id'> {
  // Make optional fields explicitly optional
  ai_model?: string | null;
  ai_response_time_ms?: number | null;
  ai_tokens_used?: number | null;
  // Add required fields for creation
  conversation_id: string;
  created_at: string;
  id: string;
}

export interface AIConversation extends Omit<Conversation, 'messages'> {
  type: 'ai-chat';
  metadata?: {
    type: 'ai-chat';
    auto_generated?: boolean;
    first_message_length?: number;
    total_messages?: number;
    last_ai_model?: string;
  };
  messages?: AIMessage[];
}

export interface ConversationAnalytics {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  ai_messages_count: number;
  user_messages_count: number;
  total_tokens_used: number;
  avg_response_time_ms: number;
  first_ai_model?: string;
  latest_ai_model?: string;
  metadata?: any;
}

// Enhanced error types
export class ConversationServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public isRecoverable: boolean = true
  ) {
    super(message);
    this.name = 'ConversationServiceError';
  }
}

export class DatabaseConnectionError extends ConversationServiceError {
  constructor(details?: any) {
    super(
      'Database connection failed - using local storage fallback',
      'DATABASE_CONNECTION_FAILED',
      details,
      true
    );
    this.name = 'DatabaseConnectionError';
  }
}

export class ValidationError extends ConversationServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details, false);
    this.name = 'ValidationError';
  }
}

export class RLSPermissionError extends ConversationServiceError {
  constructor(resource: string, action: string) {
    super(
      `Permission denied for ${action} on ${resource}. Please check your authentication status.`,
      'RLS_PERMISSION_DENIED',
      { resource, action },
      false
    );
    this.name = 'RLSPermissionError';
  }
}

// Utility functions for validation
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateProjectId(projectId: string): void {
  if (!projectId || typeof projectId !== 'string') {
    throw new ValidationError('Project ID is required and must be a string');
  }
  if (projectId !== 'default-project' && !validateUUID(projectId)) {
    throw new ValidationError('Invalid project ID format. Expected UUID or "default-project"');
  }
}

export function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string') {
    throw new ValidationError('User ID is required and must be a string');
  }
  if (!validateUUID(userId)) {
    throw new ValidationError('Invalid user ID format. Expected UUID');
  }
}

export function validateConversationId(conversationId: string): void {
  if (!conversationId || typeof conversationId !== 'string') {
    throw new ValidationError('Conversation ID is required and must be a string');
  }
  // Allow both UUID and local storage IDs
  if (!validateUUID(conversationId) && !conversationId.startsWith('local_')) {
    throw new ValidationError('Invalid conversation ID format. Expected UUID or local storage ID');
  }
}

export function sanitizeConversationTitle(title?: string): string {
  if (!title) return 'AI Assistant Chat';
  const sanitized = title.trim().slice(0, 200);
  return sanitized || 'AI Assistant Chat';
}

export class ImprovedAIConversationService {
  private supabase;
  private isServerSide: boolean;

  constructor() {
    this.isServerSide = typeof window === 'undefined';
    try {
      if (this.isServerSide) {
        // Server-side will be handled differently - use server-side service
        this.supabase = null;
      } else {
        this.supabase = getSupabaseClient();
      }
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      this.supabase = null;
    }
  }

  private async handleSupabaseError<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      if (!this.supabase && !this.isServerSide) {
        throw new DatabaseConnectionError('Supabase client not available');
      }

      const result = await operation();
      return result;
    } catch (error) {
      console.error('Supabase operation failed:', error);

      // Check for specific error types
      if (error instanceof ConversationServiceError) {
        throw error;
      }

      // Handle Supabase specific errors
      if (error && typeof error === 'object') {
        const supabaseError = error as any;

        // RLS permission errors
        if (supabaseError.code === 'PGRST116' || supabaseError.message?.includes('permission denied')) {
          throw new RLSPermissionError('conversations', 'create/fetch');
        }

        // Foreign key constraint errors
        if (supabaseError.code === '23503') {
          throw new ValidationError('Referenced resource does not exist', supabaseError);
        }

        // Unique constraint errors
        if (supabaseError.code === '23505') {
          throw new ValidationError('Resource already exists', supabaseError);
        }
      }

      // Network/connection errors
      if (error instanceof Error && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('connection')
      )) {
        throw new DatabaseConnectionError(error);
      }

      // Try fallback for recoverable errors
      if (error instanceof ConversationServiceError && error.isRecoverable) {
        console.log('Attempting fallback operation...');
        return await fallback();
      }

      throw error;
    }
  }

  async validateDatabaseConnection(): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('id')
        .limit(1);

      return !error && !!data;
    } catch {
      return false;
    }
  }

  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation | null> {
    // Validate inputs
    validateProjectId(projectId);
    validateUserId(userId);
    const sanitizedTitle = sanitizeConversationTitle(title);

    return this.handleSupabaseError(
      async () => {
        if (!this.supabase) throw new DatabaseConnectionError();

        const { data, error } = await this.supabase
          .from('conversations')
          .insert({
            project_id: projectId,
            title: sanitizedTitle,
            created_by: userId,
            type,
            metadata: { type }
          })
          .select(`
            id,
            project_id,
            node_id,
            title,
            created_by,
            created_at,
            updated_at,
            type,
            metadata
          `)
          .single();

        if (error) {
          throw new ConversationServiceError(
            `Failed to create conversation: ${error.message}`,
            'CREATE_CONVERSATION_FAILED',
            error
          );
        }

        return data as AIConversation;
      },
      async () => {
        // Fallback to local storage
        const fallbackConversation: AIConversation = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          project_id: projectId,
          title: sanitizedTitle,
          created_by: userId,
          type,
          metadata: { type },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          const conversations = LocalStorageFallback.loadConversations();
          conversations.unshift(fallbackConversation);
          LocalStorageFallback.saveConversations(conversations);
          LocalStorageFallback.saveCurrentConversation(fallbackConversation);

          console.log('Conversation saved to local storage fallback');
          return fallbackConversation;
        } catch (fallbackError) {
          console.error('Failed to save conversation to local storage:', fallbackError);
          throw new ConversationServiceError(
            'Failed to save conversation to both database and local storage',
            'STORAGE_FAILED',
            fallbackError,
            false
          );
        }
      }
    );
  }

  async getConversation(
    conversationId: string,
    includeMessages: boolean = true
  ): Promise<AIConversation | null> {
    validateConversationId(conversationId);

    return this.handleSupabaseError(
      async () => {
        if (!this.supabase) throw new DatabaseConnectionError();

        const { data: conversation, error: conversationError } = await this.supabase
          .from('conversations')
          .select(`
            id,
            project_id,
            node_id,
            title,
            created_by,
            created_at,
            updated_at,
            type,
            metadata,
            project:projects(id, name)
          `)
          .eq('id', conversationId)
          .single();

        if (conversationError) {
          if (conversationError.code === 'PGRST116') {
            return null; // Not found
          }
          throw new ConversationServiceError(
            `Failed to fetch conversation: ${conversationError.message}`,
            'GET_CONVERSATION_FAILED',
            conversationError
          );
        }

        if (includeMessages) {
          const { data: messages, error: messagesError } = await this.supabase
            .from('messages')
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
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (messagesError) {
            throw new ConversationServiceError(
              `Failed to fetch messages: ${messagesError.message}`,
              'GET_MESSAGES_FAILED',
              messagesError
            );
          }

          return {
            ...conversation,
            messages: messages || []
          } as AIConversation;
        }

        return conversation as AIConversation;
      },
      async () => {
        // Fallback to local storage
        try {
          const conversations = LocalStorageFallback.loadConversations();
          const conversation = conversations.find(c => c.id === conversationId);

          if (conversation) {
            const messages = LocalStorageFallback.loadMessages(conversationId);
            return {
              ...conversation,
              messages
            };
          }

          return null;
        } catch (fallbackError) {
          console.error('Failed to load conversation from local storage:', fallbackError);
          throw new ConversationServiceError(
            'Failed to load conversation from local storage',
            'LOCAL_STORAGE_FAILED',
            fallbackError
          );
        }
      }
    );
  }

  async getProjectConversations(
    projectId: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    validateProjectId(projectId);

    return this.handleSupabaseError(
      async () => {
        if (!this.supabase) throw new DatabaseConnectionError();

        const { data, error } = await this.supabase
          .from('conversations')
          .select(`
            *,
            project:projects(id, name),
            messages(count)
          `)
          .eq('project_id', projectId)
          .eq('type', type)
          .order('updated_at', { ascending: false });

        if (error) {
          throw new ConversationServiceError(
            `Failed to fetch project conversations: ${error.message}`,
            'GET_PROJECT_CONVERSATIONS_FAILED',
            error
          );
        }

        return data as AIConversation[];
      },
      async () => {
        // Fallback to local storage only
        try {
          const localConversations = LocalStorageFallback.loadConversations()
            .filter(conv => conv.project_id === projectId && conv.type === type)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

          console.log('Loaded conversations from local storage fallback');
          return localConversations;
        } catch (fallbackError) {
          console.error('Failed to load conversations from local storage:', fallbackError);
          throw new ConversationServiceError(
            'Failed to load conversations from local storage',
            'LOCAL_STORAGE_FAILED',
            fallbackError
          );
        }
      }
    );
  }

  async addMessage(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): Promise<AIMessage | null> {
    validateConversationId(conversationId);

    // Validate message structure
    if (!message.role || !['user', 'assistant', 'system', 'tool'].includes(message.role)) {
      throw new ValidationError('Invalid message role');
    }
    if (!message.content || typeof message.content !== 'string') {
      throw new ValidationError('Message content is required and must be a string');
    }

    return this.handleSupabaseError(
      async () => {
        if (!this.supabase) throw new DatabaseConnectionError();

        // Validate database connection before proceeding
        const isConnectionValid = await this.validateDatabaseConnection();
        if (!isConnectionValid) {
          throw new DatabaseConnectionError('Database connection validation failed');
        }

        const messageData: any = {
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {}
        };

        // Add AI-specific fields if they exist
        if (message.ai_model) messageData.ai_model = message.ai_model;
        if (message.ai_response_time_ms) messageData.ai_response_time_ms = message.ai_response_time_ms;
        if (message.ai_tokens_used) messageData.ai_tokens_used = message.ai_tokens_used;
        if (message.author_id) messageData.author_id = message.author_id;

        const { data, error } = await this.supabase
          .from('messages')
          .insert(messageData)
          .select()
          .single();

        if (error) {
          throw new ConversationServiceError(
            `Failed to add message: ${error.message}`,
            'ADD_MESSAGE_FAILED',
            error
          );
        }

        if (!data) {
          throw new ConversationServiceError(
            'No data returned from database insert operation',
            'NO_DATA_RETURNED',
            null,
            false
          );
        }

        return data as AIMessage;
      },
      async () => {
        // Fallback to local storage
        try {
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

          LocalStorageFallback.addMessage(conversationId, fallbackMessage);
          console.log('Message saved to local storage fallback successfully');
          return fallbackMessage;
        } catch (fallbackError) {
          const enhancedError = fallbackError instanceof Error ? fallbackError : new Error(JSON.stringify(fallbackError) || 'Unknown fallback error');
          console.error('Failed to save message to local storage:', enhancedError);
          throw new ConversationServiceError(
            'Failed to save message to local storage',
            'LOCAL_STORAGE_FAILED',
            enhancedError,
            false
          );
        }
      }
    );
  }

  async getOrCreateConversation(
    projectId: string,
    userId: string,
    title?: string
  ): Promise<AIConversation | null> {
    validateProjectId(projectId);
    validateUserId(userId);

    try {
      // First try to find an existing AI conversation for this project
      const existingConversations = await this.getProjectConversations(projectId);

      if (existingConversations.length > 0) {
        // Return the most recently updated conversation
        return existingConversations[0];
      }

      // Create a new conversation
      return await this.createConversation(projectId, userId, title);
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  }
}

// Singleton instance for client-side usage
export const improvedAiConversationService = new ImprovedAIConversationService();

// Convenience functions for direct usage
export const createImprovedAIConversation = (
  projectId: string,
  userId: string,
  title?: string
) => improvedAiConversationService.createConversation(projectId, userId, title);

export const getImprovedAIConversation = (
  conversationId: string,
  includeMessages?: boolean
) => improvedAiConversationService.getConversation(conversationId, includeMessages);

export const getProjectImprovedAIConversations = (projectId: string) =>
  improvedAiConversationService.getProjectConversations(projectId);

export const addImprovedAIMessage = (
  conversationId: string,
  message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
) => improvedAiConversationService.addMessage(conversationId, message);

export const getOrCreateImprovedAIConversation = (
  projectId: string,
  userId: string,
  title?: string
) => improvedAiConversationService.getOrCreateConversation(projectId, userId, title);