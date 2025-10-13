# AI Message Flow & API Debugging Guide

## Overview

This guide explains how AI messages flow through the CodeJoin system, from the frontend user interface to the backend AI providers and back. It's designed to help you debug issues with AI model connectivity, particularly when troubleshooting OpenRouter/Qwen3 Coder request failures.

## Architecture Overview

```
Frontend (Next.js)     Backend (Express)      External APIs
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│ Project Workspace◄──►│ AI Chat         ◄──►│ OpenRouter API  │
│ Enhanced AI Chat│    │ Controller      │    │ Gemini API      │
│                 │    │                 │    │                 │
│                 │    │ OpenRouter      │    │                 │
│                 │    │ Controller      │    │                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                        ┌─────────────────┐
                        │                 │
                        │ Health Monitor  │
                        │ Error Handler   │
                        │ Rate Limiter    │
                        │                 │
                        └─────────────────┘
```

## Component Breakdown

### Frontend Components

#### 1. Project Workspace Component
**File**: `components/project-workspace.tsx`
**Lines**: 3589-3665 (AI Chat Input area)

**Purpose**: Main container for AI chat functionality in the project workspace.

**Key Functions**:
```typescript
// Handles sending messages to AI
const handleSendMessage = async () => {
  if (!message.trim() || isAiChatLoading) return;

  setIsAiChatLoading(true);
  setAiChatError(null);

  try {
    // Send message to enhanced AI chat component
    await enhancedAiChatRef.current?.sendMessage(message.trim());
    setMessage('');
  } catch (error) {
    setAiChatError(error.message);
  } finally {
    setIsAiChatLoading(false);
  }
};
```

**State Management**:
- `message`: Current input text
- `isAiChatLoading`: Loading state for UI feedback
- `aiChatError`: Error state for displaying errors
- `rateLimitInfo`: Rate limiting information

#### 2. Enhanced AI Chat Component
**File**: `components/enhanced-ai-chat.tsx`

**Purpose**: Advanced AI chat interface with model selection, retry logic, and error handling.

**Key Functions**:
```typescript
// Main message sending function
const sendMessage = async (content: string) => {
  const userMessage: Message = {
    id: generateId(),
    role: 'user',
    content,
    timestamp: new Date(),
    status: 'sending'
  };

  setMessages(prev => [...prev, userMessage]);

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content,
        model: selectedModel,
        conversationId,
        projectId,
        userId
      })
    });

    // Handle response...
  } catch (error) {
    // Handle errors...
  }
};
```

**Features**:
- Model selection dropdown
- Message history
- Retry functionality
- Error handling with user-friendly messages
- Rate limiting awareness

### API Layer Components

#### 3. Next.js API Route
**File**: `app/api/ai/chat/route.ts`

**Purpose**: Frontend-facing API endpoint that bridges frontend requests to the backend.

