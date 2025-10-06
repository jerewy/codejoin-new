import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { AIConversationServiceServer } from '@/lib/ai-conversation-service-server';

// POST /api/ai/messages - Add message to AI conversation
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
    const { conversationId, role, content, aiModel, responseTimeMs, tokensUsed } = body;

    if (!conversationId || !role || !content) {
      return NextResponse.json(
        { error: 'Conversation ID, role, and content are required' },
        { status: 400 }
      );
    }

    const aiConversationService = new AIConversationServiceServer();

    // Verify user has access to this conversation
    const conversation = await aiConversationService.getConversation(conversationId, false);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Add the message
    const message = await aiConversationService.addMessage(conversationId, {
      role,
      content,
      author_id: user.id,
      ai_model: aiModel,
      ai_response_time_ms: responseTimeMs,
      ai_tokens_used: tokensUsed,
      metadata: {}
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error in AI messages POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/ai/messages - Get messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const aiConversationService = new AIConversationServiceServer();

    // Verify user has access to this conversation
    const conversation = await aiConversationService.getConversation(conversationId, false);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get conversation with messages
    const fullConversation = await aiConversationService.getConversation(
      conversationId,
      true
    );

    if (!fullConversation) {
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversation: fullConversation,
      messages: fullConversation.messages || []
    });
  } catch (error) {
    console.error('Error in AI messages GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}