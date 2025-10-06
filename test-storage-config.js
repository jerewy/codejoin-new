// Test script to check Supabase storage configuration and upload functionality
const { createClient } = require('@supabase/supabase-js');

// Read environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables not found');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageConfiguration() {
  console.log('🔍 Testing Supabase Storage Configuration...\n');

  try {
    // Test 1: Check if we can list buckets
    console.log('1. Testing bucket access...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    console.log('✅ Successfully accessed storage buckets');
    console.log('Available buckets:', buckets?.map(b => b.name).join(', ') || 'None');

    // Test 2: Check if 'assets' bucket exists
    console.log('\n2. Checking for "assets" bucket...');
    const assetsBucket = buckets?.find(b => b.name === 'assets');

    if (!assetsBucket) {
      console.error('❌ "assets" bucket not found');
      console.log('You need to create the "assets" bucket in your Supabase dashboard');

      // Try to create the bucket
      console.log('\nAttempting to create "assets" bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('assets', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        console.log('Please manually create the "assets" bucket in your Supabase dashboard');
      } else {
        console.log('✅ Successfully created "assets" bucket');
      }
    } else {
      console.log('✅ "assets" bucket found');
      console.log('Bucket details:', {
        id: assetsBucket.id,
        name: assetsBucket.name,
        public: assetsBucket.public,
        created_at: assetsBucket.created_at
      });
    }

    // Test 3: Test file upload to project-thumbnails path
    console.log('\n3. Testing file upload to project-thumbnails path...');

    // Create a test file
    const testContent = 'test image content';
    const testFilePath = `project-thumbnails/test-${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(testFilePath, new Blob([testContent]), {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Error uploading test file:', uploadError);

      if (uploadError.message.includes('permission') || uploadError.message.includes('policy')) {
        console.log('💡 This might be a permissions issue. Check your RLS policies for storage.');
      }
    } else {
      console.log('✅ Successfully uploaded test file');
      console.log('File path:', uploadData.path);

      // Test 4: Test getting public URL
      console.log('\n4. Testing public URL generation...');
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(uploadData.path);

      if (publicUrlData?.publicUrl) {
        console.log('✅ Successfully generated public URL');
        console.log('Public URL:', publicUrlData.publicUrl);
      } else {
        console.error('❌ Failed to generate public URL');
      }

      // Clean up test file
      console.log('\n5. Cleaning up test file...');
      const { error: deleteError } = await supabase.storage
        .from('assets')
        .remove([uploadData.path]);

      if (deleteError) {
        console.error('⚠️ Warning: Could not delete test file:', deleteError);
      } else {
        console.log('✅ Test file cleaned up');
      }
    }

    // Test 5: Check RLS policies
    console.log('\n6. Checking storage permissions...');
    const { data: policies, error: policiesError } = await supabase
      .from('storage.policies')
      .select('*')
      .eq('bucket_name', 'assets');

    if (policiesError) {
      console.error('❌ Error checking policies:', policiesError);
      console.log('💡 You might need to set up RLS policies for storage access');
      console.log('Example policy for authenticated users:');
      console.log(`
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'project-thumbnails'
  );

CREATE POLICY "Authenticated users can read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated'
  );
      `);
    } else {
      console.log('✅ Found storage policies:');
      policies.forEach(policy => {
        console.log(`- ${policy.name}: ${policy.action} for ${policy.definition}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testStorageConfiguration().then(() => {
  console.log('\n🏁 Storage configuration test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});