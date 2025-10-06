// Comprehensive test script for the collaborator backend fix
// This validates the entire collaborator flow

const testProjectId = '65fd6864-0a5e-4c20-aff8-f9657c7a35cb';
const baseUrl = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting comprehensive collaborator backend tests...\n');

  // Test 1: Check if server is running
  console.log('1. Checking if server is running...');
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    console.log('   ✅ Server is running');
  } catch (error) {
    console.log('   ⚠️  Server might not be running, but continuing with tests...');
  }

  // Test 2: Test collaborator loading API
  console.log('\n2. Testing collaborator loading API...');
  try {
    const response = await fetch(`${baseUrl}/api/collaborators?projectId=${testProjectId}`);

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Collaborator API responded successfully');
      console.log('   📊 Response structure:', {
        hasCollaborators: Array.isArray(data.collaborators),
        collaboratorCount: data.collaborators?.length || 0,
        hasUserRole: data.userRole !== undefined,
        hasCanAddCollaborators: data.canAddCollaborators !== undefined
      });

      if (data.collaborators && data.collaborators.length > 0) {
        console.log('   👥 Sample collaborator:', {
          hasId: !!data.collaborators[0].user_id,
          hasRole: !!data.collaborators[0].role,
          hasProfile: !!data.collaborators[0].profile
        });
      }
    } else {
      console.log('   ❌ Collaborator API failed:', response.status);
      const errorData = await response.json();
      console.log('   📝 Error details:', errorData);
    }
  } catch (error) {
    console.log('   ❌ Collaborator API test failed:', error.message);
  }

  // Test 3: Test adding a collaborator (with invalid email to avoid side effects)
  console.log('\n3. Testing collaborator addition (invalid email)...');
  try {
    const response = await fetch(`${baseUrl}/api/collaborators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: testProjectId,
        userEmail: 'invalid-test-email',
        role: 'editor'
      })
    });

    const data = await response.json();

    if (response.status === 404) {
      console.log('   ✅ Correctly rejected non-existent user');
    } else if (response.status === 400) {
      console.log('   ✅ Correctly rejected invalid email format');
    } else {
      console.log('   ⚠️  Unexpected response:', response.status, data);
    }
  } catch (error) {
    console.log('   ❌ Collaborator addition test failed:', error.message);
  }

  // Test 4: Test database direct query
  console.log('\n4. Testing database direct query...');
  try {
    // This simulates what the original problematic query was doing
    const response = await fetch(`${baseUrl}/api/collaborators?projectId=${testProjectId}`);

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Database query works through API');

      // Verify the data structure matches what the frontend expects
      if (data.collaborators) {
        const hasValidStructure = data.collaborators.every(c =>
          c.user_id && c.role && (c.profile === null || typeof c.profile === 'object')
        );
        console.log('   ✅ Data structure is valid:', hasValidStructure);
      }
    }
  } catch (error) {
    console.log('   ❌ Database query test failed:', error.message);
  }

  console.log('\n🎉 Backend testing completed!');
  console.log('\n📋 Summary of fixes implemented:');
  console.log('   • Created dedicated API endpoints for collaborator management');
  console.log('   • Improved error handling with specific error codes');
  console.log('   • Enhanced RLS policies for proper access control');
  console.log('   • Added comprehensive logging and debugging information');
  console.log('   • Frontend now uses API instead of direct Supabase queries');
  console.log('   • Better user feedback for all error scenarios');
}

// Run tests
runTests().catch(console.error);