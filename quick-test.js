const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

async function quickTest() {
  console.log('🔧 Quick test of JavaScript and SQL...');

  // Test JavaScript
  const jsResponse = await axios.post(`${SERVER_URL}/api/execute`, {
    language: 'javascript',
    code: 'console.log("Hello JS!");'
  }, {
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }
  });

  console.log(`JavaScript - Success: ${jsResponse.data.success}, Output: "${jsResponse.data.output}"`);

  // Test SQL
  const sqlResponse = await axios.post(`${SERVER_URL}/api/execute`, {
    language: 'sql',
    code: 'SELECT "Hello SQL!";'
  }, {
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }
  });

  console.log(`SQL - Success: ${sqlResponse.data.success}, Output: "${sqlResponse.data.output}"`);
}

quickTest().catch(console.error);