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

type SharedUserRole = "viewer" | "editor" | "admin";

const ROLE_OPTIONS: ReadonlyArray<{
  value: SharedUserRole;
  label: string;
}> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Co-owner" },
];

const getRoleLabel = (role: SharedUserRole) => {
  switch (role) {
    case "admin":
      return "Co-owner";
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShareLink(`${window.location.origin}/project/${projectId}`);
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!supabase) {
      setIsSupabaseUnavailable(true);
      return;
    }

    setIsSupabaseUnavailable(false);
    let isActive = true;
    const fetchCollaborators = async () => {
      setIsLoadingUsers(true);

      const { data, error } = await supabase
        .from("collaborators")
        .select(
          "user_id, role, created_at, profiles ( email, full_name, user_avatar )"
        )
        .eq("project_id", projectId);

      if (!isActive) {
        return;
      }

      if (error) {
        console.error("Failed to load collaborators", error);
        toast.error("Unable to load collaborators right now.");
        setIsLoadingUsers(false);
        return;
      }

      type CollaboratorRow = {
        user_id: string;
        role: string | null;
        created_at: string | null;
        profiles: {
          email: string | null;
          full_name: string | null;
          user_avatar: string | null;
        } | null;
      };

      const mappedUsers = (data as CollaboratorRow[]).map((row) => {
        const resolveRole = (value: string | null): SharedUserRole => {
          if (value === "editor" || value === "admin") {
            return value;
          }
          return "viewer";
        };

        const profile = row.profiles;

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
      setIsLoadingUsers(false);
    };

    fetchCollaborators();

    return () => {
      isActive = false;
    };
  }, [isOpen, projectId, supabase]);

  const addUserByEmail = useCallback(async () => {
    if (!emailToAdd) {
      return;
    }

    if (!supabase) {
      toast.error("Supabase is not configured. Unable to invite collaborators.");
      return;
    }

    setIsAddingUser(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, user_avatar")
        .eq("email", emailToAdd)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to look up profile", profileError);
        toast.error("Unable to find that user right now.");
        return;
      }

      if (!profile) {
        toast.error("No user with that email exists.");
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("collaborators")
        .select("user_id")
        .eq("project_id", projectId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existingError) {
        console.error("Failed to verify collaborator", existingError);
      }

      if (existing) {
        toast.info("That user already has access to this project.");
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("collaborators")
        .insert({
          project_id: projectId,
          user_id: profile.id,
          role: roleToAdd,
        })
        .select(
          "user_id, role, created_at, profiles ( email, full_name, user_avatar )"
        )
        .single();

      if (insertError) {
        console.error("Failed to invite collaborator", insertError);
        toast.error("Could not add that collaborator. Please try again.");
        return;
      }

      const newUser: SharedUser = {
        id: inserted.user_id,
        email: inserted.profiles?.email ?? profile.email ?? "",
        name: inserted.profiles?.full_name ?? profile.full_name ?? null,
        avatar: inserted.profiles?.user_avatar ?? profile.user_avatar ?? null,
        role: roleToAdd,
        addedAt: inserted.created_at ? new Date(inserted.created_at) : new Date(),
      };

      setSharedUsers((prev) => [...prev, newUser]);
      setEmailToAdd("");
      setRoleToAdd("viewer");
      toast.success(`Invitation sent to ${newUser.email}.`);
    } finally {
      setIsAddingUser(false);
    }
  }, [emailToAdd, projectId, roleToAdd, supabase]);

  const removeUser = useCallback(
    async (userId: string) => {
      if (!supabase) {
        toast.error("Supabase is not configured. Unable to remove collaborators.");
        return;
      }

      setRemovingUserId(userId);

      try {
        const { error } = await supabase
          .from("collaborators")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId);

        if (error) {
          console.error("Failed to remove collaborator", error);
          toast.error("Could not remove that collaborator. Please try again.");
          return;
        }

        setSharedUsers((prev) => prev.filter((user) => user.id !== userId));
        toast.success("User removed from project");
      } finally {
        setRemovingUserId(null);
      }
    },
    [projectId, supabase]
  );

  const updateUserRole = useCallback(
    async (userId: string, newRole: SharedUserRole) => {
      if (!supabase) {
        toast.error("Supabase is not configured. Unable to update roles.");
        return;
      }

      setUpdatingUserId(userId);

      try {
        const { error } = await supabase
          .from("collaborators")
          .update({ role: newRole })
          .eq("project_id", projectId)
          .eq("user_id", userId);

        if (error) {
          console.error("Failed to update collaborator role", error);
          toast.error("Could not update that role. Please try again.");
          return;
        }

        setSharedUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  role: newRole,
                }
              : user
          )
        );
        toast.success("User role updated");
      } finally {
        setUpdatingUserId(null);
      }
    },
    [projectId, supabase]
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

  const roleOptions = useMemo(
    () => [
      ...ROLE_OPTIONS,
    ],
    []
  );

  const getRoleColor = (role: SharedUserRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: SharedUserRole) => {
    switch (role) {
      case "admin":
        return <Crown className="h-3 w-3" />;
      case "editor":
        return <Edit3 className="h-3 w-3" />;
      case "viewer":
      default:
        return <Eye className="h-3 w-3" />;
    }
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
                  : "Anyone with this link can view and edit the project"
                }
              </p>
            )}
          </div>

          <Separator />

          {/* Add People */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Add people</Label>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter email address"
                value={emailToAdd}
                onChange={(e) => setEmailToAdd(e.target.value)}
                className="flex-1"
                disabled={isSupabaseUnavailable || isAddingUser}
              />
              <div className="flex gap-2">
                <Select
                  value={roleToAdd}
                  onValueChange={(value: SharedUserRole) => setRoleToAdd(value)}
                  disabled={isSupabaseUnavailable || isAddingUser}
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
                  disabled={!emailToAdd || isSupabaseUnavailable || isAddingUser}
                  className="shrink-0"
                >
                  {isAddingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {isSupabaseUnavailable && (
              <p className="text-sm text-muted-foreground">
                Configure Supabase environment variables to invite collaborators.
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
                        <span className="font-medium text-sm">
                          {user.name || user.email || "Unknown collaborator"}
                        </span>
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
                        className={`${getRoleColor(user.role)} flex items-center gap-1`}
                      >
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </Badge>

                      <Select
                        value={user.role}
                        onValueChange={(value: SharedUserRole) =>
                          updateUserRole(user.id, value)
                        }
                        disabled={updatingUserId === user.id || isSupabaseUnavailable}
                      >
                        <SelectTrigger className="w-20 h-8 text-xs">
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
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUser(user.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        disabled={removingUserId === user.id || isSupabaseUnavailable}
                      >
                        {removingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
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
  )
}