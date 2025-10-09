/**
 * Test script to verify project_id ambiguity fixes
 * Run this script to test the chat message functionality and verify the fixes work
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - update with your project details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test configuration
const TEST_PROJECT_ID = 'test-project-' + Date.now();
const TEST_USER_ID = 'test-user-' + Date.now();

async function runTests() {
  console.log('🧪 Starting Project ID Ambiguity Tests...\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Create a conversation
  console.log('Test 1: Creating conversation...');
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        project_id: TEST_PROJECT_ID,
        title: 'Test Conversation for Project ID Fix',
        created_by: TEST_USER_ID,
        type: 'ai-chat',
        metadata: { type: 'ai-chat' }
      })
      .select(`
        id,
        project_id,
        node_id,
        title,
        created_by,
        created_at,
        updated_at,
        type,
        metadata
      `)
      .single();

    if (error) {
      if (error.message.includes('project_id is ambiguous')) {
        console.error('❌ FAILED: Project ID ambiguity still exists in conversation creation');
        console.error('Error:', error.message);
        testsFailed++;
      } else {
        console.error('❌ FAILED: Other error in conversation creation:', error.message);
        testsFailed++;
      }
      return;
    }

    console.log('✅ PASSED: Conversation created successfully');
    console.log('Conversation ID:', conversation.id);
    testsPassed++;

    // Test 2: Add a message to the conversation
    console.log('\nTest 2: Adding message to conversation...');
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Test message for project ID ambiguity fix',
        metadata: { test: true }
      })
      .select(`
        id,
        conversation_id,
        author_id,
        role,
        content,
        metadata,
        created_at,
        ai_model,
        ai_response_time_ms,
        ai_tokens_used
      `)
      .single();

    if (messageError) {
      if (messageError.message.includes('project_id is ambiguous')) {
        console.error('❌ FAILED: Project ID ambiguity still exists in message creation');
        console.error('Error:', messageError.message);
        testsFailed++;
      } else {
        console.error('❌ FAILED: Other error in message creation:', messageError.message);
        testsFailed++;
      }
    } else {
      console.log('✅ PASSED: Message created successfully');
      console.log('Message ID:', message.id);
      testsPassed++;
    }

    // Test 3: Query conversations with project joins (this is where ambiguity usually occurs)
    console.log('\nTest 3: Querying conversations with project joins...');
    const { data: conversations, error: queryError } = await supabase
      .from('conversations')
      .select(`
        id,
        project_id,
        node_id,
        title,
        created_by,
        created_at,
        updated_at,
        type,
        metadata,
        project:projects(id, name)
      `)
      .eq('project_id', TEST_PROJECT_ID);

    if (queryError) {
      if (queryError.message.includes('project_id is ambiguous')) {
        console.error('❌ FAILED: Project ID ambiguity still exists in conversation query with joins');
        console.error('Error:', queryError.message);
        testsFailed++;
      } else {
        console.error('❌ FAILED: Other error in conversation query:', queryError.message);
        testsFailed++;
      }
    } else {
      console.log('✅ PASSED: Conversations queried successfully with project joins');
      console.log('Found conversations:', conversations.length);
      testsPassed++;
    }

    // Test 4: Query messages with conversation joins
    console.log('\nTest 4: Querying messages with conversation joins...');
    const { data: messages, error: messagesQueryError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        author_id,
        role,
        content,
        metadata,
        created_at,
        ai_model,
        ai_response_time_ms,
        ai_tokens_used,
        conversation:conversations(id, project_id, title)
      `)
      .eq('conversation_id', conversation.id);

    if (messagesQueryError) {
      if (messagesQueryError.message.includes('project_id is ambiguous')) {
        console.error('❌ FAILED: Project ID ambiguity still exists in message query with conversation joins');
        console.error('Error:', messagesQueryError.message);
        testsFailed++;
      } else {
        console.error('❌ FAILED: Other error in message query:', messagesQueryError.message);
        testsFailed++;
      }
    } else {
      console.log('✅ PASSED: Messages queried successfully with conversation joins');
      console.log('Found messages:', messages.length);
      testsPassed++;
    }

    // Cleanup: Delete test data
    console.log('\nCleaning up test data...');
    await supabase.from('messages').delete().eq('conversation_id', conversation.id);
    await supabase.from('conversations').delete().eq('id', conversation.id);
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test suite failed with unexpected error:', error);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log(`📊 Total tests: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Project ID ambiguity has been resolved.');
  } else {
    console.log('\n⚠️  Some tests failed. Project ID ambiguity issues may still exist.');
    console.log('Please review the error messages above and apply additional fixes.');
  }
}

// Run the tests
runTests().catch(console.error);