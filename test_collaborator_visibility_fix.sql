-- Test script to verify collaborator visibility fix
-- This tests different user roles to ensure they can see all project participants

-- First, let's see the raw data (what should be visible)
SELECT
    'RAW DATA (All collaborators)' as test_type,
    c.project_id,
    c.user_id,
    c.role,
    p.name as project_name,
    pr.email as user_email,
    pr.full_name as user_name
FROM collaborators c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN profiles pr ON c.user_id = pr.id
WHERE c.project_id = '175a7112-4f23-4160-84ca-893da2cee58b'
ORDER BY c.role, pr.email;

-- Test: What the project owner should see (Jeremy - owner)
-- Note: We can't actually set auth.uid() in a regular query, but we can test the logic
-- The logic should return all collaborators for this project

-- Test the logic that would be applied by RLS for a project collaborator
SELECT
    'RLS Logic Test - Collaborator Access' as test_type,
    c.project_id,
    c.user_id,
    c.role,
    p.name as project_name,
    pr.email as user_email,
    pr.full_name as user_name,
    -- This simulates the RLS policy logic for a collaborator (rajaiblisai12@gmail.com)
    CASE
        WHEN EXISTS (
            SELECT 1 FROM collaborators c2
            WHERE c2.project_id = c.project_id
            AND c2.user_id = '5081708d-3a45-469c-94dd-b234e3738938'  -- Raja's user ID
        ) THEN 'VISIBLE - User is collaborator'
        WHEN EXISTS (
            SELECT 1 FROM projects p2
            WHERE p2.id = c.project_id
            AND p2.user_id = '5081708d-3a45-469c-94dd-b234e3738938'
        ) THEN 'VISIBLE - User is owner'
        WHEN EXISTS (
            SELECT 1 FROM projects p2
            WHERE p2.id = c.project_id
            AND '5081708d-3a45-469c-94dd-b234e3738938' = ANY(p2.admin_ids)
        ) THEN 'VISIBLE - User is admin'
        ELSE 'HIDDEN - No access'
    END as access_status
FROM collaborators c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN profiles pr ON c.user_id = pr.id
WHERE c.project_id = '175a7112-4f23-4160-84ca-893da2cee58b'
ORDER BY c.role, pr.email;

-- Verify the project ownership and admin structure
SELECT
    'Project Structure' as test_type,
    p.id as project_id,
    p.name as project_name,
    p.user_id as owner_id,
    owner.email as owner_email,
    owner.full_name as owner_name,
    p.admin_ids,
    array_agg(admin.email) as admin_emails
FROM projects p
LEFT JOIN profiles owner ON p.user_id = owner.id
LEFT JOIN profiles admin ON admin.id = ANY(p.admin_ids)
WHERE p.id = '175a7112-4f23-4160-84ca-893da2cee58b'
GROUP BY p.id, p.name, p.user_id, owner.email, owner.full_name, p.admin_ids;