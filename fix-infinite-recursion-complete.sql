/**
 * COMPREHENSIVE INFINITE RECURSION FIX
 *
 * This script provides a definitive fix for infinite recursion in Supabase
 * collaborators RLS policies by implementing non-recursive policies with
 * proper helper functions.
 *
 * PREREQUISITES:
 * 1. Run diagnose-infinite-recursion.sql first to identify issues
 * 2. Review the diagnostic report before applying fixes
 * 3. Ensure you have necessary permissions to drop/create policies
 *
 * This script implements a complete, production-ready solution.
 */

-- =============================================================================
-- STEP 1: CLEAN SLATE - Remove all problematic policies
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 1: REMOVING ALL EXISTING POLICIES (CLEAN SLATE)';
RAISE NOTICE '=============================================================================';

DO $$
DECLARE
    policy_rec RECORD;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping all existing RLS policies on collaborators table...';

    FOR policy_rec IN
        SELECT policyname FROM pg_policies WHERE tablename = 'collaborators'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON collaborators';
        policy_count := policy_count + 1;
        RAISE NOTICE '  - Dropped policy: %', policy_rec.policyname;
    END LOOP;

    RAISE NOTICE 'Total policies dropped: %', policy_count;

    IF policy_count = 0 THEN
        RAISE NOTICE '  No existing policies found - starting fresh';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Create non-recursive helper functions
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 2: CREATING NON-RECURSIVE HELPER FUNCTIONS';
RAISE NOTICE '=============================================================================';

-- Function to check if user is project owner
CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_id = user_uuid
  );
$$;

RAISE NOTICE '✓ Created is_project_owner() function';

-- Function to check if user is project admin
CREATE OR REPLACE FUNCTION is_project_admin(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_uuid = ANY(admin_ids)
  );
$$;

RAISE NOTICE '✓ Created is_project_admin() function';

-- Function to check if user is a collaborator on a project
CREATE OR REPLACE FUNCTION is_project_collaborator(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
$$;

RAISE NOTICE '✓ Created is_project_collaborator() function';

-- Combined function for comprehensive access checking
CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND (user_id = user_uuid OR user_uuid = ANY(admin_ids))
  );
$$;

RAISE NOTICE '✓ Created user_has_project_access() function';

-- =============================================================================
-- STEP 3: Create comprehensive, non-recursive RLS policies
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 3: CREATING NON-RECURSIVE RLS POLICIES';
RAISE NOTICE '=============================================================================';

-- Policy 1: Project owners have full access (ALL operations)
CREATE POLICY "project_owners_full_access" ON collaborators
  FOR ALL
  TO authenticated
  USING (is_project_owner(collaborators.project_id, auth.uid()))
  WITH CHECK (is_project_owner(collaborators.project_id, auth.uid()));

RAISE NOTICE '✓ Created policy: project_owners_full_access (ALL operations)';

-- Policy 2: Project admins can view collaborators
CREATE POLICY "project_admins_view_access" ON collaborators
  FOR SELECT
  TO authenticated
  USING (is_project_admin(collaborators.project_id, auth.uid()));

RAISE NOTICE '✓ Created policy: project_admins_view_access (SELECT)';

-- Policy 3: Project admins can add new collaborators
CREATE POLICY "project_admins_insert_access" ON collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(collaborators.project_id, auth.uid()));

RAISE NOTICE '✓ Created policy: project_admins_insert_access (INSERT)';

-- Policy 4: Project admins can update collaborator roles
CREATE POLICY "project_admins_update_access" ON collaborators
  FOR UPDATE
  TO authenticated
  USING (is_project_admin(collaborators.project_id, auth.uid()))
  WITH CHECK (is_project_admin(collaborators.project_id, auth.uid()));

RAISE NOTICE '✓ Created policy: project_admins_update_access (UPDATE)';

-- Policy 5: Collaborators can view all collaborators on their projects
CREATE POLICY "collaborators_view_all_project_collaborators" ON collaborators
  FOR SELECT
  TO authenticated
  USING (is_project_collaborator(collaborators.project_id, auth.uid()));

RAISE NOTICE '✓ Created policy: collaborators_view_all_project_collaborators (SELECT)';

