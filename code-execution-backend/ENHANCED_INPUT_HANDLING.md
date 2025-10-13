# Enhanced Input Handling for Terminal Execution Backend

This document describes the enhanced input handling system for the terminal execution backend, which provides comprehensive support for binary data, control characters, and language-specific processing.

## Overview

The enhanced input handling system addresses the following key requirements:

1. **Binary Data Preservation** - Ensures all binary data is preserved through the input pipeline
2. **UTF-8 Encoding Support** - Proper handling of international characters and special symbols
3. **Control Character Handling** - Correct processing of Ctrl+C, Ctrl+D, arrow keys, etc.
4. **Language-Specific Processing** - Tailored input handling for different REPL environments
5. **Input Validation** - Security-focused validation to prevent malicious input
6. **PTY Stream Processing** - Enhanced processing for pseudo-terminal streams

## Architecture

### Core Components

1. **InputHandler** (`src/utils/inputHandler.js`)
   - Central input processing engine
   - Language-specific handlers
   - Security validation
   - Binary data preservation

2. **PTYStreamProcessor** (`src/utils/ptyStreamProcessor.js`)
   - Stream-based processing for PTY data
   - Real-time chunk processing
   - Buffer management
   - Statistics tracking

3. **Enhanced TerminalService** (`src/services/terminalService.js`)
   - Integration with existing terminal service
   - Session-specific handlers
   - Cleanup and resource management

## Features

### 1. Binary Data Handling

```javascript
const { InputHandler } = require('./src/utils/inputHandler');

const handler = new InputHandler();

// Handle UTF-8 text
const result = await handler.processInput('Hello 世界 🌍', {
  language: 'python',
  preserveBinary: true
});

// Handle binary buffers
const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const result = await handler.processInput(buffer);
```

### 2. Control Character Processing

```javascript
const { CONTROL_CHARS } = require('./src/utils/inputHandler');

// Handle Ctrl+C (interrupt)
await handler.processInput(CONTROL_CHARS.CTRL_C, { language: 'python' });

// Handle arrow keys
await handler.processInput(ANSI_SEQUENCES.UP, { language: 'bash' });

// Handle backspace
await handler.processInput(CONTROL_CHARS.BACKSPACE, { language: 'python' });
```

### 3. Language-Specific Input Handling

#### Python REPL
- Multi-line input detection
- Indentation preservation
- Interactive input() support
- Special command handling

```javascript
// Python function definition
const pythonCode = `def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)`;

const result = await handler.processInput(pythonCode, { language: 'python' });
```

#### Node.js REPL
- JavaScript syntax awareness
- Arrow function support
- Object literal handling

```javascript
// JavaScript arrow function
const jsCode = `const factorial = n => {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};`;

const result = await handler.processInput(jsCode, { language: 'javascript' });
```

#### Java Shell (JShell)
- Java class definitions
- Method declarations
- JShell command support

```javascript
// Java class definition
const javaCode = `public class Calculator {
    public static int add(int a, int b) {
        return a + b;
    }
}`;

const result = await handler.processInput(javaCode, { language: 'java' });
```

### 4. PTY Stream Processing

```javascript
const { PTYStreamProcessor } = require('./src/utils/ptyStreamProcessor');

// Create output processor for Python
const processor = PTYStreamProcessor.createOutputProcessor({
  language: 'python',
  sessionId: 'session-123',
  preserveANSI: true,
  preserveControlChars: true,
  fixLineEndings: true
});

processor.on('data', (chunk) => {
  console.log('Processed PTY data:', chunk.toString());
});

// Handle PTY output
processor.write('>>> print("Hello")\nHello\n>>> ');
```

### 5. Input Validation and Security

```javascript
// Enable security validation
const result = await handler.processInput(userInput, {
  language: 'bash',
  enableValidation: true
});

if (!result.success) {
  console.log('Input rejected:', result.error);
}
```

## Configuration

### InputHandler Options

```javascript
const handler = new InputHandler({
  maxInputLength: 1024 * 1024,    // Maximum input size (1MB)
  enableLogging: true,             // Enable debug logging
  strictMode: false                // Strict validation mode
});
```

### PTYStreamProcessor Options

```javascript
const processor = PTYStreamProcessor.createOutputProcessor({
  language: 'python',              // Target language
  sessionId: 'session-123',        // Session identifier
  preserveANSI: true,              // Preserve ANSI sequences
  preserveControlChars: true,      // Preserve control characters
  fixLineEndings: true,            // Fix Windows CRLF issues
  enableLogging: true,             // Enable debug logging
  bufferSize: 8192                 // Internal buffer size
});
```

## Control Characters and ANSI Sequences

### Supported Control Characters

- `CTRL_C` (`\x03`) - Interrupt signal
- `CTRL_D` (`\x04`) - EOF signal
- `CTRL_Z` (`\x1a`) - Suspend signal
- `BACKSPACE` (`\x7f`) - Backspace
- `DELETE` (`\x1b[3~`) - Delete
- `TAB` (`\x09`) - Tab
- `ENTER` (`\x0d`) - Enter
- `ESC` (`\x1b`) - Escape

### Supported ANSI Sequences

