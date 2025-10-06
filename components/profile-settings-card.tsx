"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { User, Camera, Loader2, Trash2 } from "lucide-react";

import { getSupabaseClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProfileFormState = {
  name: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  user_avatar: string | null;
};

const createEmptyProfile = (): ProfileFormState => ({
  name: "",
  email: "",
  bio: "",
  location: "",
  website: "",
  user_avatar: null,
});

const ensureString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function ProfileSettingsCard() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileFormState>(createEmptyProfile);
  const [initialEmail, setInitialEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);

  const fetchProfile = useCallback(async () => {
    if (!supabase) {
      setProfile(createEmptyProfile());
      setInitialEmail("");
      setUserId(null);
      setErrorMessage("Authentication is currently unavailable.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Failed to fetch Supabase user", error);
        setProfile(createEmptyProfile());
        setInitialEmail("");
        setUserId(null);
        setErrorMessage("We couldn't load your profile right now.");
        toast({
          variant: "destructive",
          title: "Failed to load profile",
          description: error.message,
        });
        return;
      }

      const user = data?.user;

      if (!user) {
        setProfile(createEmptyProfile());
        setInitialEmail("");
        setUserId(null);
        setErrorMessage("You need to sign in to manage your profile.");
        return;
      }

      setUserId(user.id);

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const nextProfile: ProfileFormState = {
        name:
          ensureString(metadata.full_name) ||
          ensureString(metadata.fullName) ||
          ensureString(metadata.name) ||
          "",
        email: user.email ?? "",
        bio: ensureString(metadata.bio),
        location: ensureString(metadata.location),
        website: ensureString(metadata.website),
        user_avatar: ensureString(metadata.user_avatar) || null,
      };

      const { data: profileRow, error: profileRowError } = await supabase
        .from("profiles")
        .select("full_name, email, user_avatar")
        .eq("id", user.id)
        .maybeSingle();

      if (profileRowError && profileRowError.code !== "PGRST116") {
        console.error("Failed to load profile row", profileRowError);
        toast({
          variant: "destructive",
          title: "Profile details unavailable",
          description: "Some profile fields could not be loaded.",
        });
      }

      if (profileRow) {
        nextProfile.name = profileRow.full_name ?? nextProfile.name;
        nextProfile.email = profileRow.email ?? nextProfile.email;
        nextProfile.user_avatar = profileRow.user_avatar ?? nextProfile.user_avatar;
      }

      setProfile(nextProfile);
      setInitialEmail(nextProfile.email);
      setErrorMessage(null);
    } catch (error) {
      console.error("Unexpected error loading profile", error);
      setProfile(createEmptyProfile());
      setInitialEmail("");
      setUserId(null);
      setErrorMessage("We couldn't load your profile right now.");
      toast({
        variant: "destructive",
        title: "Failed to load profile",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchProfile();
        } else {
          setUserId(null);
          setProfile(createEmptyProfile());
          setInitialEmail("");
          setErrorMessage("You need to sign in to manage your profile.");
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!supabase) {
        toast({
          variant: "destructive",
          title: "Authentication unavailable",
          description:
            "Supabase environment variables are not configured. Please contact an administrator.",
        });
        return;
      }

      if (!userId) {
        toast({
          variant: "destructive",
          title: "No active session",
          description: "Sign in to update your profile.",
        });
        return;
      }

      setIsSaving(true);

      try {
        const trimmedEmail = profile.email.trim();
        const emailChanged = trimmedEmail !== initialEmail.trim();
        const updatePayload: Parameters<typeof supabase.auth.updateUser>[0] = {
          data: {
            full_name: profile.name || null,
            bio: profile.bio || null,
            location: profile.location || null,
            website: profile.website || null,
          },
        };

        if (emailChanged && trimmedEmail.length > 0) {
          updatePayload.email = trimmedEmail;
        }

        const { error: updateError } = await supabase.auth.updateUser(updatePayload);
        if (updateError) {
          throw updateError;
        }

        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              full_name: profile.name || null,
              email: profile.email || null,
            },
            { onConflict: "id" }
          );

        if (upsertError) {
          throw upsertError;
        }

        await fetchProfile();

        toast({
          title: "Profile updated",
          description: emailChanged
            ? "Changes saved. Confirm the email update from your inbox to finalize it."
            : "Your profile changes have been saved.",
        });
      } catch (error) {
        console.error("Failed to update profile", error);
        toast({
          variant: "destructive",
          title: "Unable to update profile",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [fetchProfile, initialEmail, profile, supabase, toast, userId]
  );

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      if (!supabase || !userId) {
        toast({
          variant: "destructive",
          title: "Authentication unavailable",
          description: "Please sign in to upload an avatar.",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, or WebP).",
        });
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select an image smaller than 2MB.",
        });
        return;
      }

      setIsUploadingAvatar(true);

      try {
        const formData = new FormData();
        formData.append("avatar", file);
        formData.append("userId", userId);

        const response = await fetch("/api/settings/avatar", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Upload failed");
        }

        // Update local state with new avatar URL
        setProfile((prev) => ({
          ...prev,
          user_avatar: result.avatarUrl,
        }));

        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated successfully.",
        });
      } catch (error) {
        console.error("Avatar upload error:", error);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [supabase, userId, toast]
  );

  const handleAvatarRemove = useCallback(async () => {
    if (!supabase || !userId) {
      toast({
        variant: "destructive",
        title: "Authentication unavailable",
        description: "Please sign in to remove your avatar.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/settings/avatar?userId=${userId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Removal failed");
      }

      // Update local state
      setProfile((prev) => ({
        ...prev,
        user_avatar: null,
      }));

      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed successfully.",
      });
    } catch (error) {
      console.error("Avatar removal error:", error);
      toast({
        variant: "destructive",
        title: "Removal failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }, [supabase, userId, toast]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleAvatarUpload(file);
      }
    },
    [handleAvatarUpload]
  );

  const isDisabled = isLoading || isSaving || !userId || !supabase;
  const actionLabel = isLoading
    ? "Loading..."
    : isSaving
    ? "Saving..."
    : "Save Changes";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information and public profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full bg-primary/10 overflow-hidden group">
              {profile.user_avatar ? (
                <img
                  src={profile.user_avatar}
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
              )}

              {/* Upload overlay */}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={isDisabled || isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Change Avatar
                    </>
                  )}
                </Button>

                {profile.user_avatar && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isDisabled || isUploadingAvatar}
                    onClick={handleAvatarRemove}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG, GIF, or WebP. Max size 2MB.
              </p>
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                disabled={isDisabled}
                value={profile.name}
                onChange={(event) =>
                  setProfile({ ...profile, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                disabled={isDisabled}
                value={profile.email}
                onChange={(event) =>
                  setProfile({ ...profile, email: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City, Country"
                disabled={isDisabled}
                value={profile.location}
                onChange={(event) =>
                  setProfile({ ...profile, location: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://your-site.dev"
                disabled={isDisabled}
                value={profile.website}
                onChange={(event) =>
                  setProfile({ ...profile, website: event.target.value })
                }
              />
              {profile.website && profile.website.trim() && !isValidUrl(profile.website) && (
                <p className="text-xs text-destructive">
                  Please enter a valid URL (e.g., https://your-site.dev)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">
              Bio
              <span className="text-xs text-muted-foreground ml-2">
                ({profile.bio.length}/200)
              </span>
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              disabled={isDisabled}
              value={profile.bio}
              maxLength={200}
              onChange={(event) =>
                setProfile({ ...profile, bio: event.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Brief description for your profile. Max 200 characters.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isDisabled}>
              {actionLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
