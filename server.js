// server.js - Custom Next.js server with Socket.IO
const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

// Store active collaborators and document states
const collaborators = new Map()
const documentStates = new Map()

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