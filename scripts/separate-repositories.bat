@echo off
REM Repository Separation Script for Windows
REM This script helps you separate your monorepo into 3 separate repositories

echo 🔄 Repository Separation Script
echo ==============================

REM Configuration
set ORIGINAL_REPO_NAME=codejoin-new
set FRONTEND_REPO_NAME=codejoin-frontend
set BACKEND_REPO_NAME=codejoin-backend
set SOCKET_REPO_NAME=codejoin-socket

REM Get current directory
set CURRENT_DIR=%CD%
for %%i in ("%CURRENT_DIR%") do set PARENT_DIR=%%~dpi

echo 📁 Current Repository Analysis
echo [INFO] Current directory: %CURRENT_DIR%
echo [INFO] Parent directory: %PARENT_DIR%

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from your main project directory
    echo [ERROR] Expected to find package.json
    pause
    exit /b 1
)

if not exist "code-execution-backend" (
    echo [ERROR] Please run this script from your main project directory
    echo [ERROR] Expected to find code-execution-backend directory
    pause
    exit /b 1
)

echo.
echo 🎯 Repository Structure Plan
echo We will create 3 separate repositories:
echo.
echo 1. 📦 %FRONTEND_REPO_NAME% (Frontend)
echo    Contains: app/, components/, lib/, public/, styles/, etc.
echo    Deploys: Vercel
echo.
echo 2. ⚙️ %BACKEND_REPO_NAME% (Backend)
echo    Contains: All content from code-execution-backend/
echo    Deploys: Railway/Render
echo.
echo 3. 🔄 %SOCKET_REPO_NAME% (Socket Service)
echo    Contains: All content from socket-server/
echo    Deploys: Railway/Render
echo.

set /p continue="Continue with repository separation? (y/N): "
if /i not "%continue%"=="y" (
    echo [INFO] Operation cancelled
    pause
    exit /b 0
)

echo.
echo 🚀 Starting repository separation

REM Step 1: Create Frontend Repository
echo Step 1/3: Creating frontend repository...

set FRONTEND_DIR=%PARENT_DIR%%FRONTEND_REPO_NAME%
if exist "%FRONTEND_DIR%" (
    echo [WARNING] Frontend directory already exists: %FRONTEND_DIR%
    set /p delete_frontend="Delete and recreate? (y/N): "
    if /i "%delete_frontend%"=="y" (
        rmdir /s /q "%FRONTEND_DIR%"
    ) else (
        echo [ERROR] Please handle the frontend directory manually
        pause
        exit /b 1
    )
)

mkdir "%FRONTEND_DIR%"
echo [INFO] Created frontend directory: %FRONTEND_DIR%

REM Copy frontend files (exclude backend and socket-server)
echo [INFO] Copying frontend files...

REM Copy essential directories and files
xcopy /e /i /q "app" "%FRONTEND_DIR%\app"
xcopy /e /i /q "components" "%FRONTEND_DIR%\components"
xcopy /e /i /q "lib" "%FRONTEND_DIR%\lib"
xcopy /e /i /q "public" "%FRONTEND_DIR%\public"
xcopy /e /i /q "styles" "%FRONTEND_DIR%\styles"
xcopy /e /i /q "docs" "%FRONTEND_DIR%\docs"
xcopy /e /i /q "hooks" "%FRONTEND_DIR%\hooks"
xcopy /e /i /q "types" "%FRONTEND_DIR%\types"
xcopy /e /i /q "utils" "%FRONTEND_DIR%\utils"

REM Copy configuration files
copy "package.json" "%FRONTEND_DIR%\" >nul
copy "package-lock.json" "%FRONTEND_DIR%\" >nul 2>&1
copy "tsconfig.json" "%FRONTEND_DIR%\" >nul 2>&1
copy "tsconfig.tsbuildinfo" "%FRONTEND_DIR%\" >nul 2>&1
copy "next.config.ts" "%FRONTEND_DIR%\" >nul 2>&1
copy "next.config.mjs" "%FRONTEND_DIR%\" >nul 2>&1
copy "next-env.d.ts" "%FRONTEND_DIR%\" >nul 2>&1
copy "tailwind.config.ts" "%FRONTEND_DIR%\" >nul 2>&1
copy "postcss.config.mjs" "%FRONTEND_DIR%\" >nul 2>&1
copy "eslint.config.mjs" "%FRONTEND_DIR%\" >nul 2>&1
copy "components.json" "%FRONTEND_DIR%\" >nul 2>&1
copy "middleware.ts" "%FRONTEND_DIR%\" >nul 2>&1

REM Copy deployment files
copy "vercel.json" "%FRONTEND_DIR%\" >nul 2>&1
copy ".env.example" "%FRONTEND_DIR%\" >nul 2>&1
copy ".env.production.example" "%FRONTEND_DIR%\" >nul 2>&1
copy ".gitignore" "%FRONTEND_DIR%\" >nul 2>&1

