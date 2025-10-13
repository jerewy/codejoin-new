"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Share2,
  Copy,
  Eye,
  Edit3,
  Trash2,
  UserPlus,
  Lock,
  Loader2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface ProjectSharingModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type SharedUserRole = "viewer" | "editor" | "admin" | "owner";

const ROLE_OPTIONS: ReadonlyArray<{
  value: SharedUserRole;
  label: string;
}> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

const getRoleLabel = (role: SharedUserRole) => {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "editor":
      return "Editor";
    case "viewer":
    default:
      return "Viewer";
  }
};

interface SharedUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role: SharedUserRole;
  addedAt?: Date;
}

export default function ProjectSharingModal({
  projectId,
  projectName,
  isOpen,
  onOpenChange,
}: ProjectSharingModalProps) {
  const supabase = getSupabaseClient();
  const [shareLink, setShareLink] = useState<string>("");
  const [linkAccess, setLinkAccess] = useState<"private" | "view" | "edit">(
    "private"
  );
  const [emailToAdd, setEmailToAdd] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<SharedUserRole>("viewer");
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isSupabaseUnavailable, setIsSupabaseUnavailable] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<SharedUserRole | null>(null);
  const [canAddCollaborators, setCanAddCollaborators] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShareLink(`${window.location.origin}/project/${projectId}`);
  }, [projectId]);

  // Helper function to load users - extracted from useEffect for reuse
  const loadUsers = useCallback(async () => {
    if (!projectId) {
      console.warn("Cannot load users: projectId missing");
      return;
    }

    setIsLoadingUsers(true);
    console.log("Loading collaborators for project:", projectId);

    try {
      // Get current user info locally first for better UX
      let currentUserData = null;
      if (supabase && supabase.auth) {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();
          if (!authError && user) {
            currentUserData = { id: user.id, email: user.email || "" };
            setCurrentUser(currentUserData);
          }
        } catch (authError) {
          console.warn("Failed to get current user locally:", authError);
        }
      }

      const response = await fetch(
        `/api/collaborators?projectId=${projectId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error loading collaborators:", errorData);

        // Handle specific error cases
        if (response.status === 401) {
          toast.error("Please sign in to view collaborators");
          setCurrentUser(null);
          setUserRole(null);
          setCanAddCollaborators(false);
        } else if (response.status === 403) {
          toast.error(
            "You don't have permission to view collaborators for this project"
          );
        } else {
          toast.error(
            `Failed to load collaborators: ${
              errorData.error || "Unknown error"
            }`
          );
        }

        setSharedUsers([]);
        return;
      }

      // Type definition for the API response
      interface CollaboratorsApiResponse {
        collaborators: Array<{
          user_id: string;
          role: string | null;
          created_at: string | null;
          profile: {
            id: string;
            email: string | null;
            full_name: string | null;
            user_avatar: string | null;
          } | null;
        }>;
        userRole: SharedUserRole | null;
        canAddCollaborators: boolean;
        message?: string;
      }

      const result = (await response.json()) as CollaboratorsApiResponse;
      console.log("API response for loadUsers:", result);

      const collaboratorsData = result.collaborators || [];

      // Update user role and permissions based on API response
      if (result.userRole) {
        setUserRole(result.userRole);
        setCanAddCollaborators(result.canAddCollaborators);
      }

      if (!collaboratorsData || collaboratorsData.length === 0) {
        console.log("No collaborators found for project:", projectId);
        setSharedUsers([]);
        return;
      }

      // The API already returns combined data with profiles
      const data = collaboratorsData;
      console.log("API returned collaborators data:", { data });

      type CollaboratorRow = {
        user_id: string;
        role: string | null;
        created_at: string | null;
        profile: {
          id: string;
          email: string | null;
          full_name: string | null;
          user_avatar: string | null;
        } | null;
      };

      const mappedUsers = (data as unknown as CollaboratorRow[]).map((row) => {
        const resolveRole = (value: string | null): SharedUserRole => {
          if (value === "owner") {
            return "owner";
          } else if (value === "admin") {
            return "admin";
          } else if (value === "editor") {
            return "editor";
          }
          return "viewer";
        };

        const profile = row.profile;

        return {
          id: row.user_id,
          email: profile?.email ?? "",
          name: profile?.full_name,
          avatar: profile?.user_avatar,
          role: resolveRole(row.role),
          addedAt: row.created_at ? new Date(row.created_at) : undefined,
        } satisfies SharedUser;
      });

      setSharedUsers(mappedUsers);
    } catch (error) {
      console.error("Failed to load collaborators:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to load collaborators: ${errorMessage}`);
      setSharedUsers([]);
      setCurrentUser(null);
      setUserRole(null);
      setCanAddCollaborators(false);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    console.log(
      "ProjectSharingModal opened, checking Supabase client:",
      !!supabase
    );

    if (!supabase) {
      console.error("Supabase client is not available");
      setIsSupabaseUnavailable(true);
      toast.error(
        "Database connection not available. Please refresh the page."
      );
      return;
    }

    setIsSupabaseUnavailable(false);

    // Use the loadUsers function instead of duplicating the logic
    loadUsers();
  }, [isOpen, projectId, supabase, loadUsers]);

  const addUserByEmail = useCallback(async () => {
    // Initial validation
    if (!emailToAdd.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!supabase) {
      toast.error(
        "Database connection not available. Please refresh the page."
      );
      return;
    }

    if (!canAddCollaborators) {
      toast.error(
        "You don't have permission to add collaborators to this project"
      );
      return;
    }

    // Validate email format
    if (!isValidEmail(emailToAdd)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const normalizedEmail = emailToAdd.toLowerCase().trim();
    setIsAddingUser(true);

    try {
      // Step 1: Check if user is trying to add themselves
      if (currentUser && normalizedEmail === currentUser.email.toLowerCase()) {
        toast.error("You cannot add yourself as a collaborator");
        return;
      }

      // Step 2: Use the API to add the collaborator
      toast.loading(
        `Adding ${normalizedEmail} as ${getRoleLabel(roleToAdd)}...`,
        { id: "add-collaborator" }
      );

      console.log("Adding collaborator via API:", {
        projectId,
        userEmail: normalizedEmail,
        role: roleToAdd,
      });

      const response = await fetch("/api/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          userEmail: normalizedEmail,
          role: roleToAdd,
        }),
      });

      toast.dismiss("add-collaborator");

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error adding collaborator:", errorData);

        // Handle specific error cases from the API
        if (response.status === 401) {
          toast.error("Please sign in to add collaborators");
        } else if (response.status === 403) {
          toast.error(
            "Permission denied. Only project owners and admins can add collaborators."
          );
        } else if (response.status === 404) {
          toast.error(
            `No user found with email "${normalizedEmail}". Ask them to sign up first.`
          );
        } else if (response.status === 409) {
          toast.error(`That user is already a collaborator on this project.`);
        } else {
          toast.error(errorData.error || "Failed to add collaborator");
        }
        return;
      }

      const result = await response.json();
      console.log("Collaborator added successfully:", result);

      // Step 3: Refresh the collaborators list to get the updated data
      await loadUsers();

      // Clear the form
      setEmailToAdd("");
      setRoleToAdd("viewer");

      // Success message
      toast.success(
        `${normalizedEmail} has been added as a ${getRoleLabel(roleToAdd)}!`,
        {
          description: `They now have access to "${projectName}"`,
          duration: 4000,
        }
      );
    } catch (error) {
      console.error("Unexpected error adding collaborator:", error);
      toast.error(
        "An unexpected error occurred while adding the collaborator. Please try again."
      );
    } finally {
      setIsAddingUser(false);
    }
  }, [
    emailToAdd,
    projectId,
    roleToAdd,
    supabase,
    currentUser,
    canAddCollaborators,
    projectName,
    loadUsers,
  ]);

  const removeUser = useCallback(
    async (userId: string) => {
      if (!canAddCollaborators) {
        toast.error(
          "You don't have permission to remove collaborators from this project"
        );
        return;
      }

      // Prevent removing yourself
      if (currentUser && userId === currentUser.id) {
        toast.error("You cannot remove yourself from the project");
        return;
      }

      setRemovingUserId(userId);

      try {
        const response = await fetch("/api/collaborators", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            userId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API error removing collaborator:", errorData);

          if (response.status === 401) {
            toast.error("Please sign in to remove collaborators");
          } else if (response.status === 403) {
            toast.error("You don't have permission to remove collaborators");
          } else {
            toast.error(errorData.error || "Failed to remove collaborator");
          }
          return;
        }

        // Refresh the collaborators list
        await loadUsers();
        toast.success("Collaborator removed from project");
      } catch (error) {
        console.error("Unexpected error removing collaborator:", error);
        toast.error(
          "An unexpected error occurred while removing the collaborator. Please try again."
        );
      } finally {
        setRemovingUserId(null);
      }
    },
    [projectId, canAddCollaborators, currentUser, loadUsers]
  );

  const updateUserRole = useCallback(
    async (userId: string, newRole: SharedUserRole) => {
      if (!canAddCollaborators) {
        toast.error(
          "You don't have permission to update roles in this project"
        );
        return;
      }

      setUpdatingUserId(userId);

      try {
        const response = await fetch("/api/collaborators", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            userId,
            role: newRole,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API error updating collaborator role:", errorData);

          if (response.status === 401) {
            toast.error("Please sign in to update collaborator roles");
          } else if (response.status === 403) {
            toast.error("You don't have permission to update roles");
          } else {
            toast.error(
              errorData.error || "Failed to update collaborator role"
            );
          }
          return;
        }

        // Refresh the collaborators list
        await loadUsers();
        toast.success("Collaborator role updated");
      } catch (error) {
        console.error("Unexpected error updating collaborator role:", error);
        toast.error(
          "An unexpected error occurred while updating the collaborator role. Please try again."
        );
      } finally {
        setUpdatingUserId(null);
      }
    },
    [projectId, canAddCollaborators, loadUsers]
  );

  const copyShareLink = useCallback(async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  }, [shareLink]);

  const updateLinkAccess = useCallback(
    (access: "private" | "view" | "edit") => {
      setLinkAccess(access);

      if (typeof window === "undefined") {
        return;
      }

      const baseUrl = `${window.location.origin}/project/${projectId}`;
      switch (access) {
        case "view":
          setShareLink(`${baseUrl}?access=view`);
          break;
        case "edit":
          setShareLink(`${baseUrl}?access=edit`);
          break;
        default:
          setShareLink(baseUrl);
      }
    },
    [projectId]
  );

  const roleOptions = useMemo(() => [...ROLE_OPTIONS], []);

  const getRoleColor = (role: SharedUserRole) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-orange-100 text-orange-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: SharedUserRole) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3" />;
      case "admin":
        return <Lock className="h-3 w-3" />;
      case "editor":
        return <Edit3 className="h-3 w-3" />;
      case "viewer":
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  // Helper function to validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Helper function to get email validation feedback
  const getEmailValidationMessage = (email: string) => {
    if (!email.trim()) return "";
    if (!isValidEmail(email)) return "Please enter a valid email address";
    return "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{projectName}"
          </DialogTitle>
          <DialogDescription>
            Collaborate with others by sharing your project
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
            {/* Link Sharing */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-base font-medium">Share with link</Label>
                <Select value={linkAccess} onValueChange={updateLinkAccess}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Private
                      </div>
                    </SelectItem>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View only
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4" />
                        Can edit
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="flex-1" />
                <Button onClick={copyShareLink} variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {linkAccess !== "private" && (
                <p className="text-sm text-muted-foreground">
                  {linkAccess === "view"
                    ? "Anyone with this link can view the project"
                    : "Anyone with this link can view and edit the project"}
                </p>
              )}
            </div>

            <Separator />

            {/* Add People */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Add people</Label>
                {!canAddCollaborators && currentUser && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {userRole === "viewer"
                      ? "Viewers cannot add collaborators"
                      : "Only owners and admins can add collaborators"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Enter email address"
                    value={emailToAdd}
                    onChange={(e) => setEmailToAdd(e.target.value)}
                    className={`flex-1 ${
                      emailToAdd && !isValidEmail(emailToAdd)
                        ? "border-red-300 focus:border-red-500"
                        : ""
                    }`}
                    disabled={
                      isSupabaseUnavailable ||
                      isAddingUser ||
                      !canAddCollaborators
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        emailToAdd &&
                        !isAddingUser &&
                        canAddCollaborators &&
                        isValidEmail(emailToAdd)
                      ) {
                        addUserByEmail();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Select
                      value={roleToAdd}
                      onValueChange={(value: SharedUserRole) =>
                        setRoleToAdd(value)
                      }
                      disabled={
                        isSupabaseUnavailable ||
                        isAddingUser ||
                        !canAddCollaborators
                      }
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={addUserByEmail}
                      disabled={
                        !emailToAdd ||
                        isSupabaseUnavailable ||
                        isAddingUser ||
                        !canAddCollaborators
                      }
                      className="shrink-0"
                    >
                      {isAddingUser ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Email validation feedback */}
                {emailToAdd && !isValidEmail(emailToAdd) && (
                  <p className="text-sm text-red-600">
                    {getEmailValidationMessage(emailToAdd)}
                  </p>
                )}

                {/* Email addition hint */}
                {emailToAdd &&
                  isValidEmail(emailToAdd) &&
                  !isAddingUser &&
                  canAddCollaborators && (
                    <p className="text-sm text-green-600">
                      Press Enter or click Add to invite {emailToAdd}
                    </p>
                  )}
              </div>

              {isSupabaseUnavailable && (
                <p className="text-sm text-muted-foreground">
                  Configure Supabase environment variables to invite
                  collaborators.
                </p>
              )}

              {!canAddCollaborators && currentUser && (
                <p className="text-sm text-muted-foreground">
                  Only project owners and admins can add collaborators.
                </p>
              )}
            </div>

            <Separator />

            {/* Current Collaborators */}
            <div className="space-y-4">
              <Label className="text-base font-medium">
                People with access ({sharedUsers.length})
              </Label>

              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                {isLoadingUsers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading collaborators...
                  </div>
                ) : sharedUsers.length > 0 ? (
                  sharedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {user.avatar && (
                          <img
                            src={user.avatar}
                            alt={user.name || user.email}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {user.name ||
                                user.email ||
                                "Unknown collaborator"}
                            </span>
                            {currentUser && user.id === currentUser.id && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          {(user.name || user.email) && (
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`${getRoleColor(
                            user.role
                          )} flex items-center gap-1`}
                        >
                          {getRoleIcon(user.role)}
                          {getRoleLabel(user.role)}
                        </Badge>

                        {canAddCollaborators &&
                          currentUser &&
                          user.id !== currentUser.id && (
                            <>
                              <Select
                                value={user.role}
                                onValueChange={(value: SharedUserRole) =>
                                  updateUserRole(user.id, value)
                                }
                                disabled={
                                  updatingUserId === user.id ||
                                  isSupabaseUnavailable ||
                                  !canAddCollaborators
                                }
                              >
                                <SelectTrigger className="w-20 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {roleOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUser(user.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                disabled={
                                  removingUserId === user.id ||
                                  isSupabaseUnavailable ||
                                  !canAddCollaborators
                                }
                              >
                                {removingUserId === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No collaborators have been added yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex justify-end gap-2 pt-3 border-t mt-3 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
