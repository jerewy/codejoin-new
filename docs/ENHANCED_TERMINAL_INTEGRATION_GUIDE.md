# Enhanced Terminal Integration Guide

This guide provides comprehensive documentation for the enhanced terminal system that optimizes frontend integration with your PTY backend implementation.

## Overview

The enhanced terminal system provides:
- **Better PTY compatibility** for interactive Python experiences
- **Enhanced input processing** with control sequence handling
- **Improved error handling** and automatic recovery mechanisms
- **Performance optimizations** for large output and smooth resizing
- **Session persistence** across page reloads and network interruptions
- **Comprehensive debugging** and monitoring capabilities

## Architecture

### Core Components

1. **TerminalUtils** (`lib/terminal-utils.ts`)
   - Input/output processing for PTY compatibility
   - Control sequence handling (Ctrl+C, Ctrl+D, arrow keys, etc.)
   - ANSI escape sequence processing
   - Terminal state management

2. **TerminalErrorHandler** (`lib/terminal-error-handler.ts`)
   - Comprehensive error detection and classification
   - Automatic recovery strategies
   - User-friendly error messages
   - Recovery action execution

3. **TerminalPerformanceOptimizer** (`lib/terminal-performance.ts`)
   - Smart debouncing for terminal resizing
   - Output buffering and chunking
   - Memory management
   - Performance metrics

4. **TerminalSessionPersistence** (`lib/terminal-session-persistence.ts`)
   - Session state persistence
   - Automatic recovery after interruptions
   - History and output restoration
   - Cross-session data management

5. **Enhanced Terminal Hook** (`hooks/use-terminal-enhanced.ts`)
   - Unified terminal management
   - State synchronization
   - Event handling
   - Integration with all optimization systems

6. **Enhanced Terminal Component** (`components/terminal/TerminalSurfaceEnhanced.tsx`)
   - Optimized xterm.js integration
   - Performance monitoring
   - Error handling integration
   - Advanced features (search, clipboard, etc.)

## Quick Start

### 1. Basic Usage

```tsx
import { TerminalSurfaceEnhanced } from '@/components/terminal/TerminalSurfaceEnhanced';
import { useTerminalEnhanced } from '@/hooks/use-terminal-enhanced';

function CodeEditorWithTerminal() {
  const terminal = useTerminalEnhanced({
    projectId: 'project-123',
    userId: 'user-456',
    language: 'python',
    debug: true,
    onReady: (sessionId) => {
      console.log('Terminal ready:', sessionId);
    },
    onError: (error) => {
      console.error('Terminal error:', error);
    }
  });

  return (
    <div className="flex flex-col h-full">
      <TerminalSurfaceEnhanced
        ref={terminal.terminalRef}
        projectId={terminal.projectId}
        userId={terminal.userId}
        language={terminal.language}
        onReady={terminal.handleReady}
        onData={terminal.handleData}
        onError={terminal.handleError}
        onExit={terminal.handleExit}
        debug={terminal.debug}
        className="flex-1"
      />
    </div>
  );
}
```

### 2. Advanced Usage with All Features

```tsx
import {
  TerminalSurfaceEnhanced,
  TerminalDebugPanel
} from '@/components/terminal';
import {
  createTerminalErrorHandler,
  createTerminalPerformanceOptimizer,
  createTerminalSessionPersistence
} from '@/lib';

function AdvancedTerminal() {
  const [showDebug, setShowDebug] = useState(false);

  // Create optimization instances
  const errorHandler = useMemo(() => createTerminalErrorHandler({
    enableAutoRecovery: true,
    maxRetryAttempts: 3,
    enableNotifications: true
  }), []);

  const performanceOptimizer = useMemo(() => createTerminalPerformanceOptimizer(
    {
      debounceMs: 50,
      enablePredictiveResize: true,
    },
    {
      bufferSize: 1000,
      chunkSize: 100,
      enableVirtualScrolling: true,
    }
  ), []);

  const sessionPersistence = useMemo(() => createTerminalSessionPersistence({
    enableAutoSave: true,
    autoSaveInterval: 30000,
    enableRecovery: true,
  }), []);

  const terminal = useTerminalEnhanced({
    projectId: 'project-123',
    userId: 'user-456',
    language: 'python',
    debug: true,
    onError: (error) => {
      errorHandler.handleError(error.message, error.type, error.context);
    }
  });

  return (
    <div className="flex flex-col h-full">
      <TerminalSurfaceEnhanced
        ref={terminal.terminalRef}
        projectId={terminal.projectId}
        userId={terminal.userId}
        language={terminal.language}
        theme="dark"
        fontSize={14}
        enableSearch={true}
        enableClipboard={true}
        enableHistory={true}
        onReady={terminal.handleReady}
        onData={terminal.handleData}
        onError={terminal.handleError}
        onExit={terminal.handleExit}
        onResize={terminal.handleResize}
        debug={terminal.debug}
        className="flex-1"
      />

      {showDebug && (
        <TerminalDebugPanel
          sessionId={terminal.sessionId}
          errorHandler={errorHandler}
          performanceOptimizer={performanceOptimizer}
          isVisible={showDebug}
          onVisibilityChange={setShowDebug}
        />
      )}
    </div>
  );
}
```

