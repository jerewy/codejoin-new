# Git Commit Guide for Deployment Setup

This guide explains what you need to commit and push for your deployment setup.

## 📋 What You Need to Commit

Yes, you should commit and push most of the deployment files. Here's what to commit:

### ✅ **Files to Commit**

```bash
# Core deployment files
git add vercel.json
git add railway.toml
git add render.yaml
git add docker-compose.yml
git add Dockerfile.frontend
git add socket-server/
git add nginx/
git add .env.production.example

# Configuration and scripts
git add lib/api-config.ts
git add lib/monitoring.ts
git add scripts/deploy.sh
git add scripts/docker-deploy.sh

# Documentation
git add docs/SIMPLE_DEPLOYMENT_GUIDE.md
git add docs/ENVIRONMENT_SETUP.md
git add docs/GIT_COMMIT_GUIDE.md

# CI/CD
git add .github/workflows/deploy.yml

# Updated package.json
git add package.json
```

### ❌ **Files NOT to Commit**

```bash
# Environment files with secrets
.gitignore                    # Make sure these are in your .gitignore
.env.local
.env.production
.env

# Logs and temporary files
logs/
*.log
*.pid
temp/
```

## 🚀 **Step-by-Step Commit Process**

### 1. **Update .gitignore First**

Make sure your `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Dependency directories
node_modules/

# Build outputs
.next/
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/
```

### 2. **Commit the Deployment Files**

```bash
# Stage all deployment files
git add vercel.json railway.toml render.yaml docker-compose.yml
git add Dockerfile.frontend socket-server/ nginx/
git add .env.production.example lib/api-config.ts lib/monitoring.ts
git add scripts/ docs/ .github/ package.json

# Commit with descriptive message
git commit -m "feat: Add deployment configuration for separated services

- Add Vercel configuration for frontend deployment
- Add Railway/Render configurations for backend services
- Add Docker containerization setup with docker-compose
- Add Socket.IO server as separate service
- Add Nginx reverse proxy configuration
- Add environment variable management
- Add deployment scripts for simple and Docker deployments
- Add CI/CD pipeline with GitHub Actions
- Add monitoring and logging utilities
- Add comprehensive deployment documentation

Services now separated:
- Frontend: Next.js on Vercel
- Backend: Code execution service on Railway/Render
- Socket.IO: Real-time collaboration on Railway/Render
- Database: Supabase (existing)"
```

### 3. **Push to Repository**

```bash
# Push to main branch (for production deployment)
git push origin main

# Or push to develop branch (for testing)
git push origin develop
```

## 🔄 **Repository Structure for Deployment**

### **Option 1: Single Repository (Monorepo)**

```
your-project/
├── frontend/                 # Next.js app (current root)
├── backend/                  # Code execution backend
├── socket-server/           # Socket.IO service
├── docs/                    # Documentation
├── scripts/                 # Deployment scripts
├── .github/                 # CI/CD workflows
├── docker-compose.yml       # Docker setup
├── vercel.json             # Vercel config
├── railway.toml            # Railway config
└── render.yaml             # Render config
```

### **Option 2: Multiple Repositories (Recommended for Production)**

You might want to separate into multiple repositories:

```
# Repository 1: Frontend (your-frontend-repo)
- Next.js app
- vercel.json
- lib/api-config.ts
- lib/monitoring.ts

# Repository 2: Backend (your-backend-repo)
- code-execution-backend/
- Dockerfile
- railway.toml or render.yaml

# Repository 3: Socket Server (your-socket-repo)
- socket-server/
- Dockerfile
- railway.toml or render.yaml
```

## 🎯 **Deployment Triggers**

### **After Pushing to Main Branch:**

1. **CI/CD Pipeline** (if configured):

   - Tests run automatically
   - Docker images built and pushed
   - Services deployed to production

2. **Manual Deployment**:

   ```bash
   # Deploy frontend to Vercel
   vercel --prod

   # Deploy backends (if using Railway/Render)
   # They will auto-deploy when you push to connected repos
   ```

### **After Pushing to Develop Branch:**

1. **Staging Environment**:
   - Deploy to staging URLs
   - Test before production

## ⚠️ **Important Notes**

### **Environment Variables Setup**

After pushing, you'll need to configure environment variables:

1. **Vercel Dashboard**:

   - Go to your project → Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables

2. **Railway/Render Dashboard**:

   - Go to your services → Settings → Environment Variables
   - Add backend-specific variables

3. **GitHub Secrets** (for CI/CD):
   ```bash
   # Required secrets for GitHub Actions
   VERCEL_TOKEN
   ORG_ID
   PROJECT_ID
   RAILWAY_TOKEN
   RAILWAY_BACKEND_SERVICE_ID
   RAILWAY_SOCKET_SERVICE_ID
   RENDER_API_KEY
   RENDER_SERVICE_ID
   SLACK_WEBHOOK (optional)
   ```

### **First Deployment Steps**

1. **Push the code** (as shown above)
2. **Configure environment variables** in deployment platforms
3. **Run initial deployment**:
   - Frontend: `vercel --prod`
   - Backends: Connect repos to Railway/Render
4. **Test all services** are working
5. **Update frontend environment variables** with backend URLs

## 🔄 **Workflow Recommendations**

### **Development Workflow**

```bash
# 1. Create feature branch
git checkout -b feature/deployment-setup

# 2. Make changes and commit
git add .
git commit -m "feat: Add deployment configuration"

# 3. Push and create PR
git push origin feature/deployment-setup
# Create Pull Request on GitHub

# 4. After approval, merge to main
git checkout main
git merge feature/deployment-setup
git push origin main
```

### **Production Deployment**

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Run deployment script
npm run deploy

# 3. Or use Docker deployment
./scripts/docker-deploy.sh --deploy
```

## 📝 **Summary**

**Yes, you should commit and push most of these files** because:

1. **Version Control**: Track deployment configuration changes
2. **CI/CD**: Automated deployment needs the files in repo
3. **Collaboration**: Team members need access to deployment setup
4. **Recovery**: Easy to recreate deployment if needed

**Just make sure to:**

- Keep secrets out of the repository (use .gitignore)
- Configure environment variables in deployment platforms
- Test deployment after pushing

The deployment setup is now ready to be committed and deployed! 🚀
