// Test script for AI conversation API endpoints
const fetch = require('node-fetch');

async function testConversationAPI() {
  const API_BASE = 'http://localhost:3000/api/ai';

  console.log('Testing AI Conversation API...\n');

  // Test 1: Create conversation (this should work now)
  console.log('1. Testing conversation creation...');
  try {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: 'test-project-id',
        title: 'Test Conversation'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.conversation) {
      console.log('✅ Conversation creation successful!');
      const conversationId = data.conversation.id;

      // Test 2: Get conversation
      console.log('\n2. Testing conversation retrieval...');
      const getResponse = await fetch(`${API_BASE}/conversations?conversationId=${conversationId}`);
      const getData = await getResponse.json();
      console.log('Status:', getResponse.status);
      console.log('Response:', JSON.stringify(getData, null, 2));

      // Test 3: Get project conversations
      console.log('\n3. Testing project conversations retrieval...');
      const projectResponse = await fetch(`${API_BASE}/conversations?projectId=test-project-id`);
      const projectData = await projectResponse.json();
      console.log('Status:', projectResponse.status);
      console.log('Response:', JSON.stringify(projectData, null, 2));

      // Test 4: Add message
      console.log('\n4. Testing message addition...');
      const messageResponse = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversationId,
          role: 'user',
          content: 'Hello, this is a test message!'
        })
      });

      const messageData = await messageResponse.json();
      console.log('Status:', messageResponse.status);
      console.log('Response:', JSON.stringify(messageData, null, 2));

      // Test 5: Chat endpoint
      console.log('\n5. Testing chat endpoint...');
      const chatResponse = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello AI!',
          context: 'Current file: test.js\nLanguage: javascript'
        })
      });

      const chatData = await chatResponse.json();
      console.log('Status:', chatResponse.status);
      console.log('Response:', JSON.stringify(chatData, null, 2));

    } else {
      console.log('❌ Conversation creation failed');
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run the test
testConversationAPI();