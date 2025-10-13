const { createServer } = require('http')
const { Server } = require('socket.io')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const port = process.env.PORT || 3002
const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    detectSessionInUrl: false,
  },
})

// Store active collaborators and document states
const collaborators = new Map()
const documentStates = new Map()
const conversationProjectCache = new Map()

const resolveProjectIdForConversation = async (conversationId, metadata = null) => {
  let parsedMetadata = metadata

  if (metadata && typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata)
    } catch (error) {
      parsedMetadata = null
    }
  }

  if (!conversationId && !parsedMetadata) {
    return null
  }

  const metadataProjectId =
    parsedMetadata &&
    typeof parsedMetadata === 'object' &&
    parsedMetadata !== null &&
    (parsedMetadata.project_id || parsedMetadata.projectId)

  if (metadataProjectId) {
    if (typeof metadataProjectId === 'string') {
      return metadataProjectId
    }
    if (typeof metadataProjectId === 'number') {
      return `${metadataProjectId}`
    }
  }

  if (!conversationId) {
    return null
  }

  if (conversationProjectCache.has(conversationId)) {
    return conversationProjectCache.get(conversationId)
  }

  if (!supabaseClient) {
    return null
  }

  try {
    const { data, error } = await supabaseClient
      .from('conversations')
      .select('project_id')
      .eq('id', conversationId)
      .maybeSingle()

    if (error) {
      console.warn('Failed to resolve project for conversation', error.message)
      return null
    }

    const projectId = data?.project_id || null
    if (projectId) {
      conversationProjectCache.set(conversationId, projectId)
    }
    return projectId
  } catch (error) {
    console.warn('Unexpected error resolving conversation project', error)
    return null
  }
}

const startChatRelay = () => {
  if (!supabaseClient) {
    return null
  }

  const channel = supabaseClient
    .channel('server-chat-relay')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        const record = payload?.new
        if (!record) {
          return
        }

        const projectId = await resolveProjectIdForConversation(
          record.conversation_id || null,
          record.metadata || null
        )

        if (!projectId) {
          return
        }

        io.to(projectId).emit('chat:message', {
          projectId,
          conversationId: record.conversation_id || null,
          message: record,
        })
      }
    )

  channel
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Supabase chat relay subscribed')
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('Supabase chat relay channel error')
      }
    })
    .catch((error) => {
      console.warn('Supabase chat relay subscription failed', error)
    })

  return channel
}

const chatRelayChannel = startChatRelay()

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }))
    return
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
      socketId: socket.id,
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

  socket.on('leave-project', (data = {}) => {
    const { projectId } = data

    if (!projectId) {
      return
    }

    socket.leave(projectId)

    const collaborator = collaborators.get(socket.id)

    if (!collaborator) {
      return
    }

    if (collaborator.projectId === projectId) {
      collaborators.delete(socket.id)

      socket.to(projectId).emit('collaborator-left', {
        userId: collaborator.userId,
        userName: collaborator.userName,
        socketId: socket.id
      })
    }
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

  socket.on('chat:message', (data = {}) => {
    const { projectId, conversationId = null, message } = data || {}

    if (!projectId || !message || typeof projectId !== 'string') {
      return
    }

    if (collaborators.has(socket.id)) {
      collaborators.get(socket.id).lastActivity = new Date()
    }

    socket.to(projectId).emit('chat:message', {
      projectId,
      conversationId,
      message
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

const stopChatRelay = () => {
  if (chatRelayChannel && typeof chatRelayChannel.unsubscribe === 'function') {
    chatRelayChannel
      .unsubscribe()
      .catch((error) =>
        console.warn('Failed to unsubscribe chat relay channel', error)
      )
  }
}

const handleShutdown = () => {
  stopChatRelay()
}

process.on('SIGTERM', handleShutdown)
process.on('SIGINT', handleShutdown)

httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`)
  console.log(`CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
})