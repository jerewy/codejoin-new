-- Test script to check for ambiguous project_id references in queries
-- This script helps identify queries that might still have ambiguous column references

-- Test 1: Check if there are any views or stored procedures with unqualified project_id
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%project_id%'
    AND definition NOT LIKE '%.project_id%'
    AND schemaname IN ('public', 'auth');

-- Test 2: Check RLS policies that might have ambiguous references
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE qual LIKE '%project_id%'
    AND qual NOT LIKE '%.project_id%';

-- Test 3: Check for any functions that might have ambiguous project_id references
SELECT
    proname,
    prosrc
FROM pg_proc
WHERE prosrc LIKE '%project_id%'
    AND prosrc NOT LIKE '%.project_id%'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Test 4: Simulate the problematic query patterns
-- This query mimics what happens when joining conversations and projects
EXPLAIN (VERBOSE, COSTS OFF)
SELECT
    c.id,
    c.project_id,
    p.id as project_id_alt,
    c.title,
    p.name
FROM conversations c
JOIN projects p ON c.project_id = p.id
WHERE c.project_id = 'test-project-id';

-- Test 5: Check message insertion with proper column qualification
EXPLAIN (VERBOSE, COSTS OFF)
INSERT INTO messages (conversation_id, role, content, metadata)
SELECT
    conv.id,
    'user',
    'test message',
    '{}'
FROM conversations conv
WHERE conv.project_id = 'test-project-id'
LIMIT 1;