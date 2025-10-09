"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinProject: (
    projectId: string,
    userData: { userId: string; userName: string; userAvatar?: string }
  ) => void;
  leaveProject: (projectId: string) => void;
  emitFileChange: (data: {
    projectId: string;
    fileId: string;
    content: string;
    userId: string;
    operation: string;
  }) => void;
  emitCursorPosition: (data: {
    projectId: string;
    fileId: string;
    position: any;
    userId: string;
  }) => void;
  emitFileSelect: (data: {
    projectId: string;
    fileId: string;
    userId: string;
  }) => void;
  emitExecutionResult: (data: {
    projectId: string;
    fileId: string;
    result: any;
    userId: string;
  }) => void;
  emitChatMessage: (data: {
    projectId: string;
    conversationId?: string | null;
    message: Record<string, unknown>;
  }) => void;
  startTerminalSession: (data: TerminalSocketEvents["terminal:start"]) => void;
  sendTerminalInput: (data: TerminalSocketEvents["terminal:input"]) => void;
  stopTerminalSession: (data: TerminalSocketEvents["terminal:stop"]) => void;
  emitTerminalResize: (data: TerminalSocketEvents["terminal:resize"]) => void;
  resumeTerminalSession: (
    data: TerminalSocketEvents["terminal:resume"]
  ) => void;
  collaborators: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    socketId: string;
    lastActivity: Date;
  }>;
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
  emitChatMessage: () => {},
  startTerminalSession: () => {},
  sendTerminalInput: () => {},
  stopTerminalSession: () => {},
  emitTerminalResize: () => {},
  resumeTerminalSession: () => {},
  collaborators: [],
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

type TerminalSocketEvents = {
  "terminal:start": {
    projectId: string;
    userId: string;
    language?: string;
  };
  "terminal:stop": { sessionId: string };
  "terminal:input": {
    sessionId: string;
    input: string | ArrayBuffer | Uint8Array;
  };
  "terminal:resize": {
    sessionId: string;
    cols: number;
    rows: number;
  };
  "terminal:resume": {
    sessionId: string;
    projectId: string;
    userId: string;
  };
};

