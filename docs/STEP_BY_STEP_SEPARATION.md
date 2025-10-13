# Step-by-Step Repository Separation Guide

你已经提交了所有文件，现在想要分离仓库。这里是详细的步骤说明：

## 🎯 **分离计划**

我们将把你的当前仓库分离成 3 个独立的仓库：

### 📦 **1. 前端仓库** (`codejoin-frontend`)

**包含的文件夹：**

- ✅ `app/` - Next.js 页面和 API 路由
- ✅ `components/` - React 组件
- ✅ `lib/` - 共享库和工具函数
- ✅ `public/` - 静态资源
- ✅ `styles/` - CSS/样式文件
- ✅ `hooks/` - 自定义 React hooks
- ✅ `types/` - TypeScript 类型定义
- ✅ `utils/` - 工具函数
- ✅ `docs/` - 文档

**部署平台：** Vercel

### ⚙️ **2. 后端仓库** (`codejoin-backend`)

**包含的文件夹：**

- ✅ `code-execution-backend/` 的全部内容

**部署平台：** Railway/Render

### 🔄 **3. Socket 服务仓库** (`codejoin-socket`)

**包含的文件夹：**

- ✅ `socket-server/` 的全部内容

**部署平台：** Railway/Render

---

## 🚀 **方法 1：使用自动化脚本（推荐）**

### 步骤 1：运行分离脚本

```bash
# 确保脚本有执行权限
chmod +x scripts/separate-repositories.sh

# 运行分离脚本
./scripts/separate-repositories.sh
```

这个脚本会：

- 🔄 自动创建 3 个新目录
- 📋 复制正确的文件到每个仓库
- ⚙️ 为每个仓库创建部署配置
- 📝 初始化 Git 仓库
- 📚 生成 README 文件

### 步骤 2：创建远程仓库

在 GitHub 上创建 3 个新仓库：

1. `codejoin-frontend`
2. `codejoin-backend`
3. `codejoin-socket`

### 步骤 3：推送分离的仓库

```bash
# 推送前端仓库
cd ../codejoin-frontend
git remote add origin git@github.com:yourusername/codejoin-frontend.git
git push -u origin main

# 推送后端仓库
cd ../codejoin-backend
git remote add origin git@github.com:yourusername/codejoin-backend.git
git push -u origin main

# 推送Socket仓库
cd ../codejoin-socket
git remote add origin git@github.com:yourusername/codejoin-socket.git
git push -u origin main
```

---

## 🛠️ **方法 2：手动分离（如果脚本有问题）**

### 步骤 1：创建前端仓库

```bash
# 回到项目根目录的上一级目录
cd ../

# 创建前端目录
mkdir codejoin-frontend
cd codejoin-frontend

# 从原仓库复制前端文件
cp -r ../codejoin-new/app .
cp -r ../codejoin-new/components .
cp -r ../codejoin-new/lib .
cp -r ../codejoin-new/public .
cp -r ../codejoin-new/styles .
cp -r ../codejoin-new/hooks .
cp -r ../codejoin-new/types .
cp -r ../codejoin-new/utils .
cp -r ../codejoin-new/docs .

# 复制配置文件
cp ../codejoin-new/package.json .
cp ../codejoin-new/package-lock.json .
cp ../codejoin-new/tsconfig.json .
cp ../codejoin-new/next.config.ts .
cp ../codejoin-new/tailwind.config.ts .
cp ../codejoin-new/vercel.json .
cp ../codejoin-new/.gitignore .
cp ../codejoin-new/.env.example .

# 初始化Git仓库
git init
git add .
git commit -m "feat: 初始化前端仓库"

# 连接到远程仓库（在GitHub创建后）
git remote add origin git@github.com:yourusername/codejoin-frontend.git
git push -u origin main
```

### 步骤 2：创建后端仓库

```bash
# 回到上一级目录
cd ../

# 创建后端目录
mkdir codejoin-backend
cd codejoin-backend

# 复制后端文件
cp -r ../codejoin-new/code-execution-backend/* .

# 复制隐藏文件
cp ../codejoin-new/code-execution-backend/.gitignore . 2>/dev/null || true
cp ../codejoin-new/code-execution-backend/.env.example . 2>/dev/null || true

# 创建后端配置文件
cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100

[[services]]
name = "code-execution-service"

[services.variables]
NODE_ENV = "production"
PORT = "3001"
EOF

# 初始化Git仓库
git init
git add .
git commit -m "feat: 初始化后端仓库"

# 连接到远程仓库
git remote add origin git@github.com:yourusername/codejoin-backend.git
git push -u origin main
```

### 步骤 3：创建 Socket 服务仓库

```bash
# 回到上一级目录
cd ../

# 创建Socket目录
mkdir codejoin-socket
cd codejoin-socket

# 复制Socket文件
cp -r ../codejoin-new/socket-server/* .

# 复制隐藏文件
cp ../codejoin-new/socket-server/.gitignore . 2>/dev/null || true

# 创建Socket配置文件
cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100

[[services]]
name = "socket-io-server"

[services.variables]
NODE_ENV = "production"
PORT = "3002"
EOF

# 初始化Git仓库
git init
git add .
git commit -m "feat: 初始化Socket服务仓库"

# 连接到远程仓库
git remote add origin git@github.com:yourusername/codejoin-socket.git
git push -u origin main
```

---

## 🔧 **分离后的配置更新**

### 1. 更新前端 API 配置

在前端仓库中，更新 `lib/api-config.ts`：

```typescript
export const API_CONFIG = {
  BACKEND_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://your-backend-service.railway.app",
  SOCKET_URL:
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    "https://your-socket-service.railway.app",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};
```

### 2. 配置部署环境变量

#### 前端（Vercel）

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-socket.railway.app
```

#### 后端（Railway）

```
NODE_ENV=production
PORT=3001
API_KEY=your_secure_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Socket 服务（Railway）

```
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://your-frontend.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📋 **分离后的目录结构**

```
parent-directory/
├── codejoin-new/           # 原始仓库（可以保留或删除）
├── codejoin-frontend/      # 前端仓库
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── styles/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── docs/
│   ├── package.json
│   ├── vercel.json
│   └── .git/
├── codejoin-backend/       # 后端仓库
│   ├── src/
│   ├── test/
│   ├── docs/
│   ├── scripts/
│   ├── docker/
│   ├── package.json
│   ├── railway.toml
│   └── .git/
└── codejoin-socket/        # Socket服务仓库
    ├── server.js
    ├── package.json
    ├── Dockerfile
    ├── railway.toml
    └── .git/
```

---

## ⚠️ **注意事项**

1. **不要删除原仓库** - 先确保新仓库都能正常工作
2. **测试每个服务** - 分离后独立测试每个服务
3. **更新环境变量** - 确保所有环境变量都正确配置
4. **检查 API 连接** - 确保前端能正确连接到后端服务

---

## 🎯 **推荐步骤**

1. **使用自动化脚本**分离仓库
2. **在 GitHub 创建远程仓库**
3. **推送分离的仓库**
4. **配置部署平台**（Vercel + Railway）
5. **设置环境变量**
6. **测试所有功能**
7. **确认正常后**，可以考虑删除原仓库

这样你就有了 3 个独立的仓库，可以独立部署和扩展！🚀
