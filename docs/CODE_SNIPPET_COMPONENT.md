# Code Snippet Component Documentation

A modern, accessible code snippet component for AI chat interfaces with automatic language detection, syntax highlighting, and theme awareness.

## Overview

The Code Snippet component is designed to automatically detect and format code blocks in AI responses, providing a beautiful and functional way to display code with proper syntax highlighting, copy functionality, and responsive design.

## Features

### ✅ Core Features
- **Automatic Language Detection** - Detects programming languages from code patterns
- **Syntax Highlighting** - Beautiful syntax highlighting with 20+ themes
- **Copy to Clipboard** - One-click copy with visual feedback and fallback support
- **Theme Awareness** - Automatically adapts to light/dark theme changes
- **Responsive Design** - Works perfectly on all screen sizes with proper scrolling
- **Accessibility** - Keyboard navigation and screen reader support

### ✅ Advanced Features
- **Inline Code Detection** - Formats inline code snippets with `code` syntax
- **Multiple Code Blocks** - Handles multiple code blocks in a single message
- **Line Numbers** - Shows line numbers for multi-line code
- **Language Badges** - Displays detected language with visual badges
- **Custom Styling** - Fully customizable with CSS classes and props
- **Performance Optimized** - Efficient rendering and minimal bundle impact

## Components

### 1. CodeSnippet Component

The main component for displaying formatted code snippets.

```typescript
interface CodeSnippetProps {
  code: string                    // Required: The code content
  language?: string               // Optional: Programming language
  title?: string                  // Optional: Custom title
  showCopyButton?: boolean        // Default: true
  showLanguageBadge?: boolean     // Default: true
  maxHeight?: string              // Default: "400px"
  className?: string              // Optional: Custom styling
  autoDetectLanguage?: boolean    // Default: true
}
```

#### Usage Examples

**Basic Usage**
```typescript
import CodeSnippet from '@/components/code-snippet';

<CodeSnippet
  code="console.log('Hello, World!');"
  language="javascript"
/>
```

**With Automatic Detection**
```typescript
<CodeSnippet
  code={`const user = { name: 'John', age: 30 };`}
  autoDetectLanguage={true}
  showCopyButton={true}
  maxHeight="300px"
/>
```

**Custom Styling**
```typescript
<CodeSnippet
  code={myCode}
  title="Configuration File"
  language="json"
  className="border-2 border-primary"
  maxHeight="500px"
/>
```

### 2. AIMessage Component

Enhanced message component that automatically formats code blocks.

```typescript
interface AIMessageProps {
  content: string                 // Message content
  timestamp: string              // Message timestamp
  isPending?: boolean            // Loading state
  isAI?: boolean                 // AI message flag
  authorName?: string            // Author display name
  authorAvatar?: string          // Author avatar URL
  metadata?: Record<string, unknown> | null
  onCopy?: () => void            // Copy callback
  onThumbsUp?: () => void        // Feedback callback
  onThumbsDown?: () => void      // Feedback callback
  className?: string             // Custom styling
}
```

#### Usage Example

```typescript
import AIMessage from '@/components/ai-message';

<AIMessage
  content={`Here's the code you requested:

\`\`\`typescript
const hello = () => console.log('Hello!');
\`\`\`

This function logs a greeting to the console.`}
  timestamp="2:30 PM"
  isAI={true}
  authorName="AI Assistant"
/>
```

### 3. Message Parser Utility

Utilities for parsing and formatting AI message content.

```typescript
// Parse message content into text and code parts
import { parseMessageContent, renderMessageParts } from '@/lib/message-parser';

const parts = parseMessageContent(messageContent);
const rendered = renderMessageParts(parts);
```

#### Available Functions

- `parseMessageContent(content: string)` - Parse content into structured parts
- `renderMessageParts(parts: ParsedMessagePart[])` - Render parts as React components
- `detectInlineCode(text: string)` - Format inline code snippets
- `hasCodeBlocks(content: string)` - Check if content contains code blocks
- `countCodeBlocks(content: string)` - Count code blocks in content
- `extractCodeBlocks(content: string)` - Extract all code blocks

## Supported Languages

### Primary Languages
- **JavaScript** (`javascript`, `js`)
- **TypeScript** (`typescript`, `ts`, `tsx`)
- **React JSX** (`jsx`)
- **Python** (`python`, `py`)
- **Java** (`java`)
- **C++** (`cpp`)
- **C#** (`csharp`, `cs`)
- **Go** (`go`)
- **Rust** (`rust`, `rs`)
- **SQL** (`sql`)

### Web Technologies
- **HTML** (`html`)
- **CSS** (`css`)
- **SCSS** (`scss`)
- **JSON** (`json`)
- **XML** (`xml`)
- **YAML** (`yaml`, `yml`)

### Other Languages
- **Shell/Bash** (`bash`, `sh`)
- **Dockerfile** (`dockerfile`)
- **Markdown** (`markdown`, `md`)
- **PHP** (`php`)
- **Ruby** (`ruby`, `rb`)

### Auto-Detection

The component automatically detects languages based on common patterns:

```typescript
// Examples of auto-detection
const jsCode = "const x = 10; console.log(x);"; // → javascript
const tsCode = "const x: number = 10;"; // → typescript
const pyCode = "def hello(): print('Hello')"; // → python
const sqlCode = "SELECT * FROM users;"; // → sql
```

## Theme Integration

### Light/Dark Mode Support

The component automatically adapts to your app's theme:

```typescript
// Uses VS Code dark theme for dark mode
// Uses oneLight theme for light mode
const CodeSnippet = () => {
  const { resolvedTheme } = useTheme()
  // Theme selection handled automatically
}
```

### Custom Themes

You can customize the syntax highlighting themes:

```typescript
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// In component props
<CodeSnippet
  code={myCode}
  syntaxTheme={vscDarkPlus} // Custom theme
