// Frontend AI Integration Debug Script
// Run this in the browser console on the AI Assistant page

(async function debugAIIntegration() {
  console.log('🔍 Starting AI Integration Debug...');

  // 1. Check if we're on the right page
  console.log('📍 Current URL:', window.location.href);

  // 2. Check authentication status
  console.log('\n🔐 Authentication Check:');
  try {
    const { getSupabaseClient } = await import('/lib/supabaseClient.js');
    const supabase = getSupabaseClient();

    if (!supabase) {
      console.error('❌ Supabase client not available');
      return;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Session error:', error);
    console.log('Session exists:', !!session);
    console.log('User ID:', session?.user?.id);
    console.log('User email:', session?.user?.email);
    console.log('User metadata:', session?.user?.user_metadata);

    if (!session) {
      console.error('❌ No active session - user not authenticated');
      console.log('💡 Solution: User needs to sign in first');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    return;
  }

  // 3. Test API route directly
  console.log('\n🌐 API Route Test:');
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'test message from debug script',
        context: 'debug test'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const data = await response.json();
    console.log('Response data:', data);

    if (response.status === 401) {
      console.error('❌ API returned 401 Unauthorized');
      console.log('💡 This suggests the server-side auth is failing');
    } else if (data.success === false) {
      console.log('⚠️ API call failed but returned response:', data.error);
      if (data.fallback) {
        console.log('✅ Fallback mode is working');
      }
    } else {
      console.log('✅ API call successful');
    }
  } catch (error) {
    console.error('❌ Error testing API route:', error);
    console.log('💡 This suggests a network or server connectivity issue');
  }

  // 4. Check React component state (if available)
  console.log('\n⚛️ React Component Check:');
  console.log('Checking if React DevTools is available...');

  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools detected');
    // Try to get component tree info
    const fiberRoot = document.querySelector('#__next')._reactRootContainer?._internalRoot?.current;
    if (fiberRoot) {
      console.log('React Fiber root found');
    }
  } else {
    console.log('⚠️ React DevTools not available in this context');
  }

  // 5. Check localStorage for current project
  console.log('\n💾 Local Storage Check:');
  try {
    const currentProjectId = localStorage.getItem('current_project_id');
    console.log('Current project ID:', currentProjectId);

    if (!currentProjectId) {
      console.log('⚠️ No current project ID in localStorage');
      console.log('💡 This might cause "Default Project" warnings');
    }
  } catch (error) {
    console.error('❌ Error reading localStorage:', error);
  }

  // 6. Check environment variables availability
  console.log('\n🔧 Environment Check:');
  console.log('NEXT_PUBLIC_SUPABASE_URL available:', !!process.env?.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Window location origin:', window.location.origin);

  console.log('\n🎯 Debug Complete!');
  console.log('If you see "❌" markers above, those are the issues to fix.');
})();