import { ReactNode, createElement } from "react"
import CodeSnippet from "@/components/code-snippet"

export interface ParsedMessagePart {
  type: "text" | "code"
  content: string
  language?: string
  title?: string
}

/**
 * Parse AI message content to detect and format code blocks
 */
export function parseMessageContent(content: string): ParsedMessagePart[] {
  const parts: ParsedMessagePart[] = []

  // Pattern for markdown code blocks: ```language\ncode\n```
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim()
      if (textContent) {
        parts.push({
          type: "text",
          content: textContent
        })
      }
    }

    // Add the code block
    const language = match[1]?.trim() || undefined
    const code = match[2].trim()

    parts.push({
      type: "code",
      content: code,
      language,
      title: language ? `${language.charAt(0).toUpperCase() + language.slice(1)} Code` : "Code"
    })

    lastIndex = codeBlockRegex.lastIndex
  }

  // Add remaining text after the last code block
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim()
    if (textContent) {
      parts.push({
        type: "text",
        content: textContent
      })
    }
  }

  // If no code blocks were found, treat the entire content as text
  if (parts.length === 0) {
    parts.push({
      type: "text",
      content: content
    })
  }

  return parts
}

/**
 * Detect inline code snippets in text and format them
 */
export function detectInlineCode(text: string): ReactNode {
  // Pattern for inline code: `code`
  const inlineCodeRegex = /`([^`]+)`/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // Add text before the inline code
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Add the inline code with styling
    const code = match[1]
    parts.push(
      createElement('code', {
        key: `inline-${match.index}`,
        className: "bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground"
      }, code)
    )

    lastIndex = inlineCodeRegex.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  // If no inline code was found, return the original text
  if (parts.length === 1 && typeof parts[0] === "string") {
    return parts[0]
  }

  return parts
}

/**
 * Render parsed message parts as React components
 */
export function renderMessageParts(parts: ParsedMessagePart[]): ReactNode[] {
  return parts.map((part, index) => {
    switch (part.type) {
      case "text":
        return (
          <div key={`text-${index}`} className="text-sm whitespace-pre-wrap break-words">
            {detectInlineCode(part.content)}
          </div>
        )

      case "code":
        return (
          <div key={`code-${index}`} className="my-4">
            <CodeSnippet
              code={part.content}
              language={part.language}
              title={part.title}
              autoDetectLanguage={!part.language}
              showCopyButton={true}
              showLanguageBadge={true}
              maxHeight="300px"
            />
          </div>
        )

      default:
        return null
    }
  })
}

/**
 * Check if content contains any code blocks
 */
export function hasCodeBlocks(content: string): boolean {
  const codeBlockRegex = /```[\s\S]*?```/
  return codeBlockRegex.test(content)
}

/**
 * Count the number of code blocks in content
 */
export function countCodeBlocks(content: string): number {
  const codeBlockRegex = /```[\s\S]*?```/g
  const matches = content.match(codeBlockRegex)
  return matches ? matches.length : 0
}

/**
 * Extract all code blocks from content
 */
export function extractCodeBlocks(content: string): string[] {
  const codeBlocks: string[] = []
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push(match[2].trim())
  }

  return codeBlocks
}