/>
```

## Styling and Customization

### CSS Customization

```css
/* Custom code snippet styles */
.code-snippet {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.code-snippet-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.code-snippet-content {
  font-family: 'JetBrains Mono', monospace;
}
```

### Tailwind CSS Classes

The component uses Tailwind CSS classes for styling:

```typescript
// Common customizations
<CodeSnippet
  code={myCode}
  className="border-2 border-primary rounded-xl"
  maxHeight="600px"
/>
```

## Accessibility Features

### Keyboard Navigation
- **Tab Navigation** - All interactive elements are keyboard accessible
- **Focus Management** - Proper focus indicators and management
- **ARIA Labels** - Screen reader friendly labels and descriptions

### Screen Reader Support
```typescript
// ARIA labels are automatically added
<button
  aria-label={isCopied ? "Code copied to clipboard" : "Copy code to clipboard"}
  role="button"
  tabIndex={0}
>
  <CopyIcon />
</button>
```

## Performance Considerations

### Bundle Size
- Uses `react-syntax-highlighter` with tree-shaking
- Only loads required syntax highlighting styles
- Efficient rendering with React.memo

### Optimization Tips
```typescript
// For large code blocks, consider:
<CodeSnippet
  code={largeCode}
  maxHeight="400px"  // Limits visible area
  showLineNumbers={false}  // Reduces rendering overhead
/>
```

## Integration Examples

### AI Chat Integration

```typescript
// In your AI chat component
const ChatMessage = ({ message }) => {
  if (message.isAI) {
    return <AIMessage {...message} />
  }

  return <UserMessage {...message} />
}
```

### Markdown Parser Integration

```typescript
// Integrate with existing markdown parsers
const EnhancedMarkdown = ({ content }) => {
  const parts = parseMessageContent(content);
  return renderMessageParts(parts);
}
```

## Error Handling

### Fallback Behavior
```typescript
// Graceful fallback for invalid languages
<CodeSnippet
  code={myCode}
  language="invalid-language" // Falls back to plain text
  autoDetectLanguage={true}  // Attempts detection
/>
```

### Copy Fallback
```typescript
// Handles clipboard API failures
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
```

## Testing

### Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import CodeSnippet from '@/components/code-snippet';

test('renders code snippet with syntax highlighting', () => {
  render(<CodeSnippet code="console.log('test');" language="javascript" />);

  expect(screen.getByText('console.log(\'test\');')).toBeInTheDocument();
  expect(screen.getByText('JavaScript')).toBeInTheDocument();
});
```

### Accessibility Testing
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

test('code snippet is accessible', async () => {
  const { container } = render(<CodeSnippet code="test" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Migration Guide

### From Basic Code Display

**Before:**
```typescript
<div className="bg-gray-100 p-4">
  <pre><code>{code}</code></pre>
</div>
```

**After:**
```typescript
<CodeSnippet
  code={code}
  language={detectLanguage(code)}
  showCopyButton={true}
/>
```

### From Existing Syntax Highlighter

**Before:**
```typescript
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

<SyntaxHighlighter language={language} style={theme}>
  {code}
</SyntaxHighlighter>
```

**After:**
```typescript
<CodeSnippet
  code={code}
  language={language}
  autoDetectLanguage={!language}
/>
```

## Troubleshooting

### Common Issues

**Q: Code isn't being highlighted properly**
- Check if the language is supported
- Ensure the code is properly formatted
- Try auto-detection if manual specification isn't working

**Q: Copy functionality isn't working**
- Check HTTPS requirements for clipboard API
- Ensure user gestures trigger the copy action
- Fallback should handle older browsers

**Q: Styling issues in dark mode**
- Verify theme provider is set up correctly
- Check CSS custom properties
- Ensure component is within theme context

### Performance Issues

**Q: Slow rendering with large code blocks**
- Use `maxHeight` to limit visible content
- Disable line numbers for very large blocks
- Consider virtualization for extremely large content

## Contributing

### Adding New Languages
1. Add language detection patterns in `detectLanguage()` function
2. Update language display names in `getLanguageDisplayName()`
3. Test with sample code snippets

### Improving Detection
1. Add more patterns to the detection function
2. Consider edge cases and ambiguous code
3. Write tests for new patterns

### Styling Updates
1. Modify CSS classes in the component
2. Ensure theme consistency
3. Test across different screen sizes

## License

This component follows the same license as the main project. The syntax highlighting library (`react-syntax-highlighter`) is licensed under MIT.

## Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review troubleshooting section
3. Create an issue in the project repository
4. Follow contribution guidelines