# 🏗️ Backend Architecture Deep Dive

This document explains how the code execution backend works fundamentally, from request to response.

## 🎯 High-Level Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Docker        │
│   (Monaco)      │───▶│   (Express.js)  │───▶│   (Containers)  │
│                 │    │                 │    │                 │
│ • Code Editor   │    │ • API Server    │    │ • Isolated Env  │
│ • Send Requests │    │ • Security      │    │ • Language VMs  │
│ • Show Results  │    │ • Orchestration │    │ • Safe Exec     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Request Lifecycle

When you send code to be executed, here's the complete journey:

### 1. HTTP Request Arrives
```javascript
POST /api/execute
Headers: {
  "Content-Type": "application/json",
  "X-API-Key": "secret-key"
}
Body: {
  "language": "python",
  "code": "print('Hello')",
  "input": "",
  "timeout": 10000
}
```

### 2. Middleware Chain Processing

#### a) Request ID Assignment
```javascript
// src/middleware/security.js
const addRequestId = (req, res, next) => {
  req.id = uuidv4(); // "abc-123-def-456"
  res.setHeader('X-Request-ID', req.id);
  next();
};
```
**Purpose**: Track each request for logging and debugging

#### b) Rate Limiting Check
```javascript
const executeRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  20 // 20 executions per 5 minutes
);
```
**Purpose**: Prevent abuse and DoS attacks

#### c) API Key Authentication
```javascript
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};
```
**Purpose**: Ensure only authorized users can execute code

#### d) Input Validation
```javascript
const validateInput = (req, res, next) => {
  const dangerousPatterns = [
    /\bexec\s*\(/i,
    /\beval\s*\(/i,
    /\bos\.system\s*\(/i,
    // ... more patterns
  ];

  // Check for dangerous code patterns
  for (const pattern of dangerousPatterns) {
    if (pattern.test(req.body.code)) {
      return res.status(400).json({
        error: 'Code contains potentially dangerous patterns'
      });
    }
  }
  next();
};
```
**Purpose**: Block obviously malicious code before execution

### 3. Controller Processing

```javascript
// src/controllers/executeController.js
async execute(req, res) {
  // 1. Validate request schema with Joi
  const { error, value } = executeSchema.validate(req.body);

  // 2. Check language support
  if (!isLanguageSupported(language)) {
    return res.status(400).json({
      error: `Language '${language}' is not supported`
    });
  }

  // 3. Get language configuration
  let languageConfig = getLanguageConfig(language);

  // 4. Execute code via Docker service
  const result = await dockerService.executeCode(languageConfig, code, input);

  // 5. Return response
  res.json(result);
}
```

### 4. Docker Service Execution

This is where the magic happens! Let's break down the `dockerService.executeCode()` method:

#### a) Container Creation
```javascript
// src/services/dockerService.js
async createSecureContainer(languageConfig, code, containerId) {
  const containerConfig = {
    Image: languageConfig.image, // e.g., "python:3.11-alpine"
    name: `code-exec-${containerId}`,

    // Security settings
    NetworkMode: 'none', // No internet access
    User: 'nobody',      // Non-root user

    // Resource limits
    HostConfig: {
      Memory: parseMemoryLimit(languageConfig.memoryLimit), // 128MB
      CpuQuota: Math.floor(languageConfig.cpuLimit * 100000), // 50% CPU
      PidsLimit: 64, // Max 64 processes

      // Filesystem restrictions
      Tmpfs: {
        '/tmp': 'rw,noexec,nosuid,size=100m' // Temporary filesystem
      },

      // Security options
      CapDrop: ['ALL'], // Drop all Linux capabilities
      SecurityOpt: ['no-new-privileges:true'],
      AutoRemove: true // Auto-cleanup
    }
  };

  return await this.docker.createContainer(containerConfig);
}
```

#### b) Code Injection
```javascript
async copyCodeToContainer(container, fileName, code) {
  // Create a TAR archive with the code file
  const tar = require('tar-stream');
  const pack = tar.pack();

  pack.entry({ name: fileName }, code); // e.g., "code.py" with user's code
  pack.finalize();

  // Upload the file to the container's /tmp directory
  await container.putArchive(pack, { path: '/tmp' });
}
```

#### c) Execution Process

**For Interpreted Languages (Python, JavaScript, etc.):**
```javascript
// Container runs: python /tmp/code.py
containerConfig.Cmd = [languageConfig.runCommand, fileName];
```