REM Copy some documentation
copy "README.md" "%FRONTEND_DIR%\" >nul 2>&1 || echo # Frontend > "%FRONTEND_DIR%\README.md"

cd /d "%FRONTEND_DIR%"
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
echo [INFO] Frontend repository created: %FRONTEND_DIR%

REM Step 2: Create Backend Repository
echo.
echo Step 2/3: Creating backend repository...

cd /d "%CURRENT_DIR%"
set BACKEND_DIR=%PARENT_DIR%%BACKEND_REPO_NAME%
if exist "%BACKEND_DIR%" (
    echo [WARNING] Backend directory already exists: %BACKEND_DIR%
    set /p delete_backend="Delete and recreate? (y/N): "
    if /i "%delete_backend%"=="y" (
        rmdir /s /q "%BACKEND_DIR%"
    ) else (
        echo [ERROR] Please handle the backend directory manually
        pause
        exit /b 1
    )
)

mkdir "%BACKEND_DIR%"
echo [INFO] Created backend directory: %BACKEND_DIR%

REM Copy backend files
echo [INFO] Copying backend files...
xcopy /e /i /q "code-execution-backend\*" "%BACKEND_DIR%\"

REM Copy hidden files if they exist
copy "code-execution-backend\.gitignore" "%BACKEND_DIR%\" >nul 2>&1
copy "code-execution-backend\.env.example" "%BACKEND_DIR%\" >nul 2>&1
copy "code-execution-backend\Dockerfile" "%BACKEND_DIR%\" >nul 2>&1

cd /d "%BACKEND_DIR%"

REM Create Railway configuration
(
echo [build]
echo builder = "nixpacks"
echo.
echo [deploy]
echo healthcheckPath = "/health"
echo healthcheckTimeout = 100
echo restartPolicyType = "on_failure"
echo restartPolicyMaxRetries = 10
echo.
echo [[services]]
echo name = "code-execution-service"
echo.
echo [services.variables]
echo NODE_ENV = "production"
echo PORT = "3001"
echo.
echo [services.health_checks]
echo [services.health_checks.grace_period]
echo seconds = 10
echo.
echo [services.health_checks.interval]
echo seconds = 30
echo.
echo [services.health_checks.timeout]
echo seconds = 5
echo.
echo [services.health_checks.retries]
echo count = 3
) > railway.toml

REM Create Render configuration
(
echo services:
echo   - type: web
echo     name: code-execution-backend
echo     env: node
echo     buildCommand: "npm install"
echo     startCommand: "npm start"
echo     envVars:
echo       - key: NODE_ENV
echo         value: production
echo       - key: PORT
echo         value: 3001
echo       - key: API_KEY
echo         sync: false
echo       - key: SUPABASE_URL
echo         sync: false
echo       - key: SUPABASE_ANON_KEY
echo         sync: false
echo     healthCheck:
echo       path: /health
echo       initialDelaySeconds: 10
echo       periodSeconds: 30
echo       timeoutSeconds: 5
echo       failureThreshold: 3
echo     autoDeploy: true
) > render.yaml

REM Create README
(
echo # Code Execution Backend
echo.
echo Secure code execution backend service with Docker isolation for multiple programming languages.
echo.
echo ## Features
echo.
echo - 🔒 Secure Docker isolation execution
echo - 🌍 Support for 20+ programming languages
echo - ⚡ Fast execution with resource limits
echo - 📊 Complete logging
echo - 🔄 REST API interface
echo.
echo ## Deployment
echo.
echo ### Railway
echo 1. Connect this repository to Railway
echo 2. Configure environment variables
echo 3. Auto-deploy
echo.
echo ### Render
echo 1. Connect this repository to Render
echo 2. Configure environment variables
echo 3. Auto-deploy
echo.
echo ## Environment Variables
echo.
echo ```env
echo NODE_ENV=production
echo PORT=3001
echo API_KEY=your_secure_api_key
echo SUPABASE_URL=your_supabase_url
echo SUPABASE_ANON_KEY=your_supabase_anon_key
echo ```
) > README.md

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
echo [INFO] 后端仓库创建完成: %BACKEND_DIR%

REM Step 3: Create Socket Server Repository
echo.
echo Step 3/3: Creating Socket service repository...

cd /d "%CURRENT_DIR%"
set SOCKET_DIR=%PARENT_DIR%%SOCKET_REPO_NAME%
if exist "%SOCKET_DIR%" (
    echo [WARNING] Socket directory already exists: %SOCKET_DIR%
    set /p delete_socket="Delete and recreate? (y/N): "
    if /i "%delete_socket%"=="y" (
        rmdir /s /q "%SOCKET_DIR%"
    ) else (
        echo [ERROR] Please handle the Socket directory manually
        pause
        exit /b 1
    )
)

