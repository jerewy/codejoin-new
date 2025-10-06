# Collaborator Visibility Fix - Manual Execution Instructions

## Problem Summary
After fixing the infinite recursion issue, non-owner users (project admins and collaborators) can't see other collaborators who have access to the same project. This fix updates the RLS policies to restore proper visibility while preventing recursion.

## Files Created
1. `fix-collaborator-visibility.sql` - Complete SQL fix script
2. `execute-collaborator-visibility-fix.js` - Execution script (requires RPC function)
3. `test-collaborator-visibility-after-fix.js` - Verification script

## Manual Execution Steps

### Step 1: Open Supabase Dashboard
1. Go to: https://izngyuhawwlxopcdmfry.supabase.co
2. Navigate to **SQL Editor** in the sidebar

### Step 2: Execute the Fix
1. Copy the entire contents of `fix-collaborator-visibility.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute

**Important**: The script includes diagnostic output and will show progress messages during execution.

### Step 3: Verify the Fix
After execution, run the verification script:
```bash
node test-collaborator-visibility-after-fix.js
```

## Expected Results After Fix

### 1. Project Owners Should See:
- ✅ All collaborators on their projects
- ✅ Can add/remove collaborators
- ✅ Can change collaborator roles

### 2. Project Admins Should See:
- ✅ All collaborators on projects they admin
- ✅ Can add new collaborators
- ✅ Cannot remove owner-level collaborators

### 3. Collaborators Should See:
- ✅ All other collaborators on the same project
- ✅ Can see project owner and admins
- ✅ Can see their own role
- ❌ Cannot add/remove other collaborators (security)

### 4. Users Should See:
- ✅ Their own collaborator records across all projects

## RLS Policies Created

### Collaborators Table:
1. `collaborators_owners_full_access` - Full access for project owners
2. `collaborators_admins_view_access` - View access for project admins
3. `collaborators_admins_insert_access` - Insert access for project admins
4. `collaborators_can_view_project_collaborators` - **KEY FIX** - Collaborators can see other collaborators
5. `collaborators_users_view_own_records` - Users can see their own records
6. `collaborators_users_insert_own_records` - Users can insert their own records
7. `collaborators_users_update_own_records` - Users can update their own records

### Projects Table:
1. `projects_owners_and_admins_full_access` - Full access for owners/admins
2. `projects_collaborators_view_access` - View access for collaborators
3. `projects_public_read_access` - Public read access (disabled by default)

## Helper Functions (Recursion-Safe)

1. `is_project_owner(project_uuid, user_uuid)` - Checks if user owns the project
2. `is_project_admin(project_uuid, user_uuid)` - Checks if user is project admin
3. `is_project_collaborator(project_uuid, user_uuid)` - Checks if user is a collaborator
4. `user_has_any_project_access(project_uuid, user_uuid)` - Checks any project access

## Testing the Fix

### Test Scenarios:
1. **Login as project owner** - Should see all collaborators
2. **Login as project admin** - Should see all collaborators on projects they admin
3. **Login as collaborator** - Should see other collaborators on the same project
4. **Login as regular user** - Should only see their own collaborator records

### Test Project:
- ID: `175a7112-4f23-4160-84ca-893da2cee58b`
- Expected collaborators should be visible to all appropriate users

## Troubleshooting

### If issues occur:
1. Check the SQL execution output for any errors
2. Verify that all helper functions were created successfully
3. Ensure RLS is enabled on both tables
4. Test with different user roles to confirm visibility

### Manual Verification Queries:
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename IN ('collaborators', 'projects');

-- Check helper functions
SELECT proname FROM pg_proc WHERE proname LIKE '%project_%';

-- Test collaborator visibility
SELECT COUNT(*) FROM collaborators WHERE project_id = '175a7112-4f23-4160-84ca-893da2cee58b';
```

## Security Considerations

- ✅ No infinite recursion (helper functions only query projects table directly)
- ✅ Collaborators can't modify other collaborators' roles
- ✅ Project owners maintain full control
- ✅ Admins have appropriate permissions but can't remove owners
- ✅ All access is properly scoped to specific projects

## Next Steps

1. Execute the SQL fix manually in Supabase Dashboard
2. Run the verification script
3. Test with actual application users
4. Monitor for any performance issues
5. Update any frontend code that depends on collaborator visibility

The fix maintains security while restoring the collaborative functionality that users expect.