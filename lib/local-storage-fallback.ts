import type { AIMessage, AIConversation } from './ai-conversation-service';

const STORAGE_KEYS = {
  CONVERSATIONS: 'ai_conversations_fallback',
  CURRENT_CONVERSATION: 'ai_current_conversation_fallback',
  MESSAGES: (conversationId: string) => `ai_messages_${conversationId}_fallback`,
} as const;

export class LocalStorageFallback {
  // Conversation management
  static saveConversations(conversations: AIConversation[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (error) {
      console.warn('Failed to save conversations to localStorage:', error);
    }
  }

  static loadConversations(): AIConversation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (!stored) return [];

      const conversations = JSON.parse(stored);

      // Ensure all conversations have valid timestamps
      return conversations.map((conv: AIConversation) => {
        let createdAt = conv.created_at;
        let updatedAt = conv.updated_at;

        // Validate and fix timestamps
        if (!createdAt || isNaN(new Date(createdAt).getTime())) {
          console.warn('Invalid created_at timestamp found for conversation, using current time:', conv.id);
          createdAt = new Date().toISOString();
        }

        if (!updatedAt || isNaN(new Date(updatedAt).getTime())) {
          console.warn('Invalid updated_at timestamp found for conversation, using created_at:', conv.id);
          updatedAt = createdAt;
        }

        return {
          ...conv,
          created_at: createdAt,
          updated_at: updatedAt,
        };
      });
    } catch (error) {
      console.warn('Failed to load conversations from localStorage:', error);
      return [];
    }
  }

  static saveCurrentConversation(conversation: AIConversation | null): void {
    try {
      if (conversation) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, JSON.stringify(conversation));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      }
    } catch (error) {
      console.warn('Failed to save current conversation to localStorage:', error);
    }
  }

  static loadCurrentConversation(): AIConversation | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load current conversation from localStorage:', error);
      return null;
    }
  }

  // Message management
  static saveMessages(conversationId: string, messages: AIMessage[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES(conversationId), JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save messages to localStorage:', error);
    }
  }

  static loadMessages(conversationId: string): AIMessage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES(conversationId));
      if (!stored) return [];

      const messages = JSON.parse(stored);

      // Ensure all messages have valid timestamps
      return messages.map((msg: AIMessage) => {
        let createdAt = msg.created_at;

        // Validate and fix invalid timestamps
        if (!createdAt || isNaN(new Date(createdAt).getTime())) {
          console.warn('Invalid timestamp found for message, using current time:', msg.id);
          createdAt = new Date().toISOString();
        }

        return {
          ...msg,
          created_at: createdAt,
        };
      });
    } catch (error) {
      console.warn('Failed to load messages from localStorage:', error);
      return [];
    }
  }

  static addMessage(conversationId: string, message: AIMessage): void {
    const messages = this.loadMessages(conversationId);
    messages.push(message);
    this.saveMessages(conversationId, messages);
  }

  // Utility methods
  static clearFallbackData(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        if (typeof key === 'string') {
          localStorage.removeItem(key);
        } else {
          // Handle message keys pattern
          Object.keys(localStorage)
            .filter(k => k.startsWith('ai_messages_') && k.endsWith('_fallback'))
            .forEach(k => localStorage.removeItem(k));
        }
      });
    } catch (error) {
      console.warn('Failed to clear fallback data from localStorage:', error);
    }
  }

  static isStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Data validation and cleanup helper
  static validateAndCleanData(): void {
    if (!this.isStorageAvailable()) return;

    try {
      // Clean conversations with invalid timestamps
      const conversations = this.loadConversations();
      const validConversations = conversations.filter(conv => {
        const hasValidCreatedAt = conv.created_at && !isNaN(new Date(conv.created_at).getTime());
        const hasValidUpdatedAt = conv.updated_at && !isNaN(new Date(conv.updated_at).getTime());

        if (!hasValidCreatedAt || !hasValidUpdatedAt) {
          console.warn('Removing conversation with invalid timestamps:', conv.id);
          return false;
        }
        return true;
      });

      if (validConversations.length !== conversations.length) {
        this.saveConversations(validConversations);
      }

      // Clean messages with invalid timestamps
      Object.keys(localStorage)
        .filter(key => key.startsWith('ai_messages_') && key.endsWith('_fallback'))
        .forEach(key => {
          try {
            const messages = JSON.parse(localStorage.getItem(key) || '[]');
            const validMessages = messages.filter((msg: AIMessage) => {
              const hasValidCreatedAt = msg.created_at && !isNaN(new Date(msg.created_at).getTime());

              if (!hasValidCreatedAt) {
                console.warn('Removing message with invalid timestamp from conversation:', key);
                return false;
              }
              return true;
            });

            if (validMessages.length !== messages.length) {
              localStorage.setItem(key, JSON.stringify(validMessages));
            }
          } catch (error) {
            console.warn('Corrupted message data in localStorage, removing key:', key);
            localStorage.removeItem(key);
          }
        });

      console.log('LocalStorage validation and cleanup completed');
    } catch (error) {
      console.warn('Error during localStorage validation:', error);
    }
  }

  // Migration helper
  static migrateToServer(serverConversations: AIConversation[], serverMessages: Record<string, AIMessage[]>): void {
    if (!this.isStorageAvailable()) return;

    // Backup current local data
    const localConversations = this.loadConversations();
    const localCurrentConversation = this.loadCurrentConversation();

    // Only migrate if we have local data that's not already on server
    if (localConversations.length > 0 || localCurrentConversation) {
      console.log('Migrating local AI conversations to server...');

      // Clear local data after successful migration
      setTimeout(() => {
        this.clearFallbackData();
      }, 5000);
    }
  }
}