#!/bin/bash

# Repository Separation Script
# This script helps you separate your monorepo into 3 separate repositories

set -e

echo "🔄 Repository Separation Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Configuration
ORIGINAL_REPO_NAME="codejoin-new"
FRONTEND_REPO_NAME="codejoin-frontend"
BACKEND_REPO_NAME="codejoin-backend"
SOCKET_REPO_NAME="codejoin-socket"

# Get current directory
CURRENT_DIR=$(pwd)
PARENT_DIR=$(dirname "$CURRENT_DIR")

print_header "📁 Current Repository Analysis"
print_status "Current directory: $CURRENT_DIR"
print_status "Parent directory: $PARENT_DIR"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "code-execution-backend" ]; then
    print_error "Please run this script from your main project directory"
    print_error "Expected to find package.json and code-execution-backend directory"
    exit 1
fi

print_header "🎯 Repository Structure Plan"
echo "We will create 3 separate repositories:"
echo ""
echo "1. 📦 $FRONTEND_REPO_NAME (Frontend)"
echo "   Contains: app/, components/, lib/, public/, styles/, etc."
echo "   Deploys: Vercel"
echo ""
echo "2. ⚙️ $BACKEND_REPO_NAME (Backend)"
echo "   Contains: All content from code-execution-backend/"
echo "   Deploys: Railway/Render"
echo ""
echo "3. 🔄 $SOCKET_REPO_NAME (Socket Service)"
echo "   Contains: All content from socket-server/"
echo "   Deploys: Railway/Render"
echo ""

read -p "Continue with repository separation? (y/N): " continue
if [[ ! $continue =~ ^[Yy]$ ]]; then
    print_status "Operation cancelled"
    exit 0
fi

print_header "🚀 Starting repository separation"

# Step 1: Create Frontend Repository
print_status "步骤 1/3: 创建前端仓库..."

FRONTEND_DIR="$PARENT_DIR/$FRONTEND_REPO_NAME"
if [ -d "$FRONTEND_DIR" ]; then
    print_warning "Frontend directory already exists: $FRONTEND_DIR"
    read -p "Delete and recreate? (y/N): " delete_frontend
    if [[ $delete_frontend =~ ^[Yy]$ ]]; then
        rm -rf "$FRONTEND_DIR"
    else
        print_error "Please handle the frontend directory manually"
        exit 1
    fi
fi

mkdir -p "$FRONTEND_DIR"
print_status "Created frontend directory: $FRONTEND_DIR"

# Copy frontend files (exclude backend and socket-server)
print_status "Copying frontend files..."

# Copy essential directories and files
cp -r app "$FRONTEND_DIR/"
cp -r components "$FRONTEND_DIR/"
cp -r lib "$FRONTEND_DIR/"
cp -r public "$FRONTEND_DIR/"
cp -r styles "$FRONTEND_DIR/"
cp -r docs "$FRONTEND_DIR/"
cp -r hooks "$FRONTEND_DIR/"
cp -r types "$FRONTEND_DIR/"
cp -r utils "$FRONTEND_DIR/"

# Copy configuration files
cp package.json "$FRONTEND_DIR/"
cp package-lock.json "$FRONTEND_DIR/"
cp tsconfig.json "$FRONTEND_DIR/"
cp tsconfig.tsbuildinfo "$FRONTEND_DIR/"
cp next.config.ts "$FRONTEND_DIR/"
cp next.config.mjs "$FRONTEND_DIR/"
cp next-env.d.ts "$FRONTEND_DIR/"
cp tailwind.config.ts "$FRONTEND_DIR/"
cp postcss.config.mjs "$FRONTEND_DIR/"
cp eslint.config.mjs "$FRONTEND_DIR/"
cp components.json "$FRONTEND_DIR/"
cp middleware.ts "$FRONTEND_DIR/"

# Copy deployment files
cp vercel.json "$FRONTEND_DIR/"
cp .env.example "$FRONTEND_DIR/"
cp .env.production.example "$FRONTEND_DIR/"
cp .gitignore "$FRONTEND_DIR/"

# Copy some documentation
cp README.md "$FRONTEND_DIR/" 2>/dev/null || echo "# Frontend" > "$FRONTEND_DIR/README.md"

