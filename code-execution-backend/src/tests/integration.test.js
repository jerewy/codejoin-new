const request = require('supertest');
const app = require('../server');
const logger = require('../utils/logger');

/**
 * Integration tests for the AI Chat API with resilience patterns
 *
 * Tests the complete API flow including:
 * - Request handling and validation
 * - Multi-provider failover
 * - Error handling and graceful degradation
 * - Rate limiting
 * - Health checks and metrics
 */
describe('AI Chat API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start test server
    server = app.listen(0); // Random port
    logger.info('Test server started');
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      logger.info('Test server stopped');
    }
  });

  describe('POST /api/ai/chat', () => {
    test('should handle successful AI chat request', async () => {
      // Note: This test will use fallback responses if no real API keys are configured
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: 'Hello, how are you?'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('metadata');

      if (response.body.success) {
        expect(response.body.metadata).toHaveProperty('provider');
        expect(response.body.metadata).toHaveProperty('responseTime');
      }
    });

    test('should handle requests with context', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: 'What do you think about this?',
          context: 'We are discussing AI technology and its impact on society.'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    test('should validate input properly', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: '' // Empty message
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('type', 'validation_error');
    });

    test('should handle message length limits', async () => {
      const longMessage = 'a'.repeat(10001); // Over 10,000 characters

      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: longMessage
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('too long');
    });

    test('should handle harmful content detection', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: '<script>alert("xss")</script>'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('harmful content');
    });

    test('should handle context length limits', async () => {
      const longContext = 'b'.repeat(5001); // Over 5,000 characters

      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: 'Hello',
          context: longContext
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Context too long');
    });

    test('should handle missing API key gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'Hello'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should include request ID in responses', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: 'Hello'
        });

      expect(response.headers).toHaveProperty('x-request-id');
      if (response.body.metadata) {
        expect(response.body.metadata).toHaveProperty('requestId');
      }
    });

    test('should handle service overload gracefully', async () => {
      // Make multiple rapid requests to test rate limiting and resilience
      const requests = Array(20).fill().map(() =>
        request(app)
          .post('/api/ai/chat')
          .set('X-API-Key', process.env.API_KEY || 'test-key')
          .send({
            message: 'Test message'
          })
      );

      const responses = await Promise.allSettled(requests);

      // At least some should succeed, others should be rate limited or get fallback responses
      const successful = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      const rateLimited = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(successful + rateLimited).toBe(20);
    });
  });

  describe('GET /api/ai/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/ai/health');

      expect(response.status).toBeOneOf([200, 206, 503]);
      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should include provider details', async () => {
      const response = await request(app)
        .get('/api/ai/health');

      if (response.body.providers) {
        Object.values(response.body.providers).forEach(provider => {
          expect(provider).toHaveProperty('status');
          expect(provider).toHaveProperty('lastCheck');
        });
      }
    });

    test('should handle service unavailability', async () => {
      // This test verifies the health check works even when AI services are down
      const response = await request(app)
        .get('/api/ai/health');

      expect(response.body).toHaveProperty('overall');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.overall);
    });
  });

  describe('GET /api/ai/metrics', () => {
    test('should return service metrics', async () => {
      const response = await request(app)
        .get('/api/ai/metrics');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('success');

      if (response.body.success) {
        expect(response.body).toHaveProperty('metrics');
        expect(response.body.metrics).toHaveProperty('providers');
        expect(response.body.metrics).toHaveProperty('circuitBreakers');
      }
    });

    test('should include circuit breaker states', async () => {
      const response = await request(app)
        .get('/api/ai/metrics');

      if (response.body.success && response.body.metrics.circuitBreakers) {
        Object.values(response.body.metrics.circuitBreakers).forEach(cb => {
          expect(cb).toHaveProperty('state');
          expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(cb.state);
        });
      }
    });
  });

  describe('GET /api/ai/status', () => {
    test('should return service status', async () => {
      const response = await request(app)
        .get('/api/ai/status');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('success');

      if (response.body.success) {
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toHaveProperty('service');
        expect(response.body.status).toHaveProperty('version');
        expect(response.body.status).toHaveProperty('features');
      }
    });

    test('should list enabled features', async () => {
      const response = await request(app)
        .get('/api/ai/status');

      if (response.body.success) {
        const features = response.body.status.features;
        expect(features.multiProvider).toBe(true);
        expect(features.circuitBreaker).toBe(true);
        expect(features.retryLogic).toBe(true);
        expect(features.gracefulDegradation).toBe(true);
        expect(features.requestQueueing).toBe(true);
        expect(features.healthMonitoring).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({}); // Missing message field

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Message is required');
    });

    test('should handle unexpected errors gracefully', async () => {
      // This test would need to mock a failure scenario
      // For now, we verify the error response format
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: 'Hello'
        });

      // Even in failure cases, should return structured error
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('metadata');
      }
    });
  });

  describe('Security Tests', () => {
    test('should reject requests without valid API key', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'Hello'
        });

      expect(response.status).toBe(401);
    });

    test('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', 'invalid-key')
        .send({
          message: 'Hello'
        });

      expect(response.status).toBe(401);
    });

    test('should sanitize error messages', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: '<script>document.cookie</script>'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).not.toContain('<script>');
      expect(response.body.error).toContain('harmful content');
    });
  });

  describe('Performance Tests', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/ai/chat')
        .set('X-API-Key', process.env.API_KEY || 'test-key')
        .send({
          message: 'Hello'
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(30000); // Should respond within 30 seconds
      expect(response.status).toBeOneOf([200, 503]); // Success or service unavailable
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill().map((_, i) =>
        request(app)
          .post('/api/ai/chat')
          .set('X-API-Key', process.env.API_KEY || 'test-key')
          .send({
            message: `Test message ${i}`
          })
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      expect(averageTime).toBeLessThan(5000); // Average under 5 seconds per request

      // All requests should complete (success or fallback)
      expect(responses.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Resilience Tests', () => {
    test('should maintain service during partial failures', async () => {
      // Make requests that might trigger various failure scenarios
      const requests = Array(5).fill().map((_, i) =>
        request(app)
          .post('/api/ai/chat')
          .set('X-API-Key', process.env.API_KEY || 'test-key')
          .send({
            message: `Resilience test ${i}`
          })
      );

      const responses = await Promise.allSettled(requests);

      // Service should remain responsive even under stress
      responses.forEach(response => {
        expect(response.status).toBe('fulfilled');
        const result = response.value;
        expect(result.status).toBeOneOf([200, 429, 503]); // Success, rate limited, or service unavailable
      });
    });

    test('should recover from temporary failures', async () => {
      // This test would ideally simulate temporary service failures
      // For now, we verify the service can handle repeated requests
      const requests = Array(3).fill().map(() =>
        request(app)
          .post('/api/ai/chat')
          .set('X-API-Key', process.env.API_KEY || 'test-key')
          .send({
            message: 'Recovery test'
          })
      );

      const responses = await Promise.allSettled(requests);

      // Should complete all requests (even if some get fallback responses)
      expect(responses.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });
});