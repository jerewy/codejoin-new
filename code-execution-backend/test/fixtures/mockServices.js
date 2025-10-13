// Mock service factories for testing

const EventEmitter = require('events');
const { createMockSocket, createMockContainer, createMockStream } = require('../setup');

class MockDockerService {
  constructor() {
    this.containers = new Map();
    this.runningContainers = new Map();
    this.shouldFailConnection = false;
    this.shouldFailCreate = false;
    this.shouldFailStart = false;
    this.connectionLatency = 0;
  }

  // Configure mock behavior
  setFailureMode(mode, enabled = true) {
    switch (mode) {
      case 'connection':
        this.shouldFailConnection = enabled;
        break;
      case 'create':
        this.shouldFailCreate = enabled;
        break;
      case 'start':
        this.shouldFailStart = enabled;
        break;
    }
  }

  setConnectionLatency(ms) {
    this.connectionLatency = ms;
  }

  async testConnection() {
    if (this.connectionLatency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.connectionLatency));
    }

    if (this.shouldFailConnection) {
      const error = new Error('Docker connection failed');
      error.code = 'ECONNREFUSED';
      throw error;
    }

    return Promise.resolve();
  }

  async createInteractiveContainer(languageConfig) {
    if (this.shouldFailCreate) {
      throw new Error('Failed to create container');
    }

    const sessionId = require('uuid').v4();
    const container = createMockContainer(sessionId);
    const stream = createMockStream();

    this.containers.set(sessionId, container);
    this.runningContainers.set(sessionId, container);

    // Simulate container startup
    setTimeout(() => {
      stream.emit('data', mockPTYData.pythonPrompt);
    }, 100);

    return { sessionId, stream };
  }

  async resizeInteractiveContainer(sessionId, dimensions) {
    const container = this.runningContainers.get(sessionId);
    if (!container) {
      throw new Error(`Container ${sessionId} not found`);
    }

    container.resize(dimensions);
    return Promise.resolve();
  }

  async stopInteractiveContainer(sessionId) {
    const container = this.runningContainers.get(sessionId);
    if (container) {
      container.stop();
      this.runningContainers.delete(sessionId);
    }
    return Promise.resolve();
  }

  async forceKillContainer(sessionId) {
    const container = this.runningContainers.get(sessionId);
    if (container) {
      container.kill();
      this.runningContainers.delete(sessionId);
    }
    return Promise.resolve();
  }

  async waitForContainer(sessionId) {
    const container = this.runningContainers.get(sessionId);
    if (!container) {
      throw new Error(`Container ${sessionId} not found`);
    }

    // Simulate container exit after delay
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ StatusCode: 0 });
      }, 1000);
    });
  }

  async cleanupAll() {
    const containers = Array.from(this.runningContainers.values());
    for (const container of containers) {
      container.remove();
    }
    this.runningContainers.clear();
    return Promise.resolve();
  }

  // Helper methods for testing
  getContainer(sessionId) {
    return this.containers.get(sessionId);
  }

  getRunningContainers() {
    return Array.from(this.runningContainers.keys());
  }

  simulateContainerOutput(sessionId, output) {
    const container = this.containers.get(sessionId);
    if (container && container.stream) {
      container.stream.emit('data', output);
    }
  }

  simulateContainerError(sessionId, error) {
    const container = this.containers.get(sessionId);
    if (container && container.stream) {
      container.stream.emit('error', error);
    }
  }

  simulateContainerExit(sessionId) {
    const container = this.containers.get(sessionId);
    if (container && container.stream) {
      container.stream.emit('close');
    }
  }
}

class MockSocketIO {
  constructor() {
    this.sockets = new Map();
    this.rooms = new Map();
    this.emitSpy = jest.fn();
  }

  createSocket(id = null) {
    const socketId = id || `socket-${Date.now()}-${Math.random()}`;
    const socket = createMockSocket(socketId);

    // Add enhanced socket methods
    socket.join = jest.fn();
    socket.leave = jest.fn();
    socket.to = jest.fn().mockReturnThis();
    socket.broadcast = jest.fn().mockReturnThis();
    socket.disconnect = jest.fn();

    // Track emits
    const originalEmit = socket.emit;
    socket.emit = jest.fn((event, data) => {
      this.emitSpy(event, data, socketId);
      return originalEmit.call(socket, event, data);
    });

    this.sockets.set(socketId, socket);
    return socket;
  }

  getSocket(id) {
    return this.sockets.get(id);
  }