**Request Handler**:
```typescript
export async function POST(request: Request) {
  try {
    const requestBody = await request.json();

    // Validate request
    const { message, model, conversationId, projectId, userId } = requestBody;

    if (!message || !model || !projectId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.BACKEND_API_KEY || 'dev-key'
      },
      body: JSON.stringify({
        message,
        model,
        conversationId,
        projectId,
        userId
      })
    });

    const data = await response.json();

    // Handle different error types from backend
    if (!response.ok) {
      if (data.error?.type === 'rate_limit') {
        return NextResponse.json(
          {
            error: data.error,
            retryAfter: data.retryAfter,
            fallbackModel: data.fallbackModel
          },
          { status: 429 }
        );
      }

      // Handle other error types...
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Error Handling**:
- Rate limit detection and propagation
- API key validation
- Request validation
- Backend connectivity checks

### Backend Components

#### 4. Express Server
**File**: `code-execution-backend/src/server.js`
**Lines**: 201-210 (AI Chat endpoint)

**Purpose**: Main backend API server with routing, middleware, and error handling.

**AI Chat Route**:
```javascript
// AI Chat endpoint with rate limiting
app.post('/api/ai/chat', aiRateLimit, (req, res) => {
  if (!aiChatController) {
    return res.status(503).json({
      success: false,
      error: 'AI service is currently unavailable',
      fallback: true
    });
  }
  aiChatController.chat(req, res);
});
```

**Middleware Stack**:
1. `helmet()` - Security headers
2. `cors()` - Cross-origin resource sharing
3. `express.json()` - Request body parsing
4. `addRequestId()` - Request tracking
5. `generalRateLimit` - Global rate limiting
6. `authenticateApiKey` - API key validation
7. `enhancedErrorHandler.handle()` - Advanced error handling

#### 5. AI Chat Controller
**File**: `code-execution-backend/src/controllers/aiChatController.js`

**Purpose**: Orchestrates AI chat requests, manages provider selection, and handles fallback logic.

**Main Chat Method**:
```javascript
async chat(req, res) {
  try {
    const { message, model, conversationId, projectId, userId } = req.body;

    // Validate request
    if (!message || !model || !projectId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Select appropriate provider
    const provider = this.selectProvider(model);

    // Process with selected provider
    const result = await this.processWithProvider(provider, {
      message,
      model,
      conversationId,
      projectId,
      userId
    });

    // Return response
    res.json({
      success: true,
      response: result.response,
      model: result.model,
      usage: result.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Let enhanced error handler process the error
    throw error;
  }
}
```

**Provider Selection**:
```javascript
selectProvider(model) {
  if (model.startsWith('openrouter/')) {
    return 'openrouter';
  } else if (model.startsWith('gemini-')) {
    return 'gemini';
  } else {
    // Default to configured provider
    return this.defaultProvider;
  }
}
```

#### 6. OpenRouter Controller
**File**: `code-execution-backend/src/controllers/openRouterChatController.js`

**Purpose**: Handles OpenRouter API requests with advanced error handling, rate limiting, and retry logic.

**Main Processing Method**:
```javascript
async processWithOpenRouter({ message, model, conversationId, projectId, userId }) {
  const circuitBreaker = this.circuitBreakerFactory.get('openrouter');

  // Check circuit breaker
  if (circuitBreaker.isOpen()) {
    throw new Error('Circuit breaker is OPEN - OpenRouter temporarily unavailable');
  }

  try {
    // Construct OpenRouter request
    const requestBody = {
      model: model.replace('openrouter/', ''),
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    };

    // Make API request
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://codejoin.app',
        'X-Title': 'CodeJoin'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Create enhanced error based on response
      const error = new Error(errorData.error?.message || 'OpenRouter API error');
      error.status = response.status;
      error.code = errorData.error?.code;
      error.type = this.mapOpenRouterErrorType(response.status, errorData.error?.type);
      error.retryable = this.isRetryableError(response.status);
      error.service = 'openrouter';

      throw error;
    }

    const data = await response.json();

    // Record success in circuit breaker
    circuitBreaker.recordSuccess();

    return {
      response: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      provider: 'openrouter'
    };

  } catch (error) {
    // Record failure in circuit breaker
    circuitBreaker.recordFailure();

    // Re-throw with enhanced error information
    throw error;
  }
}
```

**Error Type Mapping**:
```javascript
mapOpenRouterErrorType(status, errorType) {
  switch (status) {
    case 429:
      return errorType === 'rate_limit_exceeded' ? 'rate_limit' : 'quota_exceeded';
    case 401:
      return 'authentication';
    case 403:
      return 'authorization';
    case 404:
      return 'model_not_found';
    case 503:
      return 'service_unavailable';
    default:
      return 'api_error';
  }
}
```

## Request Flow Step by Step

### Normal Message Flow

```
1. User Input
   └── User types message in Project Workspace input field
   └── User clicks "Send" button or presses Enter

2. Frontend Processing
   └── handleSendMessage() called in project-workspace.tsx
   └── Message validation and loading state set
   └── sendMessage() called in enhanced-ai-chat.tsx

3. API Request (Frontend → Backend)
   └── fetch() called to /api/ai/chat (Next.js route)
   └── Request includes: message, model, conversationId, projectId, userId
   └── Request headers: Content-Type, Authorization

4. Next.js API Route
   └── POST /api/ai/chat route handler executed
   └── Request validation and sanitization
   └── Backend API call with authentication

5. Backend Server
   └── Express receives request at /api/ai/chat
   └── Rate limiting middleware applied
   └── API key authentication middleware applied

6. AI Chat Controller
   └── aiChatController.chat() method called
   └── Provider selection based on model name
   └── Request forwarding to appropriate controller

7. OpenRouter Controller
   └── processWithOpenRouter() method called
   └── Circuit breaker status check
   └── OpenRouter API request construction
   └── External API call to OpenRouter

8. OpenRouter API
   └── External OpenRouter service processes request
   └── AI model generates response
   └── Response returned to backend

9. Response Flow (Backend → Frontend)
   └── Response processed and formatted
   └── Circuit breaker updated (success/failure)
   └── Response flows back through API layers
   └── Frontend receives and displays response
```

### Error Flow

```
1. Error Detection
   └── Error occurs at any point in the flow
   └── Error caught by nearest error handler

2. Enhanced Error Processing
   └── Error categorized (rate_limit, authentication, etc.)
   └── Retry information added
   └── User-friendly message generated

3. Error Propagation
   └── Enhanced error middleware processes error
   └── Error formatted for frontend consumption
   └── Response flows back through API layers

4. Frontend Error Handling
   └── Error received in frontend
   └── User-friendly error message displayed
   └── Retry/fallback options presented
```

## Debugging Tools & Techniques

### 1. Enable Debug Logging

**Backend (.env)**:
```env
DEBUG=*
LOG_LEVEL=debug
```

**Frontend (next.config.js)**:
```javascript
module.exports = {
  logging: {
    level: 'debug'
  }
}
```

### 2. Monitor Network Requests

**Browser DevTools**:
1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by `/api/ai/chat`
4. Send an AI message
5. Examine request/response details

**Key Things to Check**:
- Request payload contains correct model name
- Request headers include proper authentication
- Response status and error messages
- Timing information for bottlenecks

### 3. Check Backend Logs

**Start Backend with Verbose Logging**:
```bash
cd code-execution-backend
DEBUG=* npm run dev
```

**Key Log Messages to Watch For**:
```
Processing chat request with model: openrouter/qwen-2.5-coder-32b-instruct
Selected provider: openrouter
Circuit breaker status: CLOSED
OpenRouter API request: POST https://openrouter.ai/api/v1/chat/completions
OpenRouter API response: 200 OK
OpenRouter API error: 429 Rate limit exceeded
Circuit breaker is OPEN - OpenRouter temporarily unavailable
```

### 4. Check Frontend Logs

**Browser Console**:
```javascript
// Monitor fetch requests
console.log('Sending AI request:', requestBody);

// Monitor responses
console.log('AI response:', responseData);

// Monitor errors
console.error('AI request failed:', error);
```

### 5. Test API Endpoints Directly

**Test OpenRouter Controller**:
```bash
curl -X POST http://localhost:3001/api/openrouter-ai/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key" \
  -d '{
    "message": "Write a simple hello world function",
    "model": "openrouter/qwen-2.5-coder-32b-instruct",
    "projectId": "test-project",
    "userId": "test-user"
  }'
```

**Test Main AI Chat Endpoint**:
```bash
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key" \
  -d '{
    "message": "Write a simple hello world function",
    "model": "openrouter/qwen-2.5-coder-32b-instruct",
    "projectId": "test-project",
    "userId": "test-user"
  }'
