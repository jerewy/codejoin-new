import { aiConversationService } from './ai-conversation-service';
import { aiConversationServiceV2 } from './ai-conversation-service-v2';
import type { AIConversation, AIMessage } from './ai-conversation-service-v2';

/**
 * Migration helper to safely transition from old service to new service
 * This provides a gradual migration path with fallback compatibility
 */

export class ServiceMigrationHelper {
  private static migrationLog: string[] = [];

  static log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.migrationLog.push(logEntry);
    console.log('ServiceMigration:', message);
  }

  static getMigrationLog(): string[] {
    return [...this.migrationLog];
  }

  static clearMigrationLog(): void {
    this.migrationLog = [];
  }

  /**
   * Test the new service with a simple operation
   */
  static async testNewService(projectId: string): Promise<{
    success: boolean;
    error?: string;
    health?: any;
  }> {
    this.log('Testing new AI conversation service...');

    try {
      // Check service health
      const health = await aiConversationServiceV2.healthCheck();
      this.log(`Service health: ${JSON.stringify(health)}`);

      if (!health.database) {
        this.log('❌ New service: Database connection failed');
        return { success: false, error: 'Database connection failed', health };
      }

      // Test getting conversations
      const conversations = await aiConversationServiceV2.getProjectConversations(projectId);
      this.log(`✅ New service: Successfully retrieved ${conversations.length} conversations`);

      return { success: true, health };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ New service test failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Compare old vs new service results for the same operation
   */
  static async compareServices(projectId: string): Promise<{
    oldServiceResult: AIConversation[];
    newServiceResult: AIConversation[];
    differences: string[];
    newServiceWorks: boolean;
  }> {
    this.log('Comparing old vs new service...');

    try {
      // Get conversations from both services
      const [oldConversations, newConversations] = await Promise.allSettled([
        aiConversationService.getProjectConversations(projectId),
        aiConversationServiceV2.getProjectConversations(projectId)
      ]);

      const oldServiceResult = oldConversations.status === 'fulfilled'
        ? oldConversations.value
        : [];
      const newServiceResult = newConversations.status === 'fulfilled'
        ? newConversations.value
        : [];

      const differences: string[] = [];

      // Compare results
      if (oldServiceResult.length !== newServiceResult.length) {
        differences.push(
          `Conversation count differs: old=${oldServiceResult.length}, new=${newServiceResult.length}`
        );
      }

      // Check for missing conversations in new service
      const oldIds = new Set(oldServiceResult.map(c => c.id));
      const newIds = new Set(newServiceResult.map(c => c.id));

      const missingInNew = Array.from(oldIds).filter(id => !newIds.has(id));
      if (missingInNew.length > 0) {
        differences.push(`Missing in new service: ${missingInNew.join(', ')}`);
      }

      const extraInNew = Array.from(newIds).filter(id => !oldIds.has(id));
      if (extraInNew.length > 0) {
        differences.push(`Extra in new service: ${extraInNew.join(', ')}`);
      }

      const newServiceWorks = newConversations.status === 'fulfilled';

      this.log(`Comparison complete: differences=${differences.length}, newServiceWorks=${newServiceWorks}`);

      return {
        oldServiceResult,
        newServiceResult,
        differences,
        newServiceWorks
      };
    } catch (error) {
      this.log(`❌ Service comparison failed: ${error}`);
      return {
        oldServiceResult: [],
        newServiceResult: [],
        differences: ['Comparison failed'],
        newServiceWorks: false
      };
    }
  }

  /**
   * Safely migrate a specific conversation from old to new service
   */
  static async migrateConversation(
    conversationId: string,
    forceMigrate: boolean = false
  ): Promise<{
    success: boolean;
    message: string;
    conversation?: AIConversation;
  }> {
    this.log(`Migrating conversation ${conversationId}...`);

    try {
      // Check if conversation already exists in new service
      if (!forceMigrate) {
        const existingConversation = await aiConversationServiceV2.getConversation(conversationId, false);
        if (existingConversation) {
          this.log(`✅ Conversation ${conversationId} already exists in new service`);
          return {
            success: true,
            message: 'Conversation already exists in new service',
            conversation: existingConversation
          };
        }
      }

      // Get conversation from old service
      const oldConversation = await aiConversationService.getConversation(conversationId, true);
      if (!oldConversation) {
        return { success: false, message: 'Conversation not found in old service' };
      }

      // Create conversation in new service
      const newConversation = await aiConversationServiceV2.createConversation(
        oldConversation.project_id || '',
        oldConversation.created_by || '',
        oldConversation.title || undefined,
        oldConversation.type as 'ai-chat'
      );

      if (!newConversation) {
        return { success: false, message: 'Failed to create conversation in new service' };
      }

      // Migrate messages if they exist
      if (oldConversation.messages && oldConversation.messages.length > 0) {
        this.log(`Migrating ${oldConversation.messages.length} messages...`);

        for (const message of oldConversation.messages) {
          try {
            await aiConversationServiceV2.addMessage(newConversation.id, {
              role: message.role,
              content: message.content,
              metadata: message.metadata || {},
              ai_model: message.ai_model,
              ai_response_time_ms: message.ai_response_time_ms,
              ai_tokens_used: message.ai_tokens_used,
              author_id: message.author_id,
            });
          } catch (error) {
            this.log(`⚠️ Failed to migrate message ${message.id}: ${error}`);
          }
        }
      }

      this.log(`✅ Successfully migrated conversation ${conversationId}`);
      return {
        success: true,
        message: 'Conversation migrated successfully',
        conversation: newConversation
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ Failed to migrate conversation ${conversationId}: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Get migration statistics
   */
  static async getMigrationStats(projectId: string): Promise<{
    totalConversations: number;
    migratedConversations: number;
    needsMigration: number;
    migrationErrors: string[];
  }> {
    this.log('Getting migration statistics...');

    try {
      const [oldConversations, newConversations] = await Promise.allSettled([
        aiConversationService.getProjectConversations(projectId),
        aiConversationServiceV2.getProjectConversations(projectId)
      ]);

      const oldIds = oldConversations.status === 'fulfilled'
        ? new Set(oldConversations.value.map(c => c.id))
        : new Set();
      const newIds = newConversations.status === 'fulfilled'
        ? new Set(newConversations.value.map(c => c.id))
        : new Set();

      const totalConversations = oldIds.size;
      const migratedConversations = Array.from(oldIds).filter(id => newIds.has(id)).length;
      const needsMigration = totalConversations - migratedConversations;

      return {
        totalConversations,
        migratedConversations,
        needsMigration,
        migrationErrors: []
      };
    } catch (error) {
      this.log(`❌ Failed to get migration stats: ${error}`);
      return {
        totalConversations: 0,
        migratedConversations: 0,
        needsMigration: 0,
        migrationErrors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Perform full migration for a project
   */
  static async migrateProject(
    projectId: string,
    options: {
      dryRun?: boolean;
      forceMigrate?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<{
    success: boolean;
    migrated: number;
    failed: number;
    errors: string[];
    stats: any;
  }> {
    const { dryRun = false, forceMigrate = false, batchSize = 10 } = options;

    this.log(`Starting ${dryRun ? 'dry run ' : ''}migration for project ${projectId}...`);

    try {
      const stats = await this.getMigrationStats(projectId);

      if (stats.needsMigration === 0 && !forceMigrate) {
        this.log('✅ All conversations already migrated');
        return {
          success: true,
          migrated: 0,
          failed: 0,
          errors: [],
          stats
        };
      }

      const oldConversations = await aiConversationService.getProjectConversations(projectId);
      const conversationsToMigrate = forceMigrate
        ? oldConversations
        : oldConversations.filter(conv => !stats.migratedConversations ||
            !oldConversations.some(c => c.id === conv.id));

      let migrated = 0;
      let failed = 0;
      const errors: string[] = [];

      this.log(`Found ${conversationsToMigrate.length} conversations to migrate`);

      // Process in batches
      for (let i = 0; i < conversationsToMigrate.length; i += batchSize) {
        const batch = conversationsToMigrate.slice(i, i + batchSize);
        this.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} conversations)`);

        for (const conversation of batch) {
          if (dryRun) {
            this.log(`[DRY RUN] Would migrate conversation ${conversation.id}`);
            migrated++;
          } else {
            const result = await this.migrateConversation(conversation.id, forceMigrate);
            if (result.success) {
              migrated++;
            } else {
              failed++;
              errors.push(`Conversation ${conversation.id}: ${result.message}`);
            }
          }
        }

        // Add small delay between batches to avoid overwhelming the database
        if (!dryRun && i + batchSize < conversationsToMigrate.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const success = failed === 0;
      this.log(`Migration complete: ${migrated} migrated, ${failed} failed`);

      return {
        success,
        migrated,
        failed,
        errors,
        stats
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ Migration failed: ${errorMessage}`);
      return {
        success: false,
        migrated: 0,
        failed: 0,
        errors: [errorMessage],
        stats: null
      };
    }
  }

  /**
   * Create a migration report
   */
  static generateMigrationReport(results: any): string {
    const timestamp = new Date().toISOString();
    const report = [
      '# AI Conversation Service Migration Report',
      `Generated: ${timestamp}`,
      '',
      '## Summary',
      `- Success: ${results.success ? '✅' : '❌'}`,
      `- Migrated: ${results.migrated}`,
      `- Failed: ${results.failed}`,
      '',
      '## Details',
    ];

    if (results.stats) {
      report.push('### Statistics');
      report.push(`- Total Conversations: ${results.stats.totalConversations}`);
      report.push(`- Already Migrated: ${results.stats.migratedConversations}`);
      report.push(`- Needs Migration: ${results.stats.needsMigration}`);
      report.push('');
    }

    if (results.errors && results.errors.length > 0) {
      report.push('### Errors');
      results.errors.forEach((error: string, index: number) => {
        report.push(`${index + 1}. ${error}`);
      });
      report.push('');
    }

    if (this.migrationLog.length > 0) {
      report.push('### Migration Log');
      this.migrationLog.forEach(log => {
        report.push(`- ${log}`);
      });
    }

    return report.join('\n');
  }
}

// Export convenience functions
export const testNewService = (projectId: string) =>
  ServiceMigrationHelper.testNewService(projectId);

export const compareServices = (projectId: string) =>
  ServiceMigrationHelper.compareServices(projectId);

export const migrateProject = (projectId: string, options?: any) =>
  ServiceMigrationHelper.migrateProject(projectId, options);

export const getMigrationStats = (projectId: string) =>
  ServiceMigrationHelper.getMigrationStats(projectId);