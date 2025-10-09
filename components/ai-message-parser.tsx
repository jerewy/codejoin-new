"use client"

import React, { useMemo, memo } from "react"
import CodeSnippet, { type CodeSnippetProps } from "@/components/ui/code-snippet"
import { parseCodeContent, extractFilename, cleanCodeContent } from "@/lib/code-parser"
import { cn } from "@/lib/utils"

export interface AIMessageParserProps {
  content: string
  className?: string
  codeSnippetProps?: Partial<CodeSnippetProps>
  enableAutoDetection?: boolean
  maxInlineLength?: number
}

interface InlineCodeProps {
  code: string
  className?: string
}

const InlineCode: React.FC<InlineCodeProps> = ({ code, className }) => {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-1.5 py-0.5 font-mono text-sm",
        "before:content-['`'] after:content-['`']",
        "text-primary hover:bg-muted/80 transition-colors cursor-pointer",
        className
      )}
      title={code.length > 50 ? code : undefined}
      onClick={() => {
        navigator.clipboard.writeText(code)
      }}
    >
      {code}
    </code>
  )
}

export const AIMessageParser = memo<AIMessageParserProps>(({
  content,
  className,
  codeSnippetProps = {},
  enableAutoDetection = true,
  maxInlineLength = 50
}) => {
  const parsedContent = useMemo(() => {
    return parseCodeContent(content)
  }, [content])

  const renderSegment = (segment: any, index: number): React.ReactNode => {
    if (segment.type === 'text') {
      return <TextSegment key={index} content={segment.content} />
    }

    if (segment.type === 'code') {
      const codeBlock = segment.codeBlock
      const filename = extractFilename(codeBlock)
      const cleanedCode = cleanCodeContent(codeBlock.content)

      if (codeBlock.type === 'inline') {
        // Only render inline code if it's not too long
        if (codeBlock.content.length <= maxInlineLength) {
          return <InlineCode key={index} code={codeBlock.content} />
        } else {
          // Convert long inline code to block
          return (
            <CodeSnippet
              key={index}
              code={cleanedCode}
              language={codeBlock.language}
              filename={filename}
              collapsible={false}
              showLineNumbers={false}
              copyable={true}
              {...codeSnippetProps}
            />
          )
        }
      }

      if (codeBlock.type === 'block') {
        return (
          <div key={index} className="my-4">
            <CodeSnippet
              code={cleanedCode}
              language={codeBlock.language}
              filename={filename}
              collapsible={true}
              showLineNumbers={true}
              copyable={true}
              {...codeSnippetProps}
            />
          </div>
        )
      }
    }

    return null
  }

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      {parsedContent.segments.map((segment, index) => renderSegment(segment, index))}
    </div>
  )
})

AIMessageParser.displayName = 'AIMessageParser'

interface TextSegmentProps {
  content: string
}

const TextSegment: React.FC<TextSegmentProps> = memo(({ content }) => {
  const processedContent = useMemo(() => {
    // Process the text content for basic markdown features
    return content
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br />')
  }, [content])

  if (!processedContent.trim()) {
    return null
  }

  return (
    <p
      className="text-sm leading-relaxed mb-2 last:mb-0"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  )
})

TextSegment.displayName = 'TextSegment'

export default AIMessageParser