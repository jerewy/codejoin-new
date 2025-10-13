#!/usr/bin/env node

/**
 * Demonstration of Enhanced Input Handling for Terminal Execution Backend
 *
 * This script demonstrates the enhanced capabilities for:
 * - Binary data preservation
 * - Control character handling
 * - Language-specific input processing
 * - UTF-8 encoding support
 * - PTY stream processing
 */

const { InputHandler, CONTROL_CHARS, ANSI_SEQUENCES } = require('./src/utils/inputHandler');
const { PTYStreamProcessor } = require('./src/utils/ptyStreamProcessor');

// ANSI color codes for demonstration output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}\n`);
}

async function demonstrateBasicInputHandling() {
  section('Basic Input Handling');

  const handler = new InputHandler({ enableLogging: true });

  // Simple string input
  colorLog('1. Simple string input:', 'yellow');
  const result1 = await handler.processInput('print("Hello, World!")', { language: 'python' });
  console.log(`   Success: ${result1.success}`);
  console.log(`   Data: ${result1.data}`);
  console.log(`   Language: ${result1.language}`);
  console.log(`   Metadata:`, result1.metadata);

  // Buffer input
  colorLog('\n2. Buffer input:', 'yellow');
  const buffer = Buffer.from('console.log("Hello from Node.js");', 'utf8');
  const result2 = await handler.processInput(buffer, { language: 'javascript' });
  console.log(`   Success: ${result2.success}`);
  console.log(`   Is Buffer: ${result2.metadata.isBuffer}`);
  console.log(`   Length: ${result2.metadata.length}`);

  // UTF-8 text
  colorLog('\n3. UTF-8 text with international characters:', 'yellow');
  const utf8Text = 'Hello 世界 🌍 Café 北京';
  const result3 = await handler.processInput(utf8Text, { language: 'python' });
  console.log(`   Success: ${result3.success}`);
  console.log(`   Has Binary Data: ${result3.metadata.hasBinaryData}`);
  console.log(`   Original: ${utf8Text}`);
  console.log(`   Processed: ${result3.data}`);
}

async function demonstrateControlCharacterHandling() {
  section('Control Character Handling');

  const handler = new InputHandler({ enableLogging: true });

  // Control characters
  colorLog('1. Control characters:', 'yellow');
  const controlInputs = [
    { name: 'Ctrl+C', char: CONTROL_CHARS.CTRL_C },
    { name: 'Ctrl+D', char: CONTROL_CHARS.CTRL_D },
    { name: 'Backspace', char: CONTROL_CHARS.BACKSPACE },
    { name: 'Tab', char: CONTROL_CHARS.TAB },
    { name: 'Escape', char: CONTROL_CHARS.ESC }
  ];

  for (const input of controlInputs) {
    const result = await handler.processInput(input.char, { language: 'bash' });
    console.log(`   ${input.name}: Success=${result.success}, HasControlChars=${result.metadata.hasControlChars}`);
  }

  // Mixed control characters and text
  colorLog('\n2. Mixed control characters and text:', 'yellow');
  const mixedInput = 'Hello' + CONTROL_CHARS.CTRL_C + 'World' + CONTROL_CHARS.BACKSPACE + '!';
  const result = await handler.processInput(mixedInput, { language: 'bash' });
  console.log(`   Input: ${JSON.stringify(mixedInput)}`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Has Control Chars: ${result.metadata.hasControlChars}`);
}

async function demonstrateANSISequences() {
  section('ANSI Sequence Handling');

  const handler = new InputHandler({ enableLogging: true });

  // ANSI color sequences
  colorLog('1. ANSI color sequences:', 'yellow');
  const colorSequences = [
    { name: 'Red text', sequence: '\x1b[31mRed Text\x1b[0m' },
    { name: 'Green text', sequence: '\x1b[32mGreen Text\x1b[0m' },
    { name: 'Blue text', sequence: '\x1b[34mBlue Text\x1b[0m' }
  ];

  for (const item of colorSequences) {
    const result = await handler.processInput(item.sequence, { language: 'bash' });
    console.log(`   ${item.name}: ${item.sequence}`);
    console.log(`   Success: ${result.success}, HasANSI: ${result.metadata.hasANSI}`);
  }

  // ANSI cursor sequences
  colorLog('\n2. ANSI cursor and control sequences:', 'yellow');
  const cursorSequences = [
    { name: 'Up arrow', sequence: ANSI_SEQUENCES.UP },
    { name: 'Down arrow', sequence: ANSI_SEQUENCES.DOWN },
    { name: 'Right arrow', sequence: ANSI_SEQUENCES.RIGHT },
    { name: 'Left arrow', sequence: ANSI_SEQUENCES.LEFT },
    { name: 'Home', sequence: ANSI_SEQUENCES.HOME },
    { name: 'End', sequence: ANSI_SEQUENCES.END }
  ];

  for (const item of cursorSequences) {
    const result = await handler.processInput(item.sequence, { language: 'bash' });
    console.log(`   ${item.name}: Success=${result.success}, HasANSI=${result.metadata.hasANSI}`);
  }
}

async function demonstrateLanguageSpecificProcessing() {
  section('Language-Specific Processing');

  const handler = new InputHandler({ enableLogging: true });

  // Python multi-line input
  colorLog('1. Python multi-line function definition:', 'yellow');
  const pythonCode = `def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))`;

  const pythonResult = await handler.processInput(pythonCode, { language: 'python' });
  console.log(`   Success: ${pythonResult.success}`);
  console.log(`   Language: ${pythonResult.language}`);
  console.log(`   Length: ${pythonResult.metadata.length}`);
  console.log(`   First line: ${pythonResult.data.split('\n')[0]}`);

  // JavaScript multi-line input
  colorLog('\n2. JavaScript arrow function:', 'yellow');
  const jsCode = `const factorial = n => {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
};

