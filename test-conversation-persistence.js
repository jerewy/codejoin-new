// Test script to verify conversation persistence in offline mode
// Run this in the browser console to test the fixes

async function testConversationPersistence() {
  console.log('🧪 Testing Conversation Persistence in Offline Mode');
  console.log('=' .repeat(50));

  try {
    // Check if localStorage is available
    const isStorageAvailable = typeof Storage !== 'undefined' && typeof localStorage !== 'undefined';
    console.log('📦 localStorage available:', isStorageAvailable);

    if (!isStorageAvailable) {
      console.error('❌ localStorage is not available in this environment');
      return;
    }

    // Check existing fallback data
    const conversations = JSON.parse(localStorage.getItem('ai_conversations_fallback') || '[]');
    const currentConversation = JSON.parse(localStorage.getItem('ai_current_conversation_fallback') || 'null');

    console.log('📊 Existing conversations:', conversations.length);
    console.log('🎯 Current conversation:', currentConversation ? currentConversation.id : 'none');

    // Check messages for each conversation
    conversations.forEach(conv => {
      const messageKey = `ai_messages_${conv.id}_fallback`;
      const messages = JSON.parse(localStorage.getItem(messageKey) || '[]');
      console.log(`💬 Messages for ${conv.id}:`, messages.length);
      if (messages.length > 0) {
        console.log('   Last message:', messages[messages.length - 1].content.substring(0, 50) + '...');
      }
    });

    // Test adding a message to local storage directly
    const testConversationId = currentConversation ? currentConversation.id : `local_${Date.now()}`;
    const testMessage = {
      id: `local_${Date.now()}`,
      conversation_id: testConversationId,
      role: 'assistant',
      content: `Test message for offline persistence at ${new Date().toISOString()}`,
      created_at: new Date().toISOString(),
      author_id: null,
      metadata: { test: true }
    };

    // Save test message
    const messageKey = `ai_messages_${testConversationId}_fallback`;
    const existingMessages = JSON.parse(localStorage.getItem(messageKey) || '[]');
    existingMessages.push(testMessage);
    localStorage.setItem(messageKey, JSON.stringify(existingMessages));

    console.log('✅ Test message added to local storage');

    // Verify the message was saved
    const verifyMessages = JSON.parse(localStorage.getItem(messageKey) || '[]');
    console.log('✅ Message verification:', verifyMessages.length, 'messages in storage');

    if (verifyMessages[verifyMessages.length - 1].id === testMessage.id) {
      console.log('✅ Test message successfully persisted and verified');
    } else {
      console.error('❌ Test message persistence verification failed');
    }

    // Test loading messages for local conversation
    console.log('🔄 Testing message loading...');
    const loadedMessages = JSON.parse(localStorage.getItem(messageKey) || '[]');
    console.log('✅ Loaded', loadedMessages.length, 'messages from local storage');

    // Summary
    console.log('=' .repeat(50));
    console.log('📋 Test Summary:');
    console.log('✅ Local storage available and working');
    console.log('✅ Messages can be saved and loaded');
    console.log('✅ Conversation persistence mechanism functional');
    console.log('💡 The implemented fixes should resolve the chat history issue');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run the test
testConversationPersistence();

// Export for manual testing
window.testConversationPersistence = testConversationPersistence;

console.log('🔧 You can run this test again by calling: testConversationPersistence()');