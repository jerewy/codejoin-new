# 🧪 Backend Testing Guide

This guide will help you understand and test the code execution backend step by step.

## 📋 Prerequisites

Before we start, you'll need to install these tools:

### 1. Docker Desktop (Required)
**What is Docker?**
- Docker is like a "virtual computer" that runs inside your real computer
- It creates isolated environments called "containers" where code runs safely
- Think of it like a sandbox - code can't escape and affect your main system

**Why do we need Docker?**
- **Security**: Code runs isolated from your main system
- **Consistency**: Same environment every time, regardless of your OS
- **Safety**: Malicious code can't harm your computer
- **Multi-language**: Each language gets its own optimized environment

**Installation:**
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Verify installation: `docker --version`

### 2. Node.js 18+ (You likely have this)
```bash
node --version
npm --version
```

## 🚀 Step 1: Setup the Backend

### Navigate to the backend directory
```bash
cd code-execution-backend
```

### Install dependencies
```bash
npm install
```

### Create environment file
```bash
cp .env.example .env
```

**Edit the .env file:**
```env
PORT=3001
NODE_ENV=development
API_KEY=test-secret-key-123
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CONTAINER_TIMEOUT_MS=30000
CONTAINER_MEMORY_LIMIT=128m
CONTAINER_CPU_LIMIT=0.5
MAX_EXECUTION_TIME_MS=10000
LOG_LEVEL=info
```

## 🐳 Step 2: Prepare Docker Images

**What are Docker Images?**
- Images are like "templates" for creating containers
- Each programming language needs its own image with the right tools
- For example: Python image has Python interpreter, Node image has Node.js

### Pull the required images
```bash
# This downloads all the language environments
npm run docker:build
```

**What this does:**
- Downloads Python environment (python:3.11-alpine)
- Downloads Node.js environment (node:18-alpine)
- Downloads Java environment (openjdk:17-alpine)
- Downloads C++ compiler (gcc:latest)
- Downloads Go compiler (golang:1.21-alpine)
- And 15+ more language environments

**Note:** This may take 10-20 minutes the first time as it downloads ~2-5GB of images.

## 🏃 Step 3: Start the Backend

```bash
npm start
```

**What happens when you start:**
1. Express.js server starts on port 3001
2. Security middleware loads (rate limiting, authentication)
3. Docker service initializes and connects to Docker daemon
4. API endpoints become available
5. Logging system starts capturing events

**You should see:**
```
Code execution backend started on port 3001
Environment: development
Health check: http://localhost:3001/health
```

## 🔍 Step 4: Test Basic Functionality

### Test 1: Health Check (No Auth Required)
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.234,
  "version": "1.0.0"
}
```

**What this tells us:**
- Server is running
- Basic HTTP routing works
- No authentication required for health checks

### Test 2: Get Supported Languages
```bash
curl -H "X-API-Key: test-secret-key-123" http://localhost:3001/api/languages
```

**Expected Response:**
```json
{
  "success": true,
  "languages": [
    {
      "id": "javascript",
      "name": "JavaScript",
      "type": "interpreted",
      "fileExtension": ".js",
      "timeout": 10000,
      "memoryLimit": "128m",
      "cpuLimit": 0.5
    },
    {
      "id": "python",
      "name": "Python",
      "type": "interpreted",
      "fileExtension": ".py",
      "timeout": 10000,
      "memoryLimit": "128m",
      "cpuLimit": 0.5
    }
    // ... more languages
  ],
  "count": 22
}
```

**What this tells us:**
- API authentication works (API key required)
- Language configuration system works
- 22 languages are supported

## 💻 Step 5: Test Code Execution

### Test 3: Execute JavaScript
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-secret-key-123" \
  -d '{
    "language": "javascript",
    "code": "console.log(\"Hello from JavaScript!\"); console.log(2 + 2);"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "language": "javascript",
  "output": "Hello from JavaScript!\n4\n",
  "error": "",
  "exitCode": 0,
  "executionTime": 245,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**What happened behind the scenes:**
1. Request received and validated
2. API key checked
3. JavaScript language config loaded
4. Docker container created with Node.js image
5. Code written to `/tmp/code.js` inside container
6. Container started with security restrictions:
   - No network access
   - Limited memory (128MB)
   - Limited CPU (0.5 cores)
   - 10-second timeout
   - Runs as non-root user
7. Code executed: `node /tmp/code.js`
8. Output captured
9. Container automatically destroyed
10. Response sent back

### Test 4: Execute Python
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-secret-key-123" \
  -d '{
    "language": "python",
    "code": "print(\"Hello from Python!\")\nfor i in range(3):\n    print(f\"Count: {i}\")"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "language": "python",
  "output": "Hello from Python!\nCount: 0\nCount: 1\nCount: 2\n",
  "error": "",
  "exitCode": 0,
  "executionTime": 312,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Test 5: Test with Input
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-secret-key-123" \
  -d '{
    "language": "python",
    "code": "name = input(\"Enter your name: \")\nprint(f\"Hello, {name}!\")",
    "input": "Alice"
  }'
```

