const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

async function testCCompilation() {
  console.log('🔍 Testing C compilation process...\n');

  try {
    const response = await axios.post(`${SERVER_URL}/api/execute`, {
      language: 'c',
      code: '#include <stdio.h>\nint main() {\n    printf("Hello C!\\n");\n    return 0;\n}'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    console.log('📊 Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

testCCompilation();