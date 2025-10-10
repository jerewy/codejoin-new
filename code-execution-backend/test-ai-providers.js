/**
 * Test AI Provider Configuration
 */

require('dotenv').config();

console.log('=== Testing AI Provider Configuration ===\n');

console.log('Environment variables:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
console.log('HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');

async function testProviders() {
  console.log('\n=== Testing Gemini Provider ===');
  try {
    const GeminiProvider = require('./src/ai/providers/gemini-provider');
    const geminiProvider = new GeminiProvider();
    console.log('✓ Gemini initialized successfully');
    console.log('  Model:', geminiProvider.config?.model);
    console.log('  API Key present:', !!geminiProvider.config?.apiKey);

    // Test health
    try {
      const healthy = await geminiProvider.isHealthy();
      console.log('  Health check result:', healthy);
    } catch (err) {
      console.log('  Health check error:', err.message);
    }
  } catch (error) {
    console.log('✗ Gemini failed:', error.message);
  }

  console.log('\n=== Testing HuggingFace Provider ===');
  try {
    const HuggingFaceProvider = require('./src/ai/providers/huggingface-provider');
    const hfProvider = new HuggingFaceProvider();
    console.log('✓ HuggingFace initialized successfully');
    console.log('  Models available:', hfProvider.models?.length || 0);
    console.log('  API Key present:', !!hfProvider.config?.apiKey);

    // Test health
    try {
      const healthy = await hfProvider.isHealthy();
      console.log('  Health check result:', healthy);
    } catch (err) {
      console.log('  Health check error:', err.message);
    }
  } catch (error) {
    console.log('✗ HuggingFace failed:', error.message);
  }

  console.log('\n=== Testing Comprehensive AI Service Manager ===');
  try {
    const ComprehensiveAIServiceManager = require('./src/services/ai-service-manager');
    const aiManager = new ComprehensiveAIServiceManager();

    console.log('✓ Comprehensive AI Service Manager initialized');
    console.log('  Providers registered:', aiManager.providers.size);

    // Test health check
    try {
      const healthStatus = await aiManager.healthCheck();
      console.log('  Overall health:', healthStatus.overall);
      console.log('  Providers:', Object.keys(healthStatus.providers || {}));

      if (healthStatus.providers) {
        for (const [name, provider] of Object.entries(healthStatus.providers)) {
          console.log(`    ${name}: ${provider.status || 'unknown'}`);
        }
      }
    } catch (err) {
      console.log('  Health check error:', err.message);
    }
  } catch (error) {
    console.log('✗ Comprehensive AI Service Manager failed:', error.message);
  }
}

testProviders().catch(console.error);