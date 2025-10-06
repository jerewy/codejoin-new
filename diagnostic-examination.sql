
      -- Check current RLS policies
      SELECT
        'RLS_POLICIES_CHECK' as investigation_step,
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check,
        CASE
          WHEN qual LIKE '%collaborators%' OR with_check LIKE '%collaborators%'
          THEN 'POTENTIAL_RECURSION'
          ELSE 'CLEAN'
        END as recursion_risk
      FROM pg_policies
      WHERE tablename IN ('collaborators', 'projects')
      ORDER BY tablename, policyname;

      -- Check RLS status
      SELECT
        'RLS_STATUS_CHECK' as investigation_step,
        relname as table_name,
        relrowsecurity as rls_enabled,
        relforcerowsecurity as rls_forced
      FROM pg_class
      WHERE relname IN ('collaborators', 'projects');

      -- Check table structures
      SELECT
        'TABLE_STRUCTURE' as investigation_step,
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('collaborators', 'projects')
      ORDER BY table_name, ordinal_position;
    