# Initialize git repository for frontend
cd "$FRONTEND_DIR"
git init
git add .
git commit -m "feat: Initialize frontend repository

- Separate frontend application from main repository
- Include Next.js application and components
- Configure Vercel deployment
- Add environment variable configuration

Files included:
- app/: Next.js pages and API routes
- components/: React components
- lib/: Shared libraries and utilities
- public/: Static assets
- styles/: Style files
- docs/: Documentation
- hooks/: Custom hooks
- types/: TypeScript type definitions"
print_status "Frontend repository created: $FRONTEND_DIR"

# Step 2: Create Backend Repository
print_status "Step 2/3: Creating backend repository..."

cd "$CURRENT_DIR"
BACKEND_DIR="$PARENT_DIR/$BACKEND_REPO_NAME"
if [ -d "$BACKEND_DIR" ]; then
    print_warning "Backend directory already exists: $BACKEND_DIR"
    read -p "Delete and recreate? (y/N): " delete_backend
    if [[ $delete_backend =~ ^[Yy]$ ]]; then
        rm -rf "$BACKEND_DIR"
    else
        print_error "Please handle the backend directory manually"
        exit 1
    fi
fi

mkdir -p "$BACKEND_DIR"
print_status "Created backend directory: $BACKEND_DIR"

# Copy backend files
print_status "Copying backend files..."
cp -r code-execution-backend/* "$BACKEND_DIR/"

# Copy hidden files if they exist
cp code-execution-backend/.gitignore "$BACKEND_DIR/" 2>/dev/null || true
cp code-execution-backend/.env.example "$BACKEND_DIR/" 2>/dev/null || true
cp code-execution-backend/Dockerfile "$BACKEND_DIR/" 2>/dev/null || true

# Create backend-specific files
cd "$BACKEND_DIR"

# Update package.json for standalone deployment
if [ -f "package.json" ]; then
    # Remove frontend dependencies if any
    npm pkg set "scripts.start=node src/server.js"
    npm pkg set "scripts.dev=node src/server.js"
fi

# Create Railway configuration
cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[[services]]
name = "code-execution-service"

[services.variables]
NODE_ENV = "production"
PORT = "3001"

[services.health_checks]
[services.health_checks.grace_period]
seconds = 10

[services.health_checks.interval]
seconds = 30

[services.health_checks.timeout]
seconds = 5

[services.health_checks.retries]
count = 3
EOF

# Create Render configuration
cat > render.yaml << 'EOF'
services:
  - type: web
    name: code-execution-backend
    env: node
    buildCommand: "npm install"
    startCommand: "npm start"
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
    healthCheck:
      path: /health
      initialDelaySeconds: 10
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3
    autoDeploy: true
EOF

# Create README
cat > README.md << 'EOF'
# Code Execution Backend

安全代码执行后端服务，支持多种编程语言的 Docker 隔离执行。

## 功能特性

- 🔒 安全的 Docker 隔离执行
- 🌍 支持 20+ 编程语言
- ⚡ 快速执行和资源限制
- 📊 完整的日志记录
- 🔄 REST API 接口

## 部署

### Railway
1. 连接此仓库到 Railway
2. 配置环境变量
3. 自动部署

### Render
1. 连接此仓库到 Render
2. 配置环境变量
3. 自动部署

## 环境变量

```env
NODE_ENV=production
PORT=3001
API_KEY=your_secure_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```
EOF

# Initialize git repository for backend
git init
git add .
git commit -m "feat: 初始化后端仓库

- 从主仓库分离代码执行服务
- 包含完整的 Docker 隔离执行功能
- 配置 Railway/Render 部署
- 添加健康检查和监控

功能包含:
- src/: 源代码
- test/: 测试文件
- docs/: 文档
- scripts/: 构建脚本
- docker/: Docker 配置"
print_status "后端仓库创建完成: $BACKEND_DIR"

# Step 3: Create Socket Server Repository
print_status "步骤 3/3: 创建Socket服务仓库..."

cd "$CURRENT_DIR"
SOCKET_DIR="$PARENT_DIR/$SOCKET_REPO_NAME"
if [ -d "$SOCKET_DIR" ]; then
    print_warning "Socket目录已存在: $SOCKET_DIR"
    read -p "删除并重新创建? (y/N): " delete_socket
    if [[ $delete_socket =~ ^[Yy]$ ]]; then
        rm -rf "$SOCKET_DIR"
    else
        print_error "请手动处理Socket目录"
        exit 1
    fi
fi

mkdir -p "$SOCKET_DIR"
print_status "创建Socket目录: $SOCKET_DIR"

# Copy socket server files
print_status "复制Socket服务文件..."
cp -r socket-server/* "$SOCKET_DIR/"

# Copy hidden files if they exist
cp socket-server/.gitignore "$SOCKET_DIR/" 2>/dev/null || true
cp socket-server/.env.example "$SOCKET_DIR/" 2>/dev/null || true

cd "$SOCKET_DIR"

# Create Socket-specific deployment configurations
cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[[services]]
name = "socket-io-server"

[services.variables]
NODE_ENV = "production"
PORT = "3002"

[services.health_checks]
[services.health_checks.grace_period]
seconds = 10

[services.health_checks.interval]
seconds = 30

[services.health_checks.timeout]
seconds = 5

[services.health_checks.retries]
count = 3
EOF

# Create Render configuration
cat > render.yaml << 'EOF'
services:
  - type: web
    name: socket-io-server
    env: node
    buildCommand: "npm install"
    startCommand: "npm start"
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3002
      - key: FRONTEND_URL
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
    healthCheck:
      path: /health
      initialDelaySeconds: 10
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3
    autoDeploy: true
EOF

# Create README
cat > README.md << 'EOF'
# Socket.IO Server

实时协作 Socket.IO 服务器，处理多用户协作功能。

## 功能特性

- 🔄 实时协作编辑
- 👥 多用户在线状态
- 💬 实时聊天功能
- 📝 文件同步
- 🎯 光标位置跟踪

## 部署

### Railway
1. 连接此仓库到 Railway
2. 配置环境变量
3. 自动部署

### Render
1. 连接此仓库到 Render
2. 配置环境变量
3. 自动部署

## 环境变量

```env
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://your-frontend-app.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```
EOF

# Initialize git repository for socket server
git init
git add .
git commit -m "feat: 初始化Socket.IO服务仓库

- 从主仓库分离实时协作服务
- 包含完整的 Socket.IO 功能
- 配置 Railway/Render 部署
- 添加健康检查和 CORS 配置

功能包含:
- server.js: Socket.IO 服务器主文件
- Dockerfile: 容器化配置
- 实时协作和聊天功能"
print_status "Socket服务仓库创建完成: $SOCKET_DIR"

# Summary
cd "$CURRENT_DIR"
print_header "✅ 仓库分离完成!"
echo ""
echo "📁 创建的仓库:"
echo "🔹 前端: $FRONTEND_DIR"
echo "🔹 后端: $BACKEND_DIR"
echo "🔹 Socket: $SOCKET_DIR"
echo ""
echo "📋 下一步操作:"
echo ""
echo "1. 🚀 在 GitHub/GitLab 上创建新仓库:"
echo "   - $FRONTEND_REPO_NAME"
echo "   - $BACKEND_REPO_NAME"
echo "   - $SOCKET_REPO_NAME"
echo ""
echo "2. 🔗 连接本地仓库到远程仓库:"
echo "   cd $FRONTEND_DIR"
echo "   git remote add origin git@github.com:yourusername/$FRONTEND_REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "   cd $BACKEND_DIR"
echo "   git remote add origin git@github.com:yourusername/$BACKEND_REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "   cd $SOCKET_DIR"
echo "   git remote add origin git@github.com:yourusername/$SOCKET_REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "3. ⚙️ 配置部署平台:"
echo "   - 前端: Vercel (连接 $FRONTEND_REPO_NAME)"
echo "   - 后端: Railway (连接 $BACKEND_REPO_NAME)"
echo "   - Socket: Railway (连接 $SOCKET_REPO_NAME)"
echo ""
echo "4. 🔧 设置环境变量:"
echo "   - 更新前端 API 配置指向新的后端服务"
echo "   - 在各个平台配置相应的环境变量"
echo ""
echo "🎉 仓库分离成功! 现在可以独立部署每个服务了。"