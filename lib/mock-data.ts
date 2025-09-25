// It's a good practice to define the shapes of your data.
// These types can be moved to a central 'types.ts' file later if you want.

export type Collaborator = {
  id: number;
  name: string;
  avatar: string;
  status: "online" | "away";
  cursor: { line: number; ch: number } | null;
};

export type ProjectFile = {
  name: string;
  type: "file";
  language: string;
  content: string;
};

export type Extension = {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  rating: number;
  downloads: number;
  icon: string;
  installed: boolean;
  enabled: boolean;
};

export type LanguageOption = {
  value: string;
  label: string;
};

// --- MOCK DATA ARRAYS ---

export const mockCollaborators: Collaborator[] = [
  // No hardcoded collaborators - will be populated from real-time data
];

export const mockFiles: ProjectFile[] = [
  // Mock files removed - will be populated from database or user-created content
];

export const mockExtensions: Extension[] = [
  {
    id: "prettier",
    name: "Prettier",
    description: "Code formatter",
    author: "Prettier",
    version: "2.8.4",
    rating: 4.9,
    downloads: 15000000,
    icon: "/placeholder.svg?height=40&width=40",
    installed: true,
    enabled: true,
  },
  {
    id: "eslint",
    name: "ESLint",
    description: "Linting utility",
    author: "ESLint Team",
    version: "8.36.0",
    rating: 4.8,
    downloads: 12000000,
    icon: "/placeholder.svg?height=40&width=40",
    installed: true,
    enabled: true,
  },
  {
    id: "python",
    name: "Python",
    description: "Python language support",
    author: "Microsoft",
    version: "2023.6.0",
    rating: 4.7,
    downloads: 8000000,
    icon: "/placeholder.svg?height=40&width=40",
    installed: true,
    enabled: true,
  },
];

export const mockLanguageOptions: LanguageOption[] = [
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
];
