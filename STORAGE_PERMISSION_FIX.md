# Fix for Supabase Storage Permission Error

## Issue
You got error `ERROR: 42501: must be owner of table objects` when trying to run the storage policies SQL. This happens because only Supabase project owners can create RLS policies on system tables like `storage.objects`.

## Solution: Use Supabase Dashboard UI

Since you don't have permission to create RLS policies directly, let's set up storage using the Supabase Dashboard:

### Step 1: Create Storage Bucket
1. Go to your Supabase Dashboard: https://izngyuhawwlxopcdmfry.supabase.co
2. Navigate to **Storage** (left sidebar)
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `assets`
   - **Public bucket**: Yes (check the box)
   - **File size limit**: 5242880 (5MB)
   - **Allowed MIME types**: `image/*`
5. Click **"Save"**

### Step 2: Set Bucket Policies
1. In the Storage section, click on the `assets` bucket
2. Click **"Settings"** tab
3. Under **"Bucket policy"**, paste this policy:
```json
{
  "rules": [
    {
      "allow": ["SELECT"],
      "role": "anon",
      "match": {
        "bucket": "assets"
      }
    },
    {
      "allow": ["INSERT", "UPDATE"],
      "role": "authenticated",
      "match": {
        "bucket": "assets"
      }
    }
  ]
}
```
4. Click **"Save"**

### Step 3: Test the Upload
Now try uploading a thumbnail in your project settings page. It should work!

## Alternative: Ask Project Owner
If you're not the Supabase project owner, you'll need to ask the person who created the Supabase project to run the SQL scripts. They have the necessary permissions to create RLS policies.

## What Was Already Fixed
- ✅ Frontend code is enhanced with proper error handling
- ✅ File validation is working correctly
- ✅ Upload progress indicators are implemented
- ✅ Automatic cleanup of failed uploads is working

The only missing piece was the storage bucket setup, which the Dashboard UI method will solve.