console.log(factorial(5));`;

  const jsResult = await handler.processInput(jsCode, { language: 'javascript' });
  console.log(`   Success: ${jsResult.success}`);
  console.log(`   Language: ${jsResult.language}`);
  console.log(`   Length: ${jsResult.metadata.length}`);

  // Java code
  colorLog('\n3. Java class definition:', 'yellow');
  const javaCode = `public class Calculator {
    public static int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        System.out.println(add(5, 3));
    }
}`;

  const javaResult = await handler.processInput(javaCode, { language: 'java' });
  console.log(`   Success: ${javaResult.success}`);
  console.log(`   Language: ${javaResult.language}`);
  console.log(`   Length: ${javaResult.metadata.length}`);
}

async function demonstrateInputValidation() {
  section('Input Validation and Security');

  const handler = new InputHandler({ enableLogging: true });

  // Dangerous commands
  colorLog('1. Testing dangerous command detection:', 'yellow');
  const dangerousInputs = [
    '; rm -rf /',
    '| sh -c "rm -rf /"',
    '&& dd if=/dev/zero of=/dev/sda',
    '; fork()',
    'while true; do :; done'
  ];

  for (const input of dangerousInputs) {
    const result = await handler.processInput(input, { language: 'bash', enableValidation: true });
    console.log(`   Input: ${input}`);
    console.log(`   Success: ${result.success}`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }

  // Large input
  colorLog('2. Testing large input handling:', 'yellow');
  const largeInput = 'a'.repeat(2048);
  const largeResult = await handler.processInput(largeInput, { language: 'python', enableValidation: true });
  console.log(`   Input length: ${largeInput.length}`);
  console.log(`   Success: ${largeResult.success}`);
  if (!largeResult.success) {
    console.log(`   Error: ${largeResult.error}`);
  }
}

function demonstrateStreamProcessing() {
  section('PTY Stream Processing');

  return new Promise((resolve) => {
    const processor = PTYStreamProcessor.createOutputProcessor({
      language: 'python',
      sessionId: 'demo-session',
      preserveANSI: true,
      preserveControlChars: true,
      fixLineEndings: true,
      enableLogging: true
    });

    const outputs = [];
    let expectedChunks = 4;
    let receivedChunks = 0;

    processor.on('data', (chunk) => {
      outputs.push(chunk.toString());
      receivedChunks++;

      console.log(`   Chunk ${receivedChunks}: ${JSON.stringify(chunk.toString())}`);

      if (receivedChunks === expectedChunks) {
        console.log(`\n   Total processed: ${processor.getStats().chunksProcessed} chunks`);
        console.log(`   Total bytes: ${processor.getStats().bytesProcessed}`);
        console.log(`   Control chars: ${processor.getStats().controlCharsProcessed}`);
        console.log(`   ANSI sequences: ${processor.getStats().ansiSequencesProcessed}`);
        console.log(`   Errors: ${processor.getStats().errors}`);

        const fullOutput = outputs.join('');
        console.log(`\n   Complete output preview:\n${fullOutput.substring(0, 200)}...`);

        processor.destroy();
        resolve();
      }
    });

    // Simulate Python REPL output
    colorLog('Simulating Python REPL output:', 'yellow');

    const simulatedOutput = [
      '>>> print("Hello, World!")\n',
      'Hello, World!\n',
      '>>> def greet(name):\n',
      '...     return f"Hello, {name}!"\n',
      '... \n',
      '>>> greet("Python")\n',
      'Hello, Python!\n',
      '>>> '
    ];

    // Send output in chunks
    simulatedOutput.forEach((chunk, index) => {
      setTimeout(() => {
        processor.write(chunk);
      }, index * 100);
    });
  });
}

async function demonstrateCustomLanguageHandler() {
  section('Custom Language Handler');

  const handler = new InputHandler({ enableLogging: true });

  // Add a custom language handler
  const customHandler = {
    name: 'CustomLanguage',
    interactivePrompt: /^CUSTOM>/,
    multilinePatterns: [/:\s*$/, /if\s+/, /for\s+/],
    specialCommands: {
      help: /^help(\s|$)/,
      exit: /^exit(\s*$)/
    },
    preprocess: async (input, options) => {
      // Custom preprocessing: add prefix to all inputs
      return `[CUSTOM] ${input}`;
    },
    validate: (input, options) => {
      // Custom validation: reject empty lines
      if (input.trim().length === 0) {
        return { valid: false, error: 'Empty input not allowed' };
      }
      return { valid: true };
    }
  };

  handler.addLanguageHandler('custom', customHandler);

  // Test the custom handler
  colorLog('1. Testing custom language handler:', 'yellow');
  const result1 = await handler.processInput('hello world', { language: 'custom' });
  console.log(`   Success: ${result1.success}`);
  console.log(`   Processed data: ${result1.data}`);
  console.log(`   Language: ${result1.language}`);

  colorLog('\n2. Testing custom validation:', 'yellow');
  const result2 = await handler.processInput('   ', { language: 'custom' });
  console.log(`   Success: ${result2.success}`);
  if (!result2.success) {
    console.log(`   Validation error: ${result2.error}`);
  }

  // Show language info
  colorLog('\n3. Language information:', 'yellow');
  const info = handler.getLanguageInfo('custom');
  console.log(`   Name: ${info.name}`);
  console.log(`   Supported: ${info.supported}`);
  console.log(`   Features:`, info.features);

  // Remove the custom handler
  handler.removeLanguageHandler('custom');
  const infoAfterRemoval = handler.getLanguageInfo('custom');
  console.log(`   Supported after removal: ${infoAfterRemoval.supported}`);
}

async function runAllDemonstrations() {
  console.log(`${colors.bold}${colors.green}
