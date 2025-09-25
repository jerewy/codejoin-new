"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Folder,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Code,
  Database,
  Globe,
  Trash2,
  PencilLine,
  FolderPlus,
  FilePlus,
  Upload,
  AlertTriangle,
} from "lucide-react";
import FileUploadModal from "./file-upload-modal";

interface FileItem {
  id?: string;
  name: string;
  type: string;
  language?: string | null;
  parent_id?: string | null;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  path: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface FileExplorerProps {
  files: FileItem[];
  activeFile: string | null;
  onFileSelect: (fileId: string) => void;
  onCreateFile?: (name: string, parentId?: string | null) => void;
  onCreateFolder?: (name: string, parentId?: string | null) => void;
  onRename?: (id: string | undefined, oldName: string, newName: string) => void;
  onDelete?: (id: string | undefined) => void;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  projectId: string;
}

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: "file" | "folder";
}

function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
}: DeleteConfirmationProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleEnter = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        onConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("keydown", handleEnter);
      dialogRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleEnter);
    };
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        tabIndex={-1}
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h2 className="text-lg font-semibold">Confirm Delete</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Are you sure you want to delete the {itemType}{" "}
          <span className="font-medium text-foreground">"{itemName}"</span>?
          {itemType === "folder" && (
            <span className="block mt-1 text-red-600">
              This will also delete all files and folders inside it.
            </span>
          )}
          <span className="block mt-2 font-medium">
            This action cannot be undone.
          </span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onUpload: () => void;
  isFolder: boolean;
  isRoot?: boolean;
}

