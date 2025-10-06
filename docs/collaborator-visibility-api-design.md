# Collaborator Visibility API Design

## Overview

This document outlines the API design for a collaborator visibility system that prevents infinite recursion while enabling proper team collaboration.

## API Endpoints

### GET /api/collaborators?projectId={uuid}

**Purpose**: Retrieve all collaborators for a project that the current user can see

**Access Logic:**
1. Verify user is authenticated
2. Check if user has ANY access to the project (owner, admin, or collaborator)
3. Return ALL collaborators for the project (not just filtered ones)

**Response Structure:**
```json
{
  "collaborators": [
    {
      "user_id": "uuid",
      "role": "owner|admin|editor|viewer",
      "created_at": "timestamp",
      "profile": {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "John Doe",
        "user_avatar": "url"
      }
    }
  ],
  "userRole": "owner|admin|editor|viewer|null",
  "canAddCollaborators": true,
  "projectInfo": {
    "id": "uuid",
    "name": "Project Name",
    "ownerId": "uuid"
  }
}
```

### POST /api/collaborators

**Purpose**: Add a new collaborator to a project

**Access Requirements:**
- User must be project owner or admin
- Cannot add the project owner as a collaborator
- Cannot add someone who is already a collaborator

**Request Body:**
```json
{
  "projectId": "uuid",
  "userEmail": "user@example.com",
  "role": "editor|viewer"
}
```

### PATCH /api/collaborators

**Purpose**: Update collaborator role

**Access Requirements:**
- User must be project owner or admin
- Cannot modify the project owner's role

**Request Body:**
```json
{
  "projectId": "uuid",
  "userId": "uuid",
  "role": "admin|editor|viewer"
}
```

### DELETE /api/collaborators

**Purpose**: Remove a collaborator from a project

**Access Requirements:**
- User must be project owner or admin
- Cannot remove the project owner

**Request Body:**
```json
{
  "projectId": "uuid",
  "userId": "uuid"
}
```

## Security Implementation

### 1. Project Access Validation

Before any collaborator operation, validate that the user has project access:

```sql
-- Check if user has ANY access to project
SELECT EXISTS (
  SELECT 1 FROM projects
  WHERE id = $1
  AND (
    user_id = $2 -- Owner
    OR $2 = ANY(admin_ids) -- Admin
  )
) OR EXISTS (
  -- Check if user is explicitly listed as collaborator
  SELECT 1 FROM collaborators
  WHERE project_id = $1 AND user_id = $2
) as has_access;
```

### 2. Action Permission Validation

Separate validation for different actions:

```sql
-- Can add/update/remove collaborators (owners and admins only)
SELECT EXISTS (
  SELECT 1 FROM projects
  WHERE id = $1
  AND (
    user_id = $2 -- Owner
    OR $2 = ANY(admin_ids) -- Admin
  )
) as can_manage_collaborators;
```

### 3. Visibility Logic

All project participants can see all other participants:

```sql
-- If user has any project access, show all collaborators
SELECT
  c.user_id,
  c.role,
  c.created_at,
  p.email,
  p.full_name,
  p.user_avatar
FROM collaborators c
JOIN profiles p ON c.user_id = p.id
WHERE c.project_id = $1
-- No filtering - return all collaborators for the project
```

## Error Handling

### 401 Unauthorized
- User not authenticated

### 403 Forbidden
- User doesn't have project access
- User doesn't have permission for specific action

### 404 Not Found
- Project not found
- User to add not found

### 409 Conflict
- User already exists as collaborator

### 500 Internal Server Error
- Database errors
- Unexpected failures

## Performance Considerations

1. **Database Indexes**:
   - Primary key indexes on (project_id, user_id)
   - Index on projects.user_id
   - GIN index on projects.admin_ids

2. **Query Optimization**:
   - Use simple EXISTS queries instead of complex joins
   - Avoid recursive policy checks
   - Cache frequently accessed project metadata

3. **Rate Limiting**:
   - Implement rate limiting on collaborator management endpoints
   - Prevent abuse of collaborator addition/removal

## Monitoring and Logging

1. **Audit Logging**:
   - Log all collaborator addition/removal actions
   - Track who performed what action and when

2. **Error Monitoring**:
   - Monitor for RLS policy violations
   - Track infinite recursion attempts
   - Monitor permission denials

3. **Usage Metrics**:
   - Track collaborator list access patterns
   - Monitor permission validation performance