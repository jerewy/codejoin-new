/**
 * OpenRouter AI Provider
 * Integrates with OpenRouter API for access to various models including free Qwen Coder
 */

const axios = require('axios');

class OpenRouterProvider {
  constructor(config = {}) {
    this.name = 'openrouter';
    this.model = config.model || process.env.OPENROUTER_MODEL || 'qwen/qwen3-coder:free';
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.timeout = config.timeout || 30000;

    if (!this.apiKey || this.apiKey === 'your-openrouter-api-key-here' || !this.apiKey.startsWith('sk-or-v1')) {
      console.warn('⚠️ OpenRouter API key not set or invalid. Please set OPENROUTER_API_KEY in your environment for full functionality.');
      // For demo purposes, we'll continue without an API key but will show mock responses
      this.mockMode = true;
    } else {
      this.mockMode = false;
    }

    // OpenRouter specific headers
    this.defaultHeaders = {
      'HTTP-Referer': 'https://codejoin.app', // Optional: Your app URL
      'X-Title': 'CodeJoin AI Assistant', // Optional: Your app name
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Generate a chat completion using OpenRouter API
   */
  async chat(messages, options = {}) {
    try {
      const startTime = Date.now();

      // If in mock mode, return a mock response
      if (this.mockMode) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        const mockResponse = this.generateMockResponse(messages);
        return {
          content: mockResponse,
          model: this.model,
          usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
          responseTime: Date.now() - startTime,
          metadata: {
            provider: 'openrouter-mock',
            model: this.model,
            finishReason: 'stop',
            tokenUsage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
          }
        };
      }

      // Format messages for OpenRouter API
      const formattedMessages = this.formatMessages(messages);

      const requestData = {
        model: this.model,
        messages: formattedMessages,
        ...options
      };

      // Add default parameters for better coding assistance
      if (!requestData.temperature) {
        requestData.temperature = 0.7;
      }
      if (!requestData.max_tokens) {
        requestData.max_tokens = 4000;
      }
      if (!requestData.top_p) {
        requestData.top_p = 0.95;
      }

      const response = await axios.post(`${this.baseURL}/chat/completions`, requestData, {
        headers: this.defaultHeaders,
        timeout: this.timeout
      });

      const responseTime = Date.now() - startTime;

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid response from OpenRouter API');
      }

      const choice = response.data.choices[0];
      const result = {
        content: choice.message?.content || '',
        model: response.data.model,
        usage: response.data.usage,
        responseTime,
        metadata: {
          provider: 'openrouter',
          model: this.model,
          finishReason: choice.finish_reason,
          tokenUsage: response.data.usage
        }
      };

      return result;

    } catch (error) {
      console.error('OpenRouter API Error:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        model: this.model
      });

      // Handle specific OpenRouter errors
      if (error.response?.status === 401) {
        throw new Error('Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY.');
      } else if (error.response?.status === 429) {
        throw new Error('OpenRouter rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 402) {
        throw new Error('Insufficient OpenRouter credits. Please check your account balance.');
      }

      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }

  /**
   * Format messages for OpenRouter API
   */
  formatMessages(messages) {
    if (typeof messages === 'string') {
      return [{ role: 'user', content: messages }];
    }

    if (Array.isArray(messages)) {
      return messages.map(msg => {
        if (typeof msg === 'string') {
          return { role: 'user', content: msg };
        }

        // Ensure message has required fields
        return {
          role: msg.role || 'user',
          content: msg.content || '',
          ...(msg.name && { name: msg.name })
        };
      });
    }

    return [{ role: 'user', content: String(messages) }];
  }

  /**
   * Health check for OpenRouter API
   */
  async healthCheck() {
    try {
      const testMessage = {
        role: 'user',
        content: 'Hello! This is a health check. Please respond briefly.'
      };

      const startTime = Date.now();
      await this.chat([testMessage], { max_tokens: 50 });
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        responseTime,
        model: this.model,
        provider: 'openrouter'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        model: this.model,
        provider: 'openrouter'
      };
    }
  }

