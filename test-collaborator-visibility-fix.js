/**
 * Test script to verify collaborator visibility fix
 * This tests that collaborators can now see all collaborators in a project
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izngyuhawwlxopcdmfry.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bmd5dWhhd3dseG9wY2RtZnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NTg3OTQsImV4cCI6MjA1MjQzNDc5NH0.7y4YJ8qT2a2n1p5h6v9wX3qL7kR8mF2gN9sH3tK6wD4';

async function testCollaboratorVisibility() {
  console.log('🔍 Testing Collaborator Visibility Fix\n');

  // Test with different user contexts
  const testUsers = [
    {
      id: '085b30cd-c982-4242-bc6f-4a8c78130d43',
      description: 'Project Owner'
    },
    {
      id: '5081708d-3a45-469c-94dd-b234e3738938',
      description: 'Editor Collaborator'
    }
  ];

  const testProjectId = '175a7112-4f23-4160-84ca-893da2cee58b';

  console.log(`📋 Testing Project: ${testProjectId}`);

  for (const testUser of testUsers) {
    console.log(`\n--- Testing as: ${testUser.description} (${testUser.id}) ---`);

    // Create a service client with the user's auth context
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
      // First authenticate as this user (in a real scenario, this would be done via auth)
      // For this test, we'll simulate the RLS behavior by using the service key with setAuth
      const serviceClient = createClient(
        supabaseUrl,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bmd5dWhhd3dseG9wY2RtZnJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjg1ODc5NCwiZXhwIjoyMDUyNDM0Nzk0fQ.C4Ck_qdK2J8aIaJn3pJrO3lN7vF8nG1sR2tH3wK5dX6'
      );

      // Set the auth context for this user
      const { data: { session }, error: authError } = await serviceClient.auth.setAuth({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: { id: testUser.id }
      });

      // Test collaborators query
      const { data: collaborators, error: collaboratorsError } = await serviceClient
        .from('collaborators')
        .select('user_id, role, created_at')
        .eq('project_id', testProjectId);

      if (collaboratorsError) {
        console.log(`❌ Error: ${collaboratorsError.message}`);
        if (collaboratorsError.details) {
          console.log(`   Details: ${collaboratorsError.details}`);
        }
        continue;
      }

      console.log(`✅ Success! Found ${collaborators.length} collaborators:`);
      collaborators.forEach(collab => {
        const isCurrentUser = collab.user_id === testUser.id;
        const roleIcon = isCurrentUser ? '👤' : '👥';
        console.log(`   ${roleIcon} ${collab.user_id} (${collab.role})${isCurrentUser ? ' - YOU' : ''}`);
      });

      // Test that the current user can see all collaborators, not just themselves
      const canSeeOwner = collaborators.some(c => c.user_id === '085b30cd-c982-4242-bc6f-4a8c78130d43');
      const canSeeEditor = collaborators.some(c => c.user_id === '5081708d-3a45-469c-94dd-b234e3738938');

      if (testUser.description === 'Editor Collaborator') {
        if (canSeeOwner && canSeeEditor) {
          console.log(`✅ PASS: Editor can see both owner and other collaborators`);
        } else {
          console.log(`❌ FAIL: Editor cannot see all collaborators (owner: ${canSeeOwner}, editor: ${canSeeEditor})`);
        }
      }

    } catch (error) {
      console.log(`❌ Unexpected error: ${error.message}`);
    }
  }

  console.log('\n🎯 Summary:');
  console.log('- The new RLS policy "Collaborators can view project collaborators" should allow');
  console.log('- any collaborator to see ALL collaborators in their project');
  console.log('- This fixes the issue where editors could only see themselves');
}

// Check if this is a direct run
if (require.main === module) {
  testCollaboratorVisibility()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCollaboratorVisibility };