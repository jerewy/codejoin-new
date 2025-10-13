const { describe, test, expect, jest, beforeEach, afterEach } = require('@jest/globals');
const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const TerminalService = require('../../src/services/terminalService');
const { MockDockerService, MockLogger } = require('../fixtures/mockServices');
const { mockLanguageConfigs, mockSocketData, mockErrorScenarios } = require('../fixtures/mockData');
const TestHelpers = require('../utils/testHelpers');

describe('Socket.IO Event Handling', () => {
  let httpServer;
  let io;
  let serverSocket;
  let clientSocket;
  let terminalService;
  let mockDockerService;
  let mockLogger;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock services
    mockDockerService = new MockDockerService();
    mockLogger = new MockLogger();

    // Mock the dependencies
    jest.doMock('../../src/services/dockerService', () => {
      return jest.fn().mockImplementation(() => mockDockerService);
    });

    jest.doMock('../../src/utils/logger', () => mockLogger);
    jest.doMock('../../src/utils/inputHandler', () => ({
      InputHandler: jest.fn().mockImplementation(() => ({
        processInput: jest.fn().mockResolvedValue({
          success: true,
          data: 'processed-input'
        })
      }))
    }));
    jest.doMock('../../src/utils/ptyStreamProcessor', () => ({
      PTYStreamProcessor: {
        createOutputProcessor: jest.fn().mockReturnValue({
          write: jest.fn(),
          end: jest.fn(),
          removeAllListeners: jest.fn()
        })
      }
    }));

    // Create terminal service
    terminalService = new TerminalService(io);

    // Reset mock Docker service failure modes
    mockDockerService.setFailureMode('connection', false);
    mockDockerService.setFailureMode('create', false);
    mockDockerService.setFailureMode('start', false);
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Connection Handling', () => {
    test('should handle client connection', (done) => {
      const newClient = Client(`http://localhost:${httpServer.address().port}`);

      newClient.on('connect', () => {
        expect(newClient.connected).toBe(true);
        newClient.close();
        done();
      });
    });

    test('should initialize socket data on connection', () => {
      expect(serverSocket.data).toBeDefined();
      expect(serverSocket.data.connectedAt).toBeInstanceOf(Date);
      expect(serverSocket.data.errorCounts).toBeDefined();
      expect(serverSocket.data.lastErrors).toBeDefined();
      expect(serverSocket.data.recoveryAttempts).toBeDefined();
      expect(serverSocket.data.lastActivity).toBeInstanceOf(Date);
    });

    test('should handle socket errors', (done) => {
      const errorHandler = jest.fn();
      serverSocket.on('error', errorHandler);

      // Simulate socket error
      serverSocket.emit('error', new Error('Test error'));

      setTimeout(() => {
        expect(errorHandler).toHaveBeenCalled();
        done();
      }, 100);
    });

    test('should handle disconnection', (done) => {
      const disconnectHandler = jest.fn();
      serverSocket.on('disconnect', disconnectHandler);

      clientSocket.disconnect();

      setTimeout(() => {
        expect(disconnectHandler).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Terminal Start Event', () => {
    test('should start terminal session successfully', async () => {
      const responsePromise = new Promise((resolve) => {
        clientSocket.on('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      const response = await responsePromise;
      expect(response).toHaveProperty('sessionId');
      expect(typeof response.sessionId).toBe('string');
    });

    test('should reject invalid connection data', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      clientSocket.emit('terminal:start', {
        userId: 'test-user',
        // Missing projectId
      });

      const error = await errorPromise;
      expect(error.message).toContain('projectId and userId are required');
    });

    test('should handle Docker unavailable errors with retry', async () => {
      mockDockerService.setFailureMode('connection');

      const errorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      const error = await errorPromise;
      expect(error.code).toBe('DOCKER_UNAVAILABLE');
      expect(error.recoverySuggestions).toBeDefined();
      expect(error.isRetryable).toBe(true);
    });

    test('should implement exponential backoff for Docker failures', async () => {
      mockDockerService.setFailureMode('connection');

      jest.useFakeTimers();

      // First attempt
      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      const firstErrorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      const firstError = await firstErrorPromise;
      expect(firstError.failureCount).toBe(1);

      // Try again immediately - should be rejected due to backoff
      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      const secondErrorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      const secondError = await secondErrorPromise;
      expect(secondError.code).toBe('DOCKER_RATE_LIMITED');
      expect(secondError.retryAfter).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    test('should reset failure tracking on successful session start', async () => {
      mockDockerService.setFailureMode('connection');

      // First attempt fails
      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      await new Promise((resolve) => {
        clientSocket.once('terminal:error', resolve);
      });

      expect(serverSocket.data.dockerFailureCount).toBeGreaterThan(0);

      // Fix Docker and retry
      mockDockerService.setFailureMode('connection', false);

      const readyPromise = new Promise((resolve) => {
        clientSocket.once('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      await readyPromise;

      expect(serverSocket.data.dockerFailureCount).toBe(0);
    });
  });

  describe('Terminal Input Event', () => {
    let sessionId;

    beforeEach(async () => {
      const readyPromise = new Promise((resolve) => {
        clientSocket.once('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);
      const ready = await readyPromise;
      sessionId = ready.sessionId;
    });

    test('should send input to terminal session', async () => {
      const inputData = 'print("Hello, World!")\n';

      clientSocket.emit('terminal:input', {
        sessionId,
        input: inputData
      });

      await TestHelpers.delay(100);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalled();
    });

    test('should reject invalid input data', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      clientSocket.emit('terminal:input', {
        sessionId: 'invalid-session',
        input: 'test'
      });

      const error = await errorPromise;
      expect(error.message).toContain('not active');
    });

    test('should update socket activity on input', async () => {
      const initialActivity = serverSocket.data.lastActivity;

      await TestHelpers.delay(100);

      clientSocket.emit('terminal:input', {
        sessionId,
        input: 'test'
      });

      await TestHelpers.delay(100);

      expect(serverSocket.data.lastActivity).toBeInstanceOf(Date);
      expect(serverSocket.data.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
    });

    test('should handle binary data input', async () => {
      const binaryInput = Buffer.from([0x03, 0x04, 0x1b, 0x5b, 0x41]);

      clientSocket.emit('terminal:input', {
        sessionId,
        input: binaryInput
      });

      await TestHelpers.delay(100);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalled();
    });
  });

  describe('Terminal Resize Event', () => {
    let sessionId;

    beforeEach(async () => {
      const readyPromise = new Promise((resolve) => {
        clientSocket.once('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);
      const ready = await readyPromise;
      sessionId = ready.sessionId;
    });

    test('should resize terminal session', async () => {
      const resizeData = mockSocketData.resizeData;

      clientSocket.emit('terminal:resize', resizeData);

      await TestHelpers.delay(100);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.resize).toHaveBeenCalledWith({
        w: resizeData.cols,
        h: resizeData.rows
      });
    });

    test('should reject invalid resize data', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      clientSocket.emit('terminal:resize', {
        sessionId,
        cols: -1,
        rows: 24
      });

      const error = await errorPromise;
      expect(error.message).toContain('Invalid terminal dimensions');
    });

    test('should reject missing session ID', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      clientSocket.emit('terminal:resize', {
        cols: 80,
        rows: 24
      });

      const error = await errorPromise;
      expect(error.message).toContain('sessionId is required');
    });
  });

  describe('Terminal Stop Event', () => {
    let sessionId;

    beforeEach(async () => {
      const readyPromise = new Promise((resolve) => {
        clientSocket.once('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);
      const ready = await readyPromise;
      sessionId = ready.sessionId;
    });

    test('should stop terminal session', async () => {
      const exitPromise = new Promise((resolve) => {
        clientSocket.on('terminal:exit', resolve);
      });

      clientSocket.emit('terminal:stop', { sessionId });

      const exitData = await exitPromise;
      expect(exitData.sessionId).toBe(sessionId);
      expect(exitData.reason).toContain('Session stopped by user');
    });

    test('should handle stop errors gracefully', async () => {
      // Make session invalid
      terminalService.sessions.delete(sessionId);

      const errorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      clientSocket.emit('terminal:stop', { sessionId });

      const error = await errorPromise;
      expect(error.message).toContain('not active');
    });
  });

  describe('Error Recovery and Tracking', () => {
    test('should track error frequency', async () => {
      // Generate multiple errors
      for (let i = 0; i < 3; i++) {
        clientSocket.emit('terminal:start', {
          userId: 'test-user'
          // Missing projectId
        });

        await new Promise((resolve) => {
          clientSocket.once('terminal:error', resolve);
        });
      }

      const errorKey = 'UNKNOWN_terminal:start';
      expect(serverSocket.data.errorCounts[errorKey]).toBe(3);
      expect(serverSocket.data.errorCounts[errorKey]).toBeGreaterThan(2); // Persistent error
    });

    test('should provide enhanced recovery suggestions for persistent errors', async () => {
      // Generate persistent error
      for (let i = 0; i < 3; i++) {
        clientSocket.emit('terminal:start', {
          userId: 'test-user'
          // Missing projectId
        });

        await new Promise((resolve) => {
          clientSocket.once('terminal:error', resolve);
        });
      }

      const lastErrorPromise = new Promise((resolve) => {
        clientSocket.once('terminal:error', resolve);
      });

      const lastError = await lastErrorPromise;
      expect(lastError.isPersistent).toBe(true);
      expect(lastError.recoverySuggestions).toContain('Refresh the page');
    });

    test('should handle generic errors with context', async () => {
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('terminal:error', resolve);
      });

      clientSocket.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'invalid-language'
      });

      const error = await errorPromise;
      expect(error.operation).toBe('terminal:start');
      expect(error.context).toBeDefined();
    });
  });

  describe('Socket Data Cleanup', () => {
    test('should clean up socket data on disconnect', async () => {
      // Set some socket data
      serverSocket.data.dockerFailureCount = 1;
      serverSocket.data.errorCounts = { 'test_error': 1 };

      clientSocket.disconnect();

      await TestHelpers.delay(100);

      // Data should be cleaned up by disconnect handler
      expect(serverSocket.data.dockerFailureCount).toBeUndefined();
      expect(serverSocket.data.errorCounts).toBeUndefined();
    });

    test('should clean up terminal sessions on disconnect', async () => {
      // Start a session
      const readyPromise = new Promise((resolve) => {
        clientSocket.once('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);
      const ready = await readyPromise;
      const sessionId = ready.sessionId;

      expect(terminalService.sessions.has(sessionId)).toBe(true);

      // Disconnect client
      clientSocket.disconnect();

      await TestHelpers.delay(200);

      // Session should be cleaned up
      expect(terminalService.sessions.has(sessionId)).toBe(false);
    });
  });

  describe('Retry Logic with Backoff', () => {
    test('should retry operations with exponential backoff', async () => {
      let attemptCount = 0;
      const originalCreate = mockDockerService.createInteractiveContainer;

      mockDockerService.createInteractiveContainer = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return originalCreate.call(mockDockerService, mockLanguageConfigs.python);
      });

      jest.useFakeTimers();

      const readyPromise = new Promise((resolve) => {
        clientSocket.once('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      // Advance timers to trigger retries
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(2000);

      const ready = await readyPromise;

      expect(attemptCount).toBe(3);
      expect(ready.sessionId).toBeDefined();

      jest.useRealTimers();
    });

    test('should limit retry attempts', async () => {
      let attemptCount = 0;

      mockDockerService.createInteractiveContainer = jest.fn().mockImplementation(async () => {
        attemptCount++;
        throw new Error('Persistent failure');
      });

      jest.useFakeTimers();

      const errorPromise = new Promise((resolve) => {
        clientSocket.once('terminal:error', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);

      // Advance timers to trigger all retries
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(2000);
      jest.advanceTimersByTime(4000);

      const error = await errorPromise;

      expect(attemptCount).toBe(3);
      expect(error.message).toContain('Persistent failure');

      jest.useRealTimers();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent connections', async () => {
      const clients = [];
      const connections = [];

      // Create multiple clients
      for (let i = 0; i < 5; i++) {
        const client = Client(`http://localhost:${httpServer.address().port}`);
        clients.push(client);

        const connectionPromise = new Promise((resolve) => {
          client.on('connect', () => {
            const readyPromise = new Promise((readyResolve) => {
              client.on('terminal:ready', readyResolve);
            });

            client.emit('terminal:start', {
              ...mockSocketData.validConnection,
              projectId: `project-${i}`,
              userId: `user-${i}`
            });

            readyPromise.then(resolve);
          });
        });

        connections.push(connectionPromise);
      }

      const results = await Promise.all(connections);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.sessionId).toBeDefined();
      });

      // Cleanup clients
      clients.forEach(client => client.close());
    });

    test('should handle high-frequency input events', async () => {
      const readyPromise = new Promise((resolve) => {
        clientSocket.once('terminal:ready', resolve);
      });

      clientSocket.emit('terminal:start', mockSocketData.validConnection);
      const ready = await readyPromise;
      const sessionId = ready.sessionId;

      // Send multiple input events rapidly
      const inputPromises = [];
      for (let i = 0; i < 50; i++) {
        const promise = new Promise((resolve) => {
          clientSocket.emit('terminal:input', {
            sessionId,
            input: `echo "test ${i}"\n`
          });
          setTimeout(resolve, 10);
        });
        inputPromises.push(promise);
      }

      await Promise.all(inputPromises);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalledTimes(50);
    });
  });
});