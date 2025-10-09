"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { Copy, Check, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import {
  vscDarkPlus,
  atomDark,
  base16AteliersulphurpoolLight,
  coldarkCold,
  coldarkDark,
  coy,
  duotoneDark,
  duotoneLight,
  funky,
  holilight,
  lucario,
  materialDark,
  materialLight,
  nightOwl,
  okaidia,
  oneDark,
  oneLight,
  pojoaque,
  prism,
  solarizedlight,
  tomorrow,
  twilight,
  vs,
  xonokai,
  zTouchstone
} from "react-syntax-highlighter/dist/esm/styles/prism"

interface CodeSnippetProps {
  /** The code content to display */
  code: string
  /** The programming language for syntax highlighting */
  language?: string
  /** Optional title for the code snippet */
  title?: string
  /** Whether to show the copy button */
  showCopyButton?: boolean
  /** Whether to show the language badge */
  showLanguageBadge?: boolean
  /** Maximum height before scrolling */
  maxHeight?: string
  /** Custom className for styling */
  className?: string
  /** Whether to detect language automatically */
  autoDetectLanguage?: boolean
}

/**
 * Code Snippet Component
 *
 * A modern, accessible code snippet component with syntax highlighting,
 * copy functionality, and theme awareness.
 */
export function CodeSnippet({
  code,
  language: providedLanguage,
  title,
  showCopyButton = true,
  showLanguageBadge = true,
  maxHeight = "400px",
  className,
  autoDetectLanguage = true,
  ...props
}: CodeSnippetProps) {
  const { resolvedTheme } = useTheme()
  const [isCopied, setIsCopied] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)

  // Choose syntax highlighting theme based on app theme
  const syntaxTheme = React.useMemo(() => {
    if (resolvedTheme === "dark") {
      return vscDarkPlus // VS Code dark theme matches well with dark mode
    }
    return oneLight // Clean light theme for light mode
  }, [resolvedTheme])

  // Auto-detect language if enabled and not provided
  React.useEffect(() => {
    if (autoDetectLanguage && !providedLanguage) {
      const detected = detectLanguage(code)
      setDetectedLanguage(detected)
    }
  }, [code, providedLanguage, autoDetectLanguage])

  const language = providedLanguage || detectedLanguage || "text"

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy code:", err)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand("copy")
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }, [code])

  // Get display name for language
  const getLanguageDisplayName = (lang: string) => {
    const languageMap: Record<string, string> = {
      js: "JavaScript",
      jsx: "React JSX",
      ts: "TypeScript",
      tsx: "React TSX",
      py: "Python",
      java: "Java",
      cpp: "C++",
      c: "C",
      cs: "C#",
      php: "PHP",
      rb: "Ruby",
      go: "Go",
      rs: "Rust",
      sql: "SQL",
      html: "HTML",
      css: "CSS",
      scss: "SCSS",
      json: "JSON",
      xml: "XML",
      yaml: "YAML",
      md: "Markdown",
      sh: "Shell",
      bash: "Bash",
      dockerfile: "Dockerfile",
    }
    return languageMap[lang.toLowerCase()] || lang.toUpperCase()
  }

  const displayName = getLanguageDisplayName(language)

  return (
    <div
      className={cn(
        "relative group rounded-lg border overflow-hidden bg-card",
        "transition-all duration-200 hover:shadow-sm",
        className
      )}
      {...props}
    >
      {/* Header */}
      {(title || showLanguageBadge || showCopyButton) && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            {title && (
              <span className="text-sm font-medium text-foreground">
                {title}
              </span>
            )}
            {showLanguageBadge && (
              <Badge variant="secondary" className="text-xs">
                {displayName}
              </Badge>
            )}
          </div>

          {showCopyButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={isCopied ? "Copied!" : "Copy code"}
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      )}

      {/* Code Content */}
      <div
        className="relative overflow-auto"
        style={{ maxHeight }}
      >
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "0.875rem",
            lineHeight: "1.5",
            background: "transparent",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace"
          }}
          codeTagProps={{
            className: "font-mono"
          }}
          showLineNumbers={code.split('\n').length > 1}
          wrapLines={true}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Footer with additional info */}
      {code.split('\n').length > 1 && (
        <div className="px-4 py-1 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {code.split('\n').length} lines
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Enhanced language detection based on common patterns
 */
function detectLanguage(code: string): string | null {
  const trimmed = code.trim()
  const lines = code.split('\n')

  // Check for React/JSX patterns
  if (
    trimmed.includes("import React") ||
    trimmed.includes("export default") ||
    trimmed.includes("<div") ||
    trimmed.includes("className=") ||
    trimmed.includes("useState") ||
    trimmed.includes("useEffect")
  ) {
    return "jsx"
  }

  // Check for TypeScript patterns
  if (
    trimmed.includes("interface ") ||
    trimmed.includes("type ") ||
    trimmed.includes(": string") ||
    trimmed.includes(": number") ||
    trimmed.includes(": boolean") ||
    trimmed.includes("as const") ||
    trimmed.includes("<") && trimmed.includes(">") && !trimmed.includes("html")
  ) {
    return "typescript"
  }

  // Check for Python patterns
  if (
    trimmed.includes("def ") ||
    trimmed.includes("import ") && trimmed.includes("from ") ||
    trimmed.includes("print(") ||
    trimmed.includes("self.") ||
    lines.some(line => line.startsWith("    ") || line.startsWith("\t"))
  ) {
    return "python"
  }

  // Check for Java patterns
  if (
    trimmed.includes("public class ") ||
    trimmed.includes("import java.") ||
    trimmed.includes("System.out.println") ||
    trimmed.includes("public static void main")
  ) {
    return "java"
  }

  // Check for JavaScript patterns
  if (
    trimmed.includes("function ") ||
    trimmed.includes("const ") ||
    trimmed.includes("let ") ||
    trimmed.includes("var ") ||
    trimmed.includes("=>") ||
    trimmed.includes("console.log") ||
    trimmed.includes("require(")
  ) {
    return "javascript"
  }

  // Check for Go patterns
  if (
    trimmed.includes("package main") ||
    trimmed.includes("func main()") ||
    trimmed.includes("import (") ||
    trimmed.includes("go fmt")
  ) {
    return "go"
  }

  // Check for Rust patterns
  if (
    trimmed.includes("fn main()") ||
    trimmed.includes("use std::") ||
    trimmed.includes("println!") ||
    trimmed.includes("-> ")
  ) {
    return "rust"
  }

  // Check for SQL patterns
  if (
    trimmed.toUpperCase().includes("SELECT ") ||
    trimmed.toUpperCase().includes("FROM ") ||
    trimmed.toUpperCase().includes("WHERE ") ||
    trimmed.toUpperCase().includes("INSERT ") ||
    trimmed.toUpperCase().includes("UPDATE ")
  ) {
    return "sql"
  }

  // Check for HTML patterns
  if (
    trimmed.includes("<html") ||
    trimmed.includes("<!DOCTYPE") ||
    trimmed.includes("<div") ||
    trimmed.includes("<body") ||
    trimmed.includes("<head")
  ) {
    return "html"
  }

  // Check for CSS patterns
  if (
    trimmed.includes("{") && trimmed.includes(":") && !trimmed.includes(",") &&
    (trimmed.includes("color:") || trimmed.includes("background:") || trimmed.includes("margin:"))
  ) {
    return "css"
  }

  // Check for JSON patterns
  if (
    trimmed.startsWith("{") && trimmed.endsWith("}") ||
    trimmed.startsWith("[") && trimmed.endsWith("]")
  ) {
    try {
      JSON.parse(trimmed)
      return "json"
    } catch {
      // Not valid JSON
    }
  }

  // Check for Dockerfile patterns
  if (
    trimmed.startsWith("FROM ") ||
    trimmed.startsWith("RUN ") ||
    trimmed.startsWith("CMD ") ||
    trimmed.startsWith("COPY ") ||
    trimmed.startsWith("ADD ")
  ) {
    return "dockerfile"
  }

  // Check for Shell/Bash patterns
  if (
    trimmed.startsWith("#!") ||
    trimmed.includes("echo ") ||
    trimmed.includes("export ") ||
    trimmed.includes("sudo ") ||
    trimmed.includes("npm run")
  ) {
    return "bash"
  }

  // Check for YAML patterns
  if (
    trimmed.includes(":") && !trimmed.includes("{") && !trimmed.includes(";") &&
    lines.some(line => line.startsWith("  ") && line.includes(":"))
  ) {
    return "yaml"
  }

  // Check for Markdown patterns
  if (
    trimmed.includes("# ") ||
    trimmed.includes("## ") ||
    trimmed.includes("**") ||
    trimmed.includes("```")
  ) {
    return "markdown"
  }

  return null
}

export default CodeSnippet