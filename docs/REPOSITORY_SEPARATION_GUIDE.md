# Repository Separation Guide

This guide provides step-by-step instructions for separating your monorepo into separate repositories for production deployment.

## 🤔 **Should You Separate Repositories?**

### **Option 1: Single Repository (Monorepo) - Recommended for Start**

✅ **Pros:**

- Simpler to manage initially
- Single git history
- Easier to make cross-service changes
- Good for development teams

❌ **Cons:**

- Larger repository size
- Mixed concerns
- CI/CD can be more complex

### **Option 2: Separate Repositories - Recommended for Production**

✅ **Pros:**

- Clear separation of concerns
- Independent deployment cycles
- Better security isolation
- Easier scaling per service

❌ **Cons:**

- More repositories to manage
- Cross-service changes require multiple commits
- Initial setup complexity

## 📋 **Recommendation**

**Start with Option 1 (Single Repository)** for simplicity, then migrate to Option 2 (Separate Repositories) when you're ready for production scaling.

---

## 🚀 **Option 1: Single Repository Setup (Current Setup)**

### **Step 1: Keep Current Structure**

Your current structure is already set up for monorepo deployment:

```
your-project/
├── app/                    # Next.js pages
├── components/             # React components
├── lib/                    # Shared libraries
├── code-execution-backend/ # Backend service
├── socket-server/          # Socket.IO service
├── docs/                   # Documentation
├── scripts/                # Deployment scripts
├── vercel.json            # Frontend config
├── railway.toml           # Backend config
└── docker-compose.yml     # Local development
```

### **Step 2: Commit and Deploy**

```bash
# Add all deployment files
git add vercel.json railway.toml render.yaml docker-compose.yml
git add socket-server/ Dockerfile.frontend nginx/
git add lib/api-config.ts lib/monitoring.ts
git add scripts/ docs/ .github/ package.json

# Commit
git commit -m "feat: Add deployment configuration for separated services"

# Push to trigger deployment
git push origin main
```

### **Step 3: Configure Deployment Platforms**

- **Vercel**: Connect your repository and configure environment variables
- **Railway/Render**: Connect the same repository but specify subdirectories

---

## 🔄 **Option 2: Separate Repositories Setup (Production)**

### **Repository Structure Plan**

You'll create 3 separate repositories:

1. **`your-project-frontend`** - Next.js application
2. **`your-project-backend`** - Code execution service
3. **`your-project-socket`** - Socket.IO service

### **Step 1: Create New Repositories**

```bash
# Create new repositories on GitHub/GitLab
# 1. your-project-frontend
# 2. your-project-backend
# 3. your-project-socket
```

### **Step 2: Extract Frontend Repository**

```bash
# Create a new directory for frontend extraction
cd ../
mkdir your-project-frontend
cd your-project-frontend

# Clone current repository as backup
git clone ../your-project .

# Keep only frontend files
# Remove backend and socket-server directories
rm -rf code-execution-backend/
rm -rf socket-server/

# Keep essential frontend files
git add .
git commit -m "feat: Extract frontend from monorepo

- Keep Next.js application and components
- Remove backend services to separate repositories
- Add deployment configuration for Vercel
- Add API configuration for external services"

# Push to new frontend repository
git remote set-url origin git@github.com:yourusername/your-project-frontend.git
git push -u origin main
```

### **Step 3: Extract Backend Repository**

```bash
# Create backend directory
cd ../
mkdir your-project-backend
cd your-project-backend

# Clone current repository
git clone ../your-project .

# Keep only backend files
# Remove everything except code-execution-backend
find . -maxdepth 1 -not -name "." -not -name "code-execution-backend" -not -name ".git" -exec rm -rf {} +

# Move backend content to root
mv code-execution-backend/* .
mv code-execution-backend/.* . 2>/dev/null || true
rmdir code-execution-backend

# Create backend-specific files
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
EOF

cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100

[services.variables]
NODE_ENV = "production"
PORT = "3001"
EOF

cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
logs/
*.log
EOF

# Update package.json for backend-only deployment
npm pkg set scripts.start="node src/server.js"

# Commit and push
git add .
git commit -m "feat: Extract backend service from monorepo

- Isolate code execution service
- Add Docker configuration
- Add Railway deployment configuration
- Remove frontend dependencies"

git remote set-url origin git@github.com:yourusername/your-project-backend.git
git push -u origin main
```

