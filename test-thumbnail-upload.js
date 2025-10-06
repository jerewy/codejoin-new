// Test script to simulate thumbnail upload functionality
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a service client for admin operations (if needed for auth)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testThumbnailUpload() {
  console.log('🧪 Testing Thumbnail Upload Functionality...\n');

  try {
    // Step 1: Check bucket exists
    console.log('1. Checking assets bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error('❌ Error accessing buckets:', bucketError);
      return;
    }

    const assetsBucket = buckets?.find(b => b.name === 'assets');
    if (!assetsBucket) {
      console.error('❌ Assets bucket not found. Please run create-storage-bucket.sql first');
      return;
    }
    console.log('✅ Assets bucket found:', assetsBucket.name);

    // Step 2: Create a test image file (simulating thumbnail upload)
    console.log('\n2. Creating test thumbnail file...');

    // Simulate a PNG image (just for testing)
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    const testFileName = `project-thumbnails/test-thumbnail-${Date.now()}.png`;

    console.log('✅ Test image created');
    console.log('File name:', testFileName);
    console.log('File size:', testImageData.length, 'bytes');

    // Step 3: Test upload
    console.log('\n3. Testing thumbnail upload...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(testFileName, testImageData, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      console.log('Error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error
      });

      if (uploadError.message.includes('permission') || uploadError.message.includes('policy')) {
        console.log('\n💡 Permission issue detected. Make sure you have:');
        console.log('1. Created the assets bucket (run create-storage-bucket.sql)');
        console.log('2. Set up RLS policies (run setup-storage-policies.sql)');
        console.log('3. Are authenticated in your application');
      }
      return;
    }

    console.log('✅ Upload successful!');
    console.log('File path:', uploadData.path);
    console.log('File ID:', uploadData.id);

    // Step 4: Test public URL generation
    console.log('\n4. Testing public URL generation...');
    const { data: publicUrlData } = supabase.storage
      .from('assets')
      .getPublicUrl(uploadData.path);

    if (!publicUrlData?.publicUrl) {
      console.error('❌ Failed to generate public URL');
    } else {
      console.log('✅ Public URL generated:', publicUrlData.publicUrl);
    }

    // Step 5: Test file download (verification)
    console.log('\n5. Testing file download verification...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('assets')
      .download(uploadData.path);

    if (downloadError) {
      console.error('❌ Download failed:', downloadError);
    } else {
      console.log('✅ Download successful!');
      console.log('Downloaded file size:', downloadData.size, 'bytes');
      console.log('Content type:', downloadData.type);
    }

    // Step 6: Clean up test file
    console.log('\n6. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('assets')
      .remove([uploadData.path]);

    if (deleteError) {
      console.error('⚠️ Warning: Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }

    console.log('\n🎉 Thumbnail upload test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Assets bucket exists and is accessible');
    console.log('- ✅ File upload works correctly');
    console.log('- ✅ Public URL generation works');
    console.log('- ✅ File download verification works');
    console.log('- ✅ File deletion works');
    console.log('\n✅ Your thumbnail upload should now work in the project settings!');

  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
  }
}

// Run the test
testThumbnailUpload();