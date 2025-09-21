"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { supabase } from "@/lib/supabaseClient";
import { TemplateNode } from "@/lib/types";

const projectTemplates = [
  {
    id: "react-app",
    name: "React App",
    description: "Modern React application with TypeScript",
    icon: Code,
    tags: ["React", "TypeScript", "Vite"],
    color: "bg-blue-500",
    // 👇 Structure updated with nested 'children'
    structure: [
      {
        name: "index.html",
        type: "file",
        content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>`,
      },
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "main.tsx",
            type: "file",
            content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.tsx'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n)`,
          },
          {
            name: "App.tsx",
            type: "file",
            content: `function App() {\n  return (\n    <h1>Hello, React!</h1>\n  )\n}\n\nexport default App`,
          },
          {
            name: "index.css",
            type: "file",
            content: `body { margin: 0; font-family: sans-serif; }`,
          },
        ],
      },
    ],
  },
  {
    id: "nextjs-app",
    name: "Next.js App",
    description: "Full-stack Next.js application",
    icon: Globe,
    tags: ["Next.js", "React", "TypeScript"],
    color: "bg-black",
    // 👇 Structure updated with nested 'children'
    structure: [
      {
        name: "app",
        type: "folder",
        children: [
          {
            name: "layout.tsx",
            type: "file",
            content: `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}`,
          },
          {
            name: "page.tsx",
            type: "file",
            content: `export default function Home() {\n  return <h1>Hello, Next.js!</h1>\n}`,
          },
        ],
      },
      { name: "public", type: "folder", children: [] },
    ],
  },
  {
    id: "vue-app",
    name: "Vue.js App",
    description: "Vue.js application with Composition API",
    icon: Zap,
    tags: ["Vue.js", "TypeScript", "Vite"],
    color: "bg-green-500",
    // 👇 Structure updated with nested 'children'
    structure: [
      {
        name: "index.html",
        type: "file",
        content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <title>Vue App</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.ts"></script>\n  </body>\n</html>`,
      },
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "main.ts",
            type: "file",
            content: `import { createApp } from 'vue'\nimport App from './App.vue'\n\ncreateApp(App).mount('#app')`,
          },
          {
            name: "App.vue",
            type: "file",
            content: `<template>\n  <h1>Hello, Vue!</h1>\n</template>`,
          },
        ],
      },
    ],
  },
  {
    id: "mobile-app",
    name: "React Native",
    description: "Cross-platform mobile application",
    icon: Smartphone,
    tags: ["React Native", "Expo", "TypeScript"],
    color: "bg-purple-500",
    // 👇 This structure is already flat and correct
    structure: [
      {
        name: "App.tsx",
        type: "file",
        content: `import { StatusBar } from 'expo-status-bar';\nimport { StyleSheet, Text, View } from 'react-native';\n\nexport default function App() {\n  return (\n    <View style={styles.container}>\n      <Text>Hello, React Native!</Text>\n      <StatusBar style="auto" />\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    backgroundColor: '#fff',\n    alignItems: 'center',\n    justifyContent: 'center',\n  },\n});`,
      },
      { name: "assets", type: "folder", children: [] },
    ],
  },
  {
    id: "game",
    name: "Game Project",
    description: "2D/3D game development",
    icon: Gamepad2,
    tags: ["JavaScript", "Canvas", "WebGL"],
    color: "bg-red-500",
    // 👇 This structure is already flat and correct
    structure: [
      {
        name: "index.html",
        type: "file",
        content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Game</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <canvas id="gameCanvas" width="800" height="600"></canvas>\n  <script src="game.js"></script>\n</body>\n</html>`,
      },
      {
        name: "style.css",
        type: "file",
        content: `body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }\ncanvas { border: 1px solid white; }`,
      },
      {
        name: "game.js",
        type: "file",
        content: `const canvas = document.getElementById('gameCanvas');\nconst ctx = canvas.getContext('2d');\n\nfunction gameLoop() {\n  ctx.fillStyle = 'black';\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n\n  ctx.fillStyle = 'white';\n  ctx.font = '48px sans-serif';\n  ctx.fillText('Hello, Game Dev!', 200, 300);\n\n  requestAnimationFrame(gameLoop);\n}\n\ngameLoop();`,
      },
    ],
  },
  {
    id: "ai-project",
    name: "AI/ML Project",
    description: "Machine learning and AI project",
    icon: Bot,
    tags: ["Python", "TensorFlow", "PyTorch"],
    color: "bg-orange-500",
    // 👇 This structure is already flat and correct
    structure: [
      {
        name: "main.py",
        type: "file",
        content: `def main():\n    print("Hello, AI World!")\n\nif __name__ == "__main__":\n    main()`,
      },
      { name: "data", type: "folder", children: [] },
      {
        name: "README.md",
        type: "file",
        content: `# AI Project\n\nThis is a placeholder for the AI/ML project.`,
      },
    ],
  },
  {
    id: "api",
    name: "REST API",
    description: "Backend API with Node.js",
    icon: Database,
    tags: ["Node.js", "Express", "MongoDB"],
    color: "bg-indigo-500",
    // 👇 This structure is already flat and correct
    structure: [
      {
        name: "index.js",
        type: "file",
        content: `const express = require('express');\nconst app = express();\nconst port = 3001;\n\napp.get('/', (req, res) => {\n  res.send('Hello, API!');\n});\n\napp.listen(port, () => {\n  console.log(\`Server running at http://localhost:\${port}\`);\n});`,
      },
      {
        name: "package.json",
        type: "file",
        content: `{ "name": "api-server", "version": "1.0.0", "main": "index.js", "scripts": { "start": "node index.js" }, "dependencies": { "express": "^4.18.2" } }`,
      },
    ],
  },
  {
    id: "static-site",
    name: "Static Website",
    description: "Static website with HTML/CSS/JS",
    icon: Palette,
    tags: ["HTML", "CSS", "JavaScript"],
    color: "bg-pink-500",
    // 👇 This structure is already flat and correct
    structure: [
      {
        name: "index.html",
        type: "file",
        content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <script src="script.js"></script>\n</body>\n</html>`,
      },
      {
        name: "styles.css",
        type: "file",
        content: `body {\n  font-family: sans-serif;\n  display: grid;\n  place-content: center;\n  height: 100vh;\n  margin: 0;\n}`,
      },
      {
        name: "script.js",
        type: "file",
        content: `console.log("Hello from your new project!");`,
      },
    ],
  },
] as const;

const languageOptions = [
  // --- Core Web ---
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },

  // --- Popular Backend / General Purpose ---
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },

  // --- Scripting & Other ---
  { value: "sql", label: "SQL" },
  { value: "shell", label: "Shell" },
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
  const [language, setLanguage] = useState("javascript");

  const MAX_TAGS = 5;
  const addTag = () => {
    // Check if the tag limit has been reached
    if (tags.length >= MAX_TAGS) {
      alert(`You can only add a maximum of ${MAX_TAGS} tags.`); // Or use a toast notification
      return; // Stop the function
    }

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

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to create a project.");

      const template = projectTemplates.find((t) => t.id === selectedTemplate);

      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName,
          description: description,
          tags: tags,
          language: template ? template.tags : [],
          status: "active",
        })
        .select()
        .single();

      if (projectError) throw projectError;
      if (!newProject) throw new Error("Project creation failed.");

      // This function will handle nested structures
      const createNodesRecursively = async (
        nodes: readonly TemplateNode[],
        parentId: string | null
      ) => {
        if (!nodes || nodes.length === 0) return;

        const nodesToInsert = nodes.map((node: TemplateNode) => ({
          project_id: newProject.id,
          name: node.name,
          type: node.type,
          content: node.content || null,
          parent_id: parentId,
        }));

        const { data: insertedNodes, error: nodeError } = await supabase
          .from("project_nodes")
          .insert(nodesToInsert)
          .select();

        if (nodeError) throw nodeError;
        if (!insertedNodes) return; // Add a check for the returned data

        // For each folder we just created, create its children
        for (let i = 0; i < nodes.length; i++) {
          const sourceNode = nodes[i];
          if (sourceNode.type === "folder" && sourceNode.children) {
            // Also add a type for 'n' here for full type safety
            const dbNode = insertedNodes.find(
              (n: { id: string; name: string; parent_id: string | null }) =>
                n.name === sourceNode.name && n.parent_id === parentId
            );
            // Important: Add a check to ensure dbNode was found
            if (dbNode) {
              await createNodesRecursively(sourceNode.children, dbNode.id);
            }
          }
        }
      };

      if (importMethod === "blank" || !template) {
        // Fallback for "Start Blank" projects
        await supabase.from("project_nodes").insert({
          project_id: newProject.id,
          name: "root",
          type: "folder",
          parent_id: null,
        });
      } else if (template.structure) {
        // Start the recursive creation process
        await createNodesRecursively(template.structure, null);
      }

      router.push(`/project/${newProject.id}`);
    } catch (error: unknown) {
      console.error("Error creating project:", error);
      if (error instanceof Error) {
        alert(error.message);
      }
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

  const handleTemplateSelect = (templateId: string) => {
    const template = projectTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(template.id);
    setProjectName(template.name);
    setDescription(template.description);

    // Create a new, mutable copy of the readonly tags array
    setTags([...template.tags]);
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
