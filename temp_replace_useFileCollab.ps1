const fs = require('fs');
const path = 'lib/socket.tsx';
const content = fs.readFileSync(path, 'utf8');
const marker = 'export const useFileCollaboration = (';
const start = content.indexOf(marker);
if (start === -1) {
  throw new Error('useFileCollaboration block not found');
}
let braceIndex = content.indexOf('{', start);
if (braceIndex === -1) {
  throw new Error('Opening brace not found');
}
let depth = 0;
let endIndex = -1;
for (let i = braceIndex; i < content.length; i++) {
  const char = content[i];
  if (char === '{') {
    depth++;
  } else if (char === '}') {
    depth--;
    if (depth === 0) {
      endIndex = i;
      break;
    }
  }
}
if (endIndex === -1) {
  throw new Error('Could not find end of function');
}
const before = content.slice(0, start);
const after = content.slice(endIndex + 2); // skip closing } and following newline
const newBlock = `export const useFileCollaboration = (
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
`;
const updated = before + newBlock + after;
fs.writeFileSync(path, updated);