- **Arrow Keys**: UP, DOWN, LEFT, RIGHT
- **Function Keys**: F1-F12
- **Navigation**: HOME, END, PGUP, PGDN
- **Modifiers**: Shift+Arrows, Ctrl+Arrows
- **Colors**: `\x1b[31m` (red), `\x1b[32m` (green), etc.
- **Cursor Positioning**: `\x1b[10;20H`
- **Screen Operations**: `\x1b[2J` (clear screen)

## Security Features

### Input Validation Patterns

The system includes protection against:

1. **Shell Injection** - `; rm -rf /`, `| sh -c "..."`, etc.
2. **Command Injection** - `&&`, `||`, `|`, backticks
3. **Fork Bombs** - `:(){ :|:& };:`, infinite loops
4. **Resource Exhaustion** - Large inputs, buffer overflow attempts
5. **Path Traversal** - `../../etc/passwd`

### Dangerous Pattern Detection

```javascript
const dangerousPatterns = [
  /;\s*rm\s+-rf\s+\//,      // rm -rf /
  /;\s*dd\s+if=/,           // dd commands
  /;\s*mkfs\./,             // filesystem formatting
  /\|\s*sh\s*-c/,           // shell injection
  /:\(\)\{\.*\|.*\}/,       // fork bomb
  /while\s+true.*do.*done/  // infinite loop
];
```

## Integration with Existing System

### TerminalService Integration

The enhanced input handling is integrated into the existing `TerminalService`:

```javascript
// Enhanced sendInput method
async sendInput(sessionId, input) {
  const session = this.sessions.get(sessionId);
  const inputHandler = this.inputHandlers.get(session.language);

  // Process through enhanced handler
  const result = await inputHandler.processInput(input, {
    language: session.language,
    sessionId: sessionId,
    preserveBinary: true,
    enableValidation: true
  });

  if (result.success) {
    await this.writeToPTY(session.stream, result.data);
  }
}
```

### PTY Data Processing

```javascript
// Enhanced PTY data processing
stream.on('data', (chunk) => {
  const processedChunk = this.processPTYDataWithEnhancedHandler(sessionId, chunk);
  this.safeSocketEmit(socket, 'terminal:data', { sessionId, chunk: processedChunk });
});
```

## Performance Considerations

### Buffer Management

- Internal buffer size is configurable (default: 8KB)
- Automatic buffer overflow protection
- Efficient chunking for large data

### Memory Usage

- Stream processors are cleaned up on session end
- Input handlers are reused across sessions
- Statistics tracking with minimal overhead

### Processing Speed

- Minimal processing for fast path cases
- Lazy evaluation for expensive operations
- Early termination for invalid inputs

## Testing

### Running Tests

```bash
# Run all input handler tests
npm test -- test/inputHandler.test.js

# Run PTY stream processor tests
npm test -- test/ptyStreamProcessor.test.js

# Run Python-specific tests
npm test -- test/python-terminal.test.js
```

### Test Coverage

- Basic input processing
- Binary data handling
- Control character preservation
- ANSI sequence processing
- Language-specific processing
- Security validation
- Error handling
- Performance testing

## Demonstration

### Running the Demo

```bash
# Run the enhanced input handling demo
node demo-enhanced-input.js
```

The demo demonstrates:
- Basic input handling
- Control character processing
- ANSI sequence handling
- Language-specific processing
- Input validation
- PTY stream processing
- Custom language handlers

## Troubleshooting

### Common Issues

1. **Binary Data Corruption**
   - Ensure `preserveBinary: true` in options
   - Check encoding settings
   - Verify buffer handling

2. **Control Character Loss**
   - Ensure `preserveControlChars: true` in options
   - Check for string manipulation
   - Verify PTY settings

3. **ANSI Sequence Issues**
   - Ensure `preserveANSI: true` in options
   - Check xterm.js compatibility
   - Verify escape sequence parsing

4. **Performance Issues**
   - Check buffer size settings
   - Monitor memory usage
   - Review validation patterns

### Debug Logging

Enable debug logging for troubleshooting:

```javascript
const handler = new InputHandler({
  enableLogging: true
});

const processor = PTYStreamProcessor.createOutputProcessor({
  enableLogging: true
});
```

## Future Enhancements

### Planned Features

1. **Additional Language Support**
   - Ruby IRB
   - PHP interactive mode
   - Go playground
   - Rust REPL

2. **Advanced Validation**
   - Semantic analysis
   - Code quality checks
   - Performance impact analysis

3. **Enhanced Security**
   - Sandboxing integration
   - Resource quotas
   - Advanced pattern detection

4. **Performance Optimizations**
   - Async processing pipelines
   - Worker thread support
   - Caching mechanisms

## API Reference

### InputHandler

#### Constructor
```javascript
new InputHandler(options)
```

#### Methods
- `processInput(input, options)` - Process input data
- `getLanguageInfo(language)` - Get language information
- `addLanguageHandler(name, handler)` - Add custom handler
- `removeLanguageHandler(name)` - Remove language handler
- `getSupportedLanguages()` - List supported languages

### PTYStreamProcessor

#### Static Methods
- `createInputProcessor(options)` - Create input processor
- `createOutputProcessor(options)` - Create output processor

#### Methods
- `write(chunk)` - Write data to processor
- `end()` - End processing
- `getStats()` - Get processing statistics
- `resetStats()` - Reset statistics

### Constants

- `CONTROL_CHARS` - Control character definitions
- `ANSI_SEQUENCES` - ANSI sequence definitions

## License

This enhanced input handling system is part of the terminal execution backend project. See the main project license for details.