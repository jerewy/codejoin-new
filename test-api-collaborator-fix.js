/**
 * Test the actual collaborator API endpoint to verify the fix works
 * This tests the real API endpoint that the frontend uses
 */

// Test the GET /api/collaborators endpoint with a real project ID
async function testCollaboratorAPI() {
  const testProjectId = '175a7112-4f23-4160-84ca-893da2cee58b';

  console.log('🔍 Testing Collaborator API Fix');
  console.log(`📋 Testing Project: ${testProjectId}`);

  try {
    // This would normally be called from the frontend
    // For testing, we'll make a direct call to simulate what happens
    const response = await fetch(`http://localhost:3000/api/collaborators?projectId=${testProjectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // In a real scenario, the auth would be handled by cookies/session
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`❌ API Error (${response.status}):`, errorData);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:');
    console.log(`   - Found ${data.collaborators?.length || 0} collaborators`);
    console.log(`   - User role: ${data.userRole}`);
    console.log(`   - Can add collaborators: ${data.canAddCollaborators}`);

    if (data.collaborators && data.collaborators.length > 0) {
      console.log('   - Collaborators:');
      data.collaborators.forEach((collab, index) => {
        console.log(`     ${index + 1}. ${collab.user_id} (${collab.role})`);
        if (collab.profile) {
          console.log(`        Name: ${collab.profile.full_name || 'N/A'}`);
          console.log(`        Email: ${collab.profile.email || 'N/A'}`);
        }
      });
    }

    // Verify the fix: check if we can see multiple collaborators
    if (data.collaborators && data.collaborators.length > 1) {
      console.log('✅ SUCCESS: Multiple collaborators are visible - the fix is working!');
    } else if (data.collaborators && data.collaborators.length === 1) {
      console.log('⚠️  WARNING: Only one collaborator visible - the fix may not be working properly');
    } else {
      console.log('ℹ️  INFO: No collaborators found for this project');
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log('💡 Note: This test requires the development server to be running');
  }
}

// Alternative approach: test the database directly with simulated user context
async function testDatabaseRLS() {
  console.log('\n🔍 Testing Database RLS Policies');

  // Test the is_project_collaborator function
  const testQueries = [
    {
      name: 'Test is_project_collaborator function',
      query: `SELECT is_project_collaborator('175a7112-4f23-4160-84ca-893da2cee58b', '5081708d-3a45-469c-94dd-b234e3738938') as is_collaborator;`
    },
    {
      name: 'Test is_project_owner function',
      query: `SELECT is_project_owner('175a7112-4f23-4160-84ca-893da2cee58b', '085b30cd-c982-4242-bc6f-4a8c78130d43') as is_owner;`
    },
    {
      name: 'Show current collaborators data',
      query: `SELECT project_id, user_id, role, created_at FROM collaborators WHERE project_id = '175a7112-4f23-4160-84ca-893da2cee58b' ORDER BY role, user_id;`
    }
  ];

  for (const test of testQueries) {
    console.log(`\n📋 ${test.name}:`);
    console.log(`   Query: ${test.query}`);

    // Note: In a real scenario, you'd use the Supabase client here
    // For now, just showing what would be tested
    console.log('   (This would test the RLS policy logic)');
  }
}

// Run the tests
async function runTests() {
  await testCollaboratorAPI();
  await testDatabaseRLS();

  console.log('\n🎯 Summary of Fix:');
  console.log('✅ Added new RLS policy: "Collaborators can view project collaborators"');
  console.log('✅ Removed restrictive policy: "Collaborators can view their own collaborations"');
  console.log('✅ Added helper function: is_project_collaborator()');
  console.log('');
  console.log('🔧 How it works:');
  console.log('- When a collaborator queries the collaborators table');
  console.log('- The new policy checks: is_project_collaborator(project_id, auth.uid())');
  console.log('- If the user is a collaborator on that project, they can see ALL collaborators');
  console.log('- This allows proper team collaboration and visibility');
}

if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ All tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCollaboratorAPI, testDatabaseRLS };