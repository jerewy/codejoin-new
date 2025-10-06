import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export const revalidate = 0;

// Helper function to check if user has project access
async function hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabase();
  if (!supabase) return false;

  // Check owner or admin access using the new helper function
  const { data, error } = await supabase
    .rpc('has_project_access', {
      project_uuid: projectId,
      user_uuid: userId
    });

  if (error) {
    console.error('Error checking project access:', error);
    return false;
  }

  // If not owner/admin, check if user is a collaborator
  if (!data) {
    const { data: collaborator } = await supabase
      .from('collaborators')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return !!collaborator;
  }

  return data;
}

// Helper function to check if user can manage collaborators
async function canManageCollaborators(projectId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .rpc('can_manage_collaborators', {
      project_uuid: projectId,
      user_uuid: userId
    });

  if (error) {
    console.error('Error checking collaborator management permission:', error);
    return false;
  }

  return data || false;
}

// Helper function to get user's role in project
async function getUserProjectRole(projectId: string, userId: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .rpc('get_user_project_role', {
      project_uuid: projectId,
      user_uuid: userId
    });

  if (error) {
    console.error('Error getting user role:', error);
    return null;
  }

  return data;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Verify the user is authenticated
    if (!supabase) {
      console.error("Supabase client is undefined");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("Fetching collaborators for project:", projectId, "by user:", user.id);

    // Check if user has access to this project using the new architecture
    const hasAccess = await hasProjectAccess(projectId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view collaborators for this project." },
        { status: 403 }
      );
    }

    // User has access - fetch ALL collaborators for the project
    // The new RLS policy will ensure this works without recursion
    const { data: collaboratorsData, error: collaboratorsError } = await supabase
      .from("collaborators")
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
      .eq("project_id", projectId);

    if (collaboratorsError) {
      console.error("Collaborators query failed:", {
        error: collaboratorsError,
        details: {
          message: collaboratorsError.message,
          details: collaboratorsError.details,
          hint: collaboratorsError.hint,
          code: collaboratorsError.code
        }
      });

      // Check for specific error patterns
      if (collaboratorsError.code === 'PGRST116') {
        // No collaborators found - that's OK, return empty array
        const userRole = await getUserProjectRole(projectId, user.id);
        const canManage = await canManageCollaborators(projectId, user.id);

        return NextResponse.json({
          collaborators: [],
          message: "No collaborators found for this project",
          userRole,
          canAddCollaborators: canManage
        });
      }

      return NextResponse.json(
        {
          error: "Failed to fetch collaborators",
          details: collaboratorsError.message,
          code: collaboratorsError.code
        },
        { status: 500 }
      );
    }

    // Process collaborators data
    const collaborators = collaboratorsData?.map(collaborator => ({
      user_id: collaborator.user_id,
      role: collaborator.role,
      created_at: collaborator.created_at,
      profile: collaborator.profiles || null
    })) || [];

    // Get user's role and permissions
    const [userRole, canManage] = await Promise.all([
      getUserProjectRole(projectId, user.id),
      canManageCollaborators(projectId, user.id)
    ]);

    console.log("Returning collaborators data:", {
      count: collaborators.length,
      userRole,
      canAddCollaborators: canManage
    });

    return NextResponse.json({
      collaborators,
      userRole,
      canAddCollaborators: canManage
    });

  } catch (error) {
    console.error("Unexpected error in collaborators API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, userEmail, role = "editor" } = body;

    if (!projectId || !userEmail) {
      return NextResponse.json(
        { error: "Project ID and user email are required" },
        { status: 400 }
      );
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Verify the user is authenticated
    if (!supabase) {
      console.error("Supabase client is undefined");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user can manage collaborators using the new architecture
    const canManage = await canManageCollaborators(projectId, user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Permission denied. Only project owners and admins can add collaborators." },
        { status: 403 }
      );
    }

    // Find the user to add by email
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: `No user found with email: ${userEmail}` },
        { status: 404 }
      );
    }

    // Check if user is trying to add themselves
    if (profileData.id === user.id) {
      return NextResponse.json(
        { error: "Cannot add yourself as a collaborator" },
        { status: 400 }
      );
    }

    // Check if user is already a collaborator
    const { data: existingCollaborator, error: existingError } = await supabase
      .from("collaborators")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", profileData.id)
      .single();

    if (!existingError && existingCollaborator) {
      return NextResponse.json(
        { error: `User is already a collaborator with role: ${existingCollaborator.role}` },
        { status: 409 }
      );
    }

    // Add the collaborator
    const { data: newCollaborator, error: insertError } = await supabase
      .from("collaborators")
      .insert({
        project_id: projectId,
        user_id: profileData.id,
        role
      })
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
      .single();

    if (insertError) {
      console.error("Failed to add collaborator:", insertError);
      return NextResponse.json(
        { error: "Failed to add collaborator", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Collaborator added successfully",
      collaborator: {
        user_id: newCollaborator.user_id,
        role: newCollaborator.role,
        created_at: newCollaborator.created_at,
        profile: newCollaborator.profiles
      }
    });

  } catch (error) {
    console.error("Unexpected error in POST collaborators:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { projectId, userId, role } = body;

    if (!projectId || !userId || !role) {
      return NextResponse.json(
        { error: "Project ID, user ID, and role are required" },
        { status: 400 }
      );
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Verify the user is authenticated
    if (!supabase) {
      console.error("Supabase client is undefined");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user can manage collaborators using the new architecture
    const canManage = await canManageCollaborators(projectId, user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Permission denied. Only project owners and admins can update collaborator roles." },
        { status: 403 }
      );
    }

    // Update the collaborator role
    const { data: updatedCollaborator, error: updateError } = await supabase
      .from("collaborators")
      .update({ role })
      .eq("project_id", projectId)
      .eq("user_id", userId)
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
      .single();

    if (updateError) {
      console.error("Failed to update collaborator role:", updateError);
      return NextResponse.json(
        { error: "Failed to update collaborator role", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Collaborator role updated successfully",
      collaborator: {
        user_id: updatedCollaborator.user_id,
        role: updatedCollaborator.role,
        created_at: updatedCollaborator.created_at,
        profile: updatedCollaborator.profiles
      }
    });

  } catch (error) {
    console.error("Unexpected error in PATCH collaborators:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { projectId, userId } = body;

    if (!projectId || !userId) {
      return NextResponse.json(
        { error: "Project ID and user ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Verify the user is authenticated
    if (!supabase) {
      console.error("Supabase client is undefined");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user can manage collaborators using the new architecture
    const canManage = await canManageCollaborators(projectId, user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Permission denied. Only project owners and admins can remove collaborators." },
        { status: 403 }
      );
    }

    // Get project info to prevent removing the owner
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Prevent removing the project owner
    if (userId === projectData.user_id) {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 400 }
      );
    }

    // Remove the collaborator
    const { error: deleteError } = await supabase
      .from("collaborators")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Failed to remove collaborator:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove collaborator", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Collaborator removed successfully"
    });

  } catch (error) {
    console.error("Unexpected error in DELETE collaborators:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}