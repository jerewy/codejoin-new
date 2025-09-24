const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

async function testTypeScriptCompilation() {
  console.log('🔍 Testing TypeScript compilation process...\n');

  try {
    const response = await axios.post(`${SERVER_URL}/api/execute`, {
      language: 'typescript',
      code: 'console.log("Hello TypeScript!");'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    console.log('📊 Response:', JSON.stringify(response.data, null, 2));

    if (response.data.error) {
      console.log('\n🔍 Analyzing compilation error...');
      const error = response.data.error;

      if (error.includes('Cannot find module')) {
        console.log('❌ Problem: Compiled JavaScript file not found');
        console.log('💡 Solution: Fix TypeScript compiler output path');
      }
    }

  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

testTypeScriptCompilation();