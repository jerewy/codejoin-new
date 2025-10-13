const { describe, test, expect, jest, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const TerminalService = require('../../src/services/terminalService');
const { mockLanguageConfigs, mockErrorScenarios } = require('../fixtures/mockData');
const { MockDockerService, MockLogger } = require('../fixtures/mockServices');
const TestHelpers = require('../utils/testHelpers');

describe('Error Recovery and Resilience Tests', () => {
  let httpServer;
  let io;
  let clientSockets = [];
  let terminalService;
  let mockDockerService;
  let mockLogger;

  beforeAll(async () => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    clientSockets.forEach(socket => {
      if (socket.connected) socket.close();
    });

    io.close();
    await new Promise((resolve) => {
      httpServer.close(resolve);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockDockerService = new MockDockerService();
    mockLogger = new MockLogger();

    jest.doMock('../../src/services/dockerService', () => {
      return jest.fn().mockImplementation(() => mockDockerService);
    });

    jest.doMock('../../src/utils/logger', () => mockLogger);
    jest.doMock('../../src/utils/inputHandler', () => ({
      InputHandler: jest.fn().mockImplementation(() => ({
        processInput: jest.fn().mockImplementation(async (input) => ({
          success: true,
          data: input,
          metadata: { type: typeof input }
        }))
      }))
    }));
    jest.doMock('../../src/utils/ptyStreamProcessor', () => ({
      PTYStreamProcessor: {
        createOutputProcessor: jest.fn().mockReturnValue({
          write: jest.fn(),
          end: jest.fn(),
          removeAllListeners: jest.fn(),
          on: jest.fn()
        })
      }
    }));

    terminalService = new TerminalService(io);

    io.on('connection', (socket) => {
      // Mock socket connection
    });
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.resetModules();

    if (terminalService) {
      await terminalService.cleanup();
    }

    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    clientSockets = [];
  });

  const createClient = () => {
    const client = Client(`http://localhost:${httpServer.address().port}`, {
      transports: ['websocket']
    });
    clientSockets.push(client);
    return client;
  };

  const createSession = async (client, language = 'python') => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Session creation timeout'));
      }, 5000);

      client.on('connect', () => {
        client.emit('terminal:start', {
          projectId: 'test-project',
          userId: 'test-user',
          language
        });
      });

      client.on('terminal:ready', (response) => {
        clearTimeout(timeout);
        resolve(response.sessionId);
      });

      client.on('terminal:error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Session creation failed: ${error.message}`));
      });
    });
  };

  describe('Docker Connection Failures', () => {
    test('should handle Docker daemon not running', async () => {
      const client = createClient();

      // Simulate Docker daemon not running
      mockDockerService.setFailureMode('connection');

      const errorPromise = new Promise((resolve) => {
        client.on('terminal:error', resolve);
      });

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const error = await errorPromise;

      expect(error.code).toBe('DOCKER_UNAVAILABLE');
      expect(error.recoverySuggestions).toBeDefined();
      expect(error.recoverySuggestions).toContain('Start Docker Desktop');
      expect(error.isRetryable).toBe(true);

      client.disconnect();
    });

    test('should implement exponential backoff for Docker failures', async () => {
      const client = createClient();
      mockDockerService.setFailureMode('connection');

      const errors = [];

      // First attempt
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const firstErrorPromise = new Promise((resolve) => {
        client.on('terminal:error', (error) => {
          errors.push(error);
          resolve(error);
        });
      });

      const firstError = await firstErrorPromise;
      expect(firstError.failureCount).toBe(1);
      expect(firstError.backoffSeconds).toBe(5);

      // Immediate retry should be rate limited
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const secondErrorPromise = new Promise((resolve) => {
        client.on('terminal:error', (error) => {
          errors.push(error);
          resolve(error);
        });
      });

      const secondError = await secondErrorPromise;
      expect(secondError.code).toBe('DOCKER_RATE_LIMITED');
      expect(secondError.retryAfter).toBeGreaterThan(0);

      // Advance time past backoff period
      jest.advanceTimersByTime(6000);

      // Third attempt should work if Docker is available
      mockDockerService.setFailureMode('connection', false);

      const readyPromise = new Promise((resolve) => {
        client.on('terminal:ready', resolve);
      });

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const ready = await readyPromise;
      expect(ready.sessionId).toBeDefined();

      client.emit('terminal:stop', { sessionId: ready.sessionId });
      client.disconnect();
    });

    test('should handle Docker permission errors', async () => {
      const client = createClient();

      // Mock Docker service to throw permission error
      const originalCreate = mockDockerService.createInteractiveContainer;
      mockDockerService.createInteractiveContainer = jest.fn().mockImplementation(() => {
        const error = new Error('permission denied while trying to connect to the Docker daemon socket');
        error.code = 'EPERM';
        throw error;
      });

      const errorPromise = new Promise((resolve) => {
        client.on('terminal:error', resolve);
      });

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const error = await errorPromise;

      expect(error.code).toBe('EPERM');
      expect(error.message).toContain('permission denied');
      expect(error.recoverySuggestions).toBeDefined();

      // Restore original function
      mockDockerService.createInteractiveContainer = originalCreate;
      client.disconnect();
    });

    test('should handle Docker image not found errors', async () => {
      const client = createClient();

      // Mock image not found error
      const originalCreate = mockDockerService.createInteractiveContainer;
      mockDockerService.createInteractiveContainer = jest.fn().mockImplementation(() => {
        const error = new Error('no such image: code-execution-python:latest');
        error.code = 'DOCKER_IMAGE_MISSING';
        throw error;
      });

      const errorPromise = new Promise((resolve) => {
        client.on('terminal:error', resolve);
      });

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const error = await errorPromise;

      expect(error.code).toBe('DOCKER_IMAGE_MISSING');
      expect(error.message).toContain('not found');
      expect(error.recoverySuggestions).toBeDefined();

      // Restore original function
      mockDockerService.createInteractiveContainer = originalCreate;
      client.disconnect();
    });
  });

  describe('Container Runtime Failures', () => {
    test('should handle container startup failures', async () => {
      const client = createClient();

      // Mock container startup failure
      mockDockerService.setFailureMode('start');

      const errorPromise = new Promise((resolve) => {
        client.on('terminal:error', resolve);
      });

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const error = await errorPromise;

      expect(error.message).toContain('Failed to create container');
      expect(error.recoverySuggestions).toBeDefined();

      mockDockerService.setFailureMode('start', false);
      client.disconnect();
    });

    test('should handle container crashes during session', async () => {
      const client = createClient();

      // Create successful session first
      mockDockerService.setFailureMode('connection', false);
      const sessionId = await createSession(client, 'python');

      // Simulate container crash
      setTimeout(() => {
        mockDockerService.simulateContainerError(sessionId, new Error('Container crashed unexpectedly'));
      }, 100);

      const errorPromise = new Promise((resolve) => {
        client.on('terminal:error', resolve);
      });

      const exitPromise = new Promise((resolve) => {
        client.on('terminal:exit', resolve);
      });

      const [error, exit] = await Promise.all([errorPromise, exitPromise]);

      expect(error.message).toContain('Container crashed');
      expect(exit.sessionId).toBe(sessionId);
      expect(exit.reason).toContain('Terminal stream closed');

      // Verify session was cleaned up
      expect(terminalService.sessions.has(sessionId)).toBe(false);

      client.disconnect();
    });

    test('should handle container timeouts', async () => {
      const client = createClient();

      // Mock container that times out
      const originalWait = mockDockerService.waitForContainer;
      mockDockerService.waitForContainer = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Container execution timeout')), 100);
        });
      });

      const sessionId = await createSession(client, 'python');

      // Simulate timeout
      setTimeout(() => {
        mockDockerService.simulateContainerExit(sessionId);
      }, 150);

      const exitPromise = new Promise((resolve) => {
        client.on('terminal:exit', resolve);
      });

      const exit = await exitPromise;

      expect(exit.sessionId).toBe(sessionId);

      // Restore original function
      mockDockerService.waitForContainer = originalWait;
      client.disconnect();
    });
  });

  describe('Network and Socket Failures', () => {
    test('should handle socket disconnection during session', async () => {
      const client = createClient();

      const sessionId = await createSession(client, 'python');

      // Abruptly disconnect client
      client.disconnect();

      // Wait for cleanup
      await TestHelpers.delay(200);
      jest.advanceTimersByTime(200);

      // Verify session was cleaned up
      expect(terminalService.sessions.has(sessionId)).toBe(false);
      expect(terminalService.socketSessions.has(client.id)).toBe(false);
    });

    test('should handle socket emit failures', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Mock socket emit to fail
      const originalEmit = client.emit;
      client.emit = jest.fn().mockImplementation((event, data) => {
        if (event === 'terminal:input') {
          throw new Error('Socket emit failed');
        }
        return originalEmit.call(client, event, data);
      });

      // Send input that will fail
      client.emit('terminal:input', {
        sessionId,
        input: 'print("test")\n'
      });

      // Should not crash the service
      expect(terminalService.sessions.has(sessionId)).toBe(true);

      // Restore original emit
      client.emit = originalEmit;
      client.disconnect();
    });

    test('should handle multiple rapid socket connections and disconnections', async () => {
      const clients = [];
      const sessionIds = [];

      // Create and rapidly disconnect multiple clients
      for (let i = 0; i < 10; i++) {
        const client = createClient();
        clients.push(client);

        try {
          const sessionId = await Promise.race([
            createSession(client, 'python'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
          ]);
          sessionIds.push(sessionId);
        } catch (error) {
          // Some sessions might fail, which is acceptable
        }

        // Immediately disconnect
        client.disconnect();
      }

      // Wait for cleanup
      await TestHelpers.delay(1000);
      jest.advanceTimersByTime(1000);

      // Most sessions should be cleaned up
      const remainingSessions = sessionIds.filter(id => terminalService.sessions.has(id));
      expect(remainingSessions.length).toBeLessThan(3);
    });
  });

  describe('Input Processing Failures', () => {
    test('should handle malformed input data', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Send various types of malformed input
      const malformedInputs = [
        null,
        undefined,
        '',
        Buffer.from([]),
        { invalid: 'object' },
        12345
      ];

      for (const input of malformedInputs) {
        const errorPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 1000);

          client.on('terminal:error', (error) => {
            clearTimeout(timeout);
            resolve(error);
          });
        });

        client.emit('terminal:input', { sessionId, input });

        // Wait a bit for processing
        await TestHelpers.delay(100);
        jest.advanceTimersByTime(100);

        // Should not crash the session
        expect(terminalService.sessions.has(sessionId)).toBe(true);
      }

      client.emit('terminal:stop', { sessionId });
      client.disconnect();
    });

    test('should handle excessively large input', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Send very large input
      const largeInput = 'x'.repeat(10 * 1024 * 1024); // 10MB

      // Mock input handler to reject large input
      const originalInputHandler = terminalService.inputHandlers.get('python');
      if (originalInputHandler) {
        originalInputHandler.processInput = jest.fn().mockResolvedValue({
          success: false,
          error: 'Input too large'
        });
      }

      client.emit('terminal:input', { sessionId, input: largeInput });

      // Should handle gracefully without crashing
      await TestHelpers.delay(1000);
      jest.advanceTimersByTime(1000);

      expect(terminalService.sessions.has(sessionId)).toBe(true);

      client.emit('terminal:stop', { sessionId });
      client.disconnect();
    });

    test('should handle binary data corruption', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Send corrupted binary data
      const corruptedData = Buffer.from([
        0xFF, 0xFE, 0x00, 0x00, // Invalid UTF-8 sequence
        0x80, 0x81, 0x82, 0x83, // Invalid continuation bytes
        0xC0, 0xC1              // Overlong sequences
      ]);

      client.emit('terminal:input', { sessionId, input: corruptedData });

      // Should handle gracefully
      await TestHelpers.delay(500);
      jest.advanceTimersByTime(500);

      expect(terminalService.sessions.has(sessionId)).toBe(true);

      client.emit('terminal:stop', { sessionId });
      client.disconnect();
    });
  });

  describe('PTY Stream Failures', () => {
    test('should handle PTY stream errors', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Simulate PTY stream error
      setTimeout(() => {
        const container = mockDockerService.getContainer(sessionId);
        if (container && container.stream) {
          container.stream.emit('error', new Error('PTY stream error'));
        }
      }, 100);

      const errorPromise = new Promise((resolve) => {
        client.on('terminal:error', resolve);
      });

      const error = await errorPromise;

      expect(error.message).toContain('PTY stream error');
      expect(error.sessionId).toBe(sessionId);

      client.disconnect();
    });

    test('should handle PTY stream closure', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Simulate PTY stream closure
      setTimeout(() => {
        const container = mockDockerService.getContainer(sessionId);
        if (container && container.stream) {
          container.stream.emit('close');
        }
      }, 100);

      const exitPromise = new Promise((resolve) => {
        client.on('terminal:exit', resolve);
      });

      const exit = await exitPromise;

      expect(exit.sessionId).toBe(sessionId);
      expect(exit.reason).toContain('Terminal stream closed');

      client.disconnect();
    });

    test('should handle PTY data processing failures', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Mock PTY stream processor to fail
      const originalProcessor = terminalService.streamProcessors.get(sessionId);
      if (originalProcessor) {
        originalProcessor.write = jest.fn().mockImplementation(() => {
          throw new Error('Data processing failed');
        });
      }

      // Send input that triggers processing
      client.emit('terminal:input', {
        sessionId,
        input: 'print("test")\n'
      });

      // Should fallback gracefully
      await TestHelpers.delay(500);
      jest.advanceTimersByTime(500);

      expect(terminalService.sessions.has(sessionId)).toBe(true);

      client.emit('terminal:stop', { sessionId });
      client.disconnect();
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle memory pressure gracefully', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Simulate memory pressure by creating many sessions
      const additionalClients = [];
      try {
        for (let i = 0; i < 100; i++) {
          const additionalClient = createClient();
          additionalClients.push(additionalClient);

          try {
            await createSession(additionalClient, 'python');
          } catch (error) {
            // Expected to fail at some point due to resource limits
            break;
          }
        }
      } catch (error) {
        // Expected
      }

      // Original session should still be functional
      expect(terminalService.sessions.has(sessionId)).toBe(true);

      // Cleanup additional clients
      additionalClients.forEach(client => {
        if (client.connected) client.disconnect();
      });

      client.emit('terminal:stop', { sessionId });
      client.disconnect();
    });

    test('should handle file descriptor exhaustion', async () => {
      const client = createClient();
      const sessionId = await createSession(client, 'python');

      // Simulate many file descriptors being used
      const container = mockDockerService.getContainer(sessionId);
      if (container && container.stream) {
        // Create many event listeners (simulating file descriptor usage)
        for (let i = 0; i < 1000; i++) {
          container.stream.on(`test-event-${i}`, () => {});
        }
      }

      // Should still handle new operations
      client.emit('terminal:input', {
        sessionId,
        input: 'print("test")\n'
      });

      await TestHelpers.delay(500);
      jest.advanceTimersByTime(500);

      expect(terminalService.sessions.has(sessionId)).toBe(true);

      client.emit('terminal:stop', { sessionId });
      client.disconnect();
    });
  });

  describe('Cascading Failure Scenarios', () => {
    test('should handle multiple simultaneous failures', async () => {
      const clients = [];
      const sessionIds = [];

      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        const client = createClient();
        clients.push(client);

        try {
          const sessionId = await createSession(client, 'python');
          sessionIds.push(sessionId);
        } catch (error) {
          // Some sessions might fail
        }
      }

      // Trigger multiple simultaneous failures
      mockDockerService.setFailureMode('connection');

      const errors = [];
      const exits = [];

      // Listen for errors and exits
      clients.forEach((client, index) => {
        client.on('terminal:error', (error) => {
          errors.push({ clientIndex: index, error });
        });

        client.on('terminal:exit', (exit) => {
          exits.push({ clientIndex: index, exit });
        });
      });

      // Send input to all sessions (should trigger failures)
      sessionIds.forEach((sessionId, index) => {
        if (clients[index] && clients[index].connected) {
          clients[index].emit('terminal:input', {
            sessionId,
            input: 'print("test")\n'
          });
        }
      });

      // Wait for failures to propagate
      await TestHelpers.delay(1000);
      jest.advanceTimersByTime(1000);

      // System should handle multiple failures gracefully
      expect(errors.length + exits.length).toBeGreaterThan(0);

      // Cleanup
      clients.forEach(client => {
        if (client.connected) client.disconnect();
      });
    });

    test('should recover from temporary system overload', async () => {
      const client = createClient();

      // Simulate system overload
      mockDockerService.setConnectionLatency(5000); // Very slow connection

      const errorPromise = new Promise((resolve) => {
        client.on('terminal:error', resolve);
      });

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const error = await errorPromise;
      expect(error.code).toBe('DOCKER_UNAVAILABLE');

      // Simulate recovery
      mockDockerService.setConnectionLatency(0);

      // Advance time past backoff
      jest.advanceTimersByTime(6000);

      // Should be able to create session after recovery
      const readyPromise = new Promise((resolve) => {
        client.on('terminal:ready', resolve);
      });

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const ready = await readyPromise;
      expect(ready.sessionId).toBeDefined();

      client.emit('terminal:stop', { sessionId: ready.sessionId });
      client.disconnect();
    });
  });

  describe('Error Recovery Validation', () => {
    test('should maintain system stability during repeated failures', async () => {
      const client = createClient();
      let failureCount = 0;
      let recoveryCount = 0;

      // Simulate repeated failures and recoveries
      for (let i = 0; i < 5; i++) {
        // Induce failure
        mockDockerService.setFailureMode('connection');

        const errorPromise = new Promise((resolve) => {
          client.on('terminal:error', resolve);
        });

        client.emit('terminal:start', {
          projectId: 'test-project',
          userId: 'test-user',
          language: 'python'
        });

        await errorPromise;
        failureCount++;

        // Recovery
        mockDockerService.setFailureMode('connection, false');

        // Advance past backoff
        jest.advanceTimersByTime(Math.pow(2, i) * 5000);

        const readyPromise = new Promise((resolve) => {
          client.on('terminal:ready', resolve);
        });

        client.emit('terminal:start', {
          projectId: 'test-project',
          userId: 'test-user',
          language: 'python'
        });

        try {
          const ready = await readyPromise;
          recoveryCount++;

          // Stop the session
          client.emit('terminal:stop', { sessionId: ready.sessionId });
          await TestHelpers.delay(100);
        } catch (error) {
          // Recovery might fail on later attempts
        }
      }

      // Should handle repeated failures gracefully
      expect(failureCount).toBe(5);
      expect(recoveryCount).toBeGreaterThan(0);

      // System should still be functional
      expect(terminalService.sessions.size).toBe(0);

      client.disconnect();
    });
  });
});