mkdir "%SOCKET_DIR%"
echo [INFO] Created Socket directory: %SOCKET_DIR%

REM Copy socket server files
echo [INFO] Copying Socket service files...
xcopy /e /i /q "socket-server\*" "%SOCKET_DIR%\"

REM Copy hidden files if they exist
copy "socket-server\.gitignore" "%SOCKET_DIR%\" >nul 2>&1
copy "socket-server\.env.example" "%SOCKET_DIR%\" >nul 2>&1

cd /d "%SOCKET_DIR%"

REM Create Socket-specific deployment configurations
(
echo [build]
echo builder = "nixpacks"
echo.
echo [deploy]
echo healthcheckPath = "/health"
echo healthcheckTimeout = 100
echo restartPolicyType = "on_failure"
echo restartPolicyMaxRetries = 10
echo.
echo [[services]]
echo name = "socket-io-server"
echo.
echo [services.variables]
echo NODE_ENV = "production"
echo PORT = "3002"
echo.
echo [services.health_checks]
echo [services.health_checks.grace_period]
echo seconds = 10
echo.
echo [services.health_checks.interval]
echo seconds = 30
echo.
echo [services.health_checks.timeout]
echo seconds = 5
echo.
echo [services.health_checks.retries]
echo count = 3
) > railway.toml

REM Create Render configuration
(
echo services:
echo   - type: web
echo     name: socket-io-server
echo     env: node
echo     buildCommand: "npm install"
echo     startCommand: "npm start"
echo     envVars:
echo       - key: NODE_ENV
echo         value: production
echo       - key: PORT
echo         value: 3002
echo       - key: FRONTEND_URL
echo         sync: false
echo       - key: SUPABASE_URL
echo         sync: false
echo       - key: SUPABASE_ANON_KEY
echo         sync: false
echo     healthCheck:
echo       path: /health
echo       initialDelaySeconds: 10
echo       periodSeconds: 30
echo       timeoutSeconds: 5
echo       failureThreshold: 3
echo     autoDeploy: true
) > render.yaml

REM Create README
(
echo # Socket.IO Server
echo.
echo Real-time collaboration Socket.IO server for handling multi-user collaboration features.
echo.
echo ## Features
echo.
echo - 🔄 Real-time collaborative editing
echo - 👥 Multi-user online status
echo - 💬 Real-time chat functionality
echo - 📝 File synchronization
echo - 🎯 Cursor position tracking
echo.
echo ## Deployment
echo.
echo ### Railway
echo 1. Connect this repository to Railway
echo 2. Configure environment variables
echo 3. Auto-deploy
echo.
echo ### Render
echo 1. Connect this repository to Render
echo 2. Configure environment variables
echo 3. Auto-deploy
echo.
echo ## Environment Variables
echo.
echo ```env
echo NODE_ENV=production
echo PORT=3002
echo FRONTEND_URL=https://your-frontend-app.vercel.app
echo SUPABASE_URL=your_supabase_url
echo SUPABASE_ANON_KEY=your_supabase_anon_key
echo ```
) > README.md

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
echo [INFO] Socket服务仓库创建完成: %SOCKET_DIR%

REM Summary
cd /d "%CURRENT_DIR%"
echo.
echo ✅ 仓库分离完成!
echo.
echo 📁 创建的仓库:
echo 🔹 前端: %FRONTEND_DIR%
echo 🔹 后端: %BACKEND_DIR%
echo 🔹 Socket: %SOCKET_DIR%
echo.
echo 📋 下一步操作:
echo.
echo 1. 🚀 在 GitHub/GitLab 上创建新仓库:
echo    - %FRONTEND_REPO_NAME%
echo    - %BACKEND_REPO_NAME%
echo    - %SOCKET_REPO_NAME%
echo.
echo 2. 🔗 连接本地仓库到远程仓库:
echo    cd %FRONTEND_DIR%
echo    git remote add origin git@github.com:yourusername/%FRONTEND_REPO_NAME%.git
echo    git push -u origin main
echo.
echo    cd %BACKEND_DIR%
echo    git remote add origin git@github.com:yourusername/%BACKEND_REPO_NAME%.git
echo    git push -u origin main
echo.
echo    cd %SOCKET_DIR%
echo    git remote add origin git@github.com:yourusername/%SOCKET_REPO_NAME%.git
echo    git push -u origin main
echo.
echo 3. ⚙️ 配置部署平台:
echo    - 前端: Vercel (连接 %FRONTEND_REPO_NAME%)
echo    - 后端: Railway (连接 %BACKEND_REPO_NAME%)
echo    - Socket: Railway (连接 %SOCKET_REPO_NAME%)
echo.
echo 4. 🔧 设置环境变量:
echo    - 更新前端 API 配置指向新的后端服务
echo    - 在各个平台配置相应的环境变量
echo.
echo 🎉 仓库分离成功! 现在可以独立部署每个服务了。
echo.
pause