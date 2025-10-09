import { createServerSupabase } from '@/lib/supabaseServer';
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

export interface QueryLogger {
  logQuery: (query: string, params?: any[], error?: any) => void;
  logPerformance: (operation: string, duration: number, recordCount?: number) => void;
}

class DefaultQueryLogger implements QueryLogger {
  logQuery(query: string, params?: any[], error?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SQL Query] ${query}`, params || []);
      if (error) {
        console.error(`[SQL Error] ${error.message || error}`, error);
      }
    }
  }

  logPerformance(operation: string, duration: number, recordCount?: number) {
    if (process.env.NODE_ENV === 'development' || duration > 1000) {
      console.log(`[Performance] ${operation}: ${duration}ms${recordCount !== undefined ? ` (${recordCount} records)` : ''}`);
    }
  }
}

export class AIConversationServiceServer {
  private supabase: any;
  private logger: QueryLogger;

  constructor(logger?: QueryLogger) {
    this.supabase = null;
    this.logger = logger || new DefaultQueryLogger();
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerSupabase();
    }
    return this.supabase;
  }

  private logQuery(operation: string, query: string, params?: any[], error?: any) {
    this.logger.logQuery(`[${operation}] ${query}`, params, error);
  }

  private logPerformance(operation: string, startTime: number, recordCount?: number) {
    const duration = Date.now() - startTime;
    this.logger.logPerformance(operation, duration, recordCount);
  }

  /**
   * Creates a conversation with explicit column qualification and error handling
   */
  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation | null> {
    const startTime = Date.now();
    const operation = 'createConversation';

    try {
      const supabase = await this.getSupabase();

      // Explicit column qualification to avoid ambiguity
      const { data, error } = await supabase
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
          metadata,
          project:projects(id, name)
        `)
        .single();

      this.logQuery(operation, 'INSERT conversations WITH project JOIN', [projectId, userId, type]);

      if (error) {
        this.logQuery(operation, 'INSERT FAILED', [projectId, userId, type], error);
        console.error('Error creating conversation:', error);

        // Enhanced error handling
        if (error.code === '42501') {
          throw new Error('Permission denied: You do not have access to create conversations in this project');
        } else if (error.code === '23503') {
          throw new Error('Invalid project: The specified project does not exist');
        } else if (error.code === '23505') {
          throw new Error('Duplicate conversation: A conversation with these details already exists');
        }

        return null;
      }

      this.logPerformance(operation, startTime, 1);
      return data;
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [projectId, userId], error);
      console.error('Error in createConversation:', error);
      throw error; // Re-throw to let caller handle
    }
  }

  /**
   * Gets a conversation with proper table aliasing and column qualification
   */
  async getConversation(
    conversationId: string,
    includeMessages: boolean = true
  ): Promise<AIConversation | null> {
    const startTime = Date.now();
    const operation = 'getConversation';

    try {
      const supabase = await this.getSupabase();

      // Use explicit table aliasing and qualified column names
      let query = supabase
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
          project:projects!conversations_project_id_fkey(id, name)
        `)
        .eq('id', conversationId)
        .single();

      this.logQuery(operation, 'SELECT conversation WITH project JOIN', [conversationId]);

      const { data: conversation, error: conversationError } = await query;

      if (conversationError) {
        this.logQuery(operation, 'SELECT FAILED', [conversationId], conversationError);

        // Enhanced error handling
        if (conversationError.code === 'PGRST116') {
          console.log('Conversation not found:', conversationId);
          return null;
        } else if (conversationError.code === '42501') {
          throw new Error('Permission denied: You do not have access to this conversation');
        }

        console.error('Error fetching conversation:', conversationError);
        return null;
      }

      let fullConversation = conversation;

      if (includeMessages) {
        const messagesStartTime = Date.now();

        // Fetch messages for the conversation
        const { data: messages, error: messagesError } = await supabase
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

        this.logQuery(`${operation}_messages`, 'SELECT messages BY conversation_id', [conversationId]);

        if (messagesError) {
          this.logQuery(`${operation}_messages`, 'SELECT FAILED', [conversationId], messagesError);
          console.error('Error fetching messages:', messagesError);
          return null;
        }

        fullConversation = {
          ...conversation,
          messages: messages || []
        };

        this.logPerformance(`${operation}_messages`, messagesStartTime, messages?.length || 0);
      }

      this.logPerformance(operation, startTime, 1);
      return fullConversation;
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [conversationId], error);
      console.error('Error in getConversation:', error);
      throw error;
    }
  }

  /**
   * Gets project conversations with explicit table relationships and qualified columns
   */
  async getProjectConversations(
    projectId: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    const startTime = Date.now();
    const operation = 'getProjectConversations';

    try {
      const supabase = await this.getSupabase();

      // Use explicit foreign key relationship and qualified columns
      const { data, error } = await supabase
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
          project:projects!conversations_project_id_fkey(id, name),
          messages(count)
        `)
        .eq('project_id', projectId)  // Qualified column reference
        .eq('type', type)
        .order('updated_at', { ascending: false });

      this.logQuery(operation, 'SELECT conversations BY project_id WITH relationships', [projectId, type]);

      if (error) {
        this.logQuery(operation, 'SELECT FAILED', [projectId, type], error);

        // Enhanced error handling
        if (error.code === '42501') {
          throw new Error('Permission denied: You do not have access to conversations in this project');
        } else if (error.code === 'PGRST116') {
          console.log('No conversations found for project:', projectId);
          return [];
        }

        console.error('Error fetching project conversations:', error);
        return [];
      }

      this.logPerformance(operation, startTime, data?.length || 0);
      return data || [];
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [projectId, type], error);
      console.error('Error in getProjectConversations:', error);
      throw error;
    }
  }

  /**
   * Adds a message to a conversation with validation and error handling
   */
  async addMessage(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): Promise<AIMessage | null> {
    const startTime = Date.now();
    const operation = 'addMessage';

    try {
      const supabase = await this.getSupabase();

      // Validate conversation exists first
      const { data: conversation, error: conversationCheckError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single();

      if (conversationCheckError || !conversation) {
        this.logQuery(operation, 'CONVERSATION_CHECK_FAILED', [conversationId], conversationCheckError);
        throw new Error('Conversation not found or access denied');
      }

      const messageData: any = {
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {}
      };

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

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
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

      this.logQuery(operation, 'INSERT message', [conversationId, message.role]);

      if (error) {
        this.logQuery(operation, 'INSERT FAILED', [conversationId, message.role], error);

        // Enhanced error handling
        if (error.code === '23503') {
          throw new Error('Invalid conversation: The specified conversation does not exist');
        } else if (error.code === '42501') {
          throw new Error('Permission denied: You do not have access to add messages to this conversation');
        } else if (error.code === '23514') {
          throw new Error('Invalid message data: The message data violates constraints');
        }

        console.error('Error adding message:', error);
        return null;
      }

      this.logPerformance(operation, startTime, 1);
      return data;
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [conversationId], error);
      console.error('Error in addMessage:', error);
      throw error;
    }
  }

  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<boolean> {
    const startTime = Date.now();
    const operation = 'updateConversationTitle';

    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);

      this.logQuery(operation, 'UPDATE conversation title', [conversationId, title]);

      if (error) {
        this.logQuery(operation, 'UPDATE FAILED', [conversationId, title], error);
        console.error('Error updating conversation title:', error);
        return false;
      }

      this.logPerformance(operation, startTime);
      return true;
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [conversationId, title], error);
      console.error('Error in updateConversationTitle:', error);
      return false;
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    const startTime = Date.now();
    const operation = 'deleteConversation';

    try {
      const supabase = await this.getSupabase();

      // Delete messages first (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        this.logQuery(operation, 'DELETE MESSAGES FAILED', [conversationId], messagesError);
        console.error('Error deleting messages:', messagesError);
        return false;
      }

      // Delete conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        this.logQuery(operation, 'DELETE CONVERSATION FAILED', [conversationId], conversationError);
        console.error('Error deleting conversation:', conversationError);
        return false;
      }

      this.logPerformance(operation, startTime);
      this.logQuery(operation, 'DELETE conversation and messages', [conversationId]);
      return true;
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [conversationId], error);
      console.error('Error in deleteConversation:', error);
      return false;
    }
  }

  async getConversationAnalytics(
    projectId?: string
  ): Promise<ConversationAnalytics[]> {
    const startTime = Date.now();
    const operation = 'getConversationAnalytics';

    try {
      const supabase = await this.getSupabase();
      let query = supabase
        .from('ai_conversation_analytics')
        .select('*');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      this.logQuery(operation, 'SELECT analytics', projectId ? [projectId] : []);

      if (error) {
        this.logQuery(operation, 'SELECT FAILED', projectId ? [projectId] : [], error);
        console.error('Error fetching conversation analytics:', error);
        return [];
      }

      this.logPerformance(operation, startTime, data?.length || 0);
      return data || [];
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', projectId ? [projectId] : [], error);
      console.error('Error in getConversationAnalytics:', error);
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
    const startTime = Date.now();
    const operation = 'searchConversations';

    try {
      const supabase = await this.getSupabase();

      // Use explicit foreign key relationship and qualified columns
      const { data, error } = await supabase
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
          project:projects!conversations_project_id_fkey(id, name)
        `)
        .eq('project_id', projectId)  // Qualified column reference
        .eq('type', type)
        .or(`title.ilike.%${searchTerm}%,metadata->>type.ilike.%${searchTerm}%`)
        .order('updated_at', { ascending: false });

      this.logQuery(operation, 'SEARCH conversations', [projectId, type, searchTerm]);

      if (error) {
        this.logQuery(operation, 'SEARCH FAILED', [projectId, type, searchTerm], error);
        console.error('Error searching conversations:', error);
        return [];
      }

      this.logPerformance(operation, startTime, data?.length || 0);
      return data || [];
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [projectId, type, searchTerm], error);
      console.error('Error in searchConversations:', error);
      return [];
    }
  }

  async getOrCreateConversation(
    projectId: string,
    userId: string,
    title?: string
  ): Promise<AIConversation | null> {
    const startTime = Date.now();
    const operation = 'getOrCreateConversation';

    try {
      // First try to find an existing AI conversation for this project
      const existingConversations = await this.getProjectConversations(projectId);

      if (existingConversations.length > 0) {
        // Return the most recently updated conversation
        this.logPerformance(operation, startTime, 1);
        return existingConversations[0];
      }

      // Create a new conversation
      const newConversation = await this.createConversation(projectId, userId, title);
      this.logPerformance(operation, startTime, 1);
      return newConversation;
    } catch (error) {
      this.logQuery(operation, 'EXCEPTION', [projectId, userId], error);
      console.error('Error in getOrCreateConversation:', error);
      return null;
    }
  }
}

// Export class for creating instances per request
export { AIConversationServiceServer as AIConversationService };

// Convenience functions for direct usage (create new instance each time)
export const createAIConversation = async (
  projectId: string,
  userId: string,
  title?: string
) => {
  const service = new AIConversationServiceServer();
  return await service.createConversation(projectId, userId, title);
};

export const getAIConversation = async (
  conversationId: string,
  includeMessages?: boolean
) => {
  const service = new AIConversationServiceServer();
  return await service.getConversation(conversationId, includeMessages);
};

export const getProjectAIConversations = async (projectId: string) => {
  const service = new AIConversationServiceServer();
  return await service.getProjectConversations(projectId);
};

export const addAIMessage = async (
  conversationId: string,
  message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
) => {
  const service = new AIConversationServiceServer();
  return await service.addMessage(conversationId, message);
};

export const getOrCreateAIConversation = async (
  projectId: string,
  userId: string,
  title?: string
) => {
  const service = new AIConversationServiceServer();
  return await service.getOrCreateConversation(projectId, userId, title);
};