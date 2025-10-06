
      -- Drop all existing problematic policies
      DO $$
      BEGIN
        RAISE NOTICE 'Starting policy cleanup...';

        -- Drop collaborators policies
        FOR policy_rec IN
          SELECT policyname FROM pg_policies WHERE tablename = 'collaborators'
        LOOP
          EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON collaborators';
          RAISE NOTICE 'Dropped collaborators policy: %', policy_rec.policyname;
        END LOOP;

        -- Drop projects policies that reference collaborators
        FOR policy_rec IN
          SELECT policyname FROM pg_policies
          WHERE tablename = 'projects'
          AND (qual LIKE '%collaborators%' OR with_check LIKE '%collaborators%')
        LOOP
          EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_rec.policyname) || ' ON projects';
          RAISE NOTICE 'Dropped problematic projects policy: %', policy_rec.policyname;
        END LOOP;

        RAISE NOTICE 'Policy cleanup completed';
      END $$;

      -- Verify policies are dropped
      SELECT
        'POLICIES_AFTER_CLEANUP' as investigation_step,
        tablename,
        COUNT(*) as remaining_policies
      FROM pg_policies
      WHERE tablename IN ('collaborators', 'projects')
      GROUP BY tablename;
    