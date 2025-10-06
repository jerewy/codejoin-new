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
      return stored ? JSON.parse(stored) : [];
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
      return stored ? JSON.parse(stored) : [];
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