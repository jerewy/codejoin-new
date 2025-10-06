import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { AIConversationServiceServer } from '@/lib/ai-conversation-service-server';

// POST /api/ai/chat - Send message to AI backend and get response
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, context, conversationId, projectId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Call the code-execution-backend AI service
    try {
      const backendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3001';
      const backendApiKey = process.env.AI_BACKEND_API_KEY;

      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(backendApiKey && { 'X-API-Key': backendApiKey })
        },
        body: JSON.stringify({ message, context })
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (backendError) {
      console.error('Error calling AI backend:', backendError);

      // Check if it's a connection error and provide a helpful fallback
      const isConnectionError = backendError instanceof Error && (
        backendError.message.includes('ECONNREFUSED') ||
        backendError.message.includes('fetch') ||
        backendError.message.includes('network') ||
        backendError.message.includes('timeout')
      );

      if (isConnectionError) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service is currently unavailable',
            details: 'The AI backend could not be reached. Please ensure the code-execution-backend is running on port 3001.',
            fallback: true
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get AI response',
          details: backendError instanceof Error ? backendError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in AI chat POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}