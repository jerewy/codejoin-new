# Infinite Recursion Debugging Guide - Supabase Collaborators RLS

## Overview

This guide provides a systematic approach to investigate and resolve infinite recursion errors in Supabase Row Level Security (RLS) policies for the collaborators table. The issue typically manifests as "infinite recursion detected" or "stack depth limit exceeded" errors when users try to access collaborator data.

## Root Cause Analysis

Based on the investigation of your codebase, the infinite recursion in collaborators RLS policies typically occurs when:

1. **Direct Table References**: Policies reference the `collaborators` table directly within their definitions
2. **Circular Dependencies**: Policy A references table B, which references table A
3. **Nested Subqueries**: Complex nested queries that trigger multiple policy evaluations
4. **Missing Helper Functions**: Lack of dedicated functions to handle access checks

## Step-by-Step Debugging Process

### Step 1: Run the Diagnostic Script

**File**: `diagnose-infinite-recursion.sql`

**How to Run**:
1. Open your Supabase SQL Editor
2. Copy and paste the entire diagnostic script
3. Execute the script

**What it Does**:
- Analyzes current RLS policies on the collaborators table
- Detects recursive patterns in policy definitions
- Checks for helper functions
- Tests policy execution safely
- Generates a comprehensive investigation report

**Expected Output**:
```
STEP 1 - CURRENT_POLICIES: Analyzing existing RLS policies on collaborators table
STEP 2 - RLS_STATUS: Checking if RLS is enabled on collaborators table
STEP 3 - RECURSION_DETECTION: Scanning policies for recursive patterns
...
```

### Step 2: Analyze the Diagnostic Report

The diagnostic script will generate a detailed report with the following sections:

1. **CURRENT_POLICIES**: Lists all existing policies
2. **RLS_STATUS**: Confirms RLS is enabled
3. **RECURSION_DETECTION**: Identifies policies with recursive patterns
4. **HELPER_FUNCTIONS**: Checks for access control functions
5. **POLICY_EXECUTION**: Tests safe policy execution
6. **RECURSION_SOURCE_ANALYSIS**: Pinpoints exact recursion sources
7. **DIAGNOSTIC_SUMMARY**: Provides overall assessment

**Look For**:
- Any status marked as "ERROR" - these indicate recursion sources
- Policies that reference `collaborators` table directly
- Missing helper functions
- Complex nested subqueries

### Step 3: Apply the Fix Script

**File**: `fix-infinite-recursion-complete.sql`

**When to Run**:
- Only after reviewing the diagnostic report
- If the diagnostic script found recursion issues
- When you're ready to implement the fix

**How to Run**:
1. Open your Supabase SQL Editor
2. Copy and paste the entire fix script
3. Execute the script

**What it Does**:
- Removes all existing problematic policies (clean slate)
- Creates non-recursive helper functions
- Implements comprehensive RLS policies using helper functions
- Verifies the fix with safety tests
- Generates a final verification report

## Understanding the Fix

### Helper Functions (Non-Recursive)

The fix creates these helper functions:

1. **`is_project_owner(project_uuid, user_uuid)`**
   - Checks if a user owns a project
   - Non-recursive, references only the `projects` table

2. **`is_project_admin(project_uuid, user_uuid)`**
   - Checks if a user is listed as an admin
   - Non-recursive, references only the `projects` table

3. **`is_project_collaborator(project_uuid, user_uuid)`**
   - Checks if a user is a collaborator on a project
   - Uses a simple, non-recursive query

4. **`user_has_project_access(project_uuid, user_uuid)`**
   - Combined function for owner or admin access
   - Optimizes common access patterns

### New RLS Policies

The fix implements 6 comprehensive policies:

1. **`project_owners_full_access`** (ALL operations)
   - Project owners can do everything
   - Uses `is_project_owner()` function

2. **`project_admins_view_access`** (SELECT)
   - Project admins can view collaborators
   - Uses `is_project_admin()` function

3. **`project_admins_insert_access`** (INSERT)
   - Project admins can add new collaborators
   - Uses `is_project_admin()` function

4. **`project_admins_update_access`** (UPDATE)
   - Project admins can update collaborator roles
   - Uses `is_project_admin()` function

5. **`collaborators_view_all_project_collaborators`** (SELECT)
   - Collaborators can see all collaborators on their projects
   - Uses `is_project_collaborator()` function

