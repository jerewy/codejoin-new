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
const DEFAULT_PORT = process.env.PORT || 3001;

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
app.get('/api/languages', executeController.getLanguages);
app.get('/api/system', executeController.getSystemInfo);

// Protected routes
app.use('/api', authenticateApiKey);

// Execute endpoint with stricter rate limiting and validation
app.post('/api/execute', executeRateLimit, validateInput, executeController.execute);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling
app.use(errorHandler);

function registerShutdownHandlers(server) {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`${signal} received, starting graceful shutdown`);

      try {
        const DockerService = require('./services/dockerService');
        const dockerService = new DockerService();
        await dockerService.cleanupAll();
        logger.info('All containers cleaned up');
      } catch (error) {
        logger.error('Error during cleanup:', error);
      } finally {
        server.close(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });
      }
    });
  });
}

function startServer(port = DEFAULT_PORT) {
  const server = app.listen(port, () => {
    logger.info(`Code execution backend started on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://localhost:${port}/health`);
  });

  server.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });

  registerShutdownHandlers(server);
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.start = startServer;