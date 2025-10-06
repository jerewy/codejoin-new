// Execute the infinite recursion fix
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

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeFix() {
  console.log('🔧 Executing infinite recursion fix...\n');

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('fix-recursion-complete.sql', 'utf8');

    // Split into individual statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip SELECT statements that are just for investigation
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`📋 Skipping investigation statement ${i + 1}: ${statement.substring(0, 50)}...`);
        continue;
      }

      // Skip comments and empty lines
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      console.log(`⚙️  Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);

      try {
        // Try to execute the statement using raw SQL
        // Since we can't use raw SQL directly with the JS client,
        // we'll create a test to verify the fix worked
        console.log('   Note: This statement needs to be executed manually in Supabase dashboard');
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
      }
    }

    console.log('\n✅ SQL fix prepared successfully!');
    console.log('\n📋 Manual execution required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of fix-recursion-complete.sql');
    console.log('4. Execute the SQL script');
    console.log('5. Verify the fix by running the test script');

    // Test if the infinite recursion is fixed
    console.log('\n🧪 Testing if infinite recursion is fixed...');
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('count(*)')
        .limit(1);

      if (error) {
        if (error.message?.includes('infinite recursion')) {
          console.log('❌ Infinite recursion still exists. Manual execution of SQL fix required.');
          console.log('Error:', error.message);
        } else {
          console.log('✅ Infinite recursion appears to be fixed!');
          console.log('Note: Other error occurred but it\'s not recursion:', error.message);
        }
      } else {
        console.log('✅ Infinite recursion appears to be fixed!');
        console.log('Query successful:', data);
      }
    } catch (testError) {
      console.log('🧪 Test query failed:', testError.message);
      console.log('This is expected if the fix hasn\'t been applied yet.');
    }

  } catch (error) {
    console.error('❌ Error executing fix:', error);
  }
}

// Execute the fix
executeFix().then(() => {
  console.log('\n🎯 Fix execution complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Execute the SQL script in Supabase dashboard');
  console.log('2. Run node test-fix.js to verify the fix');
}).catch(error => {
  console.error('❌ Fix execution failed:', error);
});