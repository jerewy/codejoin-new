import type { ComponentType } from "react";
import { DiJava } from "react-icons/di";
import {
  SiC,
  SiCplusplus,
  SiCsharp,
  SiGo,
  SiJavascript,
  SiMysql,
  SiPython,
  SiRust,
  SiSwift,
  SiTypescript,
} from "react-icons/si";

import type { TemplateNode } from "@/lib/types";

export type StarterProject = {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tags: string[];
  color: string;
  structure: TemplateNode[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  author: string;
  rating: number;
  downloads: number;
  thumbnail?: string | null;
  featured?: boolean;
  language: string;
};

type BaseStarterProject = Pick<
  StarterProject,
  "id" | "name" | "description" | "icon" | "tags" | "color" | "structure"
>;

const baseStarterProjects: BaseStarterProject[] = [
  // --- Core Programming Languages (Backend Supported) ---
  {
    id: "javascript",
    name: "JavaScript",
    description: "JavaScript project with Node.js",
    icon: SiJavascript,
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
    icon: SiTypescript,
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
    icon: SiPython,
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
    icon: DiJava,
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
    icon: SiCsharp,
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
    icon: SiGo,
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
    icon: SiRust,
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
    icon: SiSwift,
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
    icon: SiCplusplus,
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
    icon: SiC,
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
    icon: SiMysql,
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
]

const templateMetadata: Record<string, Partial<StarterProject>> = {
  javascript: { difficulty: "Beginner", featured: true, rating: 4.8, downloads: 1680 },
  typescript: { difficulty: "Intermediate", featured: true, rating: 4.7, downloads: 1420 },
  python: { difficulty: "Beginner", featured: true, rating: 4.9, downloads: 1980 },
  java: { difficulty: "Intermediate", rating: 4.6, downloads: 1210 },
  csharp: { difficulty: "Intermediate", rating: 4.6, downloads: 990 },
  go: { difficulty: "Intermediate", rating: 4.6, downloads: 880 },
  rust: { difficulty: "Advanced", rating: 4.7, downloads: 760 },
  swift: { difficulty: "Intermediate", rating: 4.5, downloads: 690 },
  cpp: { difficulty: "Advanced", rating: 4.6, downloads: 830 },
  c: { difficulty: "Advanced", rating: 4.5, downloads: 720 },
  sql: { difficulty: "Beginner", rating: 4.8, downloads: 1750 },
};

const DEFAULT_METADATA = {
  author: "CodeJoin Starter Team",
  difficulty: "Intermediate" as const,
  rating: 4.7,
  downloads: 900,
  featured: false,
  thumbnail: null,
};

const clampRating = (value: number) => {
  if (value < 4.3) {
    return 4.3;
  }

  if (value > 4.9) {
    return 4.9;
  }

  return Number(value.toFixed(1));
};

export const starterProjects: StarterProject[] = baseStarterProjects.map((template, index) => {
  const meta = templateMetadata[template.id] ?? {};
  const rating = meta.rating ?? clampRating(4.5 + (index % 5) * 0.1);
  const downloads = meta.downloads ?? DEFAULT_METADATA.downloads + index * 137;

  return {
    ...template,
    language: template.name,
    author: meta.author ?? DEFAULT_METADATA.author,
    difficulty: meta.difficulty ?? DEFAULT_METADATA.difficulty,
    rating,
    downloads,
    featured: meta.featured ?? index < 3,
    thumbnail: meta.thumbnail ?? DEFAULT_METADATA.thumbnail,
  };
});

export const featuredStarterProjects = starterProjects.filter((project) => project.featured);

export const starterProjectLanguages = starterProjects.map((project) => ({
  id: project.id,
  name: project.name,
  difficulty: project.difficulty,
}));
