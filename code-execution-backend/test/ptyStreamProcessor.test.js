/**
 * Comprehensive Tests for PTY Stream Processor
 *
 * Tests stream processing, binary data handling, and language-specific transformations
 */

const { PTYStreamProcessor, CONTROL_CHARS, ANSI_SEQUENCES } = require('../src/utils/ptyStreamProcessor');
const Stream = require('stream');

describe('PTYStreamProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new PTYStreamProcessor({
      language: 'bash',
      sessionId: 'test-session',
      preserveANSI: true,
      preserveControlChars: true,
      fixLineEndings: true,
      enableLogging: false,
      bufferSize: 512
    });
  });

  afterEach(() => {
    if (processor) {
      processor.destroy();
    }
  });

  describe('Basic Stream Processing', () => {
    test('should process simple string input', (done) => {
      const inputData = 'Hello, World!';
      const expectedOutput = 'Hello, World!';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        done();
      });

      processor.write(inputData);
    });

    test('should process Buffer input', (done) => {
      const inputData = Buffer.from('Hello, World!', 'utf8');
      const expectedOutput = 'Hello, World!';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        done();
      });

      processor.write(inputData);
    });

    test('should handle multiple writes', (done) => {
      const chunks = [];
      processor.on('data', (chunk) => {
        chunks.push(chunk.toString());
        if (chunks.length === 2) {
          expect(chunks).toEqual(['Hello', ' World']);
          done();
        }
      });

      processor.write('Hello');
      processor.write(' World');
    });
  });

  describe('Line Ending Processing', () => {
    test('should convert CRLF to LF', (done) => {
      const inputData = 'Hello\r\nWorld';
      const expectedOutput = 'Hello\nWorld';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        done();
      });

      processor.write(inputData);
    });

    test('should convert standalone CR to LF', (done) => {
      const inputData = 'Hello\rWorld';
      const expectedOutput = 'Hello\nWorld';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        done();
      });

      processor.write(inputData);
    });

    test('should preserve existing LF', (done) => {
      const inputData = 'Hello\nWorld';
      const expectedOutput = 'Hello\nWorld';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        done();
      });

      processor.write(inputData);
    });
  });

  describe('Control Character Processing', () => {
    test('should preserve Ctrl+C', (done) => {
      const inputData = 'Hello' + CONTROL_CHARS.CTRL_C + 'World';
      const expectedOutput = 'Hello\x03World';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        expect(processor.getStats().controlCharsProcessed).toBeGreaterThan(0);
        done();
      });

      processor.write(inputData);
    });

    test('should preserve backspace', (done) => {
      const inputData = 'Hello' + CONTROL_CHARS.BACKSPACE + 'World';
      const expectedOutput = 'Hello\x7fWorld';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        expect(processor.getStats().controlCharsProcessed).toBeGreaterThan(0);
        done();
      });

      processor.write(inputData);
    });

    test('should preserve tab character', (done) => {
      const inputData = 'Hello' + CONTROL_CHARS.TAB + 'World';
      const expectedOutput = 'Hello\tWorld';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        expect(processor.getStats().controlCharsProcessed).toBeGreaterThan(0);
        done();
      });

      processor.write(inputData);
    });
  });

  describe('ANSI Sequence Processing', () => {
    test('should preserve ANSI color sequences', (done) => {
      const inputData = '\x1b[31mRed Text\x1b[0m';
      const expectedOutput = '\x1b[31mRed Text\x1b[0m';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        expect(processor.getStats().ansiSequencesProcessed).toBeGreaterThan(0);
        done();
      });

      processor.write(inputData);
    });

    test('should preserve ANSI cursor sequences', (done) => {
      const inputData = '\x1b[10;20H';
      const expectedOutput = '\x1b[10;20H';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        expect(processor.getStats().ansiSequencesProcessed).toBeGreaterThan(0);
        done();
      });

      processor.write(inputData);
    });

    test('should preserve arrow key sequences', (done) => {
      const inputData = ANSI_SEQUENCES.UP + ANSI_SEQUENCES.DOWN + ANSI_SEQUENCES.LEFT + ANSI_SEQUENCES.RIGHT;
      const expectedOutput = '\x1b[A\x1b[B\x1b[D\x1b[C';

      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(expectedOutput);
        expect(processor.getStats().ansiSequencesProcessed).toBeGreaterThan(0);
        done();
      });

      processor.write(inputData);
    });
  });

  describe('Language-Specific Processing', () => {
    describe('Python', () => {
      beforeEach(() => {
        processor = new PTYStreamProcessor({
          language: 'python',
          sessionId: 'test-python',
          preserveANSI: true,
          preserveControlChars: true,
          fixLineEndings: true,
          enableLogging: false
        });
      });

      test('should handle Python REPL output', (done) => {
        const inputData = '>>> print("Hello")\nHello\n>>> ';
        processor.on('data', (chunk) => {
          expect(chunk.toString()).toContain('>>> print("Hello")');
          expect(chunk.toString()).toContain('Hello');
          done();
        });

        processor.write(inputData);
      });

      test('should handle Python multi-line prompts', (done) => {
        const inputData = '>>> def hello():\n...     print("Hello")\n... ';
        processor.on('data', (chunk) => {
          expect(chunk.toString()).toContain('>>> def hello():');
          expect(chunk.toString()).toContain('...     print("Hello")');
          done();
        });

        processor.write(inputData);
      });
    });

    describe('JavaScript', () => {
      beforeEach(() => {
        processor = new PTYStreamProcessor({
          language: 'javascript',
          sessionId: 'test-javascript',
          preserveANSI: true,
          preserveControlChars: true,
          fixLineEndings: true,
          enableLogging: false
        });
      });

      test('should handle Node.js REPL output', (done) => {
        const inputData = '> console.log("Hello")\nHello\nundefined\n> ';
        processor.on('data', (chunk) => {
          expect(chunk.toString()).toContain('> console.log("Hello")');
          expect(chunk.toString()).toContain('Hello');
          done();
        });

        processor.write(inputData);
      });
    });

    describe('Java', () => {
      beforeEach(() => {
        processor = new PTYStreamProcessor({
          language: 'java',
          sessionId: 'test-java',
          preserveANSI: true,
          preserveControlChars: true,
          fixLineEndings: true,
          enableLogging: false
        });
      });

      test('should handle JShell output', (done) => {
        const inputData = 'jshell> System.out.println("Hello")\nHello\njshell> ';
        processor.on('data', (chunk) => {
          expect(chunk.toString()).toContain('jshell> System.out.println("Hello")');
          expect(chunk.toString()).toContain('Hello');
          done();
        });

        processor.write(inputData);
      });
    });
  });

  describe('Buffer Management', () => {
    test('should handle large chunks by splitting them', (done) => {
      const largeInput = 'a'.repeat(1024); // Larger than default chunk size
      let totalReceived = '';
      let chunkCount = 0;

      processor.on('data', (chunk) => {
        totalReceived += chunk.toString();
        chunkCount++;

        if (chunkCount >= 2) { // Should receive at least 2 chunks
          expect(totalReceived.length).toBeGreaterThan(0);
          expect(totalReceived).toContain('a');
          done();
        }
      });

      processor.write(largeInput);
    });

    test('should prevent buffer overflow', (done) => {
      // Create a processor with small buffer size
      const smallProcessor = new PTYStreamProcessor({
        language: 'bash',
        sessionId: 'test-buffer',
        bufferSize: 100,
        enableLogging: false
      });

      const largeInput = 'a'.repeat(200);
      smallProcessor.on('data', (chunk) => {
        // Should receive data without issues
        expect(chunk.length).toBeGreaterThan(0);
      });

      smallProcessor.on('finish', () => {
        expect(smallProcessor.getStats().bufferSize).toBeLessThanOrEqual(100);
        smallProcessor.destroy();
        done();
      });

      smallProcessor.write(largeInput);
      smallProcessor.end();
    });
  });

  describe('Statistics Tracking', () => {
    test('should track processing statistics', (done) => {
      const inputData = 'Hello\x1b[31mWorld\x03\x7f';

      processor.on('data', () => {
        const stats = processor.getStats();
        expect(stats.bytesProcessed).toBeGreaterThan(0);
        expect(stats.chunksProcessed).toBeGreaterThan(0);
        expect(stats.controlCharsProcessed).toBeGreaterThan(0);
        expect(stats.ansiSequencesProcessed).toBeGreaterThan(0);
        expect(stats.errors).toBe(0);
        done();
      });

      processor.write(inputData);
    });

    test('should reset statistics', () => {
      processor.write('test');
      const initialStats = processor.getStats();
      expect(initialStats.chunksProcessed).toBeGreaterThan(0);

      processor.resetStats();
      const resetStats = processor.getStats();
      expect(resetStats.chunksProcessed).toBe(0);
      expect(resetStats.bytesProcessed).toBe(0);
      expect(resetStats.controlCharsProcessed).toBe(0);
      expect(resetStats.ansiSequencesProcessed).toBe(0);
      expect(resetStats.errors).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle processing errors gracefully', (done) => {
      // Create a processor with invalid options to trigger errors
      const faultyProcessor = new PTYStreamProcessor({
        language: 'invalid-language',
        sessionId: 'test-error',
        enableLogging: false
      });

      faultyProcessor.on('error', (error) => {
        expect(error).toBeDefined();
        faultyProcessor.destroy();
        done();
      });

      faultyProcessor.on('data', () => {
        // Should not reach here
        faultyProcessor.destroy();
        done(new Error('Should have thrown an error'));
      });

      // Write something that might cause issues
      faultyProcessor.write('test');
    });

    test('should handle stream destruction', () => {
      processor.write('test data');
      expect(processor.destroyed).toBe(false);

      processor.destroy();
      expect(processor.destroyed).toBe(true);
    });
  });

  describe('Stream Completion', () => {
    test('should flush remaining data on end', (done) => {
      const chunks = [];

      processor.on('data', (chunk) => {
        chunks.push(chunk.toString());
      });

      processor.on('finish', () => {
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.join('')).toBe('Hello World');
        done();
      });

      processor.write('Hello ');
      processor.write('World');
      processor.end();
    });

    test('should handle empty stream', (done) => {
      processor.on('finish', () => {
        expect(processor.getStats().chunksProcessed).toBe(0);
        done();
      });

      processor.end();
    });
  });

  describe('Static Factory Methods', () => {
    test('should create input processor', () => {
      const inputProcessor = PTYStreamProcessor.createInputProcessor({
        language: 'python',
        sessionId: 'test-input'
      });

      expect(inputProcessor).toBeInstanceOf(PTYStreamProcessor);
      expect(inputProcessor.options.direction).toBe('input');
      inputProcessor.destroy();
    });

    test('should create output processor', () => {
      const outputProcessor = PTYStreamProcessor.createOutputProcessor({
        language: 'python',
        sessionId: 'test-output'
      });

      expect(outputProcessor).toBeInstanceOf(PTYStreamProcessor);
      expect(outputProcessor.options.direction).toBe('output');
      outputProcessor.destroy();
    });
  });

  describe('Binary Data Preservation', () => {
    test('should preserve UTF-8 characters', (done) => {
      const utf8Input = 'Hello 世界 🌍 Café';
      processor.on('data', (chunk) => {
        expect(chunk.toString()).toBe(utf8Input);
        done();
      });

      processor.write(utf8Input);
    });

    test('should preserve binary data in buffers', (done) => {
      const binaryData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0xe4, 0xb8, 0xad, 0xe6, 0x96, 0x87]);

      processor.on('data', (chunk) => {
        expect(Buffer.compare(chunk, binaryData)).toBe(0);
        done();
      });

      processor.write(binaryData);
    });
  });

  describe('Performance', () => {
    test('should handle high-frequency small writes', (done) => {
      let receivedCount = 0;
      const writeCount = 100;

      processor.on('data', () => {
        receivedCount++;
        if (receivedCount === writeCount) {
          expect(processor.getStats().chunksProcessed).toBe(writeCount);
          done();
        }
      });

      for (let i = 0; i < writeCount; i++) {
        processor.write(`chunk ${i}\n`);
      }
    });

    test('should handle mixed data types efficiently', (done) => {
      const chunks = [];
      const inputs = [
        'Hello',
        Buffer.from(' World', 'utf8'),
        '\x1b[31m!',
        CONTROL_CHARS.CTRL_C,
        ' End'
      ];

      processor.on('data', (chunk) => {
        chunks.push(chunk.toString());
        if (chunks.length === inputs.length) {
          expect(chunks.join('')).toBe('Hello World\x1b[31m!\x03 End');
          done();
        }
      });

      inputs.forEach(input => processor.write(input));
    });
  });
});