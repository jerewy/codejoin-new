import { NextRequest, NextResponse } from 'next/server';

// POST /api/local-ai/chat - Local AI chat endpoint
export async function POST(request: NextRequest) {
  const requestId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    console.log(`Local AI chat request started: ${requestId}`);

    const body = await request.json();
    const { message, context, conversationId, projectId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Try backend local AI service
    try {
      const backendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3001';
      const backendApiKey = process.env.AI_BACKEND_API_KEY || 'test123';

      console.log(`Calling backend local AI: ${backendUrl}/api/local-ai/chat`);

      const response = await fetch(`${backendUrl}/api/local-ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': backendApiKey
        },
        body: JSON.stringify({
          message,
          context: {
            ...context,
            conversationId,
            projectId,
            requestId,
            timestamp: new Date().toISOString(),
            useLocalModel: true
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Backend local AI success for request: ${requestId}`);

        return NextResponse.json({
          success: true,
          response: data.response || data.message,
          metadata: {
            model: data.metadata?.model || 'deepseek-coder-6.7b',
            provider: data.metadata?.provider || 'Local AI',
            tokensUsed: data.metadata?.tokensUsed || 0,
            responseTime: Date.now() - startTime,
            requestId,
            backend: true,
            local: true
          }
        });
      } else {
        const errorData = await response.text();
        console.error('Backend local AI error response:', response.status, errorData);
        throw new Error(`Backend local AI returned ${response.status}: ${errorData}`);
      }
    } catch (backendError) {
      console.error('Backend local AI error:', backendError);

      // Parse the backend error to get specific details
      let errorMessage = 'Unknown backend error';
      let statusCode = 500;
      let errorType = 'unknown';

      if (backendError instanceof Error) {
        errorMessage = backendError.message;

        // Detect specific error types from backend response
        if (errorMessage.includes('rate limit exceeded') || errorMessage.includes('429')) {
          statusCode = 429;
          errorType = 'rate_limit';
        } else if (errorMessage.includes('quota exceeded') || errorMessage.includes('403')) {
          statusCode = 403;
          errorType = 'quota_exceeded';
        } else if (errorMessage.includes('401')) {
          statusCode = 401;
          errorType = 'authentication';
        } else if (errorMessage.includes('Ollama not running') || errorMessage.includes('503')) {
          statusCode = 503;
          errorType = 'service_unavailable';
        } else if (errorMessage.includes('model not found') || errorMessage.includes('404')) {
          statusCode = 404;
          errorType = 'model_not_found';
        }
      }

      // Return the actual error instead of masking with fallback
      return NextResponse.json({
        success: false,
        error: errorMessage,
        errorType,
        requestId,
        processingTime: Date.now() - startTime,
        backend: true,
        local: true
      }, { status: statusCode });
    }

  } catch (error) {
    console.error(`Error in local AI chat POST: ${requestId}`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// Local AI response generator (coding focused)
function generateLocalAIResponse(message: string): string {
  const messageLower = message.toLowerCase();

  // Code-related queries - this is a local coding model
  if (messageLower.includes('code') || messageLower.includes('function') || messageLower.includes('debug')) {
    if (messageLower.includes('react')) {
      return `I'll help you with React code! Here's a common pattern:

\`\`\`jsx
import React, { useState, useEffect } from 'react';

const MyComponent = ({ data, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      setLoading(true);
      // Process data here
      setLoading(false);
    }
  }, [data]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Component</h2>
      {/* Your component logic here */}
    </div>
  );
};

export default MyComponent;
\`\`\`

This pattern includes proper state management, error handling, and loading states. What specific React functionality would you like me to help you with?`;
    }

    if (messageLower.includes('javascript') || messageLower.includes('js')) {
      return `Here's a modern JavaScript solution:

\`\`\`javascript
// Modern ES6+ approach
const handleAsyncOperation = async (input) => {
  try {
    const result = await processData(input);
    console.log('Success:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Example usage
handleAsyncOperation('your data here')
  .then(data => console.log('Processed:', data))
  .catch(error => console.error('Failed:', error));
\`\`\`

This uses modern async/await syntax with proper error handling. What specific JavaScript task are you working on?`;
    }

    return `I can help you with coding! Since I'm a specialized coding model, I excel at:

• Code generation and debugging
• Code review and optimization
• Algorithm development
• Data structures and patterns
• Best practices and conventions

Please share the specific code or programming challenge you'd like help with, and I'll provide a detailed solution!`;
  }

  // General responses with coding focus
  if (messageLower.includes('hello') || messageLower.includes('hi')) {
    return "Hello! I'm your local AI coding assistant. I specialize in code generation, debugging, and technical explanations. What coding challenge can I help you with today?";
  }

  if (messageLower.includes('help') || messageLower.includes('what can you do')) {
    return `I'm a specialized local AI coding assistant that can help you with:

**Core Programming:**
• Code generation in multiple languages
• Debugging and error resolution
• Code optimization and refactoring
• Algorithm design and implementation
• Data structure selection and usage

**Web Development:**
• React, Vue, Angular components
• Node.js backend development
• API design and implementation
• Database queries and schemas
• Frontend styling and responsive design

**Best Practices:**
• Code review and suggestions
• Design patterns implementation
• Testing strategies
• Performance optimization
• Security considerations

I run locally on your machine, so your code stays private and I respond quickly. What would you like to work on?`;
  }

  return `I understand you're asking about: "${message}". As a local AI coding assistant, I'm best equipped to help with programming, code, and technical questions.

Could you provide more details about your coding challenge or the specific technical problem you'd like help with? I'll do my best to provide a comprehensive solution!`;
}

// GET /api/local-ai/chat - Get local AI system status
export async function GET(request: NextRequest) {
  try {
    // Test backend local AI connection
    let backendStatus = 'unknown';
    try {
      const backendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/local-ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AI_BACKEND_API_KEY || 'test123'
        },
        body: JSON.stringify({
          message: 'health_check',
          context: { test: true }
        })
      });

      if (response.ok) {
        backendStatus = 'connected';
      } else {
        backendStatus = 'error';
      }
    } catch (error) {
      backendStatus = 'disconnected';
    }

    return NextResponse.json({
      status: 'operational',
      backend: backendStatus,
      type: 'local-ai',
      timestamp: new Date().toISOString(),
      features: {
        codingSpecialty: true,
        privacy: true,
        offlineCapability: true,
        fastResponse: true,
        backendIntegration: backendStatus === 'connected'
      }
    });

  } catch (error) {
    console.error('Error in local AI chat GET:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}