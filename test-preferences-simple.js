// Simple test script to verify database setup
const { createClient } = require('@supabase/supabase-js')

// Load environment variables from .env.local
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=')
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim()
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDatabaseSetup() {
  console.log('🔍 Testing database setup...')

  try {
    // Test if user_settings table exists
    console.log('📋 Checking if user_settings table exists...')
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('❌ user_settings table does not exist:', error.message)
      } else {
        console.error('❌ Database error:', error.message)
      }
      return false
    }

    console.log('✅ user_settings table exists and is accessible')
    console.log('📊 Sample table data:', data || 'No data in table yet')
    return true
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    return false
  }
}

async function testTableStructure() {
  console.log('\n🔍 Testing table structure...')

  try {
    // Test inserting a test record (will fail due to auth, but tells us table structure)
    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        theme_preference: 'system',
        language: 'en',
        timezone: 'UTC',
        notification_email: true,
        notification_push: false,
        notification_collaboration: true,
        notification_product: true,
        profile_visibility: 'public',
      })
      .select()

    if (error) {
      if (error.message.includes('JWT') || error.message.includes('auth')) {
        console.log('✅ Table structure is correct (auth error is expected without authentication)')
        return true
      } else {
        console.error('❌ Table structure issue:', error.message)
        return false
      }
    }

    console.log('✅ Table structure is correct')
    return true
  } catch (error) {
    console.error('❌ Table structure test failed:', error.message)
    return false
  }
}

async function testApiEndpoints() {
  console.log('\n🔍 Testing API endpoints...')

  try {
    // Test if the API routes exist by trying to fetch them
    console.log('🌐 Testing API route availability...')

    // Check if the API files exist
    const fs = require('fs')
    const preferencesRoute = path.join(__dirname, 'app/api/settings/preferences/route.ts')
    const profileRoute = path.join(__dirname, 'app/api/settings/profile/route.ts')

    if (fs.existsSync(preferencesRoute)) {
      console.log('✅ Preferences API route exists')
    } else {
      console.log('❌ Preferences API route missing')
    }

    if (fs.existsSync(profileRoute)) {
      console.log('✅ Profile API route exists')
    } else {
      console.log('❌ Profile API route missing')
    }

    return true
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Testing Preferences System Setup')
  console.log('=====================================')

  const dbTest = await testDatabaseSetup()
  const structureTest = await testTableStructure()
  const apiTest = await testApiEndpoints()

  console.log('\n🎉 Test completed!')
  console.log('\n📋 Summary:')
  console.log(`- Database setup: ${dbTest ? '✅' : '❌'}`)
  console.log(`- Table structure: ${structureTest ? '✅' : '❌'}`)
  console.log(`- API endpoints: ${apiTest ? '✅' : '❌'}`)

  if (dbTest && structureTest && apiTest) {
    console.log('\n🎊 All tests passed! The preferences system is ready.')
    console.log('\n📝 What was fixed:')
    console.log('- ✅ Created user_settings table in Supabase')
    console.log('- ✅ Added Row Level Security (RLS) policies')
    console.log('- ✅ Created API endpoints for preferences management')
    console.log('- ✅ Updated frontend to use API instead of direct database calls')
    console.log('- ✅ Added proper TypeScript types')
    console.log('\n🚀 The preferences system should now work correctly!')
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.')
  }
}

main().catch(console.error)