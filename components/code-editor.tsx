"use client"

import { useState, useEffect } from "react"

interface CodeEditorProps {
  file: { name: string; content: string; language?: string } | undefined
  collaborators: Array<{
    id: number
    name: string
    cursor: { line: number; ch: number } | null
  }>
}

export default function CodeEditor({ file, collaborators }: CodeEditorProps) {
  const [code, setCode] = useState(file?.content || "")
  const [cursorPosition, setCursorPosition] = useState({ line: 0, ch: 0 })
  const [language, setLanguage] = useState(file?.language || "javascript")

  useEffect(() => {
    if (file) {
      setCode(file.content)
      setLanguage(file.language || getLanguageFromFilename(file.name))
    }
  }, [file])

  const getLanguageFromFilename = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "html":
        return "html"
      case "css":
        return "css"
      case "js":
        return "javascript"
      case "ts":
        return "typescript"
      case "py":
        return "python"
      case "java":
        return "java"
      case "cs":
        return "csharp"
      case "php":
        return "php"
      case "rb":
        return "ruby"
      case "go":
        return "go"
      case "rs":
        return "rust"
      case "sql":
        return "sql"
      default:
        return "plaintext"
    }
  }

  const getLanguageClass = () => {
    switch (language) {
      case "html":
        return "language-html"
      case "css":
        return "language-css"
      case "javascript":
        return "language-javascript"
      case "typescript":
        return "language-typescript"
      case "python":
        return "language-python"
      case "java":
        return "language-java"
      case "csharp":
        return "language-csharp"
      case "php":
        return "language-php"
      case "ruby":
        return "language-ruby"
      case "go":
        return "language-go"
      case "rust":
        return "language-rust"
      case "sql":
        return "language-sql"
      default:
        return "language-plaintext"
    }
  }

  const lines = code.split("\n")

  return (
    <div className="flex-1 relative bg-zinc-900 text-white font-mono text-sm overflow-auto">
      <div className="p-4">
        {lines.map((line, lineIndex) => (
          <div key={lineIndex} className="flex items-center min-h-[20px] relative">
            <div className="w-12 text-zinc-500 text-right pr-4 select-none">{lineIndex + 1}</div>
            <div className="flex-1 relative">
              <pre className={`whitespace-pre-wrap ${getLanguageClass()}`}>{line || " "}</pre>
              {/* Render collaborator cursors */}
              {collaborators.map((collaborator) => {
                if (collaborator.cursor && collaborator.cursor.line === lineIndex) {
                  return (
                    <div
                      key={collaborator.id}
                      className="absolute top-0 w-0.5 h-5 bg-blue-500 animate-pulse"
                      style={{ left: `${collaborator.cursor.ch * 8}px` }}
                    >
                      <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                        {collaborator.name}
                      </div>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        ))}
      </div>

      {/* AI Suggestion Popup */}
      <div className="absolute bottom-4 right-4 bg-zinc-800 border border-zinc-700 rounded-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-zinc-400">AI Suggestion</span>
        </div>
        <p className="text-xs text-zinc-300">Consider adding error handling for the API call on line 23</p>
        <div className="flex gap-2 mt-2">
          <button className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">Apply</button>
          <button className="text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded">Dismiss</button>
        </div>
      </div>
    </div>
  )
}