╔══════════════════════════════════════════════════════════════╗
║     Enhanced Terminal Input Handling Demonstration            ║
║                                                              ║
║  This demo showcases the enhanced input handling capabilities ║
║  for binary data, control characters, and language-specific  ║
║  processing in terminal execution backends.                 ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    await demonstrateBasicInputHandling();
    await demonstrateControlCharacterHandling();
    await demonstrateANSISequences();
    await demonstrateLanguageSpecificProcessing();
    await demonstrateInputValidation();
    await demonstrateStreamProcessing();
    await demonstrateCustomLanguageHandler();

    section('Demo Complete');
    colorLog('All demonstrations completed successfully!', 'green');
    colorLog('The enhanced input handling provides:', 'yellow');
    console.log('   ✓ Binary data preservation');
    console.log('   ✓ UTF-8 encoding support');
    console.log('   ✓ Control character handling');
    console.log('   ✓ ANSI sequence preservation');
    console.log('   ✓ Language-specific processing');
    console.log('   ✓ Input validation and security');
    console.log('   ✓ Custom language handler support');
    console.log('   ✓ PTY stream processing');

  } catch (error) {
    colorLog(`Error during demonstration: ${error.message}`, 'red');
    console.error(error.stack);
  }
}

// Run the demonstration if this script is executed directly
if (require.main === module) {
  runAllDemonstrations();
}

module.exports = {
  runAllDemonstrations,
  demonstrateBasicInputHandling,
  demonstrateControlCharacterHandling,
  demonstrateANSISequences,
  demonstrateLanguageSpecificProcessing,
  demonstrateInputValidation,
  demonstrateStreamProcessing,
  demonstrateCustomLanguageHandler
};