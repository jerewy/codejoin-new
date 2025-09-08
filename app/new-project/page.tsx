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
import {
  ArrowLeft,
  Plus,
  X,
  Github,
  GitBranch,
  Folder,
  Code,
  Palette,
  Database,
  Globe,
  Smartphone,
  Gamepad2,
  Bot,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const projectTemplates = [
  {
    id: "react-app",
    name: "React App",
    description: "Modern React application with TypeScript",
    icon: Code,
    tags: ["React", "TypeScript", "Vite"],
    color: "bg-blue-500",
  },
  {
    id: "nextjs-app",
    name: "Next.js App",
    description: "Full-stack Next.js application",
    icon: Globe,
    tags: ["Next.js", "React", "TypeScript"],
    color: "bg-black",
  },
  {
    id: "vue-app",
    name: "Vue.js App",
    description: "Vue.js application with Composition API",
    icon: Zap,
    tags: ["Vue.js", "TypeScript", "Vite"],
    color: "bg-green-500",
  },
  {
    id: "mobile-app",
    name: "React Native",
    description: "Cross-platform mobile application",
    icon: Smartphone,
    tags: ["React Native", "Expo", "TypeScript"],
    color: "bg-purple-500",
  },
  {
    id: "game",
    name: "Game Project",
    description: "2D/3D game development",
    icon: Gamepad2,
    tags: ["JavaScript", "Canvas", "WebGL"],
    color: "bg-red-500",
  },
  {
    id: "ai-project",
    name: "AI/ML Project",
    description: "Machine learning and AI project",
    icon: Bot,
    tags: ["Python", "TensorFlow", "PyTorch"],
    color: "bg-orange-500",
  },
  {
    id: "api",
    name: "REST API",
    description: "Backend API with Node.js",
    icon: Database,
    tags: ["Node.js", "Express", "MongoDB"],
    color: "bg-indigo-500",
  },
  {
    id: "static-site",
    name: "Static Website",
    description: "Static website with HTML/CSS/JS",
    icon: Palette,
    tags: ["HTML", "CSS", "JavaScript"],
    color: "bg-pink-500",
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [importMethod, setImportMethod] = useState("template");
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleCreateProject = async () => {
    setIsLoading(true);

    // Simulate project creation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Redirect to the new project
    router.push(`/project/new-project-${Date.now()}`);
  };

  const handleImportFromGithub = async () => {
    setIsLoading(true);

    // Simulate GitHub import
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Redirect to the imported project
    router.push(`/project/imported-${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
                  fill="#FF5722"
                />
                <path
                  d="M14 10L18 14M18 10L14 14"
                  stroke="#0D47A1"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M14 18L18 22M18 18L14 22"
                  stroke="#0D47A1"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-lg font-bold text-primary">CodeJoin</span>
            </div>
          </div>
          <h1 className="text-xl font-semibold">Create New Project</h1>
          <div className="w-32" /> {/* Spacer for centering */}
        </div>
      </header>

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
                <Button
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
                </Button>
                <Button
                  variant={importMethod === "blank" ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setImportMethod("blank")}
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
                  {projectTemplates.map((template) => {
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
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        {/* 👇 2. Add a new div to handle the layout */}
                        <div className="p-4 flex flex-col items-start gap-3 w-full">
                          <div
                            className={`p-2 rounded-md ${template.color} text-white`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>

                          <div className="text-left w-full">
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-muted-foreground mb-2 line-clamp-2 min-h-[2.5rem]">
                              {template.description}
                            </div>
                            <div className="flex flex-wrap gap-1">
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
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                  />
                  <Button onClick={addTag} variant="outline" size="sm">
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
                isLoading
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
