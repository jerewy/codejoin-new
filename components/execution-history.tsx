'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  History,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Code,
  FileText,
  Trash2,
  Download,
  Copy,
  Calendar,
  Timer,
  AlertCircle,
  Info
} from "lucide-react"
import { toast } from "sonner"
// import { format, formatDistanceToNow } from "date-fns" // Using date-fns if available
const format = (date: Date, formatStr: string) => {
  return date.toLocaleString()
}
const formatDistanceToNow = (date: Date, options?: any) => {
  const diff = Date.now() - date.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  return `${Math.floor(diff / 86400000)} days ago`
}

interface ExecutionRecord {
  id: string
  fileName: string
  language: string
  code: string
  output: string
  error?: string
  exitCode: number
  executionTime: number
  timestamp: Date
  status: 'success' | 'error' | 'timeout'
}

interface ExecutionHistoryProps {
  projectId: string
  onReplayExecution?: (record: ExecutionRecord) => void
}

export default function ExecutionHistory({
  projectId,
  onReplayExecution,
}: ExecutionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<ExecutionRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<ExecutionRecord | null>(null)

  // Mock data - in production, this would fetch from a database
  useEffect(() => {
    const mockHistory: ExecutionRecord[] = [
      {
        id: '1',
        fileName: 'fibonacci.py',
        language: 'python',
        code: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint(fibonacci(10))',
        output: '55',
        exitCode: 0,
        executionTime: 245,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        status: 'success'
      },
      {
        id: '2',
        fileName: 'hello.js',
        language: 'javascript',
        code: 'console.log("Hello, World!");',
        output: 'Hello, World!',
        exitCode: 0,
        executionTime: 42,
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        status: 'success'
      },
      {
        id: '3',
        fileName: 'divide.py',
        language: 'python',
        code: 'def divide(a, b):\n    return a / b\n\nprint(divide(10, 0))',
        output: '',
        error: 'ZeroDivisionError: division by zero',
        exitCode: 1,
        executionTime: 38,
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        status: 'error'
      },
      {
        id: '4',
        fileName: 'infinite.js',
        language: 'javascript',
        code: 'while (true) {\n    console.log("Running...");\n}',
        output: 'Running...\nRunning...\nRunning...\nExecution terminated due to timeout',
        exitCode: 124,
        executionTime: 30000,
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        status: 'timeout'
      },
      {
        id: '5',
        fileName: 'sorting.py',
        language: 'python',
        code: 'arr = [64, 34, 25, 12, 22, 11, 90]\narr.sort()\nprint("Sorted array:", arr)',
        output: 'Sorted array: [11, 12, 22, 25, 34, 64, 90]',
        exitCode: 0,
        executionTime: 156,
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        status: 'success'
      }
    ]
    setHistory(mockHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()))
  }, [projectId])

  const getStatusIcon = (status: ExecutionRecord['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: ExecutionRecord['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Success</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Error</Badge>
      case 'timeout':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Timeout</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copied to clipboard!`)
    } catch (error) {
      toast.error(`Failed to copy ${type.toLowerCase()}`)
    }
  }

  const exportHistory = () => {
    const data = JSON.stringify(history, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `execution-history-${projectId}-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Execution history exported!')
  }

  const clearHistory = () => {
    setHistory([])
    setSelectedRecord(null)
    toast.success('Execution history cleared')
  }

  const replayExecution = (record: ExecutionRecord) => {
    if (onReplayExecution) {
      onReplayExecution(record)
      setIsOpen(false)
      toast.success(`Replaying execution of ${record.fileName}`)
    }
  }

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    return `${(ms / 60000).toFixed(2)}m`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          History ({history.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Code Execution History
          </DialogTitle>
          <DialogDescription>
            View and manage your code execution history for this project
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* History List */}
          <div className="w-1/2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Recent Executions</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportHistory}
                  disabled={history.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearHistory}
                  disabled={history.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No execution history yet</p>
                    <p className="text-sm">Run some code to see it here!</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div
                      key={record.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedRecord?.id === record.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className="font-medium text-sm">{record.fileName}</span>
                          <Badge variant="outline" className="text-xs">
                            {record.language}
                          </Badge>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {formatExecutionTime(record.executionTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator orientation="vertical" />

          {/* Execution Details */}
          <div className="w-1/2 flex flex-col">
            {selectedRecord ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Execution Details</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => replayExecution(selectedRecord)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Replay
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">File:</span>
                        <span className="text-sm">{selectedRecord.fileName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Language:</span>
                        <Badge variant="outline">{selectedRecord.language}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(selectedRecord.status)}
                          <span className="text-sm capitalize">{selectedRecord.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Execution Time:</span>
                        <span className="text-sm">{formatExecutionTime(selectedRecord.executionTime)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Timestamp:</span>
                        <span className="text-sm">{format(selectedRecord.timestamp, 'PPpp')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Exit Code:</span>
                        <Badge variant={selectedRecord.exitCode === 0 ? "default" : "destructive"}>
                          {selectedRecord.exitCode}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Code */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Code:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedRecord.code, 'Code')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {selectedRecord.code}
                        </pre>
                      </div>
                    </div>

                    <Separator />

                    {/* Output */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Output:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedRecord.output, 'Output')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {selectedRecord.output || 'No output'}
                        </pre>
                      </div>
                    </div>

                    {/* Error (if present) */}
                    {selectedRecord.error && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-red-600">Error:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedRecord.error!, 'Error')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap font-mono text-red-800">
                              {selectedRecord.error}
                            </pre>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select an execution to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}