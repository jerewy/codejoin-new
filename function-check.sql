
      SELECT
        'HELPER_FUNCTIONS_CHECK' as investigation_step,
        proname as function_name,
        prosrc as function_source,
        provolatile as volatility
      FROM pg_proc
      WHERE proname IN ('is_project_owner', 'is_project_admin', 'user_has_project_access', 'is_project_collaborator')
      ORDER BY proname;
    