# 🚀 Quick Start Guide

Get the code execution backend running in 5 minutes!

## 📋 Prerequisites

- **Docker Desktop** (required) - [Download here](https://www.docker.com/products/docker-desktop/)
- **Node.js 18+** - [Download here](https://nodejs.org/)

## ⚡ Installation

### 1. Setup Backend
```bash
cd code-execution-backend
npm install
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` file:
```env
API_KEY=your-secret-key-here
PORT=3001
NODE_ENV=development
```

### 3. Pull Docker Images
```bash
npm run docker:build
```
*This takes 10-15 minutes first time (downloads ~2GB)*

### 4. Start Server
```bash
npm start
```

## ✅ Test It Works

### Health Check
```bash
curl http://localhost:3001/health
```

### Execute Python Code
```bash
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-here" \
  -d '{
    "language": "python",
    "code": "print(\"Hello World!\")"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "output": "Hello World!\n",
  "exitCode": 0,
  "executionTime": 245
}
```

## 🎯 Next Steps

- Read [Testing Guide](TESTING_GUIDE.md) for comprehensive testing
- Read [Architecture](ARCHITECTURE.md) to understand how it works
- Read [Security Deep Dive](SECURITY_DEEP_DIVE.md) for security details
- Connect to your Monaco Editor frontend

## 🐛 Troubleshooting

**"docker: command not found"**
- Install Docker Desktop and make sure it's running

**"Cannot connect to Docker daemon"**
- Start Docker Desktop application

**"Port 3001 already in use"**
- Change `PORT=3002` in `.env` file

Need help? Check the [full documentation](README.md)!