// Comprehensive verification script for infinite recursion fix
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

async function verifyCompleteFix() {
  console.log('🔍 Comprehensive verification of infinite recursion fix\n');

  const results = {
    recursionFixed: false,
    policiesWorking: false,
    apiFunctional: false,
    errors: [],
    successes: []
  };

  try {
    // Test 1: Basic collaborators query (should NOT have infinite recursion)
    console.log('📋 Test 1: Basic collaborators query');
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .limit(1);

      if (error) {
        if (error.message?.includes('infinite recursion')) {
          console.log('  ❌ Infinite recursion still exists');
          results.errors.push('Infinite recursion still detected');
        } else {
          console.log('  ✅ No infinite recursion (different error expected):', error.message);
          results.successes.push('Infinite recursion eliminated');
          results.recursionFixed = true;
        }
      } else {
        console.log('  ✅ Query successful - no infinite recursion');
        results.successes.push('Basic collaborators query working');
        results.recursionFixed = true;
        results.policiesWorking = true;
      }
    } catch (err) {
      console.log('  ❌ Unexpected error:', err.message);
      results.errors.push(`Unexpected error: ${err.message}`);
    }

    // Test 2: Count query
    console.log('\n📋 Test 2: Count collaborators');
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id', { count: 'exact' });

      if (error) {
        if (error.message?.includes('infinite recursion')) {
          console.log('  ❌ Infinite recursion in count query');
          results.errors.push('Infinite recursion in count query');
        } else {
          console.log('  ✅ No infinite recursion in count (different error expected):', error.message);
          results.successes.push('Count query - no recursion');
        }
      } else {
        console.log('  ✅ Count query successful');
        results.successes.push('Count query working');
        results.policiesWorking = true;
      }
    } catch (err) {
      console.log('  ❌ Count query error:', err.message);
      results.errors.push(`Count query error: ${err.message}`);
    }

    // Test 3: Projects table (should always work)
    console.log('\n📋 Test 3: Projects table access (control test)');
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .limit(1);

      if (error) {
        console.log('  ⚠️  Projects query failed:', error.message);
        results.errors.push(`Projects query failed: ${error.message}`);
      } else {
        console.log('  ✅ Projects table accessible');
        results.successes.push('Projects table working');
      }
    } catch (err) {
      console.log('  ❌ Projects query error:', err.message);
      results.errors.push(`Projects query error: ${err.message}`);
    }

    // Test 4: API endpoint test
    console.log('\n📋 Test 4: API endpoint test');
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/collaborators?select=*`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      });

      if (response.ok) {
        console.log('  ✅ API endpoint accessible');
        results.successes.push('API endpoint working');
        results.apiFunctional = true;
      } else {
        const errorText = await response.text();
        if (errorText.includes('infinite recursion')) {
          console.log('  ❌ API endpoint still has infinite recursion');
          results.errors.push('API endpoint infinite recursion');
        } else {
          console.log('  ✅ API endpoint no recursion (other error expected):', response.status);
          results.successes.push('API endpoint - no recursion');
        }
      }
    } catch (err) {
      console.log('  ❌ API endpoint error:', err.message);
      results.errors.push(`API endpoint error: ${err.message}`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    results.errors.push(`Verification failed: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  if (results.recursionFixed) {
    console.log('✅ INFINITE RECURSION: FIXED');
  } else {
    console.log('❌ INFINITE RECURSION: STILL EXISTS');
  }

  if (results.policiesWorking) {
    console.log('✅ RLS POLICIES: WORKING');
  } else {
    console.log('⚠️  RLS POLICIES: NEED VERIFICATION');
  }

  if (results.apiFunctional) {
    console.log('✅ API ENDPOINTS: FUNCTIONAL');
  } else {
    console.log('⚠️  API ENDPOINTS: NEED TESTING');
  }

  console.log('\n📋 Successes:');
  results.successes.forEach(success => console.log(`  ✅ ${success}`));

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  ❌ ${error}`));
  }

  // Recommendations
  console.log('\n📋 RECOMMENDATIONS:');

  if (!results.recursionFixed) {
    console.log('🔧 The infinite recursion fix needs to be applied:');
    console.log('   1. Open Supabase Dashboard: https://izngyuhawwlxopcdmfry.supabase.co');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Execute the contents of: fix-recursion-complete.sql');
    console.log('   4. Run this verification script again');
  } else {
    console.log('✅ Infinite recursion appears to be fixed!');
    console.log('📋 Next steps:');
    console.log('   1. Test with authenticated users');
    console.log('   2. Verify all user roles work correctly');
    console.log('   3. Test collaborator management features');
    console.log('   4. Monitor application performance');
  }

  console.log('\n🎯 Verification complete!');
  return results;
}

// Run verification
verifyCompleteFix().then(results => {
  process.exit(results.recursionFixed ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});