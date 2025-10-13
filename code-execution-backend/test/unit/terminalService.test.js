const { describe, test, expect, jest, beforeEach, afterEach } = require('@jest/globals');
const TerminalService = require('../../src/services/terminalService');
const { MockDockerService, MockSocketIO, MockLogger } = require('../fixtures/mockServices');
const { mockLanguageConfigs, mockSocketData, mockPTYData } = require('../fixtures/mockData');
const TestHelpers = require('../utils/testHelpers');

describe('TerminalService', () => {
  let terminalService;
  let mockDockerService;
  let mockIO;
  let mockLogger;
  let mockSocket;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock dependencies
    mockDockerService = new MockDockerService();
    mockIO = new MockSocketIO();
    mockLogger = new MockLogger();
    mockSocket = mockIO.createSocket();

    // Mock the modules
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

    // Create TerminalService instance
    terminalService = new TerminalService(mockIO);
  });

  afterEach(() => {
    jest.resetModules();
    if (terminalService) {
      terminalService.cleanup();
    }
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(terminalService.sessions).toBeInstanceOf(Map);
      expect(terminalService.socketSessions).toBeInstanceOf(Map);
      expect(terminalService.sessionTimeouts).toBeInstanceOf(Map);
      expect(terminalService.inputHandlers).toBeInstanceOf(Map);
      expect(terminalService.streamProcessors).toBeInstanceOf(Map);
      expect(terminalService.hasLoggedDockerUnavailable).toBe(false);
    });

    test('should setup idle session cleanup interval', () => {
      expect(terminalService.idleSessionCheckInterval).toBeTruthy();
      expect(typeof terminalService.idleSessionCheckInterval).toBe('object');
    });
  });

  describe('Socket State Validation', () => {
    test('should validate socket correctly when all properties are valid', () => {
      const validSocket = mockIO.createSocket();
      expect(terminalService.isSocketValid(validSocket)).toBe(true);
    });

    test('should return false for null socket', () => {
      expect(terminalService.isSocketValid(null)).toBe(false);
    });

    test('should return false for undefined socket', () => {
      expect(terminalService.isSocketValid(undefined)).toBe(false);
    });

    test('should return false for socket without id', () => {
      const invalidSocket = { connected: true };
      expect(terminalService.isSocketValid(invalidSocket)).toBe(false);
    });

    test('should return false for socket with non-string id', () => {
      const invalidSocket = { id: 123, connected: true };
      expect(terminalService.isSocketValid(invalidSocket)).toBe(false);
    });

    test('should return false for disconnected socket', () => {
      const disconnectedSocket = mockIO.createSocket();
      disconnectedSocket.connected = false;
      expect(terminalService.isSocketValid(disconnectedSocket)).toBe(false);
    });

    test('should return false for disconnecting socket', () => {
      const disconnectingSocket = mockIO.createSocket();
      disconnectingSocket.disconnecting = true;
      expect(terminalService.isSocketValid(disconnectingSocket)).toBe(false);
    });

    test('should return false for destroyed socket', () => {
      const destroyedSocket = mockIO.createSocket();
      destroyedSocket._destroyed = true;
      expect(terminalService.isSocketValid(destroyedSocket)).toBe(false);
    });
  });

  describe('Safe Socket Emit', () => {
    test('should emit event successfully for valid socket', () => {
      const validSocket = mockIO.createSocket();
      const result = terminalService.safeSocketEmit(validSocket, 'test-event', { data: 'test' });

      expect(result).toBe(true);
      expect(validSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    test('should return false for invalid socket', () => {
      const invalidSocket = { id: 'test', connected: false };
      const result = terminalService.safeSocketEmit(invalidSocket, 'test-event', { data: 'test' });

      expect(result).toBe(false);
      expect(invalidSocket.emit).not.toHaveBeenCalled();
    });

    test('should handle socket.emit returning false', () => {
      const validSocket = mockIO.createSocket();
      validSocket.emit.mockReturnValue(false);

      const result = terminalService.safeSocketEmit(validSocket, 'test-event', { data: 'test' });

      expect(result).toBe(false);
    });

    test('should retry on retryable errors', async () => {
      const validSocket = mockIO.createSocket();
      const retryableError = new Error('Connection timeout');
      validSocket.emit.mockImplementation(() => {
        throw retryableError;
      });

      // Mock setTimeout for test
      jest.useFakeTimers();

      const result = terminalService.safeSocketEmit(validSocket, 'test-event', { data: 'test' });

      // Advance timers to trigger retry
      jest.advanceTimersByTime(100);

      await TestHelpers.delay(10);

      expect(validSocket.emit).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    test('should not retry on non-retryable errors', () => {
      const validSocket = mockIO.createSocket();
      const nonRetryableError = new Error('Invalid data');
      validSocket.emit.mockImplementation(() => {
        throw nonRetryableError;
      });

      const result = terminalService.safeSocketEmit(validSocket, 'test-event', { data: 'test' });

      expect(validSocket.emit).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('should start session successfully', async () => {
      const sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);

      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
      expect(terminalService.sessions.has(sessionId)).toBe(true);
      expect(terminalService.socketSessions.has(mockSocket.id)).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('terminal:ready', { sessionId });
    });

    test('should throw error when socket is missing', async () => {
      await expect(
        terminalService.startSession(null, mockSocketData.validConnection)
      ).rejects.toThrow('Socket is required');
    });

    test('should throw error when projectId is missing', async () => {
      const invalidData = { userId: 'test-user', language: 'python' };

      await expect(
        terminalService.startSession(mockSocket, invalidData)
      ).rejects.toThrow('projectId and userId are required');
    });

    test('should throw error when userId is missing', async () => {
      const invalidData = { projectId: 'test-project', language: 'python' };

      await expect(
        terminalService.startSession(mockSocket, invalidData)
      ).rejects.toThrow('projectId and userId are required');
    });

    test('should handle Docker unavailable error gracefully', async () => {
      mockDockerService.setFailureMode('connection');

      await expect(
        terminalService.startSession(mockSocket, mockSocketData.validConnection)
      ).rejects.toThrow('DockerUnavailableError');
    });

    test('should clean up session on container exit', async () => {
      const sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);

      // Simulate container exit
      mockDockerService.simulateContainerExit(sessionId);

      await TestHelpers.delay(100);

      expect(terminalService.sessions.has(sessionId)).toBe(false);
    });
  });

  describe('Input Handling', () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);
    });

    test('should send input successfully', async () => {
      const inputData = 'print("Hello, World!")\n';

      await terminalService.sendInput(sessionId, inputData);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalled();
    });

    test('should throw error for non-existent session', async () => {
      await expect(
        terminalService.sendInput('non-existent-session', 'test input')
      ).rejects.toThrow('is not active');
    });

    test('should throw error for cleaning session', async () => {
      // Mark session as cleaning
      const session = terminalService.sessions.get(sessionId);
      session.cleaning = true;

      await expect(
        terminalService.sendInput(sessionId, 'test input')
      ).rejects.toThrow('is not active');
    });

    test('should process input through language-specific handler', async () => {
      const inputData = 'print("test")\n';

      await terminalService.sendInput(sessionId, inputData);

      // Verify input was processed and written to stream
      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalled();
    });

    test('should preserve binary data', async () => {
      const binaryData = Buffer.from([0x03, 0x04, 0x1b, 0x5b, 0x41]); // Ctrl+C, Ctrl+D, Esc+[A

      await terminalService.sendInput(sessionId, binaryData);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(Function)
      );
    });

    test('should handle ANSI sequences correctly', async () => {
      const ansiData = '\x1b[31mRed Text\x1b[0m\n';

      await terminalService.sendInput(sessionId, ansiData);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalledWith(ansiData, expect.any(Function));
    });
  });

  describe('PTY Data Processing', () => {
    test('should process PTY data correctly for Python', () => {
      const chunk = '>>> print("Hello")\nHello\n>>> ';
      const processed = terminalService.processPTYDataEnhanced(chunk, 'python');

      expect(processed).toContain('Hello');
      expect(processed).toContain('>>>');
    });

    test('should fix Windows CRLF issues', () => {
      const chunk = 'Hello\r\nWorld\r\n';
      const processed = terminalService.processPTYDataEnhanced(chunk, 'python');

      expect(processed).toBe('Hello\nWorld\n');
    });

    test('should remove standalone carriage returns', () => {
      const chunk = 'Hello\rWorld\r';
      const processed = terminalService.processPTYDataEnhanced(chunk, 'python');

      expect(processed).toBe('HelloWorld');
    });

    test('should preserve ANSI sequences', () => {
      const chunk = '\x1b[31mRed\x1b[0m\n\x1b[32mGreen\x1b[0m\n';
      const processed = terminalService.processPTYDataEnhanced(chunk, 'python');

      expect(processed).toContain('\x1b[31m');
      expect(processed).toContain('\x1b[0m');
    });

    test('should preserve control characters', () => {
      const chunk = 'Hello\x03World\x04';
      const processed = terminalService.processPTYDataEnhanced(chunk, 'python');

      expect(processed).toContain('\x03');
      expect(processed).toContain('\x04');
    });

    test('should handle Buffer input correctly', () => {
      const bufferData = Buffer.from('Hello World\n', 'utf8');
      const processed = terminalService.processPTYDataEnhanced(bufferData, 'python');

      expect(typeof processed).toBe('string');
      expect(processed).toContain('Hello World');
    });
  });

  describe('Session Resize', () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);
    });

    test('should resize session successfully', async () => {
      const dimensions = { cols: 100, rows: 50 };

      await terminalService.resizeSession(sessionId, dimensions);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.resize).toHaveBeenCalledWith(dimensions);
    });

    test('should throw error for non-existent session', async () => {
      await expect(
        terminalService.resizeSession('non-existent', { cols: 80, rows: 24 })
      ).rejects.toThrow('is not active');
    });

    test('should throw error for invalid dimensions', async () => {
      await expect(
        terminalService.resizeSession(sessionId, { cols: -1, rows: 24 })
      ).rejects.toThrow();
    });
  });

  describe('Session Cleanup', () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);
    });

    test('should stop session successfully', async () => {
      await terminalService.stopSession(sessionId);

      expect(terminalService.sessions.has(sessionId)).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'terminal:exit',
        expect.objectContaining({
          sessionId,
          reason: 'Session stopped by user'
        })
      );
    });

    test('should clean up session on disconnect', async () => {
      await terminalService.handleDisconnect(mockSocket.id);

      expect(terminalService.sessions.has(sessionId)).toBe(false);
      expect(terminalService.socketSessions.has(mockSocket.id)).toBe(false);
    });

    test('should prevent concurrent cleanup of same session', async () => {
      const session = terminalService.sessions.get(sessionId);
      session.cleaning = true;

      // Should not throw error and should not attempt cleanup again
      await terminalService.cleanupSession(sessionId, { reason: 'test' });

      expect(mockDockerService.getRunningContainers()).toContain(sessionId);
    });

    test('should handle cleanup errors gracefully', async () => {
      mockDockerService.setFailureMode('start');

      // Should not throw error even if cleanup fails
      await expect(
        terminalService.stopSession(sessionId)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Recovery', () => {
    test('should detect Docker unavailable errors', () => {
      const dockerError = new Error('Docker connection failed');
      dockerError.code = 'ECONNREFUSED';

      expect(terminalService.isDockerUnavailableError(dockerError)).toBe(true);
    });

    test('should identify retryable errors', () => {
      const retryableError = new Error('Connection timeout');
      const nonRetryableError = new Error('Invalid input');

      expect(terminalService.isRetryableError(retryableError)).toBe(true);
      expect(terminalService.isRetryableError(nonRetryableError)).toBe(false);
    });

    test('should handle stream errors gracefully', async () => {
      const sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);

      // Simulate stream error
      mockDockerService.simulateContainerError(sessionId, new Error('Stream error'));

      await TestHelpers.delay(50);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'terminal:error',
        expect.objectContaining({
          sessionId,
          message: 'Stream error'
        })
      );
    });
  });

  describe('Interactive Execution', () => {
    let sessionId;

    beforeEach(async () => {
      sessionId = await terminalService.startSession(mockSocket, {
        ...mockSocketData.validConnection,
        language: 'python'
      });
    });

    test('should detect interactive code correctly', () => {
      const interactiveCode = 'name = input("Enter name: ")';
      const nonInteractiveCode = 'print("Hello")';

      expect(terminalService.requiresInteractiveExecution(interactiveCode)).toBe(true);
      expect(terminalService.requiresInteractiveExecution(nonInteractiveCode)).toBe(false);
    });

    test('should execute code interactively when needed', async () => {
      const interactiveCode = 'name = input("Enter name: ")';
      const languageConfig = mockLanguageConfigs.python;

      await terminalService.executeCodeInteractively(sessionId, interactiveCode, languageConfig);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalled();
    });

    test('should execute non-interactive code via shell', async () => {
      const nonInteractiveCode = 'print("Hello, World!")';
      const languageConfig = mockLanguageConfigs.python;

      await terminalService.executeViaShell(sessionId, nonInteractiveCode, languageConfig);

      const container = mockDockerService.getContainer(sessionId);
      expect(container.stream.write).toHaveBeenCalled();
    });
  });

  describe('Idle Session Management', () => {
    test('should setup idle session cleanup', () => {
      expect(terminalService.idleSessionCheckInterval).toBeTruthy();
    });

    test('should clean up idle sessions', async () => {
      const sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);

      // Manually set last activity to old time
      const session = terminalService.sessions.get(sessionId);
      session.lastActivity = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago

      // Trigger cleanup
      terminalService.cleanupIdleSessions();

      // Session should be marked for cleanup (actual cleanup is async)
      expect(session.cleaning).toBe(true);
    });

    test('should not clean up active sessions', async () => {
      const sessionId = await terminalService.startSession(mockSocket, mockSocketData.validConnection);

      // Session should have recent activity
      const session = terminalService.sessions.get(sessionId);
      expect(session.lastActivity).toBeInstanceOf(Date);

      // Trigger cleanup
      terminalService.cleanupIdleSessions();

      // Session should not be cleaned up
      expect(terminalService.sessions.has(sessionId)).toBe(true);
    });
  });

  describe('Language Support', () => {
    test('should prepare input correctly for different languages', () => {
      const pythonInput = 'print("Hello")';
      const jsInput = 'console.log("Hello");';
      const javaInput = 'System.out.println("Hello");';

      const pythonPrepared = terminalService.preparePythonInput(pythonInput);
      const jsPrepared = terminalService.prepareJavaScriptInput(jsInput);
      const javaPrepared = terminalService.prepareJavaInput(javaInput);

      expect(pythonPrepared).toBe(pythonInput);
      expect(jsPrepared).toBe(jsInput);
      expect(javaPrepared).toBe(javaInput);
    });

    test('should get correct filename for different languages', () => {
      const pythonConfig = mockLanguageConfigs.python;
      const javaConfig = mockLanguageConfigs.java;

      const pythonFile = terminalService.getFileNameForLanguage(pythonConfig);
      const javaFile = terminalService.getFileNameForLanguage(javaConfig);

      expect(pythonFile).toBe('code.py');
      expect(javaFile).toBe('Main.java');
    });
  });

  describe('Resource Management', () => {
    test('should cleanup all resources on service shutdown', async () => {
      // Create multiple sessions
      const sessionIds = [];
      for (let i = 0; i < 3; i++) {
        const sessionId = await terminalService.startSession(mockSocket, {
          ...mockSocketData.validConnection,
          projectId: `project-${i}`,
          userId: `user-${i}`
        });
        sessionIds.push(sessionId);
      }

      // Shutdown service
      await terminalService.cleanup();

      // All sessions should be cleaned up
      expect(terminalService.sessions.size).toBe(0);
      expect(terminalService.socketSessions.size).toBe(0);
      expect(terminalService.streamProcessors.size).toBe(0);
      expect(terminalService.inputHandlers.size).toBe(0);
    });

    test('should clear cleanup intervals', async () => {
      expect(terminalService.idleSessionCheckInterval).toBeTruthy();

      await terminalService.cleanup();

      expect(terminalService.idleSessionCheckInterval).toBeNull();
    });
  });
});