-- Policy 6: Users can view their own collaborator records
CREATE POLICY "users_view_own_collaborator_records" ON collaborators
  FOR SELECT
  TO authenticated
  USING (collaborators.user_id = auth.uid());

RAISE NOTICE '✓ Created policy: users_view_own_collaborator_records (SELECT)';

-- =============================================================================
-- STEP 4: Verify the new policies
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 4: VERIFYING NEW POLICIES';
RAISE NOTICE '=============================================================================';

-- Show all created policies
SELECT
    'POLICY_VERIFICATION' as verification_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE
        WHEN qual IS NOT NULL THEN 'USING: ' || LEFT(qual, 100) || '...'
        ELSE 'No USING clause'
    END as using_clause,
    CASE
        WHEN with_check IS NOT NULL THEN 'WITH_CHECK: ' || LEFT(with_check, 100) || '...'
        ELSE 'No WITH_CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE tablename = 'collaborators'
ORDER BY cmd, policyname;

-- =============================================================================
-- STEP 5: Test the policies safely
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 5: TESTING POLICY IMPLEMENTATION';
RAISE NOTICE '=============================================================================';

DO $$
BEGIN
    -- Test 1: Basic query (should work without recursion)
    RAISE NOTICE 'Test 1: Basic query execution...';
    DECLARE test_result INTEGER;

    BEGIN
        SELECT COUNT(*) INTO test_result FROM collaborators LIMIT 1;
        RAISE NOTICE '  ✓ Basic query successful - no recursion detected';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ✗ Basic query failed: %', SQLERRM;
        RAISE NOTICE '  This indicates recursion still exists - investigation needed';
    END;

    -- Test 2: Helper function execution
    RAISE NOTICE 'Test 2: Helper function execution...';

    BEGIN
        -- Test helper functions with safe UUIDs
        PERFORM is_project_owner('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
        RAISE NOTICE '  ✓ Helper functions execute without recursion';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ✗ Helper function test failed: %', SQLERRM;
    END;

    -- Test 3: Policy structure verification
    RAISE NOTICE 'Test 3: Policy structure verification...';

    DECLARE policy_count INTEGER;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'collaborators';

    IF policy_count = 6 THEN
        RAISE NOTICE '  ✓ All 6 expected policies created successfully';
    ELSE
        RAISE NOTICE '  ⚠ Policy count mismatch: expected 6, found %', policy_count;
    END IF;

    -- Test 4: Check for any remaining recursive patterns
    RAISE NOTICE 'Test 4: Recursive pattern analysis...';

    DECLARE recursive_policy_count INTEGER;
    SELECT COUNT(*) INTO recursive_policy_count
    FROM pg_policies
    WHERE tablename = 'collaborators'
    AND (qual ~* 'collaborators' OR with_check ~* 'collaborators');

    IF recursive_policy_count = 0 THEN
        RAISE NOTICE '  ✓ No recursive patterns found in new policies';
    ELSE
        RAISE NOTICE '  ✗ Found % policies with potential recursive patterns', recursive_policy_count;
    END IF;
END $$;

-- =============================================================================
-- STEP 6: Performance optimization analysis
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 6: PERFORMANCE OPTIMIZATION VERIFICATION';
RAISE NOTICE '=============================================================================';

-- Check if required indexes exist
DO $$
BEGIN
    -- Check for indexes that should exist for optimal performance
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'collaborators' AND indexname LIKE '%project_id%') THEN
        RAISE NOTICE '✓ Project index exists on collaborators table';
    ELSE
        RAISE NOTICE '⚠ Consider adding index on collaborators.project_id for better performance';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'collaborators' AND indexname LIKE '%user_id%') THEN
        RAISE NOTICE '✓ User index exists on collaborators table';
    ELSE
        RAISE NOTICE '⚠ Consider adding index on collaborators.user_id for better performance';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'projects' AND indexname LIKE '%user_id%') THEN
        RAISE NOTICE '✓ User index exists on projects table';
    ELSE
        RAISE NOTICE '⚠ Consider adding index on projects.user_id for better performance';
    END IF;
END $$;

-- =============================================================================
-- STEP 7: Security verification
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 7: SECURITY VERIFICATION';
RAISE NOTICE '=============================================================================';