  removeSocket(id) {
    const socket = this.sockets.get(id);
    if (socket) {
      socket.connected = false;
      socket.disconnected = true;
      this.sockets.delete(id);
    }
  }

  disconnectAll() {
    for (const [id, socket] of this.sockets) {
      socket.connected = false;
      socket.disconnected = true;
    }
    this.sockets.clear();
  }

  // Spy methods
  getLastEmittedEvent() {
    return this.emitSpy.mock.calls[this.emitSpy.mock.calls.length - 1];
  }

  getEmittedEvents() {
    return this.emitSpy.mock.calls;
  }

  clearEmittedEvents() {
    this.emitSpy.mockClear();
  }
}

class MockLogger {
  constructor() {
    this.logs = {
      error: [],
      warn: [],
      info: [],
      debug: []
    };
  }

  error(message, meta = {}) {
    this.logs.error.push({ message, meta, timestamp: new Date() });
  }

  warn(message, meta = {}) {
    this.logs.warn.push({ message, meta, timestamp: new Date() });
  }

  info(message, meta = {}) {
    this.logs.info.push({ message, meta, timestamp: new Date() });
  }

  debug(message, meta = {}) {
    this.logs.debug.push({ message, meta, timestamp: new Date() });
  }

  // Helper methods for testing
  getLogs(level) {
    return this.logs[level] || [];
  }

  getLastLog(level) {
    const logs = this.getLogs(level);
    return logs[logs.length - 1];
  }

  hasLog(level, message) {
    return this.logs[level].some(log =>
      typeof message === 'string'
        ? log.message.includes(message)
        : log.message.match(message)
    );
  }

  clearLogs() {
    this.logs.error = [];
    this.logs.warn = [];
    this.logs.info = [];
    this.logs.debug = [];
  }
}

class MockInputHandler {
  constructor(options = {}) {
    this.options = {
      maxInputLength: 1024 * 1024,
      enableLogging: true,
      strictMode: false,
      ...options
    };
    this.processedInputs = [];
  }

  async processInput(input, context = {}) {
    this.processedInputs.push({ input, context, timestamp: new Date() });

    // Simulate processing
    if (input && input.length > this.options.maxInputLength) {
      return {
        success: false,
        error: 'Input too long',
        data: null
      };
    }

    // Simulate binary data preservation
    if (Buffer.isBuffer(input)) {
      return {
        success: true,
        data: input,
        metadata: {
          type: 'binary',
          size: input.length
        }
      };
    }

    // Process string input
    let processed = input;
    if (typeof input === 'string') {
      // Preserve control characters and ANSI sequences
      processed = processed.replace(/\r\n/g, '\n');
      processed = processed.replace(/\r(?!\n)/g, '');
    }

    return {
      success: true,
      data: processed,
      metadata: {
        type: 'string',
        size: Buffer.byteLength(processed, 'utf8'),
        hasControlChars: /[\x00-\x1F\x7F]/.test(processed),
        hasANSI: /\x1b\[[0-9;]*[a-zA-Z]/.test(processed)
      }
    };
  }

  getProcessedInputs() {
    return this.processedInputs;
  }

  clearProcessedInputs() {
    this.processedInputs = [];
  }
}

class MockPTYStreamProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      language: 'python',
      sessionId: 'test-session',
      preserveANSI: true,
      preserveControlChars: true,
      fixLineEndings: true,
      enableLogging: true,
      ...options
    };
    this.processedData = [];
    this.writtenData = [];
  }

  static createOutputProcessor(options) {
    return new MockPTYStreamProcessor(options);
  }

  write(data) {
    this.writtenData.push({ data, timestamp: new Date() });

    // Process the data
    let processed = data;
    if (typeof processed === 'string') {
      if (this.options.fixLineEndings) {
        processed = processed.replace(/\r\n/g, '\n');
        processed = processed.replace(/\r(?!\n)/g, '');
      }
    }

    this.processedData.push({
      input: data,
      output: processed,
      timestamp: new Date()
    });

    // Emit processed data
    this.emit('data', processed);
  }

  end() {
    this.emit('end');
  }

  getProcessedData() {
    return this.processedData;
  }

  getWrittenData() {
    return this.writtenData;
  }

  clearData() {
    this.processedData = [];
    this.writtenData = [];
  }
}

module.exports = {
  MockDockerService,
  MockSocketIO,
  MockLogger,
  MockInputHandler,
  MockPTYStreamProcessor
};