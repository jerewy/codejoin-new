async function testHuggingFaceAPI() {
  console.log('🧪 Testing Hugging Face API Integration...\n');

  try {
    const hfResponse = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer hf_XXXXXXXX',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant specializing in coding, debugging, and development.'
            },
            {
              role: 'user',
              content: 'Hello\! Can you help me with coding?'
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        })
      }
    );

    console.log('📊 Hugging Face API Status:', hfResponse.status, hfResponse.statusText);

    if (hfResponse.ok) {
      const hfData = await hfResponse.json();
      const aiResponse = hfData.choices[0]?.message?.content || 'No response';
      console.log('✅ Hugging Face API is working\!');
      console.log('📝 AI Response:', aiResponse);
      console.log('🤖 Model:', hfData.model || 'Phi-3-mini-4k-instruct');
      console.log('🔢 Tokens Used:', hfData.usage?.total_tokens || 0);
      return true;
    } else {
      const errorText = await hfResponse.text();
      console.log('❌ Hugging Face API Error:', errorText);
      
      if (hfResponse.status === 401) {
        console.log('💡 Need a valid Hugging Face API key');
        console.log('🔧 Get a free key at: https://huggingface.co/settings/tokens');
      } else if (hfResponse.status === 429) {
        console.log('⏱️ Rate limited - API is busy');
      }
      return false;
    }
  } catch (error) {
    console.log('💥 Network Error:', error.message);
    return false;
  }
}

async function testBackendAPI() {
  console.log('\n🔧 Testing Backend API...\n');

  try {
    const response = await fetch('http://localhost:3001/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test123'
      },
      body: JSON.stringify({
        message: 'Hello\! Can you help me with coding?',
        context: 'test'
      })
    });

    console.log('📊 Backend API Status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend API is responding\!');
      console.log('📝 Response:', data.response.substring(0, 100) + '...');
      console.log('🤖 Provider:', data.metadata?.provider || 'unknown');
      
      if (data.metadata?.provider === 'fallback') {
        console.log('⚠️ Backend is using fallback provider - AI services are down');
        console.log('💡 This explains why you see "currently not available" messages');
      }
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Backend API Error:', errorText);
      return false;
    }
  } catch (error) {
    console.log('💥 Network Error:', error.message);
    console.log('💡 Make sure backend is running on http://localhost:3001');
    return false;
  }
}

async function main() {
  console.log('🚀 AI Connectivity Diagnostic Tool\n');
  console.log('='.repeat(50));

  const hfWorking = await testHuggingFaceAPI();
  const backendWorking = await testBackendAPI();

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY:');
  console.log('  Hugging Face API:', hfWorking ? '✅ Working' : '❌ Not Working');
  console.log('  Backend API:', backendWorking ? '✅ Working' : '❌ Not Working');

  console.log('\n🔧 DIAGNOSIS:');
  if (\!hfWorking && \!backendWorking) {
    console.log('❌ Both APIs are down - Check network and API keys');
  } else if (\!hfWorking && backendWorking) {
    console.log('⚠️ Hugging Face not working, Backend using fallbacks');
    console.log('💡 Set HUGGINGFACE_API_KEY environment variable');
  } else if (hfWorking && \!backendWorking) {
    console.log('✅ Hugging Face working, Backend down');
    console.log('💡 Restart the backend service');
  } else {
    console.log('🎉 Both APIs working - Issue might be authentication');
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. If Hugging Face fails: Get API key from https://huggingface.co/settings/tokens');
  console.log('2. Set environment variable: set HUGGINGFACE_API_KEY=your_key_here');
  console.log('3. Restart services and test again');
  console.log('4. Check frontend authentication in the browser');
}

main().catch(console.error);
