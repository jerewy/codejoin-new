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
