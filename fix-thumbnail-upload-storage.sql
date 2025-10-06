-- Fix Thumbnail Upload Storage Configuration
-- This script fixes the storage bucket and RLS policies for thumbnail uploads

-- =============================================
-- 1. CREATE ASSETS BUCKET (if it doesn't exist)
-- =============================================

-- Note: This must be run with sufficient privileges
-- You may need to run this in the Supabase dashboard SQL editor

-- Create the assets bucket for storing project thumbnails and other files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assets',
    'assets',
    true,
    5242880, -- 5MB in bytes
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. CREATE STORAGE RLS POLICIES
-- =============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own assets" ON storage.objects;

-- Policy for viewing assets (public access for project thumbnails)
CREATE POLICY "Public assets are viewable by everyone" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'assets');

-- Policy for uploading assets (authenticated users can upload)
CREATE POLICY "Authenticated users can upload assets" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'assets' AND
        (
            -- Project thumbnails (any authenticated user can upload)
            (storage.foldername(name))[1] = 'project-thumbnails'
            OR
            -- User-specific assets (users can only upload to their own folder)
            (storage.foldername(name))[1] = 'user-' || auth.uid()
        )
    );

-- Policy for updating assets (only owners can update their files)
CREATE POLICY "Users can update their own assets" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'assets' AND
        (
            -- Project thumbnails: only original uploader can update
            (storage.foldername(name))[1] = 'project-thumbnails' AND
            owner = auth.uid()
            OR
            -- User-specific assets: only the user can update
            (storage.foldername(name))[1] = 'user-' || auth.uid()
        )
    )
    WITH CHECK (
        bucket_id = 'assets' AND
        (
            -- Project thumbnails: only original uploader can update
            (storage.foldername(name))[1] = 'project-thumbnails' AND
            owner = auth.uid()
            OR
            -- User-specific assets: only the user can update
            (storage.foldername(name))[1] = 'user-' || auth.uid()
        )
    );

-- Policy for deleting assets (only owners can delete their files)
CREATE POLICY "Users can delete their own assets" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'assets' AND
        (
            -- Project thumbnails: only original uploader can delete
            (storage.foldername(name))[1] = 'project-thumbnails' AND
            owner = auth.uid()
            OR
            -- User-specific assets: only the user can delete
            (storage.foldername(name))[1] = 'user-' || auth.uid()
        )
    );

-- =============================================
-- 3. ENABLE RLS ON STORAGE.OBJECTS
-- =============================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. CREATE HELPER FUNCTION FOR FILE PATHS
-- =============================================

-- Helper function to extract folder name from file path
CREATE OR REPLACE FUNCTION storage.foldername(path text)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT string_to_array(path, '/');
$$;

-- =============================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on storage schema
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;

-- Grant permissions on buckets
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- Grant permissions on objects
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- =============================================
-- 6. VERIFICATION QUERIES
-- =============================================

-- Check if the assets bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'assets';

-- Check if RLS policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test storage access (should return empty list if no files exist)
SELECT bucket_id, name, created_at
FROM storage.objects
WHERE bucket_id = 'assets'
LIMIT 5;

-- =============================================
-- 7. CLEANUP OLD TEST FILES (OPTIONAL)
-- =============================================

-- Uncomment if you want to clean up old test files
-- DELETE FROM storage.objects
-- WHERE bucket_id = 'assets'
-- AND name LIKE 'test-thumbnail-%';

-- =============================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id ON storage.objects(bucket_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_owner ON storage.objects(owner);
CREATE INDEX IF NOT EXISTS idx_storage_objects_name ON storage.objects(name);

-- =============================================
-- INSTRUCTIONS
-- =============================================

/*
IMPORTANT: This script must be executed in the Supabase Dashboard SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste this entire script
5. Click "Run" to execute

After running this script:

1. Verify the bucket was created: SELECT * FROM storage.buckets WHERE id = 'assets';
2. Test the upload functionality in your application
3. If issues persist, check the browser console for specific error messages

The script creates:
- An "assets" bucket with 5MB file size limit
- Proper RLS policies for public viewing and authenticated uploads
- Helper functions for file path management
- Necessary permissions for both authenticated and anonymous users
- Performance indexes for faster queries

Troubleshooting:
- If you get permission errors, ensure you're running this as a superuser
- If the bucket already exists, the script will skip bucket creation
- If policies already exist, they will be dropped and recreated
*/