import { NextRequest, NextResponse } from 'next/server';

// POST /api/ai/chat - Simple AI chat endpoint
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    console.log(`AI chat request started: ${requestId}`);

    const body = await request.json();
    const { message, context, conversationId, projectId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Try backend API as primary method
    try {
      const backendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3001';
      const backendApiKey = process.env.AI_BACKEND_API_KEY || 'test123';

      console.log(`Calling backend API: ${backendUrl}/api/ai/chat`);

      const response = await fetch(`${backendUrl}/api/ai/chat`, {
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
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Backend API success for request: ${requestId}`);

        return NextResponse.json({
          success: true,
          response: data.response || data.message,
          metadata: {
            model: data.metadata?.model || 'phi-3-mini',
            provider: data.metadata?.provider || 'Backend AI',
            tokensUsed: data.metadata?.tokensUsed || 0,
            responseTime: Date.now() - startTime,
            requestId,
            backend: true
          }
        });
      } else {
        const errorData = await response.text();
        console.error('Backend API error response:', response.status, errorData);
        throw new Error(`Backend API returned ${response.status}: ${errorData}`);
      }
    } catch (backendError) {
      console.error('Backend API error:', backendError);

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
        } else if (errorMessage.includes('402')) {
          statusCode = 402;
          errorType = 'credits_insufficient';
        } else if (errorMessage.includes('503') || errorMessage.includes('temporarily unavailable')) {
          statusCode = 503;
          errorType = 'service_unavailable';
        }
      }

      // Return the actual error instead of masking with fallback
      return NextResponse.json({
        success: false,
        error: errorMessage,
        errorType,
        requestId,
        processingTime: Date.now() - startTime,
        backend: true
      }, { status: statusCode });
    }

  } catch (error) {
    console.error(`Error in AI chat POST: ${requestId}`, error);
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

// Simple local response generator
function generateLocalResponse(message: string): string {
  const messageLower = message.toLowerCase();

  // Analyze request type
  if (messageLower.includes('hello') || messageLower.includes('hi')) {
    return "Hello! I'm your AI assistant. I'm currently in offline mode, but I can still help you with basic questions about coding, debugging, and general programming concepts. What would you like to know?";
  }

  if (messageLower.includes('error') || messageLower.includes('bug') || messageLower.includes('fix')) {
    return "I can help you debug! While I'm in offline mode, I can suggest common debugging steps:\n\n1. Read error messages carefully\n2. Check recent code changes\n3. Use console.log/print statements\n4. Isolate the problem area\n5. Check for common syntax issues\n\nShare the specific error and code, and I'll provide more targeted help!";
  }

  if (messageLower.includes('help') || messageLower.includes('what can you do')) {
    return "I'm an AI assistant that can help you with:\n\n• Code debugging and problem-solving\n• Programming concept explanations\n• Code review and suggestions\n• Best practices and patterns\n• Learning new technologies\n\nI'm currently in offline mode, so my responses are based on my training data rather than real-time AI processing. But I'm still here to help!";
  }

  return "I understand you're asking about: " + message + ". I'm currently in offline mode, but I can help with basic programming questions, debugging tips, and general guidance. Feel free to ask more specific questions, and I'll do my best to assist you!";
}

// GET /api/ai/chat - Get AI system status
export async function GET(request: NextRequest) {
  try {
    // Test backend connection
    let backendStatus = 'unknown';
    try {
      const backendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.AI_BACKEND_API_KEY || 'test123'
        }
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
      timestamp: new Date().toISOString(),
      features: {
        basicChat: true,
        localFallback: true,
        backendIntegration: backendStatus === 'connected'
      }
    });

  } catch (error) {
    console.error('Error in AI chat GET:', error);
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