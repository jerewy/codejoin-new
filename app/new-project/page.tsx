"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, X, Github, GitBranch, Folder } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { TemplateNode } from "@/lib/types";
import { starterProjects } from "@/lib/data/starter-projects";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PROJECT_THUMBNAIL_URL =
  "https://izngyuhawwlxopcdmfry.supabase.co/storage/v1/object/public/assets/project_placeholder.jpg";

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [importMethod, setImportMethod] = useState("template");
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseClient();
  const authUnavailable = !supabase;

  const MAX_TAGS = 5;
  const addTag = () => {
    // Check if the tag limit has been reached
    if (tags.length >= MAX_TAGS) {
      toast({
        variant: "destructive",
        title: "Tag limit reached",
        description: `You can only add up to ${MAX_TAGS} tags.`,
      });
      return; // Stop the function
    }

    const trimmedTag = newTag.trim();
    if (!trimmedTag) {
      return;
    }

    if (tags.includes(trimmedTag)) {
      toast({
        title: "Duplicate tag",
        description: `\"${trimmedTag}\" is already added.`,
      });
      return;
    }

    setTags([...tags, trimmedTag]);
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleCreateProject = async () => {
    if (!supabase) {
      toast({
        variant: "destructive",
        title: "Authentication unavailable",
        description:
          "Supabase environment variables are not configured. Please set them to create projects.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to create a project.");

      const template = starterProjects.find((t) => t.id === selectedTemplate);

      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName,
          description: description,
          tags: tags,
          language: template ? template.tags : [],
          status: "active",
          thumbnail: template?.thumbnail ?? DEFAULT_PROJECT_THUMBNAIL_URL,
        })
        .select()
        .single();

      if (projectError) throw projectError;
      if (!newProject) throw new Error("Project creation failed.");
      const { error: collaboratorError } = await supabase
        .from("project_collaborators")
        .insert({
          project_id: newProject.id,
          user_id: user.id,
          role: "owner",
        })
        .select("id")
        .single();

      if (collaboratorError) {
        console.warn("Failed to create owner collaborator record", collaboratorError);
      }

      // This function will handle nested structures reliably
      const createNodesRecursively = async (
        nodes: readonly TemplateNode[],
        parentId: string | null
      ) => {
        if (!nodes || nodes.length === 0) return;

        // Process nodes one by one instead of in a batch
        for (const node of nodes) {
          const { data: insertedNode, error: nodeError } = await supabase
            .from("project_nodes")
            .insert({
              project_id: newProject.id,
              name: node.name,
              type: node.type,
              content: node.content || null,
              parent_id: parentId,
            })
            .select()
            .single(); // Insert and get the single new row back

          if (nodeError) throw nodeError;

          // If the node we just created is a folder and has children,
          // immediately recurse into its children, passing the new ID.
          if (insertedNode && node.type === "folder" && node.children) {
            await createNodesRecursively(node.children, insertedNode.id);
          }
        }
      };

      if (template?.structure) {
        await createNodesRecursively([...template.structure], null);
      }

      router.push(`/project/${newProject.id}`);
    } catch (error: unknown) {
      console.error("Error creating project:", error);
      const description =
        error instanceof Error
          ? error.message
          : "We couldn't create your project. Please try again.";
      toast({
        variant: "destructive",
        title: "Failed to create project",
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportFromGithub = async () => {
    setIsLoading(true);

    // Simulate GitHub import
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Redirect to the imported project
    router.push(`/project/imported-${Date.now()}`);
  };

  const handleTemplateSelect = (templateId: string | null) => {
    if (!templateId) {
      setSelectedTemplate("");
      setProjectName("");
      setDescription("");
      setTags([]);
      return;
    }

    const template = starterProjects.find((t) => t.id === templateId);

    if (!template) {
      setSelectedTemplate("");
      setProjectName("");
      setDescription("");
      setTags([]);
      toast({
        variant: "destructive",
        title: "Template not found",
        description:
          "We couldn't load that template. Please choose another one.",
      });
      return;
    }

    setSelectedTemplate(template.id);
    setProjectName(template.name);
    setDescription(template.description);

    // Create a new, mutable copy of the readonly tags array
    setTags([...template.tags]);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        leading={
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        }
        startContent={
          <>
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              Project setup
            </span>
          </>
        }
        title="Create a new project"
        description="Start from a template or configure everything manually."
      />

      <div className="container py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Project Creation Method */}
          <Card>
            <CardHeader>
              <CardTitle>How would you like to start?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant={importMethod === "template" ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setImportMethod("template")}
                >
                  <Folder className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-medium">Use Template</div>
                    <div className="text-xs text-muted-foreground">
                      Start with a pre-built template
                    </div>
                  </div>
                </Button>
                {/* <Button
                  variant={importMethod === "github" ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setImportMethod("github")}
                >
                  <Github className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-medium">Import from GitHub</div>
                    <div className="text-xs text-muted-foreground">
                      Import an existing repository
                    </div>
                  </div>
                </Button> */}
                <Button
                  variant={importMethod === "blank" ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    setImportMethod("blank");
                    handleTemplateSelect(null);
                  }}
                >
                  <Plus className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-medium">Start Blank</div>
                    <div className="text-xs text-muted-foreground">
                      Create from scratch
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* GitHub Import */}
          {importMethod === "github" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Import from GitHub
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-url">Repository URL</Label>
                  <Input
                    id="github-url"
                    placeholder="https://github.com/username/repository"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleImportFromGithub}
                  disabled={!githubUrl || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-4 w-4 mr-2" />
                      Import Repository
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Template Selection */}
          {importMethod === "template" && (
            <Card>
              <CardHeader>
                <CardTitle>Choose a Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {starterProjects.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Button
                        key={template.id}
                        variant={
                          selectedTemplate === template.id
                            ? "default"
                            : "outline"
                        }
                        // 👇 1. Remove flexbox properties from the button
                        className="h-auto p-0"
                        // onClick={() => setSelectedTemplate(template.id)}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        {/* The div inside the Button */}
                        <div className="p-4 flex flex-col items-start gap-3 w-full h-full">
                          {/* Icon and Title/Description stay the same */}
                          <div>
                            <div
                              className={`p-2 rounded-md ${template.color} text-white`}
                            >
                              <Icon className="h-6 w-6" />
                            </div>
                          </div>
                          <div className="text-left w-full">
                            <div className="font-medium">{template.name}</div>
                            {/* ... your tooltip component for the description ... */}
                          </div>

                          {/* Add mt-auto to push this div to the bottom */}
                          <div className="flex flex-wrap gap-1 mt-auto pt-2">
                            {template.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="My Awesome Project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="visibility"
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                    />
                    <Label htmlFor="visibility" className="text-sm">
                      {isPrivate ? "Private" : "Public"}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPrivate
                      ? "Only you and invited collaborators can access this project"
                      : "Anyone can view and fork this project"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      tags.length >= MAX_TAGS
                        ? "Tag limit reached"
                        : "Add a tag..."
                    }
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                    disabled={tags.length >= MAX_TAGS} // Disable when limit is met
                  />
                  <Button
                    onClick={addTag}
                    variant="outline"
                    size="sm"
                    disabled={tags.length >= MAX_TAGS} // Disable when limit is met
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Project Button */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              onClick={handleCreateProject}
              disabled={
                !projectName ||
                (importMethod === "template" && !selectedTemplate) ||
                isLoading ||
                authUnavailable
              }
              className="min-w-32"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

