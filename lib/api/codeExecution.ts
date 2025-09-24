interface ExecuteCodeRequest {
  language: string;
  code: string;
  input?: string;
  timeout?: number;
}

interface ExecuteCodeResponse {
  success: boolean;
  language: string;
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
  timestamp: string;
}

interface SupportedLanguage {
  id: string;
  name: string;
  type: string;
  fileExtension: string;
  timeout: number;
  memoryLimit: string;
  cpuLimit: number;
}

interface LanguagesResponse {
  success: boolean;
  languages: SupportedLanguage[];
  count: number;
}

class CodeExecutionAPI {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;

  constructor(baseURL = 'http://localhost:3001', apiKey = 'test123', timeout = 30000) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage;

        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.error || errorJson.message || 'API request failed';
        } catch (jsonParseError) {
          // If the response isn't valid JSON, use the raw text or default message
          errorMessage = errorBody.length > 0 && errorBody.length < 500
            ? errorBody
            : `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error('Invalid JSON response from server');
      }
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: The backend may not be running or responding');
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Connection failed: Backend server is not reachable. Make sure it\'s running on ' + this.baseURL);
      }

      throw error;
    }
  }

  async executeCode(request: ExecuteCodeRequest): Promise<ExecuteCodeResponse> {
    try {
      const response = await this.makeRequest<ExecuteCodeResponse>('/api/execute', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      return response;
    } catch (error) {
      // Return a properly formatted error response
      return {
        success: false,
        language: request.language,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        exitCode: 1,
        executionTime: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getSupportedLanguages(): Promise<LanguagesResponse> {
    try {
      return await this.makeRequest<LanguagesResponse>('/api/languages');
    } catch (error) {
      return {
        success: false,
        languages: [],
        count: 0,
      };
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number; version: string }> {
    try {
      return await this.makeRequest('/health');
    } catch (error) {
      throw new Error('Backend health check failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getSystemInfo(): Promise<any> {
    try {
      return await this.makeRequest('/api/system');
    } catch (error) {
      throw new Error('System info request failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // Test if the backend is available
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  // Utility method to detect language from file extension
  detectLanguageFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sh': 'shell',
      'bash': 'shell',
      'ps1': 'powershell',
      'r': 'r',
      'dart': 'dart',
      'kt': 'kotlin',
      'scala': 'scala',
      'swift': 'swift',
      'hs': 'haskell',
      'ml': 'ocaml',
      'ex': 'elixir',
      'lua': 'lua',
      'pl': 'perl',
    };

    return languageMap[ext || ''] || 'plaintext';
  }
}

// Create a singleton instance
const codeExecutionAPI = new CodeExecutionAPI();

export { codeExecutionAPI, CodeExecutionAPI };
export type { ExecuteCodeRequest, ExecuteCodeResponse, SupportedLanguage, LanguagesResponse };