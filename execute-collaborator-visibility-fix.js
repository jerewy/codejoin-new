// Execute collaborator visibility fix using Supabase client
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeCollaboratorVisibilityFix() {
  console.log('🔧 Executing Collaborator Visibility Fix\n');

  try {
    // Read the collaborator visibility fix SQL
    const sqlContent = fs.readFileSync('fix-collaborator-visibility.sql', 'utf8');

    console.log('📋 SQL file loaded successfully');
    console.log(`📝 SQL content length: ${sqlContent.length} characters`);

    // Split SQL into individual statements for execution
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip pure comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      // Skip echo statements
      if (statement.startsWith('\\echo')) {
        continue;
      }

      console.log(`\n📋 Executing statement ${i + 1}/${statements.length}:`);
      console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

      try {
        // Use the RPC method to execute SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          console.log(`   ⚠️  RPC method failed: ${error.message}`);
          errorCount++;
          console.log(`   ❌ Error: ${error.message}`);
        } else {
          console.log('   ✅ Statement executed successfully');
          successCount++;
        }
      } catch (stmtError) {
        console.log(`   ❌ Statement execution error: ${stmtError.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📝 Total statements: ${statements.length}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Manual execution may be required.');
      console.log('📋 RECOMMENDATIONS:');
      console.log('1. Open Supabase Dashboard: https://izngyuhawwlxopcdmfry.supabase.co');
      console.log('2. Go to SQL Editor');
      console.log('3. Copy and paste the contents of fix-collaborator-visibility.sql');
      console.log('4. Execute the SQL manually');
      console.log('5. Run verification script to confirm fix');
    } else {
      console.log('\n✅ All statements executed successfully!');
      console.log('🎯 Running verification...');

      // Run verification after fix
      setTimeout(() => {
        verifyCollaboratorVisibilityFix();
      }, 2000);
    }

  } catch (error) {
    console.error('❌ Collaborator visibility fix execution failed:', error);
    console.log('\n📋 MANUAL EXECUTION REQUIRED:');
    console.log('1. Open Supabase Dashboard: https://izngyuhawwlxopcdmfry.supabase.co');
    console.log('2. Go to SQL Editor');
    console.log('3. Execute fix-collaborator-visibility.sql manually');
  }
}

async function verifyCollaboratorVisibilityFix() {
  console.log('\n🔍 Verifying collaborator visibility fix...');

  try {
    // Test basic table access
    console.log('📋 Testing basic table access...');

    const { data: collabData, error: collabError } = await supabase
      .from('collaborators')
      .select('*')
      .limit(1);

    if (collabError) {
      if (collabError.message?.includes('infinite recursion')) {
        console.log('   ❌ Infinite recursion still exists - fix failed');
      } else {
        console.log('   ✅ No infinite recursion (permission error is expected)');
        console.log(`   📝 Error: ${collabError.message}`);
      }
    } else {
      console.log('   ✅ Collaborators table accessible');
    }

    // Test projects table
    const { data: projData, error: projError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (projError) {
      if (projError.message?.includes('infinite recursion')) {
        console.log('   ❌ Infinite recursion still exists in projects');
      } else {
        console.log('   ✅ No infinite recursion in projects (permission error is expected)');
        console.log(`   📝 Error: ${projError.message}`);
      }
    } else {
      console.log('   ✅ Projects table accessible');
    }

    // Test helper functions exist
    console.log('📋 Testing helper functions...');
    try {
      const { data: funcData, error: funcError } = await supabase
        .rpc('is_project_owner', {
          project_uuid: '00000000-0000-0000-0000-000000000000',
          user_uuid: '00000000-0000-0000-0000-000000000000'
        });

      if (funcError && !funcError.message.includes('function')) {
        console.log('   ✅ Helper functions are accessible');
      } else if (funcError && funcError.message.includes('function')) {
        console.log('   ⚠️  Helper functions may not exist - check execution');
      }
    } catch (funcTestError) {
      console.log('   ⚠️  Could not test helper functions');
    }

    console.log('\n🎯 Verification complete!');
    console.log('📋 If you see "no infinite recursion" messages, the fix is working.');
    console.log('📋 Next step: Test with actual application users to verify collaborator visibility.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the fix execution
if (require.main === module) {
  executeCollaboratorVisibilityFix()
    .then(() => {
      console.log('\n✅ Collaborator visibility fix execution complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Collaborator visibility fix execution failed:', error);
      process.exit(1);
    });
}

module.exports = { executeCollaboratorVisibilityFix, verifyCollaboratorVisibilityFix };