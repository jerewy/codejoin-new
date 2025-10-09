import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Database, Message, Conversation } from '@/types/database';
import { LocalStorageFallback } from '@/lib/local-storage-fallback';

export interface AIMessage extends Message {
  ai_model?: string;
  ai_response_time_ms?: number;
  ai_tokens_used?: number;
}

export interface AIConversation extends Conversation {
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

export class AIConversationService {
  private supabase;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  // Validate database connection before operations
  async validateDatabaseConnection(): Promise<boolean> {
    try {
      if (!this.supabase) {
        console.log('DEBUG: Cannot validate connection - no Supabase client');
        return false;
      }

      console.log('DEBUG: Validating database connection...');
      const { data, error } = await this.supabase
        .from('messages')
        .select('id')
        .limit(1);

      console.log('DEBUG: Database connection validation result:', {
        hasData: !!data,
        hasError: !!error,
        error: error,
        dataLength: data?.length || 0
      });

      return !error;
    } catch (error) {
      console.error('DEBUG: Database connection validation failed:', error);
      return false;
    }
  }

  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation | null> {
    // Try database first
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert({
          project_id: projectId,
          title: title || 'New AI Chat',
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
        console.error('Error creating conversation:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createConversation, falling back to local storage:', error);

      // Fallback to local storage
      try {
        const fallbackConversation: AIConversation = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          project_id: projectId,
          title: title || 'New AI Chat',
          created_by: userId,
          type,
          metadata: { type },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Save to local storage
        const conversations = LocalStorageFallback.loadConversations();
        conversations.unshift(fallbackConversation);
        LocalStorageFallback.saveConversations(conversations);
        LocalStorageFallback.saveCurrentConversation(fallbackConversation);

        console.log('Conversation saved to local storage fallback');
        return fallbackConversation;
      } catch (fallbackError) {
        console.error('Failed to save conversation to local storage:', fallbackError);
        return null;
      }
    }
  }

  async getConversation(
    conversationId: string,
    includeMessages: boolean = true
  ): Promise<AIConversation | null> {
    try {
      let query = this.supabase
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

      const { data: conversation, error: conversationError } = await query;

      if (conversationError) {
        console.error('Error fetching conversation:', conversationError);
        return null;
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
          console.error('Error fetching messages:', messagesError);
          return null;
        }

        return {
          ...conversation,
          messages: messages || []
        };
      }

      return conversation;
    } catch (error) {
      console.error('Error in getConversation:', error);
      return null;
    }
  }

  async getProjectConversations(
    projectId: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    // Try database first
    try {
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
        console.error('Error fetching project conversations:', error);
        throw error;
      }

      // Merge with local storage fallback conversations
      const localConversations = LocalStorageFallback.loadConversations()
        .filter(conv => conv.project_id === projectId && conv.type === type);

      // Combine database and local conversations, removing duplicates
      const allConversations = [...(data || []), ...localConversations];
      const uniqueConversations = allConversations.filter((conv, index, arr) =>
        arr.findIndex(c => c.id === conv.id) === index
      );

      return uniqueConversations.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (error) {
      console.error('Error in getProjectConversations, falling back to local storage:', error);

      // Fallback to local storage only
      try {
        const localConversations = LocalStorageFallback.loadConversations()
          .filter(conv => conv.project_id === projectId && conv.type === type)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        console.log('Loaded conversations from local storage fallback');
        return localConversations;
      } catch (fallbackError) {
        console.error('Failed to load conversations from local storage:', fallbackError);
        return [];
      }
    }
  }

