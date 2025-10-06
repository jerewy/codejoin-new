"use client";

import React, {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

interface ProjectSettingsProps {
  params: Promise<{
    id: string;
  }>;
}

interface ProjectFormState {
  name: string;
  description: string;
  language: string;
  status: string;
  isStarred: boolean;
  tags: string[];
  thumbnail: string | null;
}

const MAX_TAGS = 8;
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "draft", label: "Draft" },
];

const createEmptyFormState = (): ProjectFormState => ({
  name: "",
  description: "",
  language: "",
  status: "active",
  isStarred: false,
  tags: [],
  thumbnail: null,
});

const formatDate = (value: string | null): string => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    console.warn("Failed to format date", error);
    return value;
  }
};

export default function ProjectSettingsPage({
  params: paramsPromise,
}: ProjectSettingsProps) {
  const params = React.use(paramsPromise);
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  const [projectForm, setProjectForm] = useState<ProjectFormState>(() =>
    createEmptyFormState()
  );
  const [initialProject, setInitialProject] = useState<ProjectFormState | null>(
    null
  );
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [newTag, setNewTag] = useState("");

  const thumbnailObjectUrlRef = useRef<string | null>(null);

  const hasLoadedProject = initialProject !== null;
  const authUnavailable = !supabase;

  const revokeThumbnailObjectUrl = useCallback(() => {
    if (thumbnailObjectUrlRef.current) {
      URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      thumbnailObjectUrlRef.current = null;
    }
  }, []);

  const applyProjectState = useCallback((project: ProjectFormState) => {
    setProjectForm(project);
    setInitialProject(project);
    setThumbnailPreview(project.thumbnail);
    setThumbnailFile(null);
    revokeThumbnailObjectUrl();
  }, [revokeThumbnailObjectUrl]);

  const fetchProject = useCallback(async () => {
    if (!supabase) {
      setLoadError(
        "Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to manage project settings."
      );
      setIsLoadingProject(false);
      return;
    }

    setIsLoadingProject(true);
    setLoadError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setLoadError("You need to sign in to manage this project.");
        setInitialProject(null);
        setProjectForm(createEmptyFormState());
        setThumbnailPreview(null);
        return;
      }

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select(
          "id, user_id, name, description, language, status, isStarred, tags, thumbnail, created_at, updated_at"
        )
        .eq("id", params.id)
        .maybeSingle();

      if (projectError) {
        throw projectError;
      }

      if (!project) {
        setLoadError("We couldn't find that project.");
        setInitialProject(null);
        setProjectForm(createEmptyFormState());
        setThumbnailPreview(null);
        return;
      }

      if (project.user_id && project.user_id !== user.id) {
        setLoadError("You do not have permission to update this project.");
        setInitialProject(null);
        setProjectForm(createEmptyFormState());
        setThumbnailPreview(null);
        return;
      }

      const sanitizedTags = Array.isArray(project.tags)
        ? project.tags.filter((tag): tag is string => typeof tag === "string")
        : [];

      const nextState: ProjectFormState = {
        name: typeof project.name === "string" ? project.name : "",
        description:
          typeof project.description === "string" ? project.description : "",
        language:
          typeof project.language === "string" ? project.language : "",
        status:
          typeof project.status === "string" && project.status
            ? project.status
            : "active",
        isStarred: Boolean(project.isStarred),
        tags: sanitizedTags,
        thumbnail:
          typeof project.thumbnail === "string" ? project.thumbnail : null,
      };

      applyProjectState(nextState);
      setCreatedAt(project.created_at ?? null);
      setUpdatedAt(project.updated_at ?? null);
    } catch (error) {
      console.error("Failed to load project", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "We couldn't load this project. Please try again."
      );
    } finally {
      setIsLoadingProject(false);
    }
  }, [applyProjectState, params.id, supabase]);

  useEffect(() => {
    fetchProject();

    return () => {
      revokeThumbnailObjectUrl();
      // Clean up any pending file operations
      setThumbnailFile(null);
    };
  }, [fetchProject, revokeThumbnailObjectUrl]);

  // Add cleanup for component unmount
  useEffect(() => {
    return () => {
      // Ensure object URL is cleaned up when component unmounts
      revokeThumbnailObjectUrl();
    };
  }, [revokeThumbnailObjectUrl]);

  const handleNameChange = useCallback((value: string) => {
    setProjectForm((prev) => ({
      ...prev,
      name: value,
    }));
  }, []);

  const handleDescriptionChange = useCallback((value: string) => {
    setProjectForm((prev) => ({
      ...prev,
      description: value,
    }));
  }, []);

  const handleLanguageChange = useCallback((value: string) => {
    setProjectForm((prev) => ({
      ...prev,
      language: value,
    }));
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setProjectForm((prev) => ({
      ...prev,
      status: value,
    }));
  }, []);

  const handleStarredChange = useCallback((checked: boolean) => {
    setProjectForm((prev) => ({
      ...prev,
      isStarred: checked,
    }));
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmedTag = newTag.trim();

    if (!trimmedTag) {
      return;
    }

    if (projectForm.tags.includes(trimmedTag)) {
      toast({
        title: "Tag already added",
        description: `"${trimmedTag}" is already part of this project.`,
      });
      return;
    }

    if (projectForm.tags.length >= MAX_TAGS) {
      toast({
        variant: "destructive",
        title: "Tag limit reached",
        description: `You can add up to ${MAX_TAGS} tags only.`,
      });
      return;
    }

    setProjectForm((prev) => ({
      ...prev,
      tags: [...prev.tags, trimmedTag],
    }));
    setNewTag("");
  }, [newTag, projectForm.tags, toast]);

  const handleTagRemove = useCallback((tagToRemove: string) => {
    setProjectForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  }, []);

  const handleTagInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const handleThumbnailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Unsupported file",
          description: "Please choose an image file for the thumbnail.",
        });
        // Reset the file input
        event.target.value = "";
        return;
      }

      // Validate file size
      if (file.size > MAX_THUMBNAIL_SIZE) {
        toast({
          variant: "destructive",
          title: "Image too large",
          description: "Please choose an image smaller than 5MB.",
        });
        // Reset the file input
        event.target.value = "";
        return;
      }

      // Validate file extension
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

      if (!allowedExtensions.includes(extension)) {
        toast({
          variant: "destructive",
          title: "Unsupported file format",
          description: "Please use JPG, PNG, GIF, or WebP images.",
        });
        // Reset the file input
        event.target.value = "";
        return;
      }

      // Clean up previous object URL
      revokeThumbnailObjectUrl();

      // Create new object URL for preview
      const objectUrl = URL.createObjectURL(file);
      thumbnailObjectUrlRef.current = objectUrl;
      setThumbnailFile(file);
      setThumbnailPreview(objectUrl);
    },
    [revokeThumbnailObjectUrl, toast]
  );

  const handleResetThumbnail = useCallback(() => {
    revokeThumbnailObjectUrl();
    setThumbnailFile(null);
    setThumbnailPreview(initialProject?.thumbnail ?? null);

    // Also reset the file input value to allow selecting the same file again
    const fileInput = document.getElementById('project-thumbnail') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, [initialProject?.thumbnail, revokeThumbnailObjectUrl]);

  const isDirty = useMemo(() => {
    if (!initialProject) {
      return false;
    }

    const normalizedCurrent: ProjectFormState = {
      ...projectForm,
      tags: [...projectForm.tags],
      thumbnail: projectForm.thumbnail,
    };

    const normalizedInitial: ProjectFormState = {
      ...initialProject,
      tags: [...initialProject.tags],
      thumbnail: initialProject.thumbnail,
    };

    const formChanged = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedInitial);

    return formChanged || Boolean(thumbnailFile);
  }, [initialProject, projectForm, thumbnailFile]);

  const fieldsDisabled =
    isSaving ||
    isUploadingThumbnail ||
    isLoadingProject ||
    authUnavailable ||
    !hasLoadedProject;

  const tagsRemaining = Math.max(0, MAX_TAGS - projectForm.tags.length);

  const handleSave = useCallback(async () => {
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Supabase unavailable",
        description:
          "Supabase isn't configured yet. Add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to save settings.",
      });
      return;
    }

    if (!initialProject) {
      toast({
        variant: "destructive",
        title: "Nothing to save",
        description: "Load a project before saving changes.",
      });
      return;
    }

    const trimmedName = projectForm.name.trim();

    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Project name required",
        description: "Please add a project name before saving.",
      });
      return;
    }

    // Validate thumbnail file if present
    if (thumbnailFile) {
      if (!thumbnailFile.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select a valid image file.",
        });
        return;
      }

      if (thumbnailFile.size > MAX_THUMBNAIL_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      // Check authentication first
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Auth error:", userError);
        throw new Error("Authentication failed. Please sign in again.");
      }

      if (!user) {
        throw new Error("You need to sign in before saving changes.");
      }

      let thumbnailUrl = projectForm.thumbnail ?? null;
      let uploadedFilePath: string | null = null;

      // Handle thumbnail upload if a new file is selected
      if (thumbnailFile) {
        setIsUploadingThumbnail(true);
        try {
          const extension = thumbnailFile.name.split(".").pop()?.toLowerCase() ?? "png";
          const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

          if (!allowedExtensions.includes(extension)) {
            throw new Error(`Unsupported file format: ${extension}. Please use JPG, PNG, GIF, or WebP.`);
          }

          uploadedFilePath = `project-thumbnails/${params.id}-${Date.now()}.${extension}`;

          const { error: uploadError } = await supabase
            .storage
            .from("assets")
            .upload(uploadedFilePath, thumbnailFile, {
              cacheControl: "3600",
              upsert: true,
              contentType: thumbnailFile.type,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
          }

          const { data: publicUrlData } = supabase
            .storage
            .from("assets")
            .getPublicUrl(uploadedFilePath);

          thumbnailUrl = publicUrlData.publicUrl;

          if (!thumbnailUrl) {
            throw new Error("Failed to get public URL for uploaded thumbnail.");
          }
        } catch (uploadError) {
          console.error("Thumbnail upload failed:", uploadError);
          throw uploadError;
        } finally {
          setIsUploadingThumbnail(false);
        }
      }

      // Prepare update payload
      const updatePayload = {
        name: trimmedName,
        description: projectForm.description?.trim() || null,
        language: projectForm.language?.trim() || null,
        status: projectForm.status,
        isStarred: projectForm.isStarred,
        tags: projectForm.tags.filter(tag => tag.trim().length > 0),
        thumbnail: thumbnailUrl,
        updated_at: new Date().toISOString(),
      };

      // Update project in database
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update(updatePayload)
        .eq("id", params.id)
        .eq("user_id", user.id) // Ensure user owns the project
        .select(
          "name, description, language, status, isStarred, tags, thumbnail, updated_at"
        )
        .single();

      if (updateError) {
        console.error("Database update error:", updateError);

        // If upload succeeded but database update failed, clean up uploaded file
        if (uploadedFilePath) {
          try {
            await supabase.storage.from("assets").remove([uploadedFilePath]);
          } catch (cleanupError) {
            console.error("Failed to cleanup uploaded file:", cleanupError);
          }
        }

        throw new Error(`Failed to update project: ${updateError.message}`);
      }

      // Update local state with server response
      const sanitizedTags = Array.isArray(updatedProject?.tags)
        ? updatedProject.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : [];

      const latestState: ProjectFormState = {
        name: typeof updatedProject?.name === "string" ? updatedProject.name : trimmedName,
        description: typeof updatedProject?.description === "string" ? updatedProject.description : null,
        language: typeof updatedProject?.language === "string" ? updatedProject.language : null,
        status: typeof updatedProject?.status === "string" ? updatedProject.status : "active",
        isStarred: Boolean(updatedProject?.isStarred ?? false),
        tags: sanitizedTags,
        thumbnail: typeof updatedProject?.thumbnail === "string" ? updatedProject.thumbnail : null,
      };

      applyProjectState(latestState);
      setUpdatedAt(updatedProject?.updated_at ?? new Date().toISOString());

      // Clear the temporary file state
      setThumbnailFile(null);

      toast({
        title: "Project updated",
        description: "Your project settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save project:", error);

      let errorMessage = "We couldn't save your changes. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Failed to save changes",
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
      setIsUploadingThumbnail(false);
      // Always revoke object URL after save attempt
      if (thumbnailFile) {
        revokeThumbnailObjectUrl();
      }
    }
  }, [
    applyProjectState,
    initialProject,
    params.id,
    projectForm.name,
    projectForm.description,
    projectForm.language,
    projectForm.status,
    projectForm.isStarred,
    projectForm.tags,
    projectForm.thumbnail,
    thumbnailFile,
    revokeThumbnailObjectUrl,
    supabase,
    toast,
    isUploadingThumbnail,
    setIsUploadingThumbnail,
  ]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Prevent multiple submissions
      if (isSaving) {
        event.stopPropagation();
        return;
      }

      // Prevent submission if form is not dirty
      if (!isDirty) {
        toast({
          title: "No changes to save",
          description: "Make some changes before saving.",
        });
        return;
      }

      await handleSave();
    },
    [handleSave, isSaving, isDirty, toast]
  );

  const handleRetry = useCallback(() => {
    fetchProject();
  }, [fetchProject]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-screen flex-col bg-background"
    >
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center">
              <Button variant="ghost" size="icon" type="button">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to dashboard</span>
              </Button>
            </Link>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">
                Project settings
              </span>
              <span className="text-base font-semibold">
                {projectForm.name || "Untitled project"}
              </span>
            </div>
          </div>
          <Button
            type="submit"
            disabled={
              authUnavailable ||
              isSaving ||
              isUploadingThumbnail ||
              isLoadingProject ||
              !isDirty
            }
          >
            {isSaving || isUploadingThumbnail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isUploadingThumbnail ? "Uploading..." : isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </header>

      <main className="container flex-1 py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          {isLoadingProject ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-1/2" />
              </CardContent>
            </Card>
          ) : (
            <>
              {loadError && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-base">{loadError}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {authUnavailable
                        ? "Add your Supabase credentials to continue."
                        : "Check your connection or permissions and try again."}
                    </p>
                    {!authUnavailable && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        disabled={isSaving}
                      >
                        Retry
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Project information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input
                      id="project-name"
                      value={projectForm.name}
                      onChange={(event) => handleNameChange(event.target.value)}
                      placeholder="e.g. My First Awesome Project"
                      disabled={fieldsDisabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      value={projectForm.description}
                      onChange={(event) =>
                        handleDescriptionChange(event.target.value)
                      }
                      placeholder="Describe what this project is about..."
                      rows={5}
                      disabled={fieldsDisabled}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="project-language">Primary language</Label>
                      <Input
                        id="project-language"
                        value={projectForm.language}
                        onChange={(event) =>
                          handleLanguageChange(event.target.value)
                        }
                        placeholder="TypeScript"
                        disabled={fieldsDisabled}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project-status">Status</Label>
                      <Select
                        value={projectForm.status}
                        onValueChange={handleStatusChange}
                        disabled={fieldsDisabled}
                      >
                        <SelectTrigger id="project-status">
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                      <Label htmlFor="project-starred" className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Starred project
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Starred projects show up first in your dashboard.
                      </p>
                    </div>
                    <Switch
                      id="project-starred"
                      checked={projectForm.isStarred}
                      onCheckedChange={handleStarredChange}
                      disabled={fieldsDisabled}
                      aria-label="Toggle starred project"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thumbnail & tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="project-thumbnail">Project thumbnail</Label>
                    <div className="overflow-hidden rounded-lg border bg-muted">
                      {thumbnailPreview ? (
                        <img
                          src={thumbnailPreview}
                          alt="Project thumbnail preview"
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-sm">No thumbnail selected</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id="project-thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        disabled={fieldsDisabled}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleResetThumbnail}
                        disabled={fieldsDisabled || (!thumbnailFile && !thumbnailObjectUrlRef.current)}
                      >
                        Reset
                      </Button>
                      {isUploadingThumbnail && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading thumbnail...
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, or GIF up to 5MB. New uploads are stored in the
                      Supabase <code>assets</code> bucket.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label htmlFor="project-tags">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {projectForm.tags.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          No tags yet. Add up to {MAX_TAGS} tags.
                        </span>
                      ) : (
                        projectForm.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleTagRemove(tag)}
                              className="rounded-full p-1 hover:bg-background"
                              disabled={fieldsDisabled}
                              aria-label={`Remove ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id="project-tags"
                        value={newTag}
                        onChange={(event) => setNewTag(event.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Press Enter to add"
                        disabled={fieldsDisabled}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddTag}
                        disabled={fieldsDisabled}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add tag
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tagsRemaining} tag{tagsRemaining === 1 ? "" : "s"} remaining.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project metadata</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Project ID
                    </p>
                    <p className="font-mono text-sm">{params.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Created
                    </p>
                    <p className="text-sm">{formatDate(createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Last updated
                    </p>
                    <p className="text-sm">{formatDate(updatedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </form>
  );
}
