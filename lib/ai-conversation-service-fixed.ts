// Fixed AI Conversation Service with Project_id Ambiguity Resolution
// This service uses safe query patterns to avoid SQL ambiguity issues

import { createServerSupabase } from '@/lib/supabaseServer';
import { createSafeQueryBuilder, DatabaseErrorHandler, DEFAULT_QUERY_OPTIONS } from '@/lib/database-query-builder';
import type { Database, Message, Conversation } from '@/types/database';

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

export class AIConversationServiceFixed {
  private supabase: any;
  private queryBuilder: any;

  constructor() {
    this.supabase = null;
    this.queryBuilder = null;
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerSupabase();
      this.queryBuilder = createSafeQueryBuilder(this.supabase);
    }
    return { supabase: this.supabase, queryBuilder: this.queryBuilder };
  }

  private handleError(error: any, operation: string) {
    console.error(`Error in ${operation}:`, error);

    // Check for specific ambiguity errors
    if (DatabaseErrorHandler.isAmbiguityError(error)) {
      throw new Error('Database query error: Column reference is ambiguous. This has been reported to the development team.');
    }

    if (DatabaseErrorHandler.isPermissionError(error)) {
      throw new Error('Permission denied: You do not have access to perform this operation.');
    }

    if (DatabaseErrorHandler.isNotFoundError(error)) {
      throw new Error('Resource not found: The requested conversation or message does not exist.');
    }

    // Handle other database errors
    const errorMessage = DatabaseErrorHandler.handlePostgresError(error);
    throw new Error(`${operation} failed: ${errorMessage}`);
  }

  /**
   * Creates a conversation with explicit column qualification and comprehensive error handling
   */
  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation | null> {
    try {
      const { queryBuilder } = await this.getSupabase();

      // Use the safe query builder to avoid ambiguity
      const { data, error } = await queryBuilder.createConversation({
        project_id: projectId,
        title: title || 'New AI Chat',
        created_by: userId,
        type,
        metadata: { type }
      });

      if (error) {
        this.handleError(error, 'createConversation');
      }

      return data;
    } catch (error) {
      this.handleError(error, 'createConversation');
      return null; // This line should never be reached due to error handling above
    }
  }

  /**
   * Gets a conversation with proper table aliasing and column qualification
   */
  async getConversation(
    conversationId: string,
    includeMessages: boolean = true
  ): Promise<AIConversation | null> {
    try {
      const { queryBuilder } = await this.getSupabase();

      if (includeMessages) {
        // Use the combined query to get conversation and messages together
        const { data, error } = await queryBuilder.getConversationWithMessages(conversationId);

        if (error) {
          this.handleError(error, 'getConversation');
        }

        return data;
      } else {
        // Get just the conversation
        const { data, error } = await queryBuilder.getConversations(
          { project_id: undefined }, // No filter needed since we'll filter by ID
          { limit: 1 }
        ).eq('conv.id', conversationId).single();

        if (error) {
          this.handleError(error, 'getConversation');
        }

        return data;
      }
    } catch (error) {
      this.handleError(error, 'getConversation');
      return null;
    }
  }

  /**
   * Gets project conversations with explicit table relationships and qualified columns
   */
  async getProjectConversations(
    projectId: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    try {
      const { queryBuilder } = await this.getSupabase();

      // Use the safe query builder with explicit project_id qualification
      const { data, error } = await queryBuilder.getProjectConversations(projectId, type);

      if (error) {
        this.handleError(error, 'getProjectConversations');
      }

      return data || [];
    } catch (error) {
      this.handleError(error, 'getProjectConversations');
      return [];
    }
  }

  /**
   * Adds a message to a conversation with validation and error handling
   */
  async addMessage(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): Promise<AIMessage | null> {
    try {
      const { queryBuilder } = await this.getSupabase();

      // Validate message data
      if (!message.content || message.content.trim() === '') {
        throw new Error('Message content cannot be empty');
      }

      if (!['user', 'assistant', 'system', 'tool'].includes(message.role)) {
        throw new Error('Invalid message role');
      }

      // Use the safe query builder to add the message
      const { data, error } = await queryBuilder.addMessage(conversationId, {
        role: message.role,
        content: message.content,
        author_id: message.author_id,
        metadata: message.metadata || {},
        ai_model: message.ai_model,
        ai_response_time_ms: message.ai_response_time_ms,
        ai_tokens_used: message.ai_tokens_used
      });

      if (error) {
        this.handleError(error, 'addMessage');
      }

      return data;
    } catch (error) {
      this.handleError(error, 'addMessage');
      return null;
    }
  }

  /**
   * Updates conversation title with error handling
   */
  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<boolean> {
    try {
      const { supabase } = await this.getSupabase();

      if (!title || title.trim() === '') {
        throw new Error('Conversation title cannot be empty');
      }

      const { error } = await supabase
        .from('conversations')
        .update({ title: title.trim() })
        .eq('id', conversationId);

      if (error) {
        this.handleError(error, 'updateConversationTitle');
      }

      return true;
    } catch (error) {
      this.handleError(error, 'updateConversationTitle');
      return false;
    }
  }

  /**
   * Deletes a conversation and its messages with transaction safety
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const { supabase } = await this.getSupabase();

      // Use a transaction-like approach by deleting in order
      // First delete messages (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        this.handleError(messagesError, 'deleteConversation.messages');
      }

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        this.handleError(conversationError, 'deleteConversation.conversation');
      }

      return true;
    } catch (error) {
      this.handleError(error, 'deleteConversation');
      return false;
    }
  }

  /**
   * Gets conversation analytics using the fixed view
   */
  async getConversationAnalytics(
    projectId?: string
  ): Promise<ConversationAnalytics[]> {
    try {
      const { supabase } = await this.getSupabase();

      // Use the fixed ai_conversation_analytics view
      let query = supabase
        .from('ai_conversation_analytics')
        .select('*');

      if (projectId) {
        query = query.eq('project_id', projectId); // This should work now with qualified columns
      }

      const { data, error } = await query;

      if (error) {
        this.handleError(error, 'getConversationAnalytics');
      }

      return data || [];
    } catch (error) {
      this.handleError(error, 'getConversationAnalytics');
      return [];
    }
  }

  /**
   * Search conversations with proper column qualification
   */
  async searchConversations(
    projectId: string,
    searchTerm: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    try {
      const { queryBuilder } = await this.getSupabase();

      // Use the safe query builder with explicit qualification
      const { data, error } = await queryBuilder.getConversations({
        project_id: projectId,
        type: type
      }, DEFAULT_QUERY_OPTIONS.conversations);

      // Apply search filtering (client-side for simplicity, could be moved to server-side)
      const filteredData = data?.filter(conv =>
        conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.metadata?.type?.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];

      return filteredData;
    } catch (error) {
      this.handleError(error, 'searchConversations');
      return [];
    }
  }

  /**
   * Gets or creates a conversation with fallback logic
   */
  async getOrCreateConversation(
    projectId: string,
    userId: string,
    title?: string
  ): Promise<AIConversation | null> {
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
      this.handleError(error, 'getOrCreateConversation');
      return null;
    }
  }

  /**
   * Batch operation to get multiple conversations efficiently
   */
  async getConversationsBatch(
    conversationIds: string[],
    includeMessages: boolean = false
  ): Promise<AIConversation[]> {
    try {
      const { queryBuilder } = await this.getSupabase();

      if (conversationIds.length === 0) {
        return [];
      }

      // Use IN clause for batch fetching
      const { data, error } = await queryBuilder.getConversations(
        {},
        { limit: conversationIds.length }
      ).in('conv.id', conversationIds);

      if (error) {
        this.handleError(error, 'getConversationsBatch');
      }

      const conversations = data || [];

      // If messages are requested, fetch them in batches
      if (includeMessages) {
        for (const conversation of conversations) {
          const { data: messages } = await queryBuilder.getMessages(
            conversation.id,
            {},
            DEFAULT_QUERY_OPTIONS.messages
          );
          conversation.messages = messages || [];
        }
      }

      return conversations;
    } catch (error) {
      this.handleError(error, 'getConversationsBatch');
      return [];
    }
  }

  /**
   * Health check method to verify database connectivity
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      const { supabase } = await this.getSupabase();

      // Simple connectivity test
      const { error } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);

      if (error) {
        return {
          status: 'unhealthy',
          error: DatabaseErrorHandler.handlePostgresError(error)
        };
      }

      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: DatabaseErrorHandler.handlePostgresError(error)
      };
    }
  }
}

// Export class for creating instances per request
export { AIConversationServiceFixed as AIConversationService };

// Convenience functions for direct usage (create new instance each time)
export const createAIConversation = async (
  projectId: string,
  userId: string,
  title?: string
) => {
  const service = new AIConversationServiceFixed();
  return await service.createConversation(projectId, userId, title);
};

export const getAIConversation = async (
  conversationId: string,
  includeMessages?: boolean
) => {
  const service = new AIConversationServiceFixed();
  return await service.getConversation(conversationId, includeMessages);
};

export const getProjectAIConversations = async (projectId: string) => {
  const service = new AIConversationServiceFixed();
  return await service.getProjectConversations(projectId);
};

export const addAIMessage = async (
  conversationId: string,
  message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
) => {
  const service = new AIConversationServiceFixed();
  return await service.addMessage(conversationId, message);
};

export const getOrCreateAIConversation = async (
  projectId: string,
  userId: string,
  title?: string
) => {
  const service = new AIConversationServiceFixed();
  return await service.getOrCreateConversation(projectId, userId, title);
};

// Export the health check function for monitoring
export const checkAIConversationHealth = async () => {
  const service = new AIConversationServiceFixed();
  return await service.healthCheck();
};