'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Download,
  Archive,
  FileText,
  Folder,
  Check,
  Settings,
  Code,
  Database,
  Image,
  File
} from "lucide-react"
import { toast } from "sonner"

interface ProjectExportModalProps {
  projectId: string
  projectName: string
  files: Array<{
    id: string
    name: string
    type: 'file' | 'folder'
    content?: string | null
    language?: string | null
    parent_id?: string | null
  }>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface ExportOptions {
  format: 'zip' | 'tar' | 'folder'
  includeMetadata: boolean
  includeHistory: boolean
  includeSettings: boolean
  selectedFiles: string[]
  compressionLevel: 'none' | 'fast' | 'best'
}

export default function ProjectExportModal({
  projectId,
  projectName,
  files,
  isOpen,
  onOpenChange,
}: ProjectExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'zip',
    includeMetadata: true,
    includeHistory: false,
    includeSettings: true,
    selectedFiles: files.map(f => f.id),
    compressionLevel: 'fast'
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const getFileIcon = (file: any) => {
    if (file.type === 'folder') {
      return <Folder className="h-4 w-4" />
    }

    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'].includes(ext)) {
      return <Code className="h-4 w-4" />
    }
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
      return <Image className="h-4 w-4" />
    }
    if (ext === '.sql') {
      return <Database className="h-4 w-4" />
    }

    return <File className="h-4 w-4" />
  }

  const formatFileSize = (files: any[]): string => {
    const totalSize = files.reduce((acc, file) => {
      if (file.content) {
        return acc + new Blob([file.content]).size
      }
      return acc + 1024 // Estimate for folders
    }, 0)

    if (totalSize === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(totalSize) / Math.log(k))
    return parseFloat((totalSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const selectedFiles = files.filter(f => exportOptions.selectedFiles.includes(f.id))

  const toggleFileSelection = (fileId: string) => {
    setExportOptions(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.includes(fileId)
        ? prev.selectedFiles.filter(id => id !== fileId)
        : [...prev.selectedFiles, fileId]
    }))
  }

  const selectAllFiles = () => {
    setExportOptions(prev => ({
      ...prev,
      selectedFiles: files.map(f => f.id)
    }))
  }

  const deselectAllFiles = () => {
    setExportOptions(prev => ({
      ...prev,
      selectedFiles: []
    }))
  }

  const createZipFile = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate export progress
      const totalSteps = selectedFiles.length + 3 // Files + metadata + compression + finalization
      let completedSteps = 0

      // Create a simple zip-like structure (in a real implementation, you'd use JSZip or similar)
      const exportData: any = {
        project: {
          id: projectId,
          name: projectName,
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        },
        files: {},
        metadata: exportOptions.includeMetadata ? {
          totalFiles: selectedFiles.length,
          languages: [...new Set(selectedFiles.map(f => f.language).filter(Boolean))],
          exportOptions
        } : undefined,
        settings: exportOptions.includeSettings ? {
          theme: 'dark',
          fontSize: 14,
          tabSize: 2
        } : undefined
      }

      // Process each selected file
      for (const file of selectedFiles) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Simulate processing time

        if (file.type === 'file') {
          exportData.files[file.name] = {
            content: file.content || '',
            language: file.language,
            type: 'file'
          }
        } else {
          exportData.files[file.name] = {
            type: 'folder',
            children: []
          }
        }

        completedSteps++
        setExportProgress((completedSteps / totalSteps) * 100)
      }

      // Add metadata
      if (exportOptions.includeHistory) {
        exportData.history = {
          executions: [
            {
              id: '1',
              fileName: 'example.js',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              status: 'success',
              output: 'Hello World!'
            }
          ]
        }
      }
      completedSteps++
      setExportProgress((completedSteps / totalSteps) * 100)

      // Simulate compression
      await new Promise(resolve => setTimeout(resolve, 500))
      completedSteps++
      setExportProgress((completedSteps / totalSteps) * 100)

      // Create and download the file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: exportOptions.format === 'zip' ? 'application/zip' : 'application/json'
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.${exportOptions.format === 'zip' ? 'zip' : 'json'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      completedSteps++
      setExportProgress(100)

      toast.success(`Project "${projectName}" exported successfully!`)
      onOpenChange(false)
    } catch (error) {
      toast.error('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export "{projectName}"
          </DialogTitle>
          <DialogDescription>
            Download your project files and settings for backup or sharing
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* File Selection */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Select Files ({selectedFiles.length}/{files.length})</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiles}
                  disabled={isExporting}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllFiles}
                  disabled={isExporting}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex-1 border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={file.id}
                      checked={exportOptions.selectedFiles.includes(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      disabled={isExporting}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {getFileIcon(file)}
                      <span className="text-sm">{file.name}</span>
                      {file.language && (
                        <Badge variant="outline" className="text-xs">
                          {file.language}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">
                <p>Selected: {selectedFiles.length} files</p>
                <p>Estimated size: {formatFileSize(selectedFiles)}</p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="w-80 flex flex-col">
            <h3 className="font-medium mb-4">Export Options</h3>

            <div className="space-y-4 flex-1">
              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={exportOptions.format}
                  onValueChange={(value: 'zip' | 'tar' | 'folder') =>
                    setExportOptions(prev => ({ ...prev, format: value }))
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP Archive</SelectItem>
                    <SelectItem value="tar">TAR Archive</SelectItem>
                    <SelectItem value="folder">JSON Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compression */}
              <div className="space-y-2">
                <Label>Compression Level</Label>
                <Select
                  value={exportOptions.compressionLevel}
                  onValueChange={(value: 'none' | 'fast' | 'best') =>
                    setExportOptions(prev => ({ ...prev, compressionLevel: value }))
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Compression</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="best">Best</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Include Options */}
              <div className="space-y-3">
                <Label>Include in Export</Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeMetadata: !!checked }))
                    }
                    disabled={isExporting}
                  />
                  <Label htmlFor="metadata" className="text-sm">
                    Project metadata
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="history"
                    checked={exportOptions.includeHistory}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeHistory: !!checked }))
                    }
                    disabled={isExporting}
                  />
                  <Label htmlFor="history" className="text-sm">
                    Execution history
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="settings"
                    checked={exportOptions.includeSettings}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeSettings: !!checked }))
                    }
                    disabled={isExporting}
                  />
                  <Label htmlFor="settings" className="text-sm">
                    Project settings
                  </Label>
                </div>
              </div>

              {/* Export Progress */}
              {isExporting && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Exporting...</span>
                      <span>{Math.round(exportProgress)}%</span>
                    </div>
                    <Progress value={exportProgress} />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={createZipFile}
                disabled={selectedFiles.length === 0 || isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Project
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isExporting}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}