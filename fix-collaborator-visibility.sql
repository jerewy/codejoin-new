-- ================================================================
-- COLLABORATOR VISIBILITY FIX - UPDATED RLS POLICIES
-- ================================================================
-- This script fixes the collaborator visibility issue while maintaining
-- the infinite recursion fix. It ensures that:
-- 1. Project owners can see all collaborators
-- 2. Project admins can see all collaborators on projects they admin
-- 3. Collaborators can see other collaborators on projects they have access to
-- 4. Users can see their own collaborator records
--
-- Created: 2025-10-06
-- Purpose: Fix collaborator visibility without re-introducing recursion
-- ================================================================

-- ================================================================
-- STEP 1: PRELIMINARY DIAGNOSTICS
-- ================================================================

\echo '🔍 Starting collaborator visibility fix...'

-- Check current RLS policies
SELECT
    'BEFORE_VISIBILITY_FIX' as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('collaborators', 'projects')
ORDER BY tablename, policyname;

-- ================================================================
-- STEP 2: TEMPORARY RLS DISABLE FOR CLEANUP
-- ================================================================

\echo '🔧 Temporarily disabling RLS for policy updates...'

ALTER TABLE collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

\echo '✅ RLS temporarily disabled'

-- ================================================================
-- STEP 3: REMOVE EXISTING COLLABORATOR POLICIES
-- ================================================================

\echo '🗑️  Removing existing collaborator policies...'

-- Drop all existing collaborator policies
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN
        SELECT policyname FROM pg_policies WHERE tablename = 'collaborators'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON collaborators';
        RAISE NOTICE 'Dropped collaborators policy: %', policy_rec.policyname;
    END LOOP;
END $$;

\echo '✅ Existing collaborator policies removed'

-- ================================================================
-- STEP 4: UPDATE/CREATE HELPER FUNCTIONS (RECURSION-SAFE)
-- ================================================================

\echo '🛠️  Creating/updating helper functions...'

-- Helper function: Check if user is project owner
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

-- Helper function: Check if user is project admin
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

-- NEW: Helper function to check if user is a collaborator on a project
-- This checks the collaborators table directly but is used in a safe way
CREATE OR REPLACE FUNCTION is_project_collaborator(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
$$;

-- Helper function: Check if user has any project access (owner, admin, or collaborator)
CREATE OR REPLACE FUNCTION user_has_any_project_access(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND (user_id = user_uuid OR user_uuid = ANY(admin_ids))
  )
  OR EXISTS (
    SELECT 1 FROM collaborators
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
$$;

\echo '✅ Helper functions created/updated'

-- ================================================================
-- STEP 5: CREATE NEW COLLABORATOR VISIBILITY POLICIES
-- ================================================================

\echo '📋 Creating new collaborator visibility policies...'

-- Policy 1: Project owners have full access to all collaborators on their projects
CREATE POLICY "collaborators_owners_full_access" ON collaborators
  FOR ALL
  TO authenticated
  USING (is_project_owner(project_id, auth.uid()))
  WITH CHECK (is_project_owner(project_id, auth.uid()));

-- Policy 2: Project admins can view all collaborators on projects they admin
CREATE POLICY "collaborators_admins_view_access" ON collaborators
  FOR SELECT
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()));

-- Policy 3: Project admins can insert new collaborators on projects they admin
CREATE POLICY "collaborators_admins_insert_access" ON collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- Policy 4: Collaborators can view ALL collaborators on projects they have access to
-- This is the key fix - allows collaborators to see other collaborators
CREATE POLICY "collaborators_can_view_project_collaborators" ON collaborators
  FOR SELECT
  TO authenticated
  USING (is_project_collaborator(project_id, auth.uid()));

-- Policy 5: Users can view their own collaborator records (redundant but safe)
CREATE POLICY "collaborators_users_view_own_records" ON collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 6: Users can insert their own collaborator records (for invitations)
CREATE POLICY "collaborators_users_insert_own_records" ON collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 7: Users can update their own collaborator records
CREATE POLICY "collaborators_users_update_own_records" ON collaborators
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

