const { describe, test, expect, jest, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const TerminalService = require('../../src/services/terminalService');
const { mockLanguageConfigs } = require('../fixtures/mockData');
const { MockDockerService, MockLogger } = require('../fixtures/mockServices');
const TestHelpers = require('../utils/testHelpers');

describe('Concurrent Sessions Performance Tests', () => {
  let httpServer;
  let io;
  let terminalService;
  let mockDockerService;
  let mockLogger;
  let serverAddress;

  beforeAll(async () => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      maxHttpBufferSize: 1e8 // Increase buffer size for performance tests
    });

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverAddress = `http://localhost:${httpServer.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
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
      // Mock socket connection handling
    });
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.resetModules();

    if (terminalService) {
      await terminalService.cleanup();
    }
  });

  const createClient = () => {
    return Client(serverAddress, {
      transports: ['websocket'],
      forceNew: true
    });
  };

  const createSession = async (client, language = 'python') => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Session creation timeout'));
      }, 10000);

      client.on('connect', () => {
        client.emit('terminal:start', {
          projectId: `project-${Math.random()}`,
          userId: `user-${Math.random()}`,
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

  const sendInput = (client, sessionId, input) => {
    return new Promise((resolve) => {
      client.emit('terminal:input', { sessionId, input });
      setTimeout(resolve, 50); // Small delay to ensure processing
    });
  };

  const waitForData = (client, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        client.off('terminal:data', onData);
        reject(new Error('Data timeout'));
      }, timeout);

      const onData = (data) => {
        clearTimeout(timer);
        resolve(data);
      };

      client.once('terminal:data', onData);
    });
  };

  describe('Concurrent Session Creation', () => {
    test('should handle 50 concurrent session creations', async () => {
      const numSessions = 50;
      const clients = [];
      const sessionPromises = [];

      const memoryMonitor = TestHelpers.createMemoryMonitor();
      memoryMonitor.measure();

      // Create multiple clients and sessions concurrently
      for (let i = 0; i < numSessions; i++) {
        const client = createClient();
        clients.push(client);

        const sessionPromise = createSession(client, ['python', 'javascript', 'bash'][i % 3]);
        sessionPromises.push(sessionPromise);
      }

      // Wait for all sessions to be created
      const startTime = Date.now();
      const sessionIds = await Promise.all(sessionPromises);
      const creationTime = Date.now() - startTime;

      memoryMonitor.measure();

      // Verify all sessions were created successfully
      expect(sessionIds).toHaveLength(numSessions);
      sessionIds.forEach(sessionId => {
        expect(sessionId).toBeDefined();
        expect(typeof sessionId).toBe('string');
        expect(terminalService.sessions.has(sessionId)).toBe(true);
      });

      // Performance assertions
      expect(creationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(terminalService.sessions.size).toBe(numSessions);

      // Memory usage should be reasonable
      const memoryGrowth = memoryMonitor.getMemoryGrowth();
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB for 50 sessions

      // Cleanup
      clients.forEach(client => {
        if (client.connected) client.disconnect();
      });

      await TestHelpers.delay(1000);
      jest.advanceTimersByTime(1000);
    }, 30000);

    test('should handle 100 concurrent session creations with different languages', async () => {
      const numSessions = 100;
      const clients = [];
      const sessionPromises = [];
      const languages = ['python', 'javascript', 'java', 'bash'];

      const performanceData = {
        startTime: Date.now(),
        sessionCreationTimes: [],
        errors: []
      };

      // Create sessions with performance tracking
      for (let i = 0; i < numSessions; i++) {
        const client = createClient();
        clients.push(client);

        const language = languages[i % languages.length];
        const sessionStartTime = Date.now();

        const sessionPromise = createSession(client, language)
          .then(sessionId => {
            performanceData.sessionCreationTimes.push(Date.now() - sessionStartTime);
            return sessionId;
          })
          .catch(error => {
            performanceData.errors.push({ index: i, error: error.message });
            throw error;
          });

        sessionPromises.push(sessionPromise);
      }

      // Wait for all sessions
      const sessionIds = await Promise.allSettled(sessionPromises);

      const totalTime = Date.now() - performanceData.startTime;

      // Analyze results
      const successfulSessions = sessionIds.filter(result => result.status === 'fulfilled');
      const failedSessions = sessionIds.filter(result => result.status === 'rejected');

      expect(successfulSessions.length).toBeGreaterThanOrEqual(numSessions * 0.95); // At least 95% success rate
      expect(failedSessions.length).toBeLessThanOrEqual(numSessions * 0.05); // Less than 5% failure rate

      // Performance metrics
      const avgCreationTime = performanceData.sessionCreationTimes.reduce((a, b) => a + b, 0) / performanceData.sessionCreationTimes.length;
      const maxCreationTime = Math.max(...performanceData.sessionCreationTimes);

      expect(avgCreationTime).toBeLessThan(500); // Average under 500ms
      expect(maxCreationTime).toBeLessThan(2000); // Max under 2 seconds
      expect(totalTime).toBeLessThan(10000); // Total under 10 seconds

      // Cleanup
      clients.forEach(client => {
        if (client.connected) client.disconnect();
      });

      jest.advanceTimersByTime(2000);
    }, 60000);
  });

  describe('Concurrent Input/Output Operations', () => {
    test('should handle high-frequency input across multiple sessions', async () => {
      const numSessions = 20;
      const clients = [];
      const sessionIds = [];

      // Create sessions first
      for (let i = 0; i < numSessions; i++) {
        const client = createClient();
        clients.push(client);

        const sessionId = await createSession(client, 'python');
        sessionIds.push(sessionId);

        // Simulate Python REPL ready state
        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, '>>> ');
        }, 50 + i * 10);
      }

      await TestHelpers.delay(1000);
      jest.advanceTimersByTime(1000);

      // Measure performance
      const memoryMonitor = TestHelpers.createMemoryMonitor();
      memoryMonitor.measure();

      const inputPromises = [];
      const outputPromises = [];
      const startTime = Date.now();

      // Send multiple inputs to each session
      for (let i = 0; i < numSessions; i++) {
        const client = clients[i];
        const sessionId = sessionIds[i];

        // Send 10 inputs to each session
        for (let j = 0; j < 10; j++) {
          const inputPromise = sendInput(client, sessionId, `print("Session ${i}, Input ${j}")\n`);
          inputPromises.push(inputPromise);

          // Simulate output for each input
          const outputPromise = new Promise((resolve) => {
            setTimeout(() => {
              mockDockerService.simulateContainerOutput(
                sessionId,
                `Session ${i}, Input ${j}\n>>> `
              );
              resolve();
            }, 100 + j * 50 + i * 10);
          });
          outputPromises.push(outputPromise);
        }
      }

      // Wait for all inputs and outputs
      await Promise.all([...inputPromises, ...outputPromises]);
      const totalTime = Date.now() - startTime;

      memoryMonitor.measure();

      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(memoryMonitor.getMemoryGrowth()).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth

      // Verify all sessions are still active
      expect(terminalService.sessions.size).toBe(numSessions);

      // Cleanup
      clients.forEach(client => {
        if (client.connected) client.disconnect();
      });

      jest.advanceTimersByTime(1000);
    }, 30000);

    test('should handle concurrent resize operations', async () => {
      const numSessions = 30;
      const clients = [];
      const sessionIds = [];

      // Create sessions
      for (let i = 0; i < numSessions; i++) {
        const client = createClient();
        clients.push(client);

        const sessionId = await createSession(client, 'bash');
        sessionIds.push(sessionId);
      }

      await TestHelpers.delay(500);
      jest.advanceTimersByTime(500);

      // Perform concurrent resize operations
      const resizePromises = [];
      const startTime = Date.now();

      for (let i = 0; i < numSessions; i++) {
        const client = clients[i];
        const sessionId = sessionIds[i];

        // Multiple resize operations per session
        for (let j = 0; j < 5; j++) {
          const resizePromise = new Promise((resolve) => {
            setTimeout(() => {
              client.emit('terminal:resize', {
                sessionId,
                cols: 80 + j,
                rows: 24 + j
              });
              resolve();
            }, Math.random() * 1000);
          });
          resizePromises.push(resizePromise);
        }
      }

      await Promise.all(resizePromises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(3000);
      expect(terminalService.sessions.size).toBe(numSessions);

      // Cleanup
      clients.forEach(client => {
        if (client.connected) client.disconnect();
      });

      jest.advanceTimersByTime(1000);
    }, 20000);
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory during session lifecycle', async () => {
      const memoryMeasurements = [];
      const numCycles = 5;
      const sessionsPerCycle = 20;

      const memoryMonitor = TestHelpers.createMemoryMonitor();
      memoryMonitor.measure();

      for (let cycle = 0; cycle < numCycles; cycle++) {
        const clients = [];
        const sessionIds = [];

        // Create sessions
        for (let i = 0; i < sessionsPerCycle; i++) {
          const client = createClient();
          clients.push(client);

          const sessionId = await createSession(client, 'python');
          sessionIds.push(sessionId);
        }

        // Send some input
        for (let i = 0; i < clients.length; i++) {
          await sendInput(clients[i], sessionIds[i], 'print("test")\n');
          mockDockerService.simulateContainerOutput(sessionIds[i], 'test\n>>> ');
        }

        memoryMonitor.measure();
        memoryMeasurements.push(memoryMonitor.getMemoryGrowth());

        // Stop all sessions
        for (let i = 0; i < clients.length; i++) {
          clients[i].emit('terminal:stop', { sessionId: sessionIds[i] });
        }

        // Disconnect clients
        clients.forEach(client => {
          if (client.connected) client.disconnect();
        });

        await TestHelpers.delay(500);
        jest.advanceTimersByTime(500);
      }

      // Memory should not grow continuously
      const maxMemoryGrowth = Math.max(...memoryMeasurements);
      expect(maxMemoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

      // Final cleanup should return memory to baseline
      await TestHelpers.delay(2000);
      jest.advanceTimersByTime(2000);

      expect(terminalService.sessions.size).toBe(0);
      expect(terminalService.socketSessions.size).toBe(0);
    }, 60000);

    test('should handle graceful degradation under load', async () => {
      const maxSessions = 200;
      const clients = [];
      const successfulSessions = [];
      const failedSessions = [];

      // Try to create more sessions than typical limit
      for (let i = 0; i < maxSessions; i++) {
        const client = createClient();
        clients.push(client);

        try {
          const sessionId = await Promise.race([
            createSession(client, 'python'),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
          successfulSessions.push(sessionId);
        } catch (error) {
          failedSessions.push(error.message);
        }

        // Add small delay between session creations
        await TestHelpers.delay(10);
      }

      // System should handle overload gracefully
      expect(successfulSessions.length).toBeGreaterThan(0); // At least some sessions should succeed
      expect(successfulSessions.length + failedSessions.length).toBe(maxSessions);

      // Cleanup successful sessions
      for (let i = 0; i < successfulSessions.length; i++) {
        clients[i].emit('terminal:stop', { sessionId: successfulSessions[i] });
      }

      // Disconnect all clients
      clients.forEach(client => {
        if (client.connected) client.disconnect();
      });

      await TestHelpers.delay(1000);
      jest.advanceTimersByTime(1000);
    }, 120000);
  });

  describe('Stress Testing', () => {
    test('should handle rapid session creation and destruction', async () => {
      const numCycles = 10;
      const sessionsPerCycle = 15;
      const clients = [];
      const performanceMetrics = [];

      for (let cycle = 0; cycle < numCycles; cycle++) {
        const cycleStartTime = Date.now();
        const cycleSessionIds = [];

        // Create sessions rapidly
        for (let i = 0; i < sessionsPerCycle; i++) {
          const client = createClient();
          clients.push(client);

          const sessionId = await createSession(client, ['python', 'javascript', 'bash'][i % 3]);
          cycleSessionIds.push(sessionId);
        }

        const creationTime = Date.now() - cycleStartTime;

        // Immediately destroy half the sessions
        const destructionStartTime = Date.now();
        for (let i = 0; i < cycleSessionIds.length / 2; i++) {
          clients[i].emit('terminal:stop', { sessionId: cycleSessionIds[i] });
          clients[i].disconnect();
        }

        const destructionTime = Date.now() - destructionStartTime;

        performanceMetrics.push({
          cycle: cycle + 1,
          creationTime,
          destructionTime,
          sessionsCreated: cycleSessionIds.length,
          sessionsDestroyed: Math.floor(cycleSessionIds.length / 2)
        });

        // Small delay between cycles
        await TestHelpers.delay(100);
        jest.advanceTimersByTime(100);
      }

      // Analyze performance
      const avgCreationTime = performanceMetrics.reduce((sum, m) => sum + m.creationTime, 0) / performanceMetrics.length;
      const avgDestructionTime = performanceMetrics.reduce((sum, m) => sum + m.destructionTime, 0) / performanceMetrics.length;

      expect(avgCreationTime).toBeLessThan(1000); // Average creation under 1 second
      expect(avgDestructionTime).toBeLessThan(500); // Average destruction under 500ms

      // Cleanup remaining sessions
      for (let i = performanceMetrics[0].sessionsDestroyed; i < clients.length; i++) {
        if (clients[i].connected) {
          clients[i].emit('terminal:stop', { sessionId: 'existing' });
          clients[i].disconnect();
        }
      }

      await TestHelpers.delay(1000);
      jest.advanceTimersByTime(1000);
    }, 90000);

    test('should maintain performance under sustained load', async () => {
      const duration = 30000; // 30 seconds of sustained load
      const numConcurrentSessions = 50;
      const clients = [];
      const sessionIds = [];
      const performanceSnapshots = [];

      // Create initial sessions
      for (let i = 0; i < numConcurrentSessions; i++) {
        const client = createClient();
        clients.push(client);

        const sessionId = await createSession(client, 'python');
        sessionIds.push(sessionId);
      }

      const testStartTime = Date.now();
      const testEndTime = testStartTime + duration;

      // Sustained load: continuous input/output
      const loadTestInterval = setInterval(async () => {
        if (Date.now() > testEndTime) {
          clearInterval(loadTestInterval);
          return;
        }

        const snapshotStartTime = Date.now();

        // Send input to random sessions
        const numInputs = Math.floor(Math.random() * 10) + 5;
        for (let i = 0; i < numInputs; i++) {
          const sessionIndex = Math.floor(Math.random() * numConcurrentSessions);
          const client = clients[sessionIndex];
          const sessionId = sessionIds[sessionIndex];

          if (client.connected && sessionId) {
            await sendInput(client, sessionId, `print("Load test ${Date.now()}")\n`);

            // Simulate rapid response
            setTimeout(() => {
              mockDockerService.simulateContainerOutput(sessionId, `Load test ${Date.now()}\n>>> `);
            }, Math.random() * 100);
          }
        }

        const snapshotTime = Date.now() - snapshotStartTime;
        const activeSessions = terminalService.sessions.size;

        performanceSnapshots.push({
          timestamp: Date.now(),
          snapshotTime,
          activeSessions,
          memoryUsage: process.memoryUsage()
        });

      }, 1000);

      // Wait for test to complete
      await new Promise(resolve => {
        setTimeout(resolve, duration);
      });

      // Analyze performance stability
      const avgSnapshotTime = performanceSnapshots.reduce((sum, s) => sum + s.snapshotTime, 0) / performanceSnapshots.length;
      const maxSnapshotTime = Math.max(...performanceSnapshots.map(s => s.snapshotTime));
      const memoryGrowth = performanceSnapshots[performanceSnapshots.length - 1].memoryUsage.heapUsed -
                           performanceSnapshots[0].memoryUsage.heapUsed;

      expect(avgSnapshotTime).toBeLessThan(1000); // Average operation under 1 second
      expect(maxSnapshotTime).toBeLessThan(3000); // Max operation under 3 seconds
      expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Memory growth under 200MB
      expect(terminalService.sessions.size).toBeGreaterThan(numConcurrentSessions * 0.8); // At least 80% sessions still active

      // Cleanup
      clients.forEach(client => {
        if (client.connected) {
          client.disconnect();
        }
      });

      await TestHelpers.delay(2000);
      jest.advanceTimersByTime(2000);
    }, 120000);
  });

  describe('Resource Limits and Boundaries', () => {
    test('should respect system resource limits', async () => {
      // This test verifies the system handles resource exhaustion gracefully
      const originalMaxListeners = process.getMaxListeners();
      process.setMaxListeners(1000);

      const clients = [];
      let sessionCreationError = null;
      let sessionsCreated = 0;

      try {
        // Keep creating sessions until we hit a limit
        for (let i = 0; i < 1000; i++) {
          const client = createClient();
          clients.push(client);

          try {
            const sessionId = await Promise.race([
              createSession(client, 'python'),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Creation timeout')), 3000)
              )
            ]);
            sessionsCreated++;
          } catch (error) {
            sessionCreationError = error;
            break;
          }

          // Small delay to prevent overwhelming the system
          await TestHelpers.delay(50);
        }
      } catch (error) {
        sessionCreationError = error;
      }

      // System should handle limits gracefully
      expect(sessionsCreated).toBeGreaterThan(0);
      if (sessionCreationError) {
        expect(sessionCreationError.message).toMatch(/timeout|limit|resource/i);
      }

      // Cleanup
      clients.forEach(client => {
        if (client.connected) client.disconnect();
      });

      process.setMaxListeners(originalMaxListeners);

      await TestHelpers.delay(2000);
      jest.advanceTimersByTime(2000);
    }, 180000);
  });
});