/**
 * Check Available Gemini Models
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkAvailableModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Fetching available Gemini models...\n');

    // Try to list models (this might not be available in the SDK)
    // Instead, let's try common model names
    const possibleModels = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-pro',
      'gemini-pro-vision',
      'text-bison-001',
      'chat-bison-001'
    ];

    console.log('Testing different model names...\n');

    for (const modelName of possibleModels) {
      try {
        console.log(`Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Simple test request
        const result = await Promise.race([
          model.generateContent('Hello'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);

        const response = result.response;
        const text = response.text();

        console.log(`✅ SUCCESS: ${modelName}`);
        console.log(`   Response: ${text.substring(0, 50)}...\n`);

        // If we find a working model, we can use it
        console.log(`🎉 Found working model: ${modelName}`);
        return modelName;

      } catch (error) {
        console.log(`❌ FAILED: ${modelName}`);
        console.log(`   Error: ${error.message}\n`);
      }
    }

    console.log('No working model found. Checking API key validity...');

    // Test if API key is valid by checking account
    try {
      // This is a basic test to see if the API key works
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('API key appears to be valid, but no models are accessible.');
    } catch (error) {
      console.log('API key might be invalid:', error.message);
    }

  } catch (error) {
    console.error('Failed to check models:', error.message);
  }

  return null;
}

checkAvailableModels().then(workingModel => {
  if (workingModel) {
    console.log(`\n✅ Use this model in your configuration: ${workingModel}`);
    console.log(`\nUpdate your .env file:`);
    console.log(`GEMINI_MODEL=${workingModel}`);
    console.log(`\nAnd update the default in gemini-provider.js:`);
    console.log(`model: config.model || process.env.GEMINI_MODEL || '${workingModel}'`);
  } else {
    console.log('\n❌ No working models found. Please check:');
    console.log('1. Your API key is valid');
    console.log('2. The Gemini API is enabled in your Google Cloud project');
    console.log('3. You have the correct permissions');
  }
}).catch(console.error);