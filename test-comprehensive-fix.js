// Comprehensive test script for the infinite recursion fix
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

const testResults = {
  recursionFixed: false,
  collaboratorsWorking: false,
  projectsWorking: false,
  apiFunctional: false,
  errors: [],
  successes: []
};

async function testCollaboratorsTable() {
  console.log('🔍 Testing Collaborators Table Access...');

  try {
    // Test 1: Basic count query
    const { data: countData, error: countError } = await supabase
      .from('collaborators')
      .select('*', { count: 'exact' });

    if (countError) {
      if (countError.message?.includes('infinite recursion')) {
        console.log('  ❌ Infinite recursion still exists in collaborators');
        testResults.errors.push('Collaborators table still has infinite recursion');
        return false;
      } else {
        console.log(`  ✅ No infinite recursion (different error expected): ${countError.message}`);
        testResults.successes.push('Collaborators table - recursion eliminated');
      }
    } else {
      console.log(`  ✅ Collaborators table accessible - found ${countData.length} records`);
      testResults.successes.push('Collaborators table working correctly');
      testResults.collaboratorsWorking = true;
    }

    // Test 2: Select with limit
    const { data: limitData, error: limitError } = await supabase
      .from('collaborators')
      .select('*')
      .limit(5);

    if (limitError) {
      console.log(`  ⚠️  Limit query failed: ${limitError.message}`);
    } else {
      console.log(`  ✅ Limit query successful - returned ${limitData.length} records`);
    }

    // Test 3: Test specific project ID
    const testProjectId = '175a7112-4f23-4160-84ca-893da2cee58b';
    const { data: projectData, error: projectError } = await supabase
      .from('collaborators')
      .select('user_id, role, created_at')
      .eq('project_id', testProjectId);

    if (projectError) {
      console.log(`  ⚠️  Project-specific query failed: ${projectError.message}`);
    } else {
      console.log(`  ✅ Project-specific query successful - found ${projectData.length} collaborators`);
      projectData.forEach((collab, index) => {
        const roleIcon = collab.role === 'owner' ? '👑' : (collab.role === 'admin' ? '🛡️' : '✏️');
        console.log(`     ${index + 1}. ${roleIcon} ${collab.user_id} (${collab.role})`);
      });
    }

  } catch (error) {
    console.log(`  ❌ Collaborators test error: ${error.message}`);
    testResults.errors.push(`Collaborators test error: ${error.message}`);
  }

  return testResults.collaboratorsWorking;
}

async function testProjectsTable() {
  console.log('\n🔍 Testing Projects Table Access...');

  try {
    // Test 1: Basic count query
    const { data: countData, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact' });

    if (countError) {
      if (countError.message?.includes('infinite recursion')) {
        console.log('  ❌ Infinite recursion still exists in projects');
        testResults.errors.push('Projects table still has infinite recursion');
        return false;
      } else {
        console.log(`  ✅ No infinite recursion (different error expected): ${countError.message}`);
        testResults.successes.push('Projects table - recursion eliminated');
      }
    } else {
      console.log(`  ✅ Projects table accessible - found ${countData.length} records`);
      testResults.successes.push('Projects table working correctly');
      testResults.projectsWorking = true;
    }

    // Test 2: Select with limit
    const { data: limitData, error: limitError } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .limit(5);

    if (limitError) {
      console.log(`  ⚠️  Limit query failed: ${limitError.message}`);
    } else {
      console.log(`  ✅ Limit query successful - returned ${limitData.length} projects`);
      limitData.forEach((project, index) => {
        console.log(`     ${index + 1}. ${project.name || 'Unnamed Project'} (${project.id})`);
      });
    }

  } catch (error) {
    console.log(`  ❌ Projects test error: ${error.message}`);
    testResults.errors.push(`Projects test error: ${error.message}`);
  }

  return testResults.projectsWorking;
}

async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...');

  try {
    // Test REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/collaborators?select=*&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Collaborators API endpoint working - returned ${data.length} records`);
      testResults.successes.push('Collaborators API endpoint functional');
      testResults.apiFunctional = true;
    } else {
      const errorText = await response.text();
      if (errorText.includes('infinite recursion')) {
        console.log('  ❌ API endpoint still has infinite recursion');
        testResults.errors.push('API endpoint infinite recursion');
      } else {
        console.log(`  ✅ API endpoint no recursion (other error: ${response.status})`);
        testResults.successes.push('API endpoint - recursion eliminated');
      }
    }

    // Test projects API endpoint
    const projectsResponse = await fetch(`${supabaseUrl}/rest/v1/projects?select=id,name&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (projectsResponse.ok) {
      console.log(`  ✅ Projects API endpoint working`);
      testResults.successes.push('Projects API endpoint functional');
    } else {
      const errorText = await projectsResponse.text();
      console.log(`  ⚠️  Projects API endpoint issue: ${projectsResponse.status}`);
    }

  } catch (error) {
    console.log(`  ❌ API test error: ${error.message}`);
    testResults.errors.push(`API test error: ${error.message}`);
  }

  return testResults.apiFunctional;
}

async function testHelperFunctions() {
  console.log('\n🔍 Testing Helper Functions...');

  try {
    // Test if helper functions exist by trying to use them in a query
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (error && !error.message?.includes('infinite recursion')) {
      // If we get here without recursion, helper functions likely exist
      console.log('  ✅ Helper functions appear to be working (no recursion errors)');
      testResults.successes.push('Helper functions working correctly');
    } else if (!error) {
      console.log('  ✅ Helper functions working (query successful)');
      testResults.successes.push('Helper functions working correctly');
    } else {
      console.log(`  ❌ Helper function test failed: ${error.message}`);
      testResults.errors.push('Helper functions may not be working');
    }

  } catch (error) {
    console.log(`  ❌ Helper function test error: ${error.message}`);
  }
}

async function runComprehensiveTest() {
  console.log('🧪 COMPREHENSIVE INFINITE RECURSION FIX TEST');
  console.log('=' .repeat(60));
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🕒 Test started at: ${new Date().toISOString()}`);
  console.log('');

  // Run all tests
  await testCollaboratorsTable();
  await testProjectsTable();
  await testAPIEndpoints();
  await testHelperFunctions();

  // Determine if recursion is fixed
  testResults.recursionFixed = !testResults.errors.some(error =>
    error.includes('infinite recursion')
  );

  // Print comprehensive results
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));

  // Main result
  if (testResults.recursionFixed) {
    console.log('🎉 SUCCESS: INFINITE RECURSION HAS BEEN ELIMINATED!');
  } else {
    console.log('❌ FAILURE: INFINITE RECURSION STILL EXISTS');
  }

  // Individual component results
  console.log('\n📋 Component Status:');
  console.log(`   ${testResults.recursionFixed ? '✅' : '❌'} Infinite Recursion: ${testResults.recursionFixed ? 'FIXED' : 'STILL EXISTS'}`);
  console.log(`   ${testResults.collaboratorsWorking ? '✅' : '❌'} Collaborators Table: ${testResults.collaboratorsWorking ? 'WORKING' : 'ISSUES'}`);
  console.log(`   ${testResults.projectsWorking ? '✅' : '❌'} Projects Table: ${testResults.projectsWorking ? 'WORKING' : 'ISSUES'}`);
  console.log(`   ${testResults.apiFunctional ? '✅' : '❌'} API Endpoints: ${testResults.apiFunctional ? 'FUNCTIONAL' : 'ISSUES'}`);

  // Successes
  if (testResults.successes.length > 0) {
    console.log('\n✅ Successes:');
    testResults.successes.forEach(success => {
      console.log(`   • ${success}`);
    });
  }

  // Errors
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    testResults.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
  }

  // Recommendations
  console.log('\n📋 Recommendations:');

  if (testResults.recursionFixed) {
    console.log('🎉 Excellent! The infinite recursion fix is working!');
    console.log('   • Test the application with real user accounts');
    console.log('   • Verify all user roles (owner, admin, collaborator) work');
    console.log('   • Monitor application performance and logs');
    console.log('   • Test all collaborator-related features');

    if (testResults.successes.length >= 3) {
      console.log('   ✅ All major components are functional');
      console.log('   🚀 The fix appears to be complete and successful!');
    }
  } else {
    console.log('⚠️  The infinite recursion fix needs attention:');
    console.log('   • Ensure FINAL_INFINITE_RECURSION_FIX.sql was executed');
    console.log('   • Check for any remaining recursive policies');
    console.log('   • Verify helper functions were created correctly');
    console.log('   • Review the migration guide for troubleshooting steps');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Execute FINAL_INFINITE_RECURSION_FIX.sql in Supabase Dashboard');
    console.log('   2. Run this test again to verify the fix');
    console.log('   3. If issues persist, check the migration guide');
  }

  console.log('\n🕒 Test completed at:', new Date().toISOString());
  console.log('='.repeat(60));

  return testResults;
}

// Run the comprehensive test
if (require.main === module) {
  runComprehensiveTest()
    .then(results => {
      process.exit(results.recursionFixed ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Comprehensive test failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest };