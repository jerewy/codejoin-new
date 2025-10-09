# Code Snippet Implementation Documentation

## Overview

This implementation provides a comprehensive system for automatically detecting and formatting code snippets from AI responses in React applications. The system includes syntax highlighting, copy functionality, language detection, and accessibility features.

## Components

### 1. CodeSnippet Component (`components/ui/code-snippet.tsx`)

The main component for rendering formatted code snippets with the following features:

- **Syntax Highlighting**: Uses `react-syntax-highlighter` with VS Code Dark+ and Light themes
- **Copy Functionality**: One-click copy with visual feedback and fallback for older browsers
- **Language Detection**: Automatic language detection with visual indicators
- **Responsive Design**: Works on mobile and desktop with collapsible long code blocks
- **Accessibility**: Full ARIA support, keyboard navigation, and screen reader compatibility
- **Fullscreen Mode**: Expand code blocks to fullscreen for better readability

#### Props

```typescript
interface CodeSnippetProps {
  code: string                    // The code content to display
  language?: string              // Programming language hint
  showLineNumbers?: boolean      // Show line numbers (default: true)
  copyable?: boolean             // Show copy button (default: true)
  collapsible?: boolean          // Allow collapsing long code (default: false)
  theme?: 'light' | 'dark' | 'auto'  // Theme mode (default: 'auto')
  className?: string             // Additional CSS classes
  maxHeight?: number             // Maximum height before collapsing (default: 400)
  filename?: string              // Optional filename display
}
```

#### Keyboard Shortcuts

- `Ctrl/Cmd + C`: Copy code to clipboard
- `Escape`: Exit fullscreen mode

### 2. Code Parser Utilities (`lib/code-parser.ts`)

Comprehensive parsing utilities for detecting and extracting code from various formats:

#### Key Functions

- `detectLanguage(code: string)`: Automatically detects programming language from code content
- `parseCodeContent(text: string)`: Parses text and extracts all code blocks and inline code
- `parseMarkdownCodeBlocks(text: string)`: Extracts markdown code blocks (```lang ... ```)
- `parseInlineCode(text: string)`: Finds inline code (`` `code` ``)
- `detectCodeInPlainText(text: string)`: Auto-detects code-like patterns in plain text

#### Supported Languages

The system supports 20+ programming languages including:

- **Web Technologies**: JavaScript, TypeScript, HTML, CSS, JSON, YAML
- **Backend Languages**: Python, Java, C++, C, C#, PHP, Ruby, Go, Rust
- **Data Languages**: SQL, Bash/Shell, PowerShell, Dockerfile
- **Auto-detection**: Falls back to pattern matching for unknown languages

### 3. AI Message Parser (`components/ai-message-parser.tsx`)

High-level component that integrates code parsing with React rendering:

#### Features

- **Mixed Content Handling**: Renders both text and code in the same message
- **Smart Inline Code**: Converts long inline code to block format
- **Markdown Support**: Basic markdown rendering (bold, italic, links)
- **Performance Optimized**: Uses memoization to prevent unnecessary re-renders

#### Props

```typescript
interface AIMessageParserProps {
  content: string                // The AI message content
  className?: string            // Additional CSS classes
  codeSnippetProps?: Partial<CodeSnippetProps>  // Props for code snippets
  enableAutoDetection?: boolean // Enable auto-detection (default: true)
  maxInlineLength?: number      // Max length for inline code (default: 50)
}
```

## Integration with AI Chat

The implementation has been integrated into the existing AI chat component (`components/ai-chat.tsx`):

### Changes Made

1. **Import**: Added `AIMessageParser` component
2. **Rendering**: Replaced plain text rendering with `AIMessageParser` for AI messages
3. **Configuration**: Set default props for code snippets (line numbers, copy, collapse)

### Example Usage

```tsx
// In AI message rendering
{msg.type === "ai" ? (
  <AIMessageParser
    content={msg.content}
    codeSnippetProps={{
      showLineNumbers: true,
      copyable: true,
      collapsible: true
    }}
  />
) : (
  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
)}
```

## Accessibility Features

### ARIA Implementation

- **Roles**: Proper ARIA roles (`region`, `dialog`, etc.)
- **Labels**: Descriptive aria-labels for all interactive elements
- **States**: `aria-expanded` for collapsible elements
- **Descriptions**: Screen reader announcements for copy actions

### Keyboard Navigation