### **Step 4: Extract Socket Server Repository**

```bash
# Create socket server directory
cd ../
mkdir your-project-socket
cd your-project-socket

# Clone current repository
git clone ../your-project .

# Keep only socket-server files
find . -maxdepth 1 -not -name "." -not -name "socket-server" -not -name ".git" -exec rm -rf {} +

# Move socket content to root
mv socket-server/* .
mv socket-server/.* . 2>/dev/null || true
rmdir socket-server

# Create socket-specific deployment files
cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100

[services.variables]
NODE_ENV = "production"
PORT = "3002"
EOF

# Commit and push
git add .
git commit -m "feat: Extract Socket.IO service from monorepo

- Isolate real-time collaboration service
- Add Docker configuration
- Add Railway deployment configuration
- Configure for standalone deployment"

git remote set-url origin git@github.com:yourusername/your-project-socket.git
git push -u origin main
```

### **Step 5: Update Frontend API Configuration**

In your frontend repository, update [`lib/api-config.ts`](lib/api-config.ts:1):

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

### **Step 6: Configure Each Repository**

#### Frontend Repository (`your-project-frontend`)

```bash
# Deploy to Vercel
vercel --prod

# Configure environment variables in Vercel dashboard:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-socket-service.railway.app
```

#### Backend Repository (`your-project-backend`)

```bash
# Connect to Railway
# Configure environment variables:
NODE_ENV=production
PORT=3001
API_KEY=your_secure_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Socket Repository (`your-project-socket`)

```bash
# Connect to Railway
# Configure environment variables:
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://your-frontend-app.vercel.app
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🎯 **Step-by-Step Recommendation**

### **For Quick Deployment (Start Here)**

1. **Stay with single repository** (Option 1)
2. **Commit current setup**:
   ```bash
   git add .
   git commit -m "feat: Add deployment configuration"
   git push origin main
   ```
3. **Configure deployment platforms**:
   - Vercel: Connect your repository
   - Railway: Connect same repository, specify subdirectories
4. **Test deployment**
5. **Consider separation later** if needed

### **For Production Setup (Advanced)**

1. **Follow Option 2 steps** above
2. **Create separate repositories**
3. **Configure each independently**
4. **Set up cross-repository CI/CD**
5. **Implement service discovery**

---

## 🔄 **Migration Path: From Monorepo to Separate Repos**

If you start with Option 1 and want to migrate to Option 2 later:

### **Phase 1: Prepare for Migration**

```bash
# In current repository
git checkout -b prepare-separation

# Document current service boundaries
# Add health checks
# Document API contracts
```

### **Phase 2: Create Separate Repos**

```bash
# Follow Option 2 steps above
# But keep original repository for now
```

### **Phase 3: Gradual Migration**

```bash
# Deploy new services alongside existing ones
# Test thoroughly
# Update DNS/routes gradually
```

### **Phase 4: Cleanup**

```bash
# Remove old services from original repo
# Archive original repository
# Update documentation
```

---

## 📝 **Summary**

### **Quick Path (Recommended)**:

1. ✅ Keep current single repository
2. ✅ Commit deployment files
3. ✅ Deploy with Vercel + Railway
4. ✅ Test and iterate

### **Production Path (Advanced)**:

1. 🔄 Create 3 separate repositories
2. 🔄 Extract services individually
3. 🔄 Configure independent deployments
4. 🔄 Set up cross-service communication

### **My Recommendation**:

**Start with the single repository approach**. It's simpler, faster to deploy, and you can always separate repositories later when you need to scale. The deployment configuration I created works perfectly for both scenarios!

Would you like me to help you with the single repository deployment first, or do you want to proceed with repository separation?
