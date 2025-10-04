# Secure Code Execution Backend

A secure, Docker-based code execution backend that supports 20+ programming languages with isolation, resource limits, and comprehensive security measures.

## Features

- **🔒 Security First**: Docker isolation, no network access, resource limits
- **🌍 Multi-Language Support**: 20+ languages including Python, JavaScript, Java, C++, Go, Rust
- **⚡ Fast Execution**: Optimized containers with quick startup times
- **🛡️ Resource Protection**: Memory, CPU, and time limits
- **📊 Comprehensive Logging**: Detailed execution logs and monitoring
- **🔄 REST API**: Easy integration with frontend applications

## Supported Languages

### Interpreted Languages
- JavaScript (Node.js)
- Python
- Ruby
- PHP
- Shell (sh/bash)
- Perl
- Lua
- R
- Dart
- Elixir

### Compiled Languages
- C++
- C
- Java
- Go
- Rust
- C#
- TypeScript
- Kotlin
- Scala
- Swift
- Haskell
- OCaml

## Quick Start

### Prerequisites

- Docker (required)
- Node.js 18+
- 4GB RAM recommended

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository>
   cd code-execution-backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Pull Docker images**
   ```bash
   npm run docker:build
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Docker Images Setup

The system requires various Docker images for different languages:

```bash
# Pull all required images
node scripts/build-images.js pull

# Build custom multi-language image
node scripts/build-images.js build

# List all required images
node scripts/build-images.js list

# Do everything
node scripts/build-images.js all
```

## API Usage

### Execute Code

```bash
POST /api/execute
Content-Type: application/json
X-API-Key: your-api-key

{
  "language": "python",
  "code": "print('Hello, World!')",
  "input": "optional input data",
  "timeout": 10000
}
```

**Response:**
```json
{
  "success": true,
  "language": "python",
  "output": "Hello, World!\n",
  "error": "",
  "exitCode": 0,
  "executionTime": 245,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Get Supported Languages

```bash
GET /api/languages
```

### System Information

```bash
GET /api/system
X-API-Key: your-api-key
```

### Health Check

```bash
GET /health
```

## Security Features

### Container Security
- **No network access**: Containers run with `--network none`
- **Non-root user**: All code runs as `nobody` user
- **Read-only filesystem**: Root filesystem is read-only where possible
- **Resource limits**: Memory, CPU, and process limits
- **Capability dropping**: All Linux capabilities dropped
- **Auto-cleanup**: Containers are automatically removed

### Application Security
- **API key authentication**
- **Rate limiting**: Configurable limits per endpoint
- **Input validation**: Code size and pattern validation
- **Output sanitization**: Control characters stripped
- **Request timeouts**: Configurable execution timeouts

### Resource Limits

| Resource | Default Limit | Configurable |
|----------|---------------|--------------|
| Memory | 128MB-512MB | ✅ |
| CPU | 0.25-1.0 cores | ✅ |
| Execution Time | 5-30 seconds | ✅ |
| Code Size | 1MB | ✅ |
| Output Size | 10MB | ✅ |
| Processes | 32-64 | ✅ |

## Configuration

### Environment Variables

```env
# Server
PORT=3001
NODE_ENV=production

# Security
API_KEY=your-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Docker
CONTAINER_TIMEOUT_MS=30000
CONTAINER_MEMORY_LIMIT=128m
CONTAINER_CPU_LIMIT=0.5

# Execution Limits
MAX_EXECUTION_TIME_MS=10000
MAX_OUTPUT_SIZE_BYTES=10485760
MAX_CODE_SIZE_BYTES=1048576
```

### Language Configuration

Languages are configured in `src/config/languages.js`. Each language has:

- Docker image
- File extension
- Execution command
- Compilation command (if needed)
- Resource limits
- Timeout settings

## Examples

### Python Example
```javascript
const response = await fetch('/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    language: 'python',
    code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
    `,
    input: ''
  })
});
```

### C++ Example
```javascript
const response = await fetch('/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    language: 'cpp',
    code: `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    return 0;
}
    `
  })
});
```

## Monitoring and Logging

The system provides comprehensive logging:

- **Request logging**: All API requests with timing
- **Execution logging**: Code execution details and results
- **Error logging**: Detailed error information with stack traces
- **Security logging**: Rate limiting and authentication failures

Logs are written to:
- Console (development)
- Files in `logs/` directory
- Structured JSON format for easy parsing

## Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Adding New Languages

1. Add language configuration to `src/config/languages.js`
2. Test the Docker image works correctly
3. Add any special handling in `dockerService.js`
4. Update documentation

## Deployment

### Docker Deployment
```bash
# Build the application image
docker build -t code-execution-backend .

# Run with environment variables
docker run -d \
  -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e API_KEY=your-secret-key \
  --name code-exec-backend \
  code-execution-backend
```

### Production Considerations

1. **Resource Monitoring**: Monitor system resources and container usage
2. **Image Updates**: Regularly update Docker images for security
3. **Log Rotation**: Configure log rotation to prevent disk issues
4. **Backup**: Backup configuration and any persistent data
5. **Monitoring**: Set up health checks and monitoring alerts

## Troubleshooting

### Common Issues

1. **Docker not accessible**
   - Ensure Docker is running
   - Check Docker socket permissions
   - Verify user is in docker group

2. **Images not found**
   - Run `npm run docker:build` to pull images
   - Check Docker Hub connectivity

3. **Execution timeouts**
   - Increase timeout limits in configuration
   - Check system resources

4. **Permission errors**
   - Verify Docker socket permissions
   - Check container user configuration

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## Security

If you discover a security vulnerability, please email [security@example.com] instead of using the issue tracker.