-- Enhanced AI Conversations Database Schema
-- This migration enhances the existing schema to support AI conversation persistence

-- Add AI-specific metadata fields to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS ai_response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER;

-- Add indexes for AI conversation performance
CREATE INDEX IF NOT EXISTS idx_messages_ai_conversation_created
ON messages(conversation_id, created_at)
WHERE role IN ('assistant', 'user', 'system');

-- Create index for AI model tracking
CREATE INDEX IF NOT EXISTS idx_messages_ai_model
ON messages(ai_model, created_at)
WHERE ai_model IS NOT NULL;

-- Update conversations table to support AI-specific metadata
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

-- Add indexes for conversation management
CREATE INDEX IF NOT EXISTS idx_conversations_project_type_created
ON conversations(project_id, type, created_at);

-- Add RLS policies for AI conversations if not already present
-- (These will need to be adjusted based on your existing RLS setup)

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON messages TO authenticated_users;
-- GRANT ALL ON conversations TO authenticated_users;
-- GRANT ALL ON message_inserts TO authenticated_users;
-- GRANT ALL ON conversation_inserts TO authenticated_users;

-- Add comments for documentation
COMMENT ON COLUMN messages.ai_model IS 'AI model used for generating this response (e.g., gemini-pro, claude-3)';
COMMENT ON COLUMN messages.ai_response_time_ms IS 'Response time in milliseconds for AI-generated messages';
COMMENT ON COLUMN messages.ai_tokens_used IS 'Number of tokens used for AI-generated messages';
COMMENT ON COLUMN conversations.metadata IS 'JSON metadata for conversation (AI context, usage stats, etc.)';
COMMENT ON COLUMN conversations.type IS 'Type of conversation (ai-chat, team-chat, etc.)';

-- Function to update conversation last updated timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update conversation timestamp
CREATE TRIGGER update_conversation_timestamp
AFTER INSERT OR UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_updated_at();

-- Function to automatically generate conversation titles
CREATE OR REPLACE FUNCTION generate_conversation_title(first_message TEXT)
RETURNS TEXT AS $$
DECLARE
  title TEXT;
  max_length INTEGER := 100;
BEGIN
  -- Extract first 100 characters as title
  title := substring(first_message, 1, max_length);

  -- Remove newlines and extra whitespace
  title := trim(regexp_replace(title, '[\n\r\s]+', ' ', 'g'));

  -- Add ellipsis if message was truncated
  IF length(first_message) > max_length THEN
    title := title || '...';
  END IF;

  -- Return "AI Chat" if message is empty or only whitespace
  IF COALESCE(title, '') = '' THEN
    title := 'AI Chat';
  END IF;

  RETURN title;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-generate conversation titles
CREATE OR REPLACE FUNCTION auto_generate_conversation_title()
RETURNS TRIGGER AS $$
DECLARE
  message_count INTEGER;
  first_message TEXT;
BEGIN
  -- Count messages in this conversation
  SELECT COUNT(*) INTO message_count
  FROM messages
  WHERE conversation_id = NEW.id AND role = 'user';

  -- If this is the first user message, generate a title
  IF message_count = 1 THEN
    SELECT content INTO first_message
    FROM messages
    WHERE conversation_id = NEW.id AND role = 'user'
    ORDER BY created_at
    LIMIT 1;

    UPDATE conversations
    SET title = generate_conversation_title(first_message),
        metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{auto_generated: true, first_message_length: ' || length(first_message) || '}'
        )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate conversation titles
CREATE TRIGGER auto_generate_title
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.role = 'user')
EXECUTE FUNCTION auto_generate_conversation_title();

-- Create view for AI conversation analytics
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