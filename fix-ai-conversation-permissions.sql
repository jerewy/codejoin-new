-- Fix AI Conversation Database Permissions
-- This migration fixes RLS policies and permissions for AI conversations

-- Enable RLS on conversations table if not already enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on messages table if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create comprehensive RLS policies for conversations
CREATE POLICY "Users can view conversations they have access to"
ON conversations FOR SELECT
USING (
  -- User created the conversation
  created_by = auth.uid()
  OR
  -- User is a collaborator on the project
  project_id IN (
    SELECT project_id FROM collaborators
    WHERE user_id = auth.uid()
  )
  OR
  -- User owns the project
  project_id IN (
    SELECT id FROM projects
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert conversations for their projects"
ON conversations FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User must have access to the project
  (
    project_id IN (
      SELECT id FROM projects
      WHERE user_id = auth.uid()
    )
    OR
    project_id IN (
      SELECT project_id FROM collaborators
      WHERE user_id = auth.uid()
    )
  )
  AND
  -- Must set created_by to current user
  created_by = auth.uid()
);

CREATE POLICY "Users can update conversations they created"
ON conversations FOR UPDATE
USING (
  created_by = auth.uid()
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete conversations they created"
ON conversations FOR DELETE
USING (
  created_by = auth.uid()
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE user_id = auth.uid()
  )
);

-- Create comprehensive RLS policies for messages
CREATE POLICY "Users can view messages in conversations they have access to"
ON messages FOR SELECT
USING (
  -- Conversation must be accessible to the user
  conversation_id IN (
    SELECT id FROM conversations
    WHERE (
      created_by = auth.uid()
      OR
      project_id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = auth.uid()
      )
      OR
      project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert messages in conversations they have access to"
ON messages FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Conversation must be accessible to the user
  conversation_id IN (
    SELECT id FROM conversations
    WHERE (
      created_by = auth.uid()
      OR
      project_id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = auth.uid()
      )
      OR
      project_id IN (
        SELECT id FROM projects
        WHERE user_id = auth.uid()
      )
    )
  )
  AND
  -- If author_id is set, it must be the current user
  (author_id IS NULL OR author_id = auth.uid())
);

CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (
  author_id = auth.uid()
  OR
  conversation_id IN (
    SELECT id FROM conversations
    WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  author_id = auth.uid()
  OR
  conversation_id IN (
    SELECT id FROM conversations
    WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (
  author_id = auth.uid()
  OR
  conversation_id IN (
    SELECT id FROM conversations
    WHERE created_by = auth.uid()
  )
);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- Grant usage on sequences for auto-incrementing IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_conversations_project_user ON conversations(project_id, created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_type_project ON conversations(type, project_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_role ON messages(conversation_id, role);

-- Create function to check if user has access to a conversation
CREATE OR REPLACE FUNCTION user_has_conversation_access(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_uuid
    AND (
      created_by = user_uuid
      OR
      project_id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = user_uuid
      )
      OR
      project_id IN (
        SELECT id FROM projects
        WHERE user_id = user_uuid
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has access to a project
CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND (
      user_id = user_uuid
      OR
      id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = user_uuid
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON POLICY "Users can view conversations they have access to" ON conversations IS 'Allows users to see conversations they created or have project access to';
COMMENT ON POLICY "Users can insert conversations for their projects" ON conversations IS 'Allows users to create conversations for projects they have access to';
COMMENT ON POLICY "Users can view messages in conversations they have access to" ON messages IS 'Allows users to see messages in conversations they can access';
COMMENT ON POLICY "Users can insert messages in conversations they have access to" ON messages IS 'Allows users to add messages to conversations they can access';

-- Verify the policies are working
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('conversations', 'messages');

  RAISE NOTICE '✅ Created % RLS policies for conversations and messages tables', policy_count;
END;
$$;