class LocalAIService {
  private ollamaUrl = 'http://localhost:11434';
  private model = 'deepseek-coder:6.7b';

  async generateResponse(prompt: string, context: string): Promise<string> {
    try {
      // Create a more flexible and natural system prompt
      const systemPrompt = `You are DeepSeek Coder, an expert programming assistant. You're helpful, knowledgeable, and provide practical solutions.

${context ? `Current code context:\n${context}\n\n` : ''}The user is asking: ${prompt}

Please provide a helpful, detailed response. Feel free to:
- Write and explain code examples
- Suggest improvements and best practices
- Debug issues and explain solutions
- Answer technical questions thoroughly
- Use code blocks when helpful
- Be conversational and natural in your responses`;

      console.log('🤖 Sending request to local AI:', { model: this.model, promptLength: prompt.length });

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: systemPrompt,
          stream: false,
          options: {
            temperature: 0.7,        // Increased for more creativity
            top_p: 0.95,             // Increased for diverse responses
            max_tokens: 4000,        // Increased for longer responses
            repeat_penalty: 1.15,    // Increased to reduce repetition
            top_k: 40,               // Added for better word choice
            // Removed stop sequence to allow complete responses
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.response?.trim() || '';

      console.log('✅ Local AI response received:', {
        responseLength: aiResponse.length,
        model: this.model
      });

      return aiResponse;
    } catch (error) {
      console.error('❌ Local AI service error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Local AI health check failed:', error);
      return false;
    }
  }

  getModel(): string {
    return this.model;
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }
}

export const localAIService = new LocalAIService();
export default localAIService;