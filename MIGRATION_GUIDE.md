# Infinite Recursion Fix - Migration Guide

## Issue Summary
The database is experiencing infinite recursion in RLS (Row Level Security) policies on the `collaborators` table. This occurs when policies reference the same table they're protecting, creating circular dependencies.

## Root Cause Analysis
1. **Recursive Policies**: RLS policies on `collaborators` table reference the `collaborators` table itself
2. **Cross-Table Recursion**: Policies on `projects` table reference `collaborators`, which may reference back to `projects`
3. **Missing Helper Functions**: Helper functions that should break recursion don't exist or aren't being used

## Fix Strategy
1. **Complete Policy Cleanup**: Remove all existing problematic policies
2. **Helper Functions**: Create stable helper functions that check permissions without recursion
3. **Clean Policies**: Implement new non-recursive policies using helper functions
4. **Verification**: Test and confirm the fix works

## Manual Execution Steps

### Step 1: Access Supabase Dashboard
1. Go to: https://izngyuhawwlxopcdmfry.supabase.co
2. Navigate to **SQL Editor**
3. Create a new query window

### Step 2: Execute the Comprehensive Fix
1. Copy the entire contents of `comprehensive-recursion-fix.sql`
2. Paste into the SQL Editor
3. Click **Run** to execute the fix

### Step 3: Verify the Fix
After executing the fix, run the verification:
```bash
node verify-complete-fix.js
```

## Expected Results

### Before Fix (Current State)
- ❌ Queries to `collaborators` table fail with "infinite recursion detected"
- ❌ Queries to `projects` table may also fail
- ❌ API endpoints return 500 errors
- ❌ Application features broken

### After Fix (Expected State)
- ✅ Queries to `collaborators` table work without recursion errors
- ✅ Queries to `projects` table work normally
- ✅ API endpoints function correctly
- ✅ Application features restored

## What the Fix Does

### 1. Disables RLS Temporarily
```sql
ALTER TABLE collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
```

### 2. Removes All Problematic Policies
- Drops all existing policies on `collaborators` table
- Drops any policies on `projects` that reference `collaborators`

### 3. Creates Helper Functions
- `is_project_owner(project_uuid, user_uuid)` - Checks if user owns the project
- `is_project_admin(project_uuid, user_uuid)` - Checks if user is project admin
- `user_has_project_access(project_uuid, user_uuid)` - Checks if user has any project access

### 4. Implements Clean Policies
**Collaborators Table:**
- Project owners have full access
- Project admins can view and insert collaborators
- Users can view their own collaborator records
- Users with project access can view collaborators

**Projects Table:**
- Owners and admins have full access
- Authenticated users can read projects (public read access)

### 5. Re-enables RLS
```sql
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

## Safety Considerations

### Backup Before Execution
The script includes diagnostic queries but does NOT create data backups. Ensure you have:
1. Recent database backups
2. Ability to rollback changes if needed

### Minimal Downtime
- RLS is disabled only temporarily during policy updates
- Data is never modified, only security policies are changed
- Helper functions use `SECURITY DEFINER` and `STABLE` for performance

### Security Model Preserved
- All existing security boundaries are maintained
- Users can only access data they're authorized to see
- No data exposure or privilege escalation

## Troubleshooting

### If Fix Fails to Execute
1. Check for syntax errors in SQL
2. Ensure you have admin privileges
3. Try executing statements individually
4. Check Supabase service status

### If Recursion Persists
1. Verify all policies were dropped correctly
2. Check that helper functions were created
3. Look for any remaining circular references
4. Run diagnostic queries to identify remaining issues

### If Application Still Fails
1. Check application logs for specific errors
2. Verify API endpoints are accessible
3. Test with different user roles
4. Check for caching issues

## Verification Commands

### Test Basic Functionality
```bash
# Test collaborators table
node test-collaborator-api.js

# Test full application flow
node test-final-collaborator-fix.js

# Comprehensive verification
node verify-complete-fix.js
```

### Manual Database Tests
```sql
-- Test collaborators access
SELECT COUNT(*) FROM collaborators LIMIT 1;

-- Test projects access
SELECT COUNT(*) FROM projects LIMIT 1;

-- Check policies are working
SELECT * FROM pg_policies WHERE tablename IN ('collaborators', 'projects');
```

## Rollback Plan

If issues occur after the fix:

### Option 1: Disable RLS Temporarily
```sql
ALTER TABLE collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
```

### Option 2: Restore from Backup
- Restore database to state before fix execution
- Re-apply any necessary changes manually

### Option 3: Partial Rollback
- Drop only the new policies
- Restore previous policies from backup

## Post-Fix Monitoring

### Monitor Application Logs
- Look for any remaining recursion errors
- Check for performance issues
- Verify all user roles work correctly

### Database Monitoring
- Monitor query performance
- Check for any new security issues
- Verify RLS policies are working as expected

### User Testing
- Test with different user types (owners, admins, collaborators)
- Verify all application features work
- Check for any accessibility issues

## Contact Information

If you encounter issues with this fix:
1. Check the troubleshooting section above
2. Review the diagnostic SQL files created
3. Test with the verification scripts provided
4. Monitor application behavior after changes

## Files Created

- `comprehensive-recursion-fix.sql` - Main fix script
- `verify-complete-fix.js` - Verification script
- `diagnostic-examination.sql` - Database diagnostics
- `function-check.sql` - Helper function verification
- `policy-cleanup.sql` - Policy cleanup queries
- `create-clean-policies.sql` - New policy creation
- `database-diagnostic.js` - Database analysis tool
- `execute-sql-fix.js` - SQL execution tool (if RPC available)