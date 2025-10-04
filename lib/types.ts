export type Project = {
  id: string; // Corresponds to uuid
  user_id: string; // Corresponds to uuid
  name: string;
  description: string | null; // Can be null in the database
  language: string | null;
  created_at: string; // Corresponds to timestamptz
  updated_at: string; // Corresponds to timestamptz
  status: string | null;
  isStarred: boolean | null; // Corresponds to bool
  tags: string[] | null; // Note: For a list, the DB type should be text[]
  thumbnail: string | null;
  collaborators: number; // Number of collaborators
};

// Define the inner type once for clarity
type Profile = {
  full_name: string | null;
  user_avatar: string | null;
};

type ProjectInfo = {
  name: string | null;
};

// Use the union type to allow both structures
export type RawActivity = {
  id: string;
  created_at: string;
  activity_type: string;
  metadata: any;
  // This tells TypeScript the property can be a single Profile, an array, or null
  profiles: Profile | Profile[] | null;
  projects: ProjectInfo | ProjectInfo[] | null;
};

export type Activity = {
  id: string;
  description: string;
  timestamp: string;
  user_name: string;
  user_avatar: string | null;
};

export type TemplateNode = {
  name: string;
  type: "file" | "folder";
  content?: string | null; // The '?' makes it optional
  children?: readonly TemplateNode[]; // Optional array of itself for nesting
};

// You can add this type to lib/mock-data.ts or a new types file

export type Collaborator = {
  user_id: string; // From the collaborators table
  role: string; // From the collaborators table
  full_name: string | null; // From the profiles table
  user_avatar: string | null; // From the profiles table
};

export interface ProjectNodeFromDB {
  id: string; // The unique ID of the file or folder
  project_id: string; // The ID of the project it belongs to
  parent_id: string | null; // The ID of the parent folder (or null for root items)
  name: string; // The name of the file or folder (e.g., "index.html")
  type: "file" | "folder";
  content: string | null; // The code content for files
  language: string | null; // The programming language
}

export interface ProjectChatMessageWithAuthor {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  role: string | null;
  user_full_name: string | null;
  user_avatar: string | null;
  metadata: Record<string, unknown> | null;
}
