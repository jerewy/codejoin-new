
      -- Create helper functions to avoid recursion
      CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID, user_uuid UUID)
      RETURNS BOOLEAN
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM projects
          WHERE id = project_uuid AND user_id = user_uuid
        );
      $$;

      CREATE OR REPLACE FUNCTION is_project_admin(project_uuid UUID, user_uuid UUID)
      RETURNS BOOLEAN
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM projects
          WHERE id = project_uuid AND user_uuid = ANY(admin_ids)
        );
      $$;

      CREATE OR REPLACE FUNCTION user_has_project_access(project_uuid UUID, user_uuid UUID)
      RETURNS BOOLEAN
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM projects
          WHERE id = project_uuid
          AND (user_id = user_uuid OR user_uuid = ANY(admin_ids))
        );
      $$;

      -- Create clean, non-recursive policies for collaborators
      CREATE POLICY "collaborators_project_owners_full_access" ON collaborators
        FOR ALL
        TO authenticated
        USING (is_project_owner(project_id, auth.uid()))
        WITH CHECK (is_project_owner(project_id, auth.uid()));

      CREATE POLICY "collaborators_project_admins_view_access" ON collaborators
        FOR SELECT
        TO authenticated
        USING (is_project_admin(project_id, auth.uid()));

      CREATE POLICY "collaborators_project_admins_insert_access" ON collaborators
        FOR INSERT
        TO authenticated
        WITH CHECK (is_project_admin(project_id, auth.uid()));

      CREATE POLICY "collaborators_users_view_own_records" ON collaborators
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());

      CREATE POLICY "collaborators_users_with_access_view" ON collaborators
        FOR SELECT
        TO authenticated
        USING (user_has_project_access(project_id, auth.uid()));

      -- Create clean policies for projects (avoid referencing collaborators)
      CREATE POLICY "projects_users_view_own_projects" ON projects
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() OR auth.uid() = ANY(admin_ids));

      CREATE POLICY "projects_users_insert_own_projects" ON projects
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());

      CREATE POLICY "projects_users_update_own_projects" ON projects
        FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid() OR auth.uid() = ANY(admin_ids))
        WITH CHECK (user_id = auth.uid() OR auth.uid() = ANY(admin_ids));

      -- Verify new policies
      SELECT
        'NEW_POLICIES_CREATED' as investigation_step,
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename IN ('collaborators', 'projects')
      ORDER BY tablename, policyname;

      -- Test policies work
      SELECT
        'POLICY_TEST' as investigation_step,
        'collaborators' as table_tested,
        COUNT(*) as accessible_rows
      FROM collaborators
      LIMIT 1;

      SELECT
        'POLICY_TEST' as investigation_step,
        'projects' as table_tested,
        COUNT(*) as accessible_rows
      FROM projects
      LIMIT 1;
    