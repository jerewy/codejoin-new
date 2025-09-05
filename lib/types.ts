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

export type Activity = {
  id: string;
  description: string;
  timestamp: string;
  user_name: string;
  user_avatar: string | null;
};
