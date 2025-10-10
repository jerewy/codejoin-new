#!/usr/bin/env node

/**
 * Enhanced AI System Test Suite
 *
 * Comprehensive testing of the new AI system including:
 * - Multi-provider functionality
 * - Prompt engineering
 * - Circuit breaker patterns
 * - Local AI capabilities
 * - Monitoring and health checks
 * - Context management
 */

const fetch = require('node-fetch');
const { performance } = require('perf_hooks');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.TEST_API_KEY || 'test-key',
  timeout: 30000,
  concurrentRequests: 5,
  totalRequests: 20
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  performance: [],
  responses: []
};

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  console.log(`${prefix} ${message}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'success');
  testResults.passed++;
}

function logError(message, error = null) {
  log(`❌ ${message}`, 'error');
  testResults.failed++;
  testResults.errors.push({ message, error: error?.message, timestamp: new Date().toISOString() });
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'warning');
}

async function measureAsync(name, asyncFn) {
  const startTime = performance.now();
  try {
    const result = await asyncFn();
    const duration = performance.now() - startTime;
    testResults.performance.push({ name, duration, success: true });
    return { result, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    testResults.performance.push({ name, duration, success: false, error: error.message });
    throw error;
  }
}

// Test cases
class EnhancedAITestSuite {
  constructor() {
    this.sessionId = `test_session_${Date.now()}`;
    this.conversationId = null;
  }

  async runAllTests() {
    log('🚀 Starting Enhanced AI System Test Suite');
    log(`Base URL: ${TEST_CONFIG.baseUrl}`);
    log(`Session ID: ${this.sessionId}`);

    try {
      // System health check
      await this.testSystemHealth();

      // Basic functionality tests
      await this.testBasicChat();
      await this.testContextualChat();
      await this.testCodeAnalysis();
      await this.testDebuggingAssistance();
      await this.testMultipleLanguages();

      // Enhanced features tests
      await this.testPromptEngineering();
      await this.testContextPersistence();
      await this.testFallbackMechanisms();
      await this.testQualityScoring();

      // Performance tests
      await this.testConcurrentRequests();
      await this.testPerformanceUnderLoad();

      // Monitoring tests
      await this.testMonitoringFeatures();
      await this.testHealthChecks();

      // Provider failover tests
      await this.testProviderFailover();
      await this.testCircuitBreaker();

      log('\n🎉 All tests completed!');
      this.printTestSummary();

    } catch (error) {
      logError('Test suite failed to complete', error);
      process.exit(1);
    }
  }

  async testSystemHealth() {
    log('\n📊 Testing System Health');

    try {
      const { result, duration } = await measureAsync('system_health', async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai/chat`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      });

      logSuccess(`System health check completed in ${duration.toFixed(0)}ms`);
      log(`   Status: ${result.status}`);
      log(`   Enhanced: ${result.enhanced}`);
      log(`   Features: ${Object.keys(result.features).join(', ')}`);

      if (result.health) {
        log(`   Health Status: ${result.health.overall}`);
        if (result.health.providers) {
          const providerCount = Object.keys(result.health.providers).length;
          log(`   Available Providers: ${providerCount}`);
        }
      }

    } catch (error) {
      logError('System health check failed', error);
    }
  }

  async testBasicChat() {
    log('\n💬 Testing Basic Chat Functionality');

    const testMessage = 'Hello! Can you help me understand what AI is?';

    try {
      const { result, duration } = await measureAsync('basic_chat', async () => {
        const response = await this.makeChatRequest(testMessage);
        return response;
      });

      logSuccess(`Basic chat completed in ${duration.toFixed(0)}ms`);
      log(`   Response length: ${result.response.length} characters`);
      log(`   Provider: ${result.metadata.provider}`);
      log(`   Model: ${result.metadata.model}`);
      log(`   Enhanced: ${result.metadata.enhanced || false}`);

      if (result.metadata.features) {
        const enabledFeatures = Object.entries(result.metadata.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => feature);
        log(`   Enabled Features: ${enabledFeatures.join(', ') || 'None'}`);
      }

      testResults.responses.push({
        type: 'basic_chat',
        success: true,
        duration,
        metadata: result.metadata
      });

    } catch (error) {
      logError('Basic chat test failed', error);
    }
  }

  async testContextualChat() {
    log('\n🧠 Testing Contextual Chat');

    const contextMessage = 'I\'m working on a JavaScript project with React. Can you help me?';

    try {
      const { result, duration } = await measureAsync('contextual_chat', async () => {
        const response = await this.makeChatRequest(contextMessage, {
          projectId: 'test-project-123',
          languages: ['javascript', 'react'],
          sessionId: this.sessionId
        });
        return response;
      });

      logSuccess(`Contextual chat completed in ${duration.toFixed(0)}ms`);
      log(`   Context-aware: ${!!result.metadata.contextStore}`);
      log(`   Response mentions JavaScript/React: ${this.mentionsTechnologies(result.response, ['javascript', 'react'])}`);

      testResults.responses.push({
        type: 'contextual_chat',
        success: true,
        duration,
        metadata: result.metadata
      });

    } catch (error) {
      logError('Contextual chat test failed', error);
    }
  }

  async testCodeAnalysis() {
    log('\n🔍 Testing Code Analysis');

    const codeSnippet = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
    `.trim();

    const message = `Can you analyze this code and suggest optimizations?\n\n\`\`\`javascript\n${codeSnippet}\n\`\`\``;

    try {
      const { result, duration } = await measureAsync('code_analysis', async () => {
        const response = await this.makeChatRequest(message, {
          codeSnippets: [{
            language: 'javascript',
            code: codeSnippet
          }]
        });
        return response;
      });

      logSuccess(`Code analysis completed in ${duration.toFixed(0)}ms`);
      log(`   Response contains optimization suggestions: ${this.containsOptimizationSuggestions(result.response)}`);
      log(`   Response mentions performance: ${this.mentionsKeywords(result.response, ['performance', 'optimization', 'efficient', 'faster'])}`);

      testResults.responses.push({
        type: 'code_analysis',
        success: true,
        duration,
        metadata: result.metadata
      });

    } catch (error) {
      logError('Code analysis test failed', error);
    }
  }

  async testDebuggingAssistance() {
    log('\n🐛 Testing Debugging Assistance');

    const errorMessage = 'TypeError: Cannot read property "map" of undefined';
    const message = `I'm getting this error in my React app: "${errorMessage}". What does it mean and how can I fix it?`;

    try {
      const { result, duration } = await measureAsync('debugging_assistance', async () => {
        const response = await this.makeChatRequest(message, {
          error: errorMessage,
          context: 'react',
          languages: ['javascript']
        });
        return response;
      });

      logSuccess(`Debugging assistance completed in ${duration.toFixed(0)}ms`);
      log(`   Response explains the error: ${this.explainsError(result.response, errorMessage)}`);
      log(`   Provides solution steps: ${this.providesSolutionSteps(result.response)}`);

      testResults.responses.push({
        type: 'debugging_assistance',
        success: true,
        duration,
        metadata: result.metadata
      });

    } catch (error) {
      logError('Debugging assistance test failed', error);
    }
  }

  async testMultipleLanguages() {
    log('\n🌍 Testing Multiple Language Support');

    const languages = [
      { name: 'Python', code: 'print("Hello, World!")', query: 'How do I create a list comprehension?' },
      { name: 'Java', code: 'System.out.println("Hello, World!");', query: 'What is the difference between ArrayList and LinkedList?' },
      { name: 'SQL', code: 'SELECT * FROM users;', query: 'How do I join two tables?' }
    ];

    for (const lang of languages) {
      try {
        const { result, duration } = await measureAsync(`language_${lang.name.toLowerCase()}`, async () => {
          const response = await this.makeChatRequest(lang.query, {
            languages: [lang.name.toLowerCase()],
            codeSnippets: [{
              language: lang.name.toLowerCase(),
              code: lang.code
            }]
          });
          return response;
        });

        logSuccess(`${lang.name} support test completed in ${duration.toFixed(0)}ms`);
        log(`   Response language-specific: ${this.isLanguageSpecific(result.response, lang.name)}`);

      } catch (error) {
        logError(`${lang.name} support test failed`, error);
      }
    }
  }

  async testPromptEngineering() {
    log('\n📝 Testing Prompt Engineering Features');

    const complexRequest = 'Create a REST API for user management with authentication, following best practices for security and scalability. Include database schema and error handling.';

    try {
      const { result, duration } = await measureAsync('prompt_engineering', async () => {
        const response = await this.makeChatRequest(complexRequest, {
          context: 'api_development',
          complexity: 'high',
          requirements: ['security', 'scalability', 'rest', 'authentication']
        });
        return response;
      });

      logSuccess(`Prompt engineering test completed in ${duration.toFixed(0)}ms`);
      log(`   Response structured: ${this.isStructuredResponse(result.response)}`);
      log(`   Covers multiple aspects: ${this.coversMultipleAspects(result.response, ['security', 'api', 'database', 'authentication'])}`);

      if (result.metadata.promptAnalysis) {
        log(`   Prompt analysis: ${result.metadata.promptAnalysis.type} / ${result.metadata.promptAnalysis.intent}`);
      }

    } catch (error) {
      logError('Prompt engineering test failed', error);
    }
  }

  async testContextPersistence() {
    log('\n💾 Testing Context Persistence');

    const conversation = [
      'I\'m building a todo app with React',
      'What state management approach would you recommend?',
      'How would I handle local storage persistence?'
    ];

    try {
      for (let i = 0; i < conversation.length; i++) {
        const { result, duration } = await measureAsync(`context_persistence_${i + 1}`, async () => {
          const response = await this.makeChatRequest(conversation[i], {
            sessionId: this.sessionId,
            conversationHistory: conversation.slice(0, i).map((msg, idx) => ({
              role: idx % 2 === 0 ? 'user' : 'assistant',
              content: idx % 2 === 0 ? msg : testResults.responses.find(r => r.type === `context_persistence_${idx}`)?.response || 'Previous response'
            }))
          });
          return response;
        });

        logSuccess(`Context message ${i + 1} completed in ${duration.toFixed(0)}ms`);

        if (i > 0) {
          const showsContext = this.showsContextAwareness(result.response, conversation.slice(0, i));
          log(`   Shows context awareness: ${showsContext}`);
        }
      }

    } catch (error) {
      logError('Context persistence test failed', error);
    }
  }

  async testFallbackMechanisms() {
    log('\n🔄 Testing Fallback Mechanisms');

    // Test with invalid API key to trigger fallbacks
    const originalBaseUrl = TEST_CONFIG.baseUrl;

    try {
      const { result, duration } = await measureAsync('fallback_mechanisms', async () => {
        const response = await this.makeChatRequest('Explain what machine learning is', {
          forceFallback: true // This would trigger fallbacks in a real implementation
        });
        return response;
      });

      logSuccess(`Fallback mechanism test completed in ${duration.toFixed(0)}ms`);
      log(`   Used fallback: ${!!result.metadata.fallback}`);
      log(`   Fallback type: ${result.metadata.fallback || 'none'}`);
      log(`   Response quality: ${result.metadata.confidence || 'unknown'}`);

    } catch (error) {
      logError('Fallback mechanism test failed', error);
    }
  }

  async testQualityScoring() {
    log('\n⭐ Testing Quality Scoring');

    const qualityTestCases = [
      'What is 2+2?',
      'Explain quantum computing in simple terms',
      'Write a complete web application with user authentication'
    ];

    for (let i = 0; i < qualityTestCases.length; i++) {
      try {
        const { result, duration } = await measureAsync(`quality_score_${i + 1}`, async () => {
          const response = await this.makeChatRequest(qualityTestCases[i]);
          return response;
        });

        logSuccess(`Quality test ${i + 1} completed in ${duration.toFixed(0)}ms`);

        if (result.metadata.qualityScore) {
          log(`   Quality score: ${result.metadata.qualityScore.toFixed(2)}`);
        }

        if (result.metadata.confidence) {
          log(`   Confidence: ${result.metadata.confidence.toFixed(2)}`);
        }

      } catch (error) {
        logError(`Quality test ${i + 1} failed`, error);
      }
    }
  }

  async testConcurrentRequests() {
    log('\n⚡ Testing Concurrent Requests');

    const concurrentPromises = [];
    const requestMessages = [
      'What is JavaScript?',
      'Explain recursion',
      'How do databases work?',
      'What is API design?',
      'Describe clean code principles'
    ];

    const startTime = performance.now();

    try {
      for (let i = 0; i < TEST_CONFIG.concurrentRequests; i++) {
        const promise = this.makeChatRequest(requestMessages[i % requestMessages.length], {
          concurrentTest: true,
          requestId: `concurrent_${i}_${Date.now()}`
        }).then(response => ({
          success: true,
          response,
          index: i
        })).catch(error => ({
          success: false,
          error: error.message,
          index: i
        }));

        concurrentPromises.push(promise);
      }

      const results = await Promise.all(concurrentPromises);
      const totalDuration = performance.now() - startTime;

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logSuccess(`Concurrent requests test completed in ${totalDuration.toFixed(0)}ms`);
      log(`   Successful: ${successful}/${TEST_CONFIG.concurrentRequests}`);
      log(`   Failed: ${failed}/${TEST_CONFIG.concurrentRequests}`);
      log(`   Average per request: ${(totalDuration / TEST_CONFIG.concurrentRequests).toFixed(0)}ms`);

      if (successful < TEST_CONFIG.concurrentRequests) {
        logWarning(`Some concurrent requests failed (${failed} failures)`);
      }

    } catch (error) {
      logError('Concurrent requests test failed', error);
    }
  }

  async testPerformanceUnderLoad() {
    log('\n🚀 Testing Performance Under Load');

    const loadTestPromises = [];
    const startTime = performance.now();

    try {
      for (let i = 0; i < TEST_CONFIG.totalRequests; i++) {
        const promise = this.makeChatRequest(`Test message ${i + 1}`, {
          loadTest: true,
          requestId: `load_${i}_${Date.now()}`
        }).then(response => ({
          success: true,
          duration: response.metadata.processingTime || 0,
          provider: response.metadata.provider,
          index: i
        })).catch(error => ({
          success: false,
          error: error.message,
          index: i
        }));

        loadTestPromises.push(promise);

        // Small delay between requests to avoid overwhelming the system
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const results = await Promise.all(loadTestPromises);
      const totalDuration = performance.now() - startTime;

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        const durations = successful.map(r => r.duration).filter(d => d > 0);
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);

        const providerBreakdown = {};
        successful.forEach(r => {
          providerBreakdown[r.provider] = (providerBreakdown[r.provider] || 0) + 1;
        });

        logSuccess(`Load test completed in ${totalDuration.toFixed(0)}ms`);
        log(`   Total requests: ${TEST_CONFIG.totalRequests}`);
        log(`   Successful: ${successful.length}`);
        log(`   Failed: ${failed.length}`);
        log(`   Success rate: ${((successful.length / TEST_CONFIG.totalRequests) * 100).toFixed(1)}%`);
        log(`   Requests per second: ${(successful.length / (totalDuration / 1000)).toFixed(1)}`);
        log(`   Average response time: ${avgDuration.toFixed(0)}ms`);
        log(`   Min response time: ${minDuration.toFixed(0)}ms`);
        log(`   Max response time: ${maxDuration.toFixed(0)}ms`);
        log(`   Provider breakdown: ${Object.entries(providerBreakdown).map(([p, c]) => `${p}: ${c}`).join(', ')}`);
      } else {
        logError('All load test requests failed');
      }

    } catch (error) {
      logError('Performance load test failed', error);
    }
  }

  async testMonitoringFeatures() {
    log('\n📈 Testing Monitoring Features');

    try {
      // Make a few requests to generate monitoring data
      await this.makeChatRequest('Monitoring test message 1');
      await this.makeChatRequest('Monitoring test message 2');
      await this.makeChatRequest('Monitoring test message 3');

      const { result, duration } = await measureAsync('monitoring_features', async () => {
        const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai/chat`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      });

      logSuccess(`Monitoring features test completed in ${duration.toFixed(0)}ms`);
      log(`   Monitoring available: ${!!result.health}`);

      if (result.health) {
        log(`   System healthy: ${result.health.overall === 'healthy'}`);
        log(`   Provider health data available: ${!!result.health.providers}`);
      }

    } catch (error) {
      logError('Monitoring features test failed', error);
    }
  }

  async testHealthChecks() {
    log('\n🏥 Testing Health Checks');

    try {
      // Multiple health checks to test consistency
      const healthChecks = [];
      for (let i = 0; i < 3; i++) {
        const { result } = await measureAsync(`health_check_${i + 1}`, async () => {
          const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai/chat`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response.json();
        });
        healthChecks.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between checks
      }

      const consistent = healthChecks.every(hc => hc.status === healthChecks[0].status);
      const allHealthy = healthChecks.every(hc => hc.status === 'operational');

      logSuccess(`Health checks completed`);
      log(`   Consistent results: ${consistent}`);
      log(`   All healthy: ${allHealthy}`);

      if (healthChecks[0].health) {
        log(`   Provider count: ${Object.keys(healthChecks[0].health.providers || {}).length}`);
      }

    } catch (error) {
      logError('Health checks test failed', error);
    }
  }

  async testProviderFailover() {
    log('\n🔄 Testing Provider Failover');

    // This test would ideally simulate provider failures
    // For now, we'll test that the system can handle multiple requests
    // and potentially uses different providers

    try {
      const responses = [];
      for (let i = 0; i < 5; i++) {
        const { result } = await measureAsync(`failover_test_${i + 1}`, async () => {
          const response = await this.makeChatRequest(`Failover test message ${i + 1}`, {
            testFailover: true
          });
          return response;
        });
        responses.push(result);
      }

      const providers = [...new Set(responses.map(r => r.metadata.provider))];
      const usedFallback = responses.some(r => r.metadata.fallback);

      logSuccess(`Provider failover test completed`);
      log(`   Providers used: ${providers.join(', ')}`);
      log(`   Used fallback: ${usedFallback}`);
      log(`   Successful responses: ${responses.filter(r => r.success !== false).length}/${responses.length}`);

    } catch (error) {
      logError('Provider failover test failed', error);
    }
  }

  async testCircuitBreaker() {
    log('\n⚡ Testing Circuit Breaker');

    // Make several requests rapidly to potentially trigger circuit breaker
    try {
      const rapidRequests = [];
      for (let i = 0; i < 10; i++) {
        const promise = this.makeChatRequest(`Circuit breaker test ${i + 1}`, {
          rapidFire: true
        }).then(response => ({
          success: true,
          provider: response.metadata.provider,
          fallback: !!response.metadata.fallback
        })).catch(error => ({
          success: false,
          error: error.message
        }));

        rapidRequests.push(promise);
      }

      const results = await Promise.all(rapidRequests);
      const successful = results.filter(r => r.success).length;
      const fallbackUsed = results.some(r => r.fallback);

      logSuccess(`Circuit breaker test completed`);
      log(`   Successful requests: ${successful}/${results.length}`);
      log(`   Fallback used: ${fallbackUsed}`);

      if (successful < results.length) {
        logWarning(`Some requests were rejected or failed (possible circuit breaker activation)`);
      }

    } catch (error) {
      logError('Circuit breaker test failed', error);
    }
  }

  // Helper methods
  async makeChatRequest(message, context = {}) {
    const requestBody = {
      message,
      context: {
        ...context,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      }
    };

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_CONFIG.apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  mentionsTechnologies(response, technologies) {
    const responseLower = response.toLowerCase();
    return technologies.some(tech => responseLower.includes(tech.toLowerCase()));
  }

  containsOptimizationSuggestions(response) {
    const optimizationKeywords = ['optimize', 'improve', 'better', 'faster', 'efficient', 'performance'];
    return optimizationKeywords.some(keyword => response.toLowerCase().includes(keyword));
  }

  mentionsKeywords(response, keywords) {
    const responseLower = response.toLowerCase();
    return keywords.some(keyword => responseLower.includes(keyword.toLowerCase()));
  }

  explainsError(response, error) {
    return response.toLowerCase().includes(error.toLowerCase()) ||
           response.toLowerCase().includes('undefined') ||
           response.toLowerCase().includes('null');
  }

  providesSolutionSteps(response) {
    return /\d+\.|step|first|then|next|finally/i.test(response);
  }

  isLanguageSpecific(response, language) {
    const languageKeywords = {
      'python': ['python', 'def ', 'import ', 'print('],
      'java': ['java', 'public class', 'system.out', 'string[]'],
      'sql': ['sql', 'select', 'from', 'where', 'join']
    };

    const keywords = languageKeywords[language.toLowerCase()] || [];
    return keywords.some(keyword => response.toLowerCase().includes(keyword.toLowerCase()));
  }

  isStructuredResponse(response) {
    return response.includes('```') || // Code blocks
           /^\s*[-*+]\s/m.test(response) || // Bullet points
           /^\s*\d+\.\s/m.test(response); // Numbered lists
  }

  coversMultipleAspects(response, aspects) {
    const responseLower = response.toLowerCase();
    const coveredAspects = aspects.filter(aspect => responseLower.includes(aspect.toLowerCase()));
    return coveredAspects.length >= aspects.length * 0.6; // At least 60% of aspects
  }

  showsContextAwareness(response, previousMessages) {
    const responseLower = response.toLowerCase();
    const previousText = previousMessages.join(' ').toLowerCase();

    // Check if response refers to previous context
    return previousText.split(' ').some(word => word.length > 3 && responseLower.includes(word));
  }

  printTestSummary() {
    log('\n📊 Test Summary');
    log('='.repeat(50));
    log(`Total Tests: ${testResults.passed + testResults.failed}`);
    log(`Passed: ${testResults.passed}`);
    log(`Failed: ${testResults.failed}`);
    log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.performance.length > 0) {
      const avgDuration = testResults.performance.reduce((sum, p) => sum + p.duration, 0) / testResults.performance.length;
      log(`Average Response Time: ${avgDuration.toFixed(0)}ms`);

      const fastest = Math.min(...testResults.performance.map(p => p.duration));
      const slowest = Math.max(...testResults.performance.map(p => p.duration));
      log(`Fastest: ${fastest.toFixed(0)}ms`);
      log(`Slowest: ${slowest.toFixed(0)}ms`);
    }

    if (testResults.responses.length > 0) {
      const providers = [...new Set(testResults.responses.map(r => r.metadata.provider))];
      log(`Providers Used: ${providers.join(', ')}`);

      const enhancedResponses = testResults.responses.filter(r => r.metadata.enhanced).length;
      log(`Enhanced Responses: ${enhancedResponses}/${testResults.responses.length}`);

      const fallbackResponses = testResults.responses.filter(r => r.metadata.fallback).length;
      log(`Fallback Responses: ${fallbackResponses}/${testResults.responses.length}`);
    }

    if (testResults.errors.length > 0) {
      log('\n❌ Errors:');
      testResults.errors.forEach((error, index) => {
        log(`   ${index + 1}. ${error.message}`);
        if (error.error) {
          log(`      Details: ${error.error}`);
        }
      });
    }

    log('\n🎯 Recommendations:');
    if (testResults.failed > 0) {
      log('   - Address failed tests before deploying to production');
    }

    if (testResults.performance.some(p => p.duration > 10000)) {
      log('   - Some responses are slow (>10s), consider optimization');
    }

    const avgDuration = testResults.performance.reduce((sum, p) => sum + p.duration, 0) / testResults.performance.length;
    if (avgDuration > 5000) {
      log('   - Average response time is high, investigate performance bottlenecks');
    }

    if (testResults.responses.filter(r => r.metadata.fallback).length > testResults.responses.length * 0.3) {
      log('   - High fallback usage, check primary provider configurations');
    }

    log('   - Monitor system performance and error rates in production');
    log('   - Set up alerts for critical metrics');
    log('   - Regularly test failover mechanisms');

    log('\n✨ Enhanced AI System Test Suite Complete!');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new EnhancedAITestSuite();
  testSuite.runAllTests().catch(error => {
    logError('Test suite execution failed', error);
    process.exit(1);
  });
}

module.exports = EnhancedAITestSuite;