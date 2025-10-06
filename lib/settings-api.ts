import {
  UserPreferences,
  ProfileSettings,
  ApiResponse,
} from "@/types/settings";

const API_BASE = "/api/settings";

class SettingsAPI {
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await fetch(`${API_BASE}/preferences`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const result = await this.handleResponse<UserPreferences>(response);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch preferences");
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching preferences:", error);
      // Return default preferences on error (theme_preference removed as it's now handled locally)
      return {
        language: "en",
        timezone: "UTC",
        notification_email: true,
        notification_push: false,
        notification_collaboration: true,
        notification_product: true,
        profile_visibility: "public",
      };
    }
  }

  async updatePreferences(
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      const response = await fetch(`${API_BASE}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(preferences),
      });

      const result = await this.handleResponse<UserPreferences>(response);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update preferences");
      }

      return result.data;
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  }

  async getProfile(): Promise<ProfileSettings> {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const result = await this.handleResponse<ProfileSettings>(response);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch profile");
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  }

  async updateProfile(
    profile: Partial<ProfileSettings>
  ): Promise<ProfileSettings> {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(profile),
      });

      const result = await this.handleResponse<ProfileSettings>(response);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update profile");
      }

      return result.data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }
}

export const settingsAPI = new SettingsAPI();
