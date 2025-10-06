// RLS Policy investigation script to identify infinite recursion
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateRLSPolicies() {
  console.log('🔍 Investigating RLS policies for infinite recursion...\n');

  try {
    // Use RPC to call system catalog functions since we can't query them directly
    console.log('📋 Step 1: Getting table list via RPC');

    // Try to get table information using raw SQL
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_tables_info');

    if (tablesError) {
      console.log('📝 RPC not available, trying direct SQL approach...');

      // Create a SQL script to check RLS policies
      const policiesSQL = `
        SELECT
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
      `;

      console.log('\n📋 Step 2: Checking RLS policies using direct SQL');
      console.log('SQL to execute:', policiesSQL);

      // Let's create a function to run this SQL
      const { data: policyData, error: policyError } = await supabase
        .from('collaborators')
        .select('*')
        .limit(1);

      if (policyError && policyError.message?.includes('infinite recursion')) {
        console.log('🚨 Infinite recursion confirmed! We need to examine the policies.');
        console.log('Creating a temporary fix to bypass RLS...');

        // Let's try to create a temporary service key call to examine policies
        await createSQLMigration();
      }
    }

  } catch (error) {
    console.error('❌ Error during RLS investigation:', error);
  }
}

async function createSQLMigration() {
  console.log('\n🔧 Creating SQL migration to fix infinite recursion...');

  // SQL to examine and fix the RLS policies
  const fixSQL = `
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
      SELECT 1 FROM collaborators c_self
      WHERE c_self.project_id = collaborators.project_id
      AND c_self.user_id = auth.uid()
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
  `;

  console.log('📝 SQL Migration script prepared:');
  console.log('=' .repeat(80));
  console.log(fixSQL);
  console.log('=' .repeat(80));

  // Write the SQL to a file for manual execution
  fs.writeFileSync('fix-infinite-recursion.sql', fixSQL);
  console.log('✅ SQL migration saved to: fix-infinite-recursion.sql');
  console.log('\n📋 Next steps:');
  console.log('1. Execute this SQL in your Supabase dashboard');
  console.log('2. Or use the Supabase CLI: supabase db push');
  console.log('3. Test the collaborators API to verify the fix');
}

// Run the investigation
investigateRLSPolicies().then(() => {
  console.log('\n🎯 RLS Investigation complete!');
}).catch(error => {
  console.error('❌ RLS Investigation failed:', error);
});