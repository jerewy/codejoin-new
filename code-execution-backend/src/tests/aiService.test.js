const AIServiceManager = require('../services/aiServiceManager');
const CircuitBreaker = require('../services/circuitBreaker');
const RetryManager = require('../services/retryManager');
const HealthMonitor = require('../services/healthMonitor');

/**
 * Comprehensive test suite for AI Service Resilience Architecture
 *
 * Tests all resilience patterns including:
 * - Circuit breaker functionality
 * - Retry logic with exponential backoff
 * - Multi-provider failover
 * - Graceful degradation
 * - Health monitoring
 */
describe('AI Service Resilience Tests', () => {
  let aiServiceManager;
  let mockGeminiProvider;
  let mockOpenAIProvider;

  beforeEach(() => {
    // Reset environment
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = null; // Disable Anthropic for some tests

    // Create mock providers
    mockGeminiProvider = {
      chat: jest.fn(),
      healthCheck: jest.fn()
    };

    mockOpenAIProvider = {
      chat: jest.fn(),
      healthCheck: jest.fn()
    };

    // Initialize service manager
    aiServiceManager = new AIServiceManager();
  });

  afterEach(() => {
    if (aiServiceManager) {
      aiServiceManager.healthMonitor.stop();
    }
    jest.clearAllMocks();
  });

  describe('Circuit Breaker Tests', () => {
    let circuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 2000
      });
    });

    test('should allow requests when circuit is closed', async () => {
      const successFn = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(successFn);

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState().state).toBe('CLOSED');
    });

    test('should open circuit after failure threshold', async () => {
      const failureFn = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Execute multiple failures to trigger circuit opening
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failureFn);
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState().state).toBe('OPEN');
    });

    test('should reject immediately when circuit is open', async () => {
      const failureFn = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit opening
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failureFn);
        } catch (error) {
          // Expected failures
        }
      }

      // Try to execute with open circuit
      const testFn = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(testFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(testFn).not.toHaveBeenCalled();
    });

    test('should transition to half-open after reset timeout', async () => {
      const failureFn = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit opening
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failureFn);
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.getState().state).toBe('OPEN');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Next execution should transition to half-open
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successFn);

      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('CLOSED');
    });
  });

  describe('Retry Manager Tests', () => {
    let retryManager;

    beforeEach(() => {
      retryManager = new RetryManager({
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        jitter: false // Disable jitter for predictable tests
      });
    });

    test('should succeed on first attempt', async () => {
      const successFn = jest.fn().mockResolvedValue('success');

      const result = await retryManager.execute(successFn);

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable errors', async () => {
      const failureThenSuccess = jest.fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValue('success');

      const result = await retryManager.execute(failureThenSuccess);

      expect(result).toBe('success');
      expect(failureThenSuccess).toHaveBeenCalledTimes(3);
    });

    test('should not retry on non-retryable errors', async () => {
      const nonRetryableFn = jest.fn().mockRejectedValue(new Error('Invalid API key'));

      await expect(retryManager.execute(nonRetryableFn)).rejects.toThrow('Invalid API key');
      expect(nonRetryableFn).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      const alwaysFailingFn = jest.fn().mockRejectedValue(new Error('503 Service Unavailable'));

      await expect(retryManager.execute(alwaysFailingFn)).rejects.toThrow('503 Service Unavailable');
      expect(alwaysFailingFn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    test('should use exponential backoff', async () => {
      const delays = [];
      const originalSleep = retryManager.sleep;
      retryManager.sleep = jest.fn().mockImplementation((ms) => {
        delays.push(ms);
        return originalSleep.call(retryManager, ms);
      });

      const failureThenSuccess = jest.fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValue('success');

      await retryManager.execute(failureThenSuccess);

      // Verify exponential backoff: 100ms, 200ms
      expect(delays).toEqual([100, 200]);
    });
  });

  describe('Health Monitor Tests', () => {
    let healthMonitor;
    let mockProvider;

    beforeEach(() => {
      healthMonitor = new HealthMonitor({
        healthCheckInterval: 500, // Fast for testing
        alertThresholds: {
          consecutiveFailures: 2,
          errorRate: 0.5
        }
      });

      mockProvider = {
        healthCheck: jest.fn()
      };

      healthMonitor.registerProvider('test-provider', mockProvider);
    });

    afterEach(() => {
      healthMonitor.stop();
    });

    test('should record successful health checks', async () => {
      mockProvider.healthCheck.mockResolvedValue('OK');

      await healthMonitor.checkProviderHealth('test-provider', mockProvider);

      const status = healthMonitor.getHealthStatus();
      expect(status.providers['test-provider'].status).toBe('healthy');
      expect(status.providers['test-provider'].successfulChecks).toBe(1);
    });

    test('should record failed health checks', async () => {
      mockProvider.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      await healthMonitor.checkProviderHealth('test-provider', mockProvider);

      const status = healthMonitor.getHealthStatus();
      expect(status.providers['test-provider'].status).toBe('unhealthy');
      expect(status.providers['test-provider'].failedChecks).toBe(1);
    });

    test('should raise alerts on consecutive failures', async () => {
      mockProvider.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      // Trigger consecutive failures
      for (let i = 0; i < 2; i++) {
        await healthMonitor.checkProviderHealth('test-provider', mockProvider);
      }

      const alerts = healthMonitor.getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('consecutive_failures');
      expect(alerts[0].provider).toBe('test-provider');
    });

    test('should resolve alerts on recovery', async () => {
      mockProvider.healthCheck
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValue('OK');

      // Trigger failures and alert
      for (let i = 0; i < 2; i++) {
        await healthMonitor.checkProviderHealth('test-provider', mockProvider);
      }

      // Successful check should resolve alert
      await healthMonitor.checkProviderHealth('test-provider', mockProvider);

      const alerts = healthMonitor.getActiveAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe('AI Service Manager Integration Tests', () => {
    test('should succeed with primary provider', async () => {
      // Mock successful response from Gemini
      mockGeminiProvider.chat.mockResolvedValue({
        response: 'Hello from Gemini!',
        model: 'gemini-pro'
      });
      mockGeminiProvider.healthCheck.mockResolvedValue('OK');

      // Replace the real provider with mock
      aiServiceManager.providers.set('gemini', mockGeminiProvider);

      const result = await aiServiceManager.chat('Hello', null);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Hello from Gemini!');
      expect(result.metadata.provider).toBe('gemini');
    });

    test('should failover to secondary provider', async () => {
      // Mock Gemini failure and OpenAI success
      mockGeminiProvider.chat.mockRejectedValue(new Error('503 Service Unavailable'));
      mockGeminiProvider.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      mockOpenAIProvider.chat.mockResolvedValue({
        response: 'Hello from OpenAI!',
        model: 'gpt-4'
      });
      mockOpenAIProvider.healthCheck.mockResolvedValue('OK');

      // Replace providers with mocks
      aiServiceManager.providers.set('gemini', mockGeminiProvider);
      aiServiceManager.providers.set('openai', mockOpenAIProvider);

      const result = await aiServiceManager.chat('Hello', null);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Hello from OpenAI!');
      expect(result.metadata.provider).toBe('openai');
    });

    test('should return fallback response when all providers fail', async () => {
      // Mock all providers failing
      mockGeminiProvider.chat.mockRejectedValue(new Error('503 Service Unavailable'));
      mockGeminiProvider.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      mockOpenAIProvider.chat.mockRejectedValue(new Error('429 Rate Limited'));
      mockOpenAIProvider.healthCheck.mockRejectedValue(new Error('Rate limited'));

      // Replace providers with mocks
      aiServiceManager.providers.set('gemini', mockGeminiProvider);
      aiServiceManager.providers.set('openai', mockOpenAIProvider);

      const result = await aiServiceManager.chat('Hello', null);

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.response).toContain('technical difficulties');
    });

    test('should queue requests for retry on appropriate errors', async () => {
      // Mock provider with retryable error
      mockGeminiProvider.chat.mockRejectedValue(new Error('Service overloaded'));
      mockGeminiProvider.healthCheck.mockRejectedValue(new Error('Service overloaded'));

      aiServiceManager.providers.set('gemini', mockGeminiProvider);

      await aiServiceManager.chat('Hello', null);

      expect(aiServiceManager.requestQueue).toHaveLength(1);
      expect(aiServiceManager.requestQueue[0].message).toBe('Hello');
    });

    test('should provide comprehensive health status', async () => {
      mockGeminiProvider.healthCheck.mockResolvedValue('OK');
      mockOpenAIProvider.healthCheck.mockRejectedValue(new Error('Service unavailable'));

      aiServiceManager.providers.set('gemini', mockGeminiProvider);
      aiServiceManager.providers.set('openai', mockOpenAIProvider);

      const healthStatus = await aiServiceManager.healthCheck();

      expect(healthStatus.overall).toBe('degraded');
      expect(healthStatus.providers.gemini.status).toBe('healthy');
      expect(healthStatus.providers.openai.status).toBe('unhealthy');
      expect(healthStatus.queueSize).toBeDefined();
    });

    test('should handle malformed input gracefully', async () => {
      const result = await aiServiceManager.chat('', null);

      expect(result.success).toBe(false);
      expect(result.response).toContain('technical difficulties');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network timeouts', async () => {
      const timeoutProvider = {
        chat: jest.fn().mockImplementation(() =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2000)
          )
        ),
        healthCheck: jest.fn().mockResolvedValue('OK')
      };

      aiServiceManager.providers.set('gemini', timeoutProvider);

      const startTime = Date.now();
      const result = await aiServiceManager.chat('Hello', null);
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(endTime - startTime).toBeLessThan(35000); // Should fail fast due to circuit breaker
    });

    test('should handle concurrent requests safely', async () => {
      const concurrentProvider = {
        chat: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { response: 'Response', model: 'test' };
        }),
        healthCheck: jest.fn().mockResolvedValue('OK')
      };

      aiServiceManager.providers.set('gemini', concurrentProvider);

      // Make multiple concurrent requests
      const requests = Array(10).fill().map(() =>
        aiServiceManager.chat('Hello', null)
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.response).toBe('Response');
      });
    });

    test('should maintain service state during failures', async () => {
      const flakyProvider = {
        chat: jest.fn()
          .mockRejectedValueOnce(new Error('503 Service Unavailable'))
          .mockResolvedValueOnce({ response: 'Success', model: 'test' })
          .mockRejectedValueOnce(new Error('503 Service Unavailable'))
          .mockResolvedValueOnce({ response: 'Success', model: 'test' }),
        healthCheck: jest.fn().mockResolvedValue('OK')
      };

      aiServiceManager.providers.set('gemini', flakyProvider);

      const result1 = await aiServiceManager.chat('Hello 1', null);
      const result2 = await aiServiceManager.chat('Hello 2', null);
      const result3 = await aiServiceManager.chat('Hello 3', null);
      const result4 = await aiServiceManager.chat('Hello 4', null);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
      expect(result4.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should handle high request volume', async () => {
      const fastProvider = {
        chat: jest.fn().mockResolvedValue({ response: 'Fast response', model: 'test' }),
        healthCheck: jest.fn().mockResolvedValue('OK')
      };

      aiServiceManager.providers.set('gemini', fastProvider);

      const startTime = Date.now();
      const requests = Array(100).fill().map((_, i) =>
        aiServiceManager.chat(`Message ${i}`, null)
      );

      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should maintain performance under partial failures', async () => {
      const partialFailureProvider = {
        chat: jest.fn().mockImplementation(async () => {
          // 50% success rate
          if (Math.random() < 0.5) {
            return { response: 'Success', model: 'test' };
          } else {
            throw new Error('Random failure');
          }
        }),
        healthCheck: jest.fn().mockResolvedValue('OK')
      };

      aiServiceManager.providers.set('gemini', partialFailureProvider);

      const requests = Array(50).fill().map((_, i) =>
        aiServiceManager.chat(`Message ${i}`, null)
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const fallback = results.filter(r => r.status === 'fulfilled' && r.value.fallback).length;

      // Should have some successful responses and some fallbacks
      expect(successful + fallback).toBe(50);
      expect(fallback).toBeGreaterThan(0);
    });
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('circuit breaker performance', async () => {
    const circuitBreaker = new CircuitBreaker();
    const fastFunction = jest.fn().mockResolvedValue('success');

    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      await circuitBreaker.execute(fastFunction);
    }

    const endTime = Date.now();
    const averageTime = (endTime - startTime) / 1000;

    expect(averageTime).toBeLessThan(5); // Should be under 5ms per call
  });

  test('retry manager performance', async () => {
    const retryManager = new RetryManager({ maxRetries: 0 }); // No retries for speed test
    const fastFunction = jest.fn().mockResolvedValue('success');

    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await retryManager.execute(fastFunction);
    }

    const endTime = Date.now();
    const averageTime = (endTime - startTime) / 100;

    expect(averageTime).toBeLessThan(10); // Should be under 10ms per call
  });
});