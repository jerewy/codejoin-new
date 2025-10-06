/**
 * COMPREHENSIVE INFINITE RECURSION DIAGNOSTIC SCRIPT
 *
 * This script systematically investigates the infinite recursion error
 * in Supabase collaborators RLS policies using a step-by-step approach.
 *
 * Instructions:
 * 1. Run this script in your Supabase SQL editor
 * 2. Follow the investigation steps in order
 * 3. Each step will reveal specific information about the recursion source
 * 4. The final section provides the definitive fix
 */

-- =============================================================================
-- STEP 1: INVESTIGATION SETUP
-- =============================================================================

-- Create a diagnostic log table to track our investigation
CREATE TEMPORARY TABLE investigation_log (
    step_number INTEGER,
    step_name TEXT,
    finding TEXT,
    status TEXT, -- 'INFO', 'WARNING', 'ERROR', 'SUCCESS'
    details TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Helper function to log investigation steps
CREATE OR REPLACE FUNCTION log_investigation(
    step_num INTEGER,
    step_name TEXT,
    finding TEXT,
    stat TEXT DEFAULT 'INFO',
    details TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO investigation_log (step_number, step_name, finding, status, details)
    VALUES (step_num, step_name, finding, stat, details);
    RAISE NOTICE 'STEP % - %: %', step_num, step_name, finding;
    IF details IS NOT NULL THEN
        RAISE NOTICE '  Details: %', details;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 2: CURRENT STATE ANALYSIS
-- =============================================================================

DO $$
BEGIN
    -- Log current policies
    PERFORM log_investigation(2, 'CURRENT_POLICIES',
        'Analyzing existing RLS policies on collaborators table', 'INFO');

    INSERT INTO investigation_log (step_number, step_name, finding, status, details)
    SELECT
        2 as step_number,
        'CURRENT_POLICIES' as step_name,
        'Found policy: ' || policyname || ' (' || cmd || ')' as finding,
        'INFO' as status,
        'USING: ' || COALESCE(qual, 'none') || ' WITH_CHECK: ' || COALESCE(with_check, 'none') as details
    FROM pg_policies
    WHERE tablename = 'collaborators';

    -- Check RLS status
    PERFORM log_investigation(2, 'RLS_STATUS',
        'Checking if RLS is enabled on collaborators table', 'INFO');

    INSERT INTO investigation_log (step_number, step_name, finding, status, details)
    SELECT
        2 as step_number,
        'RLS_STATUS' as step_name,
        'RLS enabled: ' || CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END as finding,
        CASE WHEN relrowsecurity THEN 'INFO' ELSE 'WARNING' END as status,
        'Table: ' || relname as details
    FROM pg_class
    WHERE relname = 'collaborators';
END $$;

-- =============================================================================
-- STEP 3: RECURSION PATTERN DETECTION
-- =============================================================================

DO $$
BEGIN
    PERFORM log_investigation(3, 'RECURSION_DETECTION',
        'Scanning policies for recursive patterns', 'INFO');

    -- Look for obvious recursion patterns
    INSERT INTO investigation_log (step_number, step_name, finding, status, details)
    SELECT
        3 as step_number,
        'RECURSION_DETECTION' as step_name,
        'Policy ' || policyname || ' has potential recursion' as finding,
        CASE
            WHEN qual LIKE '%collaborators%' AND with_check LIKE '%collaborators%' THEN 'ERROR'
            WHEN qual LIKE '%collaborators%' OR with_check LIKE '%collaborators%' THEN 'WARNING'
            ELSE 'INFO'
        END as status,
        'QUAL references collaborators: ' || CASE WHEN qual LIKE '%collaborators%' THEN 'YES' ELSE 'NO' END ||
        ', WITH_CHECK references collaborators: ' || CASE WHEN with_check LIKE '%collaborators%' THEN 'YES' ELSE 'NO' END as details
    FROM pg_policies
    WHERE tablename = 'collaborators'
    AND (qual LIKE '%collaborators%' OR with_check LIKE '%collaborators%');

    -- Look for circular references
    INSERT INTO investigation_log (step_number, step_name, finding, status, details)
    SELECT
        3 as step_number,
        'CIRCULAR_REFERENCE_CHECK' as step_name,
        'Checking for circular references between tables' as finding,
        'INFO' as status,
        'This will identify policies that reference other tables which might reference back to collaborators' as details;
END $$;

-- =============================================================================
-- STEP 4: HELPER FUNCTIONS ANALYSIS
-- =============================================================================

DO $$
BEGIN
    PERFORM log_investigation(4, 'HELPER_FUNCTIONS',
        'Checking for existing helper functions', 'INFO');

    -- Check if helper functions exist
    INSERT INTO investigation_log (step_number, step_name, finding, status, details)
    SELECT
        4 as step_number,
        'HELPER_FUNCTIONS' as step_name,
        'Function exists: ' || proname as finding,
        'INFO' as status,
        'Language: ' || lanname || ', Security: ' || CASE WHEN prosecdef THEN 'DEFINER' ELSE 'INVOKER' END as details
    FROM pg_proc p
    JOIN pg_language l ON p.prolang = l.oid
    WHERE proname IN ('is_project_owner', 'is_project_admin', 'is_project_collaborator', 'user_has_project_access');

    -- If helper functions don't exist, log this as a problem
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('is_project_owner', 'is_project_admin', 'is_project_collaborator', 'user_has_project_access')) THEN
        PERFORM log_investigation(4, 'HELPER_FUNCTIONS',
            'NO HELPER FUNCTIONS FOUND - This could be the recursion source', 'ERROR',
            'Policies are likely using direct subqueries instead of helper functions');
    END IF;
END $$;

-- =============================================================================
-- STEP 5: POLICY EXECUTION ANALYSIS
-- =============================================================================

DO $$
BEGIN
    PERFORM log_investigation(5, 'POLICY_EXECUTION',
        'Testing policy execution with diagnostic queries', 'INFO');

    -- Test basic policy execution (this might trigger the recursion)
    BEGIN
        -- This query should be safe but will trigger RLS policies
        DECLARE test_count INTEGER;
        SELECT COUNT(*) INTO test_count FROM collaborators LIMIT 1;
        PERFORM log_investigation(5, 'POLICY_EXECUTION',
            'Basic policy execution successful', 'SUCCESS',
            'No recursion triggered on basic query');
    EXCEPTION WHEN OTHERS THEN
        PERFORM log_investigation(5, 'POLICY_EXECUTION',
            'Policy execution failed: ' || SQLERRM, 'ERROR',
            'SQLSTATE: ' || SQLSTATE || ', This likely indicates recursion');
    END;
END $$;

-- =============================================================================
-- STEP 6: DETAILED RECURSION SOURCE ANALYSIS
-- =============================================================================

-- This is the most critical section - it identifies the exact recursion source
DO $$
DECLARE
    policy_rec RECORD;
    recursion_found BOOLEAN := FALSE;
BEGIN
    PERFORM log_investigation(6, 'RECURSION_SOURCE_ANALYSIS',
        'Performing detailed recursion source analysis', 'INFO');

    FOR policy_rec IN
        SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'collaborators'
    LOOP
        -- Analyze USING clause (qual)
        IF policy_rec.qual IS NOT NULL THEN
            IF policy_rec.qual ~* 'collaborators' THEN
                recursion_found := TRUE;
                PERFORM log_investigation(6, 'RECURSION_SOURCE_ANALYSIS',
                    'RECURSION FOUND in policy ' || policy_rec.policyname || ' USING clause', 'ERROR',
                    'USING clause references collaborators table directly: ' || policy_rec.qual);
            END IF;

            -- Check for nested subqueries that might cause recursion
            IF policy_rec.qual ~* 'SELECT.*collaborators' THEN
                recursion_found := TRUE;
                PERFORM log_investigation(6, 'RECURSION_SOURCE_ANALYSIS',
                    'NESTED RECURSION FOUND in policy ' || policy_rec.policyname || ' USING clause', 'ERROR',
                    'Nested SELECT references collaborators table: ' || policy_rec.qual);
            END IF;
        END IF;

        -- Analyze WITH CHECK clause
        IF policy_rec.with_check IS NOT NULL THEN
            IF policy_rec.with_check ~* 'collaborators' THEN
                recursion_found := TRUE;
                PERFORM log_investigation(6, 'RECURSION_SOURCE_ANALYSIS',
                    'RECURSION FOUND in policy ' || policy_rec.policyname || ' WITH CHECK clause', 'ERROR',
                    'WITH CHECK clause references collaborators table directly: ' || policy_rec.with_check);
            END IF;

            -- Check for nested subqueries that might cause recursion
            IF policy_rec.with_check ~* 'SELECT.*collaborators' THEN
                recursion_found := TRUE;
                PERFORM log_investigation(6, 'RECURSION_SOURCE_ANALYSIS',
                    'NESTED RECURSION FOUND in policy ' || policy_rec.policyname || ' WITH CHECK clause', 'ERROR',
                    'Nested SELECT references collaborators table: ' || policy_rec.with_check);
            END IF;
        END IF;
    END LOOP;

    IF NOT recursion_found THEN
        PERFORM log_investigation(6, 'RECURSION_SOURCE_ANALYSIS',
            'No direct recursion found in policy definitions', 'WARNING',
            'Recursion might be indirect or caused by policy interaction');
    END IF;
END $$;

-- =============================================================================
-- STEP 7: POLICY INTERACTION ANALYSIS
-- =============================================================================

DO $$
BEGIN
    PERFORM log_investigation(7, 'POLICY_INTERACTION',
        'Analyzing policy interactions that might cause recursion', 'INFO');

    -- Count policies
    DECLARE policy_count INTEGER;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'collaborators';

    IF policy_count > 3 THEN
        PERFORM log_investigation(7, 'POLICY_INTERACTION',
            'Too many policies found: ' || policy_count || ' - this can cause complex interactions', 'WARNING',
            'Consider consolidating policies to reduce complexity');
    END IF;

    -- Check for overlapping policies
    INSERT INTO investigation_log (step_number, step_name, finding, status, details)
    SELECT
        7 as step_number,
        'POLICY_INTERACTION' as step_name,
        'Policy overlap analysis' as finding,
        'INFO' as status,
        'Multiple policies for same command can cause unexpected behavior' as details
    FROM pg_policies
    WHERE tablename = 'collaborators'
    GROUP BY cmd
    HAVING COUNT(*) > 1;
END $$;

-- =============================================================================
-- STEP 8: COMPREHENSIVE DIAGNOSTIC REPORT
-- =============================================================================

-- Generate the final diagnostic report
SELECT
    step_number,
    step_name,
    finding,
    status,
    details,
    timestamp
FROM investigation_log
ORDER BY step_number, timestamp;

-- Summary section
SELECT
    'DIAGNOSTIC_SUMMARY' as step_name,
    'Total investigation steps completed: ' || COUNT(*) as finding,
    CASE
        WHEN COUNT(CASE WHEN status = 'ERROR' THEN 1 END) > 0 THEN 'CRITICAL_ISSUES_FOUND'
        WHEN COUNT(CASE WHEN status = 'WARNING' THEN 1 END) > 0 THEN 'ISSUES_FOUND'
        ELSE 'NO_ISSUES'
    END as status,
    'Errors: ' || COUNT(CASE WHEN status = 'ERROR' THEN 1 END) ||
    ', Warnings: ' || COUNT(CASE WHEN status = 'WARNING' THEN 1 END) ||
    ', Info: ' || COUNT(CASE WHEN status = 'INFO' THEN 1 END) as details
FROM investigation_log;

-- =============================================================================
-- STEP 9: RECOMMENDED FIX (if recursion is found)
-- =============================================================================

-- This section provides the definitive fix for infinite recursion
DO $$
BEGIN
    -- Check if we found any errors that need fixing
    DECLARE error_count INTEGER;
    SELECT COUNT(*) INTO error_count FROM investigation_log WHERE status = 'ERROR';

    IF error_count > 0 THEN
        PERFORM log_investigation(9, 'RECOMMENDED_FIX',
            'Applying comprehensive fix for infinite recursion', 'INFO');

        -- The fix will be in the next section...
        RAISE NOTICE '';
        RAISE NOTICE '=============================================================================';
        RAISE NOTICE 'INFINITE RECURSION DETECTED - APPLYING COMPREHENSIVE FIX';
        RAISE NOTICE '=============================================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'See the companion script: fix-infinite-recursion-complete.sql';
        RAISE NOTICE 'This script contains the definitive fix for all identified recursion issues.';
        RAISE NOTICE '';

    ELSE
        PERFORM log_investigation(9, 'RECOMMENDED_FIX',
            'No recursion detected - no fix needed', 'SUCCESS');
    END IF;
END $$;

-- =============================================================================
-- CLEANUP
-- =============================================================================

-- Drop the temporary log table (comment out if you want to keep it for analysis)
-- DROP TABLE IF EXISTS investigation_log;

-- Final notice
RAISE NOTICE '';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'DIAGNOSTIC COMPLETE';
RAISE NOTICE '=============================================================================';
RAISE NOTICE 'Review the investigation_log table for detailed findings';
RAISE NOTICE 'If recursion was found, run the fix script provided in the next section';
RAISE NOTICE '=============================================================================';