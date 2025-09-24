const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

const testCodes = {
  go: {
    code: `package main
import "fmt"
func main() {
    fmt.Println("Hello from Go!")
    result := 2 + 3
    fmt.Printf("2 + 3 = %d\n", result)
}`,
    expectedOutput: "Hello from Go!\n2 + 3 = 5"
  },

  c: {
    code: `#include <stdio.h>

int main() {
    printf("Hello from C!\n");
    int result = 2 + 3;
    printf("2 + 3 = %d\n", result);
    return 0;
}`,
    expectedOutput: "Hello from C!\n2 + 3 = 5"
  },

  typescript: {
    code: `console.log("Hello from TypeScript!");
const result: number = 2 + 3;
console.log(\`2 + 3 = \${result}\`);`,
    expectedOutput: "Hello from TypeScript!\n2 + 3 = 5"
  }
};

async function testLanguage(language, testData) {
  console.log(`\n🔧 Testing ${language.toUpperCase()}...`);

  try {
    const response = await axios.post(`${SERVER_URL}/api/execute`, {
      language: language,
      code: testData.code
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      timeout: 30000
    });

    if (response.data.success) {
      const output = response.data.output?.trim() || '';
      console.log(`   ✅ Execution successful`);
      console.log(`   📤 Output: "${output}"`);

      if (response.data.error && response.data.error.trim()) {
        console.log(`   ⚠️  Error: "${response.data.error.trim()}"`);
      }

      const containsExpected = testData.expectedOutput.split('\n').every(line =>
        output.includes(line.trim())
      );

      if (containsExpected) {
        console.log(`   ✅ Output validation passed`);
        return true;
      } else {
        console.log(`   ⚠️  Output validation failed - expected parts of: "${testData.expectedOutput}"`);
        return false;
      }
    } else {
      console.log(`   ❌ Execution failed: ${response.data.error}`);
      return false;
    }

  } catch (error) {
    console.log(`   💥 Request failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing the 3 previously failing languages...\n');

  const results = { passed: 0, failed: 0 };

  for (const [language, testData] of Object.entries(testCodes)) {
    const success = await testLanguage(language, testData);
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}/3`);
  console.log(`❌ Failed: ${results.failed}/3`);
  console.log(`📈 Success Rate: ${((results.passed / 3) * 100).toFixed(1)}%`);
}

runTests().catch(console.error);