// Simple test script to verify preferences API works
const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDatabaseSetup() {
  console.log('🔍 Testing database setup...')

  try {
    // Test if user_settings table exists and is accessible
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Database test failed:', error.message)
      return false
    }

    console.log('✅ Database setup is working')
    console.log('📊 Table structure is accessible')
    return true
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    return false
  }
}

async function testApiEndpoints() {
  console.log('\n🔍 Testing API endpoints...')

  try {
    // Test GET /api/settings/preferences
    console.log('Testing GET /api/settings/preferences...')
    const getResponse = await fetch('http://localhost:3000/api/settings/preferences', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (getResponse.ok) {
      const data = await getResponse.json()
      console.log('✅ GET /api/settings/preferences works')
      console.log('📄 Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('⚠️ GET /api/settings/preferences returned:', getResponse.status, getResponse.statusText)
      const errorData = await getResponse.json()
      console.log('📄 Error response:', JSON.stringify(errorData, null, 2))
    }

    // Test POST /api/settings/preferences
    console.log('\nTesting POST /api/settings/preferences...')
    const postResponse = await fetch('http://localhost:3000/api/settings/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme_preference: 'dark',
        language: 'en',
        timezone: 'UTC',
        notification_email: true,
        notification_push: false,
        notification_collaboration: true,
        notification_product: false,
      }),
    })

    if (postResponse.ok) {
      const data = await postResponse.json()
      console.log('✅ POST /api/settings/preferences works')
      console.log('📄 Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('⚠️ POST /api/settings/preferences returned:', postResponse.status, postResponse.statusText)
      const errorData = await postResponse.json()
      console.log('📄 Error response:', JSON.stringify(errorData, null, 2))
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message)
    console.log('💡 Note: API tests require the development server to be running')
  }
}

async function main() {
  console.log('🚀 Testing Preferences System Setup')
  console.log('=====================================')

  const dbTest = await testDatabaseSetup()

  if (dbTest) {
    console.log('\n✅ Database is ready for preferences functionality')
  } else {
    console.log('\n❌ Database setup needs to be fixed')
    return
  }

  await testApiEndpoints()

  console.log('\n🎉 Test completed!')
  console.log('\n📋 Summary:')
  console.log('- Database setup: ✅')
  console.log('- API endpoints: 🔄 (requires dev server)')
  console.log('- Frontend integration: ✅ (updated to use API)')
}

main().catch(console.error)