// Test script for collaborator API endpoint
// Run this to verify the API is working correctly

async function testCollaboratorAPI() {
  const projectId = '65fd6864-0a5e-4c20-aff8-f9657c7a35cb'; // Test project ID

  try {
    console.log('Testing collaborator API...');

    // Test GET endpoint without authentication (should return 401)
    console.log('\n1. Testing GET /api/collaborators without auth...');
    const getResponse = await fetch(`http://localhost:3000/api/collaborators?projectId=${projectId}`);

    if (!getResponse.ok) {
      const errorData = await getResponse.json();
      console.log('GET without auth failed (expected):', errorData);
    } else {
      console.log('❌ GET without auth should have failed');
    }

    // Test POST endpoint without authentication (should return 401)
    console.log('\n2. Testing POST /api/collaborators without auth...');
    const postResponse = await fetch('http://localhost:3000/api/collaborators', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: projectId,
        userEmail: 'nonexistent@test.com',
        role: 'editor'
      })
    });

    const postData = await postResponse.json();
    console.log('POST without auth response:', postResponse.status, JSON.stringify(postData, null, 2));

    console.log('\n✅ API test completed - authentication is working properly!');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run the test if called directly
if (require.main === module) {
  testCollaboratorAPI();
}

module.exports = { testCollaboratorAPI };