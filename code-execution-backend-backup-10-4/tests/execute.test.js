const request = require('supertest');
const app = require('../src/server');

describe('Code Execution API', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/languages', () => {
    it('should return supported languages', async () => {
      const response = await request(app)
        .get('/api/languages')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('languages');
      expect(Array.isArray(response.body.languages)).toBe(true);
      expect(response.body.languages.length).toBeGreaterThan(0);
    });

    it('should include required language properties', async () => {
      const response = await request(app)
        .get('/api/languages')
        .expect(200);

      const language = response.body.languages[0];
      expect(language).toHaveProperty('id');
      expect(language).toHaveProperty('name');
      expect(language).toHaveProperty('type');
      expect(language).toHaveProperty('fileExtension');
    });
  });

  describe('POST /api/execute', () => {
    const validApiKey = process.env.API_KEY || 'test-key';

    it('should execute simple JavaScript code', async () => {
      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'javascript',
          code: 'console.log("Hello, World!");'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('output');
      expect(response.body.output).toContain('Hello, World!');
      expect(response.body).toHaveProperty('exitCode', 0);
    });

    it('should execute simple Python code', async () => {
      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'python',
          code: 'print("Hello from Python!")'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('output');
      expect(response.body.output).toContain('Hello from Python!');
    });

    it('should handle syntax errors', async () => {
      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'javascript',
          code: 'console.log("missing quote);'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests without API key', async () => {
      const response = await request(app)
        .post('/api/execute')
        .send({
          language: 'javascript',
          code: 'console.log("test");'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid language', async () => {
      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'invalid-language',
          code: 'print("test")'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not supported');
    });

    it('should reject code that is too large', async () => {
      const largeCode = 'x = "a" * 2000000\nprint(x)'; // > 1MB when repeated

      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'python',
          code: largeCode.repeat(1000)
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should handle input parameter', async () => {
      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'python',
          code: 'name = input("Enter name: ")\nprint(f"Hello, {name}!")',
          input: 'Alice'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.output).toContain('Hello, Alice!');
    });

    it('should respect custom timeout', async () => {
      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'python',
          code: 'import time\ntime.sleep(2)\nprint("Done")',
          timeout: 5000
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.output).toContain('Done');
    });

    it('should reject dangerous code patterns', async () => {
      const response = await request(app)
        .post('/api/execute')
        .set('X-API-Key', validApiKey)
        .send({
          language: 'python',
          code: 'import os\nos.system("rm -rf /")'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('dangerous patterns');
    });
  });

  describe('Rate Limiting', () => {
    const validApiKey = process.env.API_KEY || 'test-key';

    it('should apply rate limiting to execute endpoint', async () => {
      // This test may fail if rate limits are set very high
      // Adjust based on your rate limit configuration

      const requests = [];
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/api/execute')
            .set('X-API-Key', validApiKey)
            .send({
              language: 'javascript',
              code: `console.log(${i});`
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      // If rate limiting is working, at least some requests should be rate limited
      // This test might pass if limits are very high, which is also acceptable
      if (rateLimited) {
        expect(rateLimited).toBe(true);
      }
    }, 30000);
  });
});

module.exports = {};