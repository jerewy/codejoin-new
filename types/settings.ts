// User preferences types (theme_preference removed as it's now handled locally)
export interface UserPreferences {
  id?: string
  user_id?: string

  // UI/UX Preferences (excluding theme which is now stored locally)
  language: string
  timezone: string

  // Notification Preferences
  notification_email: boolean
  notification_push: boolean
  notification_collaboration: boolean
  notification_product: boolean

  // Privacy Preferences
  profile_visibility: 'public' | 'private' | 'collaborators'

  // Metadata
  created_at?: string
  updated_at?: string
}

// Profile settings types
export interface ProfileSettings {
  id: string
  email: string
  full_name: string
  bio: string
  location: string
  website: string
  user_avatar: string
  created_at?: string
  updated_at?: string
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: any
}

// Default preferences (theme_preference removed as it's now handled locally)
export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  language: 'en',
  timezone: 'UTC',
  notification_email: true,
  notification_push: false,
  notification_collaboration: true,
  notification_product: true,
  profile_visibility: 'public',
}

// Default profile
export const DEFAULT_PROFILE: Omit<ProfileSettings, 'id' | 'email' | 'created_at' | 'updated_at'> = {
  full_name: '',
  bio: '',
  location: '',
  website: '',
  user_avatar: '',
}