### Test 6: Test Compiled Language (C++)
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-secret-key-123" \
  -d '{
    "language": "cpp",
    "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello from C++!\" << endl;\n    return 0;\n}"
  }'
```

**What happens for compiled languages:**
1. Container created with GCC compiler
2. Code written to `/tmp/code.cpp`
3. Compilation: `g++ -o /tmp/program /tmp/code.cpp`
4. If compilation succeeds, execution: `/tmp/program`
5. Both compilation and execution output captured

## 🚨 Step 6: Test Security Features

### Test 7: Invalid API Key
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{
    "language": "python",
    "code": "print(\"This should fail\")"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### Test 8: Dangerous Code Detection
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-secret-key-123" \
  -d '{
    "language": "python",
    "code": "import os; os.system(\"rm -rf /\")"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Code contains potentially dangerous patterns"
}
```

### Test 9: Timeout Test
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-secret-key-123" \
  -d '{
    "language": "python",
    "code": "import time; time.sleep(15); print(\"This should timeout\")",
    "timeout": 5000
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "output": "",
  "error": "Execution timed out",
  "exitCode": 1,
  "executionTime": 5000
}
```

## 📊 Step 7: Monitor and Debug

### Check Logs
```bash
# View real-time logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log
```

### Get System Information
```bash
curl -H "X-API-Key: test-secret-key-123" http://localhost:3001/api/system
```

**Response includes:**
- Docker version and status
- Container and image counts
- System memory and CPU info
- Node.js version and uptime

## 🔧 Step 8: Advanced Testing

### Test Rate Limiting
```bash
# Run this script to test rate limiting
for i in {1..25}; do
  echo "Request $i"
  curl -X POST http://localhost:3001/api/execute \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-secret-key-123" \
    -d "{\"language\": \"javascript\", \"code\": \"console.log($i);\"}"
  echo ""
done
```

After ~20 requests in 5 minutes, you should see:
```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 300
}
```

### Test Multiple Languages
```bash
# Create a test script
cat > test_languages.sh << 'EOF'
#!/bin/bash

API_KEY="test-secret-key-123"
BASE_URL="http://localhost:3001/api/execute"

# Test JavaScript
echo "Testing JavaScript..."
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"language": "javascript", "code": "console.log(\"JS works!\");"}' | jq '.output'

# Test Python
echo "Testing Python..."
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"language": "python", "code": "print(\"Python works!\")"}' | jq '.output'

# Test Go
echo "Testing Go..."
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"language": "go", "code": "package main\nimport \"fmt\"\nfunc main() {\n    fmt.Println(\"Go works!\")\n}"}' | jq '.output'

EOF

chmod +x test_languages.sh
./test_languages.sh
```

## 🐛 Troubleshooting

### Common Issues

**1. "docker: command not found"**
- Install Docker Desktop
- Make sure Docker is running

**2. "Cannot connect to the Docker daemon"**
- Start Docker Desktop
- Check Docker is running: `docker ps`

**3. "Error response from daemon: pull access denied"**
- Check internet connection
- Try `docker login` if using private images

**4. "Port 3001 already in use"**
- Change PORT in .env file
- Or kill process: `lsof -ti:3001 | xargs kill`

**5. Containers not cleaning up**
```bash
# List all containers
docker ps -a

# Remove all stopped containers
docker container prune

# Remove all unused images
docker image prune -a
```

## 📈 Performance Testing

### Load Testing with Apache Bench (if installed)
```bash
# Install ab (Apache Bench)
# On Ubuntu: sudo apt install apache2-utils
# On Mac: brew install httpd

# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -H "X-API-Key: test-secret-key-123" \
   -p test_payload.json -T application/json \
   http://localhost:3001/api/execute
```

Create `test_payload.json`:
```json
{"language": "javascript", "code": "console.log('Load test');"}
```

## 🎯 Next Steps

Once basic testing works, you can:
1. **Integration Testing**: Connect to your Monaco Editor frontend
2. **Advanced Security**: Test with more complex attack vectors
3. **Performance Optimization**: Benchmark different languages
4. **Monitoring Setup**: Add Prometheus/Grafana monitoring
5. **Production Deployment**: Deploy with Docker Compose

## 📚 Understanding the Architecture

Now that you've tested it, check out the [Architecture Documentation](ARCHITECTURE.md) to understand how all the pieces work together!