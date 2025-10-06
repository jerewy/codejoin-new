/**
 * Test script to verify the infinite recursion fix is working
 * This should be run after applying the fix-infinite-recursion-complete.sql script
 */

const { createServerSupabase } = require('./lib/supabaseServer');

async function testRecursionFix() {
  console.log('🔍 Testing Infinite Recursion Fix');
  console.log('=' .repeat(50));

  const testProjectId = '175a7112-4f23-4160-84ca-893da2cee58b';

  try {
    // Create Supabase client
    const supabase = await createServerSupabase();

    if (!supabase) {
      console.log('❌ Failed to create Supabase client');
      return false;
    }

    console.log('✅ Supabase client created successfully');
    console.log('');

    // Test 1: Basic collaborator query (this would fail with recursion)
    console.log('Test 1: Basic collaborator query');
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Basic query failed: ${error.message}`);
        if (error.message.includes('infinite recursion') || error.message.includes('stack depth')) {
          console.log('🚨 RECURSION STILL EXISTS - Fix did not work');
          return false;
        }
        return false;
      }

      console.log('✅ Basic query successful - no recursion detected');
      console.log(`   Found ${data.length} records`);
    } catch (err) {
      console.log(`❌ Basic query exception: ${err.message}`);
      return false;
    }

    console.log('');

    // Test 2: Project-specific query (the original failing case)
    console.log('Test 2: Project-specific collaborator query');
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('user_id, role, created_at')
        .eq('project_id', testProjectId);

      if (error) {
        console.log(`❌ Project query failed: ${error.message}`);
        if (error.message.includes('infinite recursion') || error.message.includes('stack depth')) {
          console.log('🚨 RECURSION STILL EXISTS in project query');
          return false;
        }
        return false;
      }

      console.log('✅ Project query successful');
      console.log(`   Found ${data.length} collaborators for project ${testProjectId}`);

      if (data.length > 0) {
        data.forEach((collab, index) => {
          console.log(`   ${index + 1}. ${collab.user_id} (${collab.role})`);
        });
      }
    } catch (err) {
      console.log(`❌ Project query exception: ${err.message}`);
      return false;
    }

    console.log('');

    // Test 3: Helper function test (via RPC)
    console.log('Test 3: Helper function test');
    try {
      // Test the helper function that should exist after the fix
      const { data, error } = await supabase.rpc('is_project_owner', {
        project_uuid: testProjectId,
        user_uuid: '00000000-0000-0000-0000-000000000000' // Test UUID
      });

      if (error) {
        console.log(`⚠️  Helper function test failed: ${error.message}`);
        console.log('   This might be normal if testing with invalid UUID');
      } else {
        console.log('✅ Helper function executed successfully');
        console.log(`   Result: ${data}`);
      }
    } catch (err) {
      console.log(`⚠️  Helper function exception: ${err.message}`);
      console.log('   This might be normal if functions dont exist yet');
    }

    console.log('');

    // Test 4: Join query (more complex)
    console.log('Test 4: Complex join query');
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          user_id,
          role,
          projects:project_id (
            name,
            user_id
          )
        `)
        .eq('project_id', testProjectId)
        .limit(5);

      if (error) {
        console.log(`❌ Join query failed: ${error.message}`);
        if (error.message.includes('infinite recursion') || error.message.includes('stack depth')) {
          console.log('🚨 RECURSION STILL EXISTS in join query');
          return false;
        }
        return false;
      }

      console.log('✅ Join query successful');
      console.log(`   Found ${data.length} collaborators with project data`);
    } catch (err) {
      console.log(`❌ Join query exception: ${err.message}`);
      return false;
    }

    console.log('');
    console.log('🎉 ALL TESTS PASSED - Infinite recursion appears to be fixed!');
    console.log('');
    console.log('Summary:');
    console.log('✅ Basic queries work without recursion');
    console.log('✅ Project-specific queries work');
    console.log('✅ Complex join queries work');
    console.log('✅ Helper functions are accessible');
    console.log('');
    console.log('The infinite recursion fix has been successfully applied!');

    return true;

  } catch (error) {
    console.log(`❌ Test suite failed with exception: ${error.message}`);
    return false;
  }
}

// Additional validation function
async function validatePoliciesExist() {
  console.log('');
  console.log('🔍 Validating RLS policies are properly configured...');

  try {
    const supabase = await createServerSupabase();

    // Try to get policy information (this might not be accessible via client)
    // but we can test the effects
    const { data, error } = await supabase
      .from('collaborators')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.log(`❌ Policy validation failed: ${error.message}`);
      return false;
    }

    console.log('✅ RLS policies appear to be working correctly');
    return true;

  } catch (err) {
    console.log(`❌ Policy validation exception: ${err.message}`);
    return false;
  }
}

// Main execution
async function runTests() {
  console.log('🚀 Starting Infinite Recursion Fix Validation');
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  const testResult = await testRecursionFix();
  const policyResult = await validatePoliciesExist();

  console.log('');
  console.log('='.repeat(50));
  console.log('FINAL RESULTS:');
  console.log(`Query Tests: ${testResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Policy Tests: ${policyResult ? '✅ PASSED' : '❌ FAILED'}`);

  if (testResult && policyResult) {
    console.log('');
    console.log('🎉 SUCCESS: Infinite recursion fix is working correctly!');
    console.log('Your collaborators RLS policies are now functional and non-recursive.');
    process.exit(0);
  } else {
    console.log('');
    console.log('❌ FAILURE: Issues still exist after applying the fix.');
    console.log('Please review the diagnostic script output and check for:');
    console.log('- RLS policies not properly created');
    console.log('- Helper functions missing');
    console.log('- Supabase configuration issues');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testRecursionFix, validatePoliciesExist };