# Code Snippet Component Integration Guide

This guide will help you integrate the new Code Snippet component into your existing AI chat interface.

## Quick Start

### 1. Install Dependencies

The required dependencies should already be installed:

```bash
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

### 2. Basic Integration

Replace your existing message rendering logic with the new components:

**Before:**
```typescript
// In your AI chat component
<div className="message">
  <pre><code>{message.content}</code></pre>
</div>
```

**After:**
```typescript
import AIMessage from '@/components/ai-message';

// In your message list
{message.isAI ? (
  <AIMessage
    content={message.content}
    timestamp={message.timestamp}
    isAI={true}
    authorName="AI Assistant"
  />
) : (
  <UserMessage content={message.content} />
)}
```

### 3. Update Message Interface

Update your message type to include AI-specific properties:

```typescript
interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: string;
  isAI?: boolean;
  authorName?: string;
  authorAvatar?: string;
  metadata?: Record<string, unknown> | null;
}
```

## Component Integration Options

### Option 1: Drop-in Replacement (Recommended)

Use the `AIMessage` component for a complete replacement:

```typescript
import AIMessage from '@/components/ai-message';

// In your message rendering
messages.map((message) => (
  <AIMessage
    key={message.id}
    content={message.content}
    timestamp={message.timestamp}
    isAI={message.type === 'ai'}
    authorName={message.authorName}
    authorAvatar={message.authorAvatar}
    onThumbsUp={() => handleFeedback(message.id, 'up')}
    onThumbsDown={() => handleFeedback(message.id, 'down')}
  />
))
```

### Option 2: Manual Parsing

Use the message parser directly for more control:

```typescript
import { parseMessageContent, renderMessageParts } from '@/lib/message-parser';

// In your AI message component
const AIMessage = ({ content }) => {
  const parts = parseMessageContent(content);

  return (
    <div className="ai-message">
      {renderMessageParts(parts)}
    </div>
  );
};
```

### Option 3: Standalone Code Snippets

Use `CodeSnippet` directly for specific code blocks:

```typescript
import CodeSnippet from '@/components/code-snippet';

// For specific code display
<CodeSnippet
  code={codeContent}
  language="typescript"
  showCopyButton={true}
  maxHeight="400px"
/>
```

## Updating Existing Chat Components

### Update `chat-panel.tsx`

Find the message rendering section and replace it:

**Find this section:**
```typescript
messages.map((msg) => (
  <div key={msg.id} className={`flex gap-3 items-start`}>
    {/* Existing message rendering */}
    <p className="text-sm whitespace-pre-wrap break-words">
      {msg.content}
    </p>
  </div>
))
```

**Replace with:**
```typescript
import AIMessage from '@/components/ai-message';

