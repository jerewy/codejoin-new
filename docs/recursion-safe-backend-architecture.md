# Recursion-Safe Backend Architecture for Collaborator Visibility

## Overview

This document outlines a backend architecture that prevents infinite recursion while enabling proper collaborator visibility. The key principle is **project-centric access control** rather than **collaborator-centric recursion**.

## Core Principles

### 1. Single Source of Truth
- **Projects table** is the authoritative source for access control
- **Collaborators table** is only a mapping of additional permissions
- Never use collaborators table to validate access to collaborators table

### 2. Non-Recursive Functions
- All helper functions query ONLY the projects table
- Functions are marked STABLE and SECURITY DEFINER
- No circular references between tables in RLS policies

### 3. Clear Separation of Concerns
- **Visibility**: Who can see collaborators
- **Actions**: Who can modify collaborators
- **Access**: Who can access the project at all

## Database Schema Design

### Projects Table Structure
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id), -- Project owner
  admin_ids UUID[] DEFAULT '{}', -- Array of admin user IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_owner ON projects(user_id);
CREATE INDEX idx_projects_admins ON projects USING GIN(admin_ids);
```

### Collaborators Table Structure
```sql
CREATE TABLE collaborators (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Index for performance
CREATE INDEX idx_collaborators_project_user ON collaborators(project_id, user_id);
CREATE INDEX idx_collaborators_user ON collaborators(user_id);
```

## Helper Functions (Non-Recursive)

### 1. Project Ownership Check
```sql
CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_id = user_uuid
  );
$$;
```

### 2. Project Admin Check
```sql
CREATE OR REPLACE FUNCTION is_project_admin(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_uuid = ANY(admin_ids)
  );
$$;
```

### 3. General Project Access Check
```sql
CREATE OR REPLACE FUNCTION has_project_access(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND (
      user_id = user_uuid -- Owner
      OR user_uuid = ANY(admin_ids) -- Admin
    )
  );
$$;
```

### 4. Collaborator Management Permission Check
```sql
CREATE OR REPLACE FUNCTION can_manage_collaborators(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid
    AND (
      user_id = user_uuid -- Owner can manage
      OR user_uuid = ANY(admin_ids) -- Admin can manage
    )
  );
$$;
```

## RLS Policies (Non-Recursive)

### Projects Table Policies
```sql
-- Policy 1: Full access for owners and admins
CREATE POLICY "projects_full_access_for_owners_and_admins" ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR auth.uid() = ANY(admin_ids))
  WITH CHECK (user_id = auth.uid() OR auth.uid() = ANY(admin_ids));

-- Policy 2: Read access for project collaborators
CREATE POLICY "projects_read_access_for_collaborators" ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );

-- Policy 3: Public read access (optional, based on requirements)
CREATE POLICY "projects_public_read_access" ON projects
  FOR SELECT
  TO authenticated
  USING (true); -- Only if projects should be publicly readable
```

### Collaborators Table Policies
```sql
-- Policy 1: Full access for project owners
CREATE POLICY "collaborators_full_access_for_owners" ON collaborators
  FOR ALL
  TO authenticated
  USING (is_project_owner(project_id, auth.uid()))
  WITH CHECK (is_project_owner(project_id, auth.uid()));

-- Policy 2: View access for project admins
CREATE POLICY "collaborators_view_access_for_admins" ON collaborators
  FOR SELECT
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()));

-- Policy 3: Insert access for project admins
CREATE POLICY "collaborators_insert_access_for_admins" ON collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- Policy 4: Update access for project admins
CREATE POLICY "collaborators_update_access_for_admins" ON collaborators
  FOR UPDATE
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()))
  WITH CHECK (is_project_admin(project_id, auth.uid()));

-- Policy 5: Delete access for project admins
CREATE POLICY "collaborators_delete_access_for_admins" ON collaborators
  FOR DELETE
  TO authenticated
  USING (is_project_admin(project_id, auth.uid()));

-- Policy 6: View access for collaborators (the key non-recursive policy)
CREATE POLICY "collaborators_view_access_for_collaborators" ON collaborators
  FOR SELECT
  TO authenticated
  USING (
    -- User can see collaborators if they have any project access
    has_project_access(project_id, auth.uid())
    OR
    -- OR if they are explicitly listed as a collaborator
    user_id = auth.uid()
  );