  async addMessage(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): Promise<AIMessage | null> {
    // Try database first
    try {
      // Debug: Check Supabase client availability
      console.log('DEBUG: Supabase client check:', {
        hasClient: !!this.supabase,
        clientType: typeof this.supabase,
        isWindowDefined: typeof window !== 'undefined',
        envVars: {
          url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      });

      if (!this.supabase) {
        throw new Error('Supabase client is not available - missing environment variables or server-side execution');
      }

      // Validate database connection before proceeding
      const isConnectionValid = await this.validateDatabaseConnection();
      if (!isConnectionValid) {
        console.warn('Database connection validation failed, proceeding with local storage fallback');
        throw new Error('Database connection failed - using local storage fallback');
      }

      const messageData: any = {
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {}
      };

      // Debug: Log message data being sent
      console.log('DEBUG: Message data being inserted:', {
        conversationId,
        messageData,
        originalMessage: message
      });

      // Add AI-specific fields if they exist
      if (message.ai_model) {
        messageData.ai_model = message.ai_model;
      }
      if (message.ai_response_time_ms) {
        messageData.ai_response_time_ms = message.ai_response_time_ms;
      }
      if (message.ai_tokens_used) {
        messageData.ai_tokens_used = message.ai_tokens_used;
      }
      if (message.author_id) {
        messageData.author_id = message.author_id;
      }

      console.log('DEBUG: Executing Supabase insert operation...');
      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      console.log('DEBUG: Supabase operation result:', {
        data: !!data,
        error: !!error,
        errorDetails: error,
        dataDetails: data
      });

      if (error) {
        console.error('Error adding message:', error);
        throw new Error(`Database error: ${error.message || 'Unknown database error'}`);
      }

      if (!data) {
        throw new Error('No data returned from database insert operation');
      }

      return data;
    } catch (error) {
      // Enhanced error logging with proper error object handling
      console.log('DEBUG: Caught error in addMessage:', {
        errorType: typeof error,
        errorIsError: error instanceof Error,
        errorIsNull: error === null,
        errorIsUndefined: error === undefined,
        errorString: String(error),
        errorJson: JSON.stringify(error, null, 2),
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
        errorDetails: error
      });

      let enhancedError: Error;

      if (error instanceof Error) {
        enhancedError = error;
      } else if (error === null || error === undefined) {
        enhancedError = new Error('Null or undefined error occurred');
      } else if (typeof error === 'string') {
        enhancedError = new Error(error);
      } else if (typeof error === 'object') {
        // Handle Supabase error objects specifically
        const errorObj = error as any;

        let message = 'Unknown object error';

        // Try different Supabase error message fields
        if (errorObj.message) {
          message = errorObj.message;
        } else if (errorObj.error_description) {
          message = errorObj.error_description;
        } else if (errorObj.details) {
          message = errorObj.details;
        } else if (errorObj.error) {
          message = errorObj.error;
        } else if (JSON.stringify(errorObj) !== '{}') {
          message = JSON.stringify(errorObj);
        }

        enhancedError = new Error(message);

        // Copy Supabase-specific properties for debugging
        if (errorObj.code) {
          enhancedError.name = `SupabaseError(${errorObj.code})`;
          (enhancedError as any).supabaseCode = errorObj.code;
        }
        if (errorObj.hint) (enhancedError as any).hint = errorObj.hint;
        if (errorObj.details) (enhancedError as any).details = errorObj.details;
        if (errorObj.error_description) (enhancedError as any).errorDescription = errorObj.error_description;

        // Copy any other properties
        Object.keys(errorObj).forEach(key => {
          if (!['message', 'code', 'hint', 'details', 'error_description', 'error'].includes(key)) {
            (enhancedError as any)[key] = errorObj[key];
          }
        });
      } else {
        enhancedError = new Error(String(error) || 'Unknown error occurred');
      }

      console.error('Error in addMessage, falling back to local storage:', {
        message: enhancedError.message,
        stack: enhancedError.stack,
        originalError: error,
        enhancedErrorType: typeof enhancedError,
        enhancedErrorKeys: Object.keys(enhancedError),
        conversationId,
        messageRole: message.role,
        timestamp: new Date().toISOString()
      });

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

        // Save to local storage
        LocalStorageFallback.addMessage(conversationId, fallbackMessage);
        console.log('Message saved to local storage fallback successfully');
        return fallbackMessage;
      } catch (fallbackError) {
        const enhancedFallbackError = fallbackError instanceof Error ? fallbackError : new Error(JSON.stringify(fallbackError) || 'Unknown fallback error');
        console.error('Failed to save message to local storage:', {
          message: enhancedFallbackError.message,
          stack: enhancedFallbackError.stack,
          conversationId,
          timestamp: new Date().toISOString()
        });
        throw enhancedFallbackError;
      }
    }
  }

  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating conversation title:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateConversationTitle:', error);
      return false;
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      // Delete messages first (due to foreign key constraint)
      const { error: messagesError } = await this.supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return false;
      }

      // Delete conversation
      const { error: conversationError } = await this.supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      return false;
    }
  }

  async getConversationAnalytics(
    projectId?: string
  ): Promise<ConversationAnalytics[]> {
    try {
      let query = this.supabase
        .from('ai_conversation_analytics')
        .select(`
          id,
          project_id,
          title,
          created_at,
          updated_at,
          ai_messages_count,
          user_messages_count,
          total_tokens_used,
          avg_response_time_ms,
          first_ai_model,
          latest_ai_model,
          metadata
        `);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversation analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getConversationAnalytics:', error);
      return [];
    }
  }

  async searchConversations(
    projectId: string,
    searchTerm: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('project_id', projectId)
        .eq('type', type)
        .or(`title.ilike.%${searchTerm}%,metadata->>type.ilike.%${searchTerm}%`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error searching conversations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchConversations:', error);
      return [];
    }
  }

  async getOrCreateConversation(
    projectId: string,
    userId: string,
    title?: string
  ): Promise<AIConversation | null> {
    // First try to find an existing AI conversation for this project
    const existingConversations = await this.getProjectConversations(projectId);

    if (existingConversations.length > 0) {
      // Return the most recently updated conversation
      return existingConversations[0];
    }

    // Create a new conversation
    return await this.createConversation(projectId, userId, title);
  }
}

// Singleton instance
export const aiConversationService = new AIConversationService();

// Convenience functions for direct usage
export const createAIConversation = (
  projectId: string,
  userId: string,
  title?: string
) => aiConversationService.createConversation(projectId, userId, title);

export const getAIConversation = (
  conversationId: string,
  includeMessages?: boolean
) => aiConversationService.getConversation(conversationId, includeMessages);

export const getProjectAIConversations = (projectId: string) =>
  aiConversationService.getProjectConversations(projectId);

export const addAIMessage = (
  conversationId: string,
  message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
) => aiConversationService.addMessage(conversationId, message);

export const getOrCreateAIConversation = (
  projectId: string,
  userId: string,
  title?: string
) => aiConversationService.getOrCreateConversation(projectId, userId, title);