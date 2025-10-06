// Database investigation script to identify infinite recursion in RLS policies
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
let supabaseUrl, supabaseServiceKey;
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1];
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !supabaseServiceKey) {
      supabaseServiceKey = line.split('=')[1];
    }
  });
} catch (error) {
  console.error('Error reading .env.local file:', error.message);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateDatabase() {
  console.log('🔍 Investigating Supabase database for infinite recursion issue...\n');

  try {
    // 1. List all tables to understand structure
    console.log('📋 Step 1: Listing all tables');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', '_pgcrypto_policy');

    if (tablesError) {
      console.error('❌ Error listing tables:', tablesError);
    } else {
      console.log('✅ Found tables:', tables.map(t => t.table_name).join(', '));
    }

    // 2. Check if collaborators table exists and get its structure
    console.log('\n📋 Step 2: Checking collaborators table structure');
    const { data: collaboratorsColumns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'collaborators')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error getting collaborators table structure:', columnsError);
    } else {
      console.log('✅ Collaborators table structure:');
      collaboratorsColumns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    // 3. Check all RLS policies on the collaborators table
    console.log('\n📋 Step 3: Checking RLS policies on collaborators table');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd, qual')
      .eq('tablename', 'collaborators');

    if (policiesError) {
      console.error('❌ Error fetching RLS policies:', policiesError);
    } else {
      console.log(`✅ Found ${policies?.length || 0} RLS policies on collaborators table:`);
      policies?.forEach(policy => {
        console.log(`\n📄 Policy: ${policy.policyname}`);
        console.log(`   Type: ${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
        console.log(`   Command: ${policy.cmd}`);
        console.log(`   Roles: ${policy.roles}`);
        console.log(`   Expression: ${policy.qual}`);
      });
    }

    // 4. Check if RLS is enabled on collaborators table
    console.log('\n📋 Step 4: Checking RLS status on collaborators table');
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relrowsecurity')
      .eq('relname', 'collaborators')
      .single();

    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError);
    } else {
      console.log(`✅ RLS enabled on collaborators table: ${rlsStatus?.relrowsecurity ? 'YES' : 'NO'}`);
    }

    // 5. Try a simple query to see if we get the infinite recursion error
    console.log('\n📋 Step 5: Testing collaborators table query');
    const { data: testData, error: testError } = await supabase
      .from('collaborators')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error querying collaborators table:', testError);
      if (testError.message?.includes('infinite recursion')) {
        console.log('🚨 CONFIRMED: Infinite recursion detected!');
        console.log('Error details:', testError);
      }
    } else {
      console.log('✅ Simple query successful, no infinite recursion detected');
    }

    // 6. Check for database functions that might be involved
    console.log('\n📋 Step 6: Checking for relevant database functions');
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname, prosrc')
      .ilike('proname', '%collaborator%')
      .or('proname.ilike.%project%,proname.ilike.%access%');

    if (functionsError) {
      console.error('❌ Error checking database functions:', functionsError);
    } else {
      console.log(`✅ Found ${functions?.length || 0} relevant functions:`);
      functions?.forEach(func => {
        console.log(`\n🔧 Function: ${func.proname}`);
        console.log(`   Source: ${func.prosrc?.substring(0, 200)}...`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error during investigation:', error);
  }
}

// Run the investigation
investigateDatabase().then(() => {
  console.log('\n🎯 Investigation complete!');
}).catch(error => {
  console.error('❌ Investigation failed:', error);
});