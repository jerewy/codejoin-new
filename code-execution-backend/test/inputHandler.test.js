/**
 * Comprehensive Tests for Enhanced Input Handler
 *
 * Tests binary data handling, control characters, and language-specific processing
 */

const { InputHandler, CONTROL_CHARS, ANSI_SEQUENCES } = require('../src/utils/inputHandler');

describe('InputHandler', () => {
  let inputHandler;

  beforeEach(() => {
    inputHandler = new InputHandler({
      maxInputLength: 1024,
      enableLogging: false,
      strictMode: false
    });
  });

  describe('Basic Input Processing', () => {
    test('should handle null and undefined input', async () => {
      const result1 = await inputHandler.processInput(null);
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Invalid input data');

      const result2 = await inputHandler.processInput(undefined);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Invalid input data');
    });

    test('should handle empty input', async () => {
      const result1 = await inputHandler.processInput('');
      expect(result1.success).toBe(false);

      const result2 = await inputHandler.processInput(Buffer.alloc(0));
      expect(result2.success).toBe(false);
    });

    test('should handle simple string input', async () => {
      const result = await inputHandler.processInput('hello world');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello world');
      expect(result.metadata.type).toBe('string');
    });

    test('should handle Buffer input', async () => {
      const buffer = Buffer.from('hello world', 'utf8');
      const result = await inputHandler.processInput(buffer);
      expect(result.success).toBe(true);
      expect(result.data).toBe(buffer);
      expect(result.metadata.isBuffer).toBe(true);
    });

    test('should handle ArrayBuffer input', async () => {
      const arrayBuffer = new TextEncoder().encode('hello world').buffer;
      const result = await inputHandler.processInput(arrayBuffer);
      expect(result.success).toBe(true);
      expect(result.metadata.isBuffer).toBe(true);
      expect(result.data.toString('utf8')).toBe('hello world');
    });
  });

  describe('Binary Data Handling', () => {
    test('should preserve UTF-8 characters', async () => {
      const utf8Text = 'Hello 世界 🌍 Café';
      const result = await inputHandler.processInput(utf8Text);
      expect(result.success).toBe(true);
      expect(result.data).toBe(utf8Text);
    });

    test('should handle binary data in Buffer', async () => {
      const binaryData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87]);
      const result = await inputHandler.processInput(binaryData);
      expect(result.success).toBe(true);
      expect(result.metadata.isBuffer).toBe(true);
      expect(result.hasBinaryData).toBe(true);
    });

    test('should convert string with binary data to Buffer', async () => {
      const textWithBinary = 'Hello 世界';
      const result = await inputHandler.processInput(textWithBinary, { preserveBinary: true });
      expect(result.success).toBe(true);
      expect(result.metadata.isBuffer).toBe(true);
    });
  });

  describe('Control Character Processing', () => {
    test('should handle Ctrl+C', async () => {
      const result = await inputHandler.processInput(CONTROL_CHARS.CTRL_C);
      expect(result.success).toBe(true);
      expect(result.data).toBe(CONTROL_CHARS.CTRL_C);
      expect(result.metadata.hasControlChars).toBe(true);
    });

    test('should handle Ctrl+D', async () => {
      const result = await inputHandler.processInput(CONTROL_CHARS.CTRL_D);
      expect(result.success).toBe(true);
      expect(result.data).toBe(CONTROL_CHARS.CTRL_D);
      expect(result.metadata.hasControlChars).toBe(true);
    });

    test('should handle backspace', async () => {
      const result = await inputHandler.processInput(CONTROL_CHARS.BACKSPACE);
      expect(result.success).toBe(true);
      expect(result.data).toBe(CONTROL_CHARS.BACKSPACE);
      expect(result.metadata.hasControlChars).toBe(true);
    });

    test('should handle mixed control characters and text', async () => {
      const input = 'hello' + CONTROL_CHARS.CTRL_C + 'world';
      const result = await inputHandler.processInput(input);
      expect(result.success).toBe(true);
      expect(result.metadata.hasControlChars).toBe(true);
    });
  });

  describe('ANSI Sequence Processing', () => {
    test('should handle ANSI color sequences', async () => {
      const input = '\x1b[31mRed Text\x1b[0m';
      const result = await inputHandler.processInput(input);
      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
      expect(result.metadata.hasANSI).toBe(true);
    });

    test('should handle ANSI cursor positioning', async () => {
      const input = '\x1b[10;20H';
      const result = await inputHandler.processInput(input);
      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
      expect(result.metadata.hasANSI).toBe(true);
    });

    test('should handle arrow keys', async () => {
      const result = await inputHandler.processInput(ANSI_SEQUENCES.UP);
      expect(result.success).toBe(true);
      expect(result.data).toBe(ANSI_SEQUENCES.UP);
      expect(result.metadata.hasANSI).toBe(true);
    });
  });

  describe('Language-Specific Processing', () => {
    describe('Python', () => {
      test('should handle Python input', async () => {
        const input = 'print("Hello, World!")';
        const result = await inputHandler.processInput(input, { language: 'python' });
        expect(result.success).toBe(true);
        expect(result.language).toBe('python');
      });

      test('should handle Python multi-line input', async () => {
        const input = 'def hello():\n    print("Hello")';
        const result = await inputHandler.processInput(input, { language: 'python' });
        expect(result.success).toBe(true);
        expect(result.language).toBe('python');
      });

      test('should handle Python with indentation', async () => {
        const input = 'if True:\n    print("True")';
        const result = await inputHandler.processInput(input, { language: 'python' });
        expect(result.success).toBe(true);
      });
    });

    describe('JavaScript', () => {
      test('should handle JavaScript input', async () => {
        const input = 'console.log("Hello, World!");';
        const result = await inputHandler.processInput(input, { language: 'javascript' });
        expect(result.success).toBe(true);
        expect(result.language).toBe('javascript');
      });

      test('should handle JavaScript multi-line input', async () => {
        const input = 'function hello() {\n    console.log("Hello");\n}';
        const result = await inputHandler.processInput(input, { language: 'javascript' });
        expect(result.success).toBe(true);
      });
    });

    describe('Java', () => {
      test('should handle Java input', async () => {
        const input = 'System.out.println("Hello, World!");';
        const result = await inputHandler.processInput(input, { language: 'java' });
        expect(result.success).toBe(true);
        expect(result.language).toBe('java');
      });
    });

    describe('Bash', () => {
      test('should handle Bash input', async () => {
        const input = 'echo "Hello, World!"';
        const result = await inputHandler.processInput(input, { language: 'bash' });
        expect(result.success).toBe(true);
        expect(result.language).toBe('bash');
      });
    });
  });

  describe('Input Validation', () => {
    test('should reject input that exceeds maximum length', async () => {
      const longInput = 'a'.repeat(2048); // Exceeds default 1024 limit
      const result = await inputHandler.processInput(longInput);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input too large');
    });

    test('should reject dangerous commands', async () => {
      const dangerousInput = '; rm -rf /';
      const result = await inputHandler.processInput(dangerousInput, { enableValidation: true });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input contains potentially dangerous commands');
    });

    test('should reject shell injection attempts', async () => {
      const injectionInput = '| sh -c "rm -rf /"';
      const result = await inputHandler.processInput(injectionInput, { enableValidation: true });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Input contains potentially dangerous commands');
    });
  });

  describe('Line Ending Processing', () => {
    test('should convert Windows CRLF to Unix LF', async () => {
      const input = 'hello\r\nworld';
      const result = await inputHandler.processInput(input);
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello\nworld');
    });

    test('should handle standalone CR', async () => {
      const input = 'hello\rworld';
      const result = await inputHandler.processInput(input);
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello\nworld');
    });

    test('should preserve existing LF', async () => {
      const input = 'hello\nworld';
      const result = await inputHandler.processInput(input);
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello\nworld');
    });
  });

  describe('Error Handling', () => {
    test('should handle processing errors gracefully', async () => {
      // Create a handler that will throw an error
      const faultyHandler = new InputHandler();

      // Mock the preprocess method to throw an error
      const originalPreprocess = faultyHandler.languageHandlers.get('python').preprocess;
      faultyHandler.languageHandlers.get('python').preprocess = () => {
        throw new Error('Test error');
      };

      const result = await faultyHandler.processInput('test', { language: 'python' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Input processing failed');
    });

    test('should handle invalid language gracefully', async () => {
      const result = await inputHandler.processInput('test', { language: 'invalid-language' });
      expect(result.success).toBe(true);
      expect(result.processed).toBe(false);
    });
  });

  describe('Language Handler Management', () => {
    test('should get language info', () => {
      const pythonInfo = inputHandler.getLanguageInfo('python');
      expect(pythonInfo.name).toBe('Python');
      expect(pythonInfo.supported).toBe(true);
      expect(pythonInfo.features.multiline).toBe(true);
      expect(pythonInfo.features.validation).toBe(true);
    });

    test('should return unsupported language info', () => {
      const info = inputHandler.getLanguageInfo('unsupported');
      expect(info.name).toBe('unsupported');
      expect(info.supported).toBe(false);
    });

    test('should add custom language handler', () => {
      const customHandler = {
        name: 'CustomLang',
        preprocess: async (input) => input,
        validate: (input) => ({ valid: true })
      };

      inputHandler.addLanguageHandler('custom', customHandler);
      const info = inputHandler.getLanguageInfo('custom');
      expect(info.supported).toBe(true);
      expect(info.name).toBe('CustomLang');
    });

    test('should remove language handler', () => {
      const removed = inputHandler.removeLanguageHandler('python');
      expect(removed).toBe(true);

      const info = inputHandler.getLanguageInfo('python');
      expect(info.supported).toBe(false);
    });

    test('should get supported languages', () => {
      const languages = inputHandler.getSupportedLanguages();
      expect(languages).toHaveLength(4);
      expect(languages.map(l => l.name)).toContain('python');
      expect(languages.map(l => l.name)).toContain('javascript');
      expect(languages.map(l => l.name)).toContain('java');
      expect(languages.map(l => l.name)).toContain('bash');
    });
  });

  describe('Statistics and Metadata', () => {
    test('should provide accurate metadata', async () => {
      const input = 'hello \x1b[31mworld\x1b[0m';
      const result = await inputHandler.processInput(input);
      expect(result.success).toBe(true);
      expect(result.metadata.length).toBe(input.length);
      expect(result.metadata.type).toBe('string');
      expect(result.metadata.isBuffer).toBe(false);
      expect(result.metadata.hasControlChars).toBe(true);
      expect(result.metadata.hasANSI).toBe(true);
    });

    test('should handle buffer metadata correctly', async () => {
      const buffer = Buffer.from('hello', 'utf8');
      const result = await inputHandler.processInput(buffer);
      expect(result.success).toBe(true);
      expect(result.metadata.isBuffer).toBe(true);
      expect(result.metadata.type).toBe('object');
    });
  });
});