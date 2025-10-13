import { useState, useCallback } from 'react';

interface UseOpenRouterAIOptions {
  timeout?: number;
  retries?: number;
}

interface MessageContext {
  code?: string;
  language?: string;
  conversationId?: string;
  projectId?: string;
}

interface OpenRouterResponse {
  success: boolean;
  response?: string;
  error?: string;
  metadata?: {
    model: string;
    provider: string;
    tokensUsed: number;
    responseTime: number;
    requestId: string;
    cached?: boolean;
    finishReason?: string;
  };
}

export function useOpenRouterAI(options: UseOpenRouterAIOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const {
    timeout = 30000,
    retries = 2
  } = options;

  const sendMessage = useCallback(async (
    message: string,
    context?: MessageContext
  ): Promise<OpenRouterResponse> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setMetadata(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Create a retry function
      const attemptRequest = async (attempt: number): Promise<OpenRouterResponse> => {
        try {
          const response = await fetch('/api/openrouter-ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              context: {
                ...context,
                timestamp: new Date().toISOString()
              }
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const data: OpenRouterResponse = await response.json();

          if (data.success) {
            setResponse(data.response || null);
            setMetadata(data.metadata || null);
            return data;
          } else {
            throw new Error(data.error || 'API request failed');
          }
        } catch (fetchError) {
          // Don't retry on abort or 4xx errors
          if (fetchError instanceof Error &&
              (fetchError.name === 'AbortError' ||
               fetchError.message.includes('HTTP 4'))) {
            throw fetchError;
          }

          // Retry on network errors or 5xx
          if (attempt < retries) {
            console.log(`Retrying OpenRouter request (attempt ${attempt + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
            return attemptRequest(attempt + 1);
          }

          throw fetchError;
        }
      };

      const result = await attemptRequest(0);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      // Return error response for consistent handling
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [timeout, retries]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setMetadata(null);
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    response,
    metadata,

    // Actions
    sendMessage,
    clearError,
    clearResponse,

    // Convenience getters
    hasResponse: response !== null,
    hasError: error !== null,
  };
}