- **Tab Order**: Logical tab order through all interactive elements
- **Shortcuts**: Keyboard shortcuts for common actions
- **Focus Management**: Proper focus handling in fullscreen mode

### Screen Reader Support

- **Semantic HTML**: Proper heading structure and semantic elements
- **Hidden Labels**: Screen reader-only text for better context
- **State Announcements**: Clear announcements for actions and state changes

## Performance Optimizations

### React Optimizations

- **Memoization**: Components wrapped in `React.memo`
- **Callback Optimization**: `useCallback` for event handlers
- **Computed Values**: `useMemo` for expensive calculations

### Code Highlighting

- **Lazy Loading**: Syntax highlighting loads on demand
- **Theme Caching**: Themes are cached to prevent re-computation
- **Virtual Scrolling**: Efficient rendering for large code blocks

### Parsing Performance

- **Regex Optimization**: Efficient regular expressions for code detection
- **Caching**: Parsed results are cached where appropriate
- **Debounced Parsing**: Large messages are parsed efficiently

## Responsive Design

### Mobile Considerations

- **Touch Targets**: appropriately sized buttons for touch interaction
- **Horizontal Scrolling**: Code scrolls horizontally on small screens
- **Collapsible Code**: Long code blocks collapse on mobile by default
- **Font Scaling**: Responsive font sizes for different screen sizes

### Desktop Features

- **Hover States**: Interactive elements show on hover
- **Fullscreen Mode**: Available on desktop for better code viewing
- **Keyboard Shortcuts**: Enhanced keyboard navigation on desktop

## Testing

### Test Cases Covered

1. **Multiple Languages**: JavaScript, Python, CSS, SQL, etc.
2. **Mixed Content**: Text with multiple code blocks
3. **Edge Cases**: Empty code blocks, malformed syntax, special characters
4. **Performance**: Large code blocks, many inline code snippets
5. **Accessibility**: Keyboard navigation, screen reader compatibility

### Test Files

- `test-code-snippets.tsx`: Comprehensive React component test
- `test-parser-functionality.js`: Unit tests for parsing utilities
- `/test-code-snippets`: Demo page for visual testing

## Usage Examples

### Basic Usage

```tsx
import CodeSnippet from '@/components/ui/code-snippet';

<CodeSnippet
  code="console.log('Hello, World!');"
  language="javascript"
  copyable={true}
  showLineNumbers={true}
/>
```

### AI Message Integration

```tsx
import AIMessageParser from '@/components/ai-message-parser';

<AIMessageParser
  content={aiMessageContent}
  codeSnippetProps={{
    collapsible: true,
    maxHeight: 300
  }}
/>
```

### Auto-detection

```tsx
// Language will be automatically detected
<CodeSnippet
  code="const greeting = 'Hello'; console.log(greeting);"
/>
```

## Customization

### Adding New Languages

1. Update `LANGUAGE_PATTERNS` in `lib/code-parser.ts`
2. Add language info to `getLanguageInfo()` function
3. Import syntax highlighting styles if needed

### Custom Themes

```tsx
const customTheme = {
  // Custom syntax highlighting theme
};

<CodeSnippet
  code={code}
  theme="dark"
  customTheme={customTheme}
/>
```

### Styling Customization

The components use Tailwind CSS classes and can be customized through:

- `className` prop for additional styles
- CSS variables for theme customization
- Override classes in your CSS

## Troubleshooting

### Common Issues

1. **Code not highlighting**: Check language detection or provide explicit language prop
2. **Copy not working**: Ensure clipboard API is available or check fallback
3. **Performance issues**: Use `collapsible` prop for large code blocks
4. **Mobile layout**: Check responsive breakpoints and overflow handling

### Debug Mode

Enable debug logging by setting:

```tsx
<AIMessageParser
  content={content}
  debug={true}  // Enable debug output
/>
```

## Future Enhancements

### Planned Features

1. **Language Tabs**: Support for multiple code blocks in tabs
2. **Code Execution**: Execute code snippets in sandboxed environment
3. **Export Options**: Download code snippets as files
4. **Collaboration Features**: Real-time code sharing and editing
5. **Advanced Themes**: More syntax highlighting themes

### Extension Points

- Custom language detectors
- Additional syntax highlighting libraries
- Custom renderers for specific code types
- Integration with code analysis tools

## Conclusion

This implementation provides a robust, accessible, and performant solution for displaying code snippets in AI responses. It's designed to work seamlessly with existing React applications while providing extensive customization options and excellent user experience across all devices.