require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAI() {
  try {
    console.log('Testing AI with different models...');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('No GEMINI_API_KEY found in environment');
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try different models with v1 API
    const models = [
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-002',
      'gemini-pro-latest',
      'gemini-pro-vision',
      'text-bison-001',
      'chat-bison-001'
    ];

    for (const modelName of models) {
      try {
        console.log(`\nTesting model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello, say "test successful" if you can understand this.');
        const response = result.response;
        const text = response.text();
        console.log(`✅ ${modelName}: ${text}`);
        break; // Stop at first successful model
      } catch (error) {
        console.log(`❌ ${modelName}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAI();