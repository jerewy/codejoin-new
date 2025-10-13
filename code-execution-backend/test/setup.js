// Global test setup
const { beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeAll(() => {
  // Suppress console output in tests unless explicitly needed
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };
});

afterAll(() => {
  // Restore console methods
  global.console = originalConsole;
});

// Set up global test utilities
global.testUtils = {
  // Helper to create mock sockets
  createMockSocket: (id = 'test-socket-id') => ({
    id,
    connected: true,
    disconnected: false,
    disconnecting: false,
    _destroyed: false,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    data: {},
    handshake: {
      headers: {
        'user-agent': 'test-agent'
      },
      address: '127.0.0.1'
    }
  }),

  // Helper to create mock containers
  createMockContainer: (id = 'test-container-id') => ({
    id,
    start: jest.fn().mockResolvedValue(),
    stop: jest.fn().mockResolvedValue(),
    kill: jest.fn().mockResolvedValue(),
    remove: jest.fn().mockResolvedValue(),
    attach: jest.fn().mockResolvedValue({
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    }),
    inspect: jest.fn().mockResolvedValue({
      State: { Running: true }
    }),
    resize: jest.fn().mockResolvedValue(),
    wait: jest.fn().mockResolvedValue({ StatusCode: 0 }),
    logs: jest.fn().mockResolvedValue(Buffer.from('test output'))
  }),

  // Helper to create mock streams
  createMockStream: () => {
    const EventEmitter = require('events');
    const stream = new EventEmitter();
    stream.writable = true;
    stream.destroyed = false;
    stream.write = jest.fn().mockImplementation((data, callback) => {
      process.nextTick(() => callback && callback(null));
      return true;
    });
    stream.end = jest.fn();
    stream.destroy = jest.fn();
    stream.removeAllListeners = jest.fn();
    stream.setEncoding = jest.fn();
    return stream;
  },

  // Helper to wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate test data
  generateTestData: {
    pythonCode: 'print("Hello, World!")\nprint(2 + 2)',
    javascriptCode: 'console.log("Hello, World!");\nconsole.log(2 + 2);',
    javaCode: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
    bashCode: 'echo "Hello, World!"\necho $((2 + 2))',
    interactiveCode: 'name = input("Enter your name: ")\nprint(f"Hello, {name}!")'
  },

  // Helper to create language configs
  createLanguageConfig: (name = 'Python') => ({
    name,
    image: `code-execution-${name.toLowerCase()}:latest`,
    fileExtension: name === 'Python' ? '.py' : name === 'JavaScript' ? '.js' : '.java',
    type: name === 'Java' ? 'compiled' : 'interpreted',
    timeout: 10000,
    memoryLimit: '256m',
    cpuLimit: 0.5,
    runCommand: name === 'Python' ? 'python3 /tmp/code.py' :
                name === 'JavaScript' ? 'node /tmp/code.js' :
                'java -cp /tmp Main',
    compileCommand: name === 'Java' ? 'javac /tmp/Main.java' : null
  })
};

// Global cleanup utilities
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any test-specific timers
  jest.clearAllTimers();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});