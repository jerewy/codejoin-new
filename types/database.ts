// Database type definitions for Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          project_id: string | null
          user_id: string | null
          activity_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          activity_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          activity_type?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      collaborators: {
        Row: {
          project_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          role?: string
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          project_id: string | null
          node_id: string | null
          title: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          type: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          node_id?: string | null
          title?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          type?: string
          metadata?: Json | null
        }
        Update: {
          project_id?: string | null
          node_id?: string | null
          title?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          type?: string
          metadata?: Json | null
        }
      }
      message_attachments: {
        Row: {
          id: string
          message_id: string
          kind: string
          uri: string
          extra: Json | null
        }
        Insert: {
          id?: string
          message_id: string
          kind: string
          uri: string
          extra?: Json | null
        }
        Update: {
          message_id?: string
          kind?: string
          uri?: string
          extra?: Json | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          author_id: string | null
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          metadata: Json | null
          created_at: string
          ai_model?: string | null
          ai_response_time_ms?: number | null
          ai_tokens_used?: number | null
        }
        Insert: {
          id?: string
          conversation_id: string
          author_id?: string | null
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          metadata?: Json | null
          created_at?: string
          ai_model?: string | null
          ai_response_time_ms?: number | null
          ai_tokens_used?: number | null
        }
        Update: {
          conversation_id?: string
          author_id?: string | null
          role?: 'user' | 'assistant' | 'system' | 'tool'
          content?: string
          metadata?: Json | null
          created_at?: string
          ai_model?: string | null
          ai_response_time_ms?: number | null
          ai_tokens_used?: number | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string | null
          user_avatar: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          created_at?: string | null
          user_avatar?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          created_at?: string | null
          user_avatar?: string | null
        }
      }
      project_nodes: {
        Row: {
          id: string
          project_id: string
          parent_id: string | null
          type: 'file' | 'folder'
          name: string
          content: string | null
          language: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          parent_id?: string | null
          type: 'file' | 'folder'
          name: string
          content?: string | null
          language?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          project_id?: string
          parent_id?: string | null
          type?: 'file' | 'folder'
          name?: string
          content?: string | null
          language?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string | null
          name: string
          description: string | null
          language: string | null
          created_at: string | null
          updated_at: string | null
          status: string | null
          isStarred: boolean | null
          tags: string[] | null
          thumbnail: string | null
          admin_ids: string[] | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          description?: string | null
          language?: string | null
          created_at?: string | null
          updated_at?: string | null
          status?: string | null
          isStarred?: boolean | null
          tags?: string[] | null
          thumbnail?: string | null
          admin_ids?: string[] | null
        }
        Update: {
          user_id?: string | null
          name?: string
          description?: string | null
          language?: string | null
          created_at?: string | null
          updated_at?: string | null
          status?: string | null
          isStarred?: boolean | null
          tags?: string[] | null
          thumbnail?: string | null
          admin_ids?: string[] | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          theme_preference: 'light' | 'dark' | 'system'
          language: string
          timezone: string
          notification_email: boolean
          notification_push: boolean
          notification_collaboration: boolean
          notification_product: boolean
          profile_visibility: 'public' | 'private' | 'collaborators'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          theme_preference?: 'light' | 'dark' | 'system'
          language?: string
          timezone?: string
          notification_email?: boolean
          notification_push?: boolean
          notification_collaboration?: boolean
          notification_product?: boolean
          profile_visibility?: 'public' | 'private' | 'collaborators'
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          theme_preference?: 'light' | 'dark' | 'system'
          language?: string
          timezone?: string
          notification_email?: boolean
          notification_push?: boolean
          notification_collaboration?: boolean
          notification_product?: boolean
          profile_visibility?: 'public' | 'private' | 'collaborators'
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      ai_conversation_analytics: {
        Row: {
          id: string
          project_id: string | null
          title: string | null
          created_at: string | null
          updated_at: string | null
          ai_messages_count: number
          user_messages_count: number
          total_tokens_used: number | null
          avg_response_time_ms: number | null
          first_ai_model: string | null
          latest_ai_model: string | null
          metadata: Json | null
        }
      }
    }
    Functions: {
      generate_conversation_title: {
        Args: {
          first_message: string
        }
        Returns: string
      }
    }
    Enums: {
      message_role: 'user' | 'assistant' | 'system' | 'tool'
      node_type: 'file' | 'folder'
    }
  }
}

// Commonly used types for easier import
export type Message = Database['public']['Tables']['messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectNode = Database['public']['Tables']['project_nodes']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];

// Insert types
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectNodeInsert = Database['public']['Tables']['project_nodes']['Insert'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];

// Update types
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type ProjectNodeUpdate = Database['public']['Tables']['project_nodes']['Update'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

// View types
export type AIConversationAnalytics = Database['public']['Views']['ai_conversation_analytics']['Row'];

// Enum types
export type MessageRole = Database['public']['Enums']['message_role'];
export type NodeType = Database['public']['Enums']['node_type'];