type TerminalSocketEvent = keyof TerminalSocketEvents;

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<
    Array<{
      userId: string;
      userName: string;
      userAvatar?: string;
      socketId: string;
      lastActivity: Date;
    }>
  >([]);

  useEffect(() => {
    // Only initialize socket connection if Socket.IO server is available
    let socketInstance: Socket | null = null;

    const resolveSocketUrl = () => {
      const explicitUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
      if (explicitUrl) {
        return explicitUrl;
      }

      if (process.env.NODE_ENV === "production") {
        return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      }

      return window.location.origin;
    };

    try {
      const socketUrl = resolveSocketUrl();

      socketInstance = io(socketUrl, {
        timeout: 5000,
        forceNew: true,
      });
      socketInstance.on("connect", () => {
        console.log("Connected to Socket.IO server");
        setIsConnected(true);
      });

      socketInstance.on("disconnect", () => {
        console.log("Disconnected from Socket.IO server");
        setIsConnected(false);
        setCollaborators([]);
      });

      socketInstance.on("connect_error", (error) => {
        console.warn("Socket.IO connection failed:", error);
        setIsConnected(false);
      });

      // Listen for collaborator events
      socketInstance.on("collaborator-joined", (data) => {
        setCollaborators((prev) => {
          const exists = prev.find((c) => c.socketId === data.socketId);
          if (exists) return prev;

          return [
            ...prev,
            {
              userId: data.userId,
              userName: data.userName,
              userAvatar: data.userAvatar,
              socketId: data.socketId,
              lastActivity: new Date(),
            },
          ];
        });
      });

      socketInstance.on("collaborator-left", (data) => {
        setCollaborators((prev) =>
          prev.filter((c) => c.socketId !== data.socketId)
        );
      });

      socketInstance.on("collaborators-list", (data) => {
        setCollaborators(
          data.map((collab: any) => ({
            ...collab,
            lastActivity: new Date(collab.lastActivity),
          }))
        );
      });

      setSocket(socketInstance);
    } catch (error) {
      console.warn("Failed to initialize Socket.IO:", error);
      setIsConnected(false);
    }

    return () => {
      if (socketInstance) {
        socketInstance.close();
      }
    };
  }, []);

  const joinProject = useCallback(
    (
      projectId: string,
      userData: { userId: string; userName: string; userAvatar?: string }
    ) => {
      if (socket) {
        socket.emit("join-project", {
          projectId,
          userId: userData.userId,
          userName: userData.userName,
          userAvatar: userData.userAvatar,
        });
      }
    },
    [socket]
  );

  const leaveProject = useCallback(
    (projectId: string) => {
      if (socket) {
        socket.emit("leave-project", { projectId });
      }
    },
    [socket]
  );

  const emitTerminalEvent = useCallback(
    <E extends TerminalSocketEvent>(
      event: E,
      payload: TerminalSocketEvents[E]
    ) => {
      if (!socket) {
        return;
      }
      socket.emit(event, payload);
    },
    [socket]
  );

  const emitFileChange = useCallback(
    (data: {
      projectId: string;
      fileId: string;
      content: string;
      userId: string;
      operation: string;
    }) => {
      if (socket) {
        socket.emit("file-change", data);
      }
    },
    [socket]
  );

  const emitCursorPosition = useCallback(
    (data: {
      projectId: string;
      fileId: string;
      position: any;
      userId: string;
    }) => {
      if (socket) {
        socket.emit("cursor-position", data);
      }
    },
    [socket]
  );

  const emitFileSelect = useCallback(
    (data: { projectId: string; fileId: string; userId: string }) => {
      if (socket) {
        socket.emit("file-select", data);
      }
    },
    [socket]
  );

  const emitExecutionResult = useCallback(
    (data: {
      projectId: string;
      fileId: string;
      result: any;
      userId: string;
    }) => {
      if (socket) {
        socket.emit("execution-result", data);
      }
    },
    [socket]
  );

  const emitChatMessage = useCallback(
    (data: {
      projectId: string;
      conversationId?: string | null;
      message: Record<string, unknown>;
    }) => {
      if (socket) {
        socket.emit("chat:message", data);
      }
    },
    [socket]
  );

  const startTerminalSession = useCallback(
    (data: TerminalSocketEvents["terminal:start"]) => {
      if (!socket) {
        return;
      }

      // Check if this is a Docker-related terminal start
      // We'll add Docker connection check here but not emit if rate limited
      const shouldEmit = true; // For now, always emit - the check will be done in the component
      if (shouldEmit) {
        emitTerminalEvent("terminal:start", data);
      }
    },
    [emitTerminalEvent, socket]
  );

  const sendTerminalInput = useCallback(
    (data: TerminalSocketEvents["terminal:input"]) => {
      emitTerminalEvent("terminal:input", data);
    },
    [emitTerminalEvent]
  );

  const stopTerminalSession = useCallback(
    (data: TerminalSocketEvents["terminal:stop"]) => {
      emitTerminalEvent("terminal:stop", data);
    },
    [emitTerminalEvent]
  );

  const emitTerminalResize = useCallback(
    (data: TerminalSocketEvents["terminal:resize"]) => {
      emitTerminalEvent("terminal:resize", data);
    },
    [emitTerminalEvent]
  );

  const resumeTerminalSession = useCallback(
    (data: TerminalSocketEvents["terminal:resume"]) => {
      emitTerminalEvent("terminal:resume", data);
    },
    [emitTerminalEvent]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinProject,
        leaveProject,
        emitFileChange,
        emitCursorPosition,
        emitFileSelect,
        emitExecutionResult,
        emitChatMessage,
        startTerminalSession,
        sendTerminalInput,
        stopTerminalSession,
        emitTerminalResize,
        resumeTerminalSession,
        collaborators,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook for real-time file collaboration
export const useFileCollaboration = (
  projectId: string,
  fileId: string,
  userId: string
) => {
  const { socket, emitFileChange, emitCursorPosition, emitFileSelect } =
    useSocket();
  const [remoteChanges, setRemoteChanges] = useState<
    Array<{
      fileId: string;
      content: string;
      userId: string;
      operation: string;
      timestamp: Date;
    }>
  >([]);

  const [remoteCursors, setRemoteCursors] = useState<
    Record<
      string,
      {
        userId: string;
        position: { lineNumber: number; column: number };
        socketId: string;
      }
    >
  >({});

  useEffect(() => {
    if (!socket) return;

    const handleFileUpdate = (data: any) => {
      if (data.fileId === fileId && data.userId !== userId) {
        setRemoteChanges((prev) => [
          ...prev,
          {
            ...data,
            timestamp: new Date(data.timestamp),
          },
        ]);
      }
    };

    socket.on('file-updated', handleFileUpdate);

    return () => {
      socket.off('file-updated', handleFileUpdate);
    };
  }, [socket, fileId, userId]);

  useEffect(() => {
    if (!socket) {
      setRemoteCursors({});
      return;
    }

    const handleCursorUpdate = (data: {
      projectId: string;
      fileId: string;
      position: { lineNumber: number; column: number };
      userId: string;
      socketId: string;
    }) => {
      if (
        data.projectId !== projectId ||
        data.fileId !== fileId ||
        data.userId === userId
      ) {
        return;
      }

      setRemoteCursors((prev) => ({
        ...prev,
        [data.socketId]: {
          userId: data.userId,
          position: data.position,
          socketId: data.socketId,
        },
      }));
    };

    const handleUserFileSelect = (data: {
      fileId: string;
      userId: string;
      socketId: string;
    }) => {
      if (data.userId === userId) {
        return;
      }

      if (data.fileId === fileId) {
        return;
      }

      setRemoteCursors((prev) => {
        if (!(data.socketId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    };

    const handleCollaboratorLeft = (data: { socketId: string }) => {
      setRemoteCursors((prev) => {
        if (!(data.socketId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    };

    socket.on('cursor-update', handleCursorUpdate);
    socket.on('user-file-select', handleUserFileSelect);
    socket.on('collaborator-left', handleCollaboratorLeft);

    return () => {
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('user-file-select', handleUserFileSelect);
      socket.off('collaborator-left', handleCollaboratorLeft);
    };
  }, [socket, projectId, fileId, userId]);

  useEffect(() => {
    setRemoteCursors({});
  }, [fileId]);

  const handleContentChange = useCallback(
    (content: string, operation = 'edit') => {
      emitFileChange({
        projectId,
        fileId,
        content,
        userId,
        operation,
      });
    },
    [emitFileChange, projectId, fileId, userId]
  );

  const handleCursorMove = useCallback(
    (position: { lineNumber: number; column: number }) => {
      emitCursorPosition({
        projectId,
        fileId,
        position,
        userId,
      });
    },
    [emitCursorPosition, projectId, fileId, userId]
  );

  const handleFileSelect = useCallback(() => {
    emitFileSelect({
      projectId,
      fileId,
      userId,
    });
  }, [emitFileSelect, projectId, fileId, userId]);

  const clearRemoteChanges = useCallback(() => {
    setRemoteChanges([]);
  }, []);

  return {
    remoteChanges,
    handleContentChange,
    handleCursorMove,
    handleFileSelect,
    clearRemoteChanges,
    remoteCursors,
  };
};