```

### 6. Check Circuit Breaker Status

**Health Check Endpoint**:
```bash
curl http://localhost:3001/api/health/detailed
```

**Expected Response**:
```json
{
  "success": true,
  "health": {
    "overall": "healthy",
    "monitors": {
      "ai-service": {
        "healthy": true,
        "consecutiveFailures": 0
      }
    }
  },
  "circuitBreakers": {
    "openrouter": {
      "state": "CLOSED",
      "failures": 0,
      "lastFailure": null
    }
  }
}
```

## Common Issues & Solutions

### 1. OpenRouter Requests Not Appearing in Logs

**Possible Causes**:

**A. Circuit Breaker is Open**
- **Symptoms**: No OpenRouter API calls in logs, immediate "service unavailable" errors
- **Debug**: Check circuit breaker status at `/api/health/detailed`
- **Solution**: Wait for circuit breaker timeout or manually reset

**B. Model Name Mismatch**
- **Symptoms**: Request reaches backend but not OpenRouter controller
- **Debug**: Check logs for "Selected provider" messages
- **Solution**: Ensure model name exactly matches `openrouter/qwen-2.5-coder-32b-instruct`

**C. API Key Issues**
- **Symptoms**: Authentication errors, 401/403 responses
- **Debug**: Check environment variables for `OPENROUTER_API_KEY`
- **Solution**: Verify API key is valid and has sufficient credits

**D. Provider Selection Fails**
- **Symptoms**: Request reaches AI chat controller but doesn't forward
- **Debug**: Check "Selected provider" log messages
- **Solution**: Fix provider selection logic in AI chat controller

### 2. Rate Limiting Issues

**Symptoms**: 429 status codes, "rate limit exceeded" errors
**Debug**: Check response headers for `Retry-After` information
**Solution**: Implement rate limiting awareness and automatic retries

### 3. Authentication Failures

**Symptoms**: 401/403 status codes, "invalid API key" errors
**Debug**: Verify API key in backend environment variables
**Solution**: Update API key and ensure proper permissions

### 4. Network Connectivity Issues

**Symptoms**: Connection timeouts, network errors
**Debug**: Test network connectivity to OpenRouter API
**Solution**: Check firewall rules, DNS resolution, SSL certificates

## Monitoring & Health Checks

### Backend Health Endpoints

**Overall Health**:
```
GET /api/health/detailed
```

**Docker Service Health**:
```
GET /api/health/docker
```

**AI Service Health**:
```
GET /api/health/ai
```

**OpenRouter Health**:
```
GET /api/openrouter-ai/health
```

### Error Metrics

**Error Statistics**:
```
GET /api/metrics/errors
```

**AI Service Metrics**:
```
GET /api/ai/metrics
```

## Best Practices

### 1. Error Handling
- Always handle errors at each layer
- Provide meaningful error messages to users
- Log detailed error information for debugging
- Implement graceful degradation

### 2. Rate Limiting
- Respect API provider rate limits
- Implement exponential backoff for retries
- Provide clear feedback to users about rate limits
- Use circuit breakers to prevent cascading failures

### 3. Monitoring
- Monitor API health and performance
- Track error rates and patterns
- Set up alerts for critical failures
- Regular health checks and system status

### 4. Security
- Secure API keys and credentials
- Implement proper authentication
- Validate and sanitize all inputs
- Use HTTPS for all API communications

## Quick Debugging Checklist

When OpenRouter/Qwen3 Coder requests aren't working:

1. **Check Frontend**:
   - [ ] Browser DevTools Network tab shows `/api/ai/chat` request
   - [ ] Request payload contains correct model name
   - [ ] Request headers include proper authentication

2. **Check API Layer**:
   - [ ] Next.js console shows API route activity
   - [ ] Backend API call is successful
   - [ ] Response from backend is received

3. **Check Backend**:
   - [ ] Backend console shows "Processing chat request" message
   - [ ] "Selected provider: openrouter" message appears
   - [ ] OpenRouter API request is made
   - [ ] Response or error is logged

4. **Check External API**:
   - [ ] OpenRouter API is reachable
   - [ ] API key is valid
   - [ ] Model name is correct
   - [ ] Sufficient credits/quota available

5. **Check Health**:
   - [ ] Circuit breaker status is CLOSED
   - [ ] Rate limit not exceeded
   - [ ] Service health checks pass

This comprehensive guide should help you debug any issues with the AI message flow and understand exactly how requests move through the system.