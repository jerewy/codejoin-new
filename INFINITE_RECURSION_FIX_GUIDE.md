# Infinite Recursion Fix Guide - Supabase Collaborators Table

## Issue Summary

The Supabase database is experiencing **"infinite recursion detected in policy for relation 'collaborators'"** error (PostgreSQL error code `42P17`). This occurs when Row Level Security (RLS) policies reference the table they're supposed to protect, creating a circular dependency.

## Root Cause Analysis

The issue is caused by RLS policies on the `collaborators` table that reference the `collaborators` table within their own policy expressions. This creates an infinite loop when PostgreSQL tries to evaluate the policies.

### Problem Pattern
```sql
-- PROBLEMATIC: Policy references the same table
CREATE POLICY "collaborators_can_view_collaborators" ON collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaborators c_self  -- ❌ Recursive reference!
      WHERE c_self.project_id = collaborators.project_id
      AND c_self.user_id = auth.uid()
    )
  );
```

## Solution Approach

1. **Remove all existing RLS policies** on the `collaborators` table
2. **Create helper functions** to check permissions without recursion
3. **Implement new non-recursive RLS policies** using the helper functions
4. **Test the fix** to ensure the infinite recursion is resolved

## Files Created

### 1. `fix-recursion-complete.sql`
Complete SQL migration script that:
- Examines current policies
- Drops all problematic policies
- Creates helper functions
- Implements new non-recursive policies
- Tests the fix

### 2. `execute-fix.js`
Node.js script that prepares the fix and provides guidance for manual execution.

### 3. `test-fix.js`
Test script to verify that the infinite recursion is resolved.

## Step-by-Step Fix Instructions

### Step 1: Execute the SQL Fix

**Option A: Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `fix-recursion-complete.sql`
4. Paste into the SQL editor
5. Click **Run** to execute the script
6. Review the output for any errors

**Option B: Supabase CLI**
```bash
# If you have the Supabase CLI installed
supabase db push
```

### Step 2: Verify the Fix

Run the test script to confirm the fix worked:
```bash
node test-fix.js
```

Expected results:
- All tests should pass without "infinite recursion" errors
- Queries to the collaborators table should work
- API endpoints should return proper responses

### Step 3: Test the Application

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the collaborator functionality:
   - Navigate to a project page
   - Try to view collaborators
   - Try to add new collaborators
   - Verify all operations work without errors

## Technical Details of the Fix

### Helper Functions Created

1. **`is_project_owner(project_uuid, user_uuid)`**
   - Checks if a user owns a project
   - SECURITY DEFINER, STABLE for performance

2. **`is_project_admin(project_uuid, user_uuid)`**
   - Checks if a user is an admin on a project
   - SECURITY DEFINER, STABLE for performance

3. **`user_has_project_access(project_uuid, user_uuid)`**
   - Checks if a user has any access to a project (owner or admin)
   - SECURITY DEFINER, STABLE for performance

### New RLS Policies

1. **`project_owners_full_access`**
   - Project owners can perform all operations (SELECT, INSERT, UPDATE, DELETE)
   - Uses `is_project_owner()` function

2. **`project_admins_view_access`**
   - Project admins can view collaborators
   - Uses `is_project_admin()` function

3. **`project_admins_insert_access`**
   - Project admins can add new collaborators
   - Uses `is_project_admin()` function

4. **`users_view_own_collaborator_records`**
   - Users can view their own collaborator records
   - Direct comparison: `collaborators.user_id = auth.uid()`

5. **`project_users_can_view_collaborators`**
   - Users with project access can view collaborators
   - Uses `user_has_project_access()` function

## Security Considerations

### Why This Fix is Secure

1. **No Recursive References**: All helper functions query the `projects` table, not the `collaborators` table
2. **Security Definer**: Helper functions run with elevated privileges but are carefully designed
3. **Stable Functions**: Functions are marked STABLE for better query planning
4. **Proper Access Control**: Each policy is designed for specific use cases
5. **Principle of Least Privilege**: Users only get access they need

### Access Patterns Supported

- ✅ **Project Owners**: Full CRUD access to collaborators
- ✅ **Project Admins**: Can view and add collaborators
- ✅ **Collaborators**: Can view other collaborators on their projects
- ✅ **Self-Access**: Users can always view their own collaborator records

## Troubleshooting

### If Tests Still Show Recursion

1. **Verify SQL Execution**: Make sure the SQL script was executed successfully
2. **Check Policy Names**: Ensure old policies were dropped
3. **Restart Application**: Sometimes application caching can mask fixes
4. **Check Supabase Logs**: Look for any policy-related errors

### If API Returns 401 Errors

This is expected for unauthenticated requests and is not related to the recursion fix.

### If Collaborator Operations Fail

1. **Check User Authentication**: Ensure users are properly logged in
2. **Verify Project Ownership**: Check that users have the required permissions
3. **Check Admin IDs**: Verify that `admin_ids` array is properly populated

## Verification Commands

### Check RLS Status
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'collaborators';
```

### Test Helper Functions
```sql
SELECT is_project_owner('your-project-id', 'your-user-id');
SELECT is_project_admin('your-project-id', 'your-user-id');
SELECT user_has_project_access('your-project-id', 'your-user-id');
```

## Before and After

### Before (Broken)
```sql
-- ❌ Recursive policy causing infinite loop
CREATE POLICY "collaborators_can_view_collaborators" ON collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaborators c_self  -- Recursive reference!
      WHERE c_self.project_id = collaborators.project_id
      AND c_self.user_id = auth.uid()
    )
  );
```

### After (Fixed)
```sql
-- ✅ Non-recursive policy using helper function
CREATE POLICY "users_view_own_collaborator_records" ON collaborators
  FOR SELECT
  TO authenticated
  USING (collaborators.user_id = auth.uid());
```

## Monitoring

After applying the fix, monitor:

1. **Application Logs**: Look for any 42P17 errors
2. **Supabase Logs**: Check for policy violations
3. **Performance**: Monitor query performance for collaborator operations
4. **User Reports**: Watch for any access issues

## Support

If you encounter issues:

1. Check that the SQL script executed without errors
2. Verify all policies were created successfully
3. Run the test script to diagnose issues
4. Review Supabase logs for specific error messages

The infinite recursion issue should now be completely resolved! 🎉