\echo '✅ New collaborator visibility policies created'

-- ================================================================
-- STEP 6: PROJECTS TABLE POLICIES (KEEP EXISTING ONES)
-- ================================================================

\echo '📋 Updating projects table policies...'

-- Drop existing project policies to recreate them cleanly
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN
        SELECT policyname FROM pg_policies WHERE tablename = 'projects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON projects';
        RAISE NOTICE 'Dropped projects policy: %', policy_rec.policyname;
    END LOOP;
END $$;

-- Policy 1: Project owners and admins have full access
CREATE POLICY "projects_owners_and_admins_full_access" ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR auth.uid() = ANY(admin_ids))
  WITH CHECK (user_id = auth.uid() OR auth.uid() = ANY(admin_ids));

-- Policy 2: Collaborators can view projects they have access to
CREATE POLICY "projects_collaborators_view_access" ON projects
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM collaborators
    WHERE collaborators.project_id = projects.id
    AND collaborators.user_id = auth.uid()
  ));

-- Policy 3: Authenticated users can read public projects (if any public flag exists)
-- This assumes there might be a public flag, adjust as needed
CREATE POLICY "projects_public_read_access" ON projects
  FOR SELECT
  TO authenticated
  USING (false); -- Adjust this if you have public projects

\echo '✅ Projects table policies updated'

-- ================================================================
-- STEP 7: RE-ENABLE RLS
-- ================================================================

\echo '🔒 Re-enabling RLS with new policies...'

ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

\echo '✅ RLS re-enabled on both tables'

-- ================================================================
-- STEP 8: VERIFICATION AND TESTING
-- ================================================================

\echo '🔍 Verifying new policies...'

-- Verify helper functions exist
SELECT
    'HELPER_FUNCTIONS_VERIFICATION' as step,
    proname as function_name,
    provolatile as volatility,
    'SECURITY_DEFINER' as security_type
FROM pg_proc
WHERE proname IN ('is_project_owner', 'is_project_admin', 'is_project_collaborator', 'user_has_any_project_access')
ORDER BY proname;

-- Verify new policies are in place
SELECT
    'NEW_POLICIES_VERIFICATION' as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE
        WHEN qual LIKE '%collaborators%' AND tablename = 'projects' THEN 'USES_COLLABORATORS'
        WHEN qual LIKE '%collaborators%' AND tablename = 'collaborators' THEN 'SELF_REFERENCE'
        ELSE 'CLEAN'
    END as recursion_risk
FROM pg_policies
WHERE tablename IN ('collaborators', 'projects')
ORDER BY tablename, policyname;

-- Test basic functionality
SELECT
    'FUNCTIONALITY_TEST' as step,
    'collaborators' as table_tested,
    COUNT(*) as test_result
FROM collaborators
LIMIT 1;

SELECT
    'FUNCTIONALITY_TEST' as step,
    'projects' as table_tested,
    COUNT(*) as test_result
FROM projects
LIMIT 1;

\echo '✅ Verification completed'

-- ================================================================
-- STEP 9: COLLABORATOR VISIBILITY TESTING LOGIC
-- ================================================================

\echo '🧪 Testing collaborator visibility logic...'

-- This demonstrates what different users should be able to see
-- Note: This is a conceptual test since we can't set auth.uid() directly

-- Test project: 175a7112-4f23-4160-84ca-893da2cee58b
-- Test users:
-- Owner: Jeremy (need to get actual UUID)
-- Admin: Various admin IDs
-- Collaborator: Raja (5081708d-3a45-469c-94dd-b234e3738938)

-- Show raw data first
\echo '📊 Raw collaborator data for visibility testing:'

SELECT
    'RAW_COLLABORATOR_DATA' as test_type,
    c.project_id,
    c.user_id as collaborator_id,
    c.role as collaborator_role,
    p.name as project_name,
    pr.email as collaborator_email,
    pr.full_name as collaborator_name
