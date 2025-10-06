import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Helper function to create Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Allowed file types and max size
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createSupabaseClient();

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: "Missing file or user ID" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    // Generate unique file name
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `avatars/${userId}-${Date.now()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("assets")
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    // Update user metadata and profiles table
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { user_avatar: avatarUrl } }
    );

    if (updateError) {
      console.error("Metadata update error:", updateError);
      // Try to delete the uploaded file if metadata update fails
      await supabase.storage.from("assets").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to update user metadata: " + updateError.message },
        { status: 500 }
      );
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ user_avatar: avatarUrl })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // This is not critical, so we'll log but not fail
      console.warn("Failed to update profiles table:", profileError);
    }

    return NextResponse.json({
      success: true,
      avatarUrl,
      message: "Avatar uploaded successfully",
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get current user to find avatar URL
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user.user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const currentAvatarUrl = user.user.user_metadata?.user_avatar;

    if (currentAvatarUrl) {
      // Extract file path from URL
      const urlParts = currentAvatarUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `avatars/${fileName}`;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("assets")
        .remove([filePath]);

      if (deleteError) {
        console.error("Storage delete error:", deleteError);
        // Continue anyway, as it's not critical
      }
    }

    // Update user metadata to remove avatar
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { user_avatar: null } }
    );

    if (updateError) {
      console.error("Metadata update error:", updateError);
      return NextResponse.json(
        { error: "Failed to remove avatar: " + updateError.message },
        { status: 500 }
      );
    }

    // Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ user_avatar: null })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      console.warn("Failed to update profiles table:", profileError);
    }

    return NextResponse.json({
      success: true,
      message: "Avatar removed successfully",
    });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}