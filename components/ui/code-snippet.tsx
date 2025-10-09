"use client"

import React, { useState, useCallback } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Code2,
  Maximize2,
  Minimize2
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export interface CodeSnippetProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  copyable?: boolean
  collapsible?: boolean
  theme?: 'light' | 'dark' | 'auto'
  className?: string
  maxHeight?: number
  filename?: string
}

interface LanguageInfo {
  name: string
  icon: React.ReactNode
  color: string
}

const getLanguageInfo = (language?: string): LanguageInfo => {
  const langMap: Record<string, LanguageInfo> = {
    javascript: { name: 'JavaScript', icon: <Code2 className="h-3 w-3" />, color: 'bg-yellow-500' },
    typescript: { name: 'TypeScript', icon: <Code2 className="h-3 w-3" />, color: 'bg-blue-500' },
    python: { name: 'Python', icon: <Terminal className="h-3 w-3" />, color: 'bg-green-500' },
    java: { name: 'Java', icon: <Code2 className="h-3 w-3" />, color: 'bg-orange-500' },
    cpp: { name: 'C++', icon: <Code2 className="h-3 w-3" />, color: 'bg-purple-500' },
    c: { name: 'C', icon: <Code2 className="h-3 w-3" />, color: 'bg-gray-500' },
    csharp: { name: 'C#', icon: <Code2 className="h-3 w-3" />, color: 'bg-purple-600' },
    php: { name: 'PHP', icon: <Code2 className="h-3 w-3" />, color: 'bg-indigo-500' },
    ruby: { name: 'Ruby', icon: <Code2 className="h-3 w-3" />, color: 'bg-red-500' },
    go: { name: 'Go', icon: <Code2 className="h-3 w-3" />, color: 'bg-cyan-500' },
    rust: { name: 'Rust', icon: <Code2 className="h-3 w-3" />, color: 'bg-orange-600' },
    sql: { name: 'SQL', icon: <Terminal className="h-3 w-3" />, color: 'bg-blue-600' },
    html: { name: 'HTML', icon: <Code2 className="h-3 w-3" />, color: 'bg-orange-500' },
    css: { name: 'CSS', icon: <Code2 className="h-3 w-3" />, color: 'bg-blue-500' },
    json: { name: 'JSON', icon: <Code2 className="h-3 w-3" />, color: 'bg-gray-600' },
    yaml: { name: 'YAML', icon: <Code2 className="h-3 w-3" />, color: 'bg-green-600' },
    markdown: { name: 'Markdown', icon: <Code2 className="h-3 w-3" />, color: 'bg-gray-500' },
    bash: { name: 'Bash', icon: <Terminal className="h-3 w-3" />, color: 'bg-black' },
    shell: { name: 'Shell', icon: <Terminal className="h-3 w-3" />, color: 'bg-black' },
    powershell: { name: 'PowerShell', icon: <Terminal className="h-3 w-3" />, color: 'bg-blue-700' },
    dockerfile: { name: 'Dockerfile', icon: <Terminal className="h-3 w-3" />, color: 'bg-cyan-600' },
  }

  const lowerLang = language?.toLowerCase()
  return langMap[lowerLang!] || {
    name: language || 'Plain Text',
    icon: <Code2 className="h-3 w-3" />,
    color: 'bg-gray-400'
  }
}

const CodeSnippet: React.FC<CodeSnippetProps> = ({
  code,
  language,
  showLineNumbers = true,
  copyable = true,
  collapsible = false,
  theme: themeProp = 'auto',
  className,
  maxHeight = 400,
  filename
}) => {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { theme: currentTheme } = useTheme()

  const getTheme = useCallback(() => {
    if (themeProp === 'auto') {
      return currentTheme === 'dark' ? vscDarkPlus : vs
    }
    return themeProp === 'dark' ? vscDarkPlus : vs
  }, [themeProp, currentTheme])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  // Keyboard event handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault()
      handleCopy()
    }
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false)
    }
  }, [handleCopy, isFullscreen])

  const languageInfo = getLanguageInfo(language)
  const shouldCollapse = collapsible && code.split('\n').length > 10
  const displayCode = shouldCollapse && !expanded
    ? code.split('\n').slice(0, 10).join('\n') + '\n...'
    : code

  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background p-4 flex flex-col"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-snippet-title"
        aria-describedby="code-snippet-language"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded", languageInfo.color)} aria-hidden="true">
              {languageInfo.icon}
            </div>
            <span id="code-snippet-title" className="text-sm font-medium">{languageInfo.name}</span>
            <span id="code-snippet-language" className="sr-only">
              Programming language: {languageInfo.name}
            </span>
            {filename && (
              <Badge variant="outline" className="text-xs">
                {filename}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {copyable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
                aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">{copied ? 'Code copied!' : 'Copy code'}</span>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              aria-label="Exit fullscreen mode"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="sr-only">Exit fullscreen</span>
            </Button>
          </div>
        </div>

        <div
          className="flex-1 overflow-auto border rounded-lg"
          role="region"
          aria-label="Code content"
          tabIndex={0}
        >
          <SyntaxHighlighter
            language={language}
            style={getTheme()}
            showLineNumbers={showLineNumbers}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              background: 'transparent',
              height: '100%'
            }}
            wrapLongLines={true}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative group border rounded-lg overflow-hidden bg-muted/30",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`${languageInfo.name} code snippet`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <div className={cn("p-1 rounded text-white", languageInfo.color)} aria-hidden="true">
            {languageInfo.icon}
          </div>
          <span className="text-sm font-medium text-foreground">
            {languageInfo.name}
          </span>
          {filename && (
            <Badge variant="secondary" className="text-xs">
              {filename}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
          {copyable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
              aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  <span className="sr-only">Code copied!</span>
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  <span className="sr-only">Copy code</span>
                  Copy
                </>
              )}
            </Button>
          )}

          {code.length > 100 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="h-7 px-2 text-xs"
              aria-label="View code in fullscreen mode"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="sr-only">Fullscreen</span>
            </Button>
          )}

          {shouldCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 px-2 text-xs"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse code' : 'Expand code'}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  <span className="sr-only">Collapse code</span>
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  <span className="sr-only">Expand code</span>
                  Show more
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Code Content */}
      <div
        className="overflow-auto"
        style={{ maxHeight: shouldCollapse && !expanded ? `${maxHeight}px` : undefined }}
        role="region"
        aria-label="Code content"
        tabIndex={0}
      >
        <SyntaxHighlighter
          language={language}
          style={getTheme()}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            background: 'transparent'
          }}
          wrapLongLines={true}
        >
          {displayCode}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export default CodeSnippet