const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

async function testSQL(queryName, query) {
  console.log(`\n🔧 Testing SQL - ${queryName}...`);
  console.log(`📝 Query: ${query}`);

  try {
    const response = await axios.post(`${SERVER_URL}/api/execute`, {
      language: 'sql',
      code: query
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      timeout: 30000
    });

    console.log(`📊 Success: ${response.data.success}`);
    console.log(`📤 Output: "${response.data.output || 'empty'}"`);
    console.log(`⚠️  Error: "${response.data.error || 'none'}"`);
    console.log(`🚪 Exit Code: ${response.data.exitCode}`);

  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

async function runSQLTests() {
  // Test simple query (works in detailed test)
  await testSQL('Simple', `SELECT 'Hello SQL!';`);

  // Test complex query (fails in comprehensive test)
  await testSQL('Complex Union', `SELECT 'Hello from SQL!' as message UNION SELECT '2 + 3 = 5' as message;`);

  // Test individual parts
  await testSQL('First Part', `SELECT 'Hello from SQL!' as message;`);
  await testSQL('Second Part', `SELECT '2 + 3 = 5' as message;`);
}

runSQLTests().catch(console.error);