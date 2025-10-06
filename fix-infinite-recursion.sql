
-- First, let's examine the current RLS policies
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

-- Check if RLS is enabled
SELECT
  'RLS_STATUS' as investigation_step,
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'collaborators';

-- Check for any recursive patterns in policies
SELECT
  'POLICY_ANALYSIS' as investigation_step,
  policyname,
  cmd,
  CASE
    WHEN qual LIKE '%collaborators%' THEN 'POTENTIAL_RECURSION'
    WHEN with_check LIKE '%collaborators%' THEN 'POTENTIAL_RECURSION'
    ELSE 'CLEAN'
  END as recursion_risk,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'collaborators';

-- Drop problematic policies if they exist
DO $$
BEGIN
  -- Drop any policies that might cause infinite recursion
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collaborators' AND policyname LIKE '%collaborator%') THEN
    DROP POLICY IF EXISTS "collaborators_can_view_collaborators" ON collaborators;
    DROP POLICY IF EXISTS "collaborators_can_insert_collaborators" ON collaborators;
    DROP POLICY IF EXISTS "collaborators_can_update_collaborators" ON collaborators;
    DROP POLICY IF EXISTS "collaborators_can_delete_collaborators" ON collaborators;
    RAISE NOTICE 'Dropped potentially recursive collaborator policies';
  END IF;
END $$;

-- Create new non-recursive policies
-- Policy 1: Project owners can do everything
CREATE POLICY "project_owners_full_access" ON collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Policy 2: Project admins can view and add collaborators
CREATE POLICY "project_admins_limited_access" ON collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = collaborators.project_id
      AND auth.uid() = ANY(projects.admin_ids)
    )
  );

CREATE POLICY "project_admins_can_insert" ON collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = collaborators.project_id
      AND auth.uid() = ANY(projects.admin_ids)
    )
  );

-- Policy 3: Collaborators can view other collaborators on the same project
CREATE POLICY "collaborators_can_view_same_project" ON collaborators
  FOR SELECT
  TO authenticated
  USING (
    collaborators.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = collaborators.project_id
      AND (p.user_id = auth.uid() OR auth.uid() = ANY(p.admin_ids))
    )
  );

-- Verify the new policies
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

-- Test the policies with a simple select
SELECT
  'POLICY_TEST' as investigation_step,
  COUNT(*) as accessible_rows
FROM collaborators
LIMIT 1;
  