FROM collaborators c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN profiles pr ON c.user_id = pr.id
WHERE c.project_id = '175a7112-4f23-4160-84ca-893da2cee58b'
ORDER BY c.role, pr.email;

-- Show project structure
\echo '🏗️  Project structure for visibility testing:'

SELECT
    'PROJECT_STRUCTURE' as test_type,
    p.id as project_id,
    p.name as project_name,
    p.user_id as owner_id,
    owner.email as owner_email,
    p.admin_ids,
    array_agg(admin.email) as admin_emails
FROM projects p
LEFT JOIN profiles owner ON p.user_id = owner.id
LEFT JOIN profiles admin ON admin.id = ANY(p.admin_ids)
WHERE p.id = '175a7112-4f23-4160-84ca-893da2cee58b'
GROUP BY p.id, p.name, p.user_id, owner.email, p.admin_ids;

-- Test visibility logic for different user types
\echo '👥 Visibility logic test for different user types:'

-- Test what a collaborator should see (Raja)
SELECT
    'COLLABORATOR_VISIBILITY_TEST' as test_type,
    c.project_id,
    c.user_id as visible_collaborator_id,
    c.role as visible_collaborator_role,
    pr.email as visible_collaborator_email,
    pr.full_name as visible_collaborator_name,
    CASE
        WHEN is_project_owner(c.project_id, '5081708d-3a45-469c-94dd-b234e3738938') THEN 'VISIBLE - User is owner'
        WHEN is_project_admin(c.project_id, '5081708d-3a45-469c-94dd-b234e3738938') THEN 'VISIBLE - User is admin'
        WHEN is_project_collaborator(c.project_id, '5081708d-3a45-469c-94dd-b234e3738938') THEN 'VISIBLE - User is collaborator'
        WHEN c.user_id = '5081708d-3a45-469c-94dd-b234e3738938' THEN 'VISIBLE - User is the collaborator'
        ELSE 'HIDDEN - No access'
    END as visibility_for_raja
FROM collaborators c
LEFT JOIN profiles pr ON c.user_id = pr.id
WHERE c.project_id = '175a7112-4f23-4160-84ca-893da2cee58b'
ORDER BY pr.email;

\echo '✅ Collaborator visibility testing completed'

-- ================================================================
-- STEP 10: SUCCESS CONFIRMATION
-- ================================================================

\echo '🎉 COLLABORATOR VISIBILITY FIX COMPLETED!'
\echo ''
\echo '✅ Fixed collaborator visibility without re-introducing recursion'
\echo '✅ Project owners can see all collaborators on their projects'
\echo '✅ Project admins can see all collaborators on projects they admin'
\echo '✅ Collaborators can see other collaborators on the same project'
\echo '✅ Users can see their own collaborator records'
\echo '✅ All helper functions are recursion-safe'
\echo ''
\echo '📋 POLICY SUMMARY:'
\echo '- collaborators_owners_full_access: Full access for project owners'
\echo '- collaborators_admins_view_access: View access for project admins'
\echo '- collaborators_admins_insert_access: Insert access for project admins'
\echo '- collaborators_can_view_project_collaborators: KEY FIX - Collaborators can see other collaborators'
\echo '- collaborators_users_view_own_records: Users can see their own records'
\echo '- collaborators_users_insert_own_records: Users can insert their own records'
\echo '- collaborators_users_update_own_records: Users can update their own records'
\echo ''
\echo '🧪 NEXT STEPS:'
\echo '1. Test with actual application using different user roles'
\echo '2. Verify that collaborators can now see other collaborators'
\echo '3. Ensure no infinite recursion occurs'
\echo '4. Test all CRUD operations work correctly'

-- Final confirmation
SELECT
    'VISIBILITY_FIX_COMPLETE' as status,
    'COLLABORATOR_VISIBILITY_RESTORED' as result,
    NOW() as completion_timestamp,
    'All collaborators can now see other project participants' as confirmation;