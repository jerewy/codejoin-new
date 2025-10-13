/**
 * Tests for Python Interactive Terminal Sessions
 *
 * Tests enhanced input handling for Python REPL with focus on:
 * - Multi-line input handling
 * - Indentation preservation
 * - Interactive input() calls
 * - Control character handling
 * - Binary data in Python output
 */

const { InputHandler } = require('../src/utils/inputHandler');
const { PTYStreamProcessor } = require('../src/utils/ptyStreamProcessor');

describe('Python Terminal Integration', () => {
  let inputHandler;
  let streamProcessor;

  beforeEach(() => {
    inputHandler = new InputHandler({
      maxInputLength: 1024 * 1024,
      enableLogging: false
    });

    streamProcessor = PTYStreamProcessor.createOutputProcessor({
      language: 'python',
      sessionId: 'test-python',
      preserveANSI: true,
      preserveControlChars: true,
      fixLineEndings: true,
      enableLogging: false
    });
  });

  afterEach(() => {
    if (streamProcessor) {
      streamProcessor.destroy();
    }
  });

  describe('Basic Python Input Handling', () => {
    test('should handle simple Python statements', async () => {
      const input = 'print("Hello, World!")';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
      expect(result.language).toBe('python');
    });

    test('should handle Python expressions', async () => {
      const input = '2 + 2';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
    });

    test('should handle Python import statements', async () => {
      const input = 'import math';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
    });
  });

  describe('Multi-line Python Input', () => {
    test('should handle function definitions', async () => {
      const input = `def greet(name):
    print(f"Hello, {name}!")`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('def greet(name):');
      expect(result.data).toContain('print(f"Hello, {name}!")');
    });

    test('should handle class definitions', async () => {
      const input = `class Person:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return f"Hello, I'm {self.name}"`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('class Person:');
      expect(result.data).toContain('def __init__(self, name):');
      expect(result.data).toContain('def greet(self):');
    });

    test('should handle if statements', async () => {
      const input = `if x > 0:
    print("Positive")
elif x < 0:
    print("Negative")
else:
    print("Zero")`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('if x > 0:');
      expect(result.data).toContain('elif x < 0:');
      expect(result.data).toContain('else:');
    });

    test('should handle for loops', async () => {
      const input = `for i in range(5):
    print(i)`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('for i in range(5):');
      expect(result.data).toContain('print(i)');
    });

    test('should handle while loops', async () => {
      const input = `while count < 10:
    count += 1
    print(count)`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('while count < 10:');
      expect(result.data).toContain('count += 1');
    });

    test('should handle try-except blocks', async () => {
      const input = `try:
    result = risky_operation()
except ValueError as e:
    print(f"Error: {e}")
finally:
    cleanup()`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('try:');
      expect(result.data).toContain('except ValueError as e:');
      expect(result.data).toContain('finally:');
    });

    test('should handle context managers', async () => {
      const input = `with open('file.txt', 'r') as f:
    content = f.read()
    print(content)`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('with open');
      expect(result.data).toContain('as f:');
    });
  });

  describe('Python Indentation Handling', () => {
    test('should preserve proper indentation', async () => {
      const input = `def function():
    level1()
        level2()
    level1()`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('    level1()');
      expect(result.data).toContain('        level2()');
    });

    test('should handle mixed indentation', async () => {
      const input = `if condition:
\t# Tab indentation
    # Space indentation
    pass`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('\t# Tab indentation');
      expect(result.data).toContain('    # Space indentation');
    });

    test('should handle deep nesting', async () => {
      const input = `def outer():
    def middle():
        def inner():
            print("Deeply nested")
        inner()
    middle()
outer()`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('    def middle():');
      expect(result.data).toContain('        def inner():');
      expect(result.data).toContain('            print("Deeply nested")');
    });
  });

  describe('Python Interactive Input', () => {
    test('should handle input() function calls', async () => {
      const input = 'name = input("Enter your name: ")';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('input("Enter your name: ")');
    });

    test('should handle complex input scenarios', async () => {
      const input = `numbers = []
for i in range(3):
    num = int(input(f"Enter number {i+1}: "))
    numbers.append(num)

print(f"Sum: {sum(numbers)}")`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('input(f"Enter number {i+1}: ")');
    });
  });

  describe('Python Special Characters and Unicode', () => {
    test('should handle Unicode strings', async () => {
      const input = 'print("Hello, 世界! 🌍")';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
      expect(result.metadata.hasBinaryData).toBe(true);
    });

    test('should handle Unicode variable names', async () => {
      const input = '变量 = "Chinese variable"';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
    });

    test('should handle emoji in strings', async () => {
      const input = 'print("Python 🐍 is fun! 🎉")';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
    });

    test('should handle escaped characters', async () => {
      const input = 'print("Line 1\\nLine 2\\tTabbed\\rCarriage return")';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
    });
  });

  describe('Python REPL Output Processing', () => {
    test('should handle Python REPL prompts', (done) => {
      const output = '>>> print("Hello")\nHello\n>>> ';
      let receivedData = '';

      streamProcessor.on('data', (chunk) => {
        receivedData += chunk.toString();
        if (receivedData.includes('>>>')) {
          expect(receivedData).toContain('>>> print("Hello")');
          expect(receivedData).toContain('Hello');
          expect(receivedData).toContain('>>> ');
          done();
        }
      });

      streamProcessor.write(output);
    });

    test('should handle Python multi-line prompts', (done) => {
      const output = `>>> def greet():
...     print("Hello")
...
>>> greet()
Hello`;

      let receivedData = '';

      streamProcessor.on('data', (chunk) => {
        receivedData += chunk.toString();
        if (receivedData.includes('Hello')) {
          expect(receivedData).toContain('>>> def greet():');
          expect(receivedData).toContain('...     print("Hello")');
          expect(receivedData).toContain('>>> greet()');
          done();
        }
      });

      streamProcessor.write(output);
    });

    test('should handle Python exceptions', (done) => {
      const output = `>>> 1 / 0
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ZeroDivisionError: division by zero
>>> `;

      streamProcessor.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('ZeroDivisionError')) {
          expect(data).toContain('Traceback');
          expect(data).toContain('ZeroDivisionError: division by zero');
          done();
        }
      });

      streamProcessor.write(output);
    });

    test('should handle Python object representations', (done) => {
      const output = `>>> {"key": "value"}
{'key': 'value'}
>>> [1, 2, 3]
[1, 2, 3]
>>> (1, 2, 3)
(1, 2, 3)`;

      streamProcessor.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('(1, 2, 3)')) {
          expect(data).toContain("{'key': 'value'}");
          expect(data).toContain('[1, 2, 3]');
          expect(data).toContain('(1, 2, 3)');
          done();
        }
      });

      streamProcessor.write(output);
    });
  });

  describe('Python Control Character Handling', () => {
    test('should handle Ctrl+C interrupt', (done) => {
      const output = '>>> while True:\n...     pass\n' + '\x03' + '>>> ';

      streamProcessor.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('\x03')) {
          expect(data).toContain('\x03');
          expect(processor.getStats().controlCharsProcessed).toBeGreaterThan(0);
          done();
        }
      });

      streamProcessor.write(output);
    });

    test('should handle Ctrl+D EOF', (done) => {
      const output = '>>> input("Enter something: ")\nhello\x04>>> ';

      streamProcessor.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('\x04')) {
          expect(data).toContain('\x04');
          done();
        }
      });

      streamProcessor.write(output);
    });

    test('should handle backspace in input', (done) => {
      const output = '>>> prit\x7f\x7f\x7f\x7fint("Hello")\nHello\n>>> ';

      streamProcessor.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('\x7f')) {
          expect(data).toContain('\x7f');
          done();
        }
      });

      streamProcessor.write(output);
    });
  });

  describe('Python ANSI Color Output', () => {
    test('should preserve syntax highlighting', (done) => {
      const coloredOutput = '\x1b[36m>>> \x1b[39m\x1b[33mprint\x1b[39m\x1b[36m(\x1b[39m\x1b[31m"Hello"\x1b[39m\x1b[36m)\x1b[39m\nHello\n\x1b[36m>>> \x1b[39m';

      streamProcessor.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('Hello')) {
          expect(data).toContain('\x1b[36m'); // Cyan
          expect(data).toContain('\x1b[33m'); // Yellow
          expect(data).toContain('\x1b[31m'); // Red
          expect(data).toContain('\x1b[39m'); // Reset
          expect(streamProcessor.getStats().ansiSequencesProcessed).toBeGreaterThan(0);
          done();
        }
      });

      streamProcessor.write(coloredOutput);
    });
  });

  describe('Python Complex Scenarios', () => {
    test('should handle decorator syntax', async () => {
      const input = `@property
def name(self):
    return self._name

@name.setter
def name(self, value):
    self._name = value`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('@property');
      expect(result.data).toContain('@name.setter');
    });

    test('should handle list comprehensions', async () => {
      const input = '[x**2 for x in range(10) if x % 2 == 0]';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
    });

    test('should handle lambda functions', async () => {
      const input = 'square = lambda x: x**2';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toBe(input);
    });

    test('should handle f-strings', async () => {
      const input = 'name = "World"\nprint(f"Hello, {name}!")';
      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('f"Hello, {name}!"');
    });

    test('should handle type hints', async () => {
      const input = `from typing import List

def process_items(items: List[str]) -> str:
    return ", ".join(items)`;

      const result = await inputHandler.processInput(input, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('items: List[str]');
      expect(result.data).toContain('-> str');
    });
  });

  describe('Performance with Large Python Code', () => {
    test('should handle large Python scripts', async () => {
      const largeFunction = `
def large_function():
    result = []
    for i in range(1000):
        # Complex processing
        temp = []
        for j in range(100):
            temp.append(i * j)
        result.extend(temp)
    return result
`.repeat(10); // Make it larger

      const result = await inputHandler.processInput(largeFunction, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(1000);
    });

    test('should handle deeply nested structures efficiently', async () => {
      const nestedCode = `
def level1():
    def level2():
        def level3():
            def level4():
                def level5():
                    return "deep nesting result"
                return level5()
            return level4()
        return level3()
    return level2()
`.repeat(20);

      const result = await inputHandler.processInput(nestedCode, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('level5()');
    });
  });
});