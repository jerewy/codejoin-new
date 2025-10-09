import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Database, Message, Conversation } from '@/types/database';
import { LocalStorageFallback } from '@/lib/local-storage-fallback';

// Enhanced error types for better error handling
export class DatabaseConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation with id ${conversationId} not found`);
    this.name = 'ConversationNotFoundError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(message: string = 'Permission denied') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

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

// Validation utilities
class DataValidator {
  static validateConversationId(conversationId: string): void {
    if (!conversationId || typeof conversationId !== 'string' || conversationId.trim().length === 0) {
      throw new ValidationError('Conversation ID is required and must be a non-empty string', 'conversationId');
    }
    if (conversationId.length > 255) {
      throw new ValidationError('Conversation ID is too long (max 255 characters)', 'conversationId');
    }
  }

  static validateProjectId(projectId: string): void {
    if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
      throw new ValidationError('Project ID is required and must be a non-empty string', 'projectId');
    }
  }

  static validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new ValidationError('User ID is required and must be a non-empty string', 'userId');
    }
  }

  static validateMessageContent(content: string): void {
    if (!content || typeof content !== 'string') {
      throw new ValidationError('Message content is required and must be a string', 'content');
    }
    if (content.length > 100000) { // 100KB limit
      throw new ValidationError('Message content is too long (max 100,000 characters)', 'content');
    }
  }

  static validateMessageRole(role: string): void {
    const validRoles = ['user', 'assistant', 'system', 'tool'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Message role must be one of: ${validRoles.join(', ')}`, 'role');
    }
  }
}

// Enhanced logging utility
class StructuredLogger {
  private static log(level: 'info' | 'warn' | 'error', message: string, context: Record<string, any> = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'AIConversationService',
      message,
      ...context,
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry, null, 2));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry, null, 2));
    }
  }

  static info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  static warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  static error(message: string, error?: Error | any, context?: Record<string, any>) {
    const errorContext = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...(error instanceof Error ? {} : error)
      }
    } : {};

    this.log('error', message, { ...context, ...errorContext });
  }
}

// Retry utility with exponential backoff
class RetryHandler {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context: Record<string, any> = {}
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        StructuredLogger.info('Executing operation', {
          attempt,
          maxRetries: config.maxRetries,
          ...context
        });

        const result = await operation();

        if (attempt > 0) {
          StructuredLogger.info('Operation succeeded after retry', {
            attempt,
            ...context
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on validation errors or permission errors
        if (error instanceof ValidationError ||
            error instanceof PermissionDeniedError ||
            error instanceof ConversationNotFoundError) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        );
        const jitter = Math.random() * 0.1 * delay; // 10% jitter
        const finalDelay = delay + jitter;

        StructuredLogger.warn('Operation failed, retrying', {
          attempt,
          maxRetries: config.maxRetries,
          delay: Math.round(finalDelay),
          error: error instanceof Error ? error.message : String(error),
          ...context
        });

        await new Promise(resolve => setTimeout(resolve, finalDelay));
      }
    }

    StructuredLogger.error('Operation failed after all retries', lastError, context);
    throw lastError;
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  };

  async execute<T>(operation: () => Promise<T>, context: Record<string, any> = {}): Promise<T> {
    if (this.state.state === 'OPEN') {
      const now = Date.now();
      if (now - this.state.lastFailureTime >= CIRCUIT_BREAKER_TIMEOUT) {
        this.state.state = 'HALF_OPEN';
        StructuredLogger.info('Circuit breaker moving to HALF_OPEN', context);
      } else {
        throw new DatabaseConnectionError('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state.state === 'HALF_OPEN') {
      this.state.state = 'CLOSED';
      StructuredLogger.info('Circuit breaker moving to CLOSED');
    }
    this.state.failures = 0;
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.state.state = 'OPEN';
      StructuredLogger.warn('Circuit breaker moving to OPEN', {
        failures: this.state.failures,
        threshold: CIRCUIT_BREAKER_THRESHOLD
      });
    }
  }

  getState(): string {
    return this.state.state;
  }
}

export class AIConversationServiceV2 {
  private supabase;
  private circuitBreaker: CircuitBreaker;
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.supabase = getSupabaseClient();
    this.circuitBreaker = new CircuitBreaker();
    this.isLocalStorageAvailable = LocalStorageFallback.isStorageAvailable();

