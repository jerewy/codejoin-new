// Minimal test to check if conversation creation API works
// This tests the core functionality without complex dependencies

const http = require('http');

function testAPIEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      const bodyData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runMinimalTests() {
  console.log('=== Minimal API Tests ===\n');

  try {
    // Test 1: Check if the API route exists
    console.log('1. Testing if /api/ai/conversations endpoint exists...');
    try {
      const response = await testAPIEndpoint('/api/ai/conversations', 'GET');
      console.log('Status:', response.status);
      console.log('Response:', response.body.substring(0, 200));
    } catch (error) {
      console.log('❌ Endpoint not reachable:', error.message);
      console.log('Make sure the development server is running on localhost:3000');
      return;
    }

    // Test 2: Test conversation creation without authentication
    console.log('\n2. Testing conversation creation (should fail with 401)...');
    try {
      const response = await testAPIEndpoint('/api/ai/conversations', 'POST', {
        projectId: 'test-project-id',
        title: 'Test Conversation'
      });
      console.log('Status:', response.status);
      console.log('Response:', response.body);

      if (response.status === 401) {
        console.log('✅ Correctly returned 401 (unauthorized) - this is expected');
      } else {
        console.log('❌ Unexpected response - expected 401');
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }

    // Test 3: Test messages endpoint
    console.log('\n3. Testing messages endpoint exists...');
    try {
      const response = await testAPIEndpoint('/api/ai/messages', 'GET');
      console.log('Status:', response.status);
      console.log('Response:', response.body.substring(0, 200));
    } catch (error) {
      console.log('❌ Messages endpoint not reachable:', error.message);
    }

    // Test 4: Test chat endpoint
    console.log('\n4. Testing chat endpoint exists...');
    try {
      const response = await testAPIEndpoint('/api/ai/chat', 'POST', {
        message: 'Hello',
        context: 'test context'
      });
      console.log('Status:', response.status);
      console.log('Response:', response.body.substring(0, 200));
    } catch (error) {
      console.log('❌ Chat endpoint not reachable:', error.message);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }

  console.log('\n=== Tests Complete ===');
}

// Run the tests
runMinimalTests().catch(console.error);