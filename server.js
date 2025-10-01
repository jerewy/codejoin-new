// server.js - Custom Next.js server with Socket.IO
const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')
const DockerService = require('./code-execution-backend/src/services/dockerService')
const { getLanguageConfig } = require('./code-execution-backend/src/config/languages')

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

function normalizeTerminalInput(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return ''
  }

  if (input === CTRL_C) {
    return input
  }

  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const withTrailingNewline = normalized.endsWith('\n')
    ? normalized
    : `${normalized}\n`

  return withTrailingNewline.replace(/\n/g, '\r\n')
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

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    const terminalSessions = new Map()

    const cleanupTerminalSession = async (sessionId, { code = null, reason = null, emitExit = false } = {}) => {
      const session = terminalSessions.get(sessionId)
      if (!session || session.cleaning) {
        return
      }

      session.cleaning = true

      if (session.stream) {
        try {
          session.stream.destroy()
        } catch (streamError) {
          console.warn('Failed to destroy terminal stream', streamError.message)
        }
      }

      terminalSessions.delete(sessionId)

      try {
        await dockerService.stopInteractiveContainer(sessionId)
      } catch (error) {
        console.warn('Failed to stop terminal session container', error.message)
      }

      if (emitExit) {
        socket.emit('terminal:exit', {
          sessionId,
          code,
          reason
        })
      }
    }

    socket.on('terminal:start', async ({ projectId, userId, language }) => {
      if (!projectId || !userId) {
        socket.emit('terminal:error', { message: 'projectId and userId are required' })
        return
      }

      const languageKey = typeof language === 'string' ? language.toLowerCase() : 'javascript'
      const languageConfig = getLanguageConfig(languageKey) || getLanguageConfig('javascript')

      try {
        const { sessionId, stream } = await dockerService.createInteractiveContainer(languageConfig)

        stream.setEncoding('utf-8')

        const sessionData = {
          stream,
          cleaning: false
        }

        terminalSessions.set(sessionId, sessionData)

        stream.on('data', (chunk) => {
          socket.emit('terminal:data', {
            sessionId,
            chunk
          })
        })

        stream.on('error', (error) => {
          socket.emit('terminal:error', {
            sessionId,
            message: error.message
          })
        })

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

        socket.emit('terminal:ready', { sessionId })
      } catch (error) {
        console.error('Failed to start terminal session', error)
        socket.emit('terminal:error', { message: error.message })
      }
    })

    socket.on('terminal:input', ({ sessionId, input }) => {
      if (!sessionId || typeof input !== 'string') {
        return
      }

      const session = terminalSessions.get(sessionId)
      if (!session || session.cleaning || !session.stream) {
        return
      }

      const payload = normalizeTerminalInput(input)
      if (!payload) {
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

      const session = terminalSessions.get(sessionId)
      if (!session || session.cleaning) {
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
      cleanupTerminalSession(sessionId, {
        reason: 'Session stopped by user',
        emitExit: true
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

      terminalSessions.forEach((_, sessionId) => {
        cleanupTerminalSession(sessionId)
      })

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