**For Compiled Languages (C++, Java, Go, etc.):**
```javascript
// Container runs: g++ -o /tmp/program /tmp/code.cpp && /tmp/program
const compileAndRun = `${languageConfig.compileCommand} && ${languageConfig.runCommand}`;
containerConfig.Cmd = ['/bin/sh', '-c', compileAndRun];
```

#### d) Output Capture
```javascript
async runContainer(container, languageConfig, input) {
  // Start container and attach to streams
  const stream = await container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true
  });

  await container.start();

  // Set execution timeout
  const timeout = setTimeout(async () => {
    await container.kill(); // Force kill if timeout
  }, languageConfig.timeout);

  // Send input if provided
  if (input) {
    stream.write(input);
  }
  stream.end();

  // Capture all output
  return new Promise((resolve) => {
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));

    stream.on('end', async () => {
      clearTimeout(timeout);

      // Get exit code
      const result = await container.wait();
      const exitCode = result.StatusCode;

      // Parse Docker's multiplexed stream format
      const { stdout, stderr } = this.parseDockerStream(Buffer.concat(chunks));

      resolve({
        output: stdout,
        error: stderr,
        exitCode,
        executionTime: Date.now() - startTime
      });
    });
  });
}
```

## 🏗️ Component Architecture

### 1. Express.js Server (`src/server.js`)
**Role**: HTTP server and request routing
**Key Features**:
- CORS handling for frontend integration
- Security middleware (Helmet, rate limiting)
- Request/response logging
- Graceful shutdown handling

### 2. Docker Service (`src/services/dockerService.js`)
**Role**: Container lifecycle management
**Key Features**:
- Container creation with security restrictions
- Code injection via TAR archives
- Stream handling for input/output
- Automatic cleanup and resource management

### 3. Language Configuration (`src/config/languages.js`)
**Role**: Language-specific settings
**Structure**:
```javascript
{
  python: {
    name: 'Python',
    type: 'interpreted',        // or 'compiled'
    image: 'python:3.11-alpine', // Docker image
    fileExtension: '.py',       // File extension
    runCommand: 'python',       // Execution command
    timeout: 10000,            // Max execution time (ms)
    memoryLimit: '128m',       // RAM limit
    cpuLimit: 0.5              // CPU cores (0.5 = 50%)
  }
}
```

### 4. Security Middleware (`src/middleware/security.js`)
**Role**: Security enforcement
**Components**:
- **Rate Limiting**: Prevents spam/DoS
- **Authentication**: API key validation
- **Input Validation**: Pattern-based dangerous code detection
- **Request Tracking**: UUID for each request

### 5. Controller Layer (`src/controllers/executeController.js`)
**Role**: Business logic and API endpoints
**Endpoints**:
- `POST /api/execute` - Execute code
- `GET /api/languages` - List supported languages
- `GET /api/system` - System information
- `GET /health` - Health check

