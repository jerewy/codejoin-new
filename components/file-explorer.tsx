"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Folder, FileText, Plus, ChevronRight, ChevronDown, Code, Database, Globe } from "lucide-react"

interface FileExplorerProps {
  files: Array<{ name: string; type: string; language?: string }>
  activeFile: string
  onFileSelect: (fileName: string) => void
}

export default function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [newFileName, setNewFileName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const getFileIcon = (fileName: string, language?: string) => {
    if (language) {
      switch (language) {
        case "html":
          return <Globe className="h-4 w-4 text-orange-400" />
        case "css":
          return <FileText className="h-4 w-4 text-blue-400" />
        case "javascript":
          return <Code className="h-4 w-4 text-yellow-400" />
        case "typescript":
          return <Code className="h-4 w-4 text-blue-500" />
        case "python":
          return <Code className="h-4 w-4 text-green-500" />
        case "sql":
          return <Database className="h-4 w-4 text-purple-400" />
        default:
          return <FileText className="h-4 w-4 text-muted-foreground" />
      }
    }

    const ext = fileName.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "html":
        return <Globe className="h-4 w-4 text-orange-400" />
      case "css":
        return <FileText className="h-4 w-4 text-blue-400" />
      case "js":
        return <Code className="h-4 w-4 text-yellow-400" />
      case "ts":
        return <Code className="h-4 w-4 text-blue-500" />
      case "py":
        return <Code className="h-4 w-4 text-green-500" />
      case "sql":
        return <Database className="h-4 w-4 text-purple-400" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Explorer</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-2">
          <div className="flex items-center gap-1 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-0 h-auto">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Folder className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">src</span>
          </div>

          {isExpanded && (
            <div className="ml-4 space-y-1">
              {files.map((file) => (
                <div
                  key={file.name}
                  className={`flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-muted ${
                    activeFile === file.name ? "bg-muted" : ""
                  }`}
                  onClick={() => onFileSelect(file.name)}
                >
                  {getFileIcon(file.name, file.language)}
                  <span className="text-sm">{file.name}</span>
                </div>
              ))}

              {isCreating && (
                <div className="flex items-center gap-2 p-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        // Handle file creation
                        setIsCreating(false)
                        setNewFileName("")
                      }
                      if (e.key === "Escape") {
                        setIsCreating(false)
                        setNewFileName("")
                      }
                    }}
                    placeholder="filename.ext"
                    className="h-6 text-xs"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
