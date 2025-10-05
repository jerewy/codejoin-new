require('dotenv').config();

if (!process.env.DOCKER_SOCKET && process.platform === 'win32') {
  process.env.DOCKER_SOCKET = '//./pipe/docker_engine'; // optional hint for your builder
}

console.log('DOCKER_HOST in this process =', process.env.DOCKER_HOST || '<unset>');

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
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
const server = createServer(app);
const DEFAULT_PORT = process.env.PORT || 3001;

// Initialize Socket.IO with CORS support
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

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

// Initialize Terminal Service for Socket.IO
const TerminalService = require('./services/terminalService');
const { DockerUnavailableError } = TerminalService;
const terminalService = new TerminalService(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected to terminal service', { socketId: socket.id });

  if (!socket.data) {
    socket.data = {};
  }

  // Handle terminal session lifecycle
  socket.on('terminal:start', async (data) => {
    try {
      const { projectId, userId, language } = data;
      await terminalService.startSession(socket, { projectId, userId, language });
      socket.data.dockerUnavailableNotified = false;
    } catch (error) {
      const shouldLog = error && error.shouldLog !== false;

      if (error instanceof DockerUnavailableError) {
        if (shouldLog) {
          logger.error('Failed to start terminal session', { error: error.message });
        } else {
          logger.debug('Docker unavailable while starting terminal session', { message: error.message });
        }

        if (!socket.data.dockerUnavailableNotified) {
          socket.emit('terminal:error', { message: error.message, code: error.code });
          socket.data.dockerUnavailableNotified = true;
        }

        return;
      }

      if (shouldLog) {
        logger.error('Failed to start terminal session', { error: error.message });
      } else {
        logger.debug('Suppressed terminal session error log', { message: error.message });
      }

      socket.emit('terminal:error', { message: error.message });
    }
  });
  
  socket.on('terminal:stop', async (data) => {
    try {
      const { sessionId } = data;
      await terminalService.stopSession(sessionId);
    } catch (error) {
      logger.error('Failed to stop terminal session', { error: error.message });
      socket.emit('terminal:error', { message: error.message });
    }
  });
  
  socket.on('terminal:input', async (data) => {
    try {
      const { sessionId, input } = data;
      await terminalService.sendInput(sessionId, input);
    } catch (error) {
      logger.error('Failed to send terminal input', { error: error.message });
      socket.emit('terminal:error', { sessionId: data.sessionId, message: error.message });
    }
  });
  
  socket.on('terminal:resize', async (data) => {
    try {
      const { sessionId, cols, rows } = data;
      await terminalService.resizeSession(sessionId, { cols, rows });
    } catch (error) {
      logger.error('Failed to resize terminal', { error: error.message });
      socket.emit('terminal:error', { sessionId: data.sessionId, message: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected from terminal service', { socketId: socket.id });
    terminalService.handleDisconnect(socket.id);
  });
});

function registerShutdownHandlers(server) {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`${signal} received, starting graceful shutdown`);

      try {
        // Cleanup terminal sessions
        await terminalService.cleanup();
        
        // Cleanup Docker containers
        const DockerService = require('./services/dockerService');
        const dockerService = new DockerService();
        await dockerService.cleanupAll();
        logger.info('All containers and sessions cleaned up');
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
  const server_instance = server.listen(port, () => {
    logger.info(`Code execution backend started on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`Socket.IO enabled for interactive terminals`);
  });

  server_instance.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });

  registerShutdownHandlers(server_instance);
  return server_instance;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.start = startServer;