function ContextMenu({
  x,
  y,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onUpload,
  isFolder,
  isRoot = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const menuItems = [];

  // Add file/folder options for folders and root
  if (isFolder || isRoot) {
    menuItems.push(
      {
        label: "New File",
        icon: <FilePlus className="h-4 w-4" />,
        action: onNewFile,
      },
      {
        label: "New Folder",
        icon: <FolderPlus className="h-4 w-4" />,
        action: onNewFolder,
      },
      {
        label: "Upload Files",
        icon: <Upload className="h-4 w-4" />,
        action: onUpload,
      }
    );
  }

  // Add rename/delete for non-root items
  if (!isRoot && onRename && onDelete) {
    if (menuItems.length > 0) {
      menuItems.push({ label: "separator" });
    }
    menuItems.push(
      {
        label: "Rename",
        icon: <PencilLine className="h-4 w-4" />,
        action: onRename,
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        action: onDelete,
        danger: true,
      }
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-popover border rounded-md shadow-md py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item, index) => {
        if (item.label === "separator") {
          return <div key={index} className="h-px bg-border my-1" />;
        }

        return (
          <button
            key={index}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left ${
              item.danger ? "text-red-600 hover:text-red-700" : ""
            }`}
            onClick={() => {
              if (item.action) {
                // Check if action exists before calling it
                item.action();
              }
              onClose();
            }}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default function FileExplorer({
  files,
  activeFile,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onFilesUploaded,
  projectId,
}: FileExplorerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem | null;
    isRoot?: boolean;
  } | null>(null);
  const [creatingIn, setCreatingIn] = useState<{
    parentId: string | null;
    type: "file" | "folder";
  } | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    item: FileItem;
    isOpen: boolean;
  } | null>(null);

  const handleRenameSubmit = (node: FileItem) => async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = editingName.trim();

    if (!newName || newName === node.name) {
      setEditingId(null);
      return;
    }

    if (onRename) {
      await onRename(node.id, node.name, newName);
    }
    setEditingId(null);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    item: FileItem | null,
    isRoot = false
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      isRoot,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = creatingName.trim();

    if (!name || !creatingIn) return;

    if (creatingIn.type === "file") {
      onCreateFile?.(name, creatingIn.parentId);
    } else {
      onCreateFolder?.(name, creatingIn.parentId);
    }

    setCreatingIn(null);
    setCreatingName("");
  };

  const startCreating = (type: "file" | "folder", parentId: string | null) => {
    setCreatingIn({ type, parentId });
    setCreatingName("");
    // Expand the parent folder if it's not expanded
    if (parentId && !expandedFolders.has(parentId)) {
      setExpandedFolders((prev) => new Set([...prev, parentId]));
    }
  };

  const handleDelete = (item: FileItem) => {
    setDeleteConfirmation({ item, isOpen: true });
  };

  const confirmDelete = () => {
    if (deleteConfirmation?.item) {
      onDelete?.(deleteConfirmation.item.id);
      setDeleteConfirmation(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const getFileIcon = (fileName: string, language?: string | null) => {
    if (language) {
      switch (language) {
        case "html":
          return <Globe className="h-4 w-4 text-orange-400" />;
        case "css":
          return <FileText className="h-4 w-4 text-blue-400" />;
        case "javascript":
          return <Code className="h-4 w-4 text-yellow-400" />;
        case "typescript":
          return <Code className="h-4 w-4 text-blue-500" />;
        case "python":
          return <Code className="h-4 w-4 text-green-500" />;
        case "sql":
          return <Database className="h-4 w-4 text-purple-400" />;
        default:
          return <FileText className="h-4 w-4 text-muted-foreground" />;
      }
    }

    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
        return <Globe className="h-4 w-4 text-orange-400" />;
      case "css":
        return <FileText className="h-4 w-4 text-blue-400" />;
      case "js":
        return <Code className="h-4 w-4 text-yellow-400" />;
      case "ts":
        return <Code className="h-4 w-4 text-blue-500" />;
      case "py":
        return <Code className="h-4 w-4 text-green-500" />;
      case "sql":
        return <Database className="h-4 w-4 text-purple-400" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const childrenOf = (id: string | null) =>
    files.filter((f) => f.parent_id === id);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCreateInput = (
    parentId: string | null,
    type: "file" | "folder"
  ) => {
    if (
      !creatingIn ||
      creatingIn.parentId !== parentId ||
      creatingIn.type !== type
    ) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 p-1">
        {type === "folder" ? (
          <Folder className="h-4 w-4 text-blue-500" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <form onSubmit={handleCreateSubmit} className="flex-1">
          <Input
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setCreatingIn(null);
                setCreatingName("");
              }
            }}
            onBlur={() => {
              setCreatingIn(null);
              setCreatingName("");
            }}
            placeholder={type === "folder" ? "folder-name" : "filename"}
            className="h-6 text-xs"
            autoFocus
          />
        </form>
      </div>
    );
  };

  const renderItems = (parentId: string | null, depth = 0) => {
    const items = childrenOf(parentId);

    return (
      <div className="space-y-1">
        {/* Render new folder input first (folders appear before files) */}
        {renderCreateInput(parentId, "folder")}

        {items
          .filter((item) => item.type === "folder")
          .map((item) => {
            const isOpen = item.id ? expandedFolders.has(item.id) : false;

            return (
              <div key={`${item.id ?? item.name}`}>
                <div
                  className="flex items-center gap-2 p-1 rounded hover:bg-muted group"
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => item.id && toggleFolder(item.id)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  {editingId === item.id ? (
                    <form
                      onSubmit={handleRenameSubmit(item)}
                      className="flex-1 flex items-center gap-2"
                    >
                      <Folder className="h-4 w-4 text-blue-500" />
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="h-6 text-sm"
                      />
                    </form>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 text-left">
                      <Folder className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  )}
                </div>

                {isOpen && item.id && (
                  <div className="ml-4">{renderItems(item.id, depth + 1)}</div>
                )}
              </div>
            );
          })}

        {/* Render new file input after folders */}
        {renderCreateInput(parentId, "file")}

        {/* Render files */}
        {items
          .filter((item) => item.type === "file")
          .map((item) => (
            <div
              key={`${item.id ?? item.name}`}
              className={`group flex items-center gap-2 p-1 rounded hover:bg-muted ${
                activeFile === (item.id || item.name) ? "bg-muted" : ""
              }`}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              {editingId === item.id ? (
                <form
                  onSubmit={handleRenameSubmit(item)}
                  className="flex-1 flex items-center gap-2"
                >
                  {getFileIcon(item.name, item.language)}
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="h-6 text-sm"
                  />
                </form>
              ) : (
                <div
                  className="flex-1 flex items-center gap-2 text-left truncate cursor-pointer"
                  onClick={() => onFileSelect(item.id || item.name)}
                >
                  {getFileIcon(item.name, item.language)}
                  <span className="flex-1 text-sm truncate">{item.name}</span>
                </div>
              )}
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Explorer</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startCreating("folder", null)}
              title="New Folder"
            >
              <Folder className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startCreating("file", null)}
              title="New File"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-2">
          {/* Root folder */}
          <div
            className="flex items-center gap-2 p-1 rounded hover:bg-muted"
            onContextMenu={(e) => handleContextMenu(e, null, true)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1 flex items-center gap-2 text-left">
              <Folder className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">root</span>
            </div>
          </div>

          {isExpanded && <div className="ml-4">{renderItems(null)}</div>}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onNewFile={() => startCreating("file", contextMenu.item?.id ?? null)}
          onNewFolder={() =>
            startCreating("folder", contextMenu.item?.id ?? null)
          }
          onRename={
            contextMenu.item
              ? () => {
                  setEditingId(contextMenu.item!.id ?? contextMenu.item!.name);
                  setEditingName(contextMenu.item!.name);
                }
              : undefined
          }
          onDelete={
            contextMenu.item ? () => handleDelete(contextMenu.item!) : undefined
          }
          onUpload={() => setIsUploadModalOpen(true)}
          isFolder={
            contextMenu.item?.type === "folder" || contextMenu.isRoot || false
          }
          isRoot={contextMenu.isRoot}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <DeleteConfirmation
          isOpen={deleteConfirmation.isOpen}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          itemName={deleteConfirmation.item.name}
          itemType={deleteConfirmation.item.type as "file" | "folder"}
        />
      )}

      {/* File Upload Modal */}
      <FileUploadModal
        projectId={projectId}
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onFilesUploaded={(uploadedFiles) => {
          if (onFilesUploaded) {
            onFilesUploaded(uploadedFiles);
          }
        }}
      />
    </div>
  );
}
