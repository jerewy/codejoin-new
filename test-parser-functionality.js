// Simple test for the code parser functionality
const { parseCodeContent, detectLanguage } = require('./lib/code-parser.ts');

// Test content with various code formats
const testContent = `
Hello! Here's some JavaScript code:

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

And here's some inline code: \`const x = 42;\`

Here's a Python function:

\`\`\`python
def hello_world():
    print("Hello, World!")
    return True
\`\`\`
`;

console.log('Testing code parser...');
console.log('====================');

// Test language detection
console.log('\n1. Language Detection Tests:');
console.log('JavaScript code detected as:', detectLanguage('const x = 42; console.log(x);'));
console.log('Python code detected as:', detectLanguage('def hello(): pass'));
console.log('HTML detected as:', detectLanguage('<div>Hello</div>'));

// Test code parsing
console.log('\n2. Code Parsing Tests:');
try {
  const parsed = parseCodeContent(testContent);
  console.log('Total segments:', parsed.segments.length);
  console.log('Code blocks found:', parsed.codeBlocks.length);
  console.log('Inline code found:', parsed.inlineCodeBlocks.length);

  parsed.segments.forEach((segment, index) => {
    console.log(`Segment ${index}: ${segment.type}`);
    if (segment.type === 'code') {
      console.log(`  - Language: ${segment.codeBlock.language || 'unknown'}`);
      console.log(`  - Type: ${segment.codeBlock.type}`);
      console.log(`  - Length: ${segment.codeBlock.content.length} chars`);
    }
  });
} catch (error) {
  console.error('Error parsing code:', error.message);
}

console.log('\n3. Testing completed!');