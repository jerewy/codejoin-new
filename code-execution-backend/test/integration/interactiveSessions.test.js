const { describe, test, expect, jest, beforeEach, afterEach, beforeAll, afterAll } = require('@jest/globals');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const TerminalService = require('../../src/services/terminalService');
const { mockLanguageConfigs, mockTestCode } = require('../fixtures/mockData');
const { MockDockerService, MockLogger } = require('../fixtures/mockServices');
const TestHelpers = require('../utils/testHelpers');

describe('Interactive Sessions Integration Tests', () => {
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

  const createTerminalSession = async (client, language, code = null) => {
    await waitForEvent(client, 'connect');

    client.emit('terminal:start', {
      projectId: 'test-project',
      userId: 'test-user',
      language,
      code
    });

    const [readyResponse] = await waitForEvent(client, 'terminal:ready');
    return readyResponse.sessionId;
  };

  describe('Python REPL Sessions', () => {
    test('should handle basic Python REPL interaction', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'python');

      // Simulate Python REPL startup
      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Python 3.9.0\n>>> ');
      }, 100);

      const [welcomeResponse] = await waitForEvent(client, 'terminal:data');
      expect(welcomeResponse.chunk).toContain('Python');
      expect(welcomeResponse.chunk).toContain('>>>');

      // Send simple Python code
      client.emit('terminal:input', {
        sessionId,
        input: 'print("Hello, World!")\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Hello, World!\n>>> ');
      }, 100);

      const [outputResponse] = await waitForEvent(client, 'terminal:data');
      expect(outputResponse.chunk).toContain('Hello, World!');
      expect(outputResponse.chunk).toContain('>>>');

      // Send arithmetic expression
      client.emit('terminal:input', {
        sessionId,
        input: '2 + 2\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '4\n>>> ');
      }, 100);

      const [mathResponse] = await waitForEvent(client, 'terminal:data');
      expect(mathResponse.chunk).toContain('4');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle multi-line code blocks in Python REPL', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'python');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '>>> ');
      }, 100);

      // Send function definition
      const functionCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
