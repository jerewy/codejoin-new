import { AIModelSettings, DEFAULT_MODEL_SETTINGS } from '@/types/ai-model';

export class AIModelSettingsService {
  private static readonly STORAGE_KEY = 'codejoin-ai-model-settings';
  private static instance: AIModelSettingsService;

  private settings: AIModelSettings;
  private listeners: Set<(settings: AIModelSettings) => void> = new Set();

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): AIModelSettingsService {
    if (!AIModelSettingsService.instance) {
      AIModelSettingsService.instance = new AIModelSettingsService();
    }
    return AIModelSettingsService.instance;
  }

  // Load settings from localStorage
  private loadSettings(): AIModelSettings {
    if (typeof window === 'undefined') {
      return DEFAULT_MODEL_SETTINGS;
    }

    try {
      const stored = localStorage.getItem(AIModelSettingsService.STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_MODEL_SETTINGS, ...parsedSettings };
      }
    } catch (error) {
      console.error('Failed to load AI model settings:', error);
    }

    return DEFAULT_MODEL_SETTINGS;
  }

  // Save settings to localStorage
  private saveSettings(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(AIModelSettingsService.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save AI model settings:', error);
    }
  }

  // Get current settings
  getSettings(): AIModelSettings {
    return { ...this.settings };
  }

  // Update settings
  updateSettings(updates: Partial<AIModelSettings>): void {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();

    // Only notify if settings actually changed
    if (JSON.stringify(oldSettings) !== JSON.stringify(this.settings)) {
      this.notifyListeners();
    }
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.settings = { ...DEFAULT_MODEL_SETTINGS };
    this.saveSettings();
    this.notifyListeners();
  }

  // Add settings change listener
  addSettingsListener(listener: (settings: AIModelSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of settings changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.settings }));
  }

  // Get preferred model
  getPreferredModel(): string {
    return this.settings.preferredModel;
  }

  // Set preferred model
  setPreferredModel(modelId: string): void {
    this.updateSettings({ preferredModel: modelId });
  }

  // Get fallback model
  getFallbackModel(): string | undefined {
    return this.settings.fallbackModel;
  }

  // Set fallback model
  setFallbackModel(modelId: string | undefined): void {
    this.updateSettings({ fallbackModel: modelId });
  }

  // Is fallback enabled?
  isFallbackEnabled(): boolean {
    return this.settings.fallbackEnabled;
  }

  // Enable/disable fallback
  setFallbackEnabled(enabled: boolean): void {
    this.updateSettings({ fallbackEnabled: enabled });
  }

  // Should auto-switch on error?
  shouldAutoSwitchOnError(): boolean {
    return this.settings.autoSwitchOnError;
  }

  // Enable/disable auto-switch on error
  setAutoSwitchOnError(enabled: boolean): void {
    this.updateSettings({ autoSwitchOnError: enabled });
  }

  // Get response time threshold
  getResponseTimeThreshold(): number {
    return this.settings.responseTimeThreshold;
  }

  // Set response time threshold
  setResponseTimeThreshold(thresholdMs: number): void {
    this.updateSettings({ responseTimeThreshold: thresholdMs });
  }

  // Show model info?
  shouldShowModelInfo(): boolean {
    return this.settings.showModelInfo;
  }

  // Enable/disable model info display
  setShowModelInfo(show: boolean): void {
    this.updateSettings({ showModelInfo: show });
  }

  // Is hybrid mode enabled?
  isHybridModeEnabled(): boolean {
    return this.settings.enableHybridMode;
  }

  // Enable/disable hybrid mode
  setHybridModeEnabled(enabled: boolean): void {
    this.updateSettings({ enableHybridMode: enabled });
  }

  // Validate settings
  validateSettings(settings: Partial<AIModelSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.preferredModel && typeof settings.preferredModel !== 'string') {
      errors.push('Preferred model must be a string');
    }

    if (settings.fallbackModel && typeof settings.fallbackModel !== 'string') {
      errors.push('Fallback model must be a string');
    }

    if (settings.responseTimeThreshold !== undefined) {
      if (typeof settings.responseTimeThreshold !== 'number' || settings.responseTimeThreshold <= 0) {
        errors.push('Response time threshold must be a positive number');
      }
    }

    if (settings.preferredModel && settings.fallbackModel && settings.preferredModel === settings.fallbackModel) {
      errors.push('Preferred model and fallback model cannot be the same');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Export settings as JSON
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  // Import settings from JSON
  importSettings(jsonString: string): { success: boolean; error?: string } {
    try {
      const importedSettings = JSON.parse(jsonString);
      const validation = this.validateSettings(importedSettings);

      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid settings: ${validation.errors.join(', ')}`,
        };
      }

      this.updateSettings(importedSettings);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const aiModelSettingsService = AIModelSettingsService.getInstance();