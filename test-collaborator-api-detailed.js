// Detailed test script for collaborator API endpoint
// Run this to debug the authentication and API issues

async function testCollaboratorAPIDetailed() {
  const projectId = '65fd6864-0a5e-4c20-aff8-f9657c7a35cb'; // Test project ID
  const baseUrl = 'http://localhost:3000';

  console.log('=== Detailed Collaborator API Test ===\n');

  try {
    // Test 1: GET endpoint without authentication
    console.log('1. Testing GET /api/collaborators without authentication...');
    const getResponse = await fetch(`${baseUrl}/api/collaborators?projectId=${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('   Status:', getResponse.status);
    console.log('   Status Text:', getResponse.statusText);

    const getData = await getResponse.text(); // Use text() first to see raw response
    console.log('   Raw Response:', getData);

    let getJson;
    try {
      getJson = JSON.parse(getData);
      console.log('   Parsed JSON:', JSON.stringify(getJson, null, 2));
    } catch (e) {
      console.log('   ⚠️  Failed to parse JSON:', e.message);
    }

    // Test 2: POST endpoint without authentication
    console.log('\n2. Testing POST /api/collaborators without authentication...');
    const postResponse = await fetch(`${baseUrl}/api/collaborators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: projectId,
        userEmail: 'test@example.com',
        role: 'editor'
      })
    });

    console.log('   Status:', postResponse.status);
    console.log('   Status Text:', postResponse.statusText);

    const postData = await postResponse.text();
    console.log('   Raw Response:', postData);

    let postJson;
    try {
      postJson = JSON.parse(postData);
      console.log('   Parsed JSON:', JSON.stringify(postJson, null, 2));
    } catch (e) {
      console.log('   ⚠️  Failed to parse JSON:', e.message);
    }

    // Test 3: Test with invalid project ID
    console.log('\n3. Testing GET with invalid project ID...');
    const invalidGetResponse = await fetch(`${baseUrl}/api/collaborators?projectId=invalid-id`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('   Status:', invalidGetResponse.status);
    const invalidGetData = await invalidGetResponse.json();
    console.log('   Response:', JSON.stringify(invalidGetData, null, 2));

    // Test 4: Test with missing project ID
    console.log('\n4. Testing GET with missing project ID...');
    const missingGetResponse = await fetch(`${baseUrl}/api/collaborators`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('   Status:', missingGetResponse.status);
    const missingGetData = await missingGetResponse.json();
    console.log('   Response:', JSON.stringify(missingGetData, null, 2));

    // Test 5: Check if server is running by testing a simple endpoint
    console.log('\n5. Testing if server is responding...');
    try {
      const healthResponse = await fetch(`${baseUrl}/api/health`);
      console.log('   Health endpoint status:', healthResponse.status);
    } catch (e) {
      console.log('   ⚠️  Server might not be running:', e.message);
    }

    console.log('\n=== Test Summary ===');
    console.log('✅ API tests completed');

    // Analyze results
    if (getResponse.status === 401 && postResponse.status === 401) {
      console.log('✅ Authentication is working properly (both endpoints return 401)');
    } else {
      console.log('❌ Authentication might have issues');
    }

    if (getJson && getJson.error) {
      console.log('✅ Error responses are properly formatted');
    } else {
      console.log('❌ Error response format might be incorrect');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test if called directly
if (require.main === module) {
  testCollaboratorAPIDetailed();
}

module.exports = { testCollaboratorAPIDetailed };