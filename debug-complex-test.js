const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

// Get the exact test cases from the comprehensive test
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
  }
};

async function debugLanguage(language, testData) {
  console.log(`\n🔧 DEBUGGING ${language.toUpperCase()}...`);
  console.log(`📝 Code:\n${testData.code}`);

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

    console.log(`📊 Success: ${response.data.success}`);
    console.log(`📤 Output: "${response.data.output || 'empty'}"`);
    console.log(`⚠️  Error: "${response.data.error || 'none'}"`);
    console.log(`🚪 Exit Code: ${response.data.exitCode}`);
    console.log(`⏱️  Execution Time: ${response.data.executionTime}ms`);

  } catch (error) {
    console.error('💥 Request failed:', error.message);
  }
}

async function runDebug() {
  for (const [language, testData] of Object.entries(testCodes)) {
    await debugLanguage(language, testData);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runDebug().catch(console.error);