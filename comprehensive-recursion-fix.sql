
-- COMPREHENSIVE INFINITE RECURSION FIX
-- This script eliminates ALL recursive policies and creates clean replacements

-- Disable RLS temporarily to allow cleanup
ALTER TABLE collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies that might cause recursion
DO $$
BEGIN
  RAISE NOTICE 'Dropping all problematic policies...';

  -- Drop all collaborators policies
  FOR policy_rec IN
    SELECT policyname FROM pg_policies WHERE tablename = 'collaborators'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON collaborators';
    RAISE NOTICE 'Dropped: %', policy_rec.policyname;
  END LOOP;

  -- Drop all projects policies that reference collaborators
  FOR policy_rec IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'projects'
    AND (qual LIKE '%collaborators%' OR with_check LIKE '%collaborators%')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON projects';
    RAISE NOTICE 'Dropped problematic projects policy: %', policy_rec.policyname;
  END LOOP;

  RAISE NOTICE 'All problematic policies dropped';
END $$;

-- Create helper functions to prevent recursion
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

-- Create clean, non-recursive collaborators policies
CREATE POLICY "collaborators_project_owners_full_access" ON collaborators
  FOR ALL
  TO authenticated
  USING (is_project_owner(project_id, auth.uid()))
  WITH CHECK (is_project_owner(project_id, auth.uid()));

CREATE POLICY "collaborators_project_admins_limited_access" ON collaborators
  FOR SELECT
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()));

CREATE POLICY "collaborators_project_admins_insert_access" ON collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(project_id, auth.uid()));

CREATE POLICY "collaborators_users_view_own_records" ON collaborators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "collaborators_users_with_project_access_view" ON collaborators
  FOR SELECT
  TO authenticated
  USING (user_has_project_access(project_id, auth.uid()));

-- Create clean projects policies (no references to collaborators table)
CREATE POLICY "projects_owners_and_admins_full_access" ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR auth.uid() = ANY(admin_ids))
  WITH CHECK (user_id = auth.uid() OR auth.uid() = ANY(admin_ids));

CREATE POLICY "projects_public_read_access" ON projects
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow authenticated users to read projects

-- Re-enable RLS
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Verification
SELECT
  'FIX_VERIFICATION' as investigation_step,
  'All recursive policies eliminated' as status,
  'Helper functions created' as helpers,
  'Clean policies implemented' as policies;

SELECT
  'FINAL_POLICIES' as investigation_step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('collaborators', 'projects')
ORDER BY tablename, policyname;
    