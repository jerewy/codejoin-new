# Environment Setup Guide

This guide helps you configure environment variables for your separated frontend and backend services.

## Quick Setup

### 1. Frontend Environment Variables (Vercel)

Go to your Vercel dashboard → Settings → Environment Variables and add:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Service URLs
NEXT_PUBLIC_API_URL=https://your-backend-service.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-socket-service.railway.app

# AI Service API Keys (choose those you use)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENROUTER_API_KEY=sk_or_...
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-proj-...
PERPLEXITY_API_KEY=pplx-...
```

### 2. Backend Service Environment Variables (Railway/Render)

#### Code Execution Service

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Security
API_KEY=your_secure_api_key_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Docker Configuration
DOCKER_SOCKET=/var/run/docker.sock
CONTAINER_TIMEOUT_MS=30000
CONTAINER_MEMORY_LIMIT=128m
CONTAINER_CPU_LIMIT=0.5

# Execution Limits
MAX_EXECUTION_TIME_MS=30000
MAX_OUTPUT_SIZE_BYTES=10485760
MAX_CODE_SIZE_BYTES=1048576
```

#### Socket.IO Service

```env
# Server Configuration
NODE_ENV=production
PORT=3002

# CORS Configuration
FRONTEND_URL=https://your-vercel-app.vercel.app

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Detailed Configuration

### Getting Your Values

#### Supabase Configuration

1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL (for `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`)
   - anon/public key (for `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - service_role key (for backend services only - keep this secret!)

#### AI Service API Keys

**Anthropic Claude:**

- Go to [console.anthropic.com](https://console.anthropic.com)
- Create API key
- Format: `sk-ant-api03-...`

**OpenRouter:**

- Go to [openrouter.ai](https://openrouter.ai)
- Create API key
- Format: `sk_or_...`

**Google Gemini:**

- Go to [makersuite.google.com](https://makersuite.google.com)
- Create API key
- Format: `AIza...`

**OpenAI:**

- Go to [platform.openai.com](https://platform.openai.com)
- Create API key
- Format: `sk-proj-...`

#### Backend Service URLs

After deploying to Railway or Render:

1. **Railway:** Your service URL will be `https://your-service-name.up.railway.app`
2. **Render:** Your service URL will be `https://your-service-name.onrender.com`

### Security Best Practices

1. **Never commit API keys to Git**

   - Use environment variables
   - Add `.env.local` to `.gitignore`

2. **Use different keys for frontend and backend**

   - Frontend: Public keys only
   - Backend: Service role keys for database access

3. **Rotate keys regularly**

   - Set reminders to update API keys
   - Test key rotation in development first

4. **Use environment-specific configurations**
   - Development: Use test keys
   - Production: Use production keys

### Testing Environment Variables

#### Frontend Testing

Create a test page to verify environment variables:

```typescript
// app/test-env/page.tsx
export default function TestEnv() {
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
  };

  return (
    <div>
      <h1>Environment Variables Test</h1>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  );
}
```

#### Backend Testing

Create health check endpoints:

```javascript
// In your backend services
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabaseConnected: !!process.env.SUPABASE_URL,
  });
});
```

### Common Issues and Solutions

#### 1. CORS Errors

**Problem:** Frontend can't connect to backend

**Solution:** Ensure backend CORS includes your frontend URL:

```env
# In Socket.IO service
FRONTEND_URL=https://your-vercel-app.vercel.app
```

#### 2. Supabase Connection Issues

**Problem:** Database connection fails

**Solution:** Verify Supabase URLs and keys:

- Check URL format: `https://your-project.supabase.co`
- Verify API keys are correct
- Ensure project is active on Supabase

#### 3. Socket.IO Connection Issues

**Problem:** Real-time features not working

**Solution:** Check Socket.IO configuration:

- Verify Socket.IO service URL is accessible
- Check CORS settings
- Ensure ports are correct (3002 for Socket.IO)

#### 4. Docker Issues in Production

**Problem:** Code execution not working

**Solution:** Verify Docker access:

- Ensure Docker socket is accessible: `/var/run/docker.sock`
- Check Docker images are pulled
- Verify resource limits are appropriate

### Environment Variable Templates

#### Development (.env.local)

```env
# Development configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_supabase_key
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002

# Development AI keys (use test keys if possible)
ANTHROPIC_API_KEY=your_dev_anthropic_key
OPENROUTER_API_KEY=your_dev_openrouter_key
```

#### Production (.env.production)

```env
# Production configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-socket.railway.app

# Production AI keys
ANTHROPIC_API_KEY=your_production_anthropic_key
OPENROUTER_API_KEY=your_production_openrouter_key
```

### Automation Scripts

#### Setup Script

Create `scripts/setup-env.sh`:

```bash
#!/bin/bash

echo "Setting up environment variables..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "Created .env.local from template"
fi

# Check if production env exists
if [ ! -f .env.production ]; then
    cp .env.production.example .env.production
    echo "Created .env.production from template"
fi

echo "Please edit the environment files with your actual values:"
echo "- .env.local (for development)"
echo "- .env.production (for production)"
echo ""
echo "Then configure your deployment platforms:"
echo "- Vercel: Frontend environment variables"
echo "- Railway/Render: Backend environment variables"
```

#### Validation Script

Create `scripts/validate-env.sh`:

```bash
#!/bin/bash

echo "Validating environment variables..."

# Check required frontend variables
FRONTEND_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
BACKEND_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "API_KEY")

echo "Checking frontend variables..."
for var in "${FRONTEND_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing frontend variable: $var"
    else
        echo "✅ $var is set"
    fi
done

echo "Checking backend variables..."
for var in "${BACKEND_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing backend variable: $var"
    else
        echo "✅ $var is set"
    fi
done
```

This setup ensures your environment is properly configured for both development and production deployments.
