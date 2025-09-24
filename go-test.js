const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

async function testGoCompilation() {
  console.log('🔍 Testing Go compilation process...\n');

  try {
    const response = await axios.post(`${SERVER_URL}/api/execute`, {
      language: 'go',
      code: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello Go!")\n}'
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

testGoCompilation();