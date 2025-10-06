// Test script to verify collaborator access fix
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCollaboratorAccess() {
    console.log('Testing Collaborator Access Fix');
    console.log('=================================');

    try {
        // Test 1: Sign in as the collaborator user
        console.log('\n1. Testing authentication as collaborator...');

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'rajaiblisai12@gmail.com',
            password: 'testpassword123' // You'll need to use the actual password
        });

        if (signInError) {
            console.log('❌ Sign in failed:', signInError.message);
            console.log('Note: This is expected if we don\'t have the correct password');
            console.log('Proceeding with token-based test...');
        } else {
            console.log('✅ Successfully signed in as collaborator');
        }

        // Test 2: Try to get projects using the RPC function
        console.log('\n2. Testing get_projects_for_user RPC function...');

        const { data: projectsData, error: projectsError } = await supabase.rpc('get_projects_for_user');

        if (projectsError) {
            console.log('❌ RPC function failed:', projectsError.message);
            console.log('Details:', projectsError);
        } else {
            console.log('✅ RPC function succeeded');
            console.log(`Found ${projectsData.length} projects`);

            if (projectsData.length > 0) {
                console.log('Projects accessible to collaborator:');
                projectsData.forEach(project => {
                    console.log(`  - ${project.name} (ID: ${project.id})`);
                });
            } else {
                console.log('⚠️  No projects found - this indicates the collaborator access issue still exists');
            }
        }

        // Test 3: Check collaborators table access
        console.log('\n3. Testing collaborators table access...');

        const { data: collaboratorsData, error: collaboratorsError } = await supabase
            .from('collaborators')
            .select('*');

        if (collaboratorsError) {
            console.log('❌ Collaborators table access failed:', collaboratorsError.message);
        } else {
            console.log('✅ Collaborators table access succeeded');
            console.log(`Found ${collaboratorsData.length} collaboration records`);

            collaboratorsData.forEach(collab => {
                console.log(`  - Project: ${collab.project_id}, Role: ${collab.role}`);
            });
        }

        // Test 4: Check direct projects table access
        console.log('\n4. Testing projects table access...');

        const { data: directProjectsData, error: directProjectsError } = await supabase
            .from('projects')
            .select('id, name, user_id');

        if (directProjectsError) {
            console.log('❌ Direct projects table access failed:', directProjectsError.message);
        } else {
            console.log('✅ Direct projects table access succeeded');
            console.log(`Found ${directProjectsData.length} projects directly`);

            directProjectsData.forEach(project => {
                console.log(`  - ${project.name} (Owner: ${project.user_id})`);
            });
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Alternative test using service role key (bypasses RLS for verification)
async function testWithServiceRole() {
    console.log('\n\nService Role Verification (Bypasses RLS)');
    console.log('===========================================');

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
        console.log('⚠️  No service role key available, skipping verification');
        return;
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

    try {
        // Verify collaborator records exist
        console.log('\n1. Verifying collaborator records exist...');
        const { data: collabData, error: collabError } = await serviceSupabase
            .from('collaborators')
            .select('*')
            .eq('user_id', '5081708d-3a45-469c-94dd-b234e3738938');

        if (collabError) {
            console.log('❌ Service role query failed:', collabError.message);
        } else {
            console.log('✅ Collaborator records verified:');
            collabData.forEach(collab => {
                console.log(`  - Project ID: ${collab.project_id}, Role: ${collab.role}`);
            });
        }

        // Check what projects should be accessible
        console.log('\n2. Checking project details...');
        const { data: projectData, error: projectError } = await serviceSupabase
            .from('projects')
            .select('id, name, user_id')
            .in('id', collabData.map(c => c.project_id));

        if (projectError) {
            console.log('❌ Project query failed:', projectError.message);
        } else {
            console.log('✅ Project details verified:');
            projectData.forEach(project => {
                console.log(`  - ${project.name} (ID: ${project.id}, Owner: ${project.user_id})`);
            });
        }

        // Test the RPC function with service role
        console.log('\n3. Testing RPC function with service role...');

        // Temporarily set auth context for the test
        const { data: rpcData, error: rpcError } = await serviceSupabase.rpc('get_projects_for_user');

        if (rpcError) {
            console.log('❌ Service role RPC failed:', rpcError.message);
        } else {
            console.log('✅ Service role RPC succeeded');
            console.log(`RPC returned ${rpcData.length} projects`);
        }

    } catch (error) {
        console.error('❌ Service role test failed:', error);
    }
}

async function main() {
    await testCollaboratorAccess();
    await testWithServiceRole();

    console.log('\n\nSummary');
    console.log('=======');
    console.log('If the RPC function returns projects for the collaborator user, the issue is FIXED.');
    console.log('If it returns 0 projects, there may still be RLS policy issues to resolve.');
}

main().catch(console.error);