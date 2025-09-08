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

export type RawActivity = {
  id: string;
  created_at: string;
  activity_type: string;
  metadata: any;
  profile: {
    full_name: string | null;
    user_avatar: string | null;
  } | null;
  project: {
    name: string | null;
  } | null;
};

export type Activity = {
  id: string;
  description: string;
  timestamp: string;
  user_name: string;
  user_avatar: string | null;
};
