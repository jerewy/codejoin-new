import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Database, Message, Conversation } from '@/types/database';
import { LocalStorageFallback } from '@/lib/local-storage-fallback';
import { validateMessageTimestamps } from '@/lib/timestamp-utils';

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

    // Validate and clean localStorage data on service initialization
    if (typeof window !== 'undefined') {
      try {
        LocalStorageFallback.validateAndCleanData();
      } catch (error) {
        console.warn('Failed to validate localStorage data on initialization:', error);
      }
    }
  }

  // Enhanced authentication check
  async getCurrentUser(): Promise<{ id: string } | null> {
    try {
      if (!this.supabase) {
        console.log('DEBUG: No Supabase client available for auth check');
        return null;
      }

      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error) {
        console.error('DEBUG: Auth error:', error);
        return null;
      }

      console.log('DEBUG: Current user:', user ? {
        id: user.id,
        email: user.email,
        isAuthenticated: !!user.id && !!user.email
      } : null);
      return user;
    } catch (error) {
      console.error('DEBUG: Error getting current user:', error);
      return null;
    }
  }

  // Validate user has access to project
  async validateProjectAccess(projectId: string, userId: string): Promise<boolean> {
    try {
      if (!this.supabase) {
        console.log('DEBUG: No Supabase client for project access validation');
        return false;
      }

      // Check if user is project owner
      const { data: ownerCheck, error: ownerError } = await this.supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (ownerCheck && !ownerError) {
        console.log('DEBUG: User is project owner');
        return true;
      }

      // Check if user is project admin
      const { data: adminCheck, error: adminError } = await this.supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .contains('admin_ids', [userId])
        .single();

      if (adminCheck && !adminError) {
        console.log('DEBUG: User is project admin');
        return true;
      }

      // Check if user is collaborator
      const { data: collabCheck, error: collabError } = await this.supabase
        .from('collaborators')
        .select('project_id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (collabCheck && !collabError) {
        console.log('DEBUG: User is project collaborator');
        return true;
      }

      console.log('DEBUG: User has no access to project');
      return false;
    } catch (error) {
      console.error('DEBUG: Error validating project access:', error);
      return false;
    }
  }

  // Enhanced database connection validation
  async validateDatabaseConnection(): Promise<boolean> {
    try {
      if (!this.supabase) {
        console.log('DEBUG: Cannot validate connection - no Supabase client');
        return false;
      }

      console.log('DEBUG: Validating database connection...');
      const { data, error } = await this.supabase
        .from('conversations')
        .select('id')
        .limit(1);

      console.log('DEBUG: Database connection validation result:', {
        hasData: !!data,
        hasError: !!error,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details
        } : null,
        dataLength: data?.length || 0
      });

      return !error;
    } catch (error) {
      console.error('DEBUG: Database connection validation failed:', error);
      return false;
    }
  }

  // Enhanced error formatting
  private formatSupabaseError(error: any): string {
    if (!error) return 'Unknown error occurred';

    if (typeof error === 'string') return error;

    if (error instanceof Error) return error.message;

    if (typeof error === 'object') {
      // Try different Supabase error message fields
      if (error.message) return error.message;
      if (error.error_description) return error.error_description;
      if (error.details) return error.details;
      if (error.error) return error.error;

      // If it's a plain object, try to stringify it
      try {
        const jsonStr = JSON.stringify(error);
        if (jsonStr !== '{}') return jsonStr;
      } catch {
        // Ignore stringify errors
      }
    }

    return String(error);
  }

  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation | null> {
    console.log('DEBUG: Starting conversation creation:', { projectId, userId, title, type });

    // Validate inputs
    if (!projectId || !userId) {
      console.error('DEBUG: Missing required inputs:', { projectId, userId });
      return null;
    }

    // Check authentication
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      console.error('DEBUG: No authenticated user found');
      return null;
    }

    if (currentUser.id !== userId) {
      console.error('DEBUG: User ID mismatch:', { currentUser: currentUser.id, requested: userId });
      return null;
    }

    // Validate project access
    const hasAccess = await this.validateProjectAccess(projectId, userId);
    if (!hasAccess) {
      console.error('DEBUG: User does not have access to project:', { projectId, userId });
      return null;
    }

    // Try database first
    try {
      console.log('DEBUG: Attempting to create conversation in database...');

      const conversationData = {
        project_id: projectId,
        title: title || 'AI Assistant Chat',
        created_by: userId,
        type,
        metadata: { type, auto_generated: true }
      };

      console.log('DEBUG: Conversation data to insert:', conversationData);

      const { data, error } = await this.supabase
        .from('conversations')
        .insert(conversationData)
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
        console.error('DEBUG: Database error creating conversation:', {
          message: this.formatSupabaseError(error),
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('DEBUG: Conversation created successfully:', data);
      return data;
    } catch (error) {
      console.error('DEBUG: Error in createConversation, falling back to local storage:', {
        error: this.formatSupabaseError(error),
        projectId,
        userId
      });

      // Fallback to local storage
      try {
        const now = new Date().toISOString();
        const fallbackConversation: AIConversation = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          project_id: projectId,
          title: title || 'AI Assistant Chat',
          created_by: userId,
          type,
          metadata: { type, auto_generated: true },
          created_at: now,
          updated_at: now,
        };

        // Save to local storage
        const conversations = LocalStorageFallback.loadConversations();
        conversations.unshift(fallbackConversation);
        LocalStorageFallback.saveConversations(conversations);
        LocalStorageFallback.saveCurrentConversation(fallbackConversation);

        console.log('DEBUG: Conversation saved to local storage fallback:', fallbackConversation);
        return fallbackConversation;
      } catch (fallbackError) {
        console.error('DEBUG: Failed to save conversation to local storage:', {
          error: this.formatSupabaseError(fallbackError)
        });
        return null;
      }
    }
  }

  async getConversation(
    conversationId: string,
    includeMessages: boolean = true
  ): Promise<AIConversation | null> {
    try {
      // Check if this is a local conversation
      if (conversationId.startsWith('local_')) {
        console.log('DEBUG: Loading local conversation from storage:', conversationId);

        // Load conversation from local storage
        const conversations = LocalStorageFallback.loadConversations();
        const conversation = conversations.find(conv => conv.id === conversationId);

        if (!conversation) {
          console.error('DEBUG: Local conversation not found:', conversationId);
          return null;
        }

        // Load messages if requested
        if (includeMessages) {
          const messages = LocalStorageFallback.loadMessages(conversationId);
          conversation.messages = messages;
          console.log('DEBUG: Loaded local conversation with messages:', {
            conversationId,
            messageCount: messages.length
          });
        }

        return conversation;
      }

      // Try to load from database for non-local conversations
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
        console.error('DEBUG: Error fetching conversation:', {
          message: this.formatSupabaseError(conversationError),
          code: conversationError.code
        });
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
          console.error('DEBUG: Error fetching messages:', {
            message: this.formatSupabaseError(messagesError),
            code: messagesError.code
          });
          return null;
        }

        // Validate and fix timestamps in messages using utility function
        const validatedMessages = validateMessageTimestamps(messages || []);

        return {
          ...conversation,
          messages: validatedMessages
        };
      }

      return conversation;
    } catch (error) {
      console.error('DEBUG: Error in getConversation:', {
        error: this.formatSupabaseError(error)
      });
      return null;
    }
  }

  async getProjectConversations(
    projectId: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    console.log('DEBUG: Getting project conversations:', { projectId, type });

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
        console.error('DEBUG: Error fetching project conversations:', {
          message: this.formatSupabaseError(error),
          code: error.code,
          projectId,
          type
        });
        throw error;
      }

      console.log('DEBUG: Successfully fetched conversations:', { count: data?.length || 0 });

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
      console.error('DEBUG: Error in getProjectConversations, falling back to local storage:', {
        error: this.formatSupabaseError(error),
        projectId,
        type
      });

      // Fallback to local storage only
      try {
        const localConversations = LocalStorageFallback.loadConversations()
          .filter(conv => conv.project_id === projectId && conv.type === type)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        console.log('DEBUG: Loaded conversations from local storage fallback:', { count: localConversations.length });
        return localConversations;
      } catch (fallbackError) {
        console.error('DEBUG: Failed to load conversations from local storage:', {
          error: this.formatSupabaseError(fallbackError)
        });
        return [];
      }
    }
  }

  async addMessage(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): Promise<AIMessage | null> {
    console.log('DEBUG: Adding message:', { conversationId, role: message.role, contentLength: message.content?.length });

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

      // Get current user for message validation
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
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

      // Set author_id based on message role
      if (message.role === 'user') {
        messageData.author_id = currentUser.id;
      } else if (message.role === 'assistant') {
        messageData.author_id = null; // AI messages don't have author_id
      }

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

      console.log('DEBUG: Message data being inserted:', messageData);

      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('DEBUG: Error adding message:', {
          message: this.formatSupabaseError(error),
          code: error.code,
          details: error.details
        });
        throw new Error(`Database error: ${this.formatSupabaseError(error)}`);
      }

      if (!data) {
        throw new Error('No data returned from database insert operation');
      }

      console.log('DEBUG: Message added successfully:', data);
      return data;
    } catch (error) {
      console.error('DEBUG: Error in addMessage, falling back to local storage:', {
        error: this.formatSupabaseError(error),
        conversationId,
        messageRole: message.role
      });

      // Fallback to local storage
      try {
        const currentUser = await this.getCurrentUser();
        const now = new Date().toISOString();

        const fallbackMessage: AIMessage = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
          created_at: now,
          ai_model: message.ai_model,
          ai_response_time_ms: message.ai_response_time_ms,
          ai_tokens_used: message.ai_tokens_used,
          author_id: message.role === 'user' ? (currentUser?.id || null) : null,
        };

        // Save to local storage
        LocalStorageFallback.addMessage(conversationId, fallbackMessage);
        console.log('DEBUG: Message saved to local storage fallback:', fallbackMessage);
        return fallbackMessage;
      } catch (fallbackError) {
        console.error('DEBUG: Failed to save message to local storage:', {
          error: this.formatSupabaseError(fallbackError)
        });
        throw new Error(this.formatSupabaseError(fallbackError));
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
        console.error('DEBUG: Error updating conversation title:', {
          message: this.formatSupabaseError(error),
          code: error.code
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('DEBUG: Error in updateConversationTitle:', {
        error: this.formatSupabaseError(error)
      });
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
        console.error('DEBUG: Error deleting messages:', {
          message: this.formatSupabaseError(messagesError),
          code: messagesError.code
        });
        return false;
      }

      // Delete conversation
      const { error: conversationError } = await this.supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) {
        console.error('DEBUG: Error deleting conversation:', {
          message: this.formatSupabaseError(conversationError),
          code: conversationError.code
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('DEBUG: Error in deleteConversation:', {
        error: this.formatSupabaseError(error)
      });
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
        console.error('DEBUG: Error fetching conversation analytics:', {
          message: this.formatSupabaseError(error),
          code: error.code
        });
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('DEBUG: Error in getConversationAnalytics:', {
        error: this.formatSupabaseError(error)
      });
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
        console.error('DEBUG: Error searching conversations:', {
          message: this.formatSupabaseError(error),
          code: error.code
        });
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('DEBUG: Error in searchConversations:', {
        error: this.formatSupabaseError(error)
      });
      return [];
    }
  }

  // Clear conversation messages
  async clearConversation(conversationId: string): Promise<boolean> {
    try {
      // Check if this is a local conversation
      if (conversationId.startsWith('local_')) {
        console.log('DEBUG: Clearing local conversation messages:', conversationId);
        LocalStorageFallback.saveMessages(conversationId, []);

        // Update conversation timestamp
        const conversations = LocalStorageFallback.loadConversations();
        const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);
        if (conversationIndex !== -1) {
          conversations[conversationIndex].updated_at = new Date().toISOString();
          conversations[conversationIndex].metadata = {
            ...conversations[conversationIndex].metadata,
            total_messages: 0
          };
          LocalStorageFallback.saveConversations(conversations);
        }
        return true;
      }

      // Clear messages from database
      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('DEBUG: Error clearing conversation messages:', {
          message: this.formatSupabaseError(error),
          code: error.code
        });
        return false;
      }

      // Update conversation metadata
      await this.supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            type: 'ai-chat',
            cleared_at: new Date().toISOString(),
            total_messages: 0
          }
        })
        .eq('id', conversationId);

      return true;
    } catch (error) {
      console.error('DEBUG: Error in clearConversation:', {
        error: this.formatSupabaseError(error)
      });
      return false;
    }
  }

  // Archive conversation
  async archiveConversation(conversationId: string): Promise<boolean> {
    try {
      // Check if this is a local conversation
      if (conversationId.startsWith('local_')) {
        console.log('DEBUG: Archiving local conversation:', conversationId);
        const conversations = LocalStorageFallback.loadConversations();
        const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);

        if (conversationIndex !== -1) {
          conversations[conversationIndex].metadata = {
            ...conversations[conversationIndex].metadata,
            archived: true,
            archived_at: new Date().toISOString()
          };
          LocalStorageFallback.saveConversations(conversations);
        }
        return true;
      }

      // Archive conversation in database
      const { error } = await this.supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            type: 'ai-chat',
            archived: true,
            archived_at: new Date().toISOString()
          }
        })
        .eq('id', conversationId);

      if (error) {
        console.error('DEBUG: Error archiving conversation:', {
          message: this.formatSupabaseError(error),
          code: error.code
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('DEBUG: Error in archiveConversation:', {
        error: this.formatSupabaseError(error)
      });
      return false;
    }
  }

  // Clear all project conversations
  async clearAllProjectConversations(projectId: string, type: 'ai-chat' = 'ai-chat'): Promise<boolean> {
    try {
      console.log('DEBUG: Clearing all project conversations:', { projectId, type });

      // Get all project conversations
      const conversations = await this.getProjectConversations(projectId, type);

      let successCount = 0;
      for (const conversation of conversations) {
        const cleared = await this.clearConversation(conversation.id);
        if (cleared) successCount++;
      }

      console.log('DEBUG: Cleared conversations:', { successCount, total: conversations.length });
      return successCount === conversations.length;
    } catch (error) {
      console.error('DEBUG: Error in clearAllProjectConversations:', {
        error: this.formatSupabaseError(error)
      });
      return false;
    }
  }

  // Archive all project conversations
  async archiveAllProjectConversations(projectId: string, type: 'ai-chat' = 'ai-chat'): Promise<boolean> {
    try {
      console.log('DEBUG: Archiving all project conversations:', { projectId, type });

      // Get all project conversations
      const conversations = await this.getProjectConversations(projectId, type);

      let successCount = 0;
      for (const conversation of conversations) {
        const archived = await this.archiveConversation(conversation.id);
        if (archived) successCount++;
      }

      console.log('DEBUG: Archived conversations:', { successCount, total: conversations.length });
      return successCount === conversations.length;
    } catch (error) {
      console.error('DEBUG: Error in archiveAllProjectConversations:', {
        error: this.formatSupabaseError(error)
      });
      return false;
    }
  }

  // Get conversation statistics
  async getConversationStats(conversationId: string): Promise<{
    messageCount: number;
    userMessageCount: number;
    aiMessageCount: number;
    totalTokens: number;
    avgResponseTime: number;
  }> {
    try {
      // Check if this is a local conversation
      if (conversationId.startsWith('local_')) {
        const messages = LocalStorageFallback.loadMessages(conversationId);
        return {
          messageCount: messages.length,
          userMessageCount: messages.filter(m => m.role === 'user').length,
          aiMessageCount: messages.filter(m => m.role === 'assistant').length,
          totalTokens: messages.reduce((sum, m) => sum + (m.ai_tokens_used || 0), 0),
          avgResponseTime: messages
            .filter(m => m.role === 'assistant' && m.ai_response_time_ms)
            .reduce((sum, m, _, arr) => sum + (m.ai_response_time_ms || 0) / arr.length, 0)
        };
      }

      const { data, error } = await this.supabase
        .from('messages')
        .select('role, ai_tokens_used, ai_response_time_ms')
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('DEBUG: Error getting conversation stats:', {
          message: this.formatSupabaseError(error),
          code: error.code
        });
        return {
          messageCount: 0,
          userMessageCount: 0,
          aiMessageCount: 0,
          totalTokens: 0,
          avgResponseTime: 0
        };
      }

      const messages = data || [];
      return {
        messageCount: messages.length,
        userMessageCount: messages.filter(m => m.role === 'user').length,
        aiMessageCount: messages.filter(m => m.role === 'assistant').length,
        totalTokens: messages.reduce((sum, m) => sum + (m.ai_tokens_used || 0), 0),
        avgResponseTime: messages
          .filter(m => m.role === 'assistant' && m.ai_response_time_ms)
          .reduce((sum, m, _, arr) => sum + (m.ai_response_time_ms || 0) / arr.length, 0)
      };
    } catch (error) {
      console.error('DEBUG: Error in getConversationStats:', {
        error: this.formatSupabaseError(error)
      });
      return {
        messageCount: 0,
        userMessageCount: 0,
        aiMessageCount: 0,
        totalTokens: 0,
        avgResponseTime: 0
      };
    }
  }

  async getOrCreateConversation(
    projectId: string,
    userId: string,
    title?: string
  ): Promise<AIConversation | null> {
    console.log('DEBUG: Getting or creating conversation:', { projectId, userId, title });

    // Validate inputs first
    if (!projectId || !userId) {
      console.error('DEBUG: Missing required inputs for getOrCreateConversation:', { projectId, userId });
      return null;
    }

    try {
      // First try to find an existing AI conversation for this project
      console.log('DEBUG: Looking for existing conversations...');
      const existingConversations = await this.getProjectConversations(projectId);

      if (existingConversations.length > 0) {
        console.log('DEBUG: Found existing conversation:', existingConversations[0]);
        const conversation = existingConversations[0];

        // Load messages for local conversations
        if (conversation.id.startsWith('local_')) {
          console.log('DEBUG: Loading messages for local conversation:', conversation.id);
          const messages = LocalStorageFallback.loadMessages(conversation.id);
          conversation.messages = messages;
          console.log('DEBUG: Loaded messages for local conversation:', {
            conversationId: conversation.id,
            messageCount: messages.length
          });
        }

        // Return the most recently updated conversation
        return conversation;
      }

      console.log('DEBUG: No existing conversations found, creating new one...');
      // Create a new conversation
      return await this.createConversation(projectId, userId, title);
    } catch (error) {
      console.error('DEBUG: Error in getOrCreateConversation:', {
        error: this.formatSupabaseError(error),
        projectId,
        userId
      });
      return null;
    }
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

export const clearAIConversation = (conversationId: string) =>
  aiConversationService.clearConversation(conversationId);

export const archiveAIConversation = (conversationId: string) =>
  aiConversationService.archiveConversation(conversationId);

export const clearAllProjectAIConversations = (projectId: string) =>
  aiConversationService.clearAllProjectConversations(projectId);

export const archiveAllProjectAIConversations = (projectId: string) =>
  aiConversationService.archiveAllProjectConversations(projectId);

export const getAIConversationStats = (conversationId: string) =>
  aiConversationService.getConversationStats(conversationId);