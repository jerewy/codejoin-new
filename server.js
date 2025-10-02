// server.js - Custom Next.js server with Socket.IO
const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')
const DockerService = require('./code-execution-backend/src/services/dockerService')
const {
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
  isLanguageSupported,
} = require('./code-execution-backend/src/config/languages')

const DEFAULT_TERMINAL_LANGUAGE = 'javascript'
const MULTI_LANGUAGE_FALLBACK_KEY =
  Object.entries(SUPPORTED_LANGUAGES).find(([, config]) => {
    return config?.image === 'code-exec-multi'
  })?.[0] || DEFAULT_TERMINAL_LANGUAGE

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

// Store active collaborators and document states
const collaborators = new Map()
const documentStates = new Map()
const dockerService = new DockerService()

const CTRL_C = '\u0003'
const CTRL_C_CHAR_CODE = CTRL_C.charCodeAt(0)
const TERMINAL_SESSION_IDLE_TIMEOUT_MS = 2 * 60 * 1000

function toBufferLike(value) {
  if (Buffer.isBuffer(value)) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value)
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  }

  return null
}

function normalizeTerminalInput(input) {
  if (input === undefined || input === null) {
    return null
  }

  const bufferValue = toBufferLike(input)
  if (bufferValue) {
    if (bufferValue.length === 0) {
      return null
    }

    if (
      bufferValue.length === 1 &&
      bufferValue[0] === CTRL_C_CHAR_CODE
    ) {
      return Buffer.from([CTRL_C_CHAR_CODE])
    }

    return bufferValue
  }

  if (typeof input !== 'string') {
    return null
  }

  if (input.length === 0) {
    return null
  }

  if (input === CTRL_C) {
    return input
  }

  return input
}

