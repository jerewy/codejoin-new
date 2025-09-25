'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinProject: (projectId: string, userData: { userId: string; userName: string; userAvatar?: string }) => void
  leaveProject: (projectId: string) => void
  emitFileChange: (data: { projectId: string; fileId: string; content: string; userId: string; operation: string }) => void
  emitCursorPosition: (data: { projectId: string; fileId: string; position: any; userId: string }) => void
  emitFileSelect: (data: { projectId: string; fileId: string; userId: string }) => void
  emitExecutionResult: (data: { projectId: string; fileId: string; result: any; userId: string }) => void
  collaborators: Array<{
    userId: string
    userName: string
    userAvatar?: string
    socketId: string
    lastActivity: Date
  }>
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinProject: () => {},
  leaveProject: () => {},
  emitFileChange: () => {},
  emitCursorPosition: () => {},
  emitFileSelect: () => {},
  emitExecutionResult: () => {},
  collaborators: []
})

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<Array<{
    userId: string
    userName: string
    userAvatar?: string
    socketId: string
    lastActivity: Date
  }>>([])

  useEffect(() => {
    // Only initialize socket connection if Socket.IO server is available
    let socketInstance: Socket | null = null

    try {
      socketInstance = io(process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        : 'http://localhost:3000',
        {
          timeout: 5000,
          forceNew: true
        }
      )

      socketInstance.on('connect', () => {
        console.log('Connected to Socket.IO server')
        setIsConnected(true)
      })

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server')
        setIsConnected(false)
        setCollaborators([])
      })

      socketInstance.on('connect_error', (error) => {
        console.warn('Socket.IO connection failed:', error)
        setIsConnected(false)
      })

      // Listen for collaborator events
      socketInstance.on('collaborator-joined', (data) => {
        setCollaborators(prev => {
          const exists = prev.find(c => c.socketId === data.socketId)
          if (exists) return prev

          return [...prev, {
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            socketId: data.socketId,
            lastActivity: new Date()
          }]
        })
      })

      socketInstance.on('collaborator-left', (data) => {
        setCollaborators(prev => prev.filter(c => c.socketId !== data.socketId))
      })

      socketInstance.on('collaborators-list', (data) => {
        setCollaborators(data.map((collab: any) => ({
          ...collab,
          lastActivity: new Date(collab.lastActivity)
        })))
      })

      setSocket(socketInstance)
    } catch (error) {
      console.warn('Failed to initialize Socket.IO:', error)
      setIsConnected(false)
    }

    return () => {
      if (socketInstance) {
        socketInstance.close()
      }
    }
  }, [])

  const joinProject = useCallback(
    (projectId: string, userData: { userId: string; userName: string; userAvatar?: string }) => {
      if (socket) {
        socket.emit('join-project', {
          projectId,
          userId: userData.userId,
          userName: userData.userName,
          userAvatar: userData.userAvatar
        })
      }
    },
    [socket]
  )

  const leaveProject = useCallback((projectId: string) => {
    if (socket) {
      socket.leave(projectId)
    }
  }, [socket])

  const emitFileChange = useCallback((data: { projectId: string; fileId: string; content: string; userId: string; operation: string }) => {
    if (socket) {
      socket.emit('file-change', data)
    }
  }, [socket])

  const emitCursorPosition = useCallback((data: { projectId: string; fileId: string; position: any; userId: string }) => {
    if (socket) {
      socket.emit('cursor-position', data)
    }
  }, [socket])

  const emitFileSelect = useCallback((data: { projectId: string; fileId: string; userId: string }) => {
    if (socket) {
      socket.emit('file-select', data)
    }
  }, [socket])

  const emitExecutionResult = useCallback((data: { projectId: string; fileId: string; result: any; userId: string }) => {
    if (socket) {
      socket.emit('execution-result', data)
    }
  }, [socket])

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinProject,
      leaveProject,
      emitFileChange,
      emitCursorPosition,
      emitFileSelect,
      emitExecutionResult,
      collaborators
    }}>
      {children}
    </SocketContext.Provider>
  )
}

// Custom hook for real-time file collaboration
export const useFileCollaboration = (projectId: string, fileId: string, userId: string) => {
  const { socket, emitFileChange, emitCursorPosition, emitFileSelect } = useSocket()
  const [remoteChanges, setRemoteChanges] = useState<Array<{
    fileId: string
    content: string
    userId: string
    operation: string
    timestamp: Date
  }>>([])

  useEffect(() => {
    if (!socket) return

    const handleFileUpdate = (data: any) => {
      if (data.fileId === fileId && data.userId !== userId) {
        setRemoteChanges(prev => [...prev, {
          ...data,
          timestamp: new Date(data.timestamp)
        }])
      }
    }

    socket.on('file-updated', handleFileUpdate)

    return () => {
      socket.off('file-updated', handleFileUpdate)
    }
  }, [socket, fileId, userId])

  const handleContentChange = (content: string, operation = 'edit') => {
    emitFileChange({
      projectId,
      fileId,
      content,
      userId,
      operation
    })
  }

  const handleCursorMove = (position: any) => {
    emitCursorPosition({
      projectId,
      fileId,
      position,
      userId
    })
  }

  const handleFileSelect = () => {
    emitFileSelect({
      projectId,
      fileId,
      userId
    })
  }

  return {
    remoteChanges,
    handleContentChange,
    handleCursorMove,
    handleFileSelect,
    clearRemoteChanges: () => setRemoteChanges([])
  }
}