## 🔐 Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Network Layer    │ Rate limiting, CORS, HTTPS           │
│ 2. Application      │ API keys, input validation           │
│ 3. Container        │ Isolation, no network, resource      │
│ 4. System          │ Non-root user, capabilities drop     │
│ 5. Filesystem      │ Read-only, tmpfs, size limits        │
└─────────────────────────────────────────────────────────────┘
```

### 1. Network Security
- **Rate Limiting**: Max 20 executions per 5 minutes per IP
- **CORS**: Restrict which domains can call the API
- **API Keys**: Prevent unauthorized access

### 2. Container Security
```javascript
{
  NetworkMode: 'none',           // No internet access
  User: 'nobody',               // Non-root user (UID 65534)
  ReadonlyRootfs: false,        // Allow writes to /tmp only
  CapDrop: ['ALL'],            // Remove all Linux capabilities
  SecurityOpt: ['no-new-privileges:true'], // Prevent privilege escalation

  // Resource limits
  Memory: 134217728,            // 128MB RAM
  CpuQuota: 50000,             // 50% of one CPU core
  PidsLimit: 64,               // Max 64 processes

  // Filesystem restrictions
  Tmpfs: {
    '/tmp': 'rw,noexec,nosuid,size=100m', // Temp files, no execution
    '/var/tmp': 'rw,noexec,nosuid,size=10m'
  }
}
```

### 3. Code Pattern Detection
```javascript
const dangerousPatterns = [
  /\bexec\s*\(/i,              // exec() calls
  /\beval\s*\(/i,              // eval() calls
  /\b__import__\s*\(/i,        // Dynamic imports
  /\bos\.system\s*\(/i,        // System calls
  /\bsubprocess\s*\./i,        // Subprocess module
  /\brequire\s*\(\s*['"]child_process['"]\s*\)/i, // Node.js child_process
  /\bwhile\s*\(\s*true\s*\)/i, // Infinite loops
  /\bfor\s*\(\s*;\s*;\s*\)/i   // Infinite for loops
];
```

## 🚀 Performance Architecture

### 1. Container Lifecycle Optimization
- **Fast Startup**: Alpine Linux images (5-50MB vs 200MB+)
- **Auto-removal**: Containers delete themselves after execution
- **Resource Pooling**: Docker daemon reuses kernel resources

### 2. Memory Management
```
Language Memory Allocation:
├── Lightweight (64-128MB)
│   ├── Shell scripts
│   ├── JavaScript (Node.js)
│   └── Simple Python scripts
├── Medium (128-256MB)
│   ├── Python with libraries
│   ├── Go compilation
│   └── C++ compilation
└── Heavy (256-512MB)
    ├── Java (JVM overhead)
    ├── C# (.NET runtime)
    └── Scala (JVM + compiler)
```

### 3. CPU Allocation
```
CPU Limits by Language Type:
├── Scripts (0.25 cores): Shell, simple interpreted
├── Standard (0.5 cores): Python, JavaScript, Ruby
├── Compilation (0.75 cores): C++, Go, Rust
└── Heavy (1.0 cores): Java, C#, Scala
```

## 📊 Data Flow Diagrams

### Successful Execution Flow
```
1. Request → 2. Validation → 3. Container → 4. Execute → 5. Response
     │              │             │            │           │
     │              │             │            │           └─ JSON result
     │              │             │            └─ Capture output
     │              │             └─ Inject code & run
     │              └─ Check auth, rate limits, patterns
     └─ POST /api/execute with code
```

### Error Handling Flow
```
Error Points:
├── 1. Authentication (401)
├── 2. Rate Limiting (429)
├── 3. Validation (400)
├── 4. Docker Issues (500)
├── 5. Compilation (200 + error)
└── 6. Runtime Error (200 + error)
```

## 🛠️ Extension Points

### Adding New Languages

1. **Add to language config**:
```javascript
// src/config/languages.js
newlang: {
  name: 'NewLang',
  type: 'compiled', // or 'interpreted'
  image: 'newlang:latest',
  fileExtension: '.nl',
  compileCommand: 'nlc -o /tmp/program /tmp/code.nl',
  runCommand: '/tmp/program',
  timeout: 15000,
  memoryLimit: '256m',
  cpuLimit: 0.75
}
```

2. **Test the Docker image**:
```bash
docker run --rm newlang:latest nlc --version
```

3. **Add special handling if needed**:
```javascript
// src/services/dockerService.js
prepareCode(code, languageConfig) {
  if (languageConfig.name === 'NewLang') {
    // Special preprocessing for NewLang
    return code.replace(/oldSyntax/g, 'newSyntax');
  }
  return code;
}
```

### Custom Security Rules

Add language-specific security patterns:
```javascript
// src/middleware/security.js
const languageSpecificPatterns = {
  python: [/\b__import__\s*\(\s*['"]os['"]\s*\)/],
  javascript: [/\brequire\s*\(\s*['"]fs['"]\s*\)/],
  java: [/Runtime\.getRuntime\(\)\.exec/]
};
```

## 📝 Logging and Monitoring

### Log Structure
```javascript
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Code execution request",
  "requestId": "abc-123-def-456",
  "language": "python",
  "codeLength": 156,
  "executionTime": 245,
  "exitCode": 0,
  "containerMemory": "128m",
  "userIP": "192.168.1.100"
}
```

### Monitoring Metrics
- **Request Rate**: Requests per second/minute
- **Execution Time**: P50, P95, P99 latencies
- **Success Rate**: Percentage of successful executions
- **Resource Usage**: Memory and CPU consumption
- **Error Rates**: By error type and language

## 🎯 Production Considerations

### Scaling Strategy
1. **Horizontal Scaling**: Multiple backend instances behind load balancer
2. **Container Pooling**: Pre-warm containers for faster execution
3. **Resource Limits**: Prevent resource exhaustion
4. **Queue System**: Handle burst traffic with Redis/RabbitMQ

### Security Hardening
1. **Image Scanning**: Regularly scan Docker images for vulnerabilities
2. **Secrets Management**: Use vault for API keys and certificates
3. **Network Policies**: Implement network segmentation
4. **Audit Logging**: Track all API calls and executions

This architecture provides a solid foundation for secure, scalable code execution that can handle production workloads while maintaining safety and performance.