app.prepare().then(() => {
  const httpServer = createServer(handler)

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL
        : "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  })

  const terminalSessionRegistry = new Map()

  const emitToSocket = (socketId, event, payload) => {
    if (!socketId) {
      return
    }

    const targetSocket = io.sockets.sockets.get(socketId)
    if (targetSocket) {
      targetSocket.emit(event, payload)
    }
  }

  const detachSessionStream = (session) => {
    if (session.detachStream) {
      try {
        session.detachStream()
      } catch (streamError) {
        console.warn('Failed to detach terminal stream', streamError.message)
      }
      session.detachStream = null
    }
  }

  const attachStreamToSocket = (session, stream, socket) => {
    const reusableStream =
      stream ||
      (session.stream &&
      !session.stream.destroyed &&
      !session.stream.readableEnded
        ? session.stream
        : null)

    if (!reusableStream) {
      throw new Error('Terminal stream is no longer available')
    }

    detachSessionStream(session)

    if (session.idleTimer) {
      clearTimeout(session.idleTimer)
      session.idleTimer = null
    }

    reusableStream.setEncoding('utf-8')

    const handleData = (chunk) => {
      socket.emit('terminal:data', {
        sessionId: session.sessionId,
        chunk
      })
    }

    const handleError = (error) => {
      socket.emit('terminal:error', {
        sessionId: session.sessionId,
        message: error.message
      })
    }

    const handleClose = () => {
      if (session.cleaning) {
        return
      }

      if (session.activeSocketId === socket.id) {
        session.activeSocketId = null
      }

      if (session.stream === reusableStream) {
        session.stream = null
      }
    }

    reusableStream.on('data', handleData)
    reusableStream.on('error', handleError)
    reusableStream.on('close', handleClose)

    if (typeof reusableStream.resume === 'function') {
      reusableStream.resume()
    }

    session.stream = reusableStream
    session.activeSocketId = socket.id
    session.lastKnownSocketId = socket.id
    session.detachStream = () => {
      reusableStream.off('data', handleData)
      reusableStream.off('error', handleError)
      reusableStream.off('close', handleClose)

      if (typeof reusableStream.pause === 'function') {
        try {
          reusableStream.pause()
        } catch (pauseError) {
          console.warn('Failed to pause terminal stream', pauseError.message)
        }
      }
    }
  }

  const cleanupTerminalSession = async (
    sessionId,
    { code = null, reason = null, emitExit = false, targetSocketId = null } = {}
  ) => {
    const session = terminalSessionRegistry.get(sessionId)
    if (!session || session.cleaning) {
      return
    }

    session.cleaning = true

    if (session.idleTimer) {
      clearTimeout(session.idleTimer)
      session.idleTimer = null
    }

    detachSessionStream(session)
    session.activeSocketId = null

    terminalSessionRegistry.delete(sessionId)

    try {
      await dockerService.stopInteractiveContainer(sessionId)
    } catch (error) {
      console.warn('Failed to stop terminal session container', error.message)
    }

    if (emitExit) {
      const recipientSocketId = targetSocketId || session.lastKnownSocketId
      emitToSocket(recipientSocketId, 'terminal:exit', {
        sessionId,
        code,
        reason
      })
    }
  }

  const scheduleIdleCleanup = (session) => {
    if (session.idleTimer) {
      clearTimeout(session.idleTimer)
    }

    session.idleTimer = setTimeout(() => {
      cleanupTerminalSession(session.sessionId, {
        reason: 'Session expired after disconnect',
        emitExit: false
      }).catch((error) => {
        console.warn('Failed to cleanup idle terminal session', error.message)
      })
    }, TERMINAL_SESSION_IDLE_TIMEOUT_MS)
  }

  const markSessionDetached = (sessionId, socketId) => {
    const session = terminalSessionRegistry.get(sessionId)
    if (!session || session.cleaning) {
      return
    }

    if (session.activeSocketId !== socketId) {
      return
    }

    detachSessionStream(session)
    session.activeSocketId = null
    scheduleIdleCleanup(session)
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    const claimedTerminalSessions = new Set()

    socket.on('terminal:start', async ({ projectId, userId, language }) => {
      if (!projectId || !userId) {
        socket.emit('terminal:error', { message: 'projectId and userId are required' })
        return
      }

      const normalizedLanguage =
        typeof language === 'string' && language.trim().length > 0
          ? language.toLowerCase()
          : null

      let resolvedLanguageKey = normalizedLanguage

      if (resolvedLanguageKey && !isLanguageSupported(resolvedLanguageKey)) {
        console.warn(
          `terminal:start received unsupported language "${resolvedLanguageKey}" for project ${projectId}. Falling back to ${MULTI_LANGUAGE_FALLBACK_KEY}.`
        )
        resolvedLanguageKey = MULTI_LANGUAGE_FALLBACK_KEY
      }

      if (!resolvedLanguageKey) {
        console.warn(
          `terminal:start received no language for project ${projectId}. Using ${MULTI_LANGUAGE_FALLBACK_KEY} runtime.`
        )
        resolvedLanguageKey = MULTI_LANGUAGE_FALLBACK_KEY
      }

      let languageConfig = getLanguageConfig(resolvedLanguageKey)

      if (!languageConfig) {
        console.warn(
          `Unable to resolve terminal language config for "${resolvedLanguageKey}". Falling back to ${DEFAULT_TERMINAL_LANGUAGE}.`
        )
        languageConfig = getLanguageConfig(DEFAULT_TERMINAL_LANGUAGE)
      }

      try {
        const { sessionId, stream } = await dockerService.createInteractiveContainer(languageConfig)

        const sessionData = {
          sessionId,
          projectId,
          userId,
          languageKey: resolvedLanguageKey,
          stream: null,
          detachStream: null,
          idleTimer: null,
          activeSocketId: null,
          lastKnownSocketId: null,
          cleaning: false,
          createdAt: Date.now()
        }

        terminalSessionRegistry.set(sessionId, sessionData)
        claimedTerminalSessions.add(sessionId)

        attachStreamToSocket(sessionData, stream, socket)

        dockerService.waitForContainer(sessionId)
          .then((status) => {
            cleanupTerminalSession(sessionId, {
              code: typeof status?.StatusCode === 'number' ? status.StatusCode : null,
              emitExit: true
            })
          })
          .catch((error) => {
            cleanupTerminalSession(sessionId, {
              reason: error.message,
              emitExit: true
            })
          })
          .finally(() => {
            claimedTerminalSessions.delete(sessionId)
          })

        socket.emit('terminal:ready', { sessionId })
      } catch (error) {
        console.error('Failed to start terminal session', error)
        socket.emit('terminal:error', { message: error.message })
      }
    })

    socket.on('terminal:resume', async ({ sessionId, projectId, userId }) => {
      if (!sessionId || !projectId || !userId) {
        socket.emit('terminal:error', {
          sessionId,
          message: 'sessionId, projectId, and userId are required to resume a session'
        })
        return
      }

      const session = terminalSessionRegistry.get(sessionId)
      if (!session || session.cleaning) {
        socket.emit('terminal:error', {
          sessionId,
          message: 'Terminal session is no longer available'
        })
        return
      }

      if (session.projectId !== projectId || session.userId !== userId) {
        socket.emit('terminal:error', {
          sessionId,
          message: 'Terminal session is not accessible for this user'
        })
        return
      }

      const existingStream = session.stream
      const canReuseExistingStream =
        existingStream &&
        !existingStream.destroyed &&
        !existingStream.readableEnded

      try {
        claimedTerminalSessions.add(sessionId)
        const streamToAttach = canReuseExistingStream
          ? existingStream
          : (await dockerService.attachInteractiveStream(sessionId)).stream

        attachStreamToSocket(session, streamToAttach, socket)
        socket.emit('terminal:ready', { sessionId })
      } catch (error) {
        console.warn('Failed to resume terminal session', error)
        socket.emit('terminal:error', {
          sessionId,
          message: error.message
        })
        cleanupTerminalSession(sessionId, {
          reason: error.message,
          emitExit: false
        })
          .catch(() => {})
          .finally(() => {
            claimedTerminalSessions.delete(sessionId)
          })
      }
    })

    socket.on('terminal:input', ({ sessionId, input }) => {
      if (!sessionId || input === undefined || input === null) {
        return
      }

      const session = terminalSessionRegistry.get(sessionId)
      if (!session || session.cleaning || !session.stream) {
        return
      }

      if (session.activeSocketId !== socket.id) {
        return
      }

      const candidate = toBufferLike(input) ?? input
      if (typeof candidate !== 'string' && !Buffer.isBuffer(candidate)) {
        return
      }

      const payload = normalizeTerminalInput(candidate)
      if (payload === null || payload === '') {
        return
      }

      try {
        session.stream.write(payload, (writeError) => {
          if (writeError) {
            socket.emit('terminal:error', {
              sessionId,
              message: writeError.message
            })
          }
        })
      } catch (error) {
        socket.emit('terminal:error', {
          sessionId,
          message: error.message
        })
      }
    })

    socket.on('terminal:resize', async ({ sessionId, cols, rows }) => {
      if (!sessionId) {
        return
      }

      const width = Number(cols)
      const height = Number(rows)

      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return
      }

      if (width <= 0 || height <= 0) {
        return
      }

      const session = terminalSessionRegistry.get(sessionId)
      if (!session || session.cleaning) {
        return
      }

      if (session.activeSocketId !== socket.id) {
        return
      }

      try {
        await dockerService.resizeInteractiveContainer(sessionId, {
          cols: width,
          rows: height
        })
      } catch (error) {
        console.warn('Failed to resize terminal session', error)
        socket.emit('terminal:error', {
          sessionId,
          message: error.message
        })
      }
    })

    socket.on('terminal:stop', ({ sessionId }) => {
      if (!sessionId) return
      claimedTerminalSessions.delete(sessionId)
      cleanupTerminalSession(sessionId, {
        reason: 'Session stopped by user',
        emitExit: true,
        targetSocketId: socket.id
      })
    })

    // Join project collaboration room
    socket.on('join-project', (data) => {
      const { projectId, userId, userName, userAvatar } = data

      socket.join(projectId)

      // Store collaborator info
      collaborators.set(socket.id, {
        projectId,
        userId,
        userName,
        userAvatar,
        joinedAt: new Date(),
        lastActivity: new Date()
      })

      // Notify others in the project about new collaborator
      socket.to(projectId).emit('collaborator-joined', {
        userId,
        userName,
        userAvatar,
        socketId: socket.id
      })

      // Send current collaborators list to the new user
      const projectCollaborators = Array.from(collaborators.values())
        .filter(collab => collab.projectId === projectId)
        .map(collab => ({
          userId: collab.userId,
          userName: collab.userName,
          userAvatar: collab.userAvatar,
          socketId: collab.socketId,
          lastActivity: collab.lastActivity
        }))

      socket.emit('collaborators-list', projectCollaborators)
    })

    // Handle file content changes for real-time collaboration
    socket.on('file-change', (data) => {
      const { projectId, fileId, content, userId, operation } = data

      // Update document state
      const docKey = `${projectId}-${fileId}`
      documentStates.set(docKey, {
        content,
        lastModified: new Date(),
        modifiedBy: userId
      })

      // Update collaborator activity
      if (collaborators.has(socket.id)) {
        collaborators.get(socket.id).lastActivity = new Date()
      }

      // Broadcast changes to other collaborators in the same project
      socket.to(projectId).emit('file-updated', {
        fileId,
        content,
        userId,
        operation,
        timestamp: new Date()
      })
    })

    // Handle cursor position updates
    socket.on('cursor-position', (data) => {
      const { projectId, fileId, position, userId } = data

      socket.to(projectId).emit('cursor-update', {
        fileId,
        position,
        userId,
        socketId: socket.id
      })
    })

    // Handle file selection
    socket.on('file-select', (data) => {
      const { projectId, fileId, userId } = data

      socket.to(projectId).emit('user-file-select', {
        fileId,
        userId,
        socketId: socket.id
      })
    })

    // Handle project sharing
    socket.on('share-project', (data) => {
      const { projectId, shareData, sharedBy } = data

      socket.to(projectId).emit('project-shared', {
        shareData,
        sharedBy,
        timestamp: new Date()
      })
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)

      claimedTerminalSessions.forEach((sessionId) => {
        markSessionDetached(sessionId, socket.id)
      })
      claimedTerminalSessions.clear()

      const collaborator = collaborators.get(socket.id)
      if (collaborator) {
        const { projectId, userId, userName } = collaborator

        // Notify others about user leaving
        socket.to(projectId).emit('collaborator-left', {
          userId,
          userName,
          socketId: socket.id
        })

        // Remove from collaborators map
        collaborators.delete(socket.id)
      }
    })

    // Handle code execution results sharing
    socket.on('execution-result', (data) => {
      const { projectId, fileId, result, userId } = data

      socket.to(projectId).emit('execution-shared', {
        fileId,
        result,
        userId,
        timestamp: new Date()
      })
    })
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.IO server is running`)
  })
})