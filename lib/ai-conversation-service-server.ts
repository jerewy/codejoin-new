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

export class AIConversationServiceServer {
  private supabase;

  constructor() {
    // This will be initialized per request
    this.supabase = null;
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerSupabase();
    }
    return this.supabase;
  }

  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation | null> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          project_id: projectId,
          title: title || 'New AI Chat',
          created_by: userId,
          type,
          metadata: { type }
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createConversation:', error);
      return null;
    }
  }

  async getConversation(
    conversationId: string,
    includeMessages: boolean = true
  ): Promise<AIConversation | null> {
    try {
      const supabase = await this.getSupabase();
      let query = supabase
        .from('conversations')
        .select(`
          *,
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
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
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
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
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
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjectConversations:', error);
      return [];
    }
  }

  async addMessage(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): Promise<AIMessage | null> {
    try {
      const supabase = await this.getSupabase();
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
        .select()
        .single();

      if (error) {
        console.error('Error adding message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in addMessage:', error);
      return null;
    }
  }

  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
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
      const supabase = await this.getSupabase();
      // Delete messages first (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return false;
      }

      // Delete conversation
      const { error: conversationError } = await supabase
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
      const supabase = await this.getSupabase();
      let query = supabase
        .from('ai_conversation_analytics')
        .select('*');

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
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
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