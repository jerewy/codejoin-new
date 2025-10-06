// Debug script to identify the exact conversation creation issue
// This simulates what happens when a user tries to start an AI conversation

console.log('=== AI Conversation Creation Debug ===\n');

// Test different scenarios to identify the issue

async function testClientSideConversationCreation() {
  console.log('1. Testing Client-Side Conversation Service...');

  try {
    // Import the client-side service
    const { aiConversationService } = require('./lib/ai-conversation-service.ts');

    // Test parameters (these would come from the frontend)
    const testProjectId = '36a3cbf4-53f1-4343-bf24-b98c7bedfc59'; // Existing project
    const testUserId = 'test-user-id';
    const testTitle = 'Debug AI Chat';

    console.log('Creating conversation with:');
    console.log('- Project ID:', testProjectId);
    console.log('- User ID:', testUserId);
    console.log('- Title:', testTitle);

    const conversation = await aiConversationService.createConversation(
      testProjectId,
      testUserId,
      testTitle
    );

    if (conversation) {
      console.log('✅ Client-side conversation creation successful!');
      console.log('Conversation:', JSON.stringify(conversation, null, 2));
    } else {
      console.log('❌ Client-side conversation creation failed');
    }

  } catch (error) {
    console.error('❌ Client-side error:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testAPISideConversationCreation() {
  console.log('\n2. Testing API-Side Conversation Creation...');

  try {
    const response = await fetch('http://localhost:3000/api/ai/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: '36a3cbf4-53f1-4343-bf24-b98c7bedfc59',
        title: 'Debug API Chat'
      })
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('API Response Body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ API-side conversation creation successful!');
    } else {
      console.log('❌ API-side conversation creation failed');
    }

  } catch (error) {
    console.error('❌ API-side error:', error.message);
  }
}

async function testSupabaseDirectInsert() {
  console.log('\n3. Testing Direct Supabase Insert...');

  try {
    // This tests if there's an issue with the database insert itself
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const testConversation = {
      project_id: '36a3cbf4-53f1-4343-bf24-b98c7bedfc59',
      title: 'Direct Supabase Test',
      created_by: 'test-user-id',
      type: 'ai-chat',
      metadata: { type: 'ai-chat', test: true }
    };

    console.log('Inserting directly via Supabase client...');
    console.log('Data:', testConversation);

    const { data, error } = await supabase
      .from('conversations')
      .insert(testConversation)
      .select()
      .single();

    if (error) {
      console.error('❌ Direct Supabase insert failed:');
      console.error('Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Direct Supabase insert successful!');
      console.log('Inserted data:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Direct Supabase error:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testAuthentication() {
  console.log('\n4. Testing Authentication...');

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Check current authentication status
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.log('❌ No authenticated user:', error.message);
      console.log('This might be the issue - conversation creation requires authentication');
    } else if (user) {
      console.log('✅ Authenticated user:', user.id);
      console.log('User email:', user.email);
    } else {
      console.log('❌ No user session found');
    }

  } catch (error) {
    console.error('❌ Authentication test error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testAuthentication();
  await testSupabaseDirectInsert();
  await testClientSideConversationCreation();
  await testAPISideConversationCreation();

  console.log('\n=== Debug Complete ===');
  console.log('If all tests fail, the issue is likely authentication-related.');
  console.log('If some tests pass, look at the specific failure points.');
}

// Run the tests
runAllTests().catch(console.error);