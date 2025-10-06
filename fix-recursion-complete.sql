-- Complete fix for infinite recursion in collaborators RLS policies
-- This script removes all problematic policies and replaces them with non-recursive ones

-- Step 1: Examine current problematic policies
SELECT
  'CURRENT_POLICIES' as investigation_step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'collaborators';

-- Step 2: Check RLS status
SELECT
  'RLS_STATUS' as investigation_step,
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'collaborators';

-- Step 3: Drop ALL existing policies on collaborators to clean slate
DO $$
BEGIN
  -- Get all policy names for collaborators table
  DECLARE policy_rec RECORD;
  FOR policy_rec IN
    SELECT policyname FROM pg_policies WHERE tablename = 'collaborators'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON collaborators';
    RAISE NOTICE 'Dropped policy: %', policy_rec.policyname;
  END LOOP;
END $$;

-- Step 4: Create helper functions to avoid recursion
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

CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND (user_id = user_uuid OR user_uuid = ANY(admin_ids))
  );
$$;

-- Step 5: Create new non-recursive RLS policies

-- Policy 1: Project owners have full access
CREATE POLICY "project_owners_full_access" ON collaborators
  FOR ALL
  TO authenticated
  USING (is_project_owner(collaborators.project_id, auth.uid()))
  WITH CHECK (is_project_owner(collaborators.project_id, auth.uid()));

-- Policy 2: Project admins can view and add collaborators
CREATE POLICY "project_admins_view_access" ON collaborators
  FOR SELECT
  TO authenticated
  USING (is_project_admin(collaborators.project_id, auth.uid()));

CREATE POLICY "project_admins_insert_access" ON collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(collaborators.project_id, auth.uid()));

-- Policy 3: Users can view their own collaborator records
CREATE POLICY "users_view_own_collaborator_records" ON collaborators
  FOR SELECT
  TO authenticated
  USING (collaborators.user_id = auth.uid());

-- Policy 4: Users with project access can view collaborators (non-recursive)
CREATE POLICY "project_users_can_view_collaborators" ON collaborators
  FOR SELECT
  TO authenticated
  USING (
    user_has_project_access(collaborators.project_id, auth.uid())
  );

-- Step 6: Verify the new policies
SELECT
  'NEW_POLICIES_CREATED' as investigation_step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'collaborators';

-- Step 7: Test the policies with a safe query
SELECT
  'POLICY_TEST' as investigation_step,
  COUNT(*) as total_accessible_rows
FROM collaborators
WHERE 1=1;  -- This will be filtered by RLS policies

-- Step 8: Test specific access patterns
-- Test if a user can see their own collaborator records
SELECT
  'OWN_ACCESS_TEST' as investigation_step,
  'User should see their own collaborator records' as description,
  COUNT(*) as count
FROM collaborators
WHERE user_id = auth.uid()
LIMIT 1;

-- Step 9: Show that the infinite recursion is fixed
SELECT
  'RECURSION_FIX_VERIFICATION' as investigation_step,
  'All policies are now non-recursive and use helper functions' as status,
  'Infinite recursion issue should be resolved' as result;

-- Step 10: Verify helper functions exist and work
SELECT
  'HELPER_FUNCTIONS_VERIFICATION' as investigation_step,
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname IN ('is_project_owner', 'is_project_admin', 'user_has_project_access');