    StructuredLogger.info('AIConversationServiceV2 initialized', {
      hasSupabaseClient: !!this.supabase,
      localStorageAvailable: this.isLocalStorageAvailable,
      circuitBreakerState: this.circuitBreaker.getState()
    });
  }

  private ensureDatabaseAvailable(): void {
    if (!this.supabase) {
      throw new DatabaseConnectionError(
        'Database connection not available. Missing environment variables or server-side execution.'
      );
    }
  }

  private isNetworkError(error: any): boolean {
    if (error instanceof DatabaseConnectionError) {
      return true;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('fetch') ||
             message.includes('network') ||
             message.includes('connection') ||
             message.includes('timeout') ||
             message.includes('econnrefused');
    }

    return false;
  }

  private shouldUseFallback(error: any): boolean {
    return this.isNetworkError(error) ||
           (error instanceof Error && error.message.includes('Circuit breaker is OPEN'));
  }

  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation> {
    // Validate inputs
    DataValidator.validateProjectId(projectId);
    DataValidator.validateUserId(userId);

    if (title && title.length > 255) {
      throw new ValidationError('Title is too long (max 255 characters)', 'title');
    }

    const operation = async () => {
      this.ensureDatabaseAvailable();

      const { data, error } = await this.supabase!
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
        if (error.code === '42501') {
          throw new PermissionDeniedError('Insufficient permissions to create conversation');
        }
        throw new Error(`Database error: ${error.message || 'Unknown database error'}`);
      }

      if (!data) {
        throw new Error('No data returned from database insert operation');
      }

      StructuredLogger.info('Conversation created successfully', {
        conversationId: data.id,
        projectId,
        userId
      });

      return data;
    };

    try {
      return await this.circuitBreaker.execute(operation, {
        operation: 'createConversation',
        projectId,
        userId
      });
    } catch (error) {
      StructuredLogger.error('Failed to create conversation', error, {
        projectId,
        userId,
        willUseFallback: this.shouldUseFallback(error) && this.isLocalStorageAvailable
      });

      if (this.shouldUseFallback(error) && this.isLocalStorageAvailable) {
        return this.createConversationFallback(projectId, userId, title, type);
      }

      throw error;
    }
  }

  private createConversationFallback(
    projectId: string,
    userId: string,
    title?: string,
    type: 'ai-chat' = 'ai-chat'
  ): AIConversation {
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

    StructuredLogger.info('Conversation saved to local storage fallback', {
      conversationId: fallbackConversation.id,
      projectId
    });

    return fallbackConversation;
  }

  async getConversation(
    conversationId: string,
    includeMessages: boolean = true
  ): Promise<AIConversation | null> {
    DataValidator.validateConversationId(conversationId);

    const operation = async () => {
      this.ensureDatabaseAvailable();

      const { data: conversation, error: conversationError } = await this.supabase!
        .from('conversations')
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq('id', conversationId)
        .single();

      if (conversationError) {
        if (conversationError.code === 'PGRST116') {
          throw new ConversationNotFoundError(conversationId);
        }
        if (conversationError.code === '42501') {
          throw new PermissionDeniedError('Insufficient permissions to access conversation');
        }
        throw new Error(`Database error: ${conversationError.message || 'Unknown database error'}`);
      }

      if (includeMessages) {
        const { data: messages, error: messagesError } = await this.supabase!
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          throw new Error(`Database error fetching messages: ${messagesError.message || 'Unknown database error'}`);
        }

        return {
          ...conversation,
          messages: messages || []
        };
      }

      return conversation;
    };

    try {
      return await this.circuitBreaker.execute(operation, {
        operation: 'getConversation',
        conversationId,
        includeMessages
      });
    } catch (error) {
      StructuredLogger.error('Failed to get conversation', error, {
        conversationId,
        includeMessages,
        willTryFallback: this.shouldUseFallback(error) && this.isLocalStorageAvailable
      });

      if (this.shouldUseFallback(error) && this.isLocalStorageAvailable) {
        return this.getConversationFallback(conversationId, includeMessages);
      }

      return null;
    }
  }

  private getConversationFallback(
    conversationId: string,
    includeMessages: boolean
  ): AIConversation | null {
    // Try to get from local storage
    const conversations = LocalStorageFallback.loadConversations();
    const conversation = conversations.find(conv => conv.id === conversationId);

    if (!conversation) {
      return null;
    }

    if (includeMessages) {
      const messages = LocalStorageFallback.loadMessages(conversationId);
      return {
        ...conversation,
        messages
      };
    }

    return conversation;
  }

  async addMessage(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): Promise<AIMessage> {
    // Validate inputs
    DataValidator.validateConversationId(conversationId);
    DataValidator.validateMessageContent(message.content);
    DataValidator.validateMessageRole(message.role);

    const operation = async () => {
      this.ensureDatabaseAvailable();

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

      const { data, error } = await this.supabase!
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        if (error.code === '23503') {
          throw new ConversationNotFoundError(conversationId);
        }
        if (error.code === '42501') {
          throw new PermissionDeniedError('Insufficient permissions to add message');
        }
        throw new Error(`Database error: ${error.message || 'Unknown database error'}`);
      }

      if (!data) {
        throw new Error('No data returned from database insert operation');
      }

      StructuredLogger.info('Message added successfully', {
        messageId: data.id,
        conversationId,
        role: message.role,
        hasAiMetadata: !!(message.ai_model || message.ai_response_time_ms || message.ai_tokens_used)
      });

      return data;
    };

    try {
      return await RetryHandler.executeWithRetry(
        () => this.circuitBreaker.execute(operation, {
          operation: 'addMessage',
          conversationId,
          messageRole: message.role
        }),
        DEFAULT_RETRY_CONFIG,
        {
          operation: 'addMessage',
          conversationId,
          messageRole: message.role
        }
      );
    } catch (error) {
      StructuredLogger.error('Failed to add message', error, {
        conversationId,
        messageRole: message.role,
        willUseFallback: this.shouldUseFallback(error) && this.isLocalStorageAvailable
      });

      if (this.shouldUseFallback(error) && this.isLocalStorageAvailable) {
        return this.addMessageFallback(conversationId, message);
      }

      throw error;
    }
  }

  private addMessageFallback(
    conversationId: string,
    message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
  ): AIMessage {
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

    StructuredLogger.info('Message saved to local storage fallback', {
      messageId: fallbackMessage.id,
      conversationId,
      role: message.role
    });

    return fallbackMessage;
  }

  async getProjectConversations(
    projectId: string,
    type: 'ai-chat' = 'ai-chat'
  ): Promise<AIConversation[]> {
    DataValidator.validateProjectId(projectId);

    const operation = async () => {
      this.ensureDatabaseAvailable();

      const { data, error } = await this.supabase!
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
        throw new Error(`Database error: ${error.message || 'Unknown database error'}`);
      }

      return data || [];
    };

    try {
      const dbConversations = await this.circuitBreaker.execute(operation, {
        operation: 'getProjectConversations',
        projectId,
        type
      });

      // Merge with local storage fallback conversations
      if (this.isLocalStorageAvailable) {
        const localConversations = LocalStorageFallback.loadConversations()
          .filter(conv => conv.project_id === projectId && conv.type === type);

        // Combine database and local conversations, removing duplicates
        const allConversations = [...dbConversations, ...localConversations];
        const uniqueConversations = allConversations.filter((conv, index, arr) =>
          arr.findIndex(c => c.id === conv.id) === index
        );

        return uniqueConversations.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      }

      return dbConversations;
    } catch (error) {
      StructuredLogger.error('Failed to get project conversations', error, {
        projectId,
        type,
        willUseFallback: this.shouldUseFallback(error) && this.isLocalStorageAvailable
      });

      if (this.shouldUseFallback(error) && this.isLocalStorageAvailable) {
        return this.getProjectConversationsFallback(projectId, type);
      }

      return [];
    }
  }

  private getProjectConversationsFallback(
    projectId: string,
    type: 'ai-chat'
  ): AIConversation[] {
    const localConversations = LocalStorageFallback.loadConversations()
      .filter(conv => conv.project_id === projectId && conv.type === type)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    StructuredLogger.info('Loaded conversations from local storage fallback', {
      projectId,
      type,
      count: localConversations.length
    });

    return localConversations;
  }

  async getOrCreateConversation(
    projectId: string,
    userId: string,
    title?: string
  ): Promise<AIConversation> {
    DataValidator.validateProjectId(projectId);
    DataValidator.validateUserId(userId);

    try {
      // First try to find an existing AI conversation for this project
      const existingConversations = await this.getProjectConversations(projectId);

      if (existingConversations.length > 0) {
        // Return the most recently updated conversation
        StructuredLogger.info('Using existing conversation', {
          projectId,
          conversationId: existingConversations[0].id
        });
        return existingConversations[0];
      }

      // Create a new conversation
      return await this.createConversation(projectId, userId, title);
    } catch (error) {
      StructuredLogger.error('Failed to get or create conversation', error, {
        projectId,
        userId
      });
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    database: boolean;
    localStorage: boolean;
    circuitBreaker: string;
  }> {
    const databaseHealth = await this.checkDatabaseHealth();

    return {
      database: databaseHealth,
      localStorage: this.isLocalStorageAvailable,
      circuitBreaker: this.circuitBreaker.getState()
    };
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('conversations')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const aiConversationServiceV2 = new AIConversationServiceV2();

// Convenience functions for direct usage
export const createAIConversation = (
  projectId: string,
  userId: string,
  title?: string
) => aiConversationServiceV2.createConversation(projectId, userId, title);

export const getAIConversation = (
  conversationId: string,
  includeMessages?: boolean
) => aiConversationServiceV2.getConversation(conversationId, includeMessages);

export const getProjectAIConversations = (projectId: string) =>
  aiConversationServiceV2.getProjectConversations(projectId);

export const addAIMessage = (
  conversationId: string,
  message: Omit<AIMessage, 'id' | 'created_at' | 'conversation_id'>
) => aiConversationServiceV2.addMessage(conversationId, message);

export const getOrCreateAIConversation = (
  projectId: string,
  userId: string,
  title?: string
) => aiConversationServiceV2.getOrCreateConversation(projectId, userId, title);