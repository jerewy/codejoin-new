# AI Conversation Service Migration Guide

## 🚨 IMPORTANT - Critical Database and Service Issues Fixed

This migration addresses **critical architectural issues** in the AI conversation system that were causing:
- ❌ Persistent database errors with empty error objects
- ❌ Fallback to local storage happening repeatedly
- ❌ Poor error handling and debugging capabilities
- ❌ Missing database permissions and RLS policies
- ❌ No protection against cascading failures

## 🎯 What This Migration Fixes

### 1. **Database Errors with Empty Objects**
- **Problem**: Database operations returning empty error objects with no context
- **Solution**: Enhanced error handling with proper error classification and context

### 2. **Supabase Client Initialization Issues**
- **Problem**: Service returning null client when environment variables missing
- **Solution**: Proper validation and error messaging for configuration issues

### 3. **Missing Database Permissions**
- **Problem**: Incomplete RLS policies causing permission denied errors
- **Solution**: Comprehensive RLS policies for all conversation and message operations

### 4. **Poor Error Context**
- **Problem**: No meaningful error information for debugging
- **Solution**: Structured logging with detailed error context and stack traces

### 5. **No Resilience Patterns**
- **Problem**: No protection against cascading failures
- **Solution**: Circuit breaker pattern and retry logic with exponential backoff

## 📋 Prerequisites

### Environment Variables
Ensure these are properly configured in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Access
You need permissions to run SQL migrations on your Supabase database.

### Node.js Dependencies
Make sure you have `tsx` installed for running TypeScript scripts:

```bash
npm install -g tsx
# or add it to your project
npm install --save-dev tsx
```

## 🚀 Quick Start (Migration Steps)

### Step 1: Apply Database Permissions Fix

```bash
# Run the database migration
psql -d your_database -f fix-ai-conversation-permissions.sql

# Or if using Supabase CLI
supabase db push --file fix-ai-conversation-permissions.sql
```

### Step 2: Test the Migration

```bash
# Test migration without making changes
npm run migrate-ai-service:dry <project-id>

# Example
npm run migrate-ai-service:dry 12345678-1234-1234-1234-123456789012
```

### Step 3: Perform Actual Migration

```bash
# Migrate all conversations for a project
npm run migrate-ai-service <project-id>

# Example
npm run migrate-ai-service 12345678-1234-1234-1234-123456789012
```

### Step 4: Update Your Code

**Old Service Usage:**
```typescript
import { aiConversationService } from '@/lib/ai-conversation-service';
import { useAIConversations } from '@/hooks/use-ai-conversations';

const { conversations, addMessage, error } = useAIConversations({
  projectId,
  userId
});
```

**New Service Usage:**
```typescript
import { aiConversationServiceV2 } from '@/lib/ai-conversation-service-v2';
import { useAIConversationsV2 } from '@/hooks/use-ai-conversations-v2';

const {
  conversations,
  addMessage,
  error,
  serviceHealth,
  isOnline,
  isUsingFallback
} = useAIConversationsV2({
  projectId,
  userId,
  enableHealthCheck: true
});
```

## 🔧 Available Scripts

### Migration Scripts
```bash
# Test migration (dry run)
npm run migrate-ai-service:dry <project-id>

# Perform migration
npm run migrate-ai-service <project-id>

# Force migration (even if already migrated)
npm run migrate-ai-service:force <project-id>

# Enable verbose logging
npm run migrate-ai-service <project-id> --verbose
```

### Database Scripts
```bash
# Fix database permissions
npm run fix-db-permissions
```

## 📊 Migration Features

### ✅ Safe Migration
- **Dry Run Mode**: Test migration without making changes
- **Batch Processing**: Process conversations in batches to avoid overload
- **Data Validation**: Verify data integrity during migration
- **Rollback Support**: Ability to revert if issues occur

### ✅ Comprehensive Error Handling
- **Custom Error Types**: Meaningful error classification
- **Structured Logging**: JSON-formatted logs for debugging
- **Health Checks**: Monitor service availability
- **Circuit Breaker**: Prevent cascading failures

### ✅ Performance Optimizations
- **Connection Pooling**: Efficient database connections
- **Retry Logic**: Exponential backoff for transient failures
- **Caching**: Intelligent caching for frequently accessed data
- **Indexing**: Optimized database queries

