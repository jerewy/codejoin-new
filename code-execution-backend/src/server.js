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
const AIChatController = require('./controllers/aiChatController');
const {
  createRateLimit,
  authenticateApiKey,
  addRequestId,
  validateInput,
  errorHandler
} = require('./middleware/security');

const { enhancedErrorHandler } = require('./middleware/enhanced-error-handler');

const app = express();
const server = createServer(app);
const DEFAULT_PORT = process.env.PORT || 3001;

// Initialize health monitoring
const { initializeHealthChecks } = require('./monitoring/health-checks');

// Initialize AI Chat Controller
let aiChatController;
try {
  aiChatController = new AIChatController();
  logger.info('AI Chat Controller initialized successfully');
} catch (error) {
  logger.warn('AI Chat Controller initialization failed:', error.message);
}

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

const aiRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10 // 10 AI requests per minute
);

app.use('/api', generalRateLimit);

// API routes
app.get('/health', executeController.healthCheck);
app.get('/api/languages', executeController.getLanguages);
app.get('/api/system', executeController.getSystemInfo);

// Enhanced health monitoring endpoints
const { healthMonitorFactory } = require('./monitoring/health-monitor');
const { circuitBreakerFactory } = require('./ai/circuit-breaker');
const { retryManagerFactory } = require('./ai/retry-manager');

app.get('/api/health/detailed', (req, res) => {
  try {
    const overallHealth = healthMonitorFactory.getOverallHealth();
    const circuitBreakerStatus = circuitBreakerFactory.getHealthStatus();
    const retryManagerStats = {};

    retryManagerFactory.getAll().forEach((manager, name) => {
      retryManagerStats[name] = manager.getStats();
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: overallHealth,
      circuitBreakers: circuitBreakerStatus,
      retryManagers: retryManagerStats
    });
  } catch (error) {
    logger.error('Failed to get detailed health status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
      message: error.message
    });
  }
});

// Service-specific health endpoints
app.get('/api/health/docker', (req, res) => {
  try {
    const dockerMonitor = healthMonitorFactory.get('docker-service');
    const healthStatus = dockerMonitor.getHealthStatus();
    res.json({
      success: true,
      service: 'docker',
      ...healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'docker',
      error: error.message
    });
  }
});

app.get('/api/health/ai', (req, res) => {
  try {
    const aiMonitor = healthMonitorFactory.get('ai-service');
    const healthStatus = aiMonitor.getHealthStatus();
    res.json({
      success: true,
      service: 'ai',
      ...healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'ai',
      error: error.message
    });
  }
});

// Error metrics endpoint
app.get('/api/metrics/errors', (req, res) => {
  try {
    const errorMetrics = enhancedErrorHandler.getErrorMetrics();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: errorMetrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get error metrics',
      message: error.message
    });
  }
});

// Protected routes
app.use('/api', authenticateApiKey);

// Execute endpoint with stricter rate limiting and validation
app.post('/api/execute', executeRateLimit, validateInput, executeController.execute);

// AI Chat endpoint with rate limiting
app.post('/api/ai/chat', aiRateLimit, (req, res) => {
  if (!aiChatController) {
    return res.status(503).json({
      success: false,
      error: 'AI service is currently unavailable',
      fallback: true
    });
  }
  aiChatController.chat(req, res);
});

// AI health check endpoint
app.get('/api/ai/health', (req, res) => {
  if (!aiChatController) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'AI service is not initialized'
    });
  }
  aiChatController.healthCheck(req, res);
});

// AI metrics endpoint for monitoring
app.get('/api/ai/metrics', (req, res) => {
  if (!aiChatController) {
    return res.status(503).json({
      success: false,
      error: 'AI service is not initialized'
    });
  }
  aiChatController.getMetrics(req, res);
});

// AI status endpoint for service information
app.get('/api/ai/status', (req, res) => {
  if (!aiChatController) {
    return res.status(503).json({
      success: false,
      error: 'AI service is not initialized'
    });
  }
  aiChatController.getStatus(req, res);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Enhanced error handling
app.use(enhancedErrorHandler.handle());

// Fallback to basic error handler
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
    // Initialize rate limiting data for this socket if not present
    if (!socket.data.dockerFailureCount) {
      socket.data.dockerFailureCount = 0;
      socket.data.lastDockerFailureTime = null;
      socket.data.dockerBackoffUntil = null;
    }

    // Check if we're in a backoff period
    if (socket.data.dockerBackoffUntil && new Date() < socket.data.dockerBackoffUntil) {
      const remainingTime = Math.ceil((socket.data.dockerBackoffUntil - new Date()) / 1000);
      socket.emit('terminal:error', {
        message: `Docker connection temporarily unavailable. Please wait ${remainingTime} seconds before retrying.`,
        code: 'DOCKER_RATE_LIMITED'
      });
      return;
    }

    try {
      const { projectId, userId, language } = data;
      await terminalService.startSession(socket, { projectId, userId, language });

      // Reset failure count on successful connection
      socket.data.dockerFailureCount = 0;
      socket.data.lastDockerFailureTime = null;
      socket.data.dockerBackoffUntil = null;
      socket.data.dockerUnavailableNotified = false;
    } catch (error) {
      const shouldLog = error && error.shouldLog !== false;

      if (error instanceof DockerUnavailableError) {
        // Increment failure count and implement exponential backoff
        socket.data.dockerFailureCount = (socket.data.dockerFailureCount || 0) + 1;
        socket.data.lastDockerFailureTime = new Date();

        // Calculate backoff time (exponential: 5s, 10s, 20s, max 5min)
        const backoffSeconds = Math.min(5 * Math.pow(2, socket.data.dockerFailureCount - 1), 300);
        socket.data.dockerBackoffUntil = new Date(Date.now() + backoffSeconds * 1000);

        if (shouldLog) {
          logger.error('Failed to start terminal session', {
            error: error.message,
            failureCount: socket.data.dockerFailureCount,
            backoffSeconds,
            socketId: socket.id
          });
        } else {
          logger.debug('Docker unavailable while starting terminal session', {
            message: error.message,
            failureCount: socket.data.dockerFailureCount
          });
        }

        // Only emit error if we haven't notified this socket yet or if this is a new failure
        if (!socket.data.dockerUnavailableNotified || socket.data.dockerFailureCount === 1) {
          let errorMessage = error.message;
          if (socket.data.dockerFailureCount > 1) {
            errorMessage += ` (Attempt ${socket.data.dockerFailureCount} of 3. Please wait ${backoffSeconds}s before retrying.)`;
          }

          socket.emit('terminal:error', {
            message: errorMessage,
            code: error.code,
            failureCount: socket.data.dockerFailureCount,
            backoffSeconds
          });
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

    // Clean up rate limiting data for this socket
    if (socket.data) {
      delete socket.data.dockerFailureCount;
      delete socket.data.lastDockerFailureTime;
      delete socket.data.dockerBackoffUntil;
      delete socket.data.dockerUnavailableNotified;
    }

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
  // Initialize health checks before starting server
  try {
    initializeHealthChecks();
    logger.info('Health monitoring system initialized');
  } catch (error) {
    logger.error('Failed to initialize health monitoring:', error.message);
  }

  const server_instance = server.listen(port, () => {
    logger.info(`Code execution backend started on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`Detailed health: http://localhost:${port}/api/health/detailed`);
    logger.info(`Docker health: http://localhost:${port}/api/health/docker`);
    logger.info(`AI health: http://localhost:${port}/api/health/ai`);
    logger.info(`Error metrics: http://localhost:${port}/api/metrics/errors`);
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