require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const executeController = require('./controllers/executeController');
const {
  createRateLimit,
  authenticateApiKey,
  addRequestId,
  validateInput,
  errorHandler
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Security middleware
app.use(addRequestId);

// Rate limiting - different limits for different endpoints
const generalRateLimit = createRateLimit(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
);

const executeRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  20 // 20 executions per 5 minutes
);

app.use('/api', generalRateLimit);

// API routes
app.get('/health', executeController.healthCheck);

// Protected routes
app.use('/api', authenticateApiKey);

// Execute endpoint with stricter rate limiting and validation
app.post('/api/execute', executeRateLimit, validateInput, executeController.execute);

// Language and system info endpoints
app.get('/api/languages', executeController.getLanguages);
app.get('/api/system', executeController.getSystemInfo);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');

  const { default: DockerService } = await import('./services/dockerService.js');
  const dockerService = new DockerService();

  try {
    await dockerService.cleanupAll();
    logger.info('All containers cleaned up');
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown');

  const { default: DockerService } = await import('./services/dockerService.js');
  const dockerService = new DockerService();

  try {
    await dockerService.cleanupAll();
    logger.info('All containers cleaned up');
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }

  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Code execution backend started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
  process.exit(1);
});

module.exports = app;