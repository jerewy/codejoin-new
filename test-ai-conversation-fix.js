/**
 * Test script to validate AI conversation fixes
 * Run this in the browser console to test the conversation creation flow
 */

async function testConversationFix() {
  console.log('=== Testing AI Conversation Fix ===');

  // Test 1: Check if we can access the AI conversation service
  try {
    console.log('\n1. Testing AI Conversation Service...');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }

    if (!user) {
      console.error('❌ No authenticated user found');
      return;
    }

    console.log('✅ Authenticated user:', user.id);

    // Test project access validation
    const testProjectId = localStorage.getItem('current_project_id') || 'default-project';
    console.log('📋 Using project ID:', testProjectId);

    // Test database connection
    console.log('\n2. Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);

    if (connectionError) {
      console.error('❌ Database connection error:', connectionError);
      console.log('🔄 Will use local storage fallback');
    } else {
      console.log('✅ Database connection successful');
    }

    // Test conversation creation
    console.log('\n3. Testing conversation creation...');

    const conversationData = {
      project_id: testProjectId,
      title: 'Test Conversation',
      created_by: user.id,
      type: 'ai-chat',
      metadata: { type: 'ai-chat', auto_generated: false }
    };

    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Conversation creation error:', {
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint
      });

      // Check if it's a permission error
      if (createError.code === '42501' || createError.message.includes('permission')) {
        console.log('🔍 Permission denied - checking project access...');

        // Check if user is project owner
        const { data: projectCheck } = await supabase
          .from('projects')
          .select('id, user_id, admin_ids')
          .eq('id', testProjectId)
          .single();

        if (projectCheck) {
          console.log('📋 Project details:', {
            projectId: projectCheck.id,
            owner: projectCheck.user_id,
            userIsOwner: projectCheck.user_id === user.id,
            admins: projectCheck.admin_ids,
            userIsAdmin: projectCheck.admin_ids?.includes(user.id)
          });

          // Check collaborator access
          const { data: collabCheck } = await supabase
            .from('collaborators')
            .select('user_id, role')
            .eq('project_id', testProjectId)
            .eq('user_id', user.id)
            .single();

          if (collabCheck) {
            console.log('👥 Collaborator access:', collabCheck);
          } else {
            console.log('❌ No collaborator access found');
          }
        }
      }
    } else {
      console.log('✅ Conversation created successfully:', newConversation);

      // Test message creation
      console.log('\n4. Testing message creation...');

      const messageData = {
        conversation_id: newConversation.id,
        role: 'user',
        content: 'Test message from conversation fix test',
        author_id: user.id,
        metadata: { test: true }
      };

      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        console.error('❌ Message creation error:', {
          message: messageError.message,
          code: messageError.code,
          details: messageError.details
        });
      } else {
        console.log('✅ Message created successfully:', newMessage);
      }

      // Clean up test data
      console.log('\n5. Cleaning up test data...');

      const { error: deleteMessageError } = await supabase
        .from('messages')
        .delete()
        .eq('id', newMessage.id);

      if (deleteMessageError) {
        console.error('❌ Error deleting test message:', deleteMessageError);
      } else {
        console.log('✅ Test message deleted');
      }

      const { error: deleteConversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', newConversation.id);

      if (deleteConversationError) {
        console.error('❌ Error deleting test conversation:', deleteConversationError);
      } else {
        console.log('✅ Test conversation deleted');
      }
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error);
  }
}

// Make the test function available globally
window.testConversationFix = testConversationFix;

console.log('🧪 AI Conversation Test loaded. Run testConversationFix() to test the fixes.');