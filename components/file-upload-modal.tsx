'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  FileText,
  FolderOpen,
  X,
  Check,
  AlertTriangle,
  File,
  Image,
  Code,
  Database,
  Archive,
  Video,
  Music
} from "lucide-react"
import { toast } from "sonner"

interface FileUploadModalProps {
  projectId: string
  onFilesUploaded?: (files: UploadedFile[]) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content?: string
  path: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const SUPPORTED_TYPES = {
  text: ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.sass', '.json', '.xml', '.yaml', '.yml', '.md', '.txt'],
  code: ['.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.sql', '.sh', '.bat', '.ps1'],
  config: ['.env', '.config', '.conf', '.ini', '.toml', '.lock'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'],
  archive: ['.zip', '.tar', '.gz', '.rar', '.7z']
}

export default function FileUploadModal({
  projectId,
  onFilesUploaded,
  isOpen,
  onOpenChange,
}: FileUploadModalProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (fileName: string, fileType: string) => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))

    if (SUPPORTED_TYPES.image.includes(ext)) {
      return <Image className="h-4 w-4" />
    }
    if (SUPPORTED_TYPES.archive.includes(ext)) {
      return <Archive className="h-4 w-4" />
    }
    if (SUPPORTED_TYPES.code.includes(ext) || SUPPORTED_TYPES.text.includes(ext)) {
      return <Code className="h-4 w-4" />
    }
    if (fileType.startsWith('video/')) {
      return <Video className="h-4 w-4" />
    }
    if (fileType.startsWith('audio/')) {
      return <Music className="h-4 w-4" />
    }
    if (ext === '.sql' || fileType.includes('database')) {
      return <Database className="h-4 w-4" />
    }

    return <File className="h-4 w-4" />
  }

  const getFileCategory = (fileName: string): 'supported' | 'limited' | 'unsupported' => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))

    if ([...SUPPORTED_TYPES.text, ...SUPPORTED_TYPES.code, ...SUPPORTED_TYPES.config].includes(ext)) {
      return 'supported'
    }
    if ([...SUPPORTED_TYPES.image, ...SUPPORTED_TYPES.archive].includes(ext)) {
      return 'limited'
    }
    return 'unsupported'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const readFileContent = async (file: File): Promise<string | null> => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    // Only read text-based files
    if (![...SUPPORTED_TYPES.text, ...SUPPORTED_TYPES.code, ...SUPPORTED_TYPES.config].includes(ext)) {
      return null
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const processFiles = async (fileList: FileList) => {
    const newFiles: UploadedFile[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" is too large. Maximum size is 50MB.`)
        continue
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        path: file.webkitRelativePath || file.name,
        status: 'pending',
        progress: 0
      }

      newFiles.push(uploadedFile)
    }

    setFiles(prev => [...prev, ...newFiles])

    // Process each file
    for (const uploadedFile of newFiles) {
      setFiles(prev => prev.map(f =>
        f.id === uploadedFile.id
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      try {
        const originalFile = Array.from(fileList).find(f => f.name === uploadedFile.name)
        if (!originalFile) throw new Error('Original file not found')

        // Simulate upload progress
        for (let progress = 10; progress <= 90; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setFiles(prev => prev.map(f =>
            f.id === uploadedFile.id
              ? { ...f, progress }
              : f
          ))
        }

        // Read file content if it's a text file
        const content = await readFileContent(originalFile)

        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                content: content || undefined
              }
            : f
        ))

        toast.success(`File "${uploadedFile.name}" uploaded successfully`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'error', progress: 0, error: errorMessage }
            : f
        ))
        toast.error(`Failed to upload "${uploadedFile.name}": ${errorMessage}`)
      }
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const { files: droppedFiles } = e.dataTransfer
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const confirmUpload = () => {
    const successfulFiles = files.filter(f => f.status === 'success')
    if (successfulFiles.length > 0) {
      onFilesUploaded?.(successfulFiles)
      toast.success(`${successfulFiles.length} file(s) added to project`)
    }
    setFiles([])
    onOpenChange(false)
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'uploading':
        return (
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getCategoryBadge = (category: 'supported' | 'limited' | 'unsupported') => {
    switch (category) {
      case 'supported':
        return <Badge className="bg-green-100 text-green-800">Editable</Badge>
      case 'limited':
        return <Badge className="bg-yellow-100 text-yellow-800">View Only</Badge>
      case 'unsupported':
        return <Badge className="bg-red-100 text-red-800">Unsupported</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </DialogTitle>
          <DialogDescription>
            Import files and folders into your project. Supported formats include code files, images, and archives.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Maximum file size: 50MB per file
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Select Files
              </Button>
              <Button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('webkitdirectory', 'true')
                    fileInputRef.current.click()
                  }
                }}
                variant="outline"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Select Folder
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".js,.jsx,.ts,.tsx,.html,.css,.scss,.sass,.json,.xml,.yaml,.yml,.md,.txt,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.sql,.sh,.bat,.ps1,.env,.config,.conf,.ini,.toml,.lock,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.zip,.tar,.gz,.rar,.7z"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <>
              <Separator />
              <div className="flex-1 min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Files to Upload ({files.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFiles([])}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.name, file.type)}
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{file.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            {getCategoryBadge(getFileCategory(file.name))}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 flex items-center gap-2">
                        {file.status === 'uploading' && (
                          <div className="flex-1">
                            <Progress value={file.progress} className="h-2" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          {file.error && (
                            <span className="text-xs text-red-600">{file.error}</span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {files.filter(f => f.status === 'success').length} of {files.length} files ready
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmUpload}
                disabled={files.filter(f => f.status === 'success').length === 0}
              >
                Add Files to Project
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}