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
import { PageHeader } from "@/components/PageHeader";

const projectTemplates = [
  // --- Core Programming Languages (Backend Supported) ---
  {
    id: "javascript",
    name: "JavaScript",
    description: "JavaScript project with Node.js",
    icon: Code,
    tags: ["JavaScript", "Node.js"],
    color: "bg-yellow-500",
    structure: [
      {
        name: "index.js",
        type: "file",
        content: `console.log("Hello, JavaScript!");\n\n// Example function\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\n// Example usage\nconst message = greet("World");\nconsole.log(message);`,
      },
      {
        name: "package.json",
        type: "file",
        content: `{\n  "name": "javascript-project",\n  "version": "1.0.0",\n  "description": "A JavaScript project",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js"\n  },\n  "keywords": [],\n  "author": "",\n  "license": "ISC"\n}`,
      },
    ],
  },
  {
    id: "typescript",
    name: "TypeScript",
    description: "TypeScript project with type safety",
    icon: Code,
    tags: ["TypeScript", "Node.js"],
    color: "bg-blue-600",
    structure: [
      {
        name: "index.ts",
        type: "file",
        content: `console.log("Hello, TypeScript!");\n\n// Example interface\ninterface Person {\n  name: string;\n  age: number;\n}\n\n// Example function with types\nfunction greet(person: Person): string {\n  return \`Hello, \${person.name}! You are \${person.age} years old.\`;\n}\n\n// Example usage\nconst user: Person = { name: "World", age: 25 };\nconst message = greet(user);\nconsole.log(message);`,
      },
      {
        name: "tsconfig.json",
        type: "file",
        content: `{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "commonjs",\n    "outDir": "./dist",\n    "rootDir": "./",\n    "strict": true,\n    "esModuleInterop": true,\n    "skipLibCheck": true,\n    "forceConsistentCasingInFileNames": true\n  }\n}`,
      },
      {
        name: "package.json",
        type: "file",
        content: `{\n  "name": "typescript-project",\n  "version": "1.0.0",\n  "description": "A TypeScript project",\n  "main": "dist/index.js",\n  "scripts": {\n    "build": "tsc",\n    "start": "node dist/index.js",\n    "dev": "ts-node index.ts"\n  },\n  "devDependencies": {\n    "typescript": "^5.0.0",\n    "ts-node": "^10.0.0",\n    "@types/node": "^20.0.0"\n  }\n}`,
      },
    ],
  },
  {
    id: "python",
    name: "Python",
    description: "Python project for general programming",
    icon: Code,
    tags: ["Python"],
    color: "bg-green-600",
    structure: [
      {
        name: "main.py",
        type: "file",
        content: `#!/usr/bin/env python3\n\ndef greet(name: str) -> str:\n    """Greet someone with a personalized message."""\n    return f"Hello, {name}!"\n\ndef main():\n    """Main function to run the program."""\n    print("Hello, Python!")\n    \n    # Example usage\n    message = greet("World")\n    print(message)\n    \n    # Example list comprehension\n    numbers = [1, 2, 3, 4, 5]\n    squares = [x**2 for x in numbers]\n    print(f"Squares: {squares}")\n\nif __name__ == "__main__":\n    main()`,
      },
      {
        name: "requirements.txt",
        type: "file",
        content: `# Add your Python dependencies here\n# Example:\n# requests==2.31.0\n# numpy==1.24.0`,
      },
    ],
  },
  {
    id: "java",
    name: "Java",
    description: "Java project with object-oriented design",
    icon: Code,
    tags: ["Java"],
    color: "bg-red-600",
    structure: [
      {
        name: "Main.java",
        type: "file",
        content: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n        \n        // Example usage\n        Person person = new Person("World", 25);\n        String message = person.greet();\n        System.out.println(message);\n    }\n}\n\nclass Person {\n    private String name;\n    private int age;\n    \n    public Person(String name, int age) {\n        this.name = name;\n        this.age = age;\n    }\n    \n    public String greet() {\n        return "Hello, I'm " + name + " and I'm " + age + " years old!";\n    }\n    \n    // Getters and setters\n    public String getName() { return name; }\n    public void setName(String name) { this.name = name; }\n    public int getAge() { return age; }\n    public void setAge(int age) { this.age = age; }\n}`,
      },
    ],
  },
  {
    id: "csharp",
    name: "C#",
    description: "C# project with .NET framework",
    icon: Code,
    tags: ["C#", ".NET"],
    color: "bg-purple-600",
    structure: [
      {
        name: "Program.cs",
        type: "file",
        content: `using System;\n\nnamespace CSharpProject\n{\n    class Program\n    {\n        static void Main(string[] args)\n        {\n            Console.WriteLine("Hello, C#!");\n            \n            // Example usage\n            var person = new Person("World", 25);\n            string message = person.Greet();\n            Console.WriteLine(message);\n        }\n    }\n    \n    public class Person\n    {\n        public string Name { get; set; }\n        public int Age { get; set; }\n        \n        public Person(string name, int age)\n        {\n            Name = name;\n            Age = age;\n        }\n        \n        public string Greet()\n        {\n            return $"Hello, I'm {Name} and I'm {Age} years old!";\n        }\n    }\n}`,
      },
    ],
  },
  {
    id: "go",
    name: "Go",
    description: "Go project for system programming",
    icon: Code,
    tags: ["Go"],
    color: "bg-cyan-600",
    structure: [
      {
        name: "main.go",
        type: "file",
        content: `package main\n\nimport (\n\t"fmt"\n)\n\n// Person represents a person with name and age\ntype Person struct {\n\tName string\n\tAge  int\n}\n\n// Greet returns a greeting message\nfunc (p Person) Greet() string {\n\treturn fmt.Sprintf("Hello, I'm %s and I'm %d years old!", p.Name, p.Age)\n}\n\nfunc main() {\n\tfmt.Println("Hello, Go!")\n\t\n\t// Example usage\n\tperson := Person{Name: "World", Age: 25}\n\tmessage := person.Greet()\n\tfmt.Println(message)\n\t\n\t// Example slice\n\tnumbers := []int{1, 2, 3, 4, 5}\n\tfmt.Printf("Numbers: %v\\n", numbers)\n}`,
      },
      {
        name: "go.mod",
        type: "file",
        content: `module go-project\n\ngo 1.21`,
      },
    ],
  },
  {
    id: "rust",
    name: "Rust",
    description: "Rust project for systems programming",
    icon: Code,
    tags: ["Rust"],
    color: "bg-orange-600",
    structure: [
      {
        name: "main.rs",
        type: "file",
        content: `fn main() {\n    println!("Hello, Rust!");\n    \n    // Example usage\n    let person = Person::new("World".to_string(), 25);\n    let message = person.greet();\n    println!("{}", message);\n    \n    // Example vector\n    let numbers: Vec<i32> = vec![1, 2, 3, 4, 5];\n    println!("Numbers: {:?}", numbers);\n}\n\nstruct Person {\n    name: String,\n    age: u32,\n}\n\nimpl Person {\n    fn new(name: String, age: u32) -> Self {\n        Person { name, age }\n    }\n    \n    fn greet(&self) -> String {\n        format!("Hello, I'm {} and I'm {} years old!", self.name, self.age)\n    }\n}`,
      },
      {
        name: "Cargo.toml",
        type: "file",
        content: `[package]\nname = "rust-project"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]`,
      },
    ],
  },
  {
    id: "swift",
    name: "Swift",
    description: "Swift project for iOS/macOS development",
    icon: Code,
    tags: ["Swift"],
    color: "bg-orange-500",
    structure: [
      {
        name: "main.swift",
        type: "file",
        content: `import Foundation\n\nprint("Hello, Swift!")\n\n// Example class\nclass Person {\n    var name: String\n    var age: Int\n    \n    init(name: String, age: Int) {\n        self.name = name\n        self.age = age\n    }\n    \n    func greet() -> String {\n        return "Hello, I'm \\(name) and I'm \\(age) years old!"\n    }\n}\n\n// Example usage\nlet person = Person(name: "World", age: 25)\nlet message = person.greet()\nprint(message)\n\n// Example array\nlet numbers = [1, 2, 3, 4, 5]\nprint("Numbers: \\(numbers)")`,
      },
    ],
  },
  {
    id: "cpp",
    name: "C++",
    description: "C++ project for system programming",
    icon: Code,
    tags: ["C++"],
    color: "bg-blue-800",
    structure: [
      {
        name: "main.cpp",
        type: "file",
        content: `#include <iostream>\n#include <string>\n#include <vector>\n\nclass Person {\nprivate:\n    std::string name;\n    int age;\n\npublic:\n    Person(const std::string& name, int age) : name(name), age(age) {}\n    \n    std::string greet() const {\n        return "Hello, I'm " + name + " and I'm " + std::to_string(age) + " years old!";\n    }\n};\n\nint main() {\n    std::cout << "Hello, C++!" << std::endl;\n    \n    // Example usage\n    Person person("World", 25);\n    std::string message = person.greet();\n    std::cout << message << std::endl;\n    \n    // Example vector\n    std::vector<int> numbers = {1, 2, 3, 4, 5};\n    std::cout << "Numbers: ";\n    for (int num : numbers) {\n        std::cout << num << " ";\n    }\n    std::cout << std::endl;\n    \n    return 0;\n}`,
      },
      {
        name: "Makefile",
        type: "file",
        content: `CXX = g++\nCXXFLAGS = -std=c++17 -Wall -Wextra\nTARGET = main\nSOURCE = main.cpp\n\n$(TARGET): $(SOURCE)\n\t$(CXX) $(CXXFLAGS) -o $(TARGET) $(SOURCE)\n\nclean:\n\trm -f $(TARGET)\n\n.PHONY: clean`,
      },
    ],
  },
  {
    id: "c",
    name: "C",
    description: "C project for system programming",
    icon: Code,
    tags: ["C"],
    color: "bg-gray-600",
    structure: [
      {
        name: "main.c",
        type: "file",
        content: `#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n\ntypedef struct {\n    char name[50];\n    int age;\n} Person;\n\nvoid greet(const Person* person) {\n    printf("Hello, I'm %s and I'm %d years old!\\n", person->name, person->age);\n}\n\nint main() {\n    printf("Hello, C!\\n");\n    \n    // Example usage\n    Person person;\n    strcpy(person.name, "World");\n    person.age = 25;\n    greet(&person);\n    \n    // Example array\n    int numbers[] = {1, 2, 3, 4, 5};\n    int size = sizeof(numbers) / sizeof(numbers[0]);\n    \n    printf("Numbers: ");\n    for (int i = 0; i < size; i++) {\n        printf("%d ", numbers[i]);\n    }\n    printf("\\n");\n    \n    return 0;\n}`,
      },
      {
        name: "Makefile",
        type: "file",
        content: `CC = gcc\nCFLAGS = -std=c99 -Wall -Wextra\nTARGET = main\nSOURCE = main.c\n\n$(TARGET): $(SOURCE)\n\t$(CC) $(CFLAGS) -o $(TARGET) $(SOURCE)\n\nclean:\n\trm -f $(TARGET)\n\n.PHONY: clean`,
      },
    ],
  },
  {
    id: "sql",
    name: "SQL",
    description: "SQL database project",
    icon: Database,
    tags: ["SQL", "Database"],
    color: "bg-indigo-600",
    structure: [
      {
        name: "schema.sql",
        type: "file",
        content: `-- Example database schema\nCREATE TABLE IF NOT EXISTS users (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL,\n    email TEXT UNIQUE NOT NULL,\n    age INTEGER,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);\n\nCREATE TABLE IF NOT EXISTS posts (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    user_id INTEGER NOT NULL,\n    title TEXT NOT NULL,\n    content TEXT,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (user_id) REFERENCES users (id)\n);`,
      },
      {
        name: "queries.sql",
        type: "file",
        content: `-- Sample data and queries\n\n-- Insert sample users\nINSERT INTO users (name, email, age) VALUES \n    ('Alice Johnson', 'alice@example.com', 28),\n    ('Bob Smith', 'bob@example.com', 34),\n    ('Carol Davis', 'carol@example.com', 25);\n\n-- Insert sample posts\nINSERT INTO posts (user_id, title, content) VALUES\n    (1, 'Hello World', 'This is my first post!'),\n    (2, 'SQL Tips', 'Here are some useful SQL tips...'),\n    (1, 'Another Post', 'More content here.');\n\n-- Example queries\n\n-- Select all users\nSELECT * FROM users;\n\n-- Select users with posts\nSELECT u.name, u.email, COUNT(p.id) as post_count\nFROM users u\nLEFT JOIN posts p ON u.id = p.user_id\nGROUP BY u.id, u.name, u.email\nORDER BY post_count DESC;\n\n-- Select posts with user information\nSELECT p.title, p.content, u.name as author, p.created_at\nFROM posts p\nJOIN users u ON p.user_id = u.id\nORDER BY p.created_at DESC;`,
      },
    ],
  },
] as const;

const languageOptions = [
  // --- All 11 Backend Supported Languages ---
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "typescript", label: "TypeScript" },
  { value: "sql", label: "SQL" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
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
      <PageHeader
        leading={
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
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
        description="Start from a template, import from GitHub, or configure everything manually."
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
                    handleTemplateSelect("blank");
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
