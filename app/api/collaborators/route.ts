import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export const revalidate = 0;

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

    // First, verify the user is authenticated
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

    // Query collaborators with detailed error logging
    const { data: collaboratorsData, error: collaboratorsError } = await supabase
      .from("collaborators")
      .select("user_id, role, created_at")
      .eq("project_id", projectId);

    console.log("Collaborators query result:", {
      data: collaboratorsData,
      error: collaboratorsError,
      projectId,
      userId: user.id
    });

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
        return NextResponse.json({
          collaborators: [],
          message: "No collaborators found for this project",
          userRole: "owner", // Assume owner if they can query the project
          canAddCollaborators: true
        });
      }

      // Check for RLS policy violations
      if (collaboratorsError.message?.includes('permission denied') ||
          collaboratorsError.code === '42501') {
        return NextResponse.json(
          {
            error: "Permission denied. You don't have access to view collaborators for this project.",
            code: "PERMISSION_DENIED"
          },
          { status: 403 }
        );
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

    // If no collaborators found, we still need to show the project owner
    if (!collaboratorsData || collaboratorsData.length === 0) {
      console.log("No collaborators found for project:", projectId);

      // Check if user is the project owner and get project data
      const { data: projectData } = await supabase
        .from("projects")
        .select("user_id, admin_ids")
        .eq("id", projectId)
        .single();

      const isOwner = projectData?.user_id === user.id;
      const isAdmin = projectData?.admin_ids?.includes(user.id);

      // Always include the project owner in the response
      const collaborators = [];
      if (projectData?.user_id) {
        // Get owner's profile data
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("id, email, full_name, user_avatar")
          .eq("id", projectData.user_id)
          .single();

        collaborators.push({
          user_id: projectData.user_id,
          role: "owner",
          created_at: null,
          profile: ownerProfile || null
        });
      }

      return NextResponse.json({
        collaborators,
        message: collaborators.length === 1 ? "Only project owner found" : "No collaborators found for this project",
        userRole: isOwner ? "owner" : (isAdmin ? "admin" : null),
        canAddCollaborators: isOwner || isAdmin
      });
    }

    // Fetch profiles for all collaborators
    const collaboratorIds = collaboratorsData.map(c => c.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, user_avatar")
      .in("id", collaboratorIds);

    if (profilesError) {
      console.warn("Failed to fetch profiles for collaborators:", profilesError);
      // Continue without profile data
    }

    // Check user's role for this project and get project data
    const { data: projectData } = await supabase
      .from("projects")
      .select("user_id, admin_ids")
      .eq("id", projectId)
      .single();

    const isOwner = projectData?.user_id === user.id;
    const isAdmin = projectData?.admin_ids?.includes(user.id);
    const userCollaboratorRole = collaboratorsData.find(c => c.user_id === user.id)?.role;

    let userRole = null;
    if (isOwner) userRole = "owner";
    else if (isAdmin) userRole = "admin";
    else if (userCollaboratorRole) userRole = userCollaboratorRole;

    // Combine collaborator data with profiles
    const collaborators = collaboratorsData.map(collaborator => ({
      ...collaborator,
      profile: profilesData?.find(profile => profile.id === collaborator.user_id) || null
    }));

    // Add project owner to the collaborators list if they're not already there
    if (projectData?.user_id) {
      const ownerExists = collaborators.some(c => c.user_id === projectData.user_id);
      if (!ownerExists) {
        // Get owner's profile data
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("id, email, full_name, user_avatar")
          .eq("id", projectData.user_id)
          .single();

        collaborators.unshift({
          user_id: projectData.user_id,
          role: "owner",
          created_at: null, // Owner doesn't have a created_at in collaborators table
          profile: ownerProfile || null
        });
      }
    }

    console.log("Returning collaborators data:", {
      count: collaborators.length,
      userRole,
      canAddCollaborators: isOwner || isAdmin
    });

    return NextResponse.json({
      collaborators,
      userRole,
      canAddCollaborators: isOwner || isAdmin
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

    // Check if user has permission to add collaborators (owner or admin)
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("user_id, admin_ids")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const isOwner = projectData.user_id === user.id;
    const isAdmin = projectData.admin_ids?.includes(user.id);

    if (!isOwner && !isAdmin) {
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
      .select()
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
      collaborator: newCollaborator
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

    // Check if user has permission to update collaborators (owner or admin)
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("user_id, admin_ids")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const isOwner = projectData.user_id === user.id;
    const isAdmin = projectData.admin_ids?.includes(user.id);

    if (!isOwner && !isAdmin) {
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
      .select()
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
      collaborator: updatedCollaborator
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

    // Check if user has permission to remove collaborators (owner or admin)
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("user_id, admin_ids")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const isOwner = projectData.user_id === user.id;
    const isAdmin = projectData.admin_ids?.includes(user.id);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Permission denied. Only project owners and admins can remove collaborators." },
        { status: 403 }
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