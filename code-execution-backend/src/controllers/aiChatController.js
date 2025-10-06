const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class AIChatController {
  constructor() {
    // Initialize Gemini AI with API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      logger.error('Gemini API key not found in environment variables');
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro-latest' });
  }

  async chat(req, res) {
    const startTime = Date.now();

    try {
      const { message, context } = req.body;

      // Validate input
      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a string'
        });
      }

      if (message.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long (max 10000 characters)'
        });
      }

      logger.info('AI chat request received', {
        messageLength: message.length,
        hasContext: !!context
      });

      // Build the prompt with context if provided
      let fullPrompt = message;
      if (context) {
        fullPrompt = `Context: ${context}\n\nUser: ${message}`;
      }

      // Generate response from Gemini
      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      const responseTime = Date.now() - startTime;

      logger.info('AI chat response generated', {
        responseTime,
        responseLength: text.length
      });

      res.json({
        success: true,
        response: text,
        metadata: {
          model: 'gemini-pro',
          responseTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('AI chat error', {
        error: error.message,
        responseTime,
        stack: error.stack
      });

      // Handle specific Gemini API errors
      if (error.message.includes('API key')) {
        return res.status(500).json({
          success: false,
          error: 'AI service configuration error'
        });
      }

      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'AI service rate limit exceeded. Please try again later.'
        });
      }

      if (error.message.includes('safety')) {
        return res.status(400).json({
          success: false,
          error: 'Message blocked by safety filters'
        });
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: 'AI service temporarily unavailable'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      // Test the Gemini API connection
      const result = await this.model.generateContent('Hello');
      const response = result.response;
      const text = response.text();

      logger.info('AI health check passed');

      res.json({
        success: true,
        status: 'healthy',
        model: 'gemini-pro',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('AI health check failed', { error: error.message });

      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'AI service unavailable'
      });
    }
  }
}

module.exports = AIChatController;