  /**
   * Generate mock response for demo purposes
   */
  generateMockResponse(messages) {
    const userMessage = typeof messages === 'string' ? messages :
                      (Array.isArray(messages) ? messages[messages.length - 1]?.content : 'Hello!');

    // Simple mock responses based on common coding requests
    const mockResponses = {
      'react': 'Here\'s a simple React component example:\n\n```jsx\nfunction TodoList() {\n  const [todos, setTodos] = useState([]);\n  \n  const addTodo = (text) => {\n    setTodos([...todos, { id: Date.now(), text, completed: false }]);\n  };\n  \n  const toggleTodo = (id) => {\n    setTodos(todos.map(todo => \n      todo.id === id ? { ...todo, completed: !todo.completed } : todo\n    ));\n  };\n  \n  return (\n    <div>\n      <h2>Todo List</h2>\n      {todos.map(todo => (\n        <div key={todo.id}>\n          <input\n            type="checkbox"\n            checked={todo.completed}\n            onChange={() => toggleTodo(todo.id)}\n          />\n          <span style={{ textDecoration: todo.completed ? \'line-through\' : \'none\' }}>\n            {todo.text}\n          </span>\n        </div>\n      ))}\n    </div>\n  );\n}\n```\n\nThis is a basic todo list component with add and toggle functionality.',
      'python': 'Here\'s a simple Python function example:\n\n```python\ndef calculate_factorial(n):\n    """Calculate the factorial of a number.\n    \n    Args:\n        n (int): The number to calculate factorial for\n        \n    Returns:\n        int: The factorial of n\n    """\n    if n < 0:\n        raise ValueError("Factorial is not defined for negative numbers")\n    elif n == 0 or n == 1:\n        return 1\n    else:\n        return n * calculate_factorial(n - 1)\n\n# Example usage\nprint(calculate_factorial(5))  # Output: 120\nprint(calculate_factorial(0))  # Output: 1\n```\n\nThis function calculates factorial recursively with proper error handling.',
      'javascript': 'Here\'s a simple JavaScript function example:\n\n```javascript\nfunction debounce(func, delay) {\n  let timeoutId;\n  return function(...args) {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => {\n      func.apply(this, args);\n    }, delay);\n  };\n}\n\n// Example usage\nconst searchInput = document.getElementById(\'search\');\nconst debouncedSearch = debounce((event) => {\n  console.log(\'Searching for:\', event.target.value);\n  // Your search logic here\n}, 300);\n\nsearchInput.addEventListener(\'input\', debouncedSearch);\n```\n\nThis debounce function helps optimize performance by limiting how often a function is called.',
      'default': 'I\'m Qwen Coder, a 32B parameter AI model specialized in coding assistance! I can help you with:\n\n• Code generation and debugging\n• Algorithm design and optimization\n• Code reviews and best practices\n• Documentation and explanations\n• Multiple programming languages\n• Framework-specific assistance\n\nPlease let me know what you\'d like help with, and I\'ll provide detailed coding assistance!'
    };

    // Find relevant mock response based on message content
    const messageLower = userMessage.toLowerCase();
    if (messageLower.includes('react') || messageLower.includes('jsx')) {
      return mockResponses.react;
    } else if (messageLower.includes('python') || messageLower.includes('def')) {
      return mockResponses.python;
    } else if (messageLower.includes('javascript') || messageLower.includes('js')) {
      return mockResponses.javascript;
    } else {
      return mockResponses.default;
    }
  }

  /**
   * Get provider information
   */
  getInfo() {
    return {
      name: 'OpenRouter',
      model: this.model,
      baseURL: this.baseURL,
      capabilities: [
        'chat_completion',
        'coding_assistance',
        'multiple_models',
        'free_tier_available'
      ],
      supportedModels: [
        'qwen/qwen-2.5-coder-32b-instruct',
        'qwen/qwen-2.5-coder-14b-instruct',
        'qwen/qwen-2.5-coder-7b-instruct',
        'deepseek/deepseek-coder-33b-instruct',
        'meta-llama/llama-3.1-70b-instruct',
        'anthropic/claude-3.5-sonnet'
      ]
    };
  }

  /**
   * Test connection with specific model
   */
  async testConnection(model = null) {
    const testModel = model || this.model;
    const originalModel = this.model;

    try {
      this.model = testModel;
      const result = await this.healthCheck();
      return result;
    } finally {
      this.model = originalModel;
    }
  }
}

module.exports = OpenRouterProvider;