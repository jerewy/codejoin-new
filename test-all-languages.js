const axios = require('axios');

// Test server configuration
const SERVER_URL = 'http://localhost:3001';
const API_KEY = process.env.API_KEY || 'test123';

// Test code samples for each language
const testCodes = {
  javascript: {
    code: `console.log("Hello from JavaScript!");
const result = 2 + 3;
console.log("2 + 3 =", result);`,
    expectedOutput: "Hello from JavaScript!\n2 + 3 = 5"
  },

  python: {
    code: `print("Hello from Python!")
result = 2 + 3
print(f"2 + 3 = {result}")`,
    expectedOutput: "Hello from Python!\n2 + 3 = 5"
  },

  java: {
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        int result = 2 + 3;
        System.out.println("2 + 3 = " + result);
    }
}`,
    expectedOutput: "Hello from Java!\n2 + 3 = 5"
  },

  typescript: {
    code: `console.log("Hello from TypeScript!");
const result: number = 2 + 3;
console.log(\`2 + 3 = \${result}\`);`,
    expectedOutput: "Hello from TypeScript!\n2 + 3 = 5"
  },

  sql: {
    code: `SELECT 'Hello from SQL!' as message UNION SELECT '2 + 3 = 5' as message;`,
    expectedOutput: "Hello from SQL!"
  },

  csharp: {
    code: `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Hello from C#!");
        int result = 2 + 3;
        Console.WriteLine($"2 + 3 = {result}");
    }
}`,
    expectedOutput: "Hello from C#!\n2 + 3 = 5"
  },

  go: {
    code: `package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
    result := 2 + 3
    fmt.Printf("2 + 3 = %d\\n", result)
}`,
    expectedOutput: "Hello from Go!\n2 + 3 = 5"
  },

  rust: {
    code: `fn main() {
    println!("Hello from Rust!");
    let result = 2 + 3;
    println!("2 + 3 = {}", result);
}`,
    expectedOutput: "Hello from Rust!\n2 + 3 = 5"
  },

  swift: {
    code: `print("Hello from Swift!")
let result = 2 + 3
print("2 + 3 = \\(result)")`,
    expectedOutput: "Hello from Swift!\n2 + 3 = 5"
  },

  cpp: {
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    int result = 2 + 3;
    cout << "2 + 3 = " << result << endl;
    return 0;
}`,
    expectedOutput: "Hello from C++!\n2 + 3 = 5"
  },

  c: {
    code: `#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    int result = 2 + 3;
    printf("2 + 3 = %d\\n", result);
    return 0;
}`,
    expectedOutput: "Hello from C!\n2 + 3 = 5"
  }
};

// Test results tracking
const results = {
  passed: [],
  failed: [],
  errors: []
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
      timeout: 30000 // 30 second timeout
    });

    if (response.data.success) {
      const output = response.data.output?.trim() || '';
      console.log(`   ✅ Execution successful`);
      console.log(`   📤 Output: "${output}"`);

      // Check if output contains expected content (flexible matching)
      const containsExpected = testData.expectedOutput.split('\n').every(line =>
        output.includes(line.trim())
      );

      if (containsExpected) {
        console.log(`   ✅ Output validation passed`);
        results.passed.push(language);
      } else {
        console.log(`   ⚠️  Output validation failed - expected parts of: "${testData.expectedOutput}"`);
        results.failed.push({
          language,
          reason: 'Output validation failed',
          expected: testData.expectedOutput,
          actual: output
        });
      }
    } else {
      console.log(`   ❌ Execution failed: ${response.data.error}`);
      results.failed.push({
        language,
        reason: response.data.error
      });
    }

  } catch (error) {
    console.log(`   💥 Request failed: ${error.message}`);
    results.errors.push({
      language,
      error: error.message
    });
  }
}

async function checkServerHealth() {
  try {
    console.log('🏥 Checking server health...');
    const response = await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Server is healthy:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    console.log('💡 Make sure the backend server is running: npm run dev');
    return false;
  }
}

async function getSupportedLanguages() {
  try {
    console.log('📋 Getting supported languages...');
    const response = await axios.get(`${SERVER_URL}/api/languages`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ Supported languages:', response.data.languages);
    // Extract just the language IDs from the response
    return response.data.languages.map(lang => lang.id || lang);
  } catch (error) {
    console.log('⚠️  Could not fetch supported languages:', error.message);
    return Object.keys(testCodes);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive language tests...\n');

  // Check server health first
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Cannot proceed with tests - server is not responding');
    return;
  }

  // Get supported languages
  const supportedLanguages = await getSupportedLanguages();

  // Filter test codes to only include supported languages
  const languagesToTest = Object.keys(testCodes).filter(lang =>
    supportedLanguages.includes(lang)
  );

  console.log(`\n📊 Testing ${languagesToTest.length} languages: ${languagesToTest.join(', ')}`);

  // Run tests for each language
  for (const language of languagesToTest) {
    await testLanguage(language, testCodes[language]);
    // Small delay between tests to respect rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n✅ PASSED (${results.passed.length}):`);
  results.passed.forEach(lang => console.log(`   - ${lang}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED (${results.failed.length}):`);
    results.failed.forEach(failure => {
      console.log(`   - ${failure.language}: ${failure.reason}`);
      if (failure.expected && failure.actual) {
        console.log(`     Expected: "${failure.expected}"`);
        console.log(`     Actual: "${failure.actual}"`);
      }
    });
  }

  if (results.errors.length > 0) {
    console.log(`\n💥 ERRORS (${results.errors.length}):`);
    results.errors.forEach(error => {
      console.log(`   - ${error.language}: ${error.error}`);
    });
  }

  const totalTests = results.passed.length + results.failed.length + results.errors.length;
  const successRate = totalTests > 0 ? ((results.passed.length / totalTests) * 100).toFixed(1) : 0;

  console.log(`\n📈 Overall Success Rate: ${successRate}% (${results.passed.length}/${totalTests})`);

  if (results.passed.length === languagesToTest.length) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node test-all-languages.js [options]

Options:
  --help, -h     Show this help message

Environment Variables:
  API_KEY        API key for the backend (default: 'test-api-key')

Make sure the code-execution-backend is running before running this script:
  cd code-execution-backend
  npm run dev
`);
  process.exit(0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});