```

## API Layer Implementation

### Service Layer Architecture

```typescript
// services/projectAccessService.ts
export class ProjectAccessService {
  // Check if user has any access to project
  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .rpc('has_project_access', {
        project_uuid: projectId,
        user_uuid: userId
      });
    return data || false;
  }

  // Check if user can manage collaborators
  async canManageCollaborators(projectId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .rpc('can_manage_collaborators', {
        project_uuid: projectId,
        user_uuid: userId
      });
    return data || false;
  }

  // Get user's role in project
  async getUserRole(projectId: string, userId: string): Promise<string> {
    // Check if owner first
    const { data: isOwner } = await supabase
      .rpc('is_project_owner', {
        project_uuid: projectId,
        user_uuid: userId
      });
    if (isOwner) return 'owner';

    // Check if admin
    const { data: isAdmin } = await supabase
      .rpc('is_project_admin', {
        project_uuid: projectId,
        user_uuid: userId
      });
    if (isAdmin) return 'admin';

    // Check collaborator role
    const { data: collaborator } = await supabase
      .from('collaborators')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return collaborator?.role || null;
  }
}
```

### Collaborator Service

```typescript
// services/collaboratorService.ts
export class CollaboratorService {
  private accessService = new ProjectAccessService();

  async getCollaborators(projectId: string, userId: string) {
    // First, verify user has access to the project
    const hasAccess = await this.accessService.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // If user has access, return ALL collaborators for the project
    const { data: collaborators, error } = await supabase
      .from('collaborators')
      .select(`
        user_id,
        role,
        created_at,
        profiles (
          id,
          email,
          full_name,
          user_avatar
        )
      `)
      .eq('project_id', projectId);

    if (error) throw error;

    // Get user's role for response
    const userRole = await this.accessService.getUserRole(projectId, userId);
    const canManage = await this.accessService.canManageCollaborators(projectId, userId);

    return {
      collaborators,
      userRole,
      canAddCollaborators: canManage
    };
  }

  async addCollaborator(projectId: string, userEmail: string, role: string, userId: string) {
    // Check if user can manage collaborators
    const canManage = await this.accessService.canManageCollaborators(projectId, userId);
    if (!canManage) {
      throw new Error('Permission denied');
    }

    // Find user to add
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (!profile) {
      throw new Error('User not found');
    }

    // Add collaborator
    const { data, error } = await supabase
      .from('collaborators')
      .insert({
        project_id: projectId,
        user_id: profile.id,
        role
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

## Error Handling and Validation

### Input Validation
```typescript
// utils/validation.ts
export const validateCollaboratorRole = (role: string): boolean => {
  return ['admin', 'editor', 'viewer'].includes(role);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
```

### Error Types
```typescript
// utils/errors.ts
export class AccessDeniedError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
    this.name = 'ProjectNotFoundError';
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('User not found');
    this.name = 'UserNotFoundError';
  }
}

export class CollaboratorExistsError extends Error {
  constructor() {
    super('User is already a collaborator');
    this.name = 'CollaboratorExistsError';
  }
}
```

## Performance Optimization

### Database Indexes
1. **Projects table**:
   - Primary key on id
   - Index on user_id (for owner lookups)
   - GIN index on admin_ids (for admin lookups)

2. **Collaborators table**:
   - Composite primary key on (project_id, user_id)
   - Index on user_id (for reverse lookups)

### Query Optimization
1. Use EXISTS queries instead of JOINs for permission checks
2. Batch collaborator lookups when possible
3. Cache project metadata for frequently accessed projects

### Caching Strategy
```typescript
// services/cacheService.ts
export class CacheService {
  private cache = new Map<string, { data: any; expires: number }>();

  async getProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const key = `project_access:${projectId}:${userId}`;
    const cached = this.cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const access = await this.accessService.hasProjectAccess(projectId, userId);
    this.cache.set(key, { data: access, expires: Date.now() + 300000 }); // 5 minutes

    return access;
  }
}
```

## Security Considerations

### 1. SQL Injection Prevention
- Use parameterized queries
- Use Supabase RPC functions for complex operations
- Validate all inputs

### 2. Authorization Checks
- Always verify user身份 before any operation
- Check permissions at multiple layers (API, service, database)
- Use principle of least privilege

### 3. Audit Logging
```typescript
// services/auditService.ts
export class AuditService {
  async logCollaboratorAction(
    action: 'add' | 'remove' | 'update',
    projectId: string,
    actorId: string,
    targetUserId: string,
    metadata?: any
  ) {
    await supabase
      .from('audit_logs')
      .insert({
        action,
        resource_type: 'collaborator',
        resource_id: projectId,
        actor_id: actorId,
        target_user_id: targetUserId,
        metadata,
        created_at: new Date().toISOString()
      });
  }
}
```

## Testing Strategy

### Unit Tests
- Test each helper function with various inputs
- Test permission checks with different user roles
- Test edge cases and error conditions

### Integration Tests
- Test complete collaborator workflows
- Test RLS policies with different user contexts
- Test API endpoints with authentication

### Performance Tests
- Test query performance with large numbers of collaborators
- Test concurrent access patterns
- Test memory usage and caching effectiveness

This architecture provides a robust, scalable, and secure foundation for collaborator visibility while completely eliminating the risk of infinite recursion.