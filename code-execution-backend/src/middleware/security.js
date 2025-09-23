const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Rate limiting middleware
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;
  const expectedApiKey = process.env.API_KEY;

  // Skip authentication in development if no API key is set
  if (process.env.NODE_ENV === 'development' && !expectedApiKey) {
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }

  if (apiKey !== expectedApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      providedKey: apiKey.substring(0, 8) + '...',
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};

// Request ID middleware
const addRequestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Input validation middleware
const validateInput = (req, res, next) => {
  // Check for potentially dangerous patterns in code
  if (req.body.code) {
    const dangerousPatterns = [
      /\bexec\s*\(/i,
      /\beval\s*\(/i,
      /\b__import__\s*\(/i,
      /\bos\.system\s*\(/i,
      /\bsubprocess\s*\./i,
      /\brequire\s*\(\s*['"]child_process['"]\s*\)/i,
      /\bprocess\s*\.\s*exit\s*\(/i,
      /\bwhile\s*\(\s*true\s*\)/i,
      /\bfor\s*\(\s*;\s*;\s*\)/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(req.body.code)) {
        logger.warn('Potentially dangerous code detected', {
          ip: req.ip,
          pattern: pattern.toString(),
          requestId: req.id
        });

        return res.status(400).json({
          success: false,
          error: 'Code contains potentially dangerous patterns'
        });
      }
    }
  }

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.id
  });
};

module.exports = {
  createRateLimit,
  authenticateApiKey,
  addRequestId,
  validateInput,
  errorHandler
};