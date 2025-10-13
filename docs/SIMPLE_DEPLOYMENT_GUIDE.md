# Simple Deployment Guide: Vercel + Railway/Render

This guide provides the simplest way to deploy your application by separating frontend and backend services.

## Overview

- **Frontend**: Vercel (Next.js hosting)
- **Backend Services**: Railway or Render (Node.js services)
- **Database**: Supabase (already configured)
- **Total Setup Time**: ~30 minutes

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Vercel    │    │  Railway/   │    │  Supabase   │
│  (Frontend) │◄──►│   Render    │◄──►│ (Database)  │
│             │    │ (Backends)  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Step 1: Prepare Your Project

### 1.1 Update Frontend Configuration

Create `vercel.json` in your root directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "NEXT_PUBLIC_API_URL": "@backend-url",
    "NEXT_PUBLIC_SOCKET_URL": "@socket-url"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 1.2 Update Backend Configuration

Create `railway.toml` for Railway deployment:

```toml
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
```

Or create `render.yaml` for Render deployment:

```yaml
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
    healthCheck:
      path: /health
```

## Step 2: Frontend Deployment (Vercel)

### 2.1 Install Vercel CLI

```bash
npm i -g vercel
```

### 2.2 Deploy Frontend

```bash
# From your project root
vercel --prod
```

### 2.3 Configure Environment Variables in Vercel

Go to your Vercel dashboard → Settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=your_railway_app_url
NEXT_PUBLIC_SOCKET_URL=your_railway_socket_url
```

## Step 3: Backend Deployment (Railway)

### 3.1 Prepare Backend for Railway

1. Create a new GitHub repository for your backend
2. Move `code-execution-backend` to its own repository
3. Update the `package.json` start script:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "railway:start": "node src/server.js"
  }
}
```

### 3.2 Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your backend repository
4. Railway will automatically detect it's a Node.js app

### 3.3 Configure Railway Environment Variables

In your Railway project settings:

```
NODE_ENV=production
PORT=3001
API_KEY=your_secure_api_key
DOCKER_SOCKET=/var/run/docker.sock
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Alternative Backend Deployment (Render)

### 4.1 Deploy to Render

1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: `code-execution-backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free` or `Starter`

### 4.2 Configure Render Environment Variables

In your Render service settings:

```
NODE_ENV=production
PORT=3001
API_KEY=your_secure_api_key
DOCKER_SOCKET=/var/run/docker.sock
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 5: Socket.IO Service Deployment

### 5.1 Create Separate Socket.IO Service

Since your current `server.js` combines Next.js and Socket.IO, we need to separate them.

Create a new file `socket-server/server.js`:

```javascript
const { createServer } = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const port = process.env.PORT || 3002;
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Socket.IO logic (copy from your existing server.js)
// ... (your existing socket logic)

httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`);
});
```

### 5.2 Deploy Socket.IO Service

Deploy this as a separate service on Railway or Render using the same process as Step 3 or 4.

## Step 6: Update Frontend to Use Separate Services

### 6.1 Create API Configuration

Create `lib/api-config.ts`:

```typescript
export const API_CONFIG = {
  BACKEND_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};
```

### 6.2 Update Socket.IO Client Connection

Update your Socket.IO client initialization:

```typescript
import { io } from "socket.io-client";
import { API_CONFIG } from "@/lib/api-config";

const socket = io(API_CONFIG.SOCKET_URL, {
  transports: ["websocket", "polling"],
});
```

## Step 7: Testing and Verification

### 7.1 Test Frontend

1. Visit your Vercel deployment URL
2. Check that all pages load correctly
3. Verify Supabase connection works

### 7.2 Test Backend Services

1. Test code execution endpoint: `https://your-backend-url/api/execute`
2. Test Socket.IO connection using browser dev tools
3. Check service health endpoints

### 7.3 Test Integration

1. Try creating and executing code in the frontend
2. Test real-time collaboration features
3. Verify AI integrations work

## Step 8: Custom Domain Setup (Optional)

### 8.1 Configure Custom Domain on Vercel

1. Go to Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### 8.2 Update Environment Variables

Update all environment variables to use your custom domain instead of Vercel's default URL.

## Cost Summary

- **Vercel (Frontend)**: Free tier available, $20/month for Pro
- **Railway (Backend)**: $5-20/month per service depending on usage
- **Render (Backend)**: Free tier available, $7/month for Starter
- **Supabase**: Free tier available, $25/month for Pro

**Total Monthly Cost**: $5-45 depending on chosen plans and usage

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure backend services allow your Vercel domain
2. **Socket Connection Issues**: Check that Socket.IO URL is correct and accessible
3. **Environment Variables**: Double-check all variables are set correctly
4. **Docker Issues**: Railway/Render may need special configuration for Docker access

### Debug Steps

1. Check service logs in Railway/Render dashboards
2. Use browser dev tools to inspect network requests
3. Verify environment variables are loaded correctly
4. Test each service independently

## Next Steps

1. Set up monitoring (Vercel Analytics, Railway logs)
2. Configure backup strategies
3. Set up CI/CD for automatic deployments
4. Add error tracking (Sentry, etc.)

This setup gives you a scalable, maintainable deployment with minimal complexity. You can easily upgrade to more advanced setups as your needs grow.