## 🔍 Migration Verification

### Check Migration Results
```typescript
import { ServiceMigrationHelper } from '@/lib/service-migration-helper';

// Get migration statistics
const stats = await ServiceMigrationHelper.getMigrationStats(projectId);
console.log(`Migrated: ${stats.migratedConversations}/${stats.totalConversations}`);

// Compare old vs new service
const comparison = await ServiceMigrationHelper.compareServices(projectId);
console.log('Differences:', comparison.differences);
```

### Service Health Check
```typescript
import { aiConversationServiceV2 } from '@/lib/ai-conversation-service-v2';

// Check service health
const health = await aiConversationServiceV2.healthCheck();
console.log('Service Health:', health);
// Output: { database: true, localStorage: true, circuitBreaker: 'CLOSED' }
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Supabase client is not available"
**Solution**: Check environment variables
```bash
echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

#### 2. "Permission denied" errors
**Solution**: Apply database permissions fix
```bash
npm run fix-db-permissions
```

#### 3. "Circuit breaker is OPEN"
**Solution**: Check database connectivity and restart service
```typescript
const health = await aiConversationServiceV2.healthCheck();
```

#### 4. Migration fails halfway through
**Solution**: Use dry run mode and check logs
```bash
npm run migrate-ai-service:dry <project-id> --verbose
```

### Debug Mode

Enable detailed logging:
```typescript
// In your component
const { serviceHealth } = useAIConversationsV2({
  projectId,
  userId,
  enableHealthCheck: true
});

console.log('Service Health:', serviceHealth);
```

## 📈 Benefits Achieved

### ✅ Reliability Improvements
- **No More Empty Errors**: Proper error classification and context
- **Graceful Degradation**: Intelligent fallback mechanisms
- **Circuit Breaker**: Protection against cascading failures
- **Retry Logic**: Automatic recovery from transient failures

### ✅ Observability
- **Structured Logging**: JSON-formatted logs for better debugging
- **Health Monitoring**: Real-time service health checks
- **Performance Metrics**: Operation latency and success rates
- **Migration Tracking**: Complete audit trail of data migration

### ✅ Security
- **Proper RLS Policies**: Comprehensive database security
- **Input Validation**: Protection against invalid data
- **Permission Checks**: Authorization at database and application level

### ✅ Performance
- **Optimized Queries**: Efficient database operations
- **Connection Pooling**: Better resource management
- **Intelligent Caching**: Reduced database load
- **Batch Processing**: Efficient bulk operations

## 🔄 Rollback Plan

If you need to rollback the migration:

### 1. Revert Code Changes
```typescript
// Switch back to old service
import { aiConversationService } from '@/lib/ai-conversation-service';
import { useAIConversations } from '@/hooks/use-ai-conversations';
```

### 2. Keep Data Migrated
- The new service is backwards compatible
- Data migrated to new service will continue to work
- No data loss occurs during rollback

### 3. Monitor for Issues
- Check application logs for errors
- Monitor service health
- Verify conversation functionality

## 📞 Support

If you encounter issues during migration:

1. **Check the logs**: Look for detailed error messages
2. **Run health check**: Verify service availability
3. **Test with dry run**: Validate migration before proceeding
4. **Check environment variables**: Ensure proper configuration

### Migration Scripts Help
```bash
# Get help for migration script
npm run migrate-ai-service -- --help
```

## 🎉 Next Steps

After successful migration:

1. **Monitor Performance**: Keep an eye on service health metrics
2. **Update Documentation**: Update any relevant documentation
3. **Train Team**: Ensure team knows about new error handling patterns
4. **Remove Old Service**: After thorough testing, consider removing old service

## 📚 Additional Resources

- [Architecture Documentation](./docs/ai-conversation-architecture-improvements.md)
- [Database Schema Reference](./types/database.ts)
- [Service API Reference](./lib/ai-conversation-service-v2.ts)
- [Hook Documentation](./hooks/use-ai-conversations-v2.ts)

---

**⚠️ Important**: This migration fixes critical production issues. It's recommended to perform this migration as soon as possible to ensure stable AI conversation functionality.