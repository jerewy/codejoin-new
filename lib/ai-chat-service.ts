import { getSupabaseClient } from '@/lib/supabaseClient';

interface AIChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  details?: string;
  fallback?: boolean;
}

export class AIChatService {
  private supabase;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  async sendMessage(message: string, context?: any): Promise<AIChatResponse> {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Authentication required',
          details: 'Please sign in to use the AI assistant'
        };
      }

      // Call the backend API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message,
          context,
          userId: session.user.id,
          projectId: context?.projectId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend responded with ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        response: data.response || data.message
      };
    } catch (error) {
      console.error('AI Chat Service Error:', error);

      // Handle different types of errors
      if (error instanceof Error) {
        // Connection errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return {
            success: false,
            error: 'Connection error',
            details: 'Unable to connect to AI service. Please check your internet connection.',
            fallback: true
          };
        }

        // Authentication errors
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          return {
            success: false,
            error: 'Authentication error',
            details: 'Please sign in again to continue using the AI assistant.'
          };
        }

        // Service unavailable
        if (error.message.includes('503') || error.message.includes('unavailable')) {
          return {
            success: false,
            error: 'AI service unavailable',
            details: 'The AI assistant is temporarily unavailable. Please try again later.',
            fallback: true
          };
        }
      }

      return {
        success: false,
        error: 'Unknown error',
        details: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  // Fallback response generator for when backend is unavailable
  generateFallbackResponse(userMessage: string): string {
    const responses = [
      "I'm currently experiencing connection issues, but I'd be happy to help you with that! Let me provide some guidance based on your request.",
      "I'm having trouble connecting to my AI backend right now, but I can still offer some help based on what you've asked.",
      "While I'm experiencing some technical difficulties, let me share some thoughts on your question.",
    ];

    // Simple contextual responses based on keywords
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("generate") || lowerMessage.includes("create")) {
      return "I'd be happy to help you generate code! While I'm having connection issues, I recommend: 1) Be specific about requirements 2) Mention the programming language 3) Include any constraints or patterns you want to follow. Once I'm back online, I can provide detailed code examples.";
    } else if (lowerMessage.includes("debug") || lowerMessage.includes("fix")) {
      return "For debugging help, I recommend: 1) Check error messages carefully 2) Review recent changes 3) Use console.log or debugger statements 4) Test with smaller inputs. When I'm back online, I can help analyze specific code and errors.";
    } else if (lowerMessage.includes("explain")) {
      return "I'd love to help explain concepts! While I'm having connection issues, try breaking down complex topics into smaller parts and focus on understanding the 'why' behind each component. I'll be able to provide detailed explanations soon.";
    } else if (lowerMessage.includes("optimize") || lowerMessage.includes("improve")) {
      return "For optimization help, consider: 1) Identify bottlenecks first 2) Measure before and after changes 3) Focus on high-impact improvements 4) Consider readability alongside performance. I can provide specific optimization advice once I'm back online.";
    } else {
      return responses[Math.floor(Math.random() * responses.length)] + " I'm experiencing some connection issues at the moment, but I'll be back to help you properly soon!";
    }
  }
}

// Singleton instance
export const aiChatService = new AIChatService();