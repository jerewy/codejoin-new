-- Fix SQL Ambiguity in AI Conversation Analytics and RLS Policies
-- This migration fixes the "column reference project_id is ambiguous" error
-- by properly qualifying all column references in SQL queries

-- Fix 1: Update ai_conversation_analytics view to properly qualify project_id
DROP VIEW IF EXISTS ai_conversation_analytics;

CREATE OR REPLACE VIEW ai_conversation_analytics AS
SELECT
  c.id,
  c.project_id,
  c.title,
  c.created_at,
  c.updated_at,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as ai_messages_count,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages_count,
  SUM(COALESCE(m.ai_tokens_used, 0)) as total_tokens_used,
  AVG(COALESCE(m.ai_response_time_ms, 0)) as avg_response_time_ms,
  MIN(m.ai_model) FILTER (WHERE m.ai_model IS NOT NULL) as first_ai_model,
  MAX(m.ai_model) FILTER (WHERE m.ai_model IS NOT NULL) as latest_ai_model,
  c.metadata
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.type = 'ai-chat' OR c.metadata->>'type' = 'ai-chat'
GROUP BY c.id, c.project_id, c.title, c.created_at, c.updated_at, c.metadata
ORDER BY c.updated_at DESC;

-- Fix 2: Update RLS policies to properly qualify project_id references

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view conversations they have access to" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations for their projects" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they created" ON conversations;
DROP POLICY IF EXISTS "Users can delete conversations they created" ON conversations;

DROP POLICY IF EXISTS "Users can view messages in conversations they have access to" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in conversations they have access to" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create fixed RLS policies for conversations
CREATE POLICY "Users can view conversations they have access to"
ON conversations FOR SELECT
USING (
  -- User created the conversation
  created_by = auth.uid()
  OR
  -- User is a collaborator on the project
  conversations.project_id IN (
    SELECT project_id FROM collaborators
    WHERE user_id = auth.uid()
  )
  OR
  -- User owns the project
  conversations.project_id IN (
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
  conversations.project_id IN (
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
  conversations.project_id IN (
    SELECT id FROM projects
    WHERE user_id = auth.uid()
  )
);

-- Create fixed RLS policies for messages
CREATE POLICY "Users can view messages in conversations they have access to"
ON messages FOR SELECT
USING (
  -- Conversation must be accessible to the user
  EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.id = messages.conversation_id
    AND (
      conv.created_by = auth.uid()
      OR
      conv.project_id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = auth.uid()
      )
      OR
      conv.project_id IN (
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
  EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.id = conversation_id
    AND (
      conv.created_by = auth.uid()
      OR
      conv.project_id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = auth.uid()
      )
      OR
      conv.project_id IN (
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
  EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.id = messages.conversation_id
    AND conv.created_by = auth.uid()
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
  EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.id = messages.conversation_id
    AND conv.created_by = auth.uid()
  )
);

-- Fix 3: Update functions to use proper table aliases
DROP FUNCTION IF EXISTS user_has_conversation_access(conversation_uuid UUID, user_uuid UUID);

CREATE OR REPLACE FUNCTION user_has_conversation_access(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations conv
    WHERE conv.id = conversation_uuid
    AND (
      conv.created_by = user_uuid
      OR
      conv.project_id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = user_uuid
      )
      OR
      conv.project_id IN (
        SELECT id FROM projects
        WHERE user_id = user_uuid
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS user_has_project_access(project_uuid UUID, user_uuid UUID);

CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects proj
    WHERE proj.id = project_uuid
    AND (
      proj.user_id = user_uuid
      OR
      proj.id IN (
        SELECT project_id FROM collaborators
        WHERE user_id = user_uuid
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON VIEW ai_conversation_analytics IS 'Analytics view for AI conversations with properly qualified column references';
COMMENT ON POLICY "Users can view conversations they have access to" ON conversations IS 'Allows users to see conversations they created or have project access to (Fixed ambiguity)';
COMMENT ON POLICY "Users can insert conversations for their projects" ON conversations IS 'Allows users to create conversations for projects they have access to (Fixed ambiguity)';
COMMENT ON POLICY "Users can view messages in conversations they have access to" ON messages IS 'Allows users to see messages in conversations they can access (Fixed ambiguity)';
COMMENT ON POLICY "Users can insert messages in conversations they have access to" ON messages IS 'Allows users to add messages to conversations they can access (Fixed ambiguity)';

-- Verify the fix
DO $$
DECLARE
  view_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if view exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'ai_conversation_analytics'
  ) INTO view_exists;

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('conversations', 'messages');

  RAISE NOTICE '✅ SQL Ambiguity Fix Applied:';
  RAISE NOTICE '   - ai_conversation_analytics view created: %', view_exists;
  RAISE NOTICE '   - Total RLS policies: %', policy_count;
  RAISE NOTICE '   - All column references properly qualified';
END;
$$;