const { getLanguageConfig, isLanguageSupported } = require('../config/languages');
const DockerService = require('./dockerService');
const logger = require('../utils/logger');

const DEFAULT_LANGUAGE = 'javascript';
const CTRL_C = '\u0003';
const CTRL_C_CODE = CTRL_C.charCodeAt(0);

function toBufferLike(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }

  return null;
}

function normalizeTerminalInput(input) {
  if (input === undefined || input === null) {
    return null;
  }

  const bufferValue = toBufferLike(input);
  if (bufferValue) {
    if (bufferValue.length === 0) {
      return null;
    }

    if (bufferValue.length === 1 && bufferValue[0] === CTRL_C_CODE) {
      return Buffer.from([CTRL_C_CODE]);
    }

    return bufferValue;
  }

  if (typeof input !== 'string') {
    return null;
  }

  if (input.length === 0) {
    return null;
  }

  if (input === CTRL_C) {
    return input;
  }

  return input;
}

class TerminalService {
  constructor(io) {
    this.io = io;
    this.dockerService = new DockerService();
    this.sessions = new Map();
    this.socketSessions = new Map();
  }

  async startSession(socket, { projectId, userId, language }) {
    if (!socket || !socket.id) {
      throw new Error('Socket is required to start a terminal session');
    }

    if (!projectId || !userId) {
      throw new Error('projectId and userId are required');
    }

    const requestedLanguage = typeof language === 'string'
      ? language.toLowerCase()
      : DEFAULT_LANGUAGE;

    const languageKey = isLanguageSupported(requestedLanguage)
      ? requestedLanguage
      : DEFAULT_LANGUAGE;

    if (languageKey !== requestedLanguage) {
      logger.warn('Unsupported terminal language requested, falling back to default', {
        requestedLanguage,
        fallbackLanguage: languageKey
      });
    }

    const languageConfig = getLanguageConfig(languageKey);
    if (!languageConfig) {
      throw new Error(`Unable to load configuration for language '${languageKey}'`);
    }

    const { sessionId, stream } = await this.dockerService.createInteractiveContainer(languageConfig);
    stream.setEncoding('utf-8');

    const session = {
      sessionId,
      socket,
      socketId: socket.id,
      projectId,
      userId,
      language: languageKey,
      stream,
      cleaning: false,
      createdAt: new Date()
    };

    this.sessions.set(sessionId, session);

    if (!this.socketSessions.has(socket.id)) {
      this.socketSessions.set(socket.id, new Set());
    }
    this.socketSessions.get(socket.id).add(sessionId);

    const handleExitCleanup = (details) => this.cleanupSession(sessionId, details)
      .catch((cleanupError) => {
        logger.warn('Failed to cleanup terminal session after container exit', {
          sessionId,
          error: cleanupError.message
        });
      });

    stream.on('data', (chunk) => {
      socket.emit('terminal:data', { sessionId, chunk });
    });

    stream.on('error', (error) => {
      logger.warn('Terminal stream error', { sessionId, error: error.message });
      socket.emit('terminal:error', { sessionId, message: error.message });
    });

    stream.on('close', () => {
      this.cleanupSession(sessionId, { reason: 'Terminal stream closed', emitExit: true })
        .catch((cleanupError) => {
          logger.warn('Failed to cleanup terminal session after stream close', {
            sessionId,
            error: cleanupError.message
          });
        });
    });

    this.dockerService.waitForContainer(sessionId)
      .then((status) => handleExitCleanup({
        code: typeof status?.StatusCode === 'number' ? status.StatusCode : null,
        emitExit: true
      }))
      .catch((error) => handleExitCleanup({
        reason: error.message,
        emitExit: true
      }));

    socket.emit('terminal:ready', { sessionId });
    logger.info('Terminal session started', {
      sessionId,
      socketId: socket.id,
      projectId,
      userId,
      language: languageKey
    });

    return sessionId;
  }

  async sendInput(sessionId, input) {
    const session = this.sessions.get(sessionId);
    if (!session || session.cleaning || !session.stream) {
      throw new Error(`Terminal session '${sessionId}' is not active`);
    }

    const payload = normalizeTerminalInput(input);
    if (payload === null || payload === '') {
      return;
    }

    await new Promise((resolve, reject) => {
      try {
        session.stream.write(payload, (writeError) => {
          if (writeError) {
            reject(writeError);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });

    session.lastActivity = new Date();
  }

  async resizeSession(sessionId, dimensions) {
    const session = this.sessions.get(sessionId);
    if (!session || session.cleaning) {
      throw new Error(`Terminal session '${sessionId}' is not active`);
    }

    await this.dockerService.resizeInteractiveContainer(sessionId, dimensions);
  }

  async stopSession(sessionId) {
    await this.cleanupSession(sessionId, {
      reason: 'Session stopped by user',
      emitExit: true
    });
  }

  async cleanupSession(sessionId, { code = null, reason = null, emitExit = false } = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.cleaning) {
      return;
    }

    session.cleaning = true;

    if (session.stream) {
      session.stream.removeAllListeners('data');
      session.stream.removeAllListeners('error');
      session.stream.removeAllListeners('close');
      try {
        session.stream.destroy();
      } catch (error) {
        logger.warn('Failed to destroy terminal stream', { sessionId, error: error.message });
      }
    }

    this.sessions.delete(sessionId);

    const socketSessionIds = this.socketSessions.get(session.socketId);
    if (socketSessionIds) {
      socketSessionIds.delete(sessionId);
      if (socketSessionIds.size === 0) {
        this.socketSessions.delete(session.socketId);
      }
    }

    try {
      await this.dockerService.stopInteractiveContainer(sessionId);
    } catch (error) {
      logger.warn('Failed to stop interactive container', { sessionId, error: error.message });
    }

    if (emitExit && session.socket && session.socket.connected) {
      session.socket.emit('terminal:exit', {
        sessionId,
        code,
        reason
      });
    }
  }

  async handleDisconnect(socketId) {
    const sessionIds = this.socketSessions.get(socketId);
    if (!sessionIds) {
      return;
    }

    for (const sessionId of Array.from(sessionIds)) {
      await this.cleanupSession(sessionId, {
        reason: 'Socket disconnected',
        emitExit: false
      });
    }

    this.socketSessions.delete(socketId);
  }

  async cleanup() {
    const activeSessions = Array.from(this.sessions.keys());
    await Promise.all(activeSessions.map((sessionId) =>
      this.cleanupSession(sessionId, {
        reason: 'Service shutting down',
        emitExit: false
      })
    ));

    await this.dockerService.cleanupAll();
  }
}

module.exports = TerminalService;
