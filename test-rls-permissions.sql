-- Test RLS policies for conversations and messages tables
-- This script helps identify permission issues

-- Test 1: Check if user can insert into conversations table
SELECT
  'conversations_insert' as test_name,
  has_table_privilege('public.conversations', 'INSERT') as can_insert,
  has_table_privilege('public.conversations', 'SELECT') as can_select,
  has_table_privilege('public.conversations', 'UPDATE') as can_update,
  has_table_privilege('public.conversations', 'DELETE') as can_delete;

-- Test 2: Check if user can insert into messages table
SELECT
  'messages_insert' as test_name,
  has_table_privilege('public.messages', 'INSERT') as can_insert,
  has_table_privilege('public.messages', 'SELECT') as can_select,
  has_table_privilege('public.messages', 'UPDATE') as can_update,
  has_table_privilege('public.messages', 'DELETE') as can_delete;

-- Test 3: Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('conversations', 'messages')
  AND schemaname = 'public';

-- Test 4: Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_qualifier,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, policyname;

-- Test 5: Check current user
SELECT current_user as authenticated_user;

-- Test 6: Try to simulate a conversation insertion (this might fail due to RLS)
-- Note: This is just for testing, don't run in production
DO $$
BEGIN
  -- Try to insert a test conversation
  INSERT INTO public.conversations (
    project_id,
    title,
    created_by,
    type,
    metadata
  ) VALUES (
    gen_random_uuid(),
    'Test Conversation',
    current_user,
    'ai-chat',
    '{"type": "ai-chat"}'::jsonb
  );

  RAISE NOTICE '✅ Test conversation insertion successful';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test conversation insertion failed: %', SQLERRM;
END $$;