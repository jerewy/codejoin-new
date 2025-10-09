#!/usr/bin/env node

/**
 * Migration script to transition from old AI conversation service to new V2 service
 * Run this script to safely migrate your data and update your application
 */

import { ServiceMigrationHelper } from '../lib/service-migration-helper';

// Configuration
const MIGRATION_CONFIG = {
  // Set to true for testing (won't make actual changes)
  dryRun: false,

  // Force migration even if conversations already exist
  forceMigrate: false,

  // Number of conversations to process in each batch
  batchSize: 10,

  // Enable detailed logging
  verbose: true,
};

async function main() {
  console.log('🚀 AI Conversation Service Migration');
  console.log('=====================================\n');

  // Check if project ID is provided
  const projectId = process.argv[2];
  if (!projectId) {
    console.error('❌ Error: Project ID is required');
    console.log('Usage: npm run migrate-ai-service <project-id>');
    console.log('Example: npm run migrate-ai-service 12345678-1234-1234-1234-123456789012');
    process.exit(1);
  }

  try {
    // Step 1: Test new service
    console.log('📋 Step 1: Testing new service...');
    const testResult = await ServiceMigrationHelper.testNewService(projectId);

    if (!testResult.success) {
      console.error('❌ New service test failed:', testResult.error);
      console.log('\nPlease ensure:');
      console.log('1. Supabase environment variables are set correctly');
      console.log('2. Database permissions are properly configured');
      console.log('3. Run the database migration script first');
      process.exit(1);
    }

    console.log('✅ New service is working properly\n');

    if (MIGRATION_CONFIG.verbose) {
      console.log('Service Health:', testResult.health);
      console.log('');
    }

    // Step 2: Get migration statistics
    console.log('📊 Step 2: Analyzing current state...');
    const stats = await ServiceMigrationHelper.getMigrationStats(projectId);

    console.log(`Total conversations: ${stats.totalConversations}`);
    console.log(`Already migrated: ${stats.migratedConversations}`);
    console.log(`Needs migration: ${stats.needsMigration}`);
    console.log('');

    if (stats.needsMigration === 0 && !MIGRATION_CONFIG.forceMigrate) {
      console.log('✅ All conversations are already migrated!');
      console.log('No action needed.\n');
      process.exit(0);
    }

    // Step 3: Compare services (optional, for verification)
    if (MIGRATION_CONFIG.verbose) {
      console.log('🔍 Step 3: Comparing services...');
      const comparison = await ServiceMigrationHelper.compareServices(projectId);

      console.log(`Old service conversations: ${comparison.oldServiceResult.length}`);
      console.log(`New service conversations: ${comparison.newServiceResult.length}`);

      if (comparison.differences.length > 0) {
        console.log('Differences found:');
        comparison.differences.forEach(diff => console.log(`  - ${diff}`));
      }
      console.log('');
    }

    // Step 4: Perform migration
    console.log('🔄 Step 4: Performing migration...');
    console.log(`Mode: ${MIGRATION_CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Batch size: ${MIGRATION_CONFIG.batchSize}`);
    console.log(`Force migrate: ${MIGRATION_CONFIG.forceMigrate}`);
    console.log('');

    const migrationResult = await ServiceMigrationHelper.migrateProject(projectId, MIGRATION_CONFIG);

    // Step 5: Generate report
    console.log('📝 Step 5: Generating migration report...');
    const report = ServiceMigrationHelper.generateMigrationReport(migrationResult);

    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(50));

    if (migrationResult.success) {
      console.log('✅ Migration completed successfully!');
      console.log(`Migrated: ${migrationResult.migrated} conversations`);
      console.log(`Failed: ${migrationResult.failed} conversations`);
    } else {
      console.log('❌ Migration completed with errors!');
      console.log(`Migrated: ${migrationResult.migrated} conversations`);
      console.log(`Failed: ${migrationResult.failed} conversations`);
      console.log(`Errors: ${migrationResult.errors.length}`);
    }

    if (migrationResult.errors.length > 0) {
      console.log('\nErrors:');
      migrationResult.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Save detailed report to file
    const reportFileName = `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    require('fs').writeFileSync(reportFileName, report);
    console.log(`\n📄 Detailed report saved to: ${reportFileName}`);

    // Next steps
    console.log('\n🎯 Next Steps:');
    console.log('1. Update your code to use aiConversationServiceV2');
    console.log('2. Update your hooks to use useAIConversationsV2');
    console.log('3. Test your application thoroughly');
    console.log('4. Monitor service health in production');

    if (migrationResult.success) {
      console.log('5. Consider removing the old service after testing');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);

    // Log migration details for debugging
    const log = ServiceMigrationHelper.getMigrationLog();
    if (log.length > 0) {
      console.log('\nMigration Log:');
      log.forEach(entry => console.log(`  ${entry}`));
    }

    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const dryRunIndex = args.indexOf('--dry-run');
const forceIndex = args.indexOf('--force');
const verboseIndex = args.indexOf('--verbose');

if (dryRunIndex !== -1) {
  MIGRATION_CONFIG.dryRun = true;
  args.splice(dryRunIndex, 1);
}

if (forceIndex !== -1) {
  MIGRATION_CONFIG.forceMigrate = true;
  args.splice(forceIndex, 1);
}

if (verboseIndex !== -1) {
  MIGRATION_CONFIG.verbose = true;
  args.splice(verboseIndex, 1);
}

// Update process.argv with filtered args
process.argv = ['node', process.argv[1], ...args];

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log('AI Conversation Service Migration Script');
  console.log('=======================================');
  console.log('');
  console.log('Usage: npm run migrate-ai-service <project-id> [options]');
  console.log('');
  console.log('Arguments:');
  console.log('  project-id    The ID of the project to migrate');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run     Test migration without making changes');
  console.log('  --force       Force migration even if conversations already exist');
  console.log('  --verbose     Enable detailed logging');
  console.log('  --help, -h    Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run migrate-ai-service 12345678-1234-1234-1234-123456789012');
  console.log('  npm run migrate-ai-service 12345678-1234-1234-1234-123456789012 --dry-run');
  console.log('  npm run migrate-ai-service 12345678-1234-1234-1234-123456789012 --force --verbose');
  process.exit(0);
}

// Run the migration
if (require.main === module) {
  main().catch(console.error);
}

export { main as migrateAIService };