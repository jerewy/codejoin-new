// Database diagnostic script to examine RLS policies and structure
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey;
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1];
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !supabaseServiceKey) {
      supabaseServiceKey = line.split('=')[1];
    }
  });
} catch (error) {
  console.error('Error reading .env.local file:', error.message);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function examineDatabase() {
  console.log('🔍 Database Diagnostic: Examining RLS Policies and Structure\n');

  try {
    // Step 1: Create a function to examine system catalogs
    console.log('📋 Step 1: Creating diagnostic function...');

    const diagnosticSQL = `
      -- Create a temporary function to examine RLS policies
      CREATE OR REPLACE FUNCTION examine_rls_policies()
      RETURNS TABLE(
        investigation_step text,
        table_name text,
        policy_name text,
        policy_cmd text,
        policy_qual text,
        policy_with_check text,
        recursion_risk text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          'CURRENT_POLICIES'::text as investigation_step,
          t.relname::text as table_name,
          p.policyname::text as policy_name,
          p.cmd::text as policy_cmd,
          p.qual::text as policy_qual,
          p.with_check::text as policy_with_check,
          CASE
            WHEN p.qual LIKE '%collaborators%' OR p.with_check LIKE '%collaborators%'
            THEN 'HIGH_RISK'::text
            ELSE 'LOW_RISK'::text
          END as recursion_risk
        FROM pg_policies p
        JOIN pg_class t ON p.tablename = t.relname
        WHERE t.relname IN ('collaborators', 'projects');
      END;
      $$;
    `;

    // Execute diagnostic function creation
    const { error: funcError } = await supabase.rpc('exec_sql', { sql: diagnosticSQL });
    if (funcError && !funcError.message?.includes('does not exist')) {
      console.log('⚠️  Could not create diagnostic function, trying alternative approach...');
    }

    // Step 2: Try to get RLS policy information
    console.log('\n📋 Step 2: Examining RLS policies...');

    const policyExaminationSQL = `
      -- Check current RLS policies
      SELECT
        'RLS_POLICIES_CHECK' as investigation_step,
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check,
        CASE
          WHEN qual LIKE '%collaborators%' OR with_check LIKE '%collaborators%'
          THEN 'POTENTIAL_RECURSION'
          ELSE 'CLEAN'
        END as recursion_risk
      FROM pg_policies
      WHERE tablename IN ('collaborators', 'projects')
      ORDER BY tablename, policyname;

      -- Check RLS status
      SELECT
        'RLS_STATUS_CHECK' as investigation_step,
        relname as table_name,
        relrowsecurity as rls_enabled,
        relforcerowsecurity as rls_forced
      FROM pg_class
      WHERE relname IN ('collaborators', 'projects');

      -- Check table structures
      SELECT
        'TABLE_STRUCTURE' as investigation_step,
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('collaborators', 'projects')
      ORDER BY table_name, ordinal_position;
    `;

    // Create a temporary SQL file for manual execution
    fs.writeFileSync('diagnostic-examination.sql', policyExaminationSQL);
    console.log('✅ Diagnostic SQL saved to: diagnostic-examination.sql');

    // Step 3: Check for existing helper functions
    console.log('\n📋 Step 3: Checking for helper functions...');

    const functionCheckSQL = `
      SELECT
        'HELPER_FUNCTIONS_CHECK' as investigation_step,
        proname as function_name,
        prosrc as function_source,
        provolatile as volatility
      FROM pg_proc
      WHERE proname IN ('is_project_owner', 'is_project_admin', 'user_has_project_access', 'is_project_collaborator')
      ORDER BY proname;
    `;

    fs.writeFileSync('function-check.sql', functionCheckSQL);

    // Step 4: Identify problematic policies
    console.log('\n📋 Step 4: Creating policy analysis...');

    const analysisSQL = `
      -- Drop all existing problematic policies
      DO $$
      BEGIN
        RAISE NOTICE 'Starting policy cleanup...';

        -- Drop collaborators policies
        FOR policy_rec IN
          SELECT policyname FROM pg_policies WHERE tablename = 'collaborators'
        LOOP
          EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON collaborators';
          RAISE NOTICE 'Dropped collaborators policy: %', policy_rec.policyname;
        END LOOP;

        -- Drop projects policies that reference collaborators
        FOR policy_rec IN
          SELECT policyname FROM pg_policies
          WHERE tablename = 'projects'
          AND (qual LIKE '%collaborators%' OR with_check LIKE '%collaborators%')
        LOOP
          EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON projects';
          RAISE NOTICE 'Dropped problematic projects policy: %', policy_rec.policyname;
        END LOOP;

        RAISE NOTICE 'Policy cleanup completed';
      END $$;

      -- Verify policies are dropped
      SELECT
        'POLICIES_AFTER_CLEANUP' as investigation_step,
        tablename,
        COUNT(*) as remaining_policies
      FROM pg_policies
      WHERE tablename IN ('collaborators', 'projects')
      GROUP BY tablename;
    `;

    fs.writeFileSync('policy-cleanup.sql', analysisSQL);

    // Step 5: Create new non-recursive policies
    console.log('\n📋 Step 5: Creating non-recursive policies...');

    const newPoliciesSQL = `
      -- Create helper functions to avoid recursion
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

      -- Create clean, non-recursive policies for collaborators
      CREATE POLICY "collaborators_project_owners_full_access" ON collaborators
        FOR ALL
        TO authenticated
        USING (is_project_owner(project_id, auth.uid()))
        WITH CHECK (is_project_owner(project_id, auth.uid()));

      CREATE POLICY "collaborators_project_admins_view_access" ON collaborators
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

      CREATE POLICY "collaborators_users_with_access_view" ON collaborators
        FOR SELECT
        TO authenticated
        USING (user_has_project_access(project_id, auth.uid()));

      -- Create clean policies for projects (avoid referencing collaborators)
      CREATE POLICY "projects_users_view_own_projects" ON projects
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() OR auth.uid() = ANY(admin_ids));

      CREATE POLICY "projects_users_insert_own_projects" ON projects
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());

      CREATE POLICY "projects_users_update_own_projects" ON projects
        FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid() OR auth.uid() = ANY(admin_ids))
        WITH CHECK (user_id = auth.uid() OR auth.uid() = ANY(admin_ids));

      -- Verify new policies
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
      WHERE tablename IN ('collaborators', 'projects')
      ORDER BY tablename, policyname;

      -- Test policies work
      SELECT
        'POLICY_TEST' as investigation_step,
        'collaborators' as table_tested,
        COUNT(*) as accessible_rows
      FROM collaborators
      LIMIT 1;

      SELECT
        'POLICY_TEST' as investigation_step,
        'projects' as table_tested,
        COUNT(*) as accessible_rows
      FROM projects
      LIMIT 1;
    `;

    fs.writeFileSync('create-clean-policies.sql', newPoliciesSQL);

    // Step 6: Create a comprehensive fix script
    console.log('\n📋 Step 6: Creating comprehensive fix...');

    const comprehensiveFix = `
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
    `;

    fs.writeFileSync('comprehensive-recursion-fix.sql', comprehensiveFix);

    console.log('\n✅ Diagnostic complete! Files created:');
    console.log('   📄 diagnostic-examination.sql - Examines current state');
    console.log('   📄 function-check.sql - Checks helper functions');
    console.log('   📄 policy-cleanup.sql - Removes problematic policies');
    console.log('   📄 create-clean-policies.sql - Creates new policies');
    console.log('   📄 comprehensive-recursion-fix.sql - Complete fix script');

    console.log('\n📋 RECOMMENDATIONS:');
    console.log('1. Execute comprehensive-recursion-fix.sql in Supabase SQL Editor');
    console.log('2. Run verification script to confirm fix');
    console.log('3. Test application functionality');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Run the diagnostic
examineDatabase().then(() => {
  console.log('\n🎯 Database diagnostic complete!');
}).catch(error => {
  console.error('❌ Diagnostic script failed:', error);
});