## Configuration Options

### Terminal Surface Component

```tsx
interface TerminalSurfaceEnhancedProps {
  // Basic configuration
  projectId?: string;
  userId?: string;
  language?: string;

  // Appearance
  theme?: 'dark' | 'light' | 'auto';
  fontSize?: number;
  fontFamily?: string;

  // Features
  enableSearch?: boolean;
  enableClipboard?: boolean;
  enableHistory?: boolean;
  maxHistorySize?: number;

  // Performance
  maxOutputLines?: number;
  enableVirtualScrolling?: boolean;

  // Debugging
  debug?: boolean;

  // Event handlers
  onReady?: (payload: { sessionId: string }) => void;
  onData?: (payload: { sessionId: string; chunk: string }) => void;
  onInput?: (payload: { sessionId: string; input: string }) => void;
  onError?: (error: TerminalError) => void;
  onExit?: (payload: { sessionId: string; code?: number; reason?: string }) => void;
  onResize?: (payload: { sessionId: string; cols: number; rows: number }) => void;
}
```

### Performance Optimizer

```tsx
const performanceOptimizer = createTerminalPerformanceOptimizer(
  // Resize options
  {
    debounceMs: 50,        // Debounce delay for resize events
    maxDebounceMs: 500,    // Maximum debounce delay
    throttleResize: true,  // Enable resize throttling
    enablePredictiveResize: true, // Enable predictive resizing
  },
  // Output options
  {
    bufferSize: 1000,           // Output buffer size
    chunkSize: 100,             // Chunk size for large output
    flushInterval: 16,          // Flush interval (ms)
    maxOutputLines: 10000,      // Maximum output lines
    enableVirtualScrolling: false, // Enable virtual scrolling
    virtualScrollThreshold: 5000, // Threshold for virtual scrolling
  }
);
```

### Error Handler

```tsx
const errorHandler = createTerminalErrorHandler({
  enableAutoRecovery: true,    // Enable automatic recovery
  maxRetryAttempts: 3,         // Maximum retry attempts
  retryDelay: 1000,           // Delay between retries (ms)
  enableNotifications: true,   // Enable error notifications
  customRecoveryActions: [     // Custom recovery actions
    {
      id: 'custom-action',
      label: 'Custom Recovery',
      description: 'Custom recovery action',
      action: async () => { /* custom logic */ },
      priority: 1,
    }
  ],
});
```

### Session Persistence

```tsx
const sessionPersistence = createTerminalSessionPersistence({
  enableAutoSave: true,        // Enable automatic saving
  autoSaveInterval: 30000,     // Auto-save interval (ms)
  maxStoredSessions: 10,       // Maximum stored sessions
  enableCompression: true,     // Enable data compression
  storageKey: 'terminal-sessions', // Storage key
  enableRecovery: true,        // Enable session recovery
  maxRecoveryAttempts: 3,      // Maximum recovery attempts
  recoveryDelay: 1000,        // Recovery delay (ms)
});
```

## Performance Optimization Tips

### 1. Large Output Handling

For applications that generate large amounts of output:

```tsx
const performanceOptimizer = createTerminalPerformanceOptimizer(
  {},
  {
    bufferSize: 2000,           // Increase buffer size
    chunkSize: 200,             // Increase chunk size
    enableVirtualScrolling: true, // Enable virtual scrolling
    virtualScrollThreshold: 1000, // Lower threshold
  }
);
```

### 2. Smooth Resizing

For responsive layouts with frequent resizing:

```tsx
const performanceOptimizer = createTerminalPerformanceOptimizer({
  debounceMs: 100,             // Increase debounce for smoother UI
  enablePredictiveResize: true, // Enable predictive resizing
  throttleResize: true,        // Enable throttling
});
```

### 3. Memory Management

For long-running sessions:

```tsx
// Enable automatic memory optimization
setInterval(() => {
  performanceOptimizer.optimizeMemory();
}, 60000); // Every minute

// Limit output history
const terminal = useTerminalEnhanced({
  maxOutputLines: 5000, // Limit stored output
});
```

## Error Handling Best Practices

### 1. Custom Recovery Actions

```tsx
const errorHandler = createTerminalErrorHandler({
  customRecoveryActions: [
    {
      id: 'restart-docker',
      label: 'Restart Docker',
      description: 'Restart Docker service for this session',
      action: async () => {
        // Custom Docker restart logic
        await restartDockerContainer();
      },
      priority: 1,
    },
    {
      id: 'clear-cache',
      label: 'Clear Cache',
      description: 'Clear terminal cache and buffers',
      action: async () => {
        // Clear cache logic
        terminal.clearOutput();
        performanceOptimizer.clearSession(sessionId);
      },
      priority: 2,
    },
  ],
});
```

