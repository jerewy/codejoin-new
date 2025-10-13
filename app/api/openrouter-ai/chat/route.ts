import { NextRequest, NextResponse } from 'next/server';

// POST /api/openrouter-ai/chat - OpenRouter AI chat endpoint
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    console.log(`OpenRouter AI chat request started: ${requestId}`);

    const body = await request.json();
    const { message, context, conversationId, projectId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Call the backend OpenRouter API
    try {
      const backendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3001';
      const backendApiKey = process.env.AI_BACKEND_API_KEY || 'test123';

      console.log(`Calling OpenRouter backend API: ${backendUrl}/api/openrouter-ai/chat`);

      const response = await fetch(`${backendUrl}/api/openrouter-ai/chat`, {
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
        console.log(`OpenRouter backend API success for request: ${requestId}`);

        return NextResponse.json({
          success: true,
          response: data.response || data.message,
          metadata: {
            model: data.metadata?.model || 'qwen/qwen3-coder:free',
            provider: data.metadata?.provider || 'OpenRouter',
            tokensUsed: data.metadata?.tokensUsed || data.metadata?.usage?.total_tokens || 0,
            responseTime: Date.now() - startTime,
            requestId,
            backend: true,
            openrouter: true,
            ...(data.metadata?.usage && { tokenUsage: data.metadata.usage }),
            ...(data.metadata?.finishReason && { finishReason: data.metadata.finishReason }),
            ...(data.metadata?.cached !== undefined && { cached: data.metadata.cached })
          }
        });
      } else {
        const errorData = await response.text();
        console.error('OpenRouter backend API error response:', response.status, errorData);
        throw new Error(`OpenRouter backend API returned ${response.status}: ${errorData}`);
      }
    } catch (backendError) {
      console.error('OpenRouter backend API error:', backendError);

      // Return a more specific error for OpenRouter failures
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to OpenRouter AI service',
          details: backendError instanceof Error ? backendError.message : 'Unknown error',
          requestId,
          processingTime: Date.now() - startTime,
          service: 'openrouter'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error(`Error in OpenRouter AI chat POST: ${requestId}`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        processingTime: Date.now() - startTime,
        service: 'openrouter'
      },
      { status: 500 }
    );
  }
}

// GET /api/openrouter-ai/chat - Get OpenRouter AI service status
export async function GET(request: NextRequest) {
  try {
    // Test backend OpenRouter connection
    let backendStatus = 'unknown';
    let backendDetails = null;

    try {
      const backendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/openrouter-ai/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.AI_BACKEND_API_KEY || 'test123'
        }
      });

      if (response.ok) {
        const healthData = await response.json();
        backendStatus = 'connected';
        backendDetails = healthData;
      } else {
        backendStatus = 'error';
      }
    } catch (error) {
      backendStatus = 'disconnected';
      console.error('OpenRouter health check failed:', error);
    }

    return NextResponse.json({
      status: 'operational',
      backend: backendStatus,
      backendDetails,
      timestamp: new Date().toISOString(),
      features: {
        openrouterChat: backendStatus === 'connected',
        backendIntegration: backendStatus === 'connected'
      },
      service: 'openrouter'
    });

  } catch (error) {
    console.error('Error in OpenRouter AI chat GET:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        service: 'openrouter'
      },
      { status: 500 }
    );
  }
}