6. **`users_view_own_collaborator_records`** (SELECT)
   - Users can always view their own collaborator records
   - Simple direct comparison: `user_id = auth.uid()`

## Why This Fix Works

### 1. Eliminates Direct Table References
- Old approach: `EXISTS (SELECT 1 FROM collaborators WHERE ...)`
- New approach: `is_project_collaborator(project_id, auth.uid())`

### 2. Uses Helper Functions
- Helper functions are marked `STABLE` and `SECURITY DEFINER`
- They have explicit `search_path = public` for security
- They perform simple, non-recursive queries

### 3. Clear Separation of Concerns
- Each policy has a single responsibility
- No complex nested subqueries in policies
- Proper security boundaries maintained

### 4. Optimized Performance
- Helper functions are `STABLE` - results are cached within a transaction
- Simple queries that can be optimized by PostgreSQL
- Appropriate indexes can be used effectively

## Testing the Fix

### 1. Verify No Recursion Errors
```sql
-- This should work without recursion
SELECT COUNT(*) FROM collaborators LIMIT 1;
```

### 2. Test Different User Roles
```sql
-- Test as project owner
-- Test as project admin
-- Test as project collaborator
```

### 3. Check API Endpoints
- Test `GET /api/collaborators?project_id=xxx`
- Test `POST /api/collaborators`
- Test `PATCH /api/collaborators`
- Test `DELETE /api/collaborators`

## Common Issues and Solutions

### Issue 1: "Permission denied for function is_project_owner"
**Solution**: The functions are created with `SECURITY DEFINER` - ensure you have appropriate permissions.

### Issue 2: Policies don't work as expected
**Solution**: Check that the helper functions return the expected results by testing them directly.

### Issue 3: Performance is slow
**Solution**: Ensure you have indexes on:
- `collaborators(project_id)`
- `collaborators(user_id)`
- `projects(user_id)`

### Issue 4: Still getting recursion errors
**Solution**: Check if any other tables or views reference the collaborators table with recursive policies.

## Monitoring and Maintenance

### 1. Monitor Query Performance
```sql
-- Check slow queries involving collaborators
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%collaborators%'
ORDER BY mean_time DESC;
```

### 2. Monitor RLS Policy Violations
```sql
-- Check for policy violations in logs
SELECT * FROM pg_stat_user_tables
WHERE relname = 'collaborators';
```

### 3. Regular Health Checks
- Run the diagnostic script periodically
- Monitor application logs for recursion errors
- Test with different user roles after major changes

## Rollback Plan

If you need to rollback the changes:

```sql
-- Drop all new policies
DROP POLICY IF EXISTS "project_owners_full_access" ON collaborators;
DROP POLICY IF EXISTS "project_admins_view_access" ON collaborators;
DROP POLICY IF EXISTS "project_admins_insert_access" ON collaborators;
DROP POLICY IF EXISTS "project_admins_update_access" ON collaborators;
DROP POLICY IF EXISTS "collaborators_view_all_project_collaborators" ON collaborators;
DROP POLICY IF EXISTS "users_view_own_collaborator_records" ON collaborators;

-- Drop helper functions
DROP FUNCTION IF EXISTS is_project_owner(UUID, UUID);
DROP FUNCTION IF EXISTS is_project_admin(UUID, UUID);
DROP FUNCTION IF EXISTS is_project_collaborator(UUID, UUID);
DROP FUNCTION IF EXISTS user_has_project_access(UUID, UUID);
```

## Files Created

1. **`diagnose-infinite-recursion.sql`** - Comprehensive diagnostic script
2. **`fix-infinite-recursion-complete.sql`** - Complete fix implementation
3. **`INFINITE_RECURSION_DEBUGGING_GUIDE.md`** - This guide

## Summary

The infinite recursion issue in Supabase RLS policies for the collaborators table can be systematically diagnosed and resolved using:

1. **Diagnostic Script**: Identifies exact recursion sources
2. **Fix Script**: Implements non-recursive policies with helper functions
3. **Verification**: Comprehensive testing and validation

The solution provides:
- ✅ Elimination of infinite recursion
- ✅ Proper security boundaries
- ✅ Optimized performance
- ✅ Clear, maintainable code
- ✅ Comprehensive testing framework

Follow this guide step-by-step to resolve any infinite recursion issues in your Supabase collaborators implementation.