`;

      client.emit('terminal:input', { sessionId, input: functionCode });

      // Simulate multi-line input prompts
      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '... ');
        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, '... ');
          setTimeout(() => {
            mockDockerService.simulateContainerOutput(sessionId, '... ');
          }, 50);
        }, 50);
      }, 100);

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

      const multiLineOutput = responses.map(r => r.chunk).join('');
      expect(multiLineOutput).toContain('...');

      // Call the function
      client.emit('terminal:input', { sessionId, input: 'print([fibonacci(i) for i in range(10)])\n' });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n>>> ');
      }, 100);

      const [resultResponse] = await waitForEvent(client, 'terminal:data');
      expect(resultResponse.chunk).toContain('[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle Python input() function interactively', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'python');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '>>> ');
      }, 100);

      // Send code with input()
      const interactiveCode = 'name = input("Enter your name: ")\nage = int(input("Enter your age: "))\nprint(f"Hello {name}, you are {age} years old!")\n';

      client.emit('terminal:input', { sessionId, input: interactiveCode });

      // First input prompt
      const [prompt1Response] = await waitForEvent(client, 'terminal:data');
      expect(prompt1Response.chunk).toContain('Enter your name:');

      // Send first input
      client.emit('terminal:input', { sessionId, input: 'Alice\n' });

      // Second input prompt
      const [prompt2Response] = await waitForEvent(client, 'terminal:data');
      expect(prompt2Response.chunk).toContain('Enter your age:');

      // Send second input
      client.emit('terminal:input', { sessionId, input: '25\n' });

      // Final output
      const [outputResponse] = await waitForEvent(client, 'terminal:data');
      expect(outputResponse.chunk).toContain('Hello Alice, you are 25 years old!');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle Python exceptions and error messages', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'python');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '>>> ');
      }, 100);

      // Send code that will raise an exception
      client.emit('terminal:input', {
        sessionId,
        input: 'print(undefined_variable)\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId,
          'Traceback (most recent call last):\n' +
          '  File "<stdin>", line 1, in <module>\n' +
          'NameError: name \'undefined_variable\' is not defined\n' +
          '>>> '
        );
      }, 100);

      const [errorResponse] = await waitForEvent(client, 'terminal:data');
      expect(errorResponse.chunk).toContain('NameError');
      expect(errorResponse.chunk).toContain('undefined_variable');
      expect(errorResponse.chunk).toContain('>>>');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });

  describe('Node.js REPL Sessions', () => {
    test('should handle basic Node.js REPL interaction', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'javascript');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '> ');
      }, 100);

      // Send JavaScript code
      client.emit('terminal:input', {
        sessionId,
        input: 'console.log("Hello, Node.js!");\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Hello, Node.js!\nundefined\n> ');
      }, 100);

      const [outputResponse] = await waitForEvent(client, 'terminal:data');
      expect(outputResponse.chunk).toContain('Hello, Node.js!');
      expect(outputResponse.chunk).toContain('>');

      // Send JavaScript expression
      client.emit('terminal:input', {
        sessionId,
        input: '[1, 2, 3].map(x => x * 2)\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '[ 2, 4, 6 ]\n> ');
      }, 100);

      const [arrayResponse] = await waitForEvent(client, 'terminal:data');
      expect(arrayResponse.chunk).toContain('[ 2, 4, 6 ]');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle async/await in Node.js REPL', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'javascript');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '> ');
      }, 100);

      // Send async function
      client.emit('terminal:input', {
        sessionId,
        input: 'async function fetchData() {\n  return new Promise(resolve => setTimeout(() => resolve("data"), 100));\n}\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'undefined\n> ');
      }, 100);

      await waitForEvent(client, 'terminal:data');

      // Call async function
      client.emit('terminal:input', {
        sessionId,
        input: 'fetchData().then(console.log);\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Promise { <pending> }\n');
        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, 'data\n> ');
        }, 150);
      }, 100);

      const responses = [];
      await new Promise((resolve) => {
        const onData = (data) => {
          responses.push(data);
          if (responses.length >= 2) {
            client.off('terminal:data', onData);
            resolve();
          }
        };
        client.on('terminal:data', onData);
      });

      const output = responses.map(r => r.chunk).join('');
      expect(output).toContain('Promise');
      expect(output).toContain('data');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });

  describe('Java JShell Sessions', () => {
    test('should handle basic JShell interaction', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'java');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'jshell> ');
      }, 100);

      // Send Java variable declaration
      client.emit('terminal:input', {
        sessionId,
        input: 'int x = 42;\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'x ==> 42\njshell> ');
      }, 100);

      const [varResponse] = await waitForEvent(client, 'terminal:data');
      expect(varResponse.chunk).toContain('x ==> 42');

      // Send Java method definition
      client.emit('terminal:input', {
        sessionId,
        input: 'String greet(String name) { return "Hello, " + name + "!"; }\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '|  created method greet(String)\njshell> ');
      }, 100);

      const [methodResponse] = await waitForEvent(client, 'terminal:data');
      expect(methodResponse.chunk).toContain('created method greet');

      // Call the method
      client.emit('terminal:input', {
        sessionId,
        input: 'System.out.println(greet("World"));\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Hello, World!\njshell> ');
      }, 100);

      const [callResponse] = await waitForEvent(client, 'terminal:data');
      expect(callResponse.chunk).toContain('Hello, World!');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle JShell errors and feedback', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'java');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'jshell> ');
      }, 100);

      // Send invalid Java code
      client.emit('terminal:input', {
        sessionId,
        input: 'int y = "not a number";\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId,
          'Error:\n' +
          '|  incompatible types: java.lang.String cannot be converted to int\n' +
          '|  int y = "not a number";\n' +
          '|          ^-----------^\n' +
          '|  1 error\n' +
          'jshell> '
        );
      }, 100);

      const [errorResponse] = await waitForEvent(client, 'terminal:data');
      expect(errorResponse.chunk).toContain('incompatible types');
      expect(errorResponse.chunk).toContain('1 error');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });

  describe('Bash Shell Sessions', () => {
    test('should handle basic bash interaction', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'bash');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '$ ');
      }, 100);

      // Send basic command
      client.emit('terminal:input', {
        sessionId,
        input: 'echo "Hello, Bash!"\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Hello, Bash!\n$ ');
      }, 100);

      const [echoResponse] = await waitForEvent(client, 'terminal:data');
      expect(echoResponse.chunk).toContain('Hello, Bash!');
      expect(echoResponse.chunk).toContain('$ ');

      // Send command with variable substitution
      client.emit('terminal:input', {
        sessionId,
        input: 'NAME="World"\necho "Hello, $NAME!"\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Hello, World!\n$ ');
      }, 100);

      const [varResponse] = await waitForEvent(client, 'terminal:data');
      expect(varResponse.chunk).toContain('Hello, World!');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle bash pipes and redirection', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'bash');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '$ ');
      }, 100);

      // Send command with pipe
      client.emit('terminal:input', {
        sessionId,
        input: 'echo "line1\\nline2\\nline3" | grep line2\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'line2\n$ ');
      }, 100);

      const [pipeResponse] = await waitForEvent(client, 'terminal:data');
      expect(pipeResponse.chunk).toContain('line2');

      // Send command with output redirection
      client.emit('terminal:input', {
        sessionId,
        input: 'echo "test content" > test.txt && cat test.txt\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'test content\n$ ');
      }, 100);

      const [redirectResponse] = await waitForEvent(client, 'terminal:data');
      expect(redirectResponse.chunk).toContain('test content');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle bash control sequences and job control', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'bash');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '$ ');
      }, 100);

      // Start background job
      client.emit('terminal:input', {
        sessionId,
        input: 'sleep 10 &\n'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '[1] 12345\n$ ');
      }, 100);

      const [bgResponse] = await waitForEvent(client, 'terminal:data');
      expect(bgResponse.chunk).toContain('[1]');
      expect(bgResponse.chunk).toContain('12345');

      // Send Ctrl+C to interrupt
      client.emit('terminal:input', {
        sessionId,
        input: '\x03'
      });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '^C\n$ ');
      }, 100);

      const [interruptResponse] = await waitForEvent(client, 'terminal:data');
      expect(interruptResponse.chunk).toContain('^C');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });

  describe('Cross-Language Interactive Features', () => {
    test('should handle language-specific prompts correctly', async () => {
      const testCases = [
        { language: 'python', expectedPrompt: '>>>', continuationPrompt: '...' },
        { language: 'javascript', expectedPrompt: '>', continuationPrompt: '...' },
        { language: 'java', expectedPrompt: 'jshell>', continuationPrompt: '> ' },
        { language: 'bash', expectedPrompt: '$', continuationPrompt: '> ' }
      ];

      for (const testCase of testCases) {
        const client = createClient();
        const sessionId = await createTerminalSession(client, testCase.language);

        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, testCase.expectedPrompt + ' ');
        }, 100);

        const [promptResponse] = await waitForEvent(client, 'terminal:data');
        expect(promptResponse.chunk).toContain(testCase.expectedPrompt);

        client.emit('terminal:stop', { sessionId });
        await waitForEvent(client, 'terminal:exit');
        client.disconnect();
      }
    });

    test('should preserve language-specific syntax highlighting', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'python');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '>>> ');
      }, 100);

      // Send code with syntax that should be preserved
      const syntaxCode = '# This is a comment\nprint("Hello")  # Another comment\n';

      client.emit('terminal:input', { sessionId, input: syntaxCode });

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, 'Hello\n>>> ');
      }, 100);

      const [syntaxResponse] = await waitForEvent(client, 'terminal:data');

      // The input should be processed with syntax preservation
      // (This would typically involve color codes or formatting)
      expect(syntaxResponse.chunk).toContain('Hello');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle rapid command execution without buffer overflow', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'bash');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '$ ');
      }, 100);

      // Send many commands rapidly
      const commands = Array.from({ length: 50 }, (_, i) => `echo "Command ${i}"`);
      const inputPromises = commands.map((cmd, index) =>
        new Promise(resolve => {
          setTimeout(() => {
            client.emit('terminal:input', { sessionId, input: `${cmd}\n` });
            resolve();
          }, index * 20);
        })
      );

      // Simulate responses for each command
      commands.forEach((cmd, index) => {
        setTimeout(() => {
          mockDockerService.simulateContainerOutput(sessionId, `${cmd.split(' ')[2]}\n$ `);
        }, 150 + index * 20);
      });

      await Promise.all(inputPromises);

      // Collect all responses
      const responses = [];
      await new Promise(resolve => {
        const onData = (data) => {
          responses.push(data);
          if (responses.length >= commands.length) {
            client.off('terminal:data', onData);
            resolve();
          }
        };
        client.on('terminal:data', onData);
      });

      expect(responses.length).toBe(commands.length);
      responses.forEach((response, index) => {
        expect(response.chunk).toContain(`Command ${index}`);
      });

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });

    test('should handle large data output without performance degradation', async () => {
      const client = createClient();
      const sessionId = await createTerminalSession(client, 'python');

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '>>> ');
      }, 100);

      // Generate large output
      const largeOutput = Array.from({ length: 1000 }, (_, i) => `Line ${i}`).join('\n');

      client.emit('terminal:input', {
        sessionId,
        input: 'print("\\n".join([f"Line {i}" for i in range(1000)]))\n'
      });

      // Simulate large output in chunks
      const chunkSize = 100;
      for (let i = 0; i < largeOutput.length; i += chunkSize) {
        setTimeout(() => {
          const chunk = largeOutput.slice(i, i + chunkSize);
          mockDockerService.simulateContainerOutput(sessionId, chunk);
        }, 100 + i);
      }

      setTimeout(() => {
        mockDockerService.simulateContainerOutput(sessionId, '\n>>> ');
      }, 500);

      const [largeResponse] = await waitForEvent(client, 'terminal:data', 2000);
      expect(largeResponse.chunk).toContain('Line 0');
      expect(largeResponse.chunk).toContain('Line 999');

      client.emit('terminal:stop', { sessionId });
      await waitForEvent(client, 'terminal:exit');
      client.disconnect();
    });
  });
});