### 2. Error Classification

The system automatically classifies errors into types:
- `CONNECTION_ERROR` - Network/connection issues
- `SESSION_ERROR` - Terminal session problems
- `TIMEOUT_ERROR` - Operation timeouts
- `DOCKER_ERROR` - Docker-related issues
- `PTY_ERROR` - PTY-specific problems
- `INPUT_ERROR` - Input processing issues
- `OUTPUT_ERROR` - Output processing problems
- `PERMISSION_ERROR` - Permission/access issues
- `RESOURCE_ERROR` - Resource/memory issues

### 3. Recovery Strategies

The system includes built-in recovery strategies:
- Network interruption recovery
- Page reload restoration
- Partial session restoration
- Automatic retry with exponential backoff

## Debugging and Monitoring

### 1. Debug Panel

Use the debug panel for real-time monitoring:

```tsx
<TerminalDebugPanel
  sessionId={terminal.sessionId}
  errorHandler={errorHandler}
  performanceOptimizer={performanceOptimizer}
  isVisible={showDebug}
  onVisibilityChange={setShowDebug}
/>
```

### 2. Console Debugging

Enable debug logging:

```tsx
const terminal = useTerminalEnhanced({
  debug: true, // Enable debug logging
});

// Access debug information globally
if (typeof window !== 'undefined') {
  console.log('Debug logs:', window.terminalDebugger.getLogs());
  console.log('Session info:', terminal.debugInfo);
}
```

### 3. Performance Monitoring

Monitor performance metrics:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    const metrics = performanceOptimizer.getMetrics();
    console.log('Performance metrics:', metrics);

    // Alert on performance issues
    if (metrics.outputProcessingTime > 100) {
      console.warn('Slow output processing detected');
    }
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

## Session Persistence

### 1. Automatic Session Saving

Sessions are automatically saved with:
- Command history
- Terminal output
- Terminal size and cursor position
- Custom session data

### 2. Session Recovery

Sessions can be recovered after:
- Page reloads
- Network interruptions
- Browser crashes
- Tab restoration

### 3. Cross-Session Data

Share data between sessions:

```tsx
// Save custom data
sessionPersistence.updateSession({
  customData: {
    currentFile: 'script.py',
    workingDirectory: '/app',
    environment: 'python3',
  }
});

// Access custom data
const session = sessionPersistence.getCurrentSession();
const customData = session?.customData;
```

## Migration from Basic Terminal

To migrate from the basic terminal implementation:

### 1. Replace Component

```tsx
// Old
import TerminalSurface from '@/components/terminal/TerminalSurface';

// New
import TerminalSurfaceEnhanced from '@/components/terminal/TerminalSurfaceEnhanced';
```

### 2. Update Hook Usage

```tsx
// Old
const { socket, sendTerminalInput } = useSocket();

// New
const terminal = useTerminalEnhanced({
  projectId,
  userId,
  language,
  debug: true,
});
```

### 3. Add Optimizations

```tsx
// Add performance optimization
const performanceOptimizer = useMemo(() =>
  createTerminalPerformanceOptimizer(), []
);

// Add error handling
const errorHandler = useMemo(() =>
  createTerminalErrorHandler(), []
);

// Add session persistence
const sessionPersistence = useMemo(() =>
  createTerminalSessionPersistence(), []
);
```

## Troubleshooting

### Common Issues and Solutions

1. **Terminal not responding to input**
   - Check socket connection status
   - Verify session is ready
   - Check for input processing errors in debug panel

2. **Performance issues with large output**
   - Enable virtual scrolling
   - Increase buffer and chunk sizes
   - Limit output history

3. **Frequent disconnections**
   - Check network stability
   - Increase retry attempts
   - Enable session persistence

4. **Memory leaks**
   - Clear output regularly
   - Optimize memory usage
   - Monitor performance metrics

### Debug Commands

```javascript
// Enable debugging
window.setTerminalDebugging(true);

// Access debug information
console.log('Terminal state:', window.terminalDebugger.getLogs());
console.log('Performance metrics:', performanceOptimizer.getMetrics());

// Clear debug data
window.terminalDebugger.clearLogs();
```

## Best Practices

1. **Always enable debugging during development**
2. **Use session persistence for better UX**
3. **Monitor performance metrics in production**
4. **Implement custom recovery actions for your use case**
5. **Limit output history for long-running sessions**
6. **Use virtual scrolling for large output**
7. **Enable error notifications for better user feedback**
8. **Test network interruption scenarios**
9. **Optimize resize behavior for responsive layouts**
10. **Regularly clear cache and optimize memory**

## Support and Contributing

For issues, questions, or contributions:
1. Check the debug panel for detailed information
2. Export debug data for issue reporting
3. Include performance metrics and error logs
4. Provide reproduction steps and expected behavior

This enhanced terminal system provides a robust foundation for interactive code execution with excellent performance, reliability, and user experience.