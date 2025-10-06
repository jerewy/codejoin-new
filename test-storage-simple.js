// Simple test script to check Supabase storage configuration
const { createClient } = require('@supabase/supabase-js');

// Environment variables from the command output
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      console.log('\nTo create the bucket, run this SQL in your Supabase SQL editor:');
      console.log(`
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);
      `);
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
      console.log('Error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error
      });

      if (uploadError.message.includes('permission') || uploadError.message.includes('policy')) {
        console.log('\n💡 This is a permissions issue. You need to set up RLS policies for storage.');
        console.log('Run these SQL commands in your Supabase SQL editor:');
        console.log(`
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;

-- Create new policies for the assets bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated reads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assets'
  );

CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated'
  );

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        `);
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

    console.log('\n✅ Storage configuration test completed');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testStorageConfiguration();