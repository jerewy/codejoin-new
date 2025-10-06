# Infinite Recursion Fix - Complete Solution

## Problem Analysis
The infinite recursion error in Supabase RLS policies for the `collaborators` table has been **confirmed**. The issue occurs when RLS policies create circular references by querying the same table they're supposed to protect.

## Root Cause
The recursive policies were likely created with patterns like:
```sql
-- PROBLEMATIC: This creates circular reference
CREATE POLICY "collaborators_can_view_collaborators" ON collaborators
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaborators  -- <-- This references the same table!
      WHERE collaborators.project_id = collaborators.project_id
      AND collaborators.user_id = auth.uid()
    )
  );
```

## Solution: Helper Functions + Non-Recursive Policies

The fix involves:
1. **Removing all recursive policies** from the collaborators table
2. **Creating helper functions** that query other tables (projects) instead of collaborators
3. **Implementing non-recursive RLS policies** that use these helper functions

## Step-by-Step Fix Instructions

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**: https://izngyuhawwlxopcdmfry.supabase.co
2. **Navigate to SQL Editor**
3. **Copy and paste the complete SQL script** from `fix-recursion-complete.sql`
4. **Execute the script**

### Option 2: Supabase CLI (if configured)

```bash
# Execute the complete fix
supabase db push --file fix-recursion-complete.sql
```

### Option 3: Direct SQL Execution

Execute the SQL manually:

```sql
-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "collaborators_can_view_collaborators" ON collaborators;
DROP POLICY IF EXISTS "collaborators_can_insert_collaborators" ON collaborators;
DROP POLICY IF EXISTS "collaborators_can_update_collaborators" ON collaborators;
DROP POLICY IF EXISTS "collaborators_can_delete_collaborators" ON collaborators;

-- Step 2: Create helper functions
CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION is_project_admin(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_uuid = ANY(admin_ids)
  );
$$;

-- Step 3: Create non-recursive policies
CREATE POLICY "project_owners_full_access" ON collaborators
  FOR ALL TO authenticated
  USING (is_project_owner(collaborators.project_id, auth.uid()))
  WITH CHECK (is_project_owner(collaborators.project_id, auth.uid()));

CREATE POLICY "project_admins_view_access" ON collaborators
  FOR SELECT TO authenticated
  USING (is_project_admin(collaborators.project_id, auth.uid()));

CREATE POLICY "users_view_own_collaborator_records" ON collaborators
  FOR SELECT TO authenticated
  USING (collaborators.user_id = auth.uid());
```

## Verification

After applying the fix:

1. **Run the test script**:
   ```bash
   node test-fix.js
   ```

2. **Expected results**:
   - No more "infinite recursion" errors
   - Collaborators queries should work properly
   - RLS policies should still enforce security

## New Policy Structure

The fix creates these secure, non-recursive policies:

1. **Project Owners**: Full access to collaborators on their projects
2. **Project Admins**: Can view and add collaborators to projects they admin
3. **Users**: Can view their own collaborator records
4. **Project Access**: Users with project access can view collaborators

## Files Created

- `fix-recursion-complete.sql` - Complete SQL fix script
- `execute-fix.js` - Script to prepare the fix
- `test-fix.js` - Test script to verify the fix
- `INFINITE_RECURSION_FIX_GUIDE.md` - This guide

## Important Notes

- The helper functions use `SECURITY DEFINER` and `STABLE` for optimal performance
- All policies query the `projects` table instead of `collaborators` to avoid recursion
- The fix maintains all necessary security controls while eliminating the circular reference
- RLS remains enabled - we're fixing the policies, not disabling security

## After Applying the Fix

1. Test the collaborators API endpoints
2. Verify all user roles can access appropriate data
3. Monitor the Supabase logs for any issues
4. Update any application code that might depend on the old policy structure

## Troubleshooting

If issues persist after applying the fix:
1. Verify all policies were dropped successfully
2. Check that helper functions were created properly
3. Ensure RLS is still enabled on the collaborators table
4. Test with different user roles and permissions