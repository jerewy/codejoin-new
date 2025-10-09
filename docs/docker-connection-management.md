# Docker Connection Management System

This document describes the comprehensive Docker connection management system implemented to prevent error spamming and provide better user feedback when Docker is unavailable.

## Overview

The system consists of several components working together to:
1. **Prevent error spamming** by implementing rate limiting and retry limits
2. **Provide clear user feedback** about Docker connection status
3. **Enable automatic recovery** when Docker becomes available again
4. **Allow manual retry** with appropriate cooldown periods

## Architecture

### Core Components

#### 1. DockerConnectionManager (`/lib/docker-connection-manager.tsx`)
- **Purpose**: Central state management for Docker connection status
- **Features**:
  - Exponential backoff retry mechanism (5s, 10s, 20s, max 5min)
  - Rate limiting after consecutive failures
  - Connection status tracking and history
  - Health check capabilities

#### 2. DockerStatusIndicator (`/components/docker-status-indicator.tsx`)
- **Purpose**: Compact visual indicator for Docker status
- **Features**:
  - Real-time status display
  - Retry countdown timer
  - Compact and full display modes
  - Manual retry button

#### 3. DockerStatusPanel (`/components/docker-status-panel.tsx`)
- **Purpose**: Detailed status panel with comprehensive information
- **Features**:
  - Detailed connection status
  - Troubleshooting guidance
  - Manual retry functionality
  - Progress indicators for cooldown periods

#### 4. useDockerRecovery Hook (`/hooks/use-docker-recovery.tsx`)
- **Purpose**: Automatic recovery mechanism
- **Features**:
  - Periodic connection checks
  - Recovery on window focus/visibility change
  - Recovery on network reconnection
  - Configurable retry limits and intervals

### Backend Enhancements

#### Terminal Service Rate Limiting (`/code-execution-backend/src/server.js`)
- **Purpose**: Server-side rate limiting and backoff
- **Features**:
  - Per-socket failure tracking
  - Exponential backoff (5s, 10s, 20s, max 5min)
  - Detailed error messages with attempt counts
  - Automatic cleanup on socket disconnect

## Configuration

### Frontend Configuration

```typescript
// Constants in DockerConnectionManager
const MAX_CONSECUTIVE_FAILURES = 3;
const BASE_RETRY_DELAY_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes
const RATE_LIMIT_RESET_TIME_MS = 60000; // 1 minute
```

### Backend Configuration

```javascript
// Constants in server.js
const backoffSeconds = Math.min(5 * Math.pow(2, socket.data.dockerFailureCount - 1), 300);
```

## Usage

### Basic Usage

```typescript
import { useDockerConnection } from "@/lib/docker-connection-manager";

function MyComponent() {
  const { status, canAttemptConnection, reportConnectionFailure } = useDockerConnection();

  if (!canAttemptConnection()) {
    return <div>Docker connection is rate limited</div>;
  }

  return <div>Docker is available</div>;
}
```

### Adding Status Indicator

```typescript
import { DockerStatusIndicator } from "@/components/docker-status-indicator";

function TerminalPanel() {
  return (
    <div>
      <DockerStatusIndicator compact={true} />
      {/* Terminal content */}
    </div>
  );
}
```

### Adding Full Status Panel

```typescript
import { DockerStatusPanel } from "@/components/docker-status-panel";

function SettingsPage() {
  return (
    <div>
      <DockerStatusPanel compact={false} />
      {/* Other settings */}
    </div>
  );
}
```

### Using Auto-Recovery

```typescript
import { useDockerRecovery } from "@/hooks/use-docker-recovery";

function App() {
  const { isRecovering, attemptRecovery } = useDockerRecovery({
    enabled: true,
    checkInterval: 30000, // 30 seconds
    maxRetries: 10,
    onRecovery: () => console.log("Docker recovered!"),
    onFailedAttempt: (error) => console.error("Recovery failed:", error),
  });

  return (
    <div>
      {isRecovering && <div>Attempting Docker recovery...</div>}
    </div>
  );
}
```

## Error Handling

### Client-Side Error Detection

The system detects Docker-related errors by checking for these patterns:
- Message contains "docker"
- Message contains "container"
- Message contains "unavailable"

### Error Response Format

```typescript
interface DockerErrorResponse {
  message: string;
  code: "DOCKER_UNAVAILABLE" | "DOCKER_RATE_LIMITED";
  failureCount?: number;
  backoffSeconds?: number;
}
```

### Rate Limiting Behavior

1. **First Failure**: Error shown, retry allowed immediately
2. **Second Failure**: Error shown with attempt count, 5s backoff
3. **Third Failure**: Error shown with attempt count, 10s backoff
4. **After 3 Failures**: Rate limited with exponential backoff

## User Experience

### Status Indicators

- **Green Check**: Docker connected and ready
- **Red X**: Docker unavailable
- **Yellow Clock**: Rate limited, retry countdown shown
- **Spinning Loader**: Connection check in progress

### Error Messages

The system provides clear, actionable error messages:
- "Docker is not running or not accessible. Please start Docker Desktop and try again."
- "Docker connection temporarily unavailable. Please wait 15 seconds before retrying."
- "Docker connection failed too many times. Please check Docker and try again later."

### Recovery Flow

1. **Automatic Recovery**: System checks periodically and when conditions change
2. **Manual Recovery**: Users can click retry buttons when available
3. **Visual Feedback**: Clear progress indicators and status updates
4. **Success Notification**: Toast notification when Docker becomes available

## Troubleshooting

### Common Issues

1. **Docker Desktop not running**
   - Solution: Start Docker Desktop
   - Indicator: Red X with error message

2. **Docker socket permissions**
   - Solution: Check Docker daemon permissions
   - Indicator: Red X with permission error

3. **Rate limited after many failures**
   - Solution: Wait for cooldown period or reset counter
   - Indicator: Yellow clock with countdown

### Debug Information

Enable debug logging by checking the browser console:
- Connection attempts and failures
- Rate limiting status
- Recovery attempts
- Backend error responses

## Implementation Details

### State Management

The system uses React Context for global state management:
```typescript
interface DockerConnectionStatus {
  isAvailable: boolean | null;
  lastChecked: Date | null;
  consecutiveFailures: number;
  errorMessage: string | null;
  isRateLimited: boolean;
  nextRetryTime: Date | null;
}
```

### Backend Socket Data

Per-socket rate limiting data:
```javascript
socket.data = {
  dockerFailureCount: number,
  lastDockerFailureTime: Date,
  dockerBackoffUntil: Date,
  dockerUnavailableNotified: boolean
}
```

### Health Check Endpoint

The system uses `/api/health` endpoint for connection checks with 5-second timeout.

## Future Enhancements

1. **Docker Service Detection**: More detailed Docker service status
2. **Resource Monitoring**: Docker resource usage metrics
3. **Alternative Runtimes**: Support for other container runtimes
4. **Network Diagnostics**: Advanced network troubleshooting tools
5. **Configuration Management**: Docker configuration validation

## Security Considerations

1. **Rate Limiting**: Prevents abuse and resource exhaustion
2. **Input Validation**: All inputs validated on both client and server
3. **Error Sanitization**: Error messages sanitized to prevent information leakage
4. **Timeout Handling**: Proper timeout handling for all network requests

## Performance Impact

- **Minimal overhead**: Only active when Docker is unavailable
- **Efficient retries**: Exponential backoff prevents spam
- **Cached state**: Status cached to avoid redundant checks
- **Background recovery**: Non-blocking recovery attempts