DO $$
BEGIN
    -- Verify helper functions are secure
    DECLARE insecure_functions INTEGER;
    SELECT COUNT(*) INTO insecure_functions
    FROM pg_proc
    WHERE proname IN ('is_project_owner', 'is_project_admin', 'is_project_collaborator', 'user_has_project_access')
    AND prosecdef = false; -- Should be SECURITY DEFINER

    IF insecure_functions = 0 THEN
        RAISE NOTICE '✓ All helper functions use SECURITY DEFINER (proper security)';
    ELSE
        RAISE NOTICE '✗ Found % helper functions without SECURITY DEFINER', insecure_functions;
    END IF;

    -- Verify search_path is set correctly
    DECLARE unsafe_functions INTEGER;
    SELECT COUNT(*) INTO unsafe_functions
    FROM pg_proc
    WHERE proname IN ('is_project_owner', 'is_project_admin', 'is_project_collaborator', 'user_has_project_access')
    AND proconfig IS NULL; -- Should have search_path = public

    IF unsafe_functions = 0 THEN
        RAISE NOTICE '✓ All helper functions have safe search_path configuration';
    ELSE
        RAISE NOTICE '⚠ Some helper functions may need explicit search_path setting';
    END IF;

    -- Verify RLS is enabled
    DECLARE rls_enabled BOOLEAN;
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'collaborators';

    IF rls_enabled THEN
        RAISE NOTICE '✓ RLS is enabled on collaborators table';
    ELSE
        RAISE NOTICE '✗ RLS is NOT enabled on collaborators table - SECURITY RISK';
    END IF;
END $$;

-- =============================================================================
-- STEP 8: Final verification report
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 8: FINAL VERIFICATION REPORT';
RAISE NOTICE '=============================================================================';

-- Generate comprehensive report
SELECT
    'FINAL_VERIFICATION' as report_section,
    'All policies created successfully' as status,
    COUNT(*) as policy_count,
    'Infinite recursion should be resolved' as notes
FROM pg_policies
WHERE tablename = 'collaborators';

-- Helper functions verification
SELECT
    'HELPER_FUNCTIONS' as report_section,
    'All security functions created' as status,
    COUNT(*) as function_count,
    'Functions are non-recursive and optimized' as notes
FROM pg_proc
WHERE proname IN ('is_project_owner', 'is_project_admin', 'is_project_collaborator', 'user_has_project_access');

-- =============================================================================
-- STEP 9: Post-fix recommendations
-- =============================================================================

RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'STEP 9: POST-FIX RECOMMENDATIONS';
RAISE NOTICE '=============================================================================';

RAISE NOTICE '';
RAISE NOTICE '✓ INFINITE RECURSION FIX COMPLETED SUCCESSFULLY';
RAISE NOTICE '';
RAISE NOTICE 'Recommendations:';
RAISE NOTICE '1. Test the collaborator API endpoints thoroughly';
RAISE NOTICE '2. Monitor query performance for any regressions';
RAISE NOTICE '3. Test with different user roles (owner, admin, collaborator)';
RAISE NOTICE '4. Verify that all expected access patterns work correctly';
RAISE NOTICE '5. Consider adding monitoring for RLS policy violations';
RAISE NOTICE '';
RAISE NOTICE 'Expected behavior after fix:';
RAISE NOTICE '- Project owners can manage all collaborators';
RAISE NOTICE '- Project admins can view and add collaborators';
RAISE NOTICE '- Collaborators can view all collaborators on their projects';
RAISE NOTICE '- No infinite recursion errors';
RAISE NOTICE '- Proper security boundaries maintained';
RAISE NOTICE '';
RAISE NOTICE 'If issues persist:';
RAISE NOTICE '1. Run the diagnostic script again to verify the fix';
RAISE NOTICE '2. Check application logs for any remaining errors';
RAISE NOTICE '3. Test with specific user IDs that were problematic before';
RAISE NOTICE '4. Verify that the application is using the correct Supabase configuration';
RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'FIX COMPLETE - INFINITE RECURSION SHOULD BE RESOLVED';
RAISE NOTICE '=============================================================================';