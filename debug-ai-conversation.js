// Debug script to test AI conversation service
const { AIConversationService } = require('./lib/ai-conversation-service.ts');

async function testAIConversationService() {
  console.log('=== Testing AI Conversation Service ===');

  try {
    const service = new AIConversationService();

    // Test 1: Check if service can be instantiated
    console.log('1. Service instantiated successfully');

    // Test 2: Try to add a message with a test conversation
    const testConversationId = 'test-conversation-' + Date.now();
    const testMessage = {
      role: 'user',
      content: 'Test message for debugging',
      metadata: { test: true }
    };

    console.log('2. Attempting to add test message:', {
      conversationId: testConversationId,
      message: testMessage
    });

    const result = await service.addMessage(testConversationId, testMessage);
    console.log('3. Message addition result:', result);

  } catch (error) {
    console.error('ERROR IN TEST:', {
      errorType: typeof error,
      errorIsError: error instanceof Error,
      errorString: String(error),
      errorJson: JSON.stringify(error, null, 2),
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
      stack: error?.stack
    });
  }
}

testAIConversationService();