messages.map((msg) => (
  <div key={msg.id}>
    {msg.isAI ? (
      <AIMessage
        content={msg.content}
        timestamp={new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        isAI={true}
        authorName={msg.authorName}
        authorAvatar={msg.authorAvatar}
        isPending={msg.isPending}
      />
    ) : (
      <div className="flex gap-3 items-start justify-end">
        {/* Existing user message rendering */}
        <div className="bg-primary text-primary-foreground rounded-lg p-3">
          <p className="text-sm whitespace-pre-wrap break-words">
            {msg.content}
          </p>
        </div>
      </div>
    )}
  </div>
))
```

### Update `ai-chat.tsx`

If you're using the simple AI chat component, update it similarly:

```typescript
import AIMessage from '@/components/ai-message';

// Replace the AI message rendering
{msg.type === "ai" ? (
  <AIMessage
    content={msg.content}
    timestamp={msg.timestamp}
    isAI={true}
    authorName="AI Assistant"
  />
) : (
  <div className="user-message">
    {msg.content}
  </div>
)}
```

## Customization Options

### Theme Styling

The component automatically adapts to your theme, but you can customize:

```css
/* Custom styles in your globals.css */
.code-snippet {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.ai-message {
  max-width: 100%;
}
```

### Custom Props

```typescript
<AIMessage
  content={message.content}
  timestamp={message.timestamp}
  isAI={true}
  authorName="AI Assistant"
  // Customization options
  onCopy={() => console.log('Message copied')}
  onThumbsUp={() => handleFeedback('up')}
  onThumbsDown={() => handleFeedback('down')}
  className="custom-message-style"
/>
```

### Code Snippet Customization

```typescript
<CodeSnippet
  code={code}
  language="typescript"
  // Customization options
  title="Custom Title"
  showCopyButton={true}
  showLanguageBadge={true}
  maxHeight="500px"
  className="border-2 border-primary"
  autoDetectLanguage={true}
/>
```

## Testing the Integration

### 1. Verify Code Detection

Test that code blocks are properly detected:

```typescript
// Send a test message with code blocks
const testMessage = `
Here's some code:

\`\`\`javascript
const hello = () => console.log('Hello World!');
\`\`\`

And here's inline code: \`console.log('inline')\`
`;
```

### 2. Test Copy Functionality

Verify that the copy buttons work:
1. Click the copy button on code snippets
2. Check that the code is copied to clipboard
3. Verify visual feedback (checkmark appears)

### 3. Test Theme Switching

Ensure the component adapts to theme changes:
1. Toggle between light and dark themes
2. Verify syntax highlighting colors update appropriately
3. Check that UI elements remain readable

### 4. Test Responsive Design

Verify the layout works on different screen sizes:
1. Test on mobile devices
2. Test on tablet screens
3. Test on desktop screens

## Troubleshooting

### Common Issues

**Issue: Code blocks not being detected**
```typescript
// Solution: Ensure proper markdown formatting
// Correct: ```javascript\ncode\n```
// Incorrect: ```javascript code ```
```

**Issue: Copy button not working**
```typescript
// Solution: Check HTTPS requirements
// The clipboard API requires HTTPS in production
```

**Issue: Styling conflicts**
```typescript
// Solution: Use custom CSS classes
<CodeSnippet className="custom-code-snippet" />
```

**Issue: Performance with large code blocks**
```typescript
// Solution: Limit height and disable features
<CodeSnippet
  code={largeCode}
  maxHeight="400px"
  showLineNumbers={false}
/>
```

### Debug Mode

Enable debug logging to troubleshoot:

```typescript
// Add debug logging
import { parseMessageContent } from '@/lib/message-parser';

const debugParsing = (content: string) => {
  const parts = parseMessageContent(content);
  console.log('Parsed parts:', parts);
  return parts;
};
```

## Performance Considerations

### Bundle Size

The component adds minimal bundle size impact:
- `react-syntax-highlighter`: ~200KB (gzipped)
- Tree-shaking reduces actual impact
- Only required themes are loaded

### Rendering Performance

For optimal performance:
1. Use `maxHeight` to limit visible content
2. Disable line numbers for very large blocks
3. Consider virtualization for hundreds of code blocks

### Memory Usage

The component is memory efficient:
- No memory leaks with proper cleanup
- Efficient re-rendering with React.memo
- Lazy loading of syntax highlighting styles

## Migration Checklist

- [ ] Install required dependencies
- [ ] Update message interface/types
- [ ] Replace message rendering logic
- [ ] Test code detection functionality
- [ ] Verify copy functionality
- [ ] Test theme switching
- [ ] Test responsive design
- [ ] Update styling if needed
- [ ] Add error handling
- [ ] Update documentation

## Support

For integration issues:
1. Check this guide first
2. Review the main documentation: `docs/CODE_SNIPPET_COMPONENT.md`
3. Test with the demo pages: `/code-snippets` and `/enhanced-chat`
4. Check the component source code for implementation details

## Next Steps

After successful integration:

1. **Customize styling** to match your brand
2. **Add feedback tracking** for thumbs up/down
3. **Implement analytics** for code snippet usage
4. **Add custom languages** if needed
5. **Create custom themes** for syntax highlighting