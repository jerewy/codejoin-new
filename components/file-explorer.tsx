"use client";

import { useState } from "react";
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
} from "lucide-react";

interface FileItem {
  id?: string;
  name: string;
  type: string;
  language?: string | null;
  parent_id?: string | null;
}

interface FileExplorerProps {
  files: FileItem[];
  activeFile: string;
  onFileSelect: (fileName: string) => void;
  onCreateFile?: (name: string, parentId?: string | null) => void;
  onCreateFolder?: (name: string, parentId?: string | null) => void;
  onRename?: (id: string | undefined, oldName: string, newName: string) => void;
  onDelete?: (id: string | undefined) => void;
}

export default function FileExplorer({
  files,
  activeFile,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: FileExplorerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

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

  const renderItems = (parentId: string | null, depth = 0) => {
    const items = childrenOf(parentId);
    return (
      <div className={depth === 0 ? "ml-4 space-y-1" : "ml-4 space-y-1"}>
        {items.map((item) => {
          if (item.type === "folder") {
            const isOpen = item.id ? expandedFolders.has(item.id) : false;
            const isSelected = selectedFolderId === item.id;
            return (
              <div key={`${item.id ?? item.name}`}>
                <div
                  className={`flex items-center gap-2 p-1 rounded hover:bg-muted`}
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
                  <button
                    className="flex-1 flex items-center gap-2 text-left"
                    onClick={() => setSelectedFolderId(item.id ?? null)}
                  >
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{item.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDelete?.(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {isOpen && item.id && renderItems(item.id, depth + 1)}
              </div>
            );
          }

          return (
            <div
              key={`${item.id ?? item.name}`}
              className={`flex items-center gap-2 p-1 rounded hover:bg-muted ${
                activeFile === item.name ? "bg-muted" : ""
              }`}
            >
              <button
                className="flex-1 flex items-center gap-2 text-left"
                onClick={() => onFileSelect(item.name)}
              >
                {getFileIcon(item.name, item.language)}
                <span className="text-sm">{item.name}</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setEditingId(item.id ?? item.name);
                  setEditingName(item.name);
                }}
              >
                <PencilLine className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onDelete?.(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
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
              onClick={() => {
                setIsCreatingFolder(true);
                setIsCreatingFile(false);
              }}
            >
              <Folder className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreatingFile(true);
                setIsCreatingFolder(false);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-2">
          {/* Root row styled like other folders */}
          <div className={`flex items-center gap-2 p-1 rounded hover:bg-muted`}>
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
            <button
              className="flex-1 flex items-center gap-2 text-left"
              onClick={() => setSelectedFolderId(null)}
            >
              <Folder className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">root</span>
            </button>
          </div>

          {isExpanded && (
            <>
              {renderItems(null)}

              {isCreatingFolder && (
                <div className="flex items-center gap-2 p-1 ml-4">
                  <Folder className="h-4 w-4 text-blue-500" />
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFolderName.trim()) {
                        onCreateFolder?.(
                          newFolderName.trim(),
                          selectedFolderId ?? null
                        );
                        setIsCreatingFolder(false);
                        setNewFolderName("");
                      }
                      if (e.key === "Escape") {
                        setIsCreatingFolder(false);
                        setNewFolderName("");
                      }
                    }}
                    onBlur={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName("");
                    }}
                    placeholder="folder-name"
                    className="h-6 text-xs"
                    autoFocus
                  />
                </div>
              )}

              {isCreatingFile && (
                <div className="flex items-center gap-2 p-1 ml-4">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFileName.trim()) {
                        onCreateFile?.(
                          newFileName.trim(),
                          selectedFolderId ?? null
                        );
                        setIsCreatingFile(false);
                        setNewFileName("");
                      }
                      if (e.key === "Escape") {
                        setIsCreatingFile(false);
                        setNewFileName("");
                      }
                    }}
                    onBlur={() => {
                      setIsCreatingFile(false);
                      setNewFileName("");
                    }}
                    placeholder="filename"
                    className="h-6 text-xs"
                    autoFocus
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
