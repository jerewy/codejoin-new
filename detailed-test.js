const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

async function testLanguageDetailed(language, code) {
  console.log(`\n🔧 Testing ${language.toUpperCase()}...`);

  try {
    const response = await axios.post(`${SERVER_URL}/api/execute`, {
      language: language,
      code: code
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      timeout: 30000
    });

    console.log(`   📊 Success: ${response.data.success}`);
    console.log(`   📤 Output: "${response.data.output || 'empty'}"`);
    console.log(`   ⚠️  Error: "${response.data.error || 'none'}"`);
    if (response.data.stderr) {
      console.log(`   🔴 Stderr: "${response.data.stderr}"`);
    }
    if (response.data.exitCode !== undefined) {
      console.log(`   🚪 Exit Code: ${response.data.exitCode}`);
    }

  } catch (error) {
    console.log(`   💥 Request failed: ${error.response?.data || error.message}`);
  }
}

async function runDetailedTests() {
  const failedLanguages = {
    typescript: `console.log("Hello TypeScript!");`,
    sql: `SELECT 'Hello SQL!';`,
    go: `package main\nimport "fmt"\nfunc main() { fmt.Println("Hello Go!") }`,
    c: `#include <stdio.h>\nint main() { printf("Hello C!\\n"); return 0; }`
  };

  console.log('🔍 Running detailed tests on failed languages...\n');

  for (const [language, code] of Object.entries(failedLanguages)) {
    await testLanguageDetailed(language, code);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runDetailedTests().catch(console.error);