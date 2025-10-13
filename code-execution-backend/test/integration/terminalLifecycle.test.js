const { describe, test, expect, jest, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const TerminalService = require('../../src/services/terminalService');
const { mockLanguageConfigs, mockTestCode, mockPTYData } = require('../fixtures/mockData');
const { MockDockerService, MockLogger } = require('../fixtures/mockServices');
const TestHelpers = require('../utils/testHelpers');

describe('Terminal Session Lifecycle Integration Tests', () => {
  let httpServer;
  let io;
  let serverSockets = [];
  let clientSockets = [];
  let terminalService;
  let mockDockerService;
  let mockLogger;

  beforeAll(async () => {
    // Create HTTP server and Socket.IO server
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
    // Cleanup all connections
    clientSockets.forEach(socket => {
      if (socket.connected) socket.close();
    });

    serverSockets.forEach(socket => {
      if (socket.connected) socket.disconnect();
    });

    io.close();
    await new Promise((resolve) => {
      httpServer.close(resolve);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock services
    mockDockerService = new MockDockerService();
    mockLogger = new MockLogger();

    // Mock dependencies
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

    // Create terminal service
    terminalService = new TerminalService(io);

    // Handle new connections
    io.on('connection', (socket) => {
      serverSockets.push(socket);
    });
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.resetModules();

    // Cleanup terminal service
    if (terminalService) {
      await terminalService.cleanup();
    }

    // Disconnect all client sockets
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    clientSockets = [];

    // Clear server sockets
    serverSockets = [];
  });

  const createClientSocket = () => {
    const client = Client(`http://localhost:${httpServer.address().port}`, {
      transports: ['websocket']
    });
    clientSockets.push(client);
    return client;
  };

  const waitForEvent = (socket, event, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(event, onEvent);
        reject(new Error(`Event ${event} not received within ${timeout}ms`));
      }, timeout);

      const onEvent = (...args) => {
        clearTimeout(timer);
        resolve(args);
      };

      socket.once(event, onEvent);
    });
  };

  describe('Complete Session Lifecycle', () => {
    test('should handle full terminal session lifecycle from start to stop', async () => {
      const client = createClientSocket();

      // Wait for connection
      await waitForEvent(client, 'connect');

      // Step 1: Start terminal session
      const startData = {
        projectId: 'test-project-123',
        userId: 'test-user-456',
        language: 'python',
        code: mockTestCode.simple.python
      };

      client.emit('terminal:start', startData);
      const [readyResponse] = await waitForEvent(client, 'terminal:ready');

      expect(readyResponse).toHaveProperty('sessionId');
      const sessionId = readyResponse.sessionId;

      // Step 2: Verify session is created and tracked
      expect(terminalService.sessions.has(sessionId)).toBe(true);
      expect(terminalService.socketSessions.has(client.id)).toBe(true);

      const session = terminalService.sessions.get(sessionId);
      expect(session.language).toBe('python');
      expect(session.projectId).toBe('test-project-123');
      expect(session.userId).toBe('test-user-456');

      // Step 3: Send input to terminal
      const inputData = 'print("Hello from integration test!")\n';
      const [dataResponse] = await new Promise((resolve) => {
        let responses = [];
        const onData = (data) => {
          responses.push(data);
          if (responses.length >= 2) { // Expect at least 2 responses
            client.off('terminal:data', onData);
            resolve(responses);
          }
        };

        client.on('terminal:data', onData);

        // Simulate PTY output after input
        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, 'Hello from integration test!\n');
          mockDockerService.simulateContainerOutput(sessionId, '>>> ');
        }, 100);

        client.emit('terminal:input', { sessionId, input: inputData });
      });

      expect(dataResponse).toHaveLength(2);
      expect(dataResponse[0].sessionId).toBe(sessionId);
      expect(dataResponse[0].chunk).toContain('Hello from integration test!');
      expect(dataResponse[1].chunk).toContain('>>>');

      // Step 4: Resize terminal
      const resizeData = { sessionId, cols: 120, rows: 40 };
      client.emit('terminal:resize', resizeData);

      // Wait a bit for resize to be processed
      await TestHelpers.delay(100);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.resize).toHaveBeenCalledWith({ w: 120, h: 40 });

      // Step 5: Send more complex input with ANSI sequences
      const ansiInput = '\x1b[31mprint("Red text")\x1b[0m\n';
      client.emit('terminal:input', { sessionId, input: ansiInput });

      await new Promise((resolve) => {
        const onData = (data) => {
          expect(data.chunk).toContain('Red text');
          client.off('terminal:data', onData);
          resolve();
        };
        client.on('terminal:data', onData);

        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, 'Red text\n>>> ');
        }, 100);
      });

      // Step 6: Stop terminal session
      client.emit('terminal:stop', { sessionId });
      const [exitResponse] = await waitForEvent(client, 'terminal:exit');

      expect(exitResponse.sessionId).toBe(sessionId);
      expect(exitResponse.reason).toContain('Session stopped by user');

      // Step 7: Verify cleanup
      expect(terminalService.sessions.has(sessionId)).toBe(false);
      expect(terminalService.socketSessions.has(client.id)).toBe(false);

      // Verify container was stopped
      expect(mockDockerService.getRunningContainers()).not.toContain(sessionId);
    });

    test('should handle session cleanup on client disconnect', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      // Start session
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'javascript'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Verify session exists
      expect(terminalService.sessions.has(sessionId)).toBe(true);

      // Disconnect client
      client.disconnect();

      // Wait for cleanup to complete
      await TestHelpers.delay(200);

      // Verify session was cleaned up
      expect(terminalService.sessions.has(sessionId)).toBe(false);
      expect(terminalService.socketSessions.has(client.id)).toBe(false);
    });

    test('should handle multiple concurrent sessions for different users', async () => {
      const clients = [];
      const sessionIds = [];

      // Create multiple clients and start sessions
      for (let i = 0; i < 3; i++) {
        const client = createClientSocket();
        clients.push(client);

        await waitForEvent(client, 'connect');

        client.emit('terminal:start', {
          projectId: `project-${i}`,
          userId: `user-${i}`,
          language: ['python', 'javascript', 'bash'][i]
        });

        const [readyResponse] = await waitForEvent(client, 'terminal:ready');
        sessionIds.push(readyResponse.sessionId);
      }

      // Verify all sessions exist
      expect(sessionIds).toHaveLength(3);
      sessionIds.forEach(sessionId => {
        expect(terminalService.sessions.has(sessionId)).toBe(true);
      });

      // Send different inputs to each session
      const testInputs = [
        'print("Python session")\n',
        'console.log("JavaScript session");\n',
        'echo "Bash session"\n'
      ];

      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const sessionId = sessionIds[i];
        const input = testInputs[i];

        const [dataResponse] = await new Promise((resolve) => {
          client.on('terminal:data', (data) => {
            resolve([data]);
            client.off('terminal:data');
          });

          setTimeout(() => {
            mockDockerService.simulateContainerOutput(sessionId, input.slice(0, -1));
          }, 100);

          client.emit('terminal:input', { sessionId, input });
        });

        expect(dataResponse.sessionId).toBe(sessionId);
      }

      // Stop all sessions
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const sessionId = sessionIds[i];

        client.emit('terminal:stop', { sessionId });
        await waitForEvent(client, 'terminal:exit');
      }

      // Verify all sessions were cleaned up
      sessionIds.forEach(sessionId => {
        expect(terminalService.sessions.has(sessionId)).toBe(false);
      });

      // Disconnect all clients
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Interactive Session Handling', () => {
    test('should handle Python interactive session with multi-line input', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      // Start Python session
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send multi-line function definition
      const multilineCode = `def factorial(n):
    if n <= 1:
        return n
    return factorial(n-1) + factorial(n-2)

print(factorial(5))
`;

      const responses = [];
      const dataPromise = new Promise((resolve) => {
        const onData = (data) => {
          responses.push(data);
          if (responses.length >= 4) { // Expect multiple responses
            client.off('terminal:data', onData);
            resolve(responses);
          }
        };
        client.on('terminal:data', onData);

        // Simulate Python REPL responses
        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, '... ');
          setTimeout(() => {
            mockDockerService.simulateContainerOutput(sessionId, '... ');
            setTimeout(() => {
              mockDockerService.simulateContainerOutput(sessionId, '... ');
              setTimeout(() => {
                mockDockerService.simulateContainerOutput(sessionId, '... ');
                setTimeout(() => {
                  mockDockerService.simulateContainerOutput(sessionId, '5\n>>> ');
                }, 100);
              }, 100);
            }, 100);
          }, 100);
        }, 100);

        client.emit('terminal:input', { sessionId, input: multilineCode });
      });

      const dataResponses = await dataPromise;

      // Verify multi-line input was processed correctly
      const dataChunks = dataResponses.map(r => r.chunk).join('');
      expect(dataChunks).toContain('...');
      expect(dataChunks).toContain('5');
      expect(dataChunks).toContain('>>>');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle interactive input() function in Python', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      // Start Python session
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send code with input() function
      const interactiveCode = 'name = input("Enter your name: ")\nprint(f"Hello, {name}!")\n';

      // Send the code
      client.emit('terminal:input', { sessionId, input: interactiveCode });

      // Wait for prompt
      const [promptResponse] = await waitForEvent(client, 'terminal:data');
      expect(promptResponse.chunk).toContain('Enter your name:');

      // Send user input
      client.emit('terminal:input', { sessionId, input: 'Alice\n' });

      // Wait for output
      const [outputResponse] = await waitForEvent(client, 'terminal:data');
      expect(outputResponse.chunk).toContain('Hello, Alice!');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle Java JShell session', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      // Start Java session
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'java'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send Java code
      const javaCode = 'int x = 5;\nint y = 10;\nSystem.out.println("Sum: " + (x + y));\n';

      client.emit('terminal:input', { sessionId, input: javaCode });

      // Simulate JShell responses
      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'x ==> 5\n');
        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, 'y ==> 10\n');
          setTimeout(() => {
            mockDockerService.simulateContainerOutput(sessionId, 'Sum: 15\n');
          }, 100);
        }, 100);
      }, 100);

      // Collect responses
      const responses = [];
      await new Promise((resolve) => {
        const onData = (data) => {
          responses.push(data);
          if (responses.length >= 3) {
            client.off('terminal:data', onData);
            resolve();
          }
        };
        client.on('terminal:data', onData);
      });

      expect(responses.length).toBeGreaterThanOrEqual(3);
      const output = responses.map(r => r.chunk).join('');
      expect(output).toContain('Sum: 15');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });

  describe('PTY Data Processing Integration', () => {
    test('should preserve ANSI sequences throughout session', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send ANSI escape sequences
      const ansiInput = '\x1b[31mprint("Red text")\x1b[0m\n\x1b[32mprint("Green text")\x1b[0m\n';

      client.emit('terminal:input', { sessionId, input: ansiInput });

      // Simulate ANSI output from container
      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId,
          '\x1b[31mRed text\x1b[0m\n\x1b[32mGreen text\x1b[0m\n>>> '
        );
      }, 100);

      const [dataResponse] = await waitForEvent(client, 'terminal:data');

      // Verify ANSI sequences are preserved
      expect(dataResponse.chunk).toContain('\x1b[31m');
      expect(dataResponse.chunk).toContain('\x1b[0m');
      expect(dataResponse.chunk).toContain('\x1b[32m');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle control characters correctly', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'bash'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send Ctrl+C (interrupt)
      client.emit('terminal:input', { sessionId, input: '\x03' });

      // Simulate interrupt response
      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '^C\n$ ');
      }, 100);

      const [dataResponse] = await waitForEvent(client, 'terminal:data');

      expect(dataResponse.chunk).toContain('^C');
      expect(dataResponse.chunk).toContain('\x03');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle Unicode and multi-byte characters', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send Unicode text
      const unicodeInput = 'print("Hello 🚀 测试 العربية")\n';

      client.emit('terminal:input', { sessionId, input: unicodeInput });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Hello 🚀 测试 العربية\n>>> ');
      }, 100);

      const [dataResponse] = await waitForEvent(client, 'terminal:data');

      expect(dataResponse.chunk).toContain('🚀');
      expect(dataResponse.chunk).toContain('测试');
      expect(dataResponse.chunk).toContain('العربية');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from temporary Docker connection failures', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      // Set Docker to fail initially
      mockDockerService.setFailureMode('connection');

      // Attempt to start session
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      // Should receive error
      const [errorResponse] = await waitForEvent(client, 'terminal:error');
      expect(errorResponse.code).toBe('DOCKER_UNAVAILABLE');
      expect(errorResponse.recoverySuggestions).toBeDefined();

      // Fix Docker connection
      mockDockerService.setFailureMode('connection', false);

      // Advance timer past backoff period
      jest.advanceTimersByTime(6000);

      // Try again
      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      // Should succeed this time
      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      expect(readyResponse.sessionId).toBeDefined();

      client.emit('terminal:stop', { sessionId: readyResponse.sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle container crashes gracefully', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Simulate container crash
      setTimeout(() => {
        mockDockerService.simulateContainerError(sessionId, new Error('Container crashed'));
      }, 100);

      // Should receive error
      const [errorResponse] = await waitForEvent(client, 'terminal:error');
      expect(errorResponse.message).toContain('Container crashed');

      // Should receive exit event
      const [exitResponse] = await waitForEvent(client, 'terminal:exit');
      expect(exitResponse.sessionId).toBe(sessionId);
      expect(exitResponse.reason).toContain('Terminal stream closed');

      // Verify session was cleaned up
      expect(terminalService.sessions.has(sessionId)).toBe(false);

      client.disconnect();
    });

    test('should handle socket disconnection during active session', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send some input
      client.emit('terminal:input', { sessionId, input: 'print("test")\n' });

      // Abruptly disconnect client
      client.disconnect();

      // Wait for cleanup
      await TestHelpers.delay(200);

      // Verify session was cleaned up
      expect(terminalService.sessions.has(sessionId)).toBe(false);
      expect(mockDockerService.getRunningContainers()).not.toContain(sessionId);
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle high-frequency input without memory leaks', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      const memoryMonitor = TestHelpers.createMemoryMonitor();
      memoryMonitor.measure();

      // Send many inputs rapidly
      const inputPromises = [];
      for (let i = 0; i < 100; i++) {
        const promise = new Promise((resolve) => {
          setTimeout(() => {
            client.emit('terminal:input', {
              sessionId,
              input: `print("Message ${i}")\n`
            });
            resolve();
          }, i * 10);
        });
        inputPromises.push(promise);
      }

      await Promise.all(inputPromises);
      memoryMonitor.measure();

      // Memory growth should be reasonable
      const memoryGrowth = memoryMonitor.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle multiple simultaneous resize operations', async () => {
      const client = createClientSocket();
      await waitForEvent(client, 'connect');

      client.emit('terminal:start', {
        projectId: 'test-project',
        userId: 'test-user',
        language: 'python'
      });

      const [readyResponse] = await waitForEvent(client, 'terminal:ready');
      const sessionId = readyResponse.sessionId;

      // Send multiple resize operations rapidly
      const resizePromises = [];
      for (let i = 0; i < 10; i++) {
        const promise = new Promise((resolve) => {
          setTimeout(() => {
            client.emit('terminal:resize', {
              sessionId,
              cols: 80 + i,
              rows: 24 + i
            });
            resolve();
          }, i * 5);
        });
        resizePromises.push(promise);
      }

      await Promise.all(resizePromises);

      // Last resize should be applied
      const container = mockDockerService.getContainer(sessionId);
      expect(container.resize).toHaveBeenLastCalledWith({
        w: 89, // 80 + 9
        h: 33  // 24 + 9
      });

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });
});