// Database Query Builder with Qualified Column References
// This utility helps prevent project_id ambiguity by using explicit table aliases

import { SupabaseClient } from '@supabase/supabase-js';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface ConversationFilters {
  type?: string;
  project_id?: string;
  created_by?: string;
}

export interface MessageFilters {
  conversation_id?: string;
  role?: string;
  author_id?: string;
}

/**
 * Safe Query Builder that prevents column ambiguity
 */
export class SafeQueryBuilder {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get conversations with explicit table aliases to avoid project_id ambiguity
   */
  async getConversations(filters: ConversationFilters = {}, options: QueryOptions = {}) {
    let query = this.supabase
      .from('conversations as conv')  // Explicit table alias
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
        project:projects!conv_project_id_fkey(id, name, user_id)
      `);

    // Apply filters with qualified column names
    if (filters.type) {
      query = query.eq('conv.type', filters.type);
    }
    if (filters.project_id) {
      query = query.eq('conv.project_id', filters.project_id);
    }
    if (filters.created_by) {
      query = query.eq('conv.created_by', filters.created_by);
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(`conv.${options.orderBy}`, { ascending: options.ascending ?? false });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    return query;
  }

  /**
   * Get messages for a conversation with explicit table aliases
   */
  async getMessages(conversationId: string, filters: MessageFilters = {}, options: QueryOptions = {}) {
    let query = this.supabase
      .from('messages as msg')  // Explicit table alias
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
        ai_tokens_used,
        author:profiles!msg_author_id_fkey(id, email, full_name)
      `)
      .eq('msg.conversation_id', conversationId);

    // Apply filters with qualified column names
    if (filters.role) {
      query = query.eq('msg.role', filters.role);
    }
    if (filters.author_id) {
      query = query.eq('msg.author_id', filters.author_id);
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(`msg.${options.orderBy}`, { ascending: options.ascending ?? true });
    } else {
      // Default to chronological order for messages
      query = query.order('msg.created_at', { ascending: true });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    return query;
  }

  /**
   * Get conversation with its messages in a single query
   */
  async getConversationWithMessages(conversationId: string) {
    // First get the conversation
    const { data: conversation, error: conversationError } = await this.supabase
      .from('conversations as conv')
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
        project:projects!conv_project_id_fkey(id, name, user_id)
      `)
      .eq('conv.id', conversationId)
      .single();

    if (conversationError) {
      return { data: null, error: conversationError };
    }

    // Then get messages for the conversation
    const { data: messages, error: messagesError } = await this.supabase
      .from('messages as msg')
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
        ai_tokens_used,
        author:profiles!msg_author_id_fkey(id, email, full_name)
      `)
      .eq('msg.conversation_id', conversationId)
      .order('msg.created_at', { ascending: true });

    if (messagesError) {
      return { data: null, error: messagesError };
    }

    return {
      data: {
        ...conversation,
        messages: messages || []
      },
      error: null
    };
  }

  /**
   * Get project conversations with proper qualification
   */
  async getProjectConversations(projectId: string, type: string = 'ai-chat') {
    return this.supabase
      .from('conversations as conv')
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
        project:projects!conv_project_id_fkey(id, name),
        messages(count)
      `)
      .eq('conv.project_id', projectId)  // Explicit qualification
      .eq('conv.type', type)
      .order('conv.updated_at', { ascending: false });
  }

  /**
   * Get collaborators for a project with proper qualification
   */
  async getProjectCollaborators(projectId: string) {
    return this.supabase
      .from('collaborators as coll')
      .select(`
        project_id,
        user_id,
        role,
        created_at,
        user:profiles!coll_user_id_fkey(id, email, full_name)
      `)
      .eq('coll.project_id', projectId)  // Explicit qualification
      .order('coll.created_at', { ascending: false });
  }

  /**
   * Get project activities with proper qualification
   */
  async getProjectActivities(projectId: string, limit: number = 50) {
    return this.supabase
      .from('activities as act')
      .select(`
        id,
        project_id,
        user_id,
        activity_type,
        metadata,
        created_at,
        user:profiles!act_user_id_fkey(id, email, full_name)
      `)
      .eq('act.project_id', projectId)  // Explicit qualification
      .order('act.created_at', { ascending: false })
      .limit(limit);
  }

  /**
   * Create a conversation with proper error handling
   */
  async createConversation(data: {
    project_id: string;
    title?: string;
    created_by: string;
    type?: string;
    metadata?: any;
  }) {
    return this.supabase
      .from('conversations')
      .insert(data)
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
      .single();
  }

  /**
   * Add a message to a conversation with validation
   */
  async addMessage(conversationId: string, message: {
    role: string;
    content: string;
    author_id?: string;
    metadata?: any;
    ai_model?: string;
    ai_response_time_ms?: number;
    ai_tokens_used?: number;
  }) {
    // First validate conversation exists and user has access
    const { data: conversation, error: accessError } = await this.supabase
      .from('conversations')
      .select('id, project_id')
      .eq('id', conversationId)
      .single();

    if (accessError || !conversation) {
      return { data: null, error: new Error('Conversation not found or access denied') };
    }

    // Insert the message
    return this.supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        ...message
      })
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
  }
}

/**
 * Helper function to create a safe query builder
 */
export function createSafeQueryBuilder(supabase: SupabaseClient) {
  return new SafeQueryBuilder(supabase);
}

/**
 * Error handling utilities for database operations
 */
export class DatabaseErrorHandler {
  static handlePostgresError(error: any): string {
    if (!error) return 'Unknown database error';

    // Handle specific PostgreSQL error codes
    switch (error.code) {
      case '42702':
        return 'Column reference is ambiguous - please contact support';
      case '42501':
        return 'Permission denied - you do not have access to this resource';
      case '23503':
        return 'Reference violation - the referenced record does not exist';
      case '23505':
        return 'Duplicate entry - this record already exists';
      case '23514':
        return 'Check constraint violation - invalid data provided';
      case '42P01':
        return 'Table not found - database schema issue';
      case '42P10':
        return 'Invalid column reference - query syntax error';
      case 'PGRST116':
        return 'Resource not found';
      default:
        return error.message || 'Database operation failed';
    }
  }

  static isAmbiguityError(error: any): boolean {
    return error?.code === '42702' ||
           error?.message?.includes('ambiguous') ||
           error?.message?.includes('project_id is ambiguous');
  }

  static isPermissionError(error: any): boolean {
    return error?.code === '42501' ||
           error?.message?.includes('permission') ||
           error?.message?.includes('access denied');
  }

  static isNotFoundError(error: any): boolean {
    return error?.code === 'PGRST116' ||
           error?.message?.includes('not found');
  }
}

/**
 * Default query options for common operations
 */
export const DEFAULT_QUERY_OPTIONS = {
  conversations: {
    limit: 20,
    orderBy: 'updated_at',
    ascending: false
  },
  messages: {
    limit: 50,
    orderBy: 'created_at',
    ascending: true
  },
  activities: {
    limit: 30,
    orderBy: 'created_at',
    ascending: false
  }
} as const;