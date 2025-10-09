import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { AIConversationServiceServer } from '@/lib/ai-conversation-service-server';
import { errorHandler, DatabaseError, ValidationError, AuthorizationError } from '@/lib/enhanced-error-handler';

// Enhanced error context helper
function createErrorContext(request: NextRequest, additional?: {
  projectId?: string;
  conversationId?: string;
}) {
  return {
    requestId: crypto.randomUUID(),
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
    ...additional
  };
}

// GET /api/ai/conversations - Get AI conversations for a project
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = errorHandler.handleAuthorizationError(
        'Authentication failed',
        createErrorContext(request, { userId: user?.id })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const conversationId = searchParams.get('conversationId');
    const includeMessages = searchParams.get('includeMessages') === 'true';

    // Validate required parameters
    if (!projectId && !conversationId) {
      const error = errorHandler.handleValidationError(
        'Either projectId or conversationId is required',
        { provided: { projectId, conversationId } },
        createErrorContext(request, { userId: user.id })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    const aiConversationService = new AIConversationServiceServer();

    if (conversationId) {
      // Get specific conversation
      try {
        const conversation = await aiConversationService.getConversation(
          conversationId,
          includeMessages
        );

        if (!conversation) {
          const error = errorHandler.handleNotFoundError(
            'Conversation',
            createErrorContext(request, {
              userId: user.id,
              conversationId
            })
          );

          return NextResponse.json(
            errorHandler.createErrorResponse(error),
            { status: error.statusCode }
          );
        }

        // Verify user has access to this conversation through project
        if (conversation.project_id) {
          const { data: projectAccess, error: accessError } = await supabase
            .from('projects')
            .select('id')
            .or(`user_id.eq.${user.id},admin_ids.cs.{${user.id}}`)
            .eq('id', conversation.project_id)
            .single();

          if (accessError || !projectAccess) {
            const error = errorHandler.handleAuthorizationError(
              'No access to conversation project',
              createErrorContext(request, {
                userId: user.id,
                conversationId,
                projectId: conversation.project_id
              }),
              'You do not have access to this conversation'
            );

            return NextResponse.json(
              errorHandler.createErrorResponse(error),
              { status: error.statusCode }
            );
          }
        }

        return NextResponse.json({ conversation });
      } catch (error) {
        const detailedError = errorHandler.handleSupabaseError(
          error,
          'getConversation',
          createErrorContext(request, {
            userId: user.id,
            conversationId
          })
        );

        return NextResponse.json(
          errorHandler.createErrorResponse(detailedError),
          { status: detailedError.statusCode }
        );
      }
    }

    if (!projectId) {
      const error = errorHandler.handleValidationError(
        'Project ID is required when not fetching specific conversation',
        {},
        createErrorContext(request, { userId: user.id })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // Verify user has access to this project
    const { data: projectAccess, error: accessError } = await supabase
      .from('projects')
      .select('id')
      .or(`user_id.eq.${user.id},admin_ids.cs.{${user.id}}`)
      .eq('id', projectId)
      .single();

    if (accessError || !projectAccess) {
      const error = errorHandler.handleAuthorizationError(
        'No access to project',
        createErrorContext(request, {
          userId: user.id,
          projectId
        }),
        'You do not have access to conversations in this project'
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    try {
      // Get project conversations
      const conversations = await aiConversationService.getProjectConversations(projectId);

      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development' || duration > 1000) {
        console.log(`[Performance] GET conversations: ${duration}ms (${conversations.length} records)`);
      }

      return NextResponse.json({ conversations });
    } catch (error) {
      const detailedError = errorHandler.handleSupabaseError(
        error,
        'getProjectConversations',
        createErrorContext(request, {
          userId: user.id,
          projectId
        })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(detailedError),
        { status: detailedError.statusCode }
      );
    }
  } catch (error) {
    console.error('Unexpected error in AI conversations GET:', error);

    const detailedError = errorHandler.handleSupabaseError(
      error,
      'GET_conversations',
      createErrorContext(request)
    );

    return NextResponse.json(
      errorHandler.createErrorResponse(detailedError),
      { status: detailedError.statusCode || 500 }
    );
  }
}

// POST /api/ai/conversations - Create new AI conversation
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = errorHandler.handleAuthorizationError(
        'Authentication failed',
        createErrorContext(request, { userId: user?.id })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    const body = await request.json();
    const { projectId, title } = body;

    // Validate required fields
    if (!projectId) {
      const error = errorHandler.handleValidationError(
        'Project ID is required',
        { provided: { projectId, title } },
        createErrorContext(request, { userId: user.id })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // Verify user has access to this project
    const { data: projectAccess, error: accessError } = await supabase
      .from('projects')
      .select('id, name')
      .or(`user_id.eq.${user.id},admin_ids.cs.{${user.id}}`)
      .eq('id', projectId)
      .single();

    if (accessError || !projectAccess) {
      const error = errorHandler.handleAuthorizationError(
        'No access to project',
        createErrorContext(request, {
          userId: user.id,
          projectId
        }),
        'You do not have permission to create conversations in this project'
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    const aiConversationService = new AIConversationServiceServer();

    try {
      const conversation = await aiConversationService.createConversation(
        projectId,
        user.id,
        title || `AI Chat - ${projectAccess.name}`
      );

      if (!conversation) {
        const error = errorHandler.handleSupabaseError(
          { message: 'Failed to create conversation', code: 'CREATE_FAILED' },
          'createConversation',
          createErrorContext(request, {
            userId: user.id,
            projectId
          })
        );

        return NextResponse.json(
          errorHandler.createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development' || duration > 1000) {
        console.log(`[Performance] POST conversation: ${duration}ms`);
      }

      return NextResponse.json({ conversation }, { status: 201 });
    } catch (error) {
      const detailedError = errorHandler.handleSupabaseError(
        error,
        'createConversation',
        createErrorContext(request, {
          userId: user.id,
          projectId
        })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(detailedError),
        { status: detailedError.statusCode }
      );
    }
  } catch (error) {
    console.error('Unexpected error in AI conversations POST:', error);

    const detailedError = errorHandler.handleSupabaseError(
      error,
      'POST_conversations',
      createErrorContext(request)
    );

    return NextResponse.json(
      errorHandler.createErrorResponse(detailedError),
      { status: detailedError.statusCode || 500 }
    );
  }
}

// DELETE /api/ai/conversations - Delete AI conversation
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = errorHandler.handleAuthorizationError(
        'Authentication failed',
        createErrorContext(request, { userId: user?.id })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      const error = errorHandler.handleValidationError(
        'Conversation ID is required',
        {},
        createErrorContext(request, { userId: user.id })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // First get the conversation to check project access
    const aiConversationService = new AIConversationServiceServer();

    try {
      const conversation = await aiConversationService.getConversation(conversationId, false);

      if (!conversation) {
        const error = errorHandler.handleNotFoundError(
          'Conversation',
          createErrorContext(request, {
            userId: user.id,
            conversationId
          })
        );

        return NextResponse.json(
          errorHandler.createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      // Verify user has access to the conversation's project
      if (conversation.project_id) {
        const { data: projectAccess, error: accessError } = await supabase
          .from('projects')
          .select('id')
          .or(`user_id.eq.${user.id},admin_ids.cs.{${user.id}}`)
          .eq('id', conversation.project_id)
          .single();

        if (accessError || !projectAccess) {
          const error = errorHandler.handleAuthorizationError(
            'No access to conversation project',
            createErrorContext(request, {
              userId: user.id,
              conversationId,
              projectId: conversation.project_id
            }),
            'You do not have permission to delete this conversation'
          );

          return NextResponse.json(
            errorHandler.createErrorResponse(error),
            { status: error.statusCode }
          );
        }
      }

      const success = await aiConversationService.deleteConversation(conversationId);

      if (!success) {
        const error = errorHandler.handleSupabaseError(
          { message: 'Failed to delete conversation', code: 'DELETE_FAILED' },
          'deleteConversation',
          createErrorContext(request, {
            userId: user.id,
            conversationId
          })
        );

        return NextResponse.json(
          errorHandler.createErrorResponse(error),
          { status: error.statusCode }
        );
      }

      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development' || duration > 1000) {
        console.log(`[Performance] DELETE conversation: ${duration}ms`);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      const detailedError = errorHandler.handleSupabaseError(
        error,
        'deleteConversation',
        createErrorContext(request, {
          userId: user.id,
          conversationId
        })
      );

      return NextResponse.json(
        errorHandler.createErrorResponse(detailedError),
        { status: detailedError.statusCode }
      );
    }
  } catch (error) {
    console.error('Unexpected error in AI conversations DELETE:', error);

    const detailedError = errorHandler.handleSupabaseError(
      error,
      'DELETE_conversations',
      createErrorContext(request)
    );

    return NextResponse.json(
      errorHandler.createErrorResponse(detailedError),
      { status